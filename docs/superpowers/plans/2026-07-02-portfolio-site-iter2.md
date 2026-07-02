# Портфолио-сайт, итерация 2 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать фидбек пользователя после запуска: живой фон и иконки контактов, богатые тексты из LinkedIn, ссылки и галереи на страницах проектов, лайтбокс прототипов со скриншотами из архива, секция «Обо мне» с фото.

**Architecture:** Без структурных изменений — та же Astro 7 статика. Новое: CSS-фон (aurora-пятна + noise), компонент `SocialIcons.astro`, компонент `Gallery.astro` (сетка + лайтбокс, переиспользуется на страницах проектов), модалка прототипов в `PrototypeGrid.astro`, скрипт `harvest-screenshots.mjs` (архив → shots), скачанные promo-медиа в `public/media/projects/<slug>/`.

**Tech Stack:** тот же. ffmpeg для сжатия. Скачивание promo-медиа с официальных сайтов/сторов проектов пользователя (санкционировано пользователем явно).

**Спека:** `docs/superpowers/specs/2026-07-02-portfolio-site-design.md`, раздел «Итерация 2».
**Источник текстов:** LinkedIn-экспорт, локальная копия `C:\Users\HomePC\AppData\Local\Temp\claude\D--Dev-sankaaa62-MyShowcases\ee102b48-1413-4226-a3d8-10620e09ac59\scratchpad\linkedin_profile.txt` (задача B копирует его в scratchpad заново при необходимости).

**Правила прежние:** архив BlackGames только читаем; валидатор (`npm run validate`) и `npm run build` зелёные в конце каждой задачи; коммит на задачу; работаем в ветке `feature/iter2` от main.

---

### Задача A: Живой фон, свечение, иконки контактов

**Files:** Modify: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Hero.astro`, `src/components/Contact.astro`. Create: `src/components/SocialIcons.astro`.

- [ ] **A.1** В `global.css` добавить (после существующих правил):

```css
/* --- iter2: живой фон --- */
:root { --violet: #7c5cff; --teal: #2dd4bf; }
body::before {
  content: ""; position: fixed; inset: 0; z-index: -2; pointer-events: none;
  background:
    radial-gradient(600px 400px at 15% 10%, rgba(255,92,26,.14), transparent 70%),
    radial-gradient(700px 500px at 85% 30%, rgba(124,92,255,.12), transparent 70%),
    radial-gradient(600px 500px at 50% 95%, rgba(45,212,191,.08), transparent 70%);
  animation: aurora 14s ease-in-out infinite alternate;
}
body::after {
  content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .35;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
}
@keyframes aurora { from { opacity: .75; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { body::before { animation: none; } }
h1 { text-shadow: 0 0 24px rgba(255,92,26,.25); }
.btn { box-shadow: 0 0 18px rgba(255,92,26,.25); }
.icon-link {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 12px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
  transition: transform .15s, border-color .15s, box-shadow .15s;
}
.icon-link:hover { transform: translateY(-2px); border-color: var(--accent); box-shadow: 0 0 14px rgba(255,92,26,.3); text-decoration: none; }
.icon-link svg { width: 20px; height: 20px; fill: currentColor; }
```

Важно: у `body` сейчас `overflow-x: hidden` — `position: fixed` у псевдоэлементов от этого не страдает. Тёмный `--bg` остаётся базовым цветом.

- [ ] **A.2** Создать `src/components/SocialIcons.astro` (иконки — inline SVG paths из simple-icons: telegram, gmail/почта — использовать generic mail glyph, linkedin; БЕЗ GitHub — решение пользователя):

```astro
---
const links = [
  { href: 'https://t.me/sankaaa62', label: 'Telegram',
    path: 'M23.91 3.79L20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56-.72 0-.6-.27-.84-.95L6.3 13.7l-5.45-1.7c-1.18-.35-1.19-1.16.26-1.75l21.26-8.2c.97-.43 1.9.24 1.53 1.73z' },
  { href: 'mailto:kandakov.sasha@gmail.com', label: 'Email',
    path: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z' },
  { href: 'https://www.linkedin.com/in/sankaaa62/', label: 'LinkedIn',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z' },
];
---
<div style="display:flex;gap:10px;flex-wrap:wrap;">
  {links.map((l) => (
    <a class="icon-link" href={l.href} aria-label={l.label} title={l.label}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={l.path} /></svg>
    </a>
  ))}
</div>
```

- [ ] **A.3** `Hero.astro`: заменить кнопки `LinkedIn`/`Telegram` (ghost) на `<SocialIcons />` рядом с кнопкой CV (CV остаётся кнопкой). `Contact.astro`: под строкой контактов добавить `<SocialIcons />` по центру (`style="justify-content:center;"` — обернуть или передать класс/стиль через wrapper-div).

- [ ] **A.4** Проверка: `astro check` 0/0/0, build, визуально в preview (пятна фона видны, иконки кликабельны, hover работает, мобильная ширина без overflow). Коммит `feat: aurora background, glow accents, contact icons`.

---

### Задача B: Тексты из LinkedIn + ссылки Website

**Files:** Modify: все 10 файлов `src/content/projects/{en,ru}/*.md`.

- [ ] **B.1** Источник — LinkedIn-экспорт (см. шапку плана; текст в скретчпаде). Для каждого проекта: переписать body с буллетами (`- `) по формулировкам экспорта; RU — близко к оригиналу, EN — точный перевод в том же тоне. Обновить tagline при выигрыше (например, Dead Impact: «от tech launch до глобального самиздат-релиза»). Добавить в metrics Mafia Stories: "~2x faster feature delivery" / «Доставка фич ~2 раза быстрее». Типографика для списков уже есть (article ul/li).
- [ ] **B.2** Добавить links «Website»: days-after.md → https://days-after.com; dead-impact.md → https://deadimpact.com; last-wish.md → https://lastwish.fun (проверить 200 перед добавлением; label «Website» в обеих локалях). Порядок: Website первым, затем сторы.
- [ ] **B.3** `npm run validate`, build, прочитать все 10 отрендеренных страниц (dist) глазами. Коммит `content: richer project copy from LinkedIn, official site links`.

---

### Задача C: Promo-медиа проектов + галерея на страницах

**Files:** Create: `public/media/projects/<slug>/shot-N.webp` (3–6 на проект), `src/components/Gallery.astro`. Modify: `src/components/ProjectPage.astro`, `scripts/validate-content.mjs` (опционально: проверка папок projects не обязательна — медиа опциональное).

- [ ] **C.1** Скачивание (санкционировано пользователем): для каждого проекта собрать 3–6 промо-скриншотов:
  - Days After: days-after.com (там есть скрины/арты) и/или Google Play листинг.
  - Dead Impact: deadimpact.com + Google Play.
  - Forsaken Kingdom: Steam-страница app/4418240 (скрины из `shared.akamai.steamstatic.com`).
  - Last Wish: lastwish.fun + Steam app/2484100.
  - Mafia Stories: Google Play листинг.
  Скачивать во временный каталог scratchpad, затем ffmpeg → webp шириной 960px (`-vf "scale=960:-2" -quality 82`), класть в `public/media/projects/<slug>/shot-1.webp` … Целевой размер ≤ 150 КБ/шт.
- [ ] **C.2** `src/components/Gallery.astro` — принимает `images: string[]` и `alt: string`; сетка `repeat(auto-fill,minmax(220px,1fr))`, каждый элемент — `<button>` с `<img loading="lazy">`; лайтбокс: `<dialog>` с крупным `<img>`, кнопками ‹ › и ✕, закрытие по Esc (нативно у dialog) и клику по подложке. Клиентский скрипт внутри компонента. Полный код пишет исполнитель, требования: без зависимостей, работает с клавиатуры, focus сохраняется, крупное изображение `max-height: 85vh`.
- [ ] **C.3** В `ProjectPage.astro` после `<Content />`: если для slug существуют shot-файлы — рендерить `<Gallery>`. Список файлов получать в фронтматтере через `import.meta.glob('/public/media/projects/**')` ИЛИ проще: node `fs.readdirSync` в компоненте (SSG — можно) по `public/media/projects/${slug}`. Пустая папка/нет папки → секции нет.
- [ ] **C.4** Проверка: build, страницы проектов показывают галерею, лайтбокс работает в preview (открытие/стрелки/Esc/подложка), мобильная ширина ок. Коммит `feat: project promo galleries with lightbox`.

---

### Задача D: Скриншоты прототипов из архива

**Files:** Create: `scripts/harvest-screenshots.mjs`, `public/media/prototypes/<id>/shots/N.webp` (до 6 на прототип). Modify: `src/content/prototypes/prototypes.json` (поле `shots: number`), `src/content.config.ts` (schema + `shots: z.number().default(0)`), `scripts/validate-content.mjs` (если `shots > 0` — файлы `shots/1..N.webp` существуют).

- [ ] **D.1** `harvest-screenshots.mjs`: для каждого id из prototypes.json найти в архиве соответствующую папку (маппинг slug→папка как в harvest-media), собрать кандидатов-скриншотов: png/jpg 200КБ–8МБ вне папок Icons, приоритет папкам `Screenshots|Store Materials|Screencasts|Design`, отсортировать по размеру убыв., взять до 10 кандидатов в `media-staging/<id>/shots-candidates/`. Ручная курация: выбрать до 6 РАЗНЫХ кадров геймплея (не иконки/баннеры с текстом), сжать ffmpeg → webp 640px (`scale=640:-2 -quality 80`) в `public/media/prototypes/<id>/shots/1.webp…`. Прототипам без скриншотов — `shots: 0` (модалка покажет только клип).
- [ ] **D.2** Обновить prototypes.json (поле shots), схему, валидатор. `npm run validate` → content OK.
- [ ] **D.3** Проверить суммарный вес добавленного (< 25 МБ). Коммит `content: prototype screenshots for lightbox`.

---

### Задача E: Лайтбокс прототипов

**Files:** Modify: `src/components/PrototypeGrid.astro`.

- [ ] **E.1** Карточка становится кликабельной (cursor:pointer, role="button", tabindex, Enter/Space). Клик открывает `<dialog id="proto-modal">` (один на страницу): внутри — название, жанр · год, крупный `<video controls autoplay muted loop>` с clip.webm (если clip), сетка скриншотов `shots/1..N.webp` (если есть), кнопка ✕. Данные для модалки — из data-атрибутов карточки (`data-id`, `data-title`, `data-genre`, `data-year`, `data-clip`, `data-shots`). Закрытие: Esc (нативно), ✕, клик по подложке (`dialog.addEventListener('click', e => e.target === dialog && dialog.close())`); при закрытии — `video.pause()` и очистка src (остановить загрузку).
- [ ] **E.2** Touch-девайсы: существующий hover-гейт НЕ трогаем (hover-эффекты остаются desktop-only), но КЛИК/тап работает на всех устройствах — модалка и есть основной сценарий для тача.
- [ ] **E.3** Проверка в preview: открытие/закрытие, видео играет в модалке и останавливается при закрытии, скриншоты листаются скроллом, мобильная ширина, без console errors. Коммит `feat: prototype lightbox with clips and screenshots`.

---

### Задача F: Секция «Обо мне»

**Files:** Create: `src/components/About.astro`, `public/media/me.webp`. Modify: `src/components/HomePage.astro` (About между Metrics и Projects), `src/i18n/ui.ts` (ключи `about.title` и nav при необходимости).

- [ ] **F.1** Фото: взять файл, путь к которому дал пользователь (СТОП и NEEDS_CONTEXT, если файла ещё нет), сжать в webp 640px квадрат → `public/media/me.webp` (≤ 80 КБ).
- [ ] **F.2** `About.astro`: две колонки (фото слева 220–280px круглое/скруглённое, текст справа; на мобильном — столбик), текст из «Общие сведения» LinkedIn: RU почти дословно (без ссылок-хвостов вида «lastwish.fun»), EN — перевод. 2–3 абзаца, без стены текста. Ключ `about.title`: 'About' / 'Обо мне'. В nav добавить пункт (ключ уже есть создать `nav.about`).
- [ ] **F.3** Проверка + коммит `feat: about section with photo`.

---

### Задача G: Финал итерации 2

- [ ] **G.1** Финальное ревью диффа main..feature/iter2 (отдельный ревьюер): спека-итерация2 покрыта, обе локали, мобильный, console чист, вес страницы приемлем.
- [ ] **G.2** Merge в main, push, дождаться зелёного деплоя, проверить прод (главная, страница проекта с галереей, модалка прототипа, About, иконки).
