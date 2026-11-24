// Publishes a new version to GitHub Releases so installed launchers update themselves.
//
//   bun run release                  game patch only (game/ changed)
//   bun run release:launcher         game patch + new launcher/installer (electron/ or launcher/ changed)
//   add -- --dry-run                 build everything into release/upload/ but don't publish
//
// Before releasing: bump the version (bun run bump:patch), add a "## <version>" section to
// CHANGELOG.md (shown to players in the launcher), commit and push.
//
// Every release gets:
//   depths-game-<v>.pak       the game files (what launchers download)
//   game-update.json          { version, url, size, sha256, minLauncher, notes }
//   launcher-update.json      newest launcher installer (copied from the previous release if unchanged)
//   patch-notes.json          every version's notes from CHANGELOG.md (the launcher's Patch Notes panel)
// Launchers read both .json files from https://github.com/<repo>/releases/latest/download/
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildGamePak } from './build-game-pak.mjs';
import { writePatchNotes } from './patch-notes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const withLauncher = args.includes('--launcher');
const dryRun = args.includes('--dry-run');

const sh = (cmd, cmdArgs, opts = {}) => {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, encoding: 'utf8', ...opts });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
};
const fail = (message) => {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
};
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// ---------------------------------------------------------------- version + checks
sh('node', ['scripts/sync-version.mjs'], { stdio: 'inherit' });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const { version } = pkg;
const repo = pkg.desktop?.githubRepo;
if (!repo) fail('package.json is missing desktop.githubRepo');
const tag = `v${version}`;
const download = (name) => `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(name)}`;
console.log(`Release ${tag}${withLauncher ? ' (game + launcher)' : ' (game patch)'}${dryRun ? ' — dry run' : ''}`);

const changelog = fs.existsSync(path.join(root, 'CHANGELOG.md')) ? fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8') : '';
const section = changelog.split(/^## /m).find((part) => part.match(/^([\d.]+)/)?.[1] === version);
if (!section) fail(`CHANGELOG.md has no "## ${version}" section. Add patch notes for players first.`);
const notes = section.split('\n').slice(1).join('\n').trim();
if (!notes) fail(`The "## ${version}" section in CHANGELOG.md is empty.`);

if (!dryRun) {
  if (!sh('gh', ['auth', 'status']).ok) fail('GitHub CLI is not logged in. Run: gh auth login');
  if (sh('git', ['status', '--porcelain', '--untracked-files=no']).out) fail('Commit your changes first (git status is not clean).');
  const head = sh('git', ['rev-parse', 'HEAD']).out;
  sh('git', ['fetch', '--quiet', 'origin']);
  if (!sh('git', ['branch', '-r', '--contains', head]).out) fail('Push your commit to GitHub first (git push).');
  if (sh('gh', ['release', 'view', tag, '-R', repo]).ok) fail(`Release ${tag} already exists. Bump the version first: bun run bump:patch`);
}

// ---------------------------------------------------------------- build
const uploadDir = path.join(root, 'release', 'upload');
fs.rmSync(uploadDir, { recursive: true, force: true });
fs.mkdirSync(uploadDir, { recursive: true });
const uploads = [];

// Patch notes: bundled into the launcher (for offline use) and uploaded so every launcher shows the newest notes.
writePatchNotes();
writePatchNotes(path.join(uploadDir, 'patch-notes.json'));
uploads.push(path.join(uploadDir, 'patch-notes.json'));
console.log('✓ Patch notes from CHANGELOG.md');

const pak = buildGamePak();
fs.copyFileSync(pak.file, path.join(uploadDir, pak.name));
uploads.push(path.join(uploadDir, pak.name));
console.log(`✓ Game patch ${pak.name} (${(pak.size / 1024).toFixed(0)} KB)`);

let launcherManifest = null;
if (withLauncher) {
  console.log('Building the launcher installer (this takes a few minutes)…');
  const build = sh('npx', ['electron-builder', '--win'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (!build.ok) fail('electron-builder failed.');
  const setupName = `Depths-of-Darkness-Setup-${version}.exe`;
  const portableName = `Depths-of-Darkness-${version}-portable.exe`;
  for (const name of [setupName, portableName]) {
    const file = path.join(root, 'release', name);
    if (!fs.existsSync(file)) fail(`Expected ${name} in release/ after the build.`);
    fs.copyFileSync(file, path.join(uploadDir, name));
    uploads.push(path.join(uploadDir, name));
  }
  const setupFile = path.join(uploadDir, setupName);
  launcherManifest = {
    version,
    url: download(setupName),
    size: fs.statSync(setupFile).size,
    sha256: sha256(setupFile),
    notes,
    date: new Date().toISOString(),
  };
  console.log(`✓ Launcher installer ${setupName}`);
} else {
  // Carry the newest launcher forward so "latest" always points at it.
  try {
    const res = await fetch(`https://github.com/${repo}/releases/latest/download/launcher-update.json`);
    if (res.ok) launcherManifest = await res.json();
  } catch {
    // No previous launcher manifest: launchers simply see no launcher update.
  }
  console.log(launcherManifest ? `✓ Launcher stays at ${launcherManifest.version}` : '! No launcher-update.json found on GitHub yet (run release:launcher once)');
}

const gameManifest = {
  version,
  url: download(pak.name),
  size: pak.size,
  sha256: pak.sha256,
  minLauncher: pkg.desktop?.minLauncherVersion || '0.0.0',
  notes,
  date: new Date().toISOString(),
};
fs.writeFileSync(path.join(uploadDir, 'game-update.json'), JSON.stringify(gameManifest, null, 2));
uploads.push(path.join(uploadDir, 'game-update.json'));
if (launcherManifest) {
  fs.writeFileSync(path.join(uploadDir, 'launcher-update.json'), JSON.stringify(launcherManifest, null, 2));
  uploads.push(path.join(uploadDir, 'launcher-update.json'));
}
const notesFile = path.join(uploadDir, 'release-notes.md');
fs.writeFileSync(
  notesFile,
  `${notes}\n\n---\nInstalled players get this update automatically through the launcher.` +
    (withLauncher ? `\nNew players: download **Depths-of-Darkness-Setup-${version}.exe**.` : ''),
);

if (dryRun) {
  console.log(`\nDry run: files ready in release/upload/ (nothing published):`);
  for (const f of uploads) console.log(`  ${path.basename(f)}`);
  process.exit(0);
}

// ---------------------------------------------------------------- publish
console.log('Publishing to GitHub…');
const head = sh('git', ['rev-parse', 'HEAD']).out;
const create = sh(
  'gh',
  ['release', 'create', tag, ...uploads, '-R', repo, '--target', head, '--title', `Depths of Darkness ${tag}`, '--notes-file', notesFile, '--latest'],
  { stdio: 'inherit' },
);
if (!create.ok) fail('gh release create failed.');
console.log(`\n✓ Published ${tag}. Launchers pick it up the next time they start.`);
console.log(`  https://github.com/${repo}/releases/tag/${tag}`);
