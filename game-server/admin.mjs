#!/usr/bin/env node
// Depths of Darkness — server admin CLI. Works on the server's database directly, so it runs on the
// machine (or in the container) that hosts the server. No npm packages needed.
//
//   node admin.mjs <command> [arguments]
//
//   On the Raspberry Pi with Docker:   docker exec -it depths-server node admin.mjs accounts
//   From a clone of the repo:          bun run admin accounts    (uses game-server/data)
//
// It uses the same settings as server.mjs (DATA_DIR from the environment or config.json).
// Changes take effect right away, also while the server runs. Commands that delete something ask
// for --yes. Run without arguments for the list of commands.

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const fileConfig = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8'));
  } catch {
    return {};
  }
})();
const setting = (key, fallback) => process.env[key] ?? fileConfig[key] ?? fallback;
const DATA_DIR = path.resolve(here, setting('DATA_DIR', 'data'));
const DB_FILE = path.join(DATA_DIR, 'depths.db');
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
  backup: ['[file]', 'Copy the database to a file (default: data/backups/depths-<date>.db)'],
  restore: ['<file> --yes', 'Replace the database with a backup (stop the server first)'],
};

// ---------------------------------------------------------------- output helpers
class AdminError extends Error {}
const fail = (message) => {
  throw new AdminError(message);
};
const date = (ms) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) : 'never');
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
  console.log(`\nDatabase: ${DB_FILE}`);
}

// ---------------------------------------------------------------- database
function openDb() {
  if (!fs.existsSync(DB_FILE)) fail(`No database at ${DB_FILE}. Start the server once, or set DATA_DIR.`);
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return db;
}
function account(db, username) {
  if (!username) fail('Which account? Give the username.');
  const row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
  if (!row) fail(`No account called "${username}".`);
  return row;
}
function character(db, acc, name) {
  if (!name) fail('Which character? Give the character name.');
  const row = db.prepare('SELECT * FROM characters WHERE account_id = ? AND name = ? COLLATE NOCASE').get(acc.id, name);
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

// ---------------------------------------------------------------- commands
const run = {
  accounts() {
    const db = openDb();
    const rows = db
      .prepare(`SELECT a.username, a.created_at, a.last_login_at, COUNT(c.id) AS chars
                FROM accounts a LEFT JOIN characters c ON c.account_id = a.id GROUP BY a.id ORDER BY a.username`)
      .all()
      .map((r) => ({ ...r, created: date(r.created_at), login: date(r.last_login_at) }));
    table(rows, [['username', 'Username'], ['chars', 'Characters'], ['created', 'Created'], ['login', 'Last login']]);
  },

  characters(username) {
    const db = openDb();
    const where = username ? 'WHERE a.id = ?' : '';
    const params = username ? [account(db, username).id] : [];
    const rows = db
      .prepare(`SELECT a.username, c.name, c.hero_class, c.hero_level, c.depth, c.updated_at
                FROM characters c JOIN accounts a ON a.id = c.account_id ${where} ORDER BY a.username, c.created_at`)
      .all(...params)
      .map((r) => ({ ...r, played: date(r.updated_at) }));
    table(rows, [['username', 'Account'], ['name', 'Name'], ['hero_class', 'Class'], ['hero_level', 'Level'], ['depth', 'Depth'], ['played', 'Last saved']]);
  },

  async 'reset-password'(username, password) {
    const db = openDb();
    const acc = account(db, username);
    const generated = !password;
    const next = password || crypto.randomBytes(9).toString('base64url');
    if (next.length < 6 || next.length > 128) fail('The password must be 6–128 characters.');
    db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(await hashPassword(next), acc.id);
    const { changes } = db.prepare('DELETE FROM sessions WHERE account_id = ?').run(acc.id);
    console.log(`Password for ${acc.username} changed${generated ? ` to: ${next}` : ''}.`);
    console.log(`Signed out of ${changes} session${changes === 1 ? '' : 's'}.`);
  },

  'rename-character'(username, name, newName) {
    const db = openDb();
    const acc = account(db, username);
    const ch = character(db, acc, name);
    const clean = String(newName || '').trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(clean)) fail("New name must be 2–18 letters (spaces, - and ' allowed).");
    const clash = db.prepare('SELECT id FROM characters WHERE account_id = ? AND name = ? COLLATE NOCASE AND id != ?').get(acc.id, clean, ch.id);
    if (clash) fail(`${acc.username} already has a character called "${clean}".`);
    db.prepare('UPDATE characters SET name = ? WHERE id = ?').run(clean, ch.id);
    console.log(`Renamed ${ch.name} to ${clean}.`);
  },

  'delete-character'(username, name) {
    const db = openDb();
    const acc = account(db, username);
    const ch = character(db, acc, name);
    if (!flags.yes) fail(`This deletes ${ch.name} (level ${ch.hero_level} ${ch.hero_class}) for good. Add --yes to confirm.`);
    db.prepare('DELETE FROM characters WHERE id = ?').run(ch.id);
    console.log(`Deleted ${ch.name}.`);
  },

  'delete-account'(username) {
    const db = openDb();
    const acc = account(db, username);
    const n = db.prepare('SELECT COUNT(*) AS n FROM characters WHERE account_id = ?').get(acc.id).n;
    if (!flags.yes) fail(`This deletes ${acc.username} and ${n} character${n === 1 ? '' : 's'} for good. Add --yes to confirm.`);
    db.prepare('DELETE FROM accounts WHERE id = ?').run(acc.id);
    console.log(`Deleted ${acc.username} and ${n} character${n === 1 ? '' : 's'}.`);
  },

  'sign-out'(username) {
    const db = openDb();
    const acc = account(db, username);
    const { changes } = db.prepare('DELETE FROM sessions WHERE account_id = ?').run(acc.id);
    console.log(`Signed ${acc.username} out of ${changes} session${changes === 1 ? '' : 's'}.`);
  },

  stats() {
    const db = openDb();
    const count = (sql) => db.prepare(sql).get().n;
    const size = fs.statSync(DB_FILE).size + (fs.existsSync(`${DB_FILE}-wal`) ? fs.statSync(`${DB_FILE}-wal`).size : 0);
    const rows = [
      ['accounts', count('SELECT COUNT(*) AS n FROM accounts')],
      ['characters', count('SELECT COUNT(*) AS n FROM characters')],
      ['played in 3D', count("SELECT COUNT(*) AS n FROM characters WHERE data LIKE '%\"dod3d\"%'")],
      ['sessions', count(`SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ${Date.now()}`)],
      ['active (7 days)', count(`SELECT COUNT(*) AS n FROM accounts WHERE last_login_at > ${Date.now() - 7 * 864e5}`)],
      ['database', `${(size / 1024).toFixed(0)} KB`],
      ['server', serverRunning() ? 'running' : 'not running'],
    ];
    for (const [k, v] of rows) console.log(`${k.padEnd(16)} ${v}`);
  },

  backup(file) {
    const db = openDb();
    const target = path.resolve(file || path.join(DATA_DIR, 'backups', `depths-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.db`));
    if (fs.existsSync(target)) fail(`${target} already exists.`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // VACUUM INTO writes a consistent copy, also while the server is writing.
    db.prepare('VACUUM INTO ?').run(target);
    console.log(`Backed up to ${target} (${(fs.statSync(target).size / 1024).toFixed(0)} KB).`);
  },

  restore(file) {
    if (!file) fail('Which backup? Give the file.');
    const source = path.resolve(file);
    if (!fs.existsSync(source)) fail(`No file at ${source}.`);
    if (serverRunning()) fail('Stop the server first (docker compose stop, or Ctrl+C), then restore.');
    const check = new DatabaseSync(source, { readOnly: true });
    const ok = check.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('accounts', 'characters')").get().n === 2;
    check.close();
    if (!ok) fail(`${source} isn't a Depths of Darkness database.`);
    if (!flags.yes) fail(`This replaces ${DB_FILE} with ${source}. Add --yes to confirm.`);
    if (fs.existsSync(DB_FILE)) {
      const keep = `${DB_FILE}.before-restore-${Date.now()}`;
      fs.copyFileSync(DB_FILE, keep);
      console.log(`Kept the old database as ${keep}.`);
    }
    for (const extra of ['-wal', '-shm']) fs.rmSync(DB_FILE + extra, { force: true });
    fs.copyFileSync(source, DB_FILE);
    console.log(`Restored ${source}. Start the server again.`);
  },
};

// ---------------------------------------------------------------- news, flags, crashes, telemetry
const CHANNELS = ['beta', 'dev'];
function channelOption() {
  if (!options.channel) return '';
  if (!CHANNELS.includes(options.channel)) fail('--channel must be beta or dev (leave it out for everyone).');
  return options.channel;
}
function needTable(db, name) {
  const ok = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  if (!ok) fail('This database has no news, flags or reports yet. Start the 0.4.0 server once to add them.');
}
Object.assign(run, {
  news() {
    const db = openDb();
    needTable(db, 'news');
    const rows = db.prepare('SELECT id, title, channel, created_at FROM news ORDER BY created_at DESC').all()
      .map((r) => ({ ...r, channel: r.channel || 'everyone', posted: date(r.created_at) }));
    table(rows, [['id', 'Id'], ['posted', 'Posted'], ['channel', 'For'], ['title', 'Title']]);
  },
  'news-post'(title, body) {
    const db = openDb();
    needTable(db, 'news');
    if (!title || !body) fail('Give a title and the text, each in quotes: news-post "Server maintenance" "Down Friday 20:00 for an hour."');
    const channel = channelOption();
    const { lastInsertRowid } = db.prepare('INSERT INTO news (title, body, channel, created_at) VALUES (?, ?, ?, ?)')
      .run(title.slice(0, 120), body.slice(0, 4000), channel, Date.now());
    console.log(`Posted news #${lastInsertRowid}${channel ? ` for the ${channel} channel` : ''}. Launchers show it within a minute.`);
  },
  'news-delete'(id) {
    const db = openDb();
    needTable(db, 'news');
    const row = db.prepare('SELECT * FROM news WHERE id = ?').get(Number(id));
    if (!row) fail(`No news post #${id}.`);
    if (!flags.yes) fail(`This deletes "${row.title}". Add --yes to confirm.`);
    db.prepare('DELETE FROM news WHERE id = ?').run(row.id);
    console.log(`Deleted "${row.title}".`);
  },
  flags() {
    const db = openDb();
    needTable(db, 'flags');
    const rows = db.prepare('SELECT key, channel, value, note, updated_at FROM flags ORDER BY key, channel').all()
      .map((r) => ({ ...r, channel: r.channel || 'everyone', changed: date(r.updated_at), note: r.note || '' }));
    table(rows, [['key', 'Flag'], ['channel', 'For'], ['value', 'Value'], ['changed', 'Changed'], ['note', 'Note']]);
  },
  'flag-set'(key, value) {
    const db = openDb();
    needTable(db, 'flags');
    if (!key || !/^[a-z][a-z0-9_.]{1,60}$/.test(key)) fail('Flag names use lowercase letters, digits, _ and dots, like game.xp_multiplier.');
    if (value === undefined) fail('Give a value: true, false, a number or text.');
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value; // plain text
    }
    const channel = channelOption();
    db.prepare(`INSERT INTO flags (key, channel, value, note, updated_at) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(key, channel) DO UPDATE SET value = excluded.value, note = COALESCE(excluded.note, flags.note),
                updated_at = excluded.updated_at`)
      .run(key, channel, JSON.stringify(parsed), options.note || null, Date.now());
    console.log(`${key} = ${JSON.stringify(parsed)}${channel ? ` on ${channel}` : ''}. Applies the next time players press Play.`);
  },
  'flag-unset'(key) {
    const db = openDb();
    needTable(db, 'flags');
    const channel = channelOption();
    const { changes } = db.prepare('DELETE FROM flags WHERE key = ? AND channel = ?').run(String(key), channel);
    if (!changes) fail(`No flag ${key}${channel ? ` on ${channel}` : ''}.`);
    console.log(`Removed ${key}${channel ? ` on ${channel}` : ''}.`);
  },
  crashes(count = '20') {
    const db = openDb();
    needTable(db, 'crashes');
    const rows = db.prepare('SELECT id, at, source, version, channel, message FROM crashes ORDER BY at DESC LIMIT ?')
      .all(Math.max(1, Math.min(500, Number(count) || 20)))
      .map((r) => ({ ...r, when: date(r.at), message: r.message.length > 70 ? `${r.message.slice(0, 69)}…` : r.message }));
    table(rows, [['id', 'Id'], ['when', 'When'], ['source', 'From'], ['version', 'Version'], ['channel', 'Channel'], ['message', 'Message']]);
    if (rows.length) console.log('\nDetails: node admin.mjs crash <id>');
  },
  crash(id) {
    const db = openDb();
    needTable(db, 'crashes');
    const r = db.prepare('SELECT * FROM crashes WHERE id = ?').get(Number(id));
    if (!r) fail(`No crash report #${id}.`);
    console.log(`Crash #${r.id}, ${date(r.at)}, ${r.source} ${r.version || ''} (${r.channel || '?'}) on ${r.platform || '?'}`);
    console.log(`Install ${r.install_id || '?'}\n\n${r.message}\n`);
    if (r.detail) console.log(r.detail);
  },
  telemetry(days = '7') {
    const db = openDb();
    needTable(db, 'telemetry');
    const since = Date.now() - Math.max(1, Number(days) || 7) * 864e5;
    const one = (sql, ...p) => db.prepare(sql).get(since, ...p);
    console.log(`Last ${Math.max(1, Number(days) || 7)} days\n`);
    console.log(`${'installs'.padEnd(20)} ${one('SELECT COUNT(DISTINCT install_id) AS n FROM telemetry WHERE at > ?').n}`);
    const sessions = one("SELECT COUNT(*) AS n, AVG(CAST(json_extract(props, '$.minutes') AS REAL)) AS avg FROM telemetry WHERE at > ? AND event = 'game.exit'");
    console.log(`${'game sessions'.padEnd(20)} ${sessions.n}${sessions.avg ? ` (avg ${sessions.avg.toFixed(1)} min)` : ''}`);
    console.log(`${'crashes'.padEnd(20)} ${db.prepare('SELECT COUNT(*) AS n FROM crashes WHERE at > ?').get(since).n}\n`);
    const events = db.prepare('SELECT event, COUNT(*) AS count FROM telemetry WHERE at > ? GROUP BY event ORDER BY count DESC').all(since);
    table(events, [['event', 'Event'], ['count', 'Count']]);
    const classes = db.prepare("SELECT json_extract(props, '$.heroClass') AS class, COUNT(*) AS plays FROM telemetry WHERE at > ? AND event = 'game.start' GROUP BY class ORDER BY plays DESC").all(since);
    if (classes.length) {
      console.log('');
      table(classes, [['class', 'Class'], ['plays', 'Plays']]);
    }
    const versions = db.prepare('SELECT version, channel, COUNT(DISTINCT install_id) AS installs FROM telemetry WHERE at > ? GROUP BY version, channel ORDER BY installs DESC').all(since);
    if (versions.length) {
      console.log('');
      table(versions, [['version', 'Version'], ['channel', 'Channel'], ['installs', 'Installs']]);
    }
  },
});

// ---------------------------------------------------------------- main
const argv = process.argv.slice(2);
const flags = { yes: argv.includes('--yes') || argv.includes('-y') };
// --channel <name> and --note <text> take a value.
const options = {};
const rest = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--yes' || a === '-y') continue;
  if ((a === '--channel' || a === '--note') && i + 1 < argv.length) options[a.slice(2)] = argv[++i];
  else rest.push(a);
}
const [command, ...args] = rest;
if (!command || command === 'help' || command === '--help' || !run[command]) {
  if (command && !run[command] && command !== 'help' && command !== '--help') console.error(`Unknown command: ${command}\n`);
  usage();
  process.exit(command && !run[command] && command !== 'help' && command !== '--help' ? 1 : 0);
}
try {
  await run[command](...args);
} catch (error) {
  if (error instanceof AdminError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
