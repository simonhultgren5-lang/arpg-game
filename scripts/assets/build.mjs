// Builds the game's 3D assets with Blender, headless. See assets.md.
//
//   bun run assets:build                     every material and model
//   bun run assets:build -- warrior hollow   only scripts whose name contains one of these words
//   bun run assets:build -- --previews C:\temp\previews   also render a preview of each model
//   bun run assets:build -- --rebuild-textures            remake texture sets that already exist
//
// Needs Blender 4.5 LTS (or newer). Finds it through the BLENDER environment variable (path to
// blender.exe), then `blender` on your PATH, then a Blender folder in your Downloads.
//
// The scripts are in scripts/assets/blender/: materials.py makes the texture sets, and each script in
// characters/ and props/ makes one model: source-assets/Models/<group>/<name>.blend (the editable
// source) and godot/assets/models/<group>/<name>.glb (what the game loads).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const kit = path.join(root, 'scripts', 'assets', 'blender');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const value = args[i + 1];
  args.splice(i, value && !value.startsWith('--') ? 2 : 1);
  return value && !value.startsWith('--') ? value : true;
};
const previews = flag('--previews');
const rebuild = flag('--rebuild-textures');
const filters = args.filter((a) => !a.startsWith('--'));

function findBlender() {
  if (process.env.BLENDER) return process.env.BLENDER;
  if (spawnSync('blender', ['--version'], { encoding: 'utf8' }).status === 0) return 'blender';
  const downloads = path.join(os.homedir(), 'Downloads');
  const found = [];
  for (const entry of fs.existsSync(downloads) ? fs.readdirSync(downloads) : []) {
    if (!/^blender-\d/i.test(entry)) continue;
    const exe = path.join(downloads, entry, 'blender.exe');
    if (fs.existsSync(exe)) found.push(exe);
  }
  return found.sort().pop() || null;
}

const blender = findBlender();
if (!blender) {
  console.error('\n✗ Blender not found. Install Blender 4.5 LTS and set BLENDER, for example:\n  $env:BLENDER="C:\\Tools\\blender-4.5.17-windows-x64\\blender.exe"\n');
  process.exit(1);
}

const scripts = [path.join(kit, 'materials.py'), path.join(kit, 'ui_frames.py')];
for (const group of ['props', 'characters', 'icons']) {
  const dir = path.join(kit, group);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.py')) scripts.push(path.join(dir, f));
}
const chosen = filters.length ? scripts.filter((s) => filters.some((f) => path.basename(s).includes(f))) : scripts;
if (!chosen.length) {
  console.error(`✗ No asset script matches: ${filters.join(', ')}`);
  process.exit(1);
}

const env = { ...process.env };
if (previews) env.DDK_PREVIEWS = path.resolve(String(previews));
if (rebuild) env.DDK_REBUILD = '1';
let failed = 0;
for (const script of chosen) {
  const name = path.relative(kit, script);
  const started = Date.now();
  // The kit folder goes on Python's path so every script can `import ddk, materials`.
  const expr = `import sys, runpy; sys.path.insert(0, ${JSON.stringify(kit)}); runpy.run_path(${JSON.stringify(script)}, run_name="__main__")`;
  const r = spawnSync(blender, ['--background', '--factory-startup', '--python-exit-code', '1', '--python-expr', expr], {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const lines = out.split(/\r?\n/).filter((l) => /^\s+(model|source|texture|preview|making|locked)\b/.test(l));
  if (r.status !== 0) {
    failed++;
    console.error(`✗ ${name}\n${out.split(/\r?\n/).slice(-30).join('\n')}`);
    continue;
  }
  console.log(`✓ ${name} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  for (const l of lines) console.log(`   ${l.trim()}`);
}
if (failed) {
  console.error(`\n✗ ${failed} asset script(s) failed.`);
  process.exit(1);
}
console.log('\nDone. Open the Godot project (or run `godot --headless --path godot --import`) to import the new files.');
