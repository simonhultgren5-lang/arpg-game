// Depths of Darkness — PostgreSQL access shared by server.mjs and admin.mjs:
// the connection pool, the schema migrations (migration-NNN-*.sql), transactions, the one-time import
// of an old SQLite database (data/depths.db, servers before 1.0.0) and the built-in backup format.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- settings
const fileConfig = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(here, 'config.json'), 'utf8'));
  } catch {
    return {};
  }
})();
export const setting = (key, fallback) => process.env[key] ?? fileConfig[key] ?? fallback;
export const DATA_DIR = path.resolve(here, setting('DATA_DIR', 'data'));
// The same login as docker-compose.yml's database, so `bun run server:db` + `bun run server` just works.
export const DEFAULT_DATABASE_URL = 'postgres://depths:depths@127.0.0.1:5432/depths';
export const DATABASE_URL = String(setting('DATABASE_URL', DEFAULT_DATABASE_URL));
export const SQLITE_FILE = path.join(DATA_DIR, 'depths.db');
/** The database address without its password, for logs. */
export const redactUrl = (url) => String(url).replace(/\/\/([^:/@]+):[^@]*@/, '//$1:***@');

// ---------------------------------------------------------------- driver
let pg;
async function loadPg() {
  if (pg) return pg;
  try {
    pg = (await import('pg')).default;
  } catch {
    throw new Error(
      'The "pg" package is missing. This server version stores its data in PostgreSQL.\n' +
        `  Install the packages:  npm ci --omit=dev   (in ${here})\n` +
        '  On a Raspberry Pi: run  bash install.sh  again, or  bash update.sh --force  for Docker.',
    );
  }
  // Timestamps (milliseconds) and COUNT(*) are BIGINT; they all fit in a JS number.
  pg.types.setTypeParser(20, (v) => Number(v));
  pg.types.setTypeParser(1700, (v) => Number(v)); // NUMERIC (AVG)
  return pg;
}

export async function createPool(url = DATABASE_URL, max = 10) {
  const { Pool } = await loadPg();
  const pool = new Pool({ connectionString: url, max, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
  // An idle client losing its connection (database restart) must not crash the server.
  pool.on('error', (error) => console.error('[db] idle connection error:', error.message));
  return pool;
}

/** Waits until the database answers (it may still be starting next to the server in Docker). */
export async function waitForDatabase(pool, { seconds = 60, log = console.log } = {}) {
  const until = Date.now() + seconds * 1000;
  let told = false;
  for (;;) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (Date.now() > until) throw error;
      if (!told) log(`[db] waiting for PostgreSQL at ${redactUrl(DATABASE_URL)} (${error.code || error.message})…`);
      told = true;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/** Runs fn(client) in one transaction; rolls back if it throws. */
export async function tx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- migrations
// migration-001-initial.sql, migration-002-….sql: applied in order, each in its own transaction, once.
// They sit next to server.mjs (not in a folder) so update.sh from older releases can copy them.
export function migrationFiles(dir = here) {
  return fs
    .readdirSync(dir)
    .map((name) => /^migration-(\d{3})-([a-z0-9-]+)\.sql$/.exec(name))
    .filter(Boolean)
    .map((m) => ({ version: Number(m[1]), name: m[2], file: path.join(dir, m[0]) }))
    .sort((a, b) => a.version - b.version);
}

const MIGRATION_LOCK = 4100_0001; // pg_advisory_lock key: one migrating process at a time

export async function migrate(pool, { log = console.log } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at BIGINT NOT NULL
    )`);
    const done = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
    const applied = [];
    for (const m of migrationFiles()) {
      if (done.has(m.version)) continue;
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(m.file, 'utf8'));
        await client.query('INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, $3)', [m.version, m.name, Date.now()]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        error.message = `Migration ${path.basename(m.file)} failed: ${error.message}`;
        throw error;
      }
      log(`[db] applied migration ${String(m.version).padStart(3, '0')} ${m.name}`);
      applied.push(m.version);
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK]).catch(() => {});
    client.release();
  }
}

export async function schemaVersion(db) {
  const { rows } = await db.query('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations');
  return rows[0].v;
}

// ---------------------------------------------------------------- tables, row loading
// Every table with its columns, in an order that respects the foreign keys. Used by the SQLite
// import and by the built-in backup/restore, so both move every column.
export const TABLES = {
  accounts: ['id', 'username', 'password_hash', 'created_at', 'last_login_at'],
  sessions: ['token_hash', 'account_id', 'created_at', 'expires_at'],
  characters: ['id', 'account_id', 'name', 'hero_class', 'color', 'hero_level', 'depth', 'data', 'legacy', 'created_at', 'updated_at'],
  news: ['id', 'title', 'body', 'channel', 'created_at'],
  flags: ['key', 'channel', 'value', 'note', 'updated_at'],
  crashes: ['id', 'at', 'source', 'version', 'channel', 'platform', 'install_id', 'message', 'detail'],
  telemetry: ['id', 'at', 'install_id', 'version', 'channel', 'event', 'props'],
};
const IDENTITY_TABLES = ['accounts', 'characters', 'news', 'crashes', 'telemetry'];

/** Inserts rows (objects) into a table in chunks of multi-row INSERTs. */
export async function insertRows(client, table, rows) {
  const cols = TABLES[table];
  const CHUNK = Math.floor(30000 / cols.length); // well under PostgreSQL's 65535 parameters
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const params = [];
    const values = chunk.map((row) => `(${cols.map((c) => `$${params.push(row[c] ?? null)}`).join(', ')})`);
    await client.query(`INSERT INTO ${table} (${cols.join(', ')}) VALUES ${values.join(', ')}`, params);
  }
}

/** After inserting rows with their own ids, moves each id sequence past the highest id. */
export async function resetSequences(client) {
  for (const table of IDENTITY_TABLES) {
    await client.query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM ${table}`,
    );
  }
}

export async function tableCounts(db) {
  const counts = {};
  for (const table of Object.keys(TABLES)) counts[table] = (await db.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n;
  return counts;
}

// PostgreSQL text can't hold the NUL character (SQLite can). Only crash logs ever had one.
const noNul = (v) => (typeof v === 'string' && v.includes('\0') ? v.replaceAll('\0', '') : v);

// ---------------------------------------------------------------- SQLite import (once)
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

/** Reads every row of an old SQLite database, with the fixes the old server applied at startup. */
async function readSqlite(file) {
  const { DatabaseSync } = await import('node:sqlite');
  // Fold the write-ahead log into the file first, so the backup we keep is complete on its own.
  const rw = new DatabaseSync(file);
  rw.exec('PRAGMA busy_timeout = 5000; PRAGMA wal_checkpoint(TRUNCATE);');
  rw.close();
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const has = (t) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t));
    const all = (t) => (has(t) ? db.prepare(`SELECT * FROM ${t}`).all() : []);
    if (!has('accounts')) throw new Error(`${file} isn't a Depths of Darkness database (no accounts table).`);
    const userVersion = db.prepare('PRAGMA user_version').get().user_version;
    const data = Object.fromEntries(Object.keys(TABLES).map((t) => [t, all(t).map((r) => ({ ...r }))]));
    // Servers before 0.3 had one save per account in "saves"; the old server moved it into characters.
    const withCharacters = new Set(data.characters.map((c) => c.account_id));
    let nextId = Math.max(0, ...data.characters.map((c) => c.id)) + 1;
    for (const s of all('saves')) {
      if (withCharacters.has(s.account_id)) continue;
      data.characters.push({
        id: nextId++, account_id: s.account_id, name: String(s.hero_name || '').trim() || 'Hero', hero_class: s.hero_class || 'warrior',
        color: '#8d3430', hero_level: s.hero_level ?? 1, depth: s.depth ?? 1, data: s.data, legacy: 1, created_at: s.updated_at, updated_at: s.updated_at,
      });
      withCharacters.add(s.account_id);
    }
    // 0.4.0: level and depth come from the 3D save.
    if (userVersion < 1) {
      for (const c of data.characters) {
        let d3 = null;
        try {
          d3 = c.data ? JSON.parse(JSON.parse(c.data).dod3d ?? 'null') : null;
        } catch {
          continue; // unreadable save: the old server left it alone too
        }
        c.hero_level = Number.isFinite(Number(d3?.level)) ? Math.trunc(Number(d3.level)) : 1;
        c.depth = Number.isFinite(Number(d3?.depth)) ? Math.trunc(Number(d3.depth)) : 1;
      }
    }
    for (const c of data.characters) c.legacy = Boolean(c.legacy);
    for (const rows of Object.values(data)) for (const r of rows) for (const k of Object.keys(r)) r[k] = noNul(r[k]);
    return data;
  } finally {
    db.close();
  }
}

const fileHash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/**
 * Copies an old SQLite database into PostgreSQL, keeping every id, in one transaction, and checks
 * that every row arrived. Safe to run again: a file that was imported before is skipped. The file
 * itself is renamed to depths.db.imported-<date> (kept as a backup, never deleted).
 *
 * Returns { status: 'imported' | 'already-imported' | 'refused' | 'none', counts?, backup?, reason? }.
 */
export async function importSqlite(pool, file = SQLITE_FILE, { log = console.log, rename = true } = {}) {
  if (!fs.existsSync(file)) return { status: 'none' };
  const keepAside = () => {
    if (!rename) return null;
    const backup = `${file}.imported-${stamp()}`;
    fs.renameSync(file, backup);
    for (const extra of ['-wal', '-shm']) if (fs.existsSync(file + extra)) fs.renameSync(file + extra, backup + extra);
    return backup;
  };
  const data = await readSqlite(file); // also folds the WAL in, so the hash below covers everything
  const sha256 = fileHash(file);
  const result = await tx(pool, async (client) => {
    await client.query('LOCK TABLE sqlite_imports IN EXCLUSIVE MODE');
    if ((await client.query('SELECT 1 FROM sqlite_imports WHERE sha256 = $1', [sha256])).rowCount) return { status: 'already-imported' };
    const existing = (await client.query('SELECT COUNT(*) AS n FROM accounts')).rows[0].n;
    if (existing > 0) {
      return {
        status: 'refused',
        reason: `PostgreSQL already has ${existing} account(s), so ${path.basename(file)} was not imported (it would mix two sets of players). ` +
          'Import into an empty database with: node admin.mjs import-sqlite <file>',
      };
    }
    for (const table of Object.keys(TABLES)) await insertRows(client, table, data[table]);
    await resetSequences(client);
    const counts = await tableCounts(client);
    for (const table of Object.keys(TABLES)) {
      if (counts[table] !== data[table].length) {
        throw new Error(`Import check failed: ${table} has ${counts[table]} rows in PostgreSQL but ${data[table].length} in ${file}.`);
      }
    }
    await client.query('INSERT INTO sqlite_imports (sha256, source, imported_at, counts) VALUES ($1, $2, $3, $4)', [
      sha256, file, Date.now(), JSON.stringify(counts),
    ]);
    return { status: 'imported', counts };
  });
  if (result.status === 'refused') {
    log(`[db] ${result.reason}`);
    return result;
  }
  const backup = keepAside();
  if (result.status === 'imported') {
    const summary = Object.entries(result.counts).map(([t, n]) => `${n} ${t}`).join(', ');
    log(`[db] imported the SQLite database into PostgreSQL: ${summary}`);
  } else log(`[db] ${path.basename(file)} was imported before; not importing it again`);
  if (backup) log(`[db] kept the SQLite file as ${backup}`);
  return { ...result, backup };
}

// ---------------------------------------------------------------- built-in backup format
// A gzip'd JSON copy of every table. Used by `admin.mjs backup` when pg_dump isn't installed (and
// with --format json). Restoring it replaces every row in one transaction.
export async function writeJsonBackup(pool, target) {
  const tables = {};
  let version;
  await tx(pool, async (client) => {
    // One snapshot of all tables, also while the server is writing.
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    version = await schemaVersion(client);
    for (const [table, cols] of Object.entries(TABLES)) {
      tables[table] = (await client.query(`SELECT ${cols.join(', ')} FROM ${table} ORDER BY 1`)).rows;
    }
  });
  const json = JSON.stringify({ format: 'depths-backup', formatVersion: 1, schemaVersion: version, createdAt: Date.now(), tables });
  fs.writeFileSync(target, zlib.gzipSync(json));
}

export function readJsonBackup(file) {
  const parsed = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  if (parsed?.format !== 'depths-backup' || !parsed.tables?.accounts) throw new Error(`${file} isn't a Depths of Darkness backup.`);
  return parsed;
}

export async function restoreJsonBackup(pool, backup) {
  await tx(pool, async (client) => {
    if (backup.schemaVersion > (await schemaVersion(client))) {
      throw new Error('This backup is from a newer server version. Update the server first.');
    }
    await client.query(`TRUNCATE ${Object.keys(TABLES).join(', ')} RESTART IDENTITY CASCADE`);
    for (const table of Object.keys(TABLES)) await insertRows(client, table, backup.tables[table] || []);
    await resetSequences(client);
  });
}
