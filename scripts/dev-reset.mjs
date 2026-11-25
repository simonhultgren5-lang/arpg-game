// Deletes local development data so `bun run dev` starts from scratch:
//
//   bun run dev:reset          shows what it would delete and asks first
//   bun run dev:reset --yes    deletes without asking
//
// Deletes only development data:
//   .dev/                                          the dev game server's accounts and saves
//   %APPDATA%/Depths of Darkness (dev)/            the launcher's data when running from source
//                                                  (servers, logins, offline characters, dev tool settings)
//   Godot saves of dev and test heroes             offline characters made in the dev launcher, heroes
//                                                  on the local dev server, and the test heroes
//                                                  (dev-*, smoke-*, devtest-*)
// Installed-game data (%APPDATA%/Depths of Darkness/) and saves of other heroes are never touched.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const devLauncherData = path.join(appData, 'Depths of Darkness (dev)');
const godotSaves = path.join(appData, 'Godot', 'app_userdata', 'Depths of Darkness', 'saves');
const serverKey = (url) => crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
const devServerKeys = ['http://localhost:4100', 'http://127.0.0.1:4100'].map(serverKey);

const targets = [];
if (fs.existsSync(path.join(root, '.dev'))) targets.push(path.join(root, '.dev'));
let offlineIds = [];
try {
  offlineIds = JSON.parse(fs.readFileSync(path.join(devLauncherData, 'offline-characters.json'), 'utf8')).characters.map((c) => String(c.id));
} catch {
  // no dev offline characters
}
if (fs.existsSync(devLauncherData)) targets.push(devLauncherData);
if (fs.existsSync(godotSaves)) {
  for (const name of fs.readdirSync(godotSaves)) {
    const id = name.replace(/\.json$/, '');
    const online = /^online-([0-9a-f]{8})-/.exec(name);
    const isDevHero =
      /^(dev|smoke|devtest)-/.test(id) ||
      offlineIds.includes(id) ||
      (online && devServerKeys.includes(online[1]));
    if (isDevHero) targets.push(path.join(godotSaves, name));
  }
}

if (!targets.length) {
  console.log('Nothing to delete: no development data found.');
  process.exit(0);
}
console.log('This deletes:');
for (const t of targets) console.log(`  ${t}`);
if (!process.argv.includes('--yes')) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('\nDelete these? Type yes: ')).trim().toLowerCase();
  rl.close();
  if (answer !== 'yes') {
    console.log('Nothing deleted.');
    process.exit(0);
  }
}
let failed = 0;
for (const t of targets) {
  try {
    fs.rmSync(t, { recursive: true, force: true });
  } catch (error) {
    failed++;
    console.error(`✗ ${t}: ${error.message} (is the launcher or dev server still running?)`);
  }
}
console.log(failed ? `\n${failed} item(s) could not be deleted.` : '\n✓ Development data deleted.');
process.exit(failed ? 1 : 0);
