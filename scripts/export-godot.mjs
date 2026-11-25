// Exports the game (godot/) to godot/build/DepthsOfDarkness.exe, which the installer bundles.
//
//   bun run godot:export
//
// Needs Godot 4.7+ with its export templates installed (Godot: Editor → Manage Export Templates).
// Finds Godot through the GODOT environment variable (path to the Godot .exe, the _console one is
// best), then `godot` on PATH, then Godot_v*_console.exe in your Downloads folder.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findGodot, GODOT_HELP } from './lib/godot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'godot');
const output = path.join(project, 'build', 'DepthsOfDarkness.exe');

const godot = findGodot();
if (!godot) {
  console.error(`
✗ ${GODOT_HELP}
`);
  process.exit(1);
}
console.log(`Exporting the game with ${godot}`);
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
