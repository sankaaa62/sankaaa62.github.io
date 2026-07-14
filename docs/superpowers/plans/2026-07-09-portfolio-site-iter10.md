# Итерация 10 — Implementation Plan (карта v2.1 + интеграция + FK-видео)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полировка интерактивной карты /orbit/ по фидбеку (наложения планет, слои, скорости, звезда, подписи, hover-блоки), официальная интеграция карты с основным сайтом под именем «Интерактивная карта опыта», 4 превью-ролика Forsaken Kingdom во вьювер.

**Architecture:** Astro 7 SSG; карта — изолированные orbit-файлы (orbit.astro/orbit.css/orbit.js/orbit-prototypes.js/orbit-stars.js); интеграция добавляет взаимные ссылки (карточка-баннер на главной, backlink в HUD карты) и снимает noindex; MediaViewer расширяет fs-скан локальных видео. Ветка `feature/iter10`.

**Спека:** `docs/superpowers/specs/2026-07-02-portfolio-site-design.md`, раздел «Итерация 10». Правила: без «ё» в src (включая комментарии); prefers-reduced-motion игнорируется; /orbit/ остается RU-only.

**Верификация:** `node scripts/validate-content.mjs && npm run build` + preview «dev» (headless-квирки: document.hidden=true — rAF/IO не тикают, подмена hidden допустима; скриншоты таймаутятся — preview_eval/inspect/snapshot).

**Зависимости задач:** Задача 1 (карта) и Задача 2 (интеграция) обе трогают orbit.astro/orbit.css — строго последовательно. Задача 3 (FK-видео, MediaViewer.astro + public/media) независима по файлам, но выполняется после них (последовательный конвейер).

---

### Задача 1: Карта v2.1 — полировка (спека п.1-6)

**Files:** Modify: `src/scripts/orbit.js`, `src/styles/orbit.css`, `src/pages/orbit.astro` (разметка подписей/hover-блоков/звезды)

- [ ] **Step 1: Взвешенный контр-масштаб маркеров (п.1)**

Сейчас маркеры держат константный экранный размер через `scale(calc(1 / var(--zoom)))` (или эквивалент в JS). Заменить на частичный контр-масштаб с весом: экранный масштаб маркера = `zoom^(-W)` где `W ≈ 0.65` (подобрать глазами в диапазоне 0.55-0.75): при отдалении маркеры уменьшаются, но медленнее сцены — «параллакс размером». Реализация: CSS custom property `--marker-scale` обновляется вместе с `--zoom` из JS (`markerScale = Math.pow(zoom, -W)`), маркеры используют `transform: ... scale(var(--marker-scale))`. Ограничить итоговый ЭКРАННЫЙ размер маркеров сверху и снизу (clamp в JS: например screenScale*zoom в пределах [0.5, 1.15] от базового), чтобы при сильном зуме планеты не становились гигантскими, при сильном отдалении — не исчезали.

- [ ] **Step 2: Развести стартовые углы планет (п.1)**

Стартовые углы (animation-delay или angle-параметры) задать так, чтобы: на орбите «Сейчас» Days After и Forsaken Kingdom были в противофазе (~180°); планеты соседних орбит стартовали с разными фазами (шаг ~70-110° между орбитами). Значения зашить константами с комментарием-почему.

- [ ] **Step 3: Слои: пояс навыков под планетами (п.2)**

z-index: чипы пояса ниже планет и звезды; допустимо приглушение чипов (opacity ~0.75 или чуть темнее фон чипа). Проверить, что чипы остаются читаемыми и кликабельность планет не страдает (pointer-events у чипов не должен перехватывать планеты).

- [ ] **Step 4: Скорости (п.3)**

- Прототипы (рой): ускорить заметно (в 2-4 раза от текущего — подобрать, чтобы движение читалось сразу).
- Планеты проектов: замедлить ~в 2 раза от текущего.
- Всем планетам и астероидам — слегка разные скорости: детерминированный джиттер от индекса (например ±15% по формуле от i, БЕЗ Math.random — SSR-стабильность и повторяемость), у прототипов разброс больше.

- [ ] **Step 5: Звезда-визитка (п.4)**

Убрать диск/изображение солнца ЗА фотографией (свечение-ореол вокруг САМОЙ фотографии оставить умеренным — фотка и есть звезда). Сам элемент звезды увеличить (примерно на 25-40%, подобрать глазами; учесть контр-масштаб из Step 1 — базовый размер).

- [ ] **Step 6: Подписи (п.5)**

Постоянные подписи сократить: у планет — только название проекта; у звезды — только «Александр Кандаков» (роль уходит в hover-блок из Step 7). Годы/вехи на кольцах орбит не трогать (это подписи орбит, не планет), но если они шумят на дальнем зуме — тоже скрыть порогом. Скрытие: при `zoom < порога` (подобрать, ~0.45-0.6) подписи планет и звезды плавно гаснут (opacity transition по классу на сцене, класс вешает JS при пересечении порога).

- [ ] **Step 7: Hover-блоки (п.6)**

При наведении на планету — компактный пояснительный блок с анимированным появлением (fade+shift 150-250ms): 2-3 строки, например «роль (EN-бейдж) · годы» + одна метрика («10M+ установок»). При наведении на фотку-звезду — аналогичный блок («Senior Unity Developer · 6+ лет в геймдеве», приглашение кликнуть). Данные уже есть в orbit.astro (frontmatter коллекции). Блок не должен перехватывать клики (pointer-events: none) и вылезать за экран у краев (позиционирование от маркера с учетом квадранта — простой флип по стороне). На тач-устройствах ховера нет — блоки просто не показываются (клик и так открывает карточку).

- [ ] **Step 8: Проверка и коммит**

`npm run build`; preview: замерить экранные размеры планеты на zoom fit / 0.2 / 1.0 / 2.0 (частичный контр-масштаб работает, в кламп-границах); z-order чипов и планет (elementFromPoint над планетой, перекрытой чипом ранее); скорости (прочитать animation-duration у планет/прототипов — разные); подписи гаснут при малом zoom (класс на сцене); hover-блок появляется на pointerenter (dispatchEvent) и не ловит клики. Мобильный 375px — ничего не разъехалось.
Commit: `feat(iter10): orbit map polish - weighted marker scaling, layering, speeds, star, labels, hover cards`

---

### Задача 2: Интеграция карты с основным сайтом (спека п.7-8)

**Files:**
- Modify: `src/pages/orbit.astro` (тексты, title, noindex, backlink)
- Create: `src/components/OrbitMapCard.astro` (карточка-баннер)
- Modify: `src/components/HomePage.astro` (вставка карточки)
- Modify: `src/i18n/ui.ts` (ключи карточки)

- [ ] **Step 1: /orbit/ — официальный раздел**

В orbit.astro: `<title>` и HUD-заголовок → «Интерактивная карта опыта» (если в HUD дизайнерски лучше короткое «Орбиты» — оставить «Орбиты» как визуальный титул сцены, но подзаголовок/`<title>` должны называть страницу «Интерактивная карта опыта»); убрать ВСЕ формулировки «эксперимент»/«альтернативная версия» (kicker, подзаголовок, футер «эксперимент /orbit/»); снять `<meta name="robots" content="noindex">`; добавить ненавязчивый backlink на основной сайт в HUD (например слева сверху: «← kandakov» / «На основной сайт», mono, muted, hover-подсветка; ведет на «/»). Футер: «© 2026 Aleksandr Kandakov».

- [ ] **Step 2: Карточка-баннер на главной**

Новый компонент `src/components/OrbitMapCard.astro` (locale prop): широкая карточка в научпоп-стиле между «Проектами» и «Контактами» — тонкие орбитальные кольца (SVG/CSS, 2-3 эллипса с точками-планетами, легкая анимация вращения), звезда-точка в центре, заголовок «Интерактивная карта опыта» / «Interactive experience map», одна строка описания («Весь путь — звездной системой: орбиты-вехи, планеты-проекты» / EN-аналог), CTA-кнопка или вся карточка-ссылка на /orbit/. На EN — ненавязчивая mono-пометка «RU» (карта на русском). Стиль: surface/border/radius как у карточек проектов, hover-lift (.lift), выразительно, без цыганщины. Разметка: `<a class="orbit-map-card lift reveal" href="/orbit/">…` (обычный href, БЕЗ localePath — карта одна). key-строки в ui.ts: 'orbitmap.title', 'orbitmap.copy', 'orbitmap.lang-note' (только en), 'orbitmap.cta'.
В HomePage.astro вставить `<OrbitMapCard locale={locale} />` между секцией #projects и Contact (отдельной узкой секцией-контейнером, без пункта в nav — решение согласовано: nav на мобиле плотный).

- [ ] **Step 3: Проверка и коммит**

`npm run build`; preview обе локали: карточка рендерится между Проектами и Контактами, ссылка ведет на /orbit/; /orbit/: нет «эксперимент», нет noindex, backlink работает; nav не изменился; мобильный 375px — карточка не ломает верстку. grep «ё»/reduced-motion = 0.
Commit: `feat(iter10): orbit map integrated - experience map card on main page, backlink, official naming, indexable`

---

### Задача 3: FK-видео во вьювер (спека п.9)

**Files:**
- Modify: `src/components/MediaViewer.astro` (fs-скан trailer*)
- Create: `public/media/projects/forsaken-kingdom/trailer.webm`, `trailer-2.webm`, `trailer-3.webm`, `trailer-4.webm`
- Delete: папка `НА РАЗБОР/`

- [ ] **Step 1: Расширить скан локальных видео**

В MediaViewer.astro заменить жесткий список `['trailer.webm', 'trailer-2.webm']` на fs-скан mediaDir по `/^trailer(-\d+)?\.webm$/` с числовой сортировкой (trailer.webm первым, затем -2, -3, ...; localeCompare numeric как у shots). Комментарий-почему (iter10 п.9: у FK 4 ролика).

- [ ] **Step 2: Разложить ролики**

Копировать (они уже vp9 960x540, сжатие не требуется):
- `НА РАЗБОР\FK_preview_gameplay.webm` → `public\media\projects\forsaken-kingdom\trailer.webm`
- `НА РАЗБОР\FK_preview_battle.webm` → `trailer-2.webm`
- `НА РАЗБОР\FK_preview_placement.webm` → `trailer-3.webm`
- `НА РАЗБОР\FK_preview_upgrade.webm` → `trailer-4.webm`
Порядок: gameplay (общий) первым, дальше battle/placement/upgrade. Постером станет cover.webp (localPoster). Затем удалить папку «НА РАЗБОР» (`Remove-Item -Recurse -Force`).

- [ ] **Step 3: Проверка и коммит**

`node scripts/validate-content.mjs && npm run build`; preview /projects/forsaken-kingdom/ (обе локали): во вьювере 4 видео-миниатюры с постером cover.webp + 6 скринов; клик по видео играет; слайдшоу по 'ended' переходит дальше; страницы days-after/last-wish не сломаны (у них 0/1 trailer).
Commit: `feat(iter10): FK preview videos in media viewer, trailer scan generalized`

---

### Задача 4: Финал — интеграционное ревью, merge, deploy

- [ ] Полный прогон: validate + build + astro check; grep «ё», prefers-reduced-motion, «эксперимент» на /orbit/ = 0.
- [ ] Интеграционное ревью в preview: чеклист итерации 10 (пп.1-9), обе локали, мобайл, /orbit/ носит новое имя и связан с главной в обе стороны.
- [ ] Merge в main (`git merge --no-ff feature/iter10`), push, дождаться Actions (при ложном падении — workflow_dispatch retry, проверять фактический прод).
- [ ] Прод-маркеры: карточка на «/» и «/ru/», /orbit/ без noindex и без «эксперимент», backlink, FK trailer-4.webm отдает 200. Память, отчет.
