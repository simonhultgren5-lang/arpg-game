// Turns CHANGELOG.md into patch-notes.json for the launcher's Patch Notes panel.
//
//   node scripts/patch-notes.mjs                 writes launcher/patch-notes.json (bundled, works offline)
//   node scripts/patch-notes.mjs <output.json>   writes somewhere else (the release script uploads one)
//
// Format: { format: 1, generatedAt, latest, versions: [{ version, date, body }] }, newest first.
// "body" is the section's text (### subheadings, "- " bullets, **bold**); the launcher renders it as text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const compare = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  return 0;
};

export function readPatchNotes() {
  const file = path.join(root, 'CHANGELOG.md');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
  const versions = [];
  for (const part of text.split(/^## /m).slice(1)) {
    const [heading, ...rest] = part.split('\n');
    const match = heading.match(/^(\d+\.\d+\.\d+)\b(?:.*?\((\d{4}-\d{2}-\d{2})\))?/);
    if (!match) continue; // not a version section
    const body = rest.join('\n').trim();
    if (body) versions.push({ version: match[1], date: match[2] || null, body });
  }
  versions.sort((a, b) => compare(a.version, b.version));
  return { format: 1, generatedAt: new Date().toISOString(), latest: versions[0]?.version || null, versions };
}

export function writePatchNotes(output = path.join(root, 'launcher', 'patch-notes.json')) {
  const notes = readPatchNotes();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(notes, null, 2) + '\n');
  return { output, ...notes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = writePatchNotes(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log(`Patch notes: ${result.versions.length} versions (latest ${result.latest}) → ${path.relative(root, result.output)}`);
}
