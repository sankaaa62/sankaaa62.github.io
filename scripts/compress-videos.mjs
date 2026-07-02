import { readdirSync, existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const STAGING = 'media-staging';
const PUB = 'public/media/prototypes';
for (const slug of readdirSync(STAGING, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
  const src = join(STAGING, slug);
  const icon = join(src, 'chosen-icon.png');
  const video = join(src, 'chosen-video.mp4');
  if (!existsSync(icon)) { console.log(`skip ${slug}: нет chosen-icon.png`); continue; }
  const out = join(PUB, slug);
  mkdirSync(out, { recursive: true });
  copyFileSync(icon, join(out, 'icon.png'));
  if (existsSync(video)) {
    execSync(`ffmpeg -y -i "${video}" -t 12 -an -vf "scale=480:-2,fps=24" -c:v libvpx-vp9 -crf 40 -b:v 0 "${join(out, 'clip.webm')}"`, { stdio: 'inherit' });
    execSync(`ffmpeg -y -i "${join(out, 'clip.webm')}" -frames:v 1 -q:v 4 "${join(out, 'poster.jpg')}"`, { stdio: 'inherit' });
    console.log(`${slug}: clip ${(statSync(join(out, 'clip.webm')).size / 1e6).toFixed(1)} MB`);
  } else console.log(`${slug}: только иконка`);
}
