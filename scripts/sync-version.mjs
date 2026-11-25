// Copies the version from package.json into the game (config/version in godot/project.godot)
// and the game server (SERVER_VERSION in game-server/server.mjs,
// so a server run straight from a git checkout reports the right version).
// package.json is the single source of truth — bump it with `npm run bump:patch|minor|major`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
// The game shows the version on its title screen.
const godotProject = path.join(root, 'godot', 'project.godot');
if (fs.existsSync(godotProject)) {
  const text = fs.readFileSync(godotProject, 'utf8');
  const next = text.replace(/^config\/version=".*"$/m, `config/version=${JSON.stringify(version)}`);
  if (next !== text) {
    fs.writeFileSync(godotProject, next);
    console.log(`Game version set to ${version}`);
  }
}

// The game server reports this version in /api/status and compares it with new releases.
const serverFile = path.join(root, 'game-server', 'server.mjs');
if (fs.existsSync(serverFile)) {
  const text = fs.readFileSync(serverFile, 'utf8');
  const next = text.replace(/const SERVER_VERSION = '[^']*';/, `const SERVER_VERSION = '${version}';`);
  if (next !== text) {
    fs.writeFileSync(serverFile, next);
    console.log(`Game server version set to ${version}`);
  }
}
