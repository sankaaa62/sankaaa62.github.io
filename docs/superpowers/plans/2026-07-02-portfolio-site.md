# Портфолио-сайт — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Статичный двуязычный (EN/RU) портфолио-сайт Unity-разработчика на Astro, задеплоенный на GitHub Pages: 5 избранных проектов со своими страницами, сетка ~30 архивных прототипов с hover-видео, интерактив (canvas-хиро, счётчики, мини-игра).

**Architecture:** Astro 5 со встроенным i18n-роутингом (`/` = EN, `/ru/` = RU) и content collections: избранные проекты — markdown в двух локалях, прототипы — один JSON-манифест. Медиа готовится офлайн-скриптами (сканирование архива `D:\DevArchive\BlackGames\MyProjects(BlackGames)`, сжатие ffmpeg в webm) и кладётся в `public/`. Деплой — GitHub Actions → GitHub Pages.

**Tech Stack:** Astro 5, ванильные CSS/JS (без фреймворков), Node-скрипты для медиа, ffmpeg (libvpx-vp9), GitHub Actions (`withastro/action`).

**Спека:** `docs/superpowers/specs/2026-07-02-portfolio-site-design.md`

**Тестовая стратегия:** для контент-сайта роль тестов выполняют: `node scripts/validate-content.mjs` (структурная валидация контента и парности локалей — пишется ДО контента и падает, пока контента нет), `astro check` и `astro build` (валидация схем zod на каждом файле контента). Каждая задача заканчивается зелёной сборкой и коммитом.

**Важно про архив:** из `D:\DevArchive\BlackGames\MyProjects(BlackGames)` только читаем и копируем. Ничего не удалять и не изменять.

---

### Задача 1: Каркас Astro + базовый layout + стили

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json` (генерирует шаблон)
- Create: `src/styles/global.css`
- Create: `src/layouts/Base.astro`
- Create: `src/i18n/ui.ts`
- Modify: `.gitignore`

- [ ] **Шаг 1.1: Скаффолд Astro в текущем репозитории**

```powershell
npm create astro@latest . -- --template minimal --no-install --no-git --yes
npm install
```

Ожидание: созданы `package.json`, `astro.config.mjs`, `src/pages/index.astro`. Если генератор откажется писать в непустую папку — запустить в подпапку `temp-astro` и перенести содержимое в корень (кроме `.git`), затем удалить `temp-astro`.

- [ ] **Шаг 1.2: Настроить i18n и site в `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sankaaa62.github.io',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    routing: { prefixDefaultLocale: false },
  },
});
```

- [ ] **Шаг 1.3: Глобальные стили `src/styles/global.css`**

Дизайн-токены тёмной игровой темы + инженерные акценты (мыслим как у Facepunch: тёмный фон, сочный оранжевый акцент, крупная типографика; моно-шрифт для цифр и тегов):

```css
:root {
  --bg: #0e0f13;
  --surface: #171922;
  --surface-2: #1f2230;
  --border: #2a2d3a;
  --text: #e8e6e1;
  --muted: #9a97a3;
  --accent: #ff5c1a;
  --accent-2: #ffb01a;
  --ok: #5dcaa5;
  --font-sans: 'Inter Variable', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
  --radius: 12px;
  --container: 1100px;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { line-height: 1.15; margin: 0 0 .5em; font-weight: 800; }
h1 { font-size: clamp(2.2rem, 6vw, 4rem); }
h2 { font-size: clamp(1.6rem, 4vw, 2.4rem); }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
img, video { max-width: 100%; display: block; }
.container { max-width: var(--container); margin: 0 auto; padding: 0 20px; }
.section { padding: 72px 0; }
.mono { font-family: var(--font-mono); }
.tag {
  display: inline-block; padding: 2px 10px; border: 1px solid var(--border);
  border-radius: 999px; font-family: var(--font-mono); font-size: .78rem;
  color: var(--muted); background: var(--surface);
}
.btn {
  display: inline-block; padding: 12px 22px; border-radius: var(--radius);
  background: var(--accent); color: #fff; font-weight: 700;
}
.btn:hover { text-decoration: none; filter: brightness(1.1); }
.btn.ghost { background: transparent; border: 1px solid var(--border); color: var(--text); }
/* прячем .reveal только когда JS точно есть (html.js ставится инлайн-скриптом в Base.astro) */
html.js .reveal { opacity: 0; transform: translateY(24px); transition: opacity .6s, transform .6s; }
html.js .reveal.visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  html.js .reveal { opacity: 1; transform: none; transition: none; }
  html { scroll-behavior: auto; }
}
```

- [ ] **Шаг 1.4: Установить шрифты**

```powershell
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

- [ ] **Шаг 1.5: Словарь UI-строк `src/i18n/ui.ts`**

```ts
export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const ui = {
  en: {
    'nav.projects': 'Projects',
    'nav.prototypes': 'Prototypes',
    'nav.skills': 'Skills',
    'nav.contact': 'Contact',
    'hero.title': 'Senior Unity Developer',
    'hero.sub': 'Mobile & PC · Multiplayer · ECS/DOTS · Gameplay systems',
    'hero.cv': 'Download CV',
    'metrics.years': 'years in gamedev',
    'metrics.installs': 'installs across projects',
    'metrics.loc': 'lines of code',
    'metrics.team': 'grew a team',
    'featured.title': 'Featured projects',
    'prototypes.title': 'Prototype archive',
    'prototypes.sub': '200+ hyper-casual prototypes built and shipped at Black Games — a selection:',
    'skills.title': 'Skills',
    'contact.title': 'Contact',
    'project.role': 'Role',
    'project.stack': 'Stack',
    'project.links': 'Links',
    'project.back': '← All projects',
    'footer.game': 'press start',
  },
  ru: {
    'nav.projects': 'Проекты',
    'nav.prototypes': 'Прототипы',
    'nav.skills': 'Навыки',
    'nav.contact': 'Контакты',
    'hero.title': 'Senior Unity Developer',
    'hero.sub': 'Мобильные и PC · Мультиплеер · ECS/DOTS · Геймплейные системы',
    'hero.cv': 'Скачать CV',
    'metrics.years': 'лет в геймдеве',
    'metrics.installs': 'установок суммарно',
    'metrics.loc': 'строк кода',
    'metrics.team': 'вырастил команду',
    'featured.title': 'Избранные проекты',
    'prototypes.title': 'Архив прототипов',
    'prototypes.sub': '200+ гиперказуальных прототипов в Black Games — избранное:',
    'skills.title': 'Навыки',
    'contact.title': 'Контакты',
    'project.role': 'Роль',
    'project.stack': 'Стек',
    'project.links': 'Ссылки',
    'project.back': '← Все проекты',
    'footer.game': 'press start',
  },
} as const;

export function t(locale: Locale, key: keyof (typeof ui)['en']): string {
  return ui[locale][key] ?? ui.en[key];
}
export function localePath(locale: Locale, path: string): string {
  return locale === 'en' ? path : `/ru${path}`;
}
```

- [ ] **Шаг 1.6: Базовый layout `src/layouts/Base.astro`**

```astro
---
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/global.css';
import { t, localePath, type Locale } from '../i18n/ui';

interface Props { locale: Locale; title: string; description: string; path: string }
const { locale, title, description, path } = Astro.props;
const otherLocale: Locale = locale === 'en' ? 'ru' : 'en';
---
<!doctype html>
<html lang={locale}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content={new URL('/media/og.jpg', Astro.site)} />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="alternate" hreflang="en" href={new URL(path, Astro.site)} />
  <link rel="alternate" hreflang="ru" href={new URL(`/ru${path}`, Astro.site)} />
  <script is:inline>document.documentElement.classList.add('js');</script>
</head>
<body>
  <header class="container" style="display:flex;justify-content:space-between;align-items:center;padding-top:20px;padding-bottom:20px;">
    <a href={localePath(locale, '/')} class="mono" style="color:var(--text);font-weight:700;">~/kandakov</a>
    <nav style="display:flex;gap:18px;align-items:center;font-size:.95rem;">
      <a href={localePath(locale, '/#projects')}>{t(locale, 'nav.projects')}</a>
      <a href={localePath(locale, '/#prototypes')}>{t(locale, 'nav.prototypes')}</a>
      <a href={localePath(locale, '/#contact')}>{t(locale, 'nav.contact')}</a>
      <a href={localePath(otherLocale, path)} class="tag">{otherLocale.toUpperCase()}</a>
    </nav>
  </header>
  <slot />
</body>
</html>
```

- [ ] **Шаг 1.7: Проверка сборки**

```powershell
npx astro check; npm run build
```

Ожидание: `0 errors`, сборка в `dist/` успешна.

- [ ] **Шаг 1.8: Коммит**

```powershell
git add -A; git commit -m "feat: scaffold Astro site with dark theme, i18n dictionary, base layout"
```

---

### Задача 2: CI-деплой на GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Шаг 2.1: Workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate content
        run: node scripts/validate-content.mjs || true
      - uses: withastro/action@v3
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Примечание: `|| true` у валидации убирается в Задаче 3, когда скрипт появится (см. шаг 3.4). Деплой заработает после включения Pages (Задача 12); до этого workflow может падать на шаге deploy — это ожидаемо и не блокирует работу.

- [ ] **Шаг 2.2: Коммит**

```powershell
git add .github; git commit -m "ci: GitHub Pages deploy workflow"
```

---

### Задача 3: Модель контента + валидатор (сначала валидатор)

**Files:**
- Create: `scripts/validate-content.mjs`
- Create: `src/content.config.ts`
- Create: `src/content/prototypes/prototypes.json` (пустой массив-заглушка)

- [ ] **Шаг 3.1: Написать валидатор ДО контента**

`scripts/validate-content.mjs` — проверяет: (а) у каждого md-проекта в `en/` есть пара в `ru/` и наоборот; (б) `prototypes.json` — массив объектов с обязательными полями; (в) для каждого прототипа с `clip: true` существуют файлы `public/media/prototypes/<id>/clip.webm` и `poster.jpg`, и для всех — `icon.png`.

```js
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
```

- [ ] **Шаг 3.2: Запустить валидатор — он должен УПАСТЬ**

```powershell
node scripts/validate-content.mjs
```

Ожидание: `CONTENT INVALID` (контента ещё нет). Это подтверждает, что валидатор работает.

- [ ] **Шаг 3.3: Схемы коллекций `src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    role: z.string(),
    period: z.string(),
    genre: z.string(),
    platforms: z.array(z.string()),
    metrics: z.array(z.string()).default([]),
    stack: z.array(z.string()),
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    youtube: z.string().optional(),
    order: z.number(),
  }),
});

const prototypes = defineCollection({
  loader: file('./src/content/prototypes/prototypes.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    genre: z.object({ en: z.string(), ru: z.string() }),
    year: z.number(),
    clip: z.boolean().default(false),
  }),
});

export const collections = { projects, prototypes };
```

Создать `src/content/prototypes/prototypes.json` с содержимым `[]` (реальные данные появятся в Задаче 5).

- [ ] **Шаг 3.4: Включить валидатор в CI и в npm-скрипты**

В `.github/workflows/deploy.yml` заменить `run: node scripts/validate-content.mjs || true` на `run: node scripts/validate-content.mjs` — но только в Задаче 5, когда появится контент (иначе CI будет красным). Пока — добавить в `package.json`:

```json
"scripts": { "dev": "astro dev", "build": "astro build", "preview": "astro preview", "validate": "node scripts/validate-content.mjs" }
```

- [ ] **Шаг 3.5: Коммит**

```powershell
git add -A; git commit -m "feat: content collections schema + content validator (red until content lands)"
```

---

### Задача 4: Контент избранных проектов (EN + RU)

**Files:**
- Create: `src/content/projects/en/{days-after,dead-impact,forsaken-kingdom,mafia-stories,last-wish}.md`
- Create: `src/content/projects/ru/{те же имена}.md`

- [ ] **Шаг 4.1: Найти и проверить внешние ссылки**

Через WebSearch найти для каждого проекта ссылки на сторы и трейлеры на YouTube. Каждую ссылку проверить (`curl -sI <url>` → HTTP 200/301). Что искать:
- Days After (Reaction Games / MY.GAMES) — Google Play, App Store, трейлер YouTube.
- Dead Impact (Reaction Games) — Google Play / App Store.
- Forsaken Kingdom (Quantum Gear Studios) — страница Steam.
- Mafia Stories: Idle Tycoon (Taptap Studio) — Google Play.
- Last Wish (Black Games) — Steam, VK Play.

Ссылку добавлять только если реально нашлась и отвечает. Если нет — раздел `links` оставить пустым, сайт это переживает. ID видео YouTube вставить в поле `youtube` (только ID, не URL).

- [ ] **Шаг 4.2: Создать 10 md-файлов**

`src/content/projects/en/days-after.md` (эталон формата; факты из CV):

```markdown
---
title: "Days After"
tagline: "Mobile survival action-RPG with 10M+ installs, published with MY.GAMES"
role: "Unity Developer"
period: "2026 — present"
genre: "Survival RPG"
platforms: ["Android", "iOS"]
metrics: ["10M+ installs", "Live ops"]
stack: ["Unity", "C#", "Addressables", "Mobile UI"]
links: []
order: 1
---

Product development on a live title with millions of players: new features,
mobile UI, game content pipeline on Addressables, live-ops support.
```

`src/content/projects/en/dead-impact.md`:

```markdown
---
title: "Dead Impact"
tagline: "Co-op zombie action-RPG on ECS/DOTS — 500K+ installs, 800K-line codebase"
role: "Unity Developer"
period: "2023 — 2026"
genre: "Co-op Action-RPG"
platforms: ["Android", "iOS"]
metrics: ["500K+ installs", "800K lines of code", "Team of 8"]
stack: ["Unity", "ECS/DOTS", "Client-server", "Event Sourcing", "Jobs/Burst"]
links: []
order: 2
---

Gameplay systems on a large ECS/DOTS codebase: unit parameters, class
progression, stats, location ranks, adaptive difficulty, legendary weapons,
effect synchronization. Client-server architecture, Event Sourcing,
performance profiling, unit tests, data migrations.
```

`src/content/projects/en/forsaken-kingdom.md`:

```markdown
---
title: "Forsaken Kingdom"
tagline: "Dark fantasy roguelite auto-battler for PC — sole programmer"
role: "Senior Unity Developer (sole programmer)"
period: "2026 — present"
genre: "Roguelite Auto-battler / RPG"
platforms: ["PC (Steam)"]
metrics: ["Full technical ownership"]
stack: ["Unity", "C#", "Real-time combat", "Meta systems"]
links: []
order: 3
---

Full technical ownership of the entire codebase: all game systems designed
from scratch against the GDD — real-time combat, stats, effects, skills;
meta, squad and camp management, progression, builds.
```

`src/content/projects/en/mafia-stories.md`:

```markdown
---
title: "Mafia Stories: Idle Tycoon"
tagline: "Mobile idle tycoon — took over an unstable project, stabilized and shipped"
role: "Lead Unity Developer"
period: "2026"
genre: "Idle Tycoon (F2P)"
platforms: ["Android"]
metrics: ["Team of 3", "2 content releases"]
stack: ["Unity", "C#", "Refactoring", "Engineering culture"]
links: []
order: 4
---

Took over the project in an unstable state: staged refactor, stabilized core
systems, shipped two content releases in parallel. Led a team of programmers;
built engineering culture from scratch — code style, git workflow, reviews,
tests, release planning. Introduced agentic development (Claude Code, Codex)
with strict review.
```

`src/content/projects/en/last-wish.md`:

```markdown
---
title: "Last Wish"
tagline: "Interactive 3D visual novel for PC with an Udmurt narrative — tech lead"
role: "Lead Unity Developer / Tech Lead"
period: "2023"
genre: "3D Visual Novel"
platforms: ["PC (Steam)", "VK Play"]
metrics: ["Released on 2 stores", "Start Game accelerator finalist"]
stack: ["Unity", "C#", "QTE", "Lip-sync", "Branching dialogue"]
links: []
order: 5
---

Full technical ownership: architecture, core systems, release pipeline;
dynamic scenes, QTE, professional voice-over, lip-sync, branching dialogue.
Finalist of the VK "Start Game" accelerator (1M-impressions prize).
```

Русские версии (`src/content/projects/ru/*.md`) — те же frontmatter-поля, `title` тот же, `tagline`/`role`/`genre`/`metrics`/тексты переведены на русский (стек и платформы остаются как есть). Пример `ru/days-after.md`:

```markdown
---
title: "Days After"
tagline: "Мобильная survival action-RPG, 10M+ установок, издаётся с MY.GAMES"
role: "Unity Developer"
period: "2026 — н.в."
genre: "Survival RPG"
platforms: ["Android", "iOS"]
metrics: ["10M+ установок", "Live ops"]
stack: ["Unity", "C#", "Addressables", "Mobile UI"]
links: []
order: 1
---

Продуктовая разработка живого проекта с миллионами игроков: новые фичи,
мобильный UI, контентный пайплайн на Addressables, поддержка live-ops.
```

Остальные четыре ru-файла — аналогичный перевод соответствующих en-файлов.

- [ ] **Шаг 4.3: Проверка**

```powershell
npm run validate; npm run build
```

Ожидание: валидатор больше не ругается на проекты (остаётся ошибка про пустой prototypes.json — она уйдёт в Задаче 5); сборка зелёная (zod-схемы прошли).

- [ ] **Шаг 4.4: Коммит**

```powershell
git add src/content; git commit -m "content: 5 featured projects in EN and RU"
```

---

### Задача 5: Медиа-пайплайн (архив → webm + иконки + манифест)

**Files:**
- Create: `scripts/harvest-media.mjs`
- Create: `scripts/compress-videos.mjs`
- Create: `media-staging/` (в `.gitignore`)
- Create: `public/media/prototypes/<id>/{icon.png, clip.webm, poster.jpg}` (~30 папок)
- Modify: `src/content/prototypes/prototypes.json`

- [ ] **Шаг 5.1: Установить ffmpeg**

```powershell
winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
```

После установки перезапустить shell / обновить PATH; проверить `ffmpeg -version`.

- [ ] **Шаг 5.2: Скрипт сбора кандидатов `scripts/harvest-media.mjs`**

Сканирует архив (только чтение!), для каждой папки проекта находит кандидатов: иконки (png/jpg с "icon" в имени или лежащие в папках `Icons*`, ≤ 3 МБ) и видео (mp4/mov, приоритет папкам `Video`, размер 1–200 МБ). Копирует до 5 иконок и до 5 видео на проект в `media-staging/<slug>/`, пишет `media-staging/manifest.json` со списком скопированного.

```js
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
      videos.push({ f, size, inVideoDir: /video/i.test(f) });
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
```

Добавить `media-staging/` в `.gitignore`. Запустить: `node scripts/harvest-media.mjs`. Ожидание: ~33 папки в `media-staging/`, лог по каждому проекту.

- [ ] **Шаг 5.3: Курация**

Просмотреть `media-staging/` (Read по файлам-картинкам, для видео — вытащить кадр `ffmpeg -i in.mp4 -frames:v 1 preview.jpg`). Для каждого проекта выбрать: одну иконку → `chosen-icon.png`, одно видео с геймплеем (не рекламный креатив с оверлеями, если есть выбор) → `chosen-video.mp4` (просто переименовать копии в `media-staging/<slug>/`). Проекты совсем без медиа (BossBeestday, Jurassic Transform, Police Line Cleaner) — исключить из сетки. Спорные случаи собрать в один список и показать пользователю ОДНИМ сообщением.

- [ ] **Шаг 5.4: Скрипт сжатия `scripts/compress-videos.mjs`**

Для каждого `media-staging/<slug>/chosen-video.mp4`: первые 12 секунд, без звука, 480px по ширине, VP9 → `public/media/prototypes/<slug>/clip.webm` + постер `poster.jpg`; `chosen-icon.png` копируется в `icon.png`.

```js
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
```

Запустить, проверить суммарный вес: `public/media` должен быть < 200 МБ (при 30 клипах по 2–4 МБ — порядка 100 МБ). Если какой-то клип > 8 МБ — пересжать с `-crf 45`.

- [ ] **Шаг 5.5: Заполнить `prototypes.json`**

По manifest и папкам `public/media/prototypes/` составить записи (title — человекочитаемое имя проекта, genre — на двух языках по видео/названию, year — из CV-периода Black Games 2020–2023, оценить по номеру папки: 000–010 → 2020–2021, 011–022 → 2021–2022, 023–032 → 2022–2023):

```json
[
  {
    "id": "urbankings",
    "title": "Urban Kings",
    "genre": { "en": "Arcade / Graffiti", "ru": "Аркада / Граффити" },
    "year": 2021,
    "clip": true
  }
]
```

...и так для каждого проекта с медиа (~30 записей).

- [ ] **Шаг 5.6: Включить строгую валидацию в CI**

В `.github/workflows/deploy.yml`: `run: node scripts/validate-content.mjs` (убрать `|| true`).

- [ ] **Шаг 5.7: Проверка и коммит**

```powershell
npm run validate; npm run build
git add -A; git commit -m "content: prototype archive media (webm clips, icons) + manifest"
```

Ожидание: `content OK`. Внимание на размер коммита — если > 300 МБ, пересжать агрессивнее, НЕ включать Git LFS (Pages его не отдаёт бесплатно).

---

### Задача 6: Главная страница

**Files:**
- Create: `src/components/{Hero,Metrics,FeaturedCard,Skills,Contact}.astro`
- Create: `src/components/HomePage.astro`
- Modify: `src/pages/index.astro`
- Create: `src/pages/ru/index.astro`

- [ ] **Шаг 6.1: `src/components/Hero.astro`**

```astro
---
import { t, type Locale } from '../i18n/ui';
const { locale } = Astro.props as { locale: Locale };
---
<section style="position:relative;overflow:hidden;">
  <canvas id="hero-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
  <div class="container" style="position:relative;padding:96px 20px 72px;">
    <p class="mono" style="color:var(--accent);margin:0;">Aleksandr Kandakov</p>
    <h1>{t(locale, 'hero.title')}</h1>
    <p style="color:var(--muted);font-size:1.15rem;max-width:640px;">{t(locale, 'hero.sub')}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
      <a class="btn" href={locale === 'ru' ? '/cv/Kandakov_CV_ru.pdf' : '/cv/Kandakov_CV_en.pdf'} download>{t(locale, 'hero.cv')}</a>
      <a class="btn ghost" href="https://www.linkedin.com/in/sankaaa62/">LinkedIn</a>
      <a class="btn ghost" href="https://t.me/sankaaa62">Telegram</a>
    </div>
  </div>
</section>
<script src="../scripts/hero-canvas.js"></script>
```

- [ ] **Шаг 6.2: `src/components/Metrics.astro`**

```astro
---
import { t, type Locale } from '../i18n/ui';
const { locale } = Astro.props as { locale: Locale };
const items = [
  { value: 6, suffix: '+', label: t(locale, 'metrics.years') },
  { value: 10, suffix: 'M+', label: t(locale, 'metrics.installs') },
  { value: 800, suffix: 'K+', label: t(locale, 'metrics.loc') },
  { value: 8, suffix: '', prefix: '0→', label: t(locale, 'metrics.team') },
];
---
<div class="container" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;">
  {items.map((m) => (
    <div class="reveal" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;">
      <div class="mono" style="font-size:2rem;font-weight:800;color:var(--accent-2);">
        {m.prefix ?? ''}<span class="counter" data-target={m.value}>0</span>{m.suffix}
      </div>
      <div style="color:var(--muted);font-size:.9rem;">{m.label}</div>
    </div>
  ))}
</div>
```

- [ ] **Шаг 6.3: `src/components/FeaturedCard.astro`**

```astro
---
import { t, localePath, type Locale } from '../i18n/ui';
const { locale, project } = Astro.props as { locale: Locale; project: any };
const slug = project.id.split('/')[1];
const d = project.data;
---
<a class="reveal" href={localePath(locale, `/projects/${slug}/`)}
   style="display:grid;grid-template-columns:1fr;gap:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;color:var(--text);text-decoration:none;">
  {d.youtube
    ? <img src={`https://i.ytimg.com/vi/${d.youtube}/hqdefault.jpg`} alt={d.title} loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;" />
    : <div style="aspect-ratio:16/9;background:var(--surface-2);display:grid;place-items:center;" class="mono">{d.title}</div>}
  <div style="padding:18px 20px;">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;">
      <h3 style="margin:0;">{d.title}</h3>
      <span class="tag">{d.genre}</span>
    </div>
    <p style="color:var(--muted);margin:.5em 0;">{d.tagline}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      {d.metrics.map((m: string) => <span class="mono" style="color:var(--ok);font-size:.85rem;">{m}</span>)}
    </div>
  </div>
</a>
```

- [ ] **Шаг 6.4: `src/components/Skills.astro` и `src/components/Contact.astro`**

```astro
---
import { t, type Locale } from '../i18n/ui';
const { locale } = Astro.props as { locale: Locale };
const skills = ['Unity', 'C#', 'Multiplayer', 'ECS', 'DOTS', 'Gameplay Programming', 'Client-Server',
  'Jobs', 'Burst', 'Performance Optimization', 'Mobile Optimization', 'Addressables', 'URP',
  'Clean Architecture', 'SOLID', 'DI', 'Unit Testing', 'Code Review', 'Git', 'CI/CD',
  'Team Leadership', 'Mentoring', 'AI-assisted development', 'Claude Code', 'Codex'];
---
<section id="skills" class="section container">
  <h2>{t(locale, 'skills.title')}</h2>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">{skills.map((s) => <span class="tag">{s}</span>)}</div>
</section>
```

```astro
---
import { t, type Locale } from '../i18n/ui';
const { locale } = Astro.props as { locale: Locale };
---
<section id="contact" class="section container" style="text-align:center;">
  <h2>{t(locale, 'contact.title')}</h2>
  <p class="mono" style="font-size:1.1rem;">
    <a href="mailto:kandakov.sasha@gmail.com">kandakov.sasha@gmail.com</a> ·
    <a href="https://t.me/sankaaa62">@sankaaa62</a> ·
    <a href="https://www.linkedin.com/in/sankaaa62/">linkedin.com/in/sankaaa62</a>
  </p>
</section>
```

- [ ] **Шаг 6.5: `src/components/HomePage.astro` — собирает всё**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Hero from './Hero.astro';
import Metrics from './Metrics.astro';
import FeaturedCard from './FeaturedCard.astro';
import PrototypeGrid from './PrototypeGrid.astro';
import Skills from './Skills.astro';
import Contact from './Contact.astro';
import MiniGame from './MiniGame.astro';
import { t, type Locale } from '../i18n/ui';

const { locale } = Astro.props as { locale: Locale };
const projects = (await getCollection('projects', (p) => p.id.startsWith(`${locale}/`)))
  .sort((a, b) => a.data.order - b.data.order);
const desc = locale === 'ru'
  ? 'Портфолио Senior Unity-разработчика: мобильные и PC игры, мультиплеер, ECS/DOTS.'
  : 'Senior Unity Developer portfolio: mobile & PC games, multiplayer, ECS/DOTS.';
---
<Base locale={locale} title="Aleksandr Kandakov — Senior Unity Developer" description={desc} path="/">
  <Hero locale={locale} />
  <Metrics locale={locale} />
  <section id="projects" class="section container">
    <h2>{t(locale, 'featured.title')}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
      {projects.map((p) => <FeaturedCard locale={locale} project={p} />)}
    </div>
  </section>
  <PrototypeGrid locale={locale} />
  <Skills locale={locale} />
  <Contact locale={locale} />
  <MiniGame locale={locale} />
  <script src="../scripts/reveal.js"></script>
  <script src="../scripts/counters.js"></script>
</Base>
```

- [ ] **Шаг 6.6: Страницы**

`src/pages/index.astro`:

```astro
---
import HomePage from '../components/HomePage.astro';
---
<HomePage locale="en" />
```

`src/pages/ru/index.astro`:

```astro
---
import HomePage from '../../components/HomePage.astro';
---
<HomePage locale="ru" />
```

- [ ] **Шаг 6.7: Заглушки клиентских скриптов** (реализация в Задаче 9; чтобы сборка не падала — создать `src/scripts/{hero-canvas,reveal,counters}.js` с пустым содержимым `export {}`) и заглушка `MiniGame.astro` (пустой `<div />`, реализация в Задаче 10). `PrototypeGrid.astro` — Задача 8; на этом шаге создать минимальный вариант, который рендерит пустую секцию, чтобы страница собиралась.

- [ ] **Шаг 6.8: Проверка + коммит**

```powershell
npm run build; npx astro preview
```

Открыть `http://localhost:4321/` и `/ru/` — обе локали рендерятся, 5 карточек проектов на каждой.

```powershell
git add -A; git commit -m "feat: homepage with hero, metrics, featured projects, skills, contact (EN/RU)"
```

---

### Задача 7: Страницы проектов

**Files:**
- Create: `src/components/ProjectPage.astro`
- Create: `src/pages/projects/[slug].astro`
- Create: `src/pages/ru/projects/[slug].astro`

- [ ] **Шаг 7.1: `src/components/ProjectPage.astro`**

```astro
---
import { render } from 'astro:content';
import Base from '../layouts/Base.astro';
import { t, localePath, type Locale } from '../i18n/ui';

const { locale, project } = Astro.props as { locale: Locale; project: any };
const d = project.data;
const { Content } = await render(project);
const slug = project.id.split('/')[1];
---
<Base locale={locale} title={`${d.title} — Aleksandr Kandakov`} description={d.tagline} path={`/projects/${slug}/`}>
  <article class="container section">
    <a href={localePath(locale, '/#projects')} class="mono">{t(locale, 'project.back')}</a>
    <h1 style="margin-top:.5em;">{d.title}</h1>
    <p style="color:var(--muted);font-size:1.1rem;">{d.tagline}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 24px;">
      <span class="tag">{d.genre}</span>
      {d.platforms.map((p: string) => <span class="tag">{p}</span>)}
      <span class="tag">{d.period}</span>
    </div>
    {d.youtube && (
      <div style="aspect-ratio:16/9;margin-bottom:24px;">
        <iframe src={`https://www.youtube-nocookie.com/embed/${d.youtube}`} title={d.title}
          style="width:100%;height:100%;border:0;border-radius:var(--radius);"
          loading="lazy" allowfullscreen></iframe>
      </div>
    )}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:24px;">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;">
        <div class="mono" style="color:var(--muted);font-size:.8rem;">{t(locale, 'project.role')}</div>
        <div style="font-weight:700;">{d.role}</div>
        {d.metrics.map((m: string) => <div class="mono" style="color:var(--ok);font-size:.9rem;">{m}</div>)}
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;">
        <div class="mono" style="color:var(--muted);font-size:.8rem;">{t(locale, 'project.stack')}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">{d.stack.map((s: string) => <span class="tag">{s}</span>)}</div>
      </div>
    </div>
    <Content />
    {d.links.length > 0 && (
      <p style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;">
        {d.links.map((l: any) => <a class="btn ghost" href={l.url}>{l.label}</a>)}
      </p>
    )}
  </article>
</Base>
```

- [ ] **Шаг 7.2: Роуты**

`src/pages/projects/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import ProjectPage from '../../components/ProjectPage.astro';

export async function getStaticPaths() {
  const projects = await getCollection('projects', (p) => p.id.startsWith('en/'));
  return projects.map((project) => ({ params: { slug: project.id.split('/')[1] }, props: { project } }));
}
const { project } = Astro.props;
---
<ProjectPage locale="en" project={project} />
```

`src/pages/ru/projects/[slug].astro` — то же с `'ru/'` и `locale="ru"` (и путём импорта `../../../components/ProjectPage.astro`).

- [ ] **Шаг 7.3: Проверка + коммит**

```powershell
npm run build
```

Ожидание: в `dist/projects/` и `dist/ru/projects/` по 5 страниц.

```powershell
git add -A; git commit -m "feat: project detail pages (EN/RU)"
```

---

### Задача 8: Сетка прототипов (hover-видео + tilt)

**Files:**
- Create/Replace: `src/components/PrototypeGrid.astro`

- [ ] **Шаг 8.1: Компонент**

```astro
---
import { getCollection } from 'astro:content';
import { t, type Locale } from '../i18n/ui';
const { locale } = Astro.props as { locale: Locale };
const protos = (await getCollection('prototypes')).sort((a, b) => b.data.year - a.data.year);
---
<section id="prototypes" class="section container">
  <h2>{t(locale, 'prototypes.title')}</h2>
  <p style="color:var(--muted);">{t(locale, 'prototypes.sub')}</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">
    {protos.map((p) => (
      <div class="proto-card reveal" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
        <div style="position:relative;aspect-ratio:1;">
          <img src={`/media/prototypes/${p.data.id}/icon.png`} alt={p.data.title} loading="lazy"
               style="width:100%;height:100%;object-fit:cover;" />
          {p.data.clip && (
            <video muted loop playsinline preload="none"
              poster={`/media/prototypes/${p.data.id}/poster.jpg`}
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .25s;">
              <source src={`/media/prototypes/${p.data.id}/clip.webm`} type="video/webm" />
            </video>
          )}
        </div>
        <div style="padding:10px 12px;">
          <div style="font-weight:700;font-size:.92rem;">{p.data.title}</div>
          <div class="mono" style="color:var(--muted);font-size:.75rem;">{p.data.genre[locale]} · {p.data.year}</div>
        </div>
      </div>
    ))}
  </div>
</section>
<script>
  document.querySelectorAll('.proto-card').forEach((card) => {
    const video = card.querySelector('video');
    card.addEventListener('pointerenter', () => {
      if (video) { video.style.opacity = '1'; video.play().catch(() => {}); }
    });
    card.addEventListener('pointerleave', () => {
      if (video) { video.style.opacity = '0'; video.pause(); }
    });
    card.addEventListener('pointermove', (e) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.03)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
</script>
```

- [ ] **Шаг 8.2: Проверка + коммит**

`npm run build`, в preview: наведение мыши запускает клип и наклоняет карточку; на тач-устройствах карточка остаётся статичной иконкой (это ок).

```powershell
git add -A; git commit -m "feat: prototype grid with hover clips and tilt"
```

---

### Задача 9: Интерактив (canvas-хиро, счётчики, reveal)

**Files:**
- Replace: `src/scripts/hero-canvas.js`, `src/scripts/counters.js`, `src/scripts/reveal.js`

- [ ] **Шаг 9.1: `src/scripts/hero-canvas.js` — частицы, тянущиеся к мыши**

```js
const canvas = document.getElementById('hero-canvas');
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  const mouse = { x: -1e4, y: -1e4 };
  const resize = () => {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    particles = Array.from({ length: Math.min(90, (w * h) / 14000) }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    }));
  };
  resize();
  addEventListener('resize', resize);
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = -1e4; mouse.y = -1e4; });
  (function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < 25600) { p.vx += dx / 8000; p.vy += dy / 8000; }
      p.vx *= 0.99; p.vy *= 0.99;
      p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h;
      ctx.fillStyle = 'rgba(255,92,26,.6)';
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      if (d2 < 8100) {
        ctx.strokeStyle = `rgba(154,151,163,${(1 - d2 / 8100) * 0.25})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    requestAnimationFrame(tick);
  })();
}
```

- [ ] **Шаг 9.2: `src/scripts/counters.js`**

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    const target = +e.target.dataset.target;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 1200);
      e.target.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
document.querySelectorAll('.counter').forEach((el) => io.observe(el));
```

- [ ] **Шаг 9.3: `src/scripts/reveal.js`**

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
```

- [ ] **Шаг 9.4: Проверка + коммит**

В preview: частицы в хиро реагируют на мышь, метрики отсчитываются при скролле, секции всплывают. При `prefers-reduced-motion` всё статично.

```powershell
git add -A; git commit -m "feat: hero particles, animated counters, scroll reveal"
```

---

### Задача 10: Мини-игра-пасхалка

**Files:**
- Replace: `src/components/MiniGame.astro`

- [ ] **Шаг 10.1: Компонент — маленький canvas-доджер в футере**

Кнопка `press start` в футере разворачивает canvas 320×420: игрок (оранжевый квадрат) уклоняется от падающих блоков, управление стрелками/свайпом, счёт в моно-шрифте. Чистый JS, ~90 строк, без зависимостей.

```astro
---
import { t, type Locale } from '../i18n/ui';
const { locale } = Astro.props as { locale: Locale };
---
<footer class="section container" style="text-align:center;border-top:1px solid var(--border);">
  <button id="mg-start" class="btn ghost mono">▶ {t(locale, 'footer.game')}</button>
  <div id="mg-wrap" hidden style="margin-top:16px;">
    <canvas id="mg" width="320" height="420" style="margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);touch-action:none;"></canvas>
    <div class="mono" style="color:var(--muted);font-size:.8rem;margin-top:8px;">← → / swipe</div>
  </div>
  <p class="mono" style="color:var(--muted);font-size:.8rem;margin-top:24px;">© 2026 Aleksandr Kandakov · built with Astro</p>
</footer>
<script>
  const btn = document.getElementById('mg-start');
  const wrap = document.getElementById('mg-wrap');
  btn.addEventListener('click', () => {
    wrap.hidden = !wrap.hidden;
    if (!wrap.hidden) startGame();
  });
  let running = false;
  function startGame() {
    if (running) return;
    running = true;
    const c = document.getElementById('mg'), ctx = c.getContext('2d');
    const player = { x: 144, w: 32, h: 32 };
    let blocks = [], score = 0, speed = 2, alive = true, dir = 0;
    addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') dir = -1;
      if (e.key === 'ArrowRight') dir = 1;
    });
    addEventListener('keyup', () => (dir = 0));
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      player.x = Math.max(0, Math.min(c.width - player.w, e.clientX - r.left - player.w / 2));
    });
    (function tick() {
      if (!alive) {
        ctx.fillStyle = '#e8e6e1'; ctx.font = '20px monospace'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER · ' + score, c.width / 2, 200);
        ctx.font = '13px monospace'; ctx.fillText('click to restart', c.width / 2, 230);
        c.addEventListener('click', () => { blocks = []; score = 0; speed = 2; alive = true; }, { once: true });
        requestAnimationFrame(tick); return;
      }
      player.x = Math.max(0, Math.min(c.width - player.w, player.x + dir * 5));
      if (Math.random() < 0.04) blocks.push({ x: Math.random() * (c.width - 24), y: -24, s: 24 });
      speed += 0.0008;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#ff5c1a';
      ctx.fillRect(player.x, c.height - 48, player.w, player.h);
      ctx.fillStyle = '#9a97a3';
      for (const b of blocks) {
        b.y += speed;
        ctx.fillRect(b.x, b.y, b.s, b.s);
        if (b.y + b.s > c.height - 48 && b.y < c.height - 16 && b.x + b.s > player.x && b.x < player.x + player.w) alive = false;
      }
      blocks = blocks.filter((b) => b.y < c.height || (score++, false));
      ctx.fillStyle = '#ffb01a'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
      ctx.fillText('score: ' + score, 10, 20);
      requestAnimationFrame(tick);
    })();
  }
</script>
```

- [ ] **Шаг 10.2: Проверка + коммит**

В preview: кнопка разворачивает игру, стрелки и мышь двигают игрока, столкновение — game over, рестарт по клику.

```powershell
git add -A; git commit -m "feat: press-start mini-game easter egg in footer"
```

---

### Задача 11: CV, favicon, OG-картинка, README

**Files:**
- Create: `public/cv/Kandakov_CV_en.pdf`, `public/cv/Kandakov_CV_ru.pdf`
- Create: `public/favicon.svg`, `public/media/og.jpg`
- Replace: `README.md`

- [ ] **Шаг 11.1: Скопировать CV**

```powershell
New-Item -ItemType Directory -Force public/cv
Copy-Item "G:\Саша\Kandakov_CV(en).pdf" public/cv/Kandakov_CV_en.pdf
Copy-Item "G:\Саша\Kandakov_CV(ru).pdf" public/cv/Kandakov_CV_ru.pdf
```

- [ ] **Шаг 11.2: favicon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0e0f13"/>
  <text x="32" y="42" font-family="monospace" font-size="30" font-weight="bold" fill="#ff5c1a" text-anchor="middle">AK</text>
</svg>
```

- [ ] **Шаг 11.3: OG-картинка** — сгенерировать из скриншота готового хиро (в preview открыть страницу, снять скриншот 1200×630, сохранить `public/media/og.jpg`). Временно допустимо взять постер лучшего прототипа.

- [ ] **Шаг 11.4: README** — краткое описание: что это, стек, `npm run dev/build/validate`, как добавляются проекты (формат md), как обновляются медиа (`harvest-media` → курация → `compress-videos`), ссылка на спеку и план.

- [ ] **Шаг 11.5: Проверка + коммит**

```powershell
npm run build; git add -A; git commit -m "chore: CV downloads, favicon, OG image, README"
```

---

### Задача 12: Запуск

- [ ] **Шаг 12.1: Финальная локальная проверка**

`npm run validate && npm run build && npx astro preview`. Пройти обе локали, все 10 страниц проектов, сетку прототипов, скачивание CV, мобильную ширину (DevTools 375px). Lighthouse (Chrome DevTools) — Performance ≥ 85 на главной (главный риск — суммарный вес клипов; они `preload="none"`, так что должно быть ок).

- [ ] **Шаг 12.2: Переименование репозитория (нужен пользователь!)**

Спросить пользователя: переименовать `MyShowcases` → `sankaaa62.github.io` в настройках GitHub (Settings → General → Repository name). После переименования локально: `git remote set-url origin https://github.com/sankaaa62/sankaaa62.github.io.git`.

- [ ] **Шаг 12.3: Включить Pages**

На GitHub: Settings → Pages → Source: **GitHub Actions**. Затем `git push`. Дождаться зелёного workflow.

- [ ] **Шаг 12.4: Проверить прод**

Открыть `https://sankaaa62.github.io/` и `/ru/` — всё работает, клипы играют, CV скачивается. Отдать ссылку пользователю.

---

## Отложено (после запуска, отдельными задачами)

- Кастомный домен: покупка `kandakov.dev`, CNAME-файл, DNS, enforce HTTPS.
- Unity WebGL-билд одного из прототипов как играбельное демо.
- Скриншоты/галереи на страницах избранных проектов (медиа искать в сети и в архиве).
