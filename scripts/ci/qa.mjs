// Pipeline stage "Automated QA": plays the packaged app like a player would.
//
//   bun run ci:qa                         uses release/win-unpacked (build it with bun run dist:dir)
//   node scripts/ci/qa.mjs <path to Depths of Darkness.exe>
//
// Starts a throwaway game server and the packaged launcher in a throwaway profile, then drives the
// launcher through the Chrome DevTools protocol: first-launch consent, patch notes, server news and
// flags, register, create a character, Play (the game starts headless, as CI machines have no GPU),
// a game crash turning into a crash report, telemetry, offline play. Saves a screenshot and a
// Markdown summary in qa-results/ (and in the GitHub job summary). Exits with code 1 if a check failed.
import { spawn, spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const appExe = path.resolve(process.argv[2] || path.join(root, 'release', 'win-unpacked', 'Depths of Darkness.exe'));
const outDir = path.join(root, 'qa-results');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
const gamePids = () =>
  new Set([...execSync('tasklist /FI "IMAGENAME eq DepthsOfDarkness.exe" /FO CSV /NH').toString().matchAll(/"DepthsOfDarkness\.exe","(\d+)"/g)].map((m) => m[1]));

if (!fs.existsSync(appExe)) {
  console.error(`✗ No packaged app at ${appExe}. Build it first: bun run dist:dir`);
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dod-qa-'));
const dataDir = path.join(tmp, 'server');
const profile = path.join(tmp, 'profile');
// The server stores its data in PostgreSQL: a throwaway database on the server in QA_DATABASE_URL
// (or DATABASE_URL, or the one from `bun run server:db`), dropped again at the end.
const pg = createRequire(path.join(root, 'game-server', 'package.json'))('pg');
const pgAdminUrl = process.env.QA_DATABASE_URL || process.env.DATABASE_URL || 'postgres://depths:depths@127.0.0.1:5432/depths';
const qaDb = `dod_qa_${process.pid}`;
const pgAdmin = new pg.Client({ connectionString: pgAdminUrl });
try {
  await pgAdmin.connect();
  await pgAdmin.query(`CREATE DATABASE ${qaDb}`);
} catch (error) {
  console.error(`✗ No PostgreSQL for the QA game server at ${pgAdminUrl.replace(/:[^:@/]*@/, ':***@')} (${error.code || error.message}).`);
  console.error('  Start one with `bun run server:db`, or set QA_DATABASE_URL.');
  process.exit(1);
}
const databaseUrl = Object.assign(new URL(pgAdminUrl), { pathname: `/${qaDb}` }).toString();
const admin = (...a) =>
  spawnSync(process.execPath, ['--no-warnings', path.join(root, 'game-server', 'admin.mjs'), ...a], { env: { ...process.env, DATA_DIR: dataDir, DATABASE_URL: databaseUrl }, encoding: 'utf8' });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail: String(detail || '') });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`);
};

// ---- game server
const serverPort = await freePort();
const serverUrl = `http://127.0.0.1:${serverPort}`;
fs.mkdirSync(dataDir, { recursive: true });
const server = spawn(process.execPath, ['--no-warnings', path.join(root, 'game-server', 'server.mjs')], {
  env: { ...process.env, PORT: String(serverPort), HOST: '127.0.0.1', DATA_DIR: dataDir, DATABASE_URL: databaseUrl, UPDATE_URL: 'off', SERVER_NAME: 'QA server' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve) => {
  server.stdout.on('data', (d) => String(d).includes('listening') && resolve());
  server.once('exit', (code) => {
    console.error(`✗ The QA game server exited with code ${code}.`);
    process.exit(1);
  });
});
admin('news-post', 'QA news', 'Posted by the pipeline.');
admin('flag-set', 'launcher.banner', 'QA banner');
admin('flag-set', 'game.xp_multiplier', '2');

// ---- packaged launcher
const debugPort = await freePort();
const before = gamePids();
const app = spawn(appExe, ['--dev', `--remote-debugging-port=${debugPort}`], {
  env: {
    ...process.env,
    DOD_USER_DATA: profile, // never the real profile
    DOD_GAME_ARGS: '--headless', // CI machines have no GPU
    DOD_UPDATE_URL: `${serverUrl}/no-updates/`, // answers 404: "nothing newer"
  },
  stdio: 'ignore',
});
let ws;
let msgId = 0;
const pending = new Map();
const pageErrors = [];
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const n = ++msgId;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value;
const startedGames = () => [...gamePids()].filter((p) => !before.has(p));
const stopGame = (pid) => {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
  } catch {
    // already gone
  }
};

try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(500);
    try {
      target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((t) => t.url.startsWith('app://launcher'));
    } catch {
      // not up yet
    }
  }
  check('Packaged launcher starts', target);
  if (!target) throw new Error('launcher window never appeared');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  });
  await send('Runtime.enable');
  await sleep(3000);

  check('Asks for consent on first launch', await evaluate("!document.getElementById('consentPanel').hidden"));
  check('Shows the newest patch notes', await evaluate("document.getElementById('notesCardTitle').textContent"), await evaluate("document.getElementById('notesCardTitle').textContent"));
  const game = await evaluate('window.launcher.getGameStatus()');
  check('Game is packaged with the launcher', game?.installed);
  await evaluate("document.getElementById('consentAskCrashes').click(); document.getElementById('consentAskUsage').click(); document.querySelector('#consentForm button[type=submit]').click(); 1");
  await sleep(500);
  const prefs = await evaluate('window.launcher.getSettings()');
  check('Consent is saved', prefs?.consent?.crashes && prefs.consent.usage);

  // online
  const added = await evaluate(`window.launcher.addServer({name:'QA', url:${JSON.stringify(serverUrl)}})`);
  const sid = added?.state?.selectedServerId;
  check('Adds a server', sid, added?.error);
  const reg = await evaluate(`window.launcher.register(${JSON.stringify(sid)}, 'qaplayer', 'qa-secret-1')`);
  check('Registers an account', !reg?.error, reg?.error);
  const created = await evaluate(`window.launcher.createCharacter({serverId:${JSON.stringify(sid)}}, {name:'Qara', heroClass:'pyromancer', color:'#4e7046'})`);
  check('Creates a character on the server', created?.character?.id, created?.error);
  await evaluate("localStorage.setItem('dodLauncherModeV1','online'); location.reload(); 1");
  await sleep(4000);
  check('Shows the hero in the niche', (await evaluate("document.getElementById('heroName').textContent")) === 'Qara');
  check('Shows server news', (await evaluate("document.getElementById('newsCardTitle').textContent")) === 'QA news');
  check('Shows the flag banner', (await evaluate("document.getElementById('flagBanner').textContent")) === 'QA banner');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot?.data) fs.writeFileSync(path.join(outDir, 'launcher.png'), Buffer.from(shot.data, 'base64'));

  const play = await evaluate(`window.launcher.play({serverId:${JSON.stringify(sid)}, characterId:${created?.character?.id}})`);
  check('Play starts the game', play?.ok, play?.error);
  await sleep(6000);
  const pid = startedGames()[0];
  check('Game process is running', pid);
  check('Launcher hides while playing', (await evaluate('document.visibilityState')) === 'hidden');
  const boot = (await evaluate('window.launcher.getDevInfo()'))?.lastBoot;
  check('Game gets the feature flags', boot?.flags?.['game.xp_multiplier'] === 2);
  if (pid) stopGame(pid); // simulated crash: exit code 1
  await sleep(4000);
  check('Launcher comes back after the game', (await evaluate('document.visibilityState')) === 'visible');
  const crashes = admin('crashes').stdout;
  check('Game crash reaches the server', /closed unexpectedly/.test(crashes));
  const telemetry = admin('telemetry').stdout;
  // (launcher.open happened before the player said yes, so it is correctly not there.)
  check('Usage events reach the server', /game\.start/.test(telemetry) && /game\.exit/.test(telemetry) && !/launcher\.open/.test(telemetry));

  // offline
  const off = await evaluate("window.launcher.createCharacter({offline:true}, {name:'Offa', heroClass:'warrior', color:'#8d3430'})");
  check('Creates an offline character', off?.character?.id, off?.error);
  const playOff = await evaluate(`window.launcher.play({offline:true, characterId:${JSON.stringify(off?.character?.id)}})`);
  check('Plays offline', playOff?.ok, playOff?.error);
  await sleep(5000);
  const offPid = startedGames()[0];
  check('Offline game process is running', offPid);
  if (offPid) stopGame(offPid);
  await sleep(2000);
  check('No script errors in the launcher', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (error) {
  check('QA run finished', false, error.message);
} finally {
  for (const p of startedGames()) stopGame(p);
  app.kill();
  server.removeAllListeners('exit');
  server.kill();
  await sleep(1000);
  await pgAdmin.query(`DROP DATABASE IF EXISTS ${qaDb} WITH (FORCE)`).catch(() => {});
  await pgAdmin.end().catch(() => {});
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
}

const failed = results.filter((r) => !r.ok);
const md = [
  `## Automated QA ${failed.length ? '✗ failed' : '✓ passed'}`,
  '',
  `${results.length - failed.length} of ${results.length} checks passed on \`${path.basename(path.dirname(appExe))}\`.`,
  '',
  '| | Check | Detail |',
  '| --- | --- | --- |',
  ...results.map((r) => `| ${r.ok ? '✓' : '✗'} | ${r.name} | ${r.detail.replace(/\|/g, '\\|').slice(0, 120)} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'summary.md'), md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
console.log(failed.length ? `\n✗ QA failed (${failed.length})` : '\n✓ QA passed');
process.exit(failed.length ? 1 : 0);
