// Packs the game/ folder into one compressed patch file: release/depths-game-<version>.pak
// The launcher downloads this to update players without a new installer (see electron/updates.cjs).
//
// Format: gzip-compressed JSON { format: 1, version, files: { "js/01-core.js": "<base64>", ... } }
//
//   node scripts/build-game-pak.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildGamePak() {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const gameDir = path.join(root, 'game');
  const versionFile = fs.readFileSync(path.join(gameDir, 'js', '00-version.js'), 'utf8');
  if (!versionFile.includes(JSON.stringify(version))) {
    throw new Error(`game/js/00-version.js is not ${version}. Run: node scripts/sync-version.mjs`);
  }

  const files = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files[path.relative(gameDir, full).split(path.sep).join('/')] = fs.readFileSync(full).toString('base64');
    }
  };
  walk(gameDir);

  const payload = zlib.gzipSync(Buffer.from(JSON.stringify({ format: 1, version, files })), { level: 9 });
  const name = `depths-game-${version}.pak`;
  const file = path.join(root, 'release', name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, payload);
  return {
    name,
    file,
    version,
    size: payload.length,
    sha256: crypto.createHash('sha256').update(payload).digest('hex'),
    fileCount: Object.keys(files).length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pak = buildGamePak();
  console.log(`Built release/${pak.name}: ${pak.fileCount} files, ${(pak.size / 1024).toFixed(0)} KB`);
}
