// Pipeline stage "Compile": everything must at least build before anything else runs.
//
//   bun run ci:compile
//
//   1. JavaScript syntax of the launcher, Electron, game server and scripts
//   2. JSON files parse (package.json, Godot export presets aside)
//   3. Godot imports the project, and every GDScript file compiles (godot/tests/parse_check.tscn)
//
// Exits with code 1 if anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findGodot, GODOT_HELP } from '../lib/godot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];
const step = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`);
};

export function jsFiles() {
  const dirs = ['electron', 'launcher', 'game-server', 'game-server/tests', 'scripts', 'scripts/lib', 'scripts/ci'];
  return dirs.flatMap((dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs.readdirSync(path.join(root, dir)).filter((f) => /\.(c|m)?js$/.test(f)).map((f) => path.join(dir, f))
      : [],
  );
}

export function checkSyntax() {
  const files = jsFiles();
  const broken = files.filter((f) => spawnSync(process.execPath, ['--check', path.join(root, f)]).status !== 0);
  return { files, broken };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { files, broken } = checkSyntax();
  step(`JavaScript syntax (${files.length} files)`, broken.length === 0, broken.join(', '));

  const jsonFiles = ['package.json', 'launcher/patch-notes.json'].filter((f) => fs.existsSync(path.join(root, f)));
  const badJson = jsonFiles.filter((f) => {
    try {
      JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
      return false;
    } catch {
      return true;
    }
  });
  step(`JSON (${jsonFiles.length} files)`, badJson.length === 0, badJson.join(', '));

  const godot = findGodot();
  if (!godot) step('GDScript', false, GODOT_HELP);
  else {
    const project = path.join(root, 'godot');
    spawnSync(godot, ['--headless', '--path', project, '--import'], { stdio: 'ignore', timeout: 10 * 60e3 });
    const r = spawnSync(godot, ['--headless', '--path', project, 'res://tests/parse_check.tscn'], { encoding: 'utf8', timeout: 5 * 60e3 });
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const line = (out.match(/PARSE CHECK .*/) || [''])[0];
    for (const l of out.split('\n').filter((l) => /SCRIPT ERROR|Parse Error|^\s+FAIL/.test(l)).slice(0, 20)) console.log(`  ${l.trim()}`);
    step('GDScript compiles', r.status === 0 && line.includes('PASSED'), line.replace('PARSE CHECK ', ''));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n✗ Compile failed` : '\n✓ Compile passed');
  process.exit(failed ? 1 : 0);
}
