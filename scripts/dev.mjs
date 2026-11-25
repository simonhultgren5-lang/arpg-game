// Starts a local development setup in one command:
//
//   bun run dev                   server, test account and launcher
//   bun run dev -- --no-launcher  only the server and test account (for working in the Godot editor);
//                                 Ctrl+C stops it
//
//   1. A game server on http://localhost:4100 with its own PostgreSQL database "depths_dev"
//      (on the database from `bun run server:db`; skipped if a server already answers there)
//   2. A test account with three characters, one of each class (created once)
//   3. The launcher from source with the dev tools on (the "Dev tools" page, the in-game F1 console)
//
// Closing the launcher stops the server again. Wipe everything with `bun run dev:reset`.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureDevDatabase } from './lib/dev-db.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const PORT = 4100;
const BASE = `http://localhost:${PORT}`;
const DEV_ACCOUNT = { username: 'dev', password: 'devpass1' };
const DEV_HEROES = [
  { name: 'Aldric', heroClass: 'warrior', color: '#8d3430' },
  { name: 'Morwen', heroClass: 'pyromancer', color: '#4e7046' },
  { name: 'Edda', heroClass: 'rogue', color: '#63506f' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(method, p, token, body) {
  const r = await fetch(BASE + p, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const serverUp = () => api('GET', '/api/status').then((r) => r.body.online === true).catch(() => false);

// ---- 1. game server
let server = null;
if (await serverUp()) {
  console.log(`• A game server already runs on ${BASE}; using it.`);
} else {
  const dataDir = path.join(root, '.dev', 'server-data');
  fs.mkdirSync(dataDir, { recursive: true });
  let databaseUrl;
  try {
    databaseUrl = await ensureDevDatabase();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  server = spawn(process.execPath, ['--no-warnings', path.join(root, 'game-server', 'server.mjs')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      DATABASE_URL: databaseUrl,
      SERVER_NAME: 'Dev server',
      MOTD: `Local dev server. Log in as ${DEV_ACCOUNT.username} / ${DEV_ACCOUNT.password}.`,
      UPDATE_URL: 'off',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  for (let i = 0; i < 50 && !(await serverUp()); i++) await sleep(200);
  if (!(await serverUp())) {
    console.error('✗ The game server did not start.');
    server.kill();
    process.exit(1);
  }
  console.log(`✓ Game server on ${BASE} (database depths_dev)`);
}

// ---- 2. test account and characters
let login = await api('POST', '/api/auth/login', null, DEV_ACCOUNT);
if (login.status === 401) login = await api('POST', '/api/auth/register', null, DEV_ACCOUNT);
if (login.status !== 200) {
  console.warn(`! Could not log in as ${DEV_ACCOUNT.username}: ${login.body.error || login.status}`);
} else {
  const have = new Set((login.body.characters || []).map((c) => c.name.toLowerCase()));
  for (const hero of DEV_HEROES) if (!have.has(hero.name.toLowerCase())) await api('POST', '/api/characters', login.body.token, hero);
  console.log(`✓ Test account: ${DEV_ACCOUNT.username} / ${DEV_ACCOUNT.password} (${DEV_HEROES.map((h) => h.name).join(', ')})`);
}

// ---- 3. launcher
if (process.argv.includes('--no-launcher')) {
  console.log(server ? '✓ Server running. Ctrl+C stops it.' : '✓ Done.');
  if (!server) process.exit(0);
  process.on('SIGINT', () => {
    server.kill();
    process.exit(0);
  });
} else {
  startLauncher();
}

function startLauncher() {
if (!fs.existsSync(path.join(root, 'godot', 'build', 'DepthsOfDarkness.exe'))) {
  console.warn('! No game export yet, so Play will ask for one. Run: bun run godot:export');
}
spawnSync(process.execPath, [path.join(root, 'scripts', 'sync-version.mjs')], { stdio: 'inherit' });
spawnSync(process.execPath, [path.join(root, 'scripts', 'patch-notes.mjs')], { stdio: 'ignore' });
console.log('✓ Starting the launcher with the dev tools on. In it: pick "This PC" and log in.\n');
const launcher = spawn(require('electron'), ['.', '--dev'], { cwd: root, stdio: 'inherit', env: { ...process.env, DOD_DEV: '1' } });

const stop = () => {
  server?.kill();
  process.exit(0);
};
launcher.on('exit', stop);
process.on('SIGINT', () => {
  launcher.kill();
  stop();
});
}
