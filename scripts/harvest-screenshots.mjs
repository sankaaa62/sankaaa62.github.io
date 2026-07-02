import { readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ARCHIVE = 'D:/DevArchive/BlackGames/MyProjects(BlackGames)';
const OUT = 'media-staging';
const slugify = (s) => s.replace(/^\d+\.\s*/, '').replace(/\(.*?\)/g, '').trim()
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function* walk(dir, depth = 0) {
  if (depth > 6) return;
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!/assets|library|\.git|packages/i.test(e.name)) yield* walk(p, depth + 1); }
    else yield p;
  }
}

const PRIORITY_RE = /screenshot|store materials|screencast|design|creatives/i;
const ICON_RE = /icon/i;
const MIN_SIZE = 200 * 1024;
const MAX_SIZE = 8 * 1024 * 1024;

// Load prototypes.json to know which ids we need, and build slug->id map
const prototypes = JSON.parse(readFileSync('src/content/prototypes/prototypes.json', 'utf8'));
const idSet = new Set(prototypes.map((p) => p.id));

const manifest = [];
for (const proj of readdirSync(ARCHIVE, { withFileTypes: true })) {
  if (!proj.isDirectory()) continue;
  const slug = slugify(proj.name);
  if (!idSet.has(slug)) continue; // only prototypes we track

  const candidates = [];
  for (const f of walk(join(ARCHIVE, proj.name))) {
    const ext = extname(f).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
    let size = 0;
    try { size = statSync(f).size; } catch { continue; }
    if (size < MIN_SIZE || size > MAX_SIZE) continue;
    if (ICON_RE.test(f)) continue;
    const priority = PRIORITY_RE.test(f) ? 1 : 0;
    candidates.push({ f, size, priority });
  }
  candidates.sort((a, b) => (b.priority - a.priority) || (b.size - a.size));

  const dir = join(OUT, slug, 'shots-candidates');
  mkdirSync(dir, { recursive: true });
  const top = candidates.slice(0, 10);
  top.forEach((c, i) => {
    copyFileSync(c.f, join(dir, `${i}${extname(c.f)}`));
  });
  manifest.push({
    project: proj.name,
    slug,
    candidateCount: candidates.length,
    chosen: top.map((c) => ({ src: c.f, size: c.size, priority: c.priority })),
  });
  console.log(`${slug}: candidates ${candidates.length}, copied ${top.length}`);
}

writeFileSync(join(OUT, 'shots-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nDone. ${manifest.length} prototypes processed.`);
