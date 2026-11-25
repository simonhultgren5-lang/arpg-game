#!/usr/bin/env node
// Depths of Darkness — server admin CLI. Works on the server's PostgreSQL database directly, so it
// runs anywhere that can reach the database (the Pi, or inside the server's container).
//
//   node admin.mjs <command> [arguments]
//
//   On the Raspberry Pi with Docker:   docker compose exec depths-server node admin.mjs accounts
//   From a clone of the repo:          bun run admin accounts
//
// It uses the same settings as server.mjs (DATABASE_URL and DATA_DIR from the environment or
// config.json). Changes take effect right away, also while the server runs. Commands that delete
// something ask for --yes. Run without arguments for the list of commands.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  DATA_DIR, DATABASE_URL, SQLITE_FILE, createPool, importSqlite, migrate, readJsonBackup, redactUrl, restoreJsonBackup,
  schemaVersion, tableCounts, tx, writeJsonBackup,
} from './db.mjs';

const PID_FILE = path.join(DATA_DIR, 'server.pid');
const NAME_RE = /^[A-Za-z][A-Za-z '-]{1,17}$/;

const COMMANDS = {
  accounts: ['', 'List accounts with their character count and last login'],
  characters: ['[username]', "List characters (one account's, or everyone's)"],
  'reset-password': ['<username> [new-password]', 'Set a new password (random if left out) and sign the account out everywhere'],
  'rename-character': ['<username> <name> <new name>', 'Rename a character'],
  'delete-character': ['<username> <name> --yes', 'Delete a character and its progress'],
  'delete-account': ['<username> --yes', 'Delete an account, its characters and its progress'],
  'sign-out': ['<username>', 'End all login sessions of an account'],
  stats: ['', 'Counts and database size'],
  news: ['', 'List news posts shown in the launcher'],
  'news-post': ['<title> <text> [--channel beta|dev]', 'Post news to every launcher (or one channel)'],
  'news-delete': ['<id> --yes', 'Delete a news post'],
  flags: ['', 'List feature flags'],
  'flag-set': ['<key> <value> [--channel beta|dev] [--note text]', 'Set a flag (value: true, false, a number or text)'],
  'flag-unset': ['<key> [--channel beta|dev]', 'Remove a flag'],
  crashes: ['[count]', 'Newest crash reports (default 20)'],
  crash: ['<id>', 'One crash report with its stack trace or game log'],
  telemetry: ['[days]', 'Usage summary for the last days (default 7)'],
  backup: ['[file] [--format pg_dump|json]', 'Copy the database to a file (default: data/backups/depths-<date>.dump)'],
  restore: ['<file> --yes', 'Replace the database with a backup (stop the server first)'],
  'import-sqlite': ['[file] --yes', 'Import an old SQLite database (default data/depths.db) into an empty database'],
};

// ---------------------------------------------------------------- output helpers
class AdminError extends Error {}
const fail = (message) => {
  throw new AdminError(message);
};
const date = (ms) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) : 'never');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
function table(rows, columns) {
  if (!rows.length) return console.log('(none)');
  const widths = columns.map(([key, title]) => Math.max(title.length, ...rows.map((r) => String(r[key] ?? '').length)));
  const line = (cells) => cells.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ').trimEnd();
  console.log(line(columns.map(([, title]) => title)));
  console.log(line(widths.map((w) => '-'.repeat(w))));
  for (const r of rows) console.log(line(columns.map(([key]) => r[key])));
}
function usage() {
  console.log('Depths of Darkness server admin\n\nUsage: node admin.mjs <command> [arguments]\n');
  for (const [name, [args, text]] of Object.entries(COMMANDS)) console.log(`  ${`${name} ${args}`.padEnd(46)} ${text}`);
  console.log(`\nDatabase: ${redactUrl(DATABASE_URL)}`);
}

// ---------------------------------------------------------------- database
let pool = null;
async function openDb() {
  if (pool) return pool;
  pool = await createPool(DATABASE_URL, 2);
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    fail(`Can't reach the database at ${redactUrl(DATABASE_URL)} (${error.code || error.message}). Is it running? Set DATABASE_URL if it's elsewhere.`);
  }
  // A fresh database (or one the server hasn't upgraded yet) gets the current tables.
  await migrate(pool, { log: () => {} });
  return pool;
}
const one = async (sql, params) => (await (await openDb()).query(sql, params)).rows[0] ?? null;
const all = async (sql, params) => (await (await openDb()).query(sql, params)).rows;
const exec = async (sql, params) => (await (await openDb()).query(sql, params)).rowCount;

async function account(username) {
  if (!username) fail('Which account? Give the username.');
  const row = await one('SELECT * FROM accounts WHERE lower(username) = lower($1)', [username]);
  if (!row) fail(`No account called "${username}".`);
  return row;
}
async function character(acc, name) {
  if (!name) fail('Which character? Give the character name.');
  const row = await one('SELECT * FROM characters WHERE account_id = $1 AND lower(name) = lower($2)', [acc.id, name]);
  if (!row) fail(`${acc.username} has no character called "${name}".`);
  return row;
}
// Same format as server.mjs, so the server can check passwords set here.
const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scrypt(password, salt)).toString('base64')}`;
}
function serverRunning() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8'));
    if (!pid) return false;
    process.kill(pid, 0); // throws if no such process
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- pg_dump / pg_restore
// Backups use pg_dump's custom format when the PostgreSQL client tools are installed (they are in
// the Docker image), and otherwise the built-in format of db.mjs (gzip'd JSON of every table).
// PG_BIN can point at the folder with pg_dump if it isn't on PATH.
const tool = (name) => (process.env.PG_BIN ? path.join(process.env.PG_BIN, name) : name);
const toolMajor = (name) => {
  const r = spawnSync(tool(name), ['--version'], { encoding: 'utf8' });
  return r.status === 0 ? Number((/(\d+)(?:\.\d+)?/.exec(r.stdout) || [])[1]) || 0 : 0;
};
// pg_dump refuses a server newer than itself, so an older client counts as not installed.
async function hasTool(name) {
  const major = toolMajor(name);
  if (!major) return false;
  const { v } = await one("SELECT current_setting('server_version_num')::int / 10000 AS v");
  return major >= v;
}
function runTool(name, args) {
  const r = spawnSync(tool(name), args, { encoding: 'utf8' });
  if (r.error) fail(`Could not run ${name}: ${r.error.message}`);
  if (r.status !== 0) fail(`${name} failed:\n${(r.stderr || r.stdout || '').trim()}`);
  return r.stdout;
}
const isPgDump = (file) => {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(5);
  fs.readSync(fd, head, 0, 5, 0);
  fs.closeSync(fd);
  return head.toString('latin1') === 'PGDMP';
};
async function makeBackup(file, format) {
  const usePgDump = format ? format === 'pg_dump' : await hasTool('pg_dump');
  if (format && !['pg_dump', 'json'].includes(format)) fail('--format must be pg_dump or json.');
  if (usePgDump && !(await hasTool('pg_dump'))) fail('pg_dump is not installed (or older than the database server). Install the PostgreSQL client, or use --format json.');
  const ext = usePgDump ? 'dump' : 'json.gz';
  const target = path.resolve(file || path.join(DATA_DIR, 'backups', `depths-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`));
  if (fs.existsSync(target)) fail(`${target} already exists.`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // Both write one consistent snapshot, also while the server is writing.
  if (usePgDump) runTool('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', `--file=${target}`, `--dbname=${DATABASE_URL}`]);
  else await writeJsonBackup(await openDb(), target);
  return target;
}

// ---------------------------------------------------------------- commands
const run = {
  async accounts() {
    const rows = (
      await all(`SELECT a.username, a.created_at, a.last_login_at, COUNT(c.id) AS chars
                 FROM accounts a LEFT JOIN characters c ON c.account_id = a.id GROUP BY a.id ORDER BY lower(a.username)`)
    ).map((r) => ({ ...r, created: date(r.created_at), login: date(r.last_login_at) }));
    table(rows, [['username', 'Username'], ['chars', 'Characters'], ['created', 'Created'], ['login', 'Last login']]);
  },

  async characters(username) {
    const where = username ? 'WHERE a.id = $1' : '';
    const params = username ? [(await account(username)).id] : [];
    const rows = (
      await all(`SELECT a.username, c.name, c.hero_class, c.hero_level, c.depth, c.updated_at
                 FROM characters c JOIN accounts a ON a.id = c.account_id ${where} ORDER BY lower(a.username), c.created_at, c.id`, params)
    ).map((r) => ({ ...r, played: date(r.updated_at) }));
    table(rows, [['username', 'Account'], ['name', 'Name'], ['hero_class', 'Class'], ['hero_level', 'Level'], ['depth', 'Depth'], ['played', 'Last saved']]);
  },

  async 'reset-password'(username, password) {
    const acc = await account(username);
    const generated = !password;
    const next = password || crypto.randomBytes(9).toString('base64url');
    if (next.length < 6 || next.length > 128) fail('The password must be 6–128 characters.');
    const hash = await hashPassword(next);
    const changes = await tx(await openDb(), async (client) => {
      await client.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [hash, acc.id]);
      return (await client.query('DELETE FROM sessions WHERE account_id = $1', [acc.id])).rowCount;
    });
    console.log(`Password for ${acc.username} changed${generated ? ` to: ${next}` : ''}.`);
    console.log(`Signed out of ${plural(changes, 'session')}.`);
  },

  async 'rename-character'(username, name, newName) {
    const acc = await account(username);
    const ch = await character(acc, name);
    const clean = String(newName || '').trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(clean)) fail("New name must be 2–18 letters (spaces, - and ' allowed).");
    const clash = await one('SELECT id FROM characters WHERE account_id = $1 AND lower(name) = lower($2) AND id != $3', [acc.id, clean, ch.id]);
    if (clash) fail(`${acc.username} already has a character called "${clean}".`);
    await exec('UPDATE characters SET name = $1 WHERE id = $2', [clean, ch.id]);
    console.log(`Renamed ${ch.name} to ${clean}.`);
  },

  async 'delete-character'(username, name) {
    const acc = await account(username);
    const ch = await character(acc, name);
    if (!flags.yes) fail(`This deletes ${ch.name} (level ${ch.hero_level} ${ch.hero_class}) for good. Add --yes to confirm.`);
    await exec('DELETE FROM characters WHERE id = $1', [ch.id]);
    console.log(`Deleted ${ch.name}.`);
  },

  async 'delete-account'(username) {
    const acc = await account(username);
    const { n } = await one('SELECT COUNT(*) AS n FROM characters WHERE account_id = $1', [acc.id]);
    if (!flags.yes) fail(`This deletes ${acc.username} and ${plural(n, 'character')} for good. Add --yes to confirm.`);
    await exec('DELETE FROM accounts WHERE id = $1', [acc.id]); // sessions and characters go with it (ON DELETE CASCADE)
    console.log(`Deleted ${acc.username} and ${plural(n, 'character')}.`);
  },

  async 'sign-out'(username) {
    const acc = await account(username);
    const changes = await exec('DELETE FROM sessions WHERE account_id = $1', [acc.id]);
    console.log(`Signed ${acc.username} out of ${plural(changes, 'session')}.`);
  },

  async stats() {
    const count = async (sql, params) => (await one(sql, params)).n;
    const size = (await one('SELECT pg_database_size(current_database()) AS n')).n;
    const rows = [
      ['accounts', await count('SELECT COUNT(*) AS n FROM accounts')],
      ['characters', await count('SELECT COUNT(*) AS n FROM characters')],
      ['played in 3D', await count(`SELECT COUNT(*) AS n FROM characters WHERE data LIKE '%"dod3d"%'`)],
      ['sessions', await count('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > $1', [Date.now()])],
      ['active (7 days)', await count('SELECT COUNT(*) AS n FROM accounts WHERE last_login_at > $1', [Date.now() - 7 * 864e5])],
      ['database', `${(size / 1024).toFixed(0)} KB (PostgreSQL, schema ${await schemaVersion(await openDb())})`],
      ['server', serverRunning() ? 'running' : 'not running'],
    ];
    for (const [k, v] of rows) console.log(`${k.padEnd(16)} ${v}`);
  },

  async backup(file) {
    const target = await makeBackup(file, options.format);
    console.log(`Backed up to ${target} (${(fs.statSync(target).size / 1024).toFixed(0)} KB).`);
  },

  async restore(file) {
    if (!file) fail('Which backup? Give the file.');
    const source = path.resolve(file);
    if (!fs.existsSync(source)) fail(`No file at ${source}.`);
    if (serverRunning()) fail('Stop the server first (docker compose stop depths-server, or Ctrl+C), then restore.');
    const pgDump = isPgDump(source);
    let backup = null;
    if (pgDump) {
      if (!(await hasTool('pg_restore'))) fail('This backup was made with pg_dump; restoring it needs pg_restore (the PostgreSQL client).');
      const list = runTool('pg_restore', ['--list', source]);
      if (!/TABLE public accounts\b/.test(list) || !/TABLE public characters\b/.test(list)) fail(`${source} isn't a Depths of Darkness backup.`);
    } else {
      try {
        backup = readJsonBackup(source);
      } catch {
        fail(`${source} isn't a Depths of Darkness backup.`);
      }
    }
    if (!flags.yes) fail(`This replaces every account and save in ${redactUrl(DATABASE_URL)} with ${source}. Add --yes to confirm.`);
    // A safety copy of what's there now, in the built-in format (always available).
    const keep = path.join(DATA_DIR, 'backups', `before-restore-${Date.now()}.json.gz`);
    fs.mkdirSync(path.dirname(keep), { recursive: true });
    await writeJsonBackup(await openDb(), keep);
    console.log(`Kept the current data as ${keep}.`);
    if (pgDump) {
      await pool.end();
      pool = null;
      runTool('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--single-transaction', `--dbname=${DATABASE_URL}`, source]);
    } else {
      await restoreJsonBackup(await openDb(), backup);
    }
    console.log(`Restored ${source}. Start the server again.`);
  },

  async 'import-sqlite'(file) {
    const source = path.resolve(file || SQLITE_FILE);
    if (!fs.existsSync(source)) fail(`No file at ${source}.`);
    if (!flags.yes) fail(`This copies every account and save from ${source} into ${redactUrl(DATABASE_URL)} (which must be empty). Add --yes to confirm.`);
    // The default file is renamed like the server does it; a file named on the command line stays as it is.
    const result = await importSqlite(await openDb(), source, { log: console.log, rename: !file });
    if (result.status === 'refused') fail('Nothing was imported.');
    if (result.status === 'imported') {
      const counts = await tableCounts(await openDb());
      console.log(`Done: ${plural(counts.accounts, 'account')} and ${plural(counts.characters, 'character')} in PostgreSQL.`);
    }
  },
};

// ---------------------------------------------------------------- news, flags, crashes, telemetry
const CHANNELS = ['beta', 'dev'];
function channelOption() {
  if (!options.channel) return '';
  if (!CHANNELS.includes(options.channel)) fail('--channel must be beta or dev (leave it out for everyone).');
  return options.channel;
}
const clampCount = (v, fallback, max) => Math.max(1, Math.min(max, Math.trunc(Number(v)) || fallback));
const idArg = (id) => (/^\d{1,15}$/.test(String(id)) ? Number(id) : -1);
Object.assign(run, {
  async news() {
    const rows = (await all('SELECT id, title, channel, created_at FROM news ORDER BY created_at DESC, id DESC'))
      .map((r) => ({ ...r, channel: r.channel || 'everyone', posted: date(r.created_at) }));
    table(rows, [['id', 'Id'], ['posted', 'Posted'], ['channel', 'For'], ['title', 'Title']]);
  },
  async 'news-post'(title, body) {
    if (!title || !body) fail('Give a title and the text, each in quotes: news-post "Server maintenance" "Down Friday 20:00 for an hour."');
    const channel = channelOption();
    const { id } = await one('INSERT INTO news (title, body, channel, created_at) VALUES ($1, $2, $3, $4) RETURNING id', [
      title.slice(0, 120), body.slice(0, 4000), channel, Date.now(),
    ]);
    console.log(`Posted news #${id}${channel ? ` for the ${channel} channel` : ''}. Launchers show it within a minute.`);
  },
  async 'news-delete'(id) {
    const row = await one('SELECT * FROM news WHERE id = $1', [idArg(id)]);
    if (!row) fail(`No news post #${id}.`);
    if (!flags.yes) fail(`This deletes "${row.title}". Add --yes to confirm.`);
    await exec('DELETE FROM news WHERE id = $1', [row.id]);
    console.log(`Deleted "${row.title}".`);
  },
  async flags() {
    const rows = (await all('SELECT key, channel, value, note, updated_at FROM flags ORDER BY key, channel'))
      .map((r) => ({ ...r, channel: r.channel || 'everyone', changed: date(r.updated_at), note: r.note || '' }));
    table(rows, [['key', 'Flag'], ['channel', 'For'], ['value', 'Value'], ['changed', 'Changed'], ['note', 'Note']]);
  },
  async 'flag-set'(key, value) {
    if (!key || !/^[a-z][a-z0-9_.]{1,60}$/.test(key)) fail('Flag names use lowercase letters, digits, _ and dots, like game.xp_multiplier.');
    if (value === undefined) fail('Give a value: true, false, a number or text.');
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value; // plain text
    }
    const channel = channelOption();
    await exec(
      `INSERT INTO flags (key, channel, value, note, updated_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key, channel) DO UPDATE SET value = excluded.value, note = COALESCE(excluded.note, flags.note),
       updated_at = excluded.updated_at`,
      [key, channel, JSON.stringify(parsed), options.note || null, Date.now()],
    );
    console.log(`${key} = ${JSON.stringify(parsed)}${channel ? ` on ${channel}` : ''}. Applies the next time players press Play.`);
  },
  async 'flag-unset'(key) {
    const channel = channelOption();
    const changes = await exec('DELETE FROM flags WHERE key = $1 AND channel = $2', [String(key), channel]);
    if (!changes) fail(`No flag ${key}${channel ? ` on ${channel}` : ''}.`);
    console.log(`Removed ${key}${channel ? ` on ${channel}` : ''}.`);
  },
  async crashes(count = '20') {
    const rows = (await all('SELECT id, at, source, version, channel, message FROM crashes ORDER BY at DESC, id DESC LIMIT $1', [clampCount(count, 20, 500)]))
      .map((r) => ({ ...r, when: date(r.at), message: r.message.length > 70 ? `${r.message.slice(0, 69)}…` : r.message }));
    table(rows, [['id', 'Id'], ['when', 'When'], ['source', 'From'], ['version', 'Version'], ['channel', 'Channel'], ['message', 'Message']]);
    if (rows.length) console.log('\nDetails: node admin.mjs crash <id>');
  },
  async crash(id) {
    const r = await one('SELECT * FROM crashes WHERE id = $1', [idArg(id)]);
    if (!r) fail(`No crash report #${id}.`);
    console.log(`Crash #${r.id}, ${date(r.at)}, ${r.source} ${r.version || ''} (${r.channel || '?'}) on ${r.platform || '?'}`);
    console.log(`Install ${r.install_id || '?'}\n\n${r.message}\n`);
    if (r.detail) console.log(r.detail);
  },
  async telemetry(days = '7') {
    const n = clampCount(days, 7, 3650);
    const since = Date.now() - n * 864e5;
    console.log(`Last ${n} days\n`);
    console.log(`${'installs'.padEnd(20)} ${(await one('SELECT COUNT(DISTINCT install_id) AS n FROM telemetry WHERE at > $1', [since])).n}`);
    // props is JSON text (cut at 2000 characters, so try_jsonb skips the odd broken one).
    const sessions = await one(
      `SELECT COUNT(*) AS n, AVG(CASE WHEN jsonb_typeof(try_jsonb(props) -> 'minutes') = 'number'
                                      THEN (try_jsonb(props) ->> 'minutes')::float8 END) AS avg
       FROM telemetry WHERE at > $1 AND event = 'game.exit'`,
      [since],
    );
    console.log(`${'game sessions'.padEnd(20)} ${sessions.n}${sessions.avg ? ` (avg ${sessions.avg.toFixed(1)} min)` : ''}`);
    console.log(`${'crashes'.padEnd(20)} ${(await one('SELECT COUNT(*) AS n FROM crashes WHERE at > $1', [since])).n}\n`);
    const events = await all('SELECT event, COUNT(*) AS count FROM telemetry WHERE at > $1 GROUP BY event ORDER BY count DESC, event', [since]);
    table(events, [['event', 'Event'], ['count', 'Count']]);
    const classes = await all(
      `SELECT try_jsonb(props) ->> 'heroClass' AS class, COUNT(*) AS plays FROM telemetry
       WHERE at > $1 AND event = 'game.start' GROUP BY 1 ORDER BY plays DESC, 1`,
      [since],
    );
    if (classes.length) {
      console.log('');
      table(classes, [['class', 'Class'], ['plays', 'Plays']]);
    }
    const versions = await all(
      'SELECT version, channel, COUNT(DISTINCT install_id) AS installs FROM telemetry WHERE at > $1 GROUP BY version, channel ORDER BY installs DESC, version',
      [since],
    );
    if (versions.length) {
      console.log('');
      table(versions, [['version', 'Version'], ['channel', 'Channel'], ['installs', 'Installs']]);
    }
  },
});

// ---------------------------------------------------------------- main
const argv = process.argv.slice(2);
const flags = { yes: argv.includes('--yes') || argv.includes('-y') };
// --channel <name>, --note <text> and --format <kind> take a value.
const options = {};
const rest = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--yes' || a === '-y') continue;
  if ((a === '--channel' || a === '--note' || a === '--format') && i + 1 < argv.length) options[a.slice(2)] = argv[++i];
  else rest.push(a);
}
const [command, ...args] = rest;
const known = Object.hasOwn(run, command ?? '');
if (!command || command === 'help' || command === '--help' || !known) {
  const unknown = command && !known && command !== 'help' && command !== '--help';
  if (unknown) console.error(`Unknown command: ${command}\n`);
  usage();
  process.exit(unknown ? 1 : 0);
}
let code = 0;
try {
  await run[command](...args);
} catch (error) {
  if (!(error instanceof AdminError)) throw error;
  console.error(error.message);
  code = 1;
} finally {
  await pool?.end().catch(() => {});
}
process.exit(code);
