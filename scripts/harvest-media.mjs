import { readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

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

const manifest = [];
for (const proj of readdirSync(ARCHIVE, { withFileTypes: true })) {
  if (!proj.isDirectory()) continue;
  const slug = slugify(proj.name);
  const icons = [], videos = [];
  for (const f of walk(join(ARCHIVE, proj.name))) {
    const ext = extname(f).toLowerCase();
    let size = 0; try { size = statSync(f).size; } catch { continue; }
    if (['.png', '.jpg', '.jpeg'].includes(ext) && size < 3e6 &&
        (/icon/i.test(basename(f)) || /icon/i.test(f.split(/[\\/]/).at(-2) ?? '')))
      icons.push({ f, size });
    if (['.mp4', '.mov'].includes(ext) && size > 1e6 && size < 2e8)
      videos.push({ f, size, inVideoDir: /video/i.test(f) ? 1 : 0 });
  }
  icons.sort((a, b) => b.size - a.size);
  videos.sort((a, b) => (b.inVideoDir - a.inVideoDir) || (a.size - b.size));
  const dir = join(OUT, slug);
  mkdirSync(join(dir, 'icons'), { recursive: true });
  mkdirSync(join(dir, 'videos'), { recursive: true });
  icons.slice(0, 5).forEach((c, i) => copyFileSync(c.f, join(dir, 'icons', `${i}${extname(c.f)}`)));
  videos.slice(0, 5).forEach((c, i) => copyFileSync(c.f, join(dir, 'videos', `${i}${extname(c.f)}`)));
  manifest.push({ project: proj.name, slug, icons: icons.slice(0, 5).map(c => c.f), videos: videos.slice(0, 5).map(c => c.f) });
  console.log(`${slug}: icons ${Math.min(icons.length, 5)}, videos ${Math.min(videos.length, 5)}`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
