// Characters for the launcher: up to MAX_CHARACTERS heroes per account.
//
// Online characters live on the game server (/api/characters). Offline characters are kept in
// <userData>/offline-characters.json. The game (godot/) keeps each hero's progress in its own save
// file (see godot/scripts/autoload/save_system.gd); the launcher reads those to show the level, and
// removes them when a character is deleted.
const { app } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_CHARACTERS = 5;
const HERO_CLASSES = ['warrior', 'pyromancer', 'rogue'];
const NAME_RE = /^[A-Za-z][A-Za-z '-]{1,17}$/;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

// ---------------------------------------------------------------- the game's save files
// Godot keeps user:// in %APPDATA%/Godot/app_userdata/<project name>/.
const gameSaveDir = () => path.join(app.getPath('appData'), 'Godot', 'app_userdata', 'Depths of Darkness', 'saves');
// Same file names as save_system.gd: "<id>.json" offline, "online-<server hash>-<id>.json" online.
const safeName = (id) => String(id).replace(/[^A-Za-z0-9_.-]/g, '_');
const serverKey = (serverUrl) => crypto.createHash('md5').update(String(serverUrl)).digest('hex').slice(0, 8);
const offlineSaveFile = (id) => path.join(gameSaveDir(), `${safeName(id)}.json`);
const onlineSaveFile = (serverUrl, id) => path.join(gameSaveDir(), `online-${serverKey(serverUrl)}-${safeName(id)}.json`);

function deleteGameSave(serverUrl, id) {
  fs.rmSync(serverUrl ? onlineSaveFile(serverUrl, id) : offlineSaveFile(id), { force: true });
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
  if (!offline || !Array.isArray(offline.characters)) offline = { characters: [] };
  // Heroes from the 2D game (before 0.4.0) keep their name, class and colour; their 2D save stays behind.
  delete offline.legacyChecked;
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
  deleteGameSave(null, character.id);
  return { ok: true, ...offlineList() };
}

// Reads level and depth from the game's save file of each offline hero, so the list stays current.
function refreshOfflineProgress() {
  const store = loadOffline();
  let changed = false;
  for (const character of store.characters) {
    let save;
    try {
      const file = offlineSaveFile(character.id);
      save = JSON.parse(fs.readFileSync(file, 'utf8'));
      const mtime = fs.statSync(file).mtimeMs;
      if (character.updatedAt !== Math.round(mtime)) {
        character.updatedAt = Math.round(mtime);
        changed = true;
      }
    } catch {
      continue; // not played yet
    }
    const level = Math.trunc(Number(save?.level));
    const depth = Math.trunc(Number(save?.depth));
    if (Number.isFinite(level) && level > 0 && character.level !== level) {
      character.level = level;
      changed = true;
    }
    if (Number.isFinite(depth) && depth > 0 && character.depth !== depth) {
      character.depth = depth;
      changed = true;
    }
  }
  if (changed) persistOffline();
}

// What the game needs to know about the character it plays.
const bootCharacter = (c) => ({ id: String(c.id), name: c.name, heroClass: c.heroClass, color: c.color });

module.exports = {
  MAX_CHARACTERS,
  validateNew,
  offlineList,
  getOffline,
  createOffline,
  deleteOffline,
  deleteGameSave,
  refreshOfflineProgress,
  bootCharacter,
};
