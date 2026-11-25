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
//   UPDATE_URL   where to look for new server versions (default: the GitHub release's
//                server-update.json); set to "off" to turn the check off

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
const SERVER_VERSION = '0.3.2'; // kept equal to package.json by scripts/sync-version.mjs
const UPDATE_URL = String(
  setting('UPDATE_URL', 'https://github.com/simonhultgren5-lang/arpg-game/releases/latest/download/server-update.json'),
);
const SESSION_DAYS = 30;
const MAX_BODY = 4 * 1024 * 1024; // a full save snapshot is well under this
const MAX_CHARACTERS = 5; // characters per account
const HERO_CLASSES = ['warrior', 'pyromancer', 'rogue'];
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
  -- Up to MAX_CHARACTERS heroes per account, each with its own save.
  -- legacy = 1 marks the hero moved over from the old one-save-per-account table, so the
  -- desktop app keeps using the storage that hero already had on the PC.
  CREATE TABLE IF NOT EXISTS characters (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    hero_class TEXT NOT NULL,
    color      TEXT NOT NULL,
    hero_level INTEGER NOT NULL DEFAULT 1,
    depth      INTEGER NOT NULL DEFAULT 1,
    data       TEXT,
    legacy     INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS characters_account ON characters(account_id);
`);

// Move heroes from the old one-save-per-account table into characters (once per account).
db.exec(`
  INSERT INTO characters (account_id, name, hero_class, color, hero_level, depth, data, legacy, created_at, updated_at)
  SELECT s.account_id, COALESCE(NULLIF(TRIM(s.hero_name), ''), 'Hero'), COALESCE(s.hero_class, 'warrior'), '#8d3430',
         COALESCE(s.hero_level, 1), COALESCE(s.depth, 1), s.data, 1, s.updated_at, s.updated_at
  FROM saves s
  WHERE NOT EXISTS (SELECT 1 FROM characters c WHERE c.account_id = s.account_id);
  -- The hero now lives in characters, so a character deleted later stays deleted.
  DELETE FROM saves WHERE account_id IN (SELECT account_id FROM characters);
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
  listCharacters: db.prepare(`SELECT id, name, hero_class, color, hero_level, depth, legacy, created_at, updated_at
                               FROM characters WHERE account_id = ? ORDER BY created_at, id`),
  countCharacters: db.prepare('SELECT COUNT(*) AS n FROM characters WHERE account_id = ?'),
  characterByName: db.prepare('SELECT id FROM characters WHERE account_id = ? AND name = ? COLLATE NOCASE'),
  getCharacter: db.prepare('SELECT * FROM characters WHERE id = ? AND account_id = ?'),
  firstCharacter: db.prepare('SELECT * FROM characters WHERE account_id = ? ORDER BY created_at, id LIMIT 1'),
  createCharacter: db.prepare(`INSERT INTO characters (account_id, name, hero_class, color, legacy, created_at)
                                VALUES (?, ?, ?, ?, ?, ?)`),
  deleteCharacter: db.prepare('DELETE FROM characters WHERE id = ? AND account_id = ?'),
  putCharacterSave: db.prepare(`UPDATE characters SET data = ?, hero_level = COALESCE(?, hero_level),
                                  depth = COALESCE(?, depth), updated_at = ? WHERE id = ? AND account_id = ?`),
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
// ---------------------------------------------------------------- characters
const NAME_RE = /^[A-Za-z][A-Za-z '-]{1,17}$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
function validateNewCharacter(body) {
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!NAME_RE.test(name)) throw new HttpError(400, "Name must be 2–18 letters (spaces, - and ' allowed).");
  const heroClass = HERO_CLASSES.includes(body.heroClass) ? body.heroClass : null;
  if (!heroClass) throw new HttpError(400, 'Pick a class.');
  const color = COLOR_RE.test(body.color) ? body.color.toLowerCase() : '#8d3430';
  return { name, heroClass, color };
}
const publicCharacter = (row) => ({
  id: row.id,
  name: row.name,
  heroClass: row.hero_class,
  color: row.color,
  level: row.hero_level,
  depth: row.depth,
  legacy: Boolean(row.legacy),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
const characterList = (accountId) => ({
  characters: q.listCharacters.all(accountId).map(publicCharacter),
  maxCharacters: MAX_CHARACTERS,
});
function cleanSaveData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Save data is missing.');
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if ((key === 'mdjup' || key.startsWith('dod')) && typeof value === 'string') clean[key] = value;
  }
  return clean;
}
const intOrNull = (v) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null);
// The 2D game and the 3D game (godot/) share a character's save. The 3D game only writes keys that
// start with "dod3d"; the 2D game writes everything else. Each write replaces only its own side, so
// playing one never erases the other's progress.
const is3dKey = (key) => key.startsWith('dod3d');
function writeCharacterSave(accountId, characterId, body) {
  const incoming = cleanSaveData(body.data);
  const keys = Object.keys(incoming);
  const from3d = keys.length > 0 && keys.every(is3dKey);
  const row = q.getCharacter.get(characterId, accountId);
  if (!row) throw new HttpError(404, 'That character no longer exists.');
  let existing = {};
  try {
    existing = row.data ? JSON.parse(row.data) : {};
  } catch {
    existing = {};
  }
  const merged = {};
  for (const [key, value] of Object.entries(existing)) if (is3dKey(key) !== from3d) merged[key] = value;
  for (const [key, value] of Object.entries(incoming)) if (is3dKey(key) === from3d) merged[key] = value;
  // The launcher's level and depth follow the 2D game while 3D is a preview.
  const meta = !from3d && body.meta && typeof body.meta === 'object' ? body.meta : {};
  const updatedAt = Date.now();
  const { changes } = q.putCharacterSave.run(
    JSON.stringify(merged),
    intOrNull(meta.heroLevel),
    intOrNull(meta.depth),
    updatedAt,
    characterId,
    accountId,
  );
  if (!changes) throw new HttpError(404, 'That character no longer exists.');
  return { updatedAt };
}
const characterSave = (row) =>
  row?.data
    ? { ...publicCharacter(row), heroName: row.name, heroLevel: row.hero_level, data: JSON.parse(row.data) }
    : null;
// Launchers before 0.3 know one hero per account: show them the account's first character.
function legacySaveMeta(accountId) {
  const row = q.firstCharacter.get(accountId);
  return row?.data
    ? { heroName: row.name, heroClass: row.hero_class, heroLevel: row.hero_level, depth: row.depth, updatedAt: row.updated_at }
    : null;
}

// ---------------------------------------------------------------- update check
// Looks for a newer server release every 6 hours. The server never updates itself (inside Docker it
// can't); it reports the new version in /api/status and the log, and update.sh installs it.
let latestRelease = null;
const versionParts = (v) => String(v).replace(/^v/, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0);
function newerThan(a, b) {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
async function checkForUpdate() {
  if (!/^https?:\/\//.test(UPDATE_URL)) return;
  try {
    const res = await fetch(UPDATE_URL, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' } });
    if (!res.ok) return;
    const info = await res.json();
    if (typeof info?.version !== 'string') return;
    const wasKnown = latestRelease?.version === info.version;
    latestRelease = { version: info.version, notes: typeof info.notes === 'string' ? info.notes.slice(0, 2000) : '' };
    if (!wasKnown && newerThan(info.version, SERVER_VERSION)) {
      console.log(`[update] Server ${info.version} is available (running ${SERVER_VERSION}). On the Pi run: bash update.sh`);
    }
  } catch {
    // Offline or GitHub unreachable: try again at the next check.
  }
}
checkForUpdate();
setInterval(checkForUpdate, 6 * 3600 * 1000).unref();

// ---------------------------------------------------------------- routes
const routes = {
  'GET /api/status': () => ({
    online: true,
    // What this server supports; the launcher checks it before offering features that need it.
    features: ['characters', 'save-merge'],
    name: SERVER_NAME,
    motd: MOTD,
    version: SERVER_VERSION,
    // A newer server release on GitHub, if any. Install it on the Pi with game-server/update.sh.
    update: latestRelease && newerThan(latestRelease.version, SERVER_VERSION)
      ? { version: latestRelease.version, notes: latestRelease.notes || '' }
      : null,
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
    return { token: newSession(id), user: { username }, save: null, ...characterList(id) };
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
      save: legacySaveMeta(account.id),
      ...characterList(account.id),
    };
  },

  'POST /api/auth/logout': (req) => {
    const { token } = requireAccount(req);
    q.deleteSession.run(hashToken(token));
    return { ok: true };
  },

  'GET /api/auth/me': (req) => {
    const { account } = requireAccount(req);
    return { user: { username: account.username }, save: legacySaveMeta(account.id), ...characterList(account.id) };
  },

  // ---- one save per account (launchers before 0.3): the account's first character
  'GET /api/save': (req) => {
    const { account } = requireAccount(req);
    return { save: characterSave(q.firstCharacter.get(account.id)) };
  },

  'PUT /api/save': async (req) => {
    const { account } = requireAccount(req);
    const body = await readJson(req);
    let row = q.firstCharacter.get(account.id);
    if (!row) {
      const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
      const wanted = typeof meta.heroName === 'string' ? meta.heroName.trim() : '';
      const name = NAME_RE.test(wanted) ? wanted : 'Hero';
      const heroClass = HERO_CLASSES.includes(meta.heroClass) ? meta.heroClass : 'warrior';
      const { lastInsertRowid } = q.createCharacter.run(account.id, name, heroClass, '#8d3430', 1, Date.now());
      row = { id: Number(lastInsertRowid) };
    }
    return writeCharacterSave(account.id, row.id, body);
  },

  // ---- characters (launcher 0.3+)
  'GET /api/characters': (req) => characterList(requireAccount(req).account.id),

  'POST /api/characters': async (req) => {
    const { account } = requireAccount(req);
    const { name, heroClass, color } = validateNewCharacter(await readJson(req));
    if (q.countCharacters.get(account.id).n >= MAX_CHARACTERS) {
      throw new HttpError(409, `You already have ${MAX_CHARACTERS} characters. Delete one to make room.`);
    }
    if (q.characterByName.get(account.id, name)) throw new HttpError(409, 'You already have a character with that name.');
    const { lastInsertRowid } = q.createCharacter.run(account.id, name, heroClass, color, 0, Date.now());
    console.log(`[character] ${account.username} created ${name} (${heroClass})`);
    return { character: publicCharacter(q.getCharacter.get(Number(lastInsertRowid), account.id)), ...characterList(account.id) };
  },
};

// Routes with a character id: DELETE /api/characters/:id, GET|PUT /api/characters/:id/save
function paramRoute(method, pathname) {
  const m = /^\/api\/characters\/(\d{1,12})(\/save)?$/.exec(pathname);
  if (!m) return null;
  const id = Number(m[1]);
  const owned = (req) => {
    const { account } = requireAccount(req);
    const row = q.getCharacter.get(id, account.id);
    if (!row) throw new HttpError(404, 'That character no longer exists.');
    return { account, row };
  };
  if (m[2] && method === 'GET') return (req) => ({ save: characterSave(owned(req).row) });
  if (m[2] && method === 'PUT') {
    return async (req) => {
      const { account } = owned(req);
      return writeCharacterSave(account.id, id, await readJson(req));
    };
  }
  if (!m[2] && method === 'DELETE') {
    return (req) => {
      const { account, row } = owned(req);
      q.deleteCharacter.run(id, account.id);
      console.log(`[character] ${account.username} deleted ${row.name}`);
      return { ok: true, ...characterList(account.id) };
    };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const handler = routes[`${req.method} ${url.pathname}`] || paramRoute(req.method, url.pathname);
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
