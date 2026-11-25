// Game server tests: accounts, characters, saves and the admin CLI, against a throwaway database.
//   node --test game-server/tests/        (or: bun run test)
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverFile = path.join(here, '..', 'server.mjs');
const adminFile = path.join(here, '..', 'admin.mjs');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dod-server-test-'));
let base = '';
let proc = null;

const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function call(method, p, token, body) {
  const r = await fetch(base + p, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
}
const admin = (...args) =>
  spawnSync(process.execPath, ['--no-warnings', adminFile, ...args], { env: { ...process.env, DATA_DIR: dataDir }, encoding: 'utf8' });

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['--no-warnings', serverFile], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, SERVER_NAME: 'Test server', UPDATE_URL: 'off' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    proc.stdout.on('data', (d) => String(d).includes('listening') && resolve());
    proc.once('exit', (code) => reject(new Error(`server exited with ${code}`)));
  });
});
after(() => {
  proc?.kill();
  setTimeout(() => fs.rmSync(dataDir, { recursive: true, force: true }), 300);
});

describe('accounts', () => {
  test('status lists features', async () => {
    const { body } = await call('GET', '/api/status');
    assert.equal(body.online, true);
    assert.ok(body.features.includes('characters'));
    assert.ok(body.features.includes('save-merge'));
  });
  test('register, log in, reject bad passwords', async () => {
    assert.equal((await call('POST', '/api/auth/register', null, { username: 'alice', password: 'secret1' })).status, 200);
    assert.equal((await call('POST', '/api/auth/register', null, { username: 'ALICE', password: 'secret1' })).status, 409);
    assert.equal((await call('POST', '/api/auth/login', null, { username: 'alice', password: 'wrong!!' })).status, 401);
    const ok = await call('POST', '/api/auth/login', null, { username: 'alice', password: 'secret1' });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.characters, []);
    assert.equal(ok.body.maxCharacters, 5);
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
  test('other accounts and anonymous requests are refused', async () => {
    const other = (await call('POST', '/api/auth/register', null, { username: 'mallory', password: 'secret1' })).body.token;
    assert.equal((await call('GET', `/api/characters/${ids[0]}/save`, other)).status, 404);
    assert.equal((await call('DELETE', `/api/characters/${ids[0]}`, other)).status, 404);
    assert.equal((await call('GET', '/api/characters', null)).status, 401);
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
  test('backs up and restores the database', async () => {
    const file = path.join(dataDir, 'backup-test.db');
    const b = admin('backup', file);
    assert.equal(b.status, 0, b.stderr);
    assert.ok(fs.statSync(file).size > 0);
    const s = admin('stats');
    assert.equal(s.status, 0, s.stderr);
    assert.match(s.stdout, /accounts\s+3/);
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
    const r = await call('POST', '/api/crash', null, { source: 'game', version: '0.4.0', channel: 'stable', message: 'Game exited with code 3', detail: 'log tail' });
    assert.equal(r.status, 200);
    assert.equal((await call('POST', '/api/crash', null, { source: 'game' })).status, 400);
    const list = admin('crashes');
    assert.match(list.stdout, /Game exited with code 3/);
    const id = list.stdout.match(/^(\d+)\s/m)[1];
    assert.match(admin('crash', id).stdout, /log tail/);
  });
  test('telemetry is stored and summarised; bad event names are dropped', async () => {
    const r = await call('POST', '/api/telemetry', null, {
      installId: 'abc', version: '0.4.0', channel: 'stable',
      events: [{ event: 'game.start', props: { heroClass: 'rogue' } }, { event: 'game.exit', props: { minutes: 12 } }, { event: 'DROP TABLE' }],
    });
    assert.equal(r.status, 200);
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
