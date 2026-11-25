// Packages the game server for the Raspberry Pi.
//
//   bun run server:pack    release/depths-server-<version>.tar.gz
//                          Server source + Dockerfile + docker-compose.yml. On the Pi:
//                            tar xzf depths-server-<version>.tar.gz && cd depths-server && docker compose up -d --build
//
//   bun run server:image   Also builds a ready-made Docker image for the Pi on this PC (needs Docker Desktop):
//                          release/depths-server-<version>-arm64.tar. On the Pi: docker load -i <file>
//                          Set PLATFORM=linux/arm/v7 for a 32-bit Raspberry Pi OS.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const srcDir = path.join(root, 'game-server');
const releaseDir = path.join(root, 'release');
const stageDir = path.join(releaseDir, 'depths-server');
const archive = path.join(releaseDir, `depths-server-${version}.tar.gz`);
const buildImage = process.argv.includes('--image');
const platform = process.env.PLATFORM || 'linux/arm64';

const FILES = [
  'server.mjs',
  'Dockerfile',
  'docker-compose.yml',
  '.dockerignore',
  'config.example.json',
  'install.sh',
  'update.sh',
  'depths-server-update.service',
  'depths-server-update.timer',
  'depths-server.service',
  'README.md',
];

const run = (cmd, args, opts = {}) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed`);
};

// ---- stage the files
fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });
for (const name of FILES) {
  // Linux line endings: a Windows checkout may have CRLF, which breaks scripts on the Pi.
  let text = fs.readFileSync(path.join(srcDir, name), 'utf8').replace(/\r\n/g, '\n');
  if (name === 'server.mjs') {
    const stamped = text.replace(/const SERVER_VERSION = '[^']*';/, `const SERVER_VERSION = '${version}';`);
    if (!stamped.includes(`const SERVER_VERSION = '${version}';`)) throw new Error('Could not stamp SERVER_VERSION');
    text = stamped;
  }
  const dest = path.join(stageDir, name);
  fs.writeFileSync(dest, text);
  if (name.endsWith('.sh')) fs.chmodSync(dest, 0o755);
}
fs.writeFileSync(path.join(stageDir, 'VERSION'), `${version}\n`);

// ---- source package
fs.rmSync(archive, { force: true });
// Relative paths from inside release/: GNU tar would read "C:\..." as a remote host.
run('tar', ['-czf', path.basename(archive), 'depths-server'], { cwd: releaseDir });
console.log(`Built ${path.relative(root, archive)} (${(fs.statSync(archive).size / 1024).toFixed(1)} KB)`);

// ---- optional prebuilt image
if (buildImage) {
  const arch = platform.split('/').slice(1).join('');
  const imageFile = path.join(releaseDir, `depths-server-${version}-${arch}.tar`);
  fs.rmSync(imageFile, { force: true });
  run('docker', [
    'buildx', 'build',
    '--platform', platform,
    '-t', `depths-server:${version}`,
    '-t', 'depths-server:latest',
    '--output', `type=docker,dest=${imageFile}`,
    stageDir,
  ]);
  console.log(`Built ${path.relative(root, imageFile)} (${(fs.statSync(imageFile).size / 1048576).toFixed(1)} MB) for ${platform}`);
}

fs.rmSync(stageDir, { recursive: true, force: true });
console.log(`\nOn the Pi:\n  tar xzf depths-server-${version}.tar.gz\n  cd depths-server\n  docker compose up -d --build`);
