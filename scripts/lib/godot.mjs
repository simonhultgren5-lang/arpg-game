// Finds the Godot executable for the build and test scripts.
// Order: the GODOT environment variable, `godot` on PATH, then a Godot_v4*_console.exe in Downloads
// (Godot's zip unpacks to Downloads/Godot_v<version>_win64.exe/, a folder, or straight into Downloads).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function findGodot() {
  if (process.env.GODOT) return fs.existsSync(process.env.GODOT) || process.env.GODOT === 'godot' ? process.env.GODOT : null;
  if (spawnSync('godot', ['--version'], { encoding: 'utf8' }).status === 0) return 'godot';
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

export const GODOT_HELP =
  'Godot not found. Install Godot 4.7+ and set GODOT to its _console.exe, for example:\n' +
  '  $env:GODOT="C:\\Tools\\Godot_v4.7.2-stable_win64_console.exe"';
