// Turns CHANGELOG.md into patch-notes.json for the launcher's Patch Notes panel.
//
//   node scripts/patch-notes.mjs                 writes launcher/patch-notes.json (bundled, works offline)
//   node scripts/patch-notes.mjs <output.json>   writes somewhere else (the release script uploads one)
//
// Format: { format: 1, generatedAt, latest, versions: [{ version, title, date, body }] }, newest first.
// A section heading can name the patch: "## 0.4.0 — Act I: The Tolling of Hollowmere (2026-11-25)".
// "body" is the section's text (### subheadings, "- " bullets, **bold**); the launcher renders it as text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Newest first; "0.4.1" before "0.4.1-beta.2" before "0.4.1-beta.1".
const compare = (a, b) => {
  const [ma, pa = ''] = a.split('-');
  const [mb, pb = ''] = b.split('-');
  const x = ma.split('.').map(Number);
  const y = mb.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (y[i] || 0) - (x[i] || 0);
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0);
  return pb.localeCompare(pa, 'en', { numeric: true });
};

export function readPatchNotes() {
  const file = path.join(root, 'CHANGELOG.md');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
  const versions = [];
  for (const part of text.split(/^## /m).slice(1)) {
    const [heading, ...rest] = part.split('\n');
    const match = heading.trim().match(/^(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)(?=\s|$)\s*(?:[—–:]\s*(.*?))?\s*(?:\((\d{4}-\d{2}-\d{2})\))?$/);
    if (!match) continue; // not a version section
    const body = rest.join('\n').trim();
    if (body) versions.push({ version: match[1], title: match[2]?.trim() || null, date: match[3] || null, body });
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
