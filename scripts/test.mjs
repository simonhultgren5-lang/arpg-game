// Runs every automated check in the repo:
//
//   bun run test            everything
//   bun run test --quick    skip the Godot tests (no Godot needed)
//
//   1. Syntax of the launcher, Electron, server and build scripts
//   2. Game server + admin CLI tests (game-server/tests/)
//   3. Godot: smoke test (plays Act I with every class) and dev console test, headless
//
// Exits with code 1 if anything failed.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findGodot, GODOT_HELP } from './lib/godot.mjs';
import { checkSyntax } from './ci/compile.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick');
const results = [];
const step = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok === null ? '–' : ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`);
};

// ---- 1. syntax (the same check as the pipeline's compile stage)
const { files, broken } = checkSyntax();
step(`Syntax of ${files.length} files`, broken.length === 0, broken.join(', '));

// ---- 2. server tests
console.log('\nGame server tests…');
const server = spawnSync(process.execPath, ['--no-warnings', '--test', path.join(root, 'game-server', 'tests', 'server.test.mjs')], {
  encoding: 'utf8',
});
const summary = (server.stdout.match(/^ℹ (pass|fail) \d+/gm) || []).join(', ').replace(/ℹ /g, '');
if (server.status !== 0) console.log(server.stdout.split('\n').filter((l) => /✖|not ok|Error|expected|actual/.test(l)).slice(0, 30).join('\n'));
step('Game server and admin CLI', server.status === 0, summary);

// ---- 3. Godot
if (quick) step('Godot tests', null, 'skipped (--quick)');
else {
  const godot = findGodot();
  if (!godot) step('Godot tests', false, GODOT_HELP);
  else {
    const project = path.join(root, 'godot');
    spawnSync(godot, ['--headless', '--path', project, '--import'], { stdio: 'ignore' });
    for (const [name, scene, marker] of [
      ['Godot smoke test (Act I, every class)', 'res://tests/smoke_test.tscn', 'SMOKE TEST PASSED'],
      ['Godot dev console test', 'res://tests/dev_console_test.tscn', 'DEV CONSOLE TEST PASSED'],
    ]) {
      console.log(`\n${name}…`);
      // A script error leaves headless Godot running, so give each test a time limit.
      const r = spawnSync(godot, ['--headless', '--path', project, scene], { encoding: 'utf8', timeout: 5 * 60e3 });
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      const checks = (out.match(/^\s+ok\s/gm) || []).length;
      const failures = out.split('\n').filter((l) => /FAIL|SCRIPT ERROR|Parse Error/.test(l));
      if (failures.length) console.log(failures.slice(0, 20).join('\n'));
      const ok = r.status === 0 && out.includes(marker);
      step(name, ok, r.error ? `timed out or failed to start (${r.error.code})` : `${checks} checks`);
    }
  }
}

const failed = results.filter((r) => r.ok === false);
console.log(`\n${failed.length ? `✗ ${failed.length} failed` : '✓ All checks passed'}`);
process.exit(failed.length ? 1 : 0);
