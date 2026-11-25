// Launcher settings and the "studio" services: release channel, crash reports, usage statistics
// (telemetry) and feature flags.
//
// Privacy: crash reports and usage statistics are only sent when the player said yes (asked once, on
// first launch, and changeable in Settings). They go to the game server the player has selected, never
// to a third party, and carry a random install id instead of the account. Paths in crash reports have
// the Windows user folder replaced with "~". Reports made while no server is reachable wait in a small
// queue in <userData> and are sent later.
//
// Feature flags come from the selected server (/api/flags, set with admin.mjs) and are handed to the
// game in its boot file. They work without any consent: nothing is sent to get them.
const { app } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHANNELS = ['stable', 'beta', 'dev'];
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
const queueFile = () => path.join(app.getPath('userData'), 'report-queue.json');
const MAX_QUEUE = 100;

// ---------------------------------------------------------------- settings
let settings = null;
function load() {
  if (settings) return settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    settings = {};
  }
  settings.channel = CHANNELS.includes(settings.channel) ? settings.channel : 'stable';
  settings.autoDownload = settings.autoDownload !== false;
  settings.consent = {
    asked: Boolean(settings.consent?.asked),
    crashes: Boolean(settings.consent?.crashes),
    usage: Boolean(settings.consent?.usage),
  };
  settings.installId ||= crypto.randomUUID();
  return settings;
}
function persist() {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Could not save settings:', error);
  }
}
const publicSettings = () => {
  const s = load();
  return { channel: s.channel, autoDownload: s.autoDownload, consent: { ...s.consent } };
};
function update(input = {}) {
  const s = load();
  if (CHANNELS.includes(input.channel)) s.channel = input.channel;
  if (typeof input.autoDownload === 'boolean') s.autoDownload = input.autoDownload;
  if (input.consent && typeof input.consent === 'object') {
    s.consent = { asked: true, crashes: Boolean(input.consent.crashes), usage: Boolean(input.consent.usage) };
    if (!s.consent.crashes && !s.consent.usage) clearQueue();
  }
  persist();
  return publicSettings();
}

// ---------------------------------------------------------------- where reports go
// Set by main.cjs: returns the selected server's URL, or null.
let serverUrlFor = () => null;
const setServerResolver = (fn) => {
  serverUrlFor = fn;
};
const context = () => ({
  installId: load().installId,
  version: app.getVersion(),
  channel: load().channel,
  platform: `${process.platform} ${os.release()} ${process.arch}`,
});
// Removes the Windows user folder (and so the user name) from paths.
const home = os.homedir();
const scrub = (text) => String(text || '').split(home).join('~').replace(/(token["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, '$1[hidden]');

function readQueue() {
  try {
    const q = JSON.parse(fs.readFileSync(queueFile(), 'utf8'));
    // Items from before queue ids existed get one.
    return Array.isArray(q) ? q.map((item) => (item.id ? item : { ...item, id: crypto.randomUUID() })) : [];
  } catch {
    return [];
  }
}
function writeQueue(q) {
  try {
    fs.writeFileSync(queueFile(), JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch {
    // best effort
  }
}
function clearQueue() {
  fs.rmSync(queueFile(), { force: true });
}

async function post(serverUrl, pathname, body) {
  const res = await fetch(serverUrl + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok && res.status !== 400) throw new Error(`Server answered ${res.status}`);
}

// Sends queued reports (crashes first) to the selected server. Kept if it can't be reached.
// Only the items that were sent are removed, so reports queued while a flush runs aren't lost; they
// go out with a follow-up flush.
let flushing = null;
let flushAgain = false;
function flush() {
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    const url = serverUrlFor();
    const q = readQueue();
    if (!url || !q.length) return;
    const consent = load().consent;
    const allowed = (item) => (item.kind === 'crash' ? consent.crashes : consent.usage);
    const done = new Set(q.filter((item) => !allowed(item)).map((item) => item.id)); // consent withdrawn: drop
    for (const item of q.filter((i) => i.kind === 'crash' && allowed(i))) {
      try {
        await post(url, '/api/crash', { ...context(), ...item.data });
        done.add(item.id);
      } catch {
        // stays queued
      }
    }
    const events = q.filter((i) => i.kind === 'event' && allowed(i));
    for (let i = 0; i < events.length; i += 50) {
      const batch = events.slice(i, i + 50);
      try {
        await post(url, '/api/telemetry', { ...context(), events: batch.map((e) => e.data) });
        for (const e of batch) done.add(e.id);
      } catch {
        // stays queued
      }
    }
    writeQueue(readQueue().filter((item) => !done.has(item.id)));
  })().finally(() => {
    flushing = null;
    if (flushAgain) {
      flushAgain = false;
      flush().catch(() => {});
    }
  });
  return flushing;
}
const queueItem = (kind, data) => ({ id: crypto.randomUUID(), kind, data });

// ---------------------------------------------------------------- crash reports
function reportCrash({ source = 'launcher', message, detail = '' }) {
  if (!load().consent.crashes) return false;
  const q = readQueue();
  q.push(queueItem('crash', { source, message: scrub(message).slice(0, 500), detail: scrub(detail).slice(-60000) }));
  writeQueue(q);
  flush().catch(() => {});
  return true;
}

// The end of the game's own log, for a crash report about the game.
// Godot writes godot.log, or (4.7+) one godot<date>.log per run: take the newest.
const GAME_LOGS = () => path.join(app.getPath('appData'), 'Godot', 'app_userdata', 'Depths of Darkness', 'logs');
function gameLogTail(lines = 150) {
  try {
    const dir = GAME_LOGS();
    const newest = fs
      .readdirSync(dir)
      .filter((name) => /^godot.*\.log$/.test(name))
      .map((name) => ({ name, at: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.at - a.at)[0];
    if (!newest) return '(no game log found)';
    const text = fs.readFileSync(path.join(dir, newest.name), 'utf8');
    return `${newest.name}:\n${text.split(/\r?\n/).slice(-lines).join('\n')}`;
  } catch {
    return '(no game log found)';
  }
}

// Catches errors in the launcher itself (main process). The window's errors arrive through IPC.
let hooked = false;
function catchLauncherErrors() {
  if (hooked) return;
  hooked = true;
  process.on('uncaughtException', (error) => {
    console.error(error);
    reportCrash({ message: `Launcher error: ${error?.message || error}`, detail: error?.stack || '' });
  });
  process.on('unhandledRejection', (reason) => {
    console.error(reason);
    reportCrash({ message: `Launcher error: ${reason?.message || reason}`, detail: reason?.stack || '' });
  });
}

// ---------------------------------------------------------------- usage statistics
const EVENT_RE = /^[a-z][a-z0-9_.]{1,39}$/;
function track(event, props = {}) {
  if (!load().consent.usage || !EVENT_RE.test(event)) return false;
  const q = readQueue();
  q.push(queueItem('event', { event, at: Date.now(), props }));
  writeQueue(q);
  // Batch: send right away only every few events; the rest goes with the next flush.
  if (q.filter((i) => i.kind === 'event').length >= 5 || event === 'game.exit') flush().catch(() => {});
  return true;
}

// ---------------------------------------------------------------- feature flags
const flagCache = new Map(); // serverUrl -> { flags, at }
async function flagsFor(serverUrl) {
  if (!serverUrl) return {};
  const cached = flagCache.get(serverUrl);
  if (cached && Date.now() - cached.at < 30e3) return cached.flags;
  try {
    const res = await fetch(`${serverUrl}/api/flags?channel=${load().channel}`, { signal: AbortSignal.timeout(5000) });
    const flags = res.ok ? (await res.json()).flags || {} : {};
    flagCache.set(serverUrl, { flags, at: Date.now() });
    return flags;
  } catch {
    return cached?.flags || {};
  }
}
async function newsFor(serverUrl) {
  if (!serverUrl) return [];
  try {
    const res = await fetch(`${serverUrl}/api/news?channel=${load().channel}`, { signal: AbortSignal.timeout(5000) });
    return res.ok ? (await res.json()).news || [] : [];
  } catch {
    return [];
  }
}

module.exports = {
  settings: publicSettings,
  update,
  setServerResolver,
  reportCrash,
  gameLogTail,
  catchLauncherErrors,
  track,
  flush,
  flagsFor,
  newsFor,
  queueSize: () => readQueue().length,
};
