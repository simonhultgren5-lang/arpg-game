// Renders the launcher's background film from the real game and encodes it for the launcher.
//
//   bun run launcher:film
//
// 1. Godot's movie maker records godot/tests/launcher_film.tscn (a camera flight over Hollowmere at night,
//    the chapel, the graveyard and a fight in the fen; 24 s at 30 fps, 1920x1080) to an MJPEG .avi.
// 2. ffmpeg encodes it to launcher/assets/hollowmere-night.mp4 (H.264, no sound, fast start) and takes a
//    poster frame (launcher/assets/hollowmere-night-poster.jpg).
//
// Needs Godot (GODOT env var or on PATH, as for the tests) and ffmpeg (FFMPEG env var or on PATH).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const godot = process.env.GODOT || 'godot';
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'dod-film-'));
const avi = path.join(work, 'film.avi');
const assets = path.join(root, 'launcher', 'assets');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✗ ${path.basename(cmd)} failed (${r.error ? r.error.message : `exit ${r.status}`})`);
    process.exit(1);
  }
}

console.log('Recording the film from the game…');
run(godot, ['--path', path.join(root, 'godot'), '--write-movie', avi, '--fixed-fps', '30', '--resolution', '1920x1080',
  'res://tests/launcher_film.tscn']);
console.log('Encoding…');
run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', avi, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(assets, 'hollowmere-night.mp4')]);
run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '3', '-i', avi, '-frames:v', '1', '-q:v', '3',
  path.join(assets, 'hollowmere-night-poster.jpg')]);
fs.rmSync(work, { recursive: true, force: true });
console.log('✓ launcher/assets/hollowmere-night.mp4 and its poster');
