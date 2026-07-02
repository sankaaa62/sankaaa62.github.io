import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];
const projDir = 'src/content/projects';
const en = (existsSync(join(projDir, 'en')) ? readdirSync(join(projDir, 'en')) : []).filter(f => f.endsWith('.md'));
const ru = (existsSync(join(projDir, 'ru')) ? readdirSync(join(projDir, 'ru')) : []).filter(f => f.endsWith('.md'));
for (const f of en) if (!ru.includes(f)) errors.push(`ru/${f} отсутствует (есть en/${f})`);
for (const f of ru) if (!en.includes(f)) errors.push(`en/${f} отсутствует (есть ru/${f})`);
if (en.length === 0) errors.push('нет ни одного избранного проекта в en/');

const protoPath = 'src/content/prototypes/prototypes.json';
if (!existsSync(protoPath)) {
  errors.push('нет prototypes.json');
} else {
  let list;
  let parseFailed = false;
  try {
    list = JSON.parse(readFileSync(protoPath, 'utf8'));
  } catch (e) {
    errors.push(`prototypes.json: невалидный JSON (${e.message})`);
    parseFailed = true;
  }
  if (!parseFailed) {
    if (!Array.isArray(list)) errors.push('prototypes.json: не массив');
    else if (list.length === 0) errors.push('prototypes.json: пустой');
    else {
      const ids = list.map(p => p.id).filter(Boolean);
      const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
      if (dupes.length) errors.push(`prototypes.json: дублирующиеся id: ${dupes.join(', ')}`);
      for (const p of list) {
        for (const k of ['id', 'title', 'genre', 'year']) if (p[k] == null) errors.push(`prototype ${p.id ?? '?'}: нет поля ${k}`);
        const dir = join('public/media/prototypes', p.id ?? '');
        if (!existsSync(join(dir, 'icon.webp'))) errors.push(`prototype ${p.id}: нет icon.webp`);
        if (p.clip) for (const f of ['clip.webm', 'poster.jpg'])
          if (!existsSync(join(dir, f))) errors.push(`prototype ${p.id}: clip=true, но нет ${f}`);
      }
    }
  }
}
if (errors.length) { console.error('CONTENT INVALID:\n' + errors.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log('content OK');
