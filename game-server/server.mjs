#!/usr/bin/env node
// Depths of Darkness — game server (accounts, cloud saves, status).
// Runs on Node.js 22.13+ with its data in PostgreSQL (one npm package: pg; `npm ci` in game-server/).
// Designed to run on a Raspberry Pi on your home network. See game-server/README.md.
//
//   node game-server/server.mjs
//
// Settings (environment variables or game-server/config.json):
//   DATABASE_URL PostgreSQL address  (default postgres://depths:depths@127.0.0.1:5432/depths,
//                the database from docker-compose.yml)
//   PORT         port to listen on                  (default 4100)
//   HOST         address to listen on               (default 0.0.0.0 = whole network)
//   DATA_DIR     folder for server.pid, backups and an old SQLite database to import (default game-server/data)
//   SERVER_NAME  name shown in the launcher         (default "Depths Server")
//   MOTD         message of the day in the launcher (default empty)
//   UPDATE_URL   where to look for new server versions (default: the GitHub release's
//                server-update.json); set to "off" to turn the check off
//
// On its first start it imports data/depths.db (the SQLite database of servers before 1.0.0)
// into PostgreSQL and renames the file to depths.db.imported-<date>. See db.mjs.

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { DATA_DIR, DATABASE_URL, createPool, importSqlite, migrate, redactUrl, setting, tx, waitForDatabase } from './db.mjs';

const PORT = Number(setting('PORT', 4100));
const HOST = setting('HOST', '0.0.0.0');
const SERVER_NAME = String(setting('SERVER_NAME', 'Depths Server')).slice(0, 40);
const MOTD = String(setting('MOTD', '')).slice(0, 200);
const SERVER_VERSION = '1.0.0'; // kept equal to package.json by scripts/sync-version.mjs
const UPDATE_URL = String(
  setting('UPDATE_URL', 'https://github.com/simonhultgren5-lang/arpg-game/releases/latest/download/server-update.json'),
);
const SESSION_DAYS = 30;
const MAX_BODY = 4 * 1024 * 1024; // a full save snapshot is well under this
const MAX_CHARACTERS = 5; // characters per account
const HERO_CLASSES = ['warrior', 'pyromancer', 'rogue'];
const CHANNELS = ['stable', 'beta', 'dev'];
const TELEMETRY_DAYS = 90;
const STARTED_AT = Date.now();

// ---------------------------------------------------------------- database
// Connect (waiting for the database container to start), bring the schema up to date, and import an
// old SQLite database once. A failed import stops the server: players must not start over in an
// empty database while their old accounts sit in the file.
fs.mkdirSync(DATA_DIR, { recursive: true });
let db;
try {
  db = await createPool();
  await waitForDatabase(db, { seconds: Number(setting('DB_WAIT_SECONDS', 60)) });
  await migrate(db);
  await importSqlite(db);
} catch (error) {
  console.error(`[db] ${error.message}`);
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === '28P01' || error.code === '3D000') {
    console.error(`[db] Could not use PostgreSQL at ${redactUrl(DATABASE_URL)}. Set DATABASE_URL (environment or config.json);`);
    console.error('[db] see game-server/README.md. With Docker: docker compose up -d starts the database too.');
    if (fs.existsSync('/.dockerenv') && !process.env.DATABASE_URL) {
      // Updated by update.sh from a release before 1.0.0, which kept the old docker-compose.yml.
      console.error('[db] This docker-compose.yml has no database. On the Pi run once:  bash update.sh --force');
    }
  }
  await db?.end().catch(() => {});
  process.exit(1);
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0] ?? null;
const all = async (sql, params) => (await db.query(sql, params)).rows;
const ACCOUNT_BY_NAME = 'SELECT * FROM accounts WHERE lower(username) = lower($1)';
const CHARACTER = 'SELECT * FROM characters WHERE id = $1 AND account_id = $2';
const FIRST_CHARACTER = 'SELECT * FROM characters WHERE account_id = $1 ORDER BY created_at, id LIMIT 1';
const CREATE_CHARACTER = `INSERT INTO characters (account_id, name, hero_class, color, legacy, created_at)
                          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
// Serialises the writes of one account (character limit, first character) across connections.
const lockAccount = (client, accountId) => client.query('SELECT id FROM accounts WHERE id = $1 FOR UPDATE', [accountId]);

await db.query('DELETE FROM sessions WHERE expires_at <= $1', [Date.now()]);
await db.query('DELETE FROM telemetry WHERE at < $1', [Date.now() - TELEMETRY_DAYS * 864e5]);

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
async function newSession(client, accountId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  await client.query('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES ($1, $2, $3, $4)', [
    hashToken(token), accountId, now, now + SESSION_DAYS * 864e5,
  ]);
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
async function requireAccount(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const account = token
    ? await one(`SELECT a.id, a.username FROM sessions s JOIN accounts a ON a.id = s.account_id
                 WHERE s.token_hash = $1 AND s.expires_at > $2`, [hashToken(token), Date.now()])
    : null;
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
const characterList = async (accountId, client = db) => ({
  characters: (
    await client.query(`SELECT id, name, hero_class, color, hero_level, depth, legacy, created_at, updated_at
                        FROM characters WHERE account_id = $1 ORDER BY created_at, id`, [accountId])
  ).rows.map(publicCharacter),
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
const INT_MAX = 2 ** 31 - 1; // hero_level and depth are INTEGER columns
const intOrNull = (v) =>
  v !== null && v !== '' && Number.isFinite(Number(v)) ? Math.max(-INT_MAX, Math.min(INT_MAX, Math.trunc(Number(v)))) : null;
// The game (godot/) writes its progress under the "dod3d" key. Saves from the old 2D game (other
// "dod…" keys, from launchers before 0.4.0) are kept beside it, and each write replaces only its own
// side, so an old launcher can never erase the game's progress.
const is3dKey = (key) => key.startsWith('dod3d');
// Read, merge and write in one transaction with the character row locked, so two saves arriving at
// once (the game and an old launcher, or two PCs) are applied one after the other, never interleaved.
async function writeCharacterSave(client, accountId, characterId, body) {
  const incoming = cleanSaveData(body.data);
  const keys = Object.keys(incoming);
  const from3d = keys.length > 0 && keys.every(is3dKey);
  const row = (await client.query(`${CHARACTER} FOR UPDATE`, [characterId, accountId])).rows[0];
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
  // The launcher's level and depth follow the game; old 2D saves don't change them.
  const meta = from3d && body.meta && typeof body.meta === 'object' ? body.meta : {};
  const updatedAt = Date.now();
  const { rowCount } = await client.query(
    `UPDATE characters SET data = $1, hero_level = COALESCE($2, hero_level), depth = COALESCE($3, depth), updated_at = $4
     WHERE id = $5 AND account_id = $6`,
    [JSON.stringify(merged), intOrNull(meta.heroLevel), intOrNull(meta.depth), updatedAt, characterId, accountId],
  );
  if (!rowCount) throw new HttpError(404, 'That character no longer exists.');
  return { updatedAt };
}
const characterSave = (row) =>
  row?.data
    ? { ...publicCharacter(row), heroName: row.name, heroLevel: row.hero_level, data: JSON.parse(row.data) }
    : null;
// Launchers before 0.3 know one hero per account: show them the account's first character.
async function legacySaveMeta(accountId) {
  const row = await one(FIRST_CHARACTER, [accountId]);
  return row?.data
    ? { heroName: row.name, heroClass: row.hero_class, heroLevel: row.hero_level, depth: row.depth, updatedAt: row.updated_at }
    : null;
}

// ---------------------------------------------------------------- update check
// Looks for a newer server release every 6 hours. The server never updates itself (inside Docker it
// can't); it reports the new version in /api/status and the log, and update.sh installs it.
let latestRelease = null;
const versionParts = (v) => String(v).replace(/^v/, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0);
// "0.4.1" is newer than "0.4.1-beta.2", which is newer than "0.4.0".
function newerThan(a, b) {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  const pa = String(a).split('-')[1] || '';
  const pb = String(b).split('-')[1] || '';
  if (!pa || !pb) return !pa && Boolean(pb);
  return pa.localeCompare(pb, 'en', { numeric: true }) > 0;
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

// ---------------------------------------------------------------- news, feature flags, crash reports, telemetry
// News posts and feature flags are set by the server owner with admin.mjs. Crash reports and telemetry
// come from launchers whose players said yes to sending them (see electron/studio.cjs); nothing is
// tied to an account, only to a random install id.
const channelOf = (url) => (CHANNELS.includes(url.searchParams.get('channel')) ? url.searchParams.get('channel') : 'stable');
// PostgreSQL text can't hold NUL characters (a game log tail might).
const text = (v, max) => (typeof v === 'string' ? v.replaceAll('\0', '').slice(0, max) : null);
// At most `limit` reports per address and hour, so a crash loop can't fill the database.
const reportLimits = new Map();
function rateLimit(req, kind, limit) {
  const key = `${kind}|${req.socket.remoteAddress}`;
  const now = Date.now();
  const list = (reportLimits.get(key) || []).filter((t) => now - t < 3600e3);
  if (list.length >= limit) throw new HttpError(429, 'Too many reports. Try again later.');
  list.push(now);
  reportLimits.set(key, list);
}
async function featureFlags(channel) {
  const out = {};
  // Channel-specific values win over the ones for everyone.
  const rows = (await all(`SELECT key, channel, value FROM flags WHERE channel = '' OR channel = $1`, [channel]))
    .sort((a, b) => (a.channel ? 1 : 0) - (b.channel ? 1 : 0));
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      // skip a broken value
    }
  }
  return out;
}

// ---------------------------------------------------------------- routes
const routes = {
  'GET /api/status': async () => ({
    online: true,
    // What this server supports; the launcher checks it before offering features that need it.
    features: ['characters', 'save-merge', 'news', 'flags', 'crash-reports', 'telemetry', 'change-password'],
    name: SERVER_NAME,
    motd: MOTD,
    version: SERVER_VERSION,
    // A newer server release on GitHub, if any. Install it on the Pi with game-server/update.sh.
    update: latestRelease && newerThan(latestRelease.version, SERVER_VERSION)
      ? { version: latestRelease.version, notes: latestRelease.notes || '' }
      : null,
    accounts: (await one('SELECT COUNT(*) AS n FROM accounts')).n,
    uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
  }),

  // ---- news and feature flags (public; ?channel=stable|beta|dev)
  'GET /api/news': async (req, url) => ({
    news: (
      await all(`SELECT id, title, body, created_at FROM news WHERE channel = '' OR channel = $1
                 ORDER BY created_at DESC, id DESC LIMIT 20`, [channelOf(url)])
    ).map((n) => ({ id: n.id, title: n.title, body: n.body, date: n.created_at })),
  }),
  'GET /api/flags': async (req, url) => ({ flags: await featureFlags(channelOf(url)) }),

  // ---- crash reports and telemetry from launchers whose players opted in
  'POST /api/crash': async (req) => {
    rateLimit(req, 'crash', 30);
    const b = await readJson(req);
    const message = text(b.message, 500);
    if (!message) throw new HttpError(400, 'A crash report needs a message.');
    await db.query(
      `INSERT INTO crashes (at, source, version, channel, platform, install_id, message, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        Date.now(),
        b.source === 'game' ? 'game' : 'launcher',
        text(b.version, 40),
        CHANNELS.includes(b.channel) ? b.channel : null,
        text(b.platform, 60),
        text(b.installId, 64),
        message,
        text(b.detail, 64 * 1024),
      ],
    );
    console.log(`[crash] ${b.source === 'game' ? 'game' : 'launcher'} ${text(b.version, 40) || '?'}: ${message.slice(0, 120)}`);
    return { ok: true };
  },
  'POST /api/telemetry': async (req) => {
    rateLimit(req, 'telemetry', 120);
    const b = await readJson(req);
    const events = Array.isArray(b.events) ? b.events.slice(0, 50) : [];
    const params = [];
    const values = [];
    for (const e of events) {
      const name = text(e?.event, 40);
      if (!name || !/^[a-z][a-z0-9_.]*$/.test(name)) continue;
      const props = e.props && typeof e.props === 'object' && !Array.isArray(e.props) ? text(JSON.stringify(e.props), 2000) : null;
      const row = [Number(e.at) > 0 ? Math.min(Math.trunc(Number(e.at)), Date.now()) : Date.now(), text(b.installId, 64), text(b.version, 40),
        CHANNELS.includes(b.channel) ? b.channel : null, name, props];
      values.push(`(${row.map((v) => `$${params.push(v)}`).join(', ')})`);
    }
    // One statement for the whole batch: stored together or not at all.
    if (values.length) {
      await db.query(`INSERT INTO telemetry (at, install_id, version, channel, event, props) VALUES ${values.join(', ')}`, params);
    }
    return { ok: true, stored: events.length };
  },

  // ---- change your own password (signs out every other session)
  'POST /api/auth/password': async (req) => {
    const { account, token } = await requireAccount(req);
    const b = await readJson(req);
    const current = typeof b.current === 'string' ? b.current : '';
    const next = typeof b.password === 'string' ? b.password : '';
    const row = await one(ACCOUNT_BY_NAME, [account.username]);
    if (!row || !(await verifyPassword(current, row.password_hash))) throw new HttpError(401, 'Your current password is wrong.');
    if (next.length < 6 || next.length > 128) throw new HttpError(400, 'The new password must be at least 6 characters.');
    const hash = await hashPassword(next);
    await tx(db, async (client) => {
      await client.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [hash, account.id]);
      await client.query('DELETE FROM sessions WHERE account_id = $1 AND token_hash != $2', [account.id, hashToken(token)]);
    });
    return { ok: true };
  },

  'POST /api/auth/register': async (req) => {
    const ip = req.socket.remoteAddress;
    if (tooManyAttempts(ip)) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    const { username, password } = validateCredentials(await readJson(req));
    const taken = () => {
      recordFailure(ip);
      return new HttpError(409, 'That username is taken.');
    };
    if (await one(ACCOUNT_BY_NAME, [username])) throw taken();
    const hash = await hashPassword(password);
    const now = Date.now();
    let result;
    try {
      result = await tx(db, async (client) => {
        const { id } = (
          await client.query('INSERT INTO accounts (username, password_hash, created_at, last_login_at) VALUES ($1, $2, $3, $3) RETURNING id', [
            username, hash, now,
          ])
        ).rows[0];
        return { token: await newSession(client, id), user: { username }, save: null, ...(await characterList(id, client)) };
      });
    } catch (error) {
      if (error.code === '23505') throw taken(); // registered by someone else a moment ago
      throw error;
    }
    console.log(`[account] registered ${username}`);
    return result;
  },

  'POST /api/auth/login': async (req) => {
    const ip = req.socket.remoteAddress;
    if (tooManyAttempts(ip)) throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
    const body = await readJson(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const account = username ? await one(ACCOUNT_BY_NAME, [username]) : null;
    if (!account || !(await verifyPassword(password, account.password_hash))) {
      recordFailure(ip);
      throw new HttpError(401, 'Wrong username or password.');
    }
    const token = await tx(db, async (client) => {
      await client.query('UPDATE accounts SET last_login_at = $1 WHERE id = $2', [Date.now(), account.id]);
      return newSession(client, account.id);
    });
    return {
      token,
      user: { username: account.username },
      save: await legacySaveMeta(account.id),
      ...(await characterList(account.id)),
    };
  },

  'POST /api/auth/logout': async (req) => {
    const { token } = await requireAccount(req);
    await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
    return { ok: true };
  },

  'GET /api/auth/me': async (req) => {
    const { account } = await requireAccount(req);
    return { user: { username: account.username }, save: await legacySaveMeta(account.id), ...(await characterList(account.id)) };
  },

  // ---- one save per account (launchers before 0.3): the account's first character
  'GET /api/save': async (req) => {
    const { account } = await requireAccount(req);
    return { save: characterSave(await one(FIRST_CHARACTER, [account.id])) };
  },

  'PUT /api/save': async (req) => {
    const { account } = await requireAccount(req);
    const body = await readJson(req);
    return tx(db, async (client) => {
      await lockAccount(client, account.id); // two first saves at once must not make two heroes
      let row = (await client.query(FIRST_CHARACTER, [account.id])).rows[0];
      if (!row) {
        const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
        const wanted = typeof meta.heroName === 'string' ? meta.heroName.trim() : '';
        const name = NAME_RE.test(wanted) ? wanted : 'Hero';
        const heroClass = HERO_CLASSES.includes(meta.heroClass) ? meta.heroClass : 'warrior';
        row = (await client.query(CREATE_CHARACTER, [account.id, name, heroClass, '#8d3430', true, Date.now()])).rows[0];
      }
      return writeCharacterSave(client, account.id, row.id, body);
    });
  },

  // ---- characters (launcher 0.3+)
  'GET /api/characters': async (req) => characterList((await requireAccount(req)).account.id),

  'POST /api/characters': async (req) => {
    const { account } = await requireAccount(req);
    const { name, heroClass, color } = validateNewCharacter(await readJson(req));
    const created = await tx(db, async (client) => {
      // With the account row locked, the count and the name check stay true until the insert.
      await lockAccount(client, account.id);
      const { n } = (await client.query('SELECT COUNT(*) AS n FROM characters WHERE account_id = $1', [account.id])).rows[0];
      if (n >= MAX_CHARACTERS) {
        throw new HttpError(409, `You already have ${MAX_CHARACTERS} characters. Delete one to make room.`);
      }
      const clash = await client.query('SELECT id FROM characters WHERE account_id = $1 AND lower(name) = lower($2)', [account.id, name]);
      if (clash.rowCount) throw new HttpError(409, 'You already have a character with that name.');
      return (await client.query(CREATE_CHARACTER, [account.id, name, heroClass, color, false, Date.now()])).rows[0];
    });
    console.log(`[character] ${account.username} created ${name} (${heroClass})`);
    return { character: publicCharacter(created), ...(await characterList(account.id)) };
  },
};

// Routes with a character id: DELETE /api/characters/:id, GET|PUT /api/characters/:id/save
function paramRoute(method, pathname) {
  const m = /^\/api\/characters\/(\d{1,12})(\/save)?$/.exec(pathname);
  if (!m) return null;
  const id = Number(m[1]);
  const owned = async (req) => {
    const { account } = await requireAccount(req);
    const row = await one(CHARACTER, [id, account.id]);
    if (!row) throw new HttpError(404, 'That character no longer exists.');
    return { account, row };
  };
  if (m[2] && method === 'GET') return async (req) => ({ save: characterSave((await owned(req)).row) });
  if (m[2] && method === 'PUT') {
    return async (req) => {
      const { account } = await owned(req);
      const body = await readJson(req);
      return tx(db, (client) => writeCharacterSave(client, account.id, id, body));
    };
  }
  if (!m[2] && method === 'DELETE') {
    return async (req) => {
      const { account, row } = await owned(req);
      await db.query('DELETE FROM characters WHERE id = $1 AND account_id = $2', [id, account.id]);
      console.log(`[character] ${account.username} deleted ${row.name}`);
      return { ok: true, ...(await characterList(account.id)) };
    };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const handler = routes[`${req.method} ${url.pathname}`] || paramRoute(req.method, url.pathname);
  if (!handler) return send(res, 404, { error: 'Not found.' });
  try {
    send(res, 200, await handler(req, url));
  } catch (error) {
    if (error instanceof HttpError) return send(res, error.status, { error: error.message });
    console.error(`[error] ${req.method} ${url.pathname}:`, error);
    send(res, 500, { error: 'Server error.' });
  }
});

// server.pid tells the admin CLI (admin.mjs) that the server is running, so it won't restore a
// backup under it.
const PID_FILE = path.join(DATA_DIR, 'server.pid');
server.listen(PORT, HOST, () => {
  try {
    fs.writeFileSync(PID_FILE, String(process.pid));
  } catch {
    // Not fatal: admin restore then can't tell the server is running.
  }
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on http://${HOST}:${PORT}`);
  console.log(`Database: ${redactUrl(DATABASE_URL)}`);
});

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  server.close();
  fs.rmSync(PID_FILE, { force: true });
  await db.end().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
