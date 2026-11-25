// Game server tests: accounts, characters, saves, the admin CLI, the SQLite import, concurrent writes
// and restarts, against throwaway databases on a real PostgreSQL server.
//   node --test game-server/tests/        (or: bun run test)
//
// TEST_DATABASE_URL picks the PostgreSQL server (default: the one from game-server/docker-compose.yml,
// started with `bun run server:db`). The login must be allowed to create databases; each run makes its
// own and drops them afterwards. Without a reachable server every test is skipped, with a message.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverFile = path.join(here, '..', 'server.mjs');
const adminFile = path.join(here, '..', 'admin.mjs');
const ADMIN_URL = process.env.TEST_DATABASE_URL || 'postgres://depths:depths@127.0.0.1:5432/depths';
const tmpDirs = [];
const tmpDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dod-server-test-'));
  tmpDirs.push(dir);
  return dir;
};

// ---------------------------------------------------------------- PostgreSQL (or skip)
let pg = null;
let adminPool = null;
let skip = false;
try {
  pg = (await import('pg')).default;
  pg.types.setTypeParser(20, Number);
  adminPool = new pg.Pool({ connectionString: ADMIN_URL, max: 2, connectionTimeoutMillis: 3000 });
  await adminPool.query('SELECT 1');
} catch (error) {
  const why = pg ? `${error.code || error.message}` : 'the pg package is missing (run: npm ci --prefix game-server)';
  skip = `No PostgreSQL for the game server tests at ${ADMIN_URL.replace(/:[^:@/]*@/, ':***@')} (${why}). ` +
    'Start one with `bun run server:db` or set TEST_DATABASE_URL.';
  console.log(`# SKIPPED: ${skip}`);
  await adminPool?.end().catch(() => {});
  adminPool = null;
}
const databases = [];
async function freshDatabase() {
  const name = `dod_test_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
  await adminPool.query(`CREATE DATABASE ${name}`);
  databases.push(name);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  return url.toString();
}
const query = async (url, sql, params) => {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows;
  } finally {
    await client.end();
  }
};

// ---------------------------------------------------------------- servers and calls
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function startServer(databaseUrl, dataDir) {
  const port = await freePort();
  const proc = spawn(process.execPath, ['--no-warnings', serverFile], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, DATABASE_URL: databaseUrl, SERVER_NAME: 'Test server', UPDATE_URL: 'off', DB_WAIT_SECONDS: '5' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  await new Promise((resolve, reject) => {
    const onData = (d) => {
      log += d;
      if (log.includes('listening')) resolve();
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.once('exit', (code) => reject(new Error(`server exited with ${code}:\n${log}`)));
  });
  const base = `http://127.0.0.1:${port}`;
  return {
    proc,
    log: () => log,
    call: async (method, p, token, body) => {
      const r = await fetch(base + p, {
        method,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: r.status, body: await r.json() };
    },
    stop: () =>
      new Promise((resolve) => {
        if (proc.exitCode !== null) return resolve();
        proc.once('exit', resolve);
        proc.kill();
      }),
  };
}
const adminFor = (databaseUrl, dataDir) => (...args) =>
  spawnSync(process.execPath, ['--no-warnings', adminFile, ...args], {
    env: { ...process.env, DATA_DIR: dataDir, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  });

after(async () => {
  for (const name of databases) await adminPool?.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(() => {});
  await adminPool?.end().catch(() => {});
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- the main server
let main = null;
let call = null;
let admin = null;
let mainUrl = '';
let mainDir = '';
describe('game server', { skip }, () => {
  before(async () => {
    mainUrl = await freshDatabase();
    mainDir = tmpDir();
    main = await startServer(mainUrl, mainDir);
    call = main.call;
    admin = adminFor(mainUrl, mainDir);
  });
  after(() => main?.stop());

  describe('accounts', () => {
    test('status lists features', async () => {
      const { body } = await call('GET', '/api/status');
      assert.equal(body.online, true);
      assert.ok(body.features.includes('characters'));
      assert.ok(body.features.includes('save-merge'));
      assert.equal(body.accounts, 0);
    });
    test('register, log in, reject bad passwords', async () => {
      assert.equal((await call('POST', '/api/auth/register', null, { username: 'alice', password: 'secret1' })).status, 200);
      assert.equal((await call('POST', '/api/auth/register', null, { username: 'ALICE', password: 'secret1' })).status, 409);
      assert.equal((await call('POST', '/api/auth/login', null, { username: 'alice', password: 'wrong!!' })).status, 401);
      const ok = await call('POST', '/api/auth/login', null, { username: 'Alice', password: 'secret1' });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.user.username, 'alice');
      assert.deepEqual(ok.body.characters, []);
      assert.equal(ok.body.maxCharacters, 5);
      assert.equal(ok.body.save, null);
    });
  });

  describe('characters and saves', () => {
    let t = '';
    const ids = [];
    before(async () => {
      t = (await call('POST', '/api/auth/register', null, { username: 'bob', password: 'secret1' })).body.token;
    });
    test('validation', async () => {
      assert.equal((await call('POST', '/api/characters', t, { name: 'x', heroClass: 'warrior' })).status, 400);
      assert.equal((await call('POST', '/api/characters', t, { name: 'Valid', heroClass: 'necromancer' })).status, 400);
    });
    test('five characters per account, unique names', async () => {
      for (const [i, cls] of ['warrior', 'pyromancer', 'rogue', 'warrior', 'rogue'].entries()) {
        const r = await call('POST', '/api/characters', t, { name: `Hero ${'ABCDE'[i]}`, heroClass: cls, color: '#315b79' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(typeof r.body.character.id, 'number');
        assert.equal(r.body.character.legacy, false);
        assert.equal(typeof r.body.character.createdAt, 'number');
        ids.push(r.body.character.id);
      }
      assert.equal((await call('POST', '/api/characters', t, { name: 'Sixth', heroClass: 'warrior' })).status, 409);
      assert.equal((await call('DELETE', `/api/characters/${ids.pop()}`, t)).status, 200);
      assert.equal((await call('POST', '/api/characters', t, { name: 'hero a', heroClass: 'rogue' })).status, 409);
    });
    test('saves only keep game keys', async () => {
      await call('PUT', `/api/characters/${ids[0]}/save`, t, { data: { dod3d: '{"level":3}', junk: 'x' }, meta: { heroLevel: 3, depth: 2 } });
      const s = (await call('GET', `/api/characters/${ids[0]}/save`, t)).body.save;
      assert.deepEqual(s.data, { dod3d: '{"level":3}' });
      assert.equal(s.heroLevel, 3);
      assert.equal(s.depth, 2);
    });
    test('game saves set the launcher level; other saves keep the game keys', async () => {
      await call('PUT', `/api/characters/${ids[1]}/save`, t, { data: { dod3d: '{"level":6}' }, meta: { heroLevel: 6, depth: 2 } });
      await call('PUT', `/api/characters/${ids[1]}/save`, t, { data: { mdjup: '{}', dod3d: 'stale' }, meta: { heroLevel: 99 } });
      const s = (await call('GET', `/api/characters/${ids[1]}/save`, t)).body.save;
      assert.equal(s.data.dod3d, '{"level":6}');
      assert.equal(s.data.mdjup, '{}');
      const c = (await call('GET', '/api/characters', t)).body.characters.find((x) => x.id === ids[1]);
      assert.equal(c.level, 6);
      assert.equal(c.depth, 2);
    });
    test('the one-save-per-account API uses the first character', async () => {
      const u = (await call('POST', '/api/auth/register', null, { username: 'olduser', password: 'secret1' })).body.token;
      assert.equal((await call('GET', '/api/save', u)).body.save, null);
      const put = await call('PUT', '/api/save', u, { data: { dod3d: '{"level":2}' }, meta: { heroName: 'Old Timer', heroClass: 'rogue', heroLevel: 2 } });
      assert.equal(put.status, 200);
      assert.equal(typeof put.body.updatedAt, 'number');
      const me = (await call('GET', '/api/auth/me', u)).body;
      assert.equal(me.characters.length, 1);
      assert.equal(me.characters[0].legacy, true);
      assert.equal(me.save.heroName, 'Old Timer');
      assert.equal(me.save.heroClass, 'rogue');
      assert.deepEqual((await call('GET', '/api/save', u)).body.save.data, { dod3d: '{"level":2}' });
    });
    test('other accounts and anonymous requests are refused', async () => {
      const other = (await call('POST', '/api/auth/register', null, { username: 'mallory', password: 'secret1' })).body.token;
      assert.equal((await call('GET', `/api/characters/${ids[0]}/save`, other)).status, 404);
      assert.equal((await call('PUT', `/api/characters/${ids[0]}/save`, other, { data: { dod3d: 'x' } })).status, 404);
      assert.equal((await call('DELETE', `/api/characters/${ids[0]}`, other)).status, 404);
      assert.equal((await call('GET', '/api/characters', null)).status, 401);
      assert.equal((await call('GET', '/api/characters', 'not-a-token')).status, 401);
    });
    test('logout ends the session', async () => {
      const s = (await call('POST', '/api/auth/login', null, { username: 'bob', password: 'secret1' })).body.token;
      assert.equal((await call('POST', '/api/auth/logout', s)).status, 200);
      assert.equal((await call('GET', '/api/auth/me', s)).status, 401);
    });
  });

  describe('concurrent writes', () => {
    test('saves arriving at once are applied one after the other', async () => {
      const t = (await call('POST', '/api/auth/register', null, { username: 'racer', password: 'secret1' })).body.token;
      const id = (await call('POST', '/api/characters', t, { name: 'Racer', heroClass: 'rogue' })).body.character.id;
      // The game (3D keys) and an old launcher (2D keys) saving at the same moment, many times.
      // Each write replaces only its own side, so both sides must survive every interleaving.
      const writes = [];
      for (let i = 0; i < 40; i++) {
        writes.push(i % 2
          ? call('PUT', `/api/characters/${id}/save`, t, { data: { dod3d: `{"level":${i}}` }, meta: { heroLevel: i, depth: 1 } })
          : call('PUT', `/api/characters/${id}/save`, t, { data: { mdjup: `{"n":${i}}`, dodSlot: `${i}` } }));
      }
      const results = await Promise.all(writes);
      assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.find((r) => r.status !== 200)));
      const { data, heroLevel } = (await call('GET', `/api/characters/${id}/save`, t)).body.save;
      assert.deepEqual(Object.keys(data).sort(), ['dod3d', 'dodSlot', 'mdjup']);
      assert.equal(JSON.parse(data.dod3d).level, heroLevel, 'the level follows the 3D save that was written last');
      assert.equal(JSON.parse(data.mdjup).n, Number(data.dodSlot), 'the 2D keys come from one write');
    });
    test('the five-character limit holds under parallel creates', async () => {
      const t = (await call('POST', '/api/auth/register', null, { username: 'swarm', password: 'secret1' })).body.token;
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) => call('POST', '/api/characters', t, { name: `Swarm ${'ABCDEFGHIJKL'[i]}`, heroClass: 'warrior' })),
      );
      assert.equal(results.filter((r) => r.status === 200).length, 5);
      assert.equal(results.filter((r) => r.status === 409).length, 7);
      assert.equal((await call('GET', '/api/characters', t)).body.characters.length, 5);
    });
    test('the same name registered twice at once makes one account', async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, () => call('POST', '/api/auth/register', null, { username: 'twin', password: 'secret1' })),
      );
      assert.equal(results.filter((r) => r.status === 200).length, 1);
      assert.equal(results.filter((r) => r.status === 409).length, 5);
    });
  });

  describe('admin CLI', () => {
    test('lists accounts and characters', () => {
      const r = admin('accounts');
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /alice/);
      assert.match(r.stdout, /bob/);
      const c = admin('characters', 'bob');
      assert.equal(c.status, 0, c.stderr);
      assert.match(c.stdout, /Hero A/);
    });
    test('resets a password and signs the account out', async () => {
      const old = (await call('POST', '/api/auth/login', null, { username: 'alice', password: 'secret1' })).body.token;
      const r = admin('reset-password', 'alice', 'newpass9');
      assert.equal(r.status, 0, r.stderr);
      assert.equal((await call('GET', '/api/auth/me', old)).status, 401);
      assert.equal((await call('POST', '/api/auth/login', null, { username: 'alice', password: 'newpass9' })).status, 200);
    });
    test('renames and deletes characters', async () => {
      assert.equal(admin('rename-character', 'bob', 'Hero B', 'Brannoc').status, 0);
      const t = (await call('POST', '/api/auth/login', null, { username: 'bob', password: 'secret1' })).body.token;
      let names = (await call('GET', '/api/characters', t)).body.characters.map((c) => c.name);
      assert.ok(names.includes('Brannoc'));
      assert.equal(admin('delete-character', 'bob', 'Brannoc', '--yes').status, 0);
      names = (await call('GET', '/api/characters', t)).body.characters.map((c) => c.name);
      assert.ok(!names.includes('Brannoc'));
    });
    test('refuses to delete without --yes', () => {
      const r = admin('delete-account', 'mallory');
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /--yes/);
    });
    test('backs up the database; restore refuses while the server runs', async () => {
      const file = path.join(mainDir, 'backup-test.json.gz');
      const b = admin('backup', file, '--format', 'json');
      assert.equal(b.status, 0, b.stderr);
      assert.ok(fs.statSync(file).size > 0);
      const s = admin('stats');
      assert.equal(s.status, 0, s.stderr);
      assert.match(s.stdout, /accounts\s+7/);
      assert.match(s.stdout, /server\s+running/);
      // restore refuses while the server runs (it would be overwritten under it)
      const r = admin('restore', file, '--yes');
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Stop the server/);
    });
  });

  describe('news, flags, crash reports, telemetry', () => {
    test('news posted with admin shows per channel', async () => {
      assert.equal(admin('news-post', 'Maintenance', 'Down Friday.').status, 0);
      assert.equal(admin('news-post', 'Beta test', 'Try the new crypt.', '--channel', 'beta').status, 0);
      const stable = (await call('GET', '/api/news')).body.news.map((n) => n.title);
      const beta = (await call('GET', '/api/news?channel=beta')).body.news.map((n) => n.title);
      assert.deepEqual(stable, ['Maintenance']);
      assert.ok(beta.includes('Beta test') && beta.includes('Maintenance'));
      const post = (await call('GET', '/api/news')).body.news[0];
      assert.equal(typeof post.id, 'number');
      assert.equal(typeof post.date, 'number');
    });
    test('flags: channel values win, values are typed', async () => {
      assert.equal(admin('flag-set', 'game.xp_multiplier', '2').status, 0);
      assert.equal(admin('flag-set', 'game.xp_multiplier', '3', '--channel', 'beta').status, 0);
      assert.equal(admin('flag-set', 'launcher.banner', 'Double XP weekend', '--note', 'event').status, 0);
      assert.deepEqual((await call('GET', '/api/flags')).body.flags, { 'game.xp_multiplier': 2, 'launcher.banner': 'Double XP weekend' });
      assert.equal((await call('GET', '/api/flags?channel=beta')).body.flags['game.xp_multiplier'], 3);
      assert.equal(admin('flag-unset', 'launcher.banner').status, 0);
      assert.equal((await call('GET', '/api/flags')).body.flags['launcher.banner'], undefined);
      assert.notEqual(admin('flag-set', 'Bad Key', '1').status, 0);
    });
    test('crash reports are stored and readable with admin', async () => {
      const r = await call('POST', '/api/crash', null, { source: 'game', version: '0.4.0', channel: 'stable', message: 'Game exited with code 3', detail: 'log tail\u0000end' });
      assert.equal(r.status, 200);
      assert.equal((await call('POST', '/api/crash', null, { source: 'game' })).status, 400);
      const list = admin('crashes');
      assert.match(list.stdout, /Game exited with code 3/);
      const id = list.stdout.match(/^(\d+)\s/m)[1];
      assert.match(admin('crash', id).stdout, /log tailend/);
    });
    test('telemetry is stored and summarised; bad event names are dropped', async () => {
      const r = await call('POST', '/api/telemetry', null, {
        installId: 'abc', version: '0.4.0', channel: 'stable',
        events: [{ event: 'game.start', props: { heroClass: 'rogue' } }, { event: 'game.exit', props: { minutes: 12 } }, { event: 'DROP TABLE' }],
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.stored, 3);
      const t = admin('telemetry');
      assert.equal(t.status, 0, t.stderr);
      assert.match(t.stdout, /game sessions\s+1 \(avg 12\.0 min\)/);
      assert.match(t.stdout, /rogue/);
      assert.doesNotMatch(t.stdout, /DROP/);
    });
    test('change password signs other sessions out', async () => {
      await call('POST', '/api/auth/register', null, { username: 'carol', password: 'secret1' });
      const a = (await call('POST', '/api/auth/login', null, { username: 'carol', password: 'secret1' })).body.token;
      const b = (await call('POST', '/api/auth/login', null, { username: 'carol', password: 'secret1' })).body.token;
      assert.equal((await call('POST', '/api/auth/password', a, { current: 'nope', password: 'newpass1' })).status, 401);
      assert.equal((await call('POST', '/api/auth/password', a, { current: 'secret1', password: 'newpass1' })).status, 200);
      assert.equal((await call('GET', '/api/auth/me', a)).status, 200);
      assert.equal((await call('GET', '/api/auth/me', b)).status, 401);
    });
  });

  describe('restarts', () => {
    test('everything is still there after a restart', async () => {
      const t = (await call('POST', '/api/auth/login', null, { username: 'bob', password: 'secret1' })).body.token;
      const before = (await call('GET', '/api/characters', t)).body;
      const save = (await call('GET', `/api/characters/${before.characters[0].id}/save`, t)).body.save;
      await main.stop();
      main = await startServer(mainUrl, mainDir);
      call = main.call;
      assert.doesNotMatch(main.log(), /applied migration/, 'the schema is not created twice');
      assert.equal((await call('GET', '/api/auth/me', t)).status, 200, 'sessions survive a restart');
      assert.deepEqual((await call('GET', '/api/characters', t)).body, before);
      assert.deepEqual((await call('GET', `/api/characters/${before.characters[0].id}/save`, t)).body.save, save);
      assert.deepEqual((await call('GET', '/api/news')).body.news.map((n) => n.title), ['Maintenance']);
      assert.equal((await call('GET', '/api/flags?channel=beta')).body.flags['game.xp_multiplier'], 3);
      // New rows continue after the old ones.
      const c = (await call('POST', '/api/characters', t, { name: 'After Restart', heroClass: 'rogue' })).body.character;
      assert.ok(c.id > Math.max(...before.characters.map((x) => x.id)));
    });
    test('a backup restores everything once the server is stopped', async () => {
      // pg_dump too, when a client at least as new as the server is installed (it is in CI).
      const client = Number((/(\d+)/.exec(spawnSync('pg_dump', ['--version'], { encoding: 'utf8' }).stdout || '') || [])[1]) || 0;
      const serverMajor = (await query(mainUrl, "SELECT current_setting('server_version_num')::int / 10000 AS v"))[0].v;
      const formats = ['json', ...(client >= serverMajor ? ['pg_dump'] : [])];
      if (formats.length === 1) console.log('# pg_dump backups not tested: no pg_dump as new as the server here');
      for (const format of formats) {
        const file = path.join(mainDir, `restore-${format}.${format === 'json' ? 'json.gz' : 'dump'}`);
        const b = admin('backup', file, '--format', format);
        assert.equal(b.status, 0, b.stderr);
        const countsBefore = await query(mainUrl, 'SELECT (SELECT COUNT(*) FROM accounts) a, (SELECT COUNT(*) FROM characters) c, (SELECT COUNT(*) FROM telemetry) t');
        assert.equal(admin('delete-account', 'bob', '--yes').status, 0);
        await main.stop();
        const r = admin('restore', file, '--yes');
        assert.equal(r.status, 0, `${format}: ${r.stderr}`);
        assert.deepEqual(await query(mainUrl, 'SELECT (SELECT COUNT(*) FROM accounts) a, (SELECT COUNT(*) FROM characters) c, (SELECT COUNT(*) FROM telemetry) t'), countsBefore);
        main = await startServer(mainUrl, mainDir);
        call = main.call;
        const login = await call('POST', '/api/auth/login', null, { username: 'bob', password: 'secret1' });
        assert.equal(login.status, 200, `${format}: bob is back`);
        assert.ok(login.body.characters.some((c) => c.name === 'Hero A'));
        // ids keep counting after the restored rows
        const fresh = await call('POST', '/api/auth/register', null, { username: `after_${format}`, password: 'secret1' });
        assert.equal(fresh.status, 200, JSON.stringify(fresh.body));
      }
    });
  });
});

// ---------------------------------------------------------------- SQLite import
// A database like the ones servers up to 0.5.0-beta.8 wrote, with a row in every table.
const scryptHash = (password) => {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
};
function writeSqliteFixture(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, last_login_at INTEGER);
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE saves (account_id INTEGER PRIMARY KEY, data TEXT NOT NULL, hero_name TEXT, hero_class TEXT, hero_level INTEGER,
      depth INTEGER, updated_at INTEGER NOT NULL);
    CREATE TABLE characters (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, name TEXT NOT NULL,
      hero_class TEXT NOT NULL, color TEXT NOT NULL, hero_level INTEGER NOT NULL DEFAULT 1, depth INTEGER NOT NULL DEFAULT 1,
      data TEXT, legacy INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER);
    CREATE TABLE news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, channel TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
    CREATE TABLE flags (key TEXT NOT NULL, channel TEXT NOT NULL DEFAULT '', value TEXT NOT NULL, note TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY (key, channel));
    CREATE TABLE crashes (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, source TEXT NOT NULL, version TEXT, channel TEXT,
      platform TEXT, install_id TEXT, message TEXT NOT NULL, detail TEXT);
    CREATE TABLE telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, install_id TEXT, version TEXT, channel TEXT,
      event TEXT NOT NULL, props TEXT);
    PRAGMA user_version = 1;
  `);
  const now = Date.now();
  const token = 'fixture-session-token';
  const insert = (sql, ...rows) => {
    const st = db.prepare(sql);
    for (const r of rows) st.run(...r);
  };
  // ids with gaps, as deletes leave them
  insert('INSERT INTO accounts VALUES (?, ?, ?, ?, ?)',
    [3, 'Ingrid', scryptHash('ingrid-pass'), now - 9e8, now - 1e6],
    [7, 'old_timer', scryptHash('oldpass1'), now - 8e8, null],
    [12, 'Zed', scryptHash('zedpass1'), now - 7e8, now - 5e5]);
  insert('INSERT INTO sessions VALUES (?, ?, ?, ?)',
    [crypto.createHash('sha256').update(token).digest('hex'), 3, now - 1e6, now + 864e5]);
  const save3d = JSON.stringify({ dod3d: JSON.stringify({ level: 14, depth: 4, gold: 1234, inventory: ['Ashen Blade', 'Ring of Ü & "quotes"'] }), mdjup: '{"old":true}' });
  insert('INSERT INTO characters VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [5, 3, 'Ingrid', 'pyromancer', '#315b79', 14, 4, save3d, 0, now - 9e8, now - 1e6],
    [9, 3, "Brann O'Dell", 'warrior', '#8d3430', 1, 1, null, 0, now - 8e8, null],
    [21, 12, 'Zed', 'rogue', '#aabbcc', 2, 1, JSON.stringify({ dod3d: '{"level":2,"depth":1}' }), 1, now - 7e8, now - 5e5]);
  // old_timer still has the one-save-per-account row from before 0.3
  insert('INSERT INTO saves VALUES (?, ?, ?, ?, ?, ?, ?)',
    [7, JSON.stringify({ dodSave: '{"x":1}' }), 'Grim', 'rogue', 6, 3, now - 8e8]);
  insert('INSERT INTO news VALUES (?, ?, ?, ?, ?)', [2, 'Welcome', 'The crypt is open.', '', now - 5e8], [4, 'Beta night', 'Bring friends.', 'beta', now - 4e8]);
  insert('INSERT INTO flags VALUES (?, ?, ?, ?, ?)', ['game.xp_multiplier', '', '2', 'weekend', now - 3e8], ['game.xp_multiplier', 'beta', '3', null, now - 3e8]);
  insert('INSERT INTO crashes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [8, now - 2e8, 'game', '0.4.1', 'stable', 'win32', 'inst-1', 'Boom', 'stack\nline 2']);
  insert('INSERT INTO telemetry VALUES (?, ?, ?, ?, ?, ?, ?)',
    [100, now - 1e8, 'inst-1', '0.4.1', 'stable', 'game.start', '{"heroClass":"pyromancer"}'],
    [101, now - 1e8 + 5, 'inst-1', '0.4.1', 'stable', 'game.exit', '{"minutes":7.5}']);
  // Leave the last writes in the WAL file (not checkpointed), like a server that was just stopped.
  return { db, token, save3d };
}

describe('SQLite import', { skip }, () => {
  let url = '';
  let dir = '';
  let fixture = null;
  let sqliteRows = null;
  let srv = null;
  before(async () => {
    url = await freshDatabase();
    dir = tmpDir();
    fixture = writeSqliteFixture(path.join(dir, 'depths.db'));
    const t = (name) => fixture.db.prepare(`SELECT * FROM ${name} ORDER BY 1`).all().map((r) => ({ ...r }));
    sqliteRows = Object.fromEntries(['accounts', 'sessions', 'characters', 'news', 'flags', 'crashes', 'telemetry'].map((n) => [n, t(n)]));
    fixture.db.close();
    srv = await startServer(url, dir);
  });
  after(() => srv?.stop());

  test('imports every row of every table, keeping ids', async () => {
    assert.match(srv.log(), /imported the SQLite database into PostgreSQL: 3 accounts, 1 sessions, 4 characters/);
    const same = (rows) => rows.map((r) => ({ ...r }));
    for (const table of ['accounts', 'sessions', 'news', 'flags', 'crashes', 'telemetry']) {
      assert.deepEqual(same(await query(url, `SELECT * FROM ${table} ORDER BY 1, 2`)), sqliteRows[table], table);
    }
    const chars = await query(url, 'SELECT * FROM characters ORDER BY id');
    const expected = sqliteRows.characters.map((c) => ({ ...c, legacy: Boolean(c.legacy) }));
    assert.deepEqual(chars.filter((c) => c.id !== 22), expected);
    // the pre-0.3 save became a legacy character
    const grim = chars.find((c) => c.account_id === 7);
    assert.equal(grim.id, 22);
    assert.equal(grim.name, 'Grim');
    assert.equal(grim.legacy, true);
    assert.equal(grim.data, JSON.stringify({ dodSave: '{"x":1}' }));
  });
  test('players log in with their old passwords and sessions, and see their heroes', async () => {
    assert.equal((await srv.call('GET', '/api/auth/me', fixture.token)).body.user.username, 'Ingrid');
    const login = await srv.call('POST', '/api/auth/login', null, { username: 'ingrid', password: 'ingrid-pass' });
    assert.equal(login.status, 200);
    assert.deepEqual(login.body.characters.map((c) => [c.id, c.name, c.level, c.depth]), [[5, 'Ingrid', 14, 4], [9, "Brann O'Dell", 1, 1]]);
    const save = (await srv.call('GET', '/api/characters/5/save', login.body.token)).body.save;
    assert.deepEqual(save.data, JSON.parse(fixture.save3d));
    assert.equal(JSON.parse(save.data.dod3d).inventory[1], 'Ring of Ü & "quotes"');
    assert.equal((await srv.call('POST', '/api/auth/login', null, { username: 'old_timer', password: 'oldpass1' })).body.save.heroName, 'Grim');
    assert.deepEqual((await srv.call('GET', '/api/news?channel=beta')).body.news.map((n) => n.id), [4, 2]);
    assert.equal((await srv.call('GET', '/api/flags?channel=beta')).body.flags['game.xp_multiplier'], 3);
  });
  test('keeps the SQLite file as a backup and never imports it twice', async () => {
    assert.ok(!fs.existsSync(path.join(dir, 'depths.db')));
    const kept = fs.readdirSync(dir).filter((f) => /^depths\.db\.imported-[\d-]+$/.test(f));
    assert.equal(kept.length, 1);
    // New rows get ids after the imported ones.
    const t = (await srv.call('POST', '/api/auth/register', null, { username: 'newbie', password: 'secret1' })).body;
    assert.ok((await query(url, "SELECT id FROM accounts WHERE username = 'newbie'"))[0].id > 12);
    const c = (await srv.call('POST', '/api/characters', t.token, { name: 'Fresh', heroClass: 'warrior' })).body.character;
    assert.ok(c.id > 22);
    // As if the server had stopped right after the import, before renaming: the file is back.
    await srv.stop();
    fs.copyFileSync(path.join(dir, kept[0]), path.join(dir, 'depths.db'));
    srv = await startServer(url, dir);
    assert.match(srv.log(), /was imported before; not importing it again/);
    assert.equal((await query(url, 'SELECT COUNT(*) AS n FROM accounts'))[0].n, 4);
    assert.equal((await query(url, 'SELECT COUNT(*) AS n FROM characters'))[0].n, 5);
    assert.ok(!fs.existsSync(path.join(dir, 'depths.db')));
  });
  test('a different SQLite file is not mixed into a database that has players', async () => {
    await srv.stop();
    const other = writeSqliteFixture(path.join(dir, 'depths.db'));
    other.db.exec("UPDATE accounts SET username = 'Someone' WHERE id = 3");
    other.db.close();
    srv = await startServer(url, dir);
    assert.match(srv.log(), /already has 4 account\(s\)/);
    assert.ok(fs.existsSync(path.join(dir, 'depths.db')), 'the file is left where it is');
    assert.equal((await query(url, 'SELECT COUNT(*) AS n FROM accounts'))[0].n, 4);
  });
  test('admin import-sqlite imports a named file into an empty database', async () => {
    const empty = await freshDatabase();
    const adminEmpty = adminFor(empty, tmpDir());
    const file = path.join(dir, 'depths.db');
    assert.match(adminEmpty('import-sqlite', file).stderr, /--yes/);
    const r = adminEmpty('import-sqlite', file, '--yes');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /3 accounts and 4 characters/);
    assert.ok(fs.existsSync(file), 'a file named on the command line is not renamed');
    const again = adminEmpty('import-sqlite', file, '--yes');
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /imported before/);
    assert.equal((await query(empty, 'SELECT COUNT(*) AS n FROM accounts'))[0].n, 3);
  });
});
