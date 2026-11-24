// Server list, saved logins and requests to game servers (game-server/server.mjs).
// Stored in <userData>/launcher.json. Login tokens are encrypted with the OS keychain
// (Windows DPAPI) when available, so they are useless if the file is copied to another PC.
const { app, safeStorage } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_PORT = 4100;
const isDev = !app.isPackaged;

function defaultServers() {
  const servers = [{ id: 'pi', name: 'Raspberry Pi', url: `http://raspberrypi.local:${DEFAULT_PORT}` }];
  if (isDev) servers.unshift({ id: 'local', name: 'This PC', url: `http://localhost:${DEFAULT_PORT}` });
  return servers;
}

const storeFile = () => path.join(app.getPath('userData'), 'launcher.json');
let store = null;

function load() {
  if (store) return store;
  try {
    store = JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
  } catch {
    store = null;
  }
  if (!store || !Array.isArray(store.servers)) {
    const servers = defaultServers();
    store = { servers, selectedServerId: servers[0]?.id ?? null, sessions: {} };
  }
  store.sessions ||= {};
  return store;
}
function persist() {
  try {
    fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
    fs.writeFileSync(storeFile(), JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Could not save launcher settings:', error);
  }
}

// ---------------------------------------------------------------- tokens
function sealToken(token) {
  if (safeStorage.isEncryptionAvailable()) return { enc: safeStorage.encryptString(token).toString('base64') };
  return { plain: token };
}
function openToken(sealed) {
  try {
    if (sealed?.enc) return safeStorage.decryptString(Buffer.from(sealed.enc, 'base64'));
    return sealed?.plain || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- servers
function publicState() {
  const s = load();
  const accounts = {};
  for (const [serverId, session] of Object.entries(s.sessions)) accounts[serverId] = { username: session.username };
  return { version: app.getVersion(), servers: s.servers, selectedServerId: s.selectedServerId, accounts };
}
const getServer = (id) => load().servers.find((server) => server.id === id) || null;

function normalizeUrl(input) {
  let text = String(input || '').trim();
  if (!text) throw new Error('Enter the server address, like 192.168.1.50:4100');
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error("That address doesn't look right. Try something like 192.168.1.50:4100");
  }
  if (!url.port && url.protocol === 'http:') url.port = String(DEFAULT_PORT);
  return url.origin;
}

function selectServer(id) {
  const s = load();
  if (getServer(id)) {
    s.selectedServerId = id;
    persist();
  }
  return publicState();
}
function addServer({ name, url }) {
  const s = load();
  let origin;
  try {
    origin = normalizeUrl(url);
  } catch (error) {
    return { error: error.message };
  }
  if (s.servers.some((server) => server.url === origin)) return { error: 'That server is already in the list.' };
  const server = {
    id: crypto.randomBytes(6).toString('hex'),
    name: String(name || '').trim().slice(0, 40) || new URL(origin).hostname,
    url: origin,
  };
  s.servers.push(server);
  s.selectedServerId = server.id;
  persist();
  return { state: publicState() };
}
function removeServer(id) {
  const s = load();
  s.servers = s.servers.filter((server) => server.id !== id);
  delete s.sessions[id];
  if (s.selectedServerId === id) s.selectedServerId = s.servers[0]?.id ?? null;
  persist();
  return publicState();
}

// ---------------------------------------------------------------- requests
class ServerError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}
async function request(serverUrl, pathname, { method = 'GET', token, body, timeoutMs = 6000 } = {}) {
  let response;
  try {
    response = await fetch(serverUrl + pathname, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ServerError("Can't reach the server. Check that it's running and the address is right.");
  }
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Not one of our servers, or an empty reply.
  }
  if (!response.ok) throw new ServerError(data.error || `Server error (${response.status}).`, response.status);
  return data;
}

function sessionFor(serverId) {
  const session = load().sessions[serverId];
  const token = session ? openToken(session.token) : null;
  return token ? { username: session.username, token } : null;
}
function forgetSession(serverId) {
  const s = load();
  if (s.sessions[serverId]) {
    delete s.sessions[serverId];
    persist();
  }
}

async function checkServer(serverId) {
  const server = getServer(serverId);
  if (!server) return { online: false };
  const started = Date.now();
  let info;
  try {
    info = await request(server.url, '/api/status', { timeoutMs: 3500 });
  } catch {
    return { online: false };
  }
  if (!info?.online) return { online: false };
  const result = { online: true, info, pingMs: Date.now() - started, account: null };
  const session = sessionFor(serverId);
  if (session) {
    try {
      const me = await request(server.url, '/api/auth/me', { token: session.token, timeoutMs: 3500 });
      result.account = accountInfo(me);
    } catch (error) {
      if (error.status === 401) {
        forgetSession(serverId);
        result.sessionExpired = true;
      }
    }
  }
  return result;
}

async function authenticate(kind, serverId, username, password) {
  const server = getServer(serverId);
  if (!server) return { error: 'Pick a server first.' };
  try {
    const data = await request(server.url, kind === 'register' ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    load().sessions[serverId] = { username: data.user.username, token: sealToken(data.token) };
    persist();
    return { user: data.user, account: accountInfo(data), state: publicState() };
  } catch (error) {
    return { error: error.message };
  }
}

// What the launcher shows for a signed-in account. Servers before 0.3 have no characters list.
function accountInfo(data) {
  return {
    username: data.user.username,
    characters: Array.isArray(data.characters) ? data.characters : null,
    maxCharacters: data.maxCharacters || 5,
    save: data.save || null,
  };
}

// ---------------------------------------------------------------- characters on a server
const OLD_SERVER = 'This server needs an update before it supports characters. Ask its owner to install the latest server.';
async function characterRequest(serverId, pathname, options) {
  const server = getServer(serverId);
  const session = sessionFor(serverId);
  if (!server || !session) return { error: 'Log in first.' };
  try {
    return await request(server.url, pathname, { ...options, token: session.token });
  } catch (error) {
    if (error.status === 401) forgetSession(serverId);
    if (error.status === 404 && !/character/i.test(error.message)) return { error: OLD_SERVER };
    return { error: error.message, status: error.status };
  }
}
const listCharacters = (serverId) => characterRequest(serverId, '/api/characters');
const createCharacter = (serverId, input) =>
  characterRequest(serverId, '/api/characters', { method: 'POST', body: input });
const deleteCharacter = (serverId, id) =>
  characterRequest(serverId, `/api/characters/${encodeURIComponent(id)}`, { method: 'DELETE' });

async function logout(serverId) {
  const server = getServer(serverId);
  const session = sessionFor(serverId);
  if (server && session) {
    request(server.url, '/api/auth/logout', { method: 'POST', token: session.token, timeoutMs: 3000 }).catch(() => {});
  }
  forgetSession(serverId);
  return publicState();
}

module.exports = {
  publicState,
  getServer,
  selectServer,
  addServer,
  removeServer,
  checkServer,
  authenticate,
  logout,
  sessionFor,
  forgetSession,
  request,
  listCharacters,
  createCharacter,
  deleteCharacter,
  OLD_SERVER,
};
