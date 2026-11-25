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

// ---------------------------------------------------------------- main
const argv = process.argv.slice(2);
const flags = { yes: argv.includes('--yes') || argv.includes('-y') };
const [command, ...args] = argv.filter((a) => a !== '--yes' && a !== '-y');
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
