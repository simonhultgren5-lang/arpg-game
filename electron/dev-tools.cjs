// Dev tools for the launcher's "Dev tools" page. Available when running from source (bun run launcher),
// or in an installed build started with --dev (or DOD_DEV=1). Players never see them.
//
// - Game launch flags, saved in <userData>/dev-tools.json and added every time Play starts the game:
//   the in-game dev console (--dev), windowed 1280x720, verbose engine log, and where to start.
// - Open the game's saves and logs, the launcher's data folder and the game build folder.
// - The last boot file sent to the game, with the token hidden.
// - A session-only update source (for testing releases against a local folder server).
// - Delete downloaded launcher updates.
const { app, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const enabled = !app.isPackaged || process.argv.includes('--dev') || process.env.DOD_DEV === '1';
const flagsFile = () => path.join(app.getPath('userData'), 'dev-tools.json');
const DEFAULT_FLAGS = { devConsole: true, windowed: false, verbose: false, start: '' };
const STARTS = ['', 'crypt', 'boss'];

let lastBoot = null;

function readFlags() {
  try {
    return { ...DEFAULT_FLAGS, ...JSON.parse(fs.readFileSync(flagsFile(), 'utf8')) };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

function setFlags(input = {}) {
  const flags = {
    devConsole: Boolean(input.devConsole),
    windowed: Boolean(input.windowed),
    verbose: Boolean(input.verbose),
    start: STARTS.includes(input.start) ? input.start : '',
  };
  fs.mkdirSync(path.dirname(flagsFile()), { recursive: true });
  fs.writeFileSync(flagsFile(), JSON.stringify(flags, null, 2));
  return flags;
}

// Extra command line for the game, from the saved flags. Godot's own options go before "--",
// the game's options after it.
function gameArgs() {
  if (!enabled) return { engine: [], game: [] };
  const flags = readFlags();
  const engine = [];
  const game = [];
  if (flags.windowed) engine.push('--windowed', '--resolution', '1280x720');
  if (flags.verbose) engine.push('--verbose');
  if (flags.devConsole) game.push('--dev');
  if (flags.devConsole && flags.start) game.push('--dev-start', flags.start);
  return { engine, game };
}

function rememberBoot(boot, args) {
  if (!enabled) return;
  lastBoot = { ...boot, ...(boot.token ? { token: `${String(boot.token).slice(0, 4)}… (hidden)` } : {}), args };
}

function paths({ gameExe }) {
  const godotData = path.join(app.getPath('appData'), 'Godot', 'app_userdata', 'Depths of Darkness');
  return {
    gameExe,
    gameFolder: path.dirname(gameExe),
    gameSaves: path.join(godotData, 'saves'),
    gameLogs: path.join(godotData, 'logs'),
    launcherData: app.getPath('userData'),
  };
}

async function open(which, ctx) {
  const all = paths(ctx);
  const target = all[which];
  if (!target || which === 'gameExe') return { error: 'Unknown folder.' };
  if (!fs.existsSync(target)) return { error: `${target} doesn't exist yet. Play once to create it.` };
  const problem = await shell.openPath(target);
  return problem ? { error: problem } : { ok: true };
}

function clearDownloadedUpdates() {
  const dir = path.join(app.getPath('userData'), 'updates');
  let removed = 0;
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, name), { force: true, recursive: true });
      removed++;
    }
  }
  return { removed };
}

function info(ctx) {
  return {
    enabled,
    flags: readFlags(),
    paths: paths(ctx),
    gameInstalled: fs.existsSync(ctx.gameExe),
    lastBoot,
    updateUrl: ctx.updates.getBase(),
    defaultUpdateUrl: ctx.updates.defaultBase,
    versions: {
      launcher: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: `${process.platform} ${process.arch}`,
    },
  };
}

module.exports = { enabled, info, setFlags, gameArgs, rememberBoot, open, clearDownloadedUpdates };
