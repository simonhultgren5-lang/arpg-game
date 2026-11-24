#!/usr/bin/env node
// Depths of Darkness — game server (accounts, cloud saves, status).
// No npm packages needed: runs on Node.js 22.13+ using the built-in SQLite and crypto modules.
// Designed to run on a Raspberry Pi on your home network. See game-server/README.md.
//
//   node game-server/server.mjs
//
// Settings (environment variables or game-server/config.json):
//   PORT         port to listen on                  (default 4100)
//   HOST         address to listen on               (default 0.0.0.0 = whole network)
//   DATA_DIR     folder for the database file       (default game-server/data)
//   SERVER_NAME  name shown in the launcher         (default "Depths Server")
//   MOTD         message of the day in the launcher (default empty)

import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
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

const PORT = Number(setting('PORT', 4100));
const HOST = setting('HOST', '0.0.0.0');
const DATA_DIR = path.resolve(here, setting('DATA_DIR', 'data'));
const SERVER_NAME = String(setting('SERVER_NAME', 'Depths Server')).slice(0, 40);
const MOTD = String(setting('MOTD', '')).slice(0, 200);
const SERVER_VERSION = '1.0.0';
const SESSION_DAYS = 30;
const MAX_BODY = 4 * 1024 * 1024; // a full save snapshot is well under this
const STARTED_AT = Date.now();

// ---------------------------------------------------------------- database
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'depths.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS accounts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    last_login_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saves (
    account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    data       TEXT NOT NULL,
    hero_name  TEXT,
    hero_class TEXT,
    hero_level INTEGER,
    depth      INTEGER,
    updated_at INTEGER NOT NULL
  );
`);

const q = {
  accountByName: db.prepare('SELECT * FROM accounts WHERE username = ?'),
  createAccount: db.prepare('INSERT INTO accounts (username, password_hash, created_at) VALUES (?, ?, ?)'),
  touchLogin: db.prepare('UPDATE accounts SET last_login_at = ? WHERE id = ?'),
  countAccounts: db.prepare('SELECT COUNT(*) AS n FROM accounts'),
  createSession: db.prepare('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
  sessionAccount: db.prepare(`SELECT a.id, a.username FROM sessions s JOIN accounts a ON a.id = s.account_id
                              WHERE s.token_hash = ? AND s.expires_at > ?`),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  getSave: db.prepare('SELECT * FROM saves WHERE account_id = ?'),
  getSaveMeta: db.prepare('SELECT hero_name, hero_class, hero_level, depth, updated_at FROM saves WHERE account_id = ?'),
  putSave: db.prepare(`INSERT INTO saves (account_id, data, hero_name, hero_class, hero_level, depth, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?)
                       ON CONFLICT(account_id) DO UPDATE SET data = excluded.data, hero_name = excluded.hero_name,
                         hero_class = excluded.hero_class, hero_level = excluded.hero_level, depth = excluded.depth,
                         updated_at = excluded.updated_at`),
};
q.purgeSessions.run(Date.now());

// ---------------------------------------------------------------- passwords & tokens
const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
async function verifyPassword(password, stored) {
  const [kind, saltB64, keyB64] = String(stored).split('$');
  if (kind !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
function newSession(accountId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  q.createSession.run(hashToken(token), accountId, now, now + SESSION_DAYS * 864e5);
  return token;
}

// ---------------------------------------------------------------- login throttling (per IP)
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 10 * 60e3);
  attempts.set(ip, list);
  return list.length >= 10;
}
const recordFailure = (ip) => attempts.set(ip, [...(attempts.get(ip) || []), Date.now()]);

// ---------------------------------------------------------------- http helpers
function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Cache-Control': 'no-store',
  });
  res.end(json);
}
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Request is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Invalid JSON.'));
      }
    });
    req.on('error', reject);
  });
}
function requireAccount(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const account = token ? q.sessionAccount.get(hashToken(token), Date.now()) : null;
  if (!account) throw new HttpError(401, 'Please log in again.');
  return { account, token };
}
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
function validateCredentials(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, 'Username must be 3–20 letters, numbers or underscores.');
  }
  if (password.length < 6 || password.length > 128) {
    throw new HttpError(400, 'Password must be at least 6 characters.');
  }
  return { username, password };
}
const publicSave = (row) =>
  row
    ? {
        heroName: row.hero_name,
        heroClass: row.hero_class,
        heroLevel: row.hero_level,
        depth: row.depth,
        updatedAt: row.updated_at,
      }
    : null;

// ---------------------------------------------------------------- routes
const routes = {
  'GET /api/status': () => ({
    online: true,
    name: SERVER_NAME,
    motd: MOTD,
    version: SERVER_VERSION,
    accounts: q.countAccounts.get().n,
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
  }),

  'POST /api/auth/register': async (req) => {
    const ip = req.socket.remoteAddress;
    if (tooManyAttempts(ip)) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    const { username, password } = validateCredentials(await readJson(req));
    if (q.accountByName.get(username)) {
      recordFailure(ip);
      throw new HttpError(409, 'That username is taken.');
    }
    const now = Date.now();
    const { lastInsertRowid } = q.createAccount.run(username, await hashPassword(password), now);
    const id = Number(lastInsertRowid);
    q.touchLogin.run(now, id);
    console.log(`[account] registered ${username}`);
    return { token: newSession(id), user: { username }, save: null };
  },

  'POST /api/auth/login': async (req) => {
    const ip = req.socket.remoteAddress;
    if (tooManyAttempts(ip)) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    const body = await readJson(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const account = username ? q.accountByName.get(username) : null;
    if (!account || !(await verifyPassword(password, account.password_hash))) {
      recordFailure(ip);
      throw new HttpError(401, 'Wrong username or password.');
    }
    q.touchLogin.run(Date.now(), account.id);
    return {
      token: newSession(account.id),
      user: { username: account.username },
      save: publicSave(q.getSaveMeta.get(account.id)),
    };
  },

  'POST /api/auth/logout': (req) => {
    const { token } = requireAccount(req);
    q.deleteSession.run(hashToken(token));
    return { ok: true };
  },

  'GET /api/auth/me': (req) => {
    const { account } = requireAccount(req);
    return { user: { username: account.username }, save: publicSave(q.getSaveMeta.get(account.id)) };
  },

  'GET /api/save': (req) => {
    const { account } = requireAccount(req);
    const row = q.getSave.get(account.id);
    return { save: row ? { ...publicSave(row), data: JSON.parse(row.data) } : null };
  },

  'PUT /api/save': async (req) => {
    const { account } = requireAccount(req);
    const body = await readJson(req);
    const data = body.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Save data is missing.');
    const clean = {};
    for (const [key, value] of Object.entries(data)) {
      if ((key === 'mdjup' || key.startsWith('dod')) && typeof value === 'string') clean[key] = value;
    }
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
    const updatedAt = Date.now();
    q.putSave.run(
      account.id,
      JSON.stringify(clean),
      typeof meta.heroName === 'string' ? meta.heroName.slice(0, 32) : null,
      typeof meta.heroClass === 'string' ? meta.heroClass.slice(0, 20) : null,
      Number.isFinite(Number(meta.heroLevel)) ? Math.trunc(Number(meta.heroLevel)) : null,
      Number.isFinite(Number(meta.depth)) ? Math.trunc(Number(meta.depth)) : null,
      updatedAt,
    );
    return { updatedAt };
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { error: 'Not found.' });
  try {
    send(res, 200, await handler(req));
  } catch (error) {
    if (error instanceof HttpError) return send(res, error.status, { error: error.message });
    console.error(`[error] ${req.method} ${url.pathname}:`, error);
    send(res, 500, { error: 'Server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on http://${HOST}:${PORT}`);
  console.log(`Database: ${path.join(DATA_DIR, 'depths.db')}`);
});

const shutdown = () => {
  server.close();
  db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
