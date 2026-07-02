# Портфолио-сайт, итерация 3 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать третий раунд фидбека: заметная анимация фона, честные метрики, монограмма в шапке, длинные клипы и новые видео прототипов, Car Junk Resurrection как витрина, обложки и трейлеры проектов, переделанная секция «Обо мне».

**Architecture:** без структурных изменений. Схема prototypes расширяется (link/badge/pin, clipFull), схема projects (company, trailer). Медиа-скрипты пересобирают клипы двух длительностей.

**Спека:** `docs/superpowers/specs/2026-07-02-portfolio-site-design.md`, раздел «Итерация 3».
**Ветка:** feature/iter3 от main. Правила прежние (валидатор+сборка зелёные на задачу, архив read-only).

---

### Задача H: Фон, метрики, шапка, названия секций

**Files:** Modify: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Metrics.astro`, `src/i18n/ui.ts`.

- [ ] H.1 Фон: заменить aurora-анимацию на заметную — два независимых слоя пятен, у каждого свой keyframes с `transform: translate/scale` (например, дрейф ±6-8% и scale 1↔1.15 за 18-26 с, разные фазы; слои — отдельные фиксированные div-псевдоэлементы или background-position анимация с большим размером). Шум: поднять непрозрачность до отчётливой текстуры (слой opacity ~0.5, SVG rect opacity 0.05-0.06), проверить глазами на скриншоте preview. prefers-reduced-motion отключает движение.
- [ ] H.2 Метрики (вариант «масштаб», согласован): `6+ лет в геймдеве` / `10M+ установок у крупнейшего проекта` (EN: installs on the biggest title) / `200+ прототипов выпущено отделом` (EN: prototypes shipped by my team) / `0→8 вырастил команду`. Счётчики: 6 / 10 / 200 / 8.
- [ ] H.3 Шапка: «~/kandakov» → монограмма AK (инлайн-SVG как favicon, 32×32, скругление, оранжевая AK) + рядом текст «Kandakov» (моно, скрыть на <420px).
- [ ] H.4 ui.ts: 'featured.title' → 'Projects'/«Проекты»; 'prototypes.sub' → EN "Hyper-casual prototypes I built hands-on at Black Games — the team shipped 200+ overall:" / RU «Прототипы, которые я собирал лично в Black Games — всего отдел выпустил 200+:».
- [ ] H.5 Проверка (визуально в preview: анимация видна на глаз! скриншот или покадровое сравнение computed transform), сборка, коммит `feat: visible bg animation, honest metrics, AK monogram, section titles`.

### Задача I: Прототипы — клипы 2 длительностей, замены видео, Car Junk

**Files:** Modify: `scripts/compress-videos.mjs`, `scripts/validate-content.mjs`, `src/content/prototypes/prototypes.json`, `src/content.config.ts`, `src/components/PrototypeGrid.astro`. Media: `public/media/prototypes/**`.

- [ ] I.1 compress-videos.mjs: карточный клип `-t 20` (480px, crf 40) + длинный `clip-full.webm` `-t 60` (640px, crf 40, без звука) из того же источника. Прогнать по ВСЕМ прототипам с chosen-video (клипы карточек перегенерируются длиннее).
- [ ] I.2 Замена исходников у 10 слагов (evoride, factoryuniverse, idalpetsalon, tiedyeworkshop, wordtour, agentstretch, octopusadventure, toothpickrun, growit, urbankings): пересмотреть кандидатов в media-staging/<id>/videos и в архиве (включая большие скринкасты >200МБ, как у beapresident), выбрать ДРУГОЕ видео с максимально показательным геймплеем, chosen-video заменить, пересжать.
- [ ] I.3 kickmaster: удалить из prototypes.json и `git rm -r public/media/prototypes/kickmaster`.
- [ ] I.4 junkyard-recycling: title «Car Junk Resurrection»; скачать 4-6 скриншотов с Google Play (id=com.zakgodfrey.carjunkresurrection, проверить 200 и что это та игра — developer Zak Godfrey/BlackGames?) взамен архивных shots; поля: `link: "https://play.google.com/store/apps/details?id=com.zakgodfrey.carjunkresurrection"`, `badge: {en: "1M+ installs", ru: "1M+ установок"}`, `pin: true`.
- [ ] I.5 Схема: `link: z.string().url().optional()`, `badge: z.object({en,ru}).optional()`, `pin: z.boolean().default(false)`, `clipFull: z.boolean().default(false)` (true где есть clip-full.webm; проставить). Валидатор: clip-full существует при clipFull, файлы shots как раньше.
- [ ] I.6 PrototypeGrid: сортировка `pin desc, year desc`; бейдж на карточке (мини-тег поверх иконки, accent) при badge; в модалке — badge у заголовка, кнопка-ссылка на стор при link, видео из clip-full.webm при clipFull (fallback clip.webm), `controls`.
- [ ] I.7 Проверка (размер прироста медиа < 60МБ; модалка Car Junk: бейдж+ссылка+новые скрины; 2-3 заменённых клипа глазами), сборка, коммит `feat: longer clips, replaced prototype videos, Car Junk Resurrection showcase`.

### Задача J: Карточки и страницы проектов

**Files:** Modify: `src/content.config.ts` (projects: `company: z.string()`, `trailer: z.string().optional()`), все 10 md (company), `src/components/FeaturedCard.astro`, `src/components/ProjectPage.astro`. Media: `public/media/projects/<slug>/trailer.webm` (FK, Last Wish).

- [ ] J.1 company в md: days-after + dead-impact → "Reaction Games"; forsaken-kingdom → "Quantum Gear Studios"; mafia-stories → "Taptap Studio"; last-wish → "Black Games".
- [ ] J.2 FeaturedCard: обложка — если youtube нет, брать `/media/projects/<slug>/shot-1.webp` (существование проверять на этапе SSG через fs, как в ProjectPage); строка «{company} · {role}» (моно, muted, мелко) под заголовком; тег жанра: перенести под заголовок в общий flex-wrap ряд (не в одну строку с h3) — обрезаться больше не должен.
- [ ] J.3 Steam-трейлеры: со страниц Steam (appid 4418240 FK, 2484100 Last Wish) вытащить URL видео (store.steampowered.com API `https://store.steampowered.com/api/appdetails?appids=<id>` → movies[].webm.max), скачать, сжать до 720p webm ≤8МБ → `public/media/projects/<slug>/trailer.webm`; frontmatter `trailer: "/media/projects/<slug>/trailer.webm"`. ProjectPage: если trailer и нет youtube — `<video controls preload="metadata">` в том же месте. Dead Impact/Mafia: поискать официальные youtube (те же правила верификации, что раньше: только канал разработчика) — если нет, пропустить.
- [ ] J.4 Тексты: сверить каждый md с CV (docs: scratchpad cv_en.txt) — добавить недостающие сильные факты, но без выдумок. Мелкая шлифовка обеих локалей.
- [ ] J.5 Проверка (карточки все с обложками, тег не обрезается на 320px, трейлеры играют в preview), сборка, коммит `feat: project card covers, company/role, steam trailers, copy pass`.

### Задача K: «Обо мне» — редизайн

**Files:** Modify: `src/components/About.astro`.

- [ ] K.1 Слева фото-слот (заглушка AK как сейчас, TODO остаётся), справа: `<h2>` about.title, затем крупно имя «Aleksandr Kandakov» + строка «Senior Unity Developer · Mobile & PC» (моно, accent), затем 3 абзаца: (1) кто я и путь (стартап, 0→8, 200+ прототипов), (2) ключевые проекты (Last Wish → Dead Impact → Mafia Stories), (3) сейчас (Days After live-ops + Forsaken Kingdom). Выравнивание: одна grid-строка, фиксированная ширина фото-колонки, gap 32px; на мобильном столбик, фото по центру.
- [ ] K.2 Проверка обеих локалей + мобильный, сборка, коммит `feat: redesigned about section`.

### Задача L: Финал итерации 3

- [ ] L.1 Финальное интеграционное ревью (диф main..feature/iter3, обе локали, мобильный, вес, console, регрессии итераций 1-2).
- [ ] L.2 Merge в main, push; деплой может ложно падать по таймауту очереди Pages — проверять ФАКТИЧЕСКИЙ прод-контент прежде чем перезапускать. Проверка прода. Отчёт пользователю.
