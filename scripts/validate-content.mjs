import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];
const projDir = 'src/content/projects';
const en = existsSync(join(projDir, 'en')) ? readdirSync(join(projDir, 'en')) : [];
const ru = existsSync(join(projDir, 'ru')) ? readdirSync(join(projDir, 'ru')) : [];
for (const f of en) if (!ru.includes(f)) errors.push(`ru/${f} отсутствует (есть en/${f})`);
for (const f of ru) if (!en.includes(f)) errors.push(`en/${f} отсутствует (есть ru/${f})`);
if (en.length === 0) errors.push('нет ни одного избранного проекта в en/');

const protoPath = 'src/content/prototypes/prototypes.json';
if (!existsSync(protoPath)) {
  errors.push('нет prototypes.json');
} else {
  const list = JSON.parse(readFileSync(protoPath, 'utf8'));
  if (!Array.isArray(list)) errors.push('prototypes.json: не массив');
  else if (list.length === 0) errors.push('prototypes.json: пустой');
  else for (const p of list) {
    for (const k of ['id', 'title', 'genre', 'year']) if (p[k] == null) errors.push(`prototype ${p.id ?? '?'}: нет поля ${k}`);
    const dir = join('public/media/prototypes', p.id ?? '');
    if (!existsSync(join(dir, 'icon.png'))) errors.push(`prototype ${p.id}: нет icon.png`);
    if (p.clip) for (const f of ['clip.webm', 'poster.jpg'])
      if (!existsSync(join(dir, f))) errors.push(`prototype ${p.id}: clip=true, но нет ${f}`);
  }
}
if (errors.length) { console.error('CONTENT INVALID:\n' + errors.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log('content OK');
