// Characters for the launcher: up to MAX_CHARACTERS heroes per account.
//
// Online characters live on the game server (/api/characters). Offline characters are kept in
// <userData>/offline-characters.json. Every character plays in its own storage partition, so its
// save never mixes with another hero's. Heroes made before characters existed (one per account, or
// the single offline hero) keep the storage they already had: they are marked `legacy`.
const { app, session } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_CHARACTERS = 5;
const HERO_CLASSES = ['warrior', 'pyromancer', 'rogue'];
const NAME_RE = /^[A-Za-z][A-Za-z '-]{1,17}$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const GAME_ORIGIN = 'app://game';

const hash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

// ---------------------------------------------------------------- storage partitions
// Before characters, each online account had one partition; the migrated hero keeps it.
const accountPartition = (serverUrl, username) => `persist:account-${hash(`${serverUrl}|${username.toLowerCase()}`)}`;
function onlinePartition(serverUrl, username, character) {
  if (character.legacy) return accountPartition(serverUrl, username);
  return `persist:char-${hash(`${serverUrl}|${username.toLowerCase()}|${character.id}`)}`;
}
// The original offline hero used the default session (no partition).
const offlinePartition = (character) => (character.legacy ? undefined : `persist:offline-${character.id}`);

async function clearGameStorage(partition) {
  const sess = partition ? session.fromPartition(partition) : session.defaultSession;
  await sess.clearStorageData({ origin: GAME_ORIGIN }).catch(() => {});
}

// ---------------------------------------------------------------- validation (same rules as the server)
function validateNew({ name, heroClass, color } = {}) {
  const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (!NAME_RE.test(clean)) return { error: "Name must be 2–18 letters (spaces, - and ' allowed)." };
  if (!HERO_CLASSES.includes(heroClass)) return { error: 'Pick a class.' };
  return { name: clean, heroClass, color: COLOR_RE.test(color) ? color.toLowerCase() : '#8d3430' };
}

// ---------------------------------------------------------------- offline characters
const offlineFile = () => path.join(app.getPath('userData'), 'offline-characters.json');
let offline = null;

function loadOffline() {
  if (offline) return offline;
  try {
    offline = JSON.parse(fs.readFileSync(offlineFile(), 'utf8'));
  } catch {
    offline = null;
  }
  if (!offline || !Array.isArray(offline.characters)) offline = { characters: [], legacyChecked: false };
  return offline;
}
function persistOffline() {
  try {
    fs.mkdirSync(path.dirname(offlineFile()), { recursive: true });
    fs.writeFileSync(offlineFile(), JSON.stringify(offline, null, 2));
  } catch (error) {
    console.error('Could not save offline characters:', error);
  }
}

// Reads the hero that offline play stored before characters existed, if any. `probe` loads a blank
// app://game page in the default session and returns that page's game save keys.
async function adoptLegacyOfflineHero(probe) {
  const store = loadOffline();
  if (store.legacyChecked) return;
  let found = null;
  try {
    found = await probe();
  } catch {
    return; // try again next time
  }
  store.legacyChecked = true;
  if (found?.save) {
    let s = null;
    try {
      s = JSON.parse(found.save);
    } catch {
      // unreadable save: nothing to adopt
    }
    const started = found.started && found.started === String(s?.heroName);
    const progressed = s && (Number(s.lv) > 1 || Number(s.xp) > 0 || Number(s.depth) > 1 || Number(s.best) > 1);
    if (s && (started || progressed)) {
      const name = typeof s.heroName === 'string' && NAME_RE.test(s.heroName.trim()) ? s.heroName.trim() : 'Hero';
      store.characters.unshift({
        id: 'legacy',
        name,
        heroClass: HERO_CLASSES.includes(found.heroClass) ? found.heroClass : 'warrior',
        color: COLOR_RE.test(s.heroColor) ? s.heroColor : '#8d3430',
        level: Math.max(1, Number(s.lv) || 1),
        depth: Math.max(1, Number(s.depth) || 1),
        legacy: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
  persistOffline();
}

const offlineList = () => ({ characters: loadOffline().characters, maxCharacters: MAX_CHARACTERS });
const getOffline = (id) => loadOffline().characters.find((c) => c.id === id) || null;

function createOffline(input) {
  const store = loadOffline();
  const v = validateNew(input);
  if (v.error) return { error: v.error };
  if (store.characters.length >= MAX_CHARACTERS) {
    return { error: `You already have ${MAX_CHARACTERS} characters. Delete one to make room.` };
  }
  if (store.characters.some((c) => c.name.toLowerCase() === v.name.toLowerCase())) {
    return { error: 'You already have a character with that name.' };
  }
  const character = {
    id: crypto.randomBytes(6).toString('hex'),
    ...v,
    level: 1,
    depth: 1,
    legacy: false,
    createdAt: Date.now(),
    updatedAt: null,
  };
  store.characters.push(character);
  persistOffline();
  return { character, ...offlineList() };
}

async function deleteOffline(id) {
  const store = loadOffline();
  const character = getOffline(id);
  if (!character) return { error: 'That character no longer exists.' };
  store.characters = store.characters.filter((c) => c.id !== id);
  persistOffline();
  await clearGameStorage(offlinePartition(character));
  return { ok: true, ...offlineList() };
}

// The offline game reports its level and depth so the launcher list stays current.
function updateOfflineMeta(id, meta) {
  const character = getOffline(id);
  if (!character || !meta) return;
  const level = Math.trunc(Number(meta.heroLevel));
  const depth = Math.trunc(Number(meta.depth));
  if (Number.isFinite(level) && level > 0) character.level = level;
  if (Number.isFinite(depth) && depth > 0) character.depth = depth;
  character.updatedAt = Date.now();
  persistOffline();
}

// What the game needs to know about the character it plays.
const bootCharacter = (c) => ({ id: String(c.id), name: c.name, heroClass: c.heroClass, color: c.color });

module.exports = {
  MAX_CHARACTERS,
  validateNew,
  onlinePartition,
  offlinePartition,
  clearGameStorage,
  adoptLegacyOfflineHero,
  offlineList,
  getOffline,
  createOffline,
  deleteOffline,
  updateOfflineMeta,
  bootCharacter,
};
