// Exports the 3D game (godot/) to godot/build/DepthsOfDarkness.exe, which the installer bundles.
//
//   bun run godot:export
//
// Needs Godot 4.7+ with its export templates installed (Godot: Editor → Manage Export Templates).
// Finds Godot through the GODOT environment variable (path to the Godot .exe, the _console one is
// best), then `godot` on PATH, then Godot_v*_console.exe in your Downloads folder.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'godot');
const output = path.join(project, 'build', 'DepthsOfDarkness.exe');

function findGodot() {
  if (process.env.GODOT) return process.env.GODOT;
  if (spawnSync('godot', ['--version'], { encoding: 'utf8' }).status === 0) return 'godot';
  // Godot's zip unpacks to Downloads/Godot_v<version>_win64.exe/ (a folder) or straight into Downloads.
  const downloads = path.join(os.homedir(), 'Downloads');
  const candidates = [];
  for (const entry of fs.existsSync(downloads) ? fs.readdirSync(downloads) : []) {
    if (!/^Godot_v4/i.test(entry)) continue;
    const full = path.join(downloads, entry);
    if (fs.statSync(full).isDirectory()) {
      for (const inner of fs.readdirSync(full)) if (/_console\.exe$/i.test(inner)) candidates.push(path.join(full, inner));
    } else if (/_console\.exe$/i.test(entry)) candidates.push(full);
  }
  return candidates.sort().pop() || null;
}

const godot = findGodot();
if (!godot) {
  console.error('\n✗ Godot not found. Set GODOT to the Godot .exe, for example:\n  $env:GODOT="C:\\Tools\\Godot_v4.7.2-stable_win64_console.exe"\n');
  process.exit(1);
}
console.log(`Exporting the 3D game with ${godot}`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.rmSync(output, { force: true });
// Import first so a fresh checkout (no .godot/ cache) exports every resource.
spawnSync(godot, ['--headless', '--path', project, '--import'], { stdio: 'ignore' });
const result = spawnSync(godot, ['--headless', '--path', project, '--export-release', 'Windows Desktop', output], {
  encoding: 'utf8',
});
if (result.status !== 0 || !fs.existsSync(output)) {
  console.error(result.stdout, result.stderr);
  console.error('\n✗ Export failed. Are the export templates installed? (Godot: Editor → Manage Export Templates)\n');
  process.exit(1);
}
console.log(`✓ ${path.relative(root, output)} (${(fs.statSync(output).size / 1048576).toFixed(1)} MB)`);
