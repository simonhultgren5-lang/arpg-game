// Publishes a new version to GitHub Releases so installed launchers update themselves.
//
//   bun run release                  build the game and the launcher installer, then publish
//   add -- --dry-run                 build everything into release/upload/ but don't publish
//
// The game (godot/) ships inside the installer, so every release is a launcher release.
// Before releasing: bump the version (bun run bump:patch), add a "## <version>" section to
// CHANGELOG.md (shown to players in the launcher), commit and push.
//
// Every release gets:
//   Depths-of-Darkness-Setup-<v>.exe   installer (what launchers download to update)
//   Depths-of-Darkness-<v>-portable.exe
//   launcher-update.json               { version, url, size, sha256, notes, date }
//   depths-server-<v>.tar.gz           the game server for the Pi
//   server-update.json                 what game servers check (game-server/update.sh installs it)
//   patch-notes.json                   every version's notes from CHANGELOG.md (the launcher's Patch Notes panel)
// Launchers and servers read the .json files from https://github.com/<repo>/releases/latest/download/
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writePatchNotes } from './patch-notes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
// --publish-only publishes the files an earlier `--dry-run` built in release/upload/ (the build
// pipeline publishes exactly what passed its tests and QA).
const publishOnly = args.includes('--publish-only');
// --channel beta|dev publishes a GitHub pre-release that only launchers on that channel install.
let channelArg = args.includes('--channel') ? args[args.indexOf('--channel') + 1] : null;

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
const prerelease = /-/.test(version);
// Without --channel, the version says it: 0.4.1-beta.2 goes to beta, 0.4.1 to stable.
channelArg ||= (/-(beta|dev)\.\d+$/.exec(version) || [null, 'stable'])[1];
if (!['stable', 'beta', 'dev'].includes(channelArg)) fail('--channel must be beta or dev (leave it out for stable).');
if (channelArg === 'stable' && prerelease) fail(`${version} is a pre-release version. Publish it with --channel beta or --channel dev.`);
if (channelArg !== 'stable' && !new RegExp(`-${channelArg}\\.\\d+$`).test(version)) {
  fail(`A ${channelArg} release needs a version like 0.4.1-${channelArg}.1. Run: bun run bump:${channelArg}`);
}
const download = (name) => `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(name)}`;
console.log(`Release ${tag} on the ${channelArg} channel${dryRun ? ' (dry run)' : ''}`);

const changelog = fs.existsSync(path.join(root, 'CHANGELOG.md')) ? fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8') : '';
const section = changelog.split(/^## /m).find((part) => part.match(/^(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/)?.[1] === version);
if (!section) fail(`CHANGELOG.md has no "## ${version}" section. Add patch notes for players first.`);
const notes = section.split('\n').slice(1).join('\n').trim();
// "## 0.4.0 — Act I: The Tolling of Hollowmere (date)" names the release.
const patchName = section
  .split('\n')[0]
  .replace(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?\s*/, '')
  .replace(/\(\d{4}-\d{2}-\d{2}\)\s*$/, '')
  .replace(/^[—–:-]\s*/, '')
  .trim();
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
const uploads = [];
if (publishOnly) {
  const manifest = path.join(uploadDir, 'launcher-update.json');
  if (!fs.existsSync(manifest)) fail('Nothing to publish in release/upload/. Build it first: bun run release -- --dry-run');
  const built = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
  if (built !== version) fail(`release/upload/ holds ${built}, but package.json says ${version}.`);
  for (const name of fs.readdirSync(uploadDir)) if (name !== 'release-notes.md') uploads.push(path.join(uploadDir, name));
  console.log(`✓ Using the ${uploads.length} files built and tested in release/upload/`);
} else {
  fs.rmSync(uploadDir, { recursive: true, force: true });
  fs.mkdirSync(uploadDir, { recursive: true });

  // Patch notes: bundled into the launcher (for offline use) and uploaded so every launcher shows the newest notes.
  writePatchNotes();
  writePatchNotes(path.join(uploadDir, 'patch-notes.json'));
  uploads.push(path.join(uploadDir, 'patch-notes.json'));
  console.log('✓ Patch notes from CHANGELOG.md');

  // The installer bundles the game (godot/), so export it first.
  const exported = sh('node', ['scripts/export-godot.mjs'], { stdio: 'inherit' });
  if (!exported.ok) fail('Exporting the game failed (see above).');
  console.log('Building the launcher installer (this takes a few minutes)…');
  const build = sh('npx', ['electron-builder', '--win', '--publish', 'never'], { stdio: 'inherit', shell: process.platform === 'win32' });
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
  const launcherManifest = {
    version,
    url: download(setupName),
    size: fs.statSync(setupFile).size,
    sha256: sha256(setupFile),
    notes,
    date: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(uploadDir, 'launcher-update.json'), JSON.stringify(launcherManifest, null, 2));
  uploads.push(path.join(uploadDir, 'launcher-update.json'));
  console.log(`✓ Launcher installer ${setupName}`);

  // The game server: the package for the Pi and a manifest the server checks (see game-server/update.sh).
  const packed = sh('node', ['scripts/pack-server.mjs'], { stdio: 'inherit' });
  if (!packed.ok) fail('Packing the game server failed (see above).');
  const serverName = `depths-server-${version}.tar.gz`;
  const serverFile = path.join(uploadDir, serverName);
  fs.copyFileSync(path.join(root, 'release', serverName), serverFile);
  uploads.push(serverFile);
  fs.writeFileSync(
    path.join(uploadDir, 'server-update.json'),
    JSON.stringify(
      { version, url: download(serverName), size: fs.statSync(serverFile).size, sha256: sha256(serverFile), notes, date: new Date().toISOString() },
      null,
      2,
    ),
  );
  uploads.push(path.join(uploadDir, 'server-update.json'));
  console.log(`✓ Game server ${serverName}`);

}

const notesFile = path.join(uploadDir, 'release-notes.md');
fs.writeFileSync(
  notesFile,
  `${notes}\n\n---\nInstalled players get this update automatically through the launcher.` +
    `\nNew players: download **Depths-of-Darkness-Setup-${version}.exe**.`,
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
  ['release', 'create', tag, ...uploads, '-R', repo, '--target', head, '--title', patchName ? `Depths of Darkness ${tag} — ${patchName}` : `Depths of Darkness ${tag}`, '--notes-file', notesFile, ...(prerelease ? ['--prerelease'] : ['--latest'])],
  { stdio: 'inherit' },
);
if (!create.ok) fail('gh release create failed.');
console.log(`\n✓ Published ${tag} on the ${channelArg} channel. Open launchers on that channel offer it within minutes.`);
console.log(`  https://github.com/${repo}/releases/tag/${tag}`);
