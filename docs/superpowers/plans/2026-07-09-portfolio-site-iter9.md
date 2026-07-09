# Итерация 9 портфолио-сайта — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Девятый раунд фидбека по основной версии сайта: чистка космической лексики из текстов, реструктуризация (навыки в nav, прототипы внутрь «Проектов», футер), два багфикса (marquee-зацикливание, hover-слайдшоу), полировка (sheen на кнопках, монограмма), апгрейд Steam-вьювера (заполнение, слайдшоу, переиспользование в модалке прототипов) и контент (3 обложки, чистка скринов DA).

**Architecture:** Astro 7 SSG, main-ветка деплоится на GitHub Pages экшеном. Работа в feature-ветке `feature/iter9`. Вьювер рефакторится в общий клиентский модуль `src/scripts/media-viewer.js`, который подключают и SSR-вьювер страниц проектов, и JS-собранный вьювер модалки прототипов; стили вьювера становятся глобальными (это же чинит потерю Astro-scoped стилей на динамических элементах).

**Tech Stack:** Astro 7, vanilla TS/JS в `<script>` компонентов, ffmpeg (winget Gyan.FFmpeg) для конвертации обложек.

**Спека:** `docs/superpowers/specs/2026-07-02-portfolio-site-design.md`, раздел «Итерация 9». Правила проекта: буква «ё» запрещена во всем src (включая комментарии); prefers-reduced-motion игнорируется полностью (не добавлять гейты); архив BlackGames read-only.

**Верификация:** у проекта нет юнит-тестов; ворота качества — `node scripts/validate-content.mjs`, `npm run build` и живая проверка в preview (`.claude/launch.json`, сервер `dev`). Квирки headless preview: document.hidden=true (rAF не тикает — карусель/слайдшоу проверять через preview_eval с ручным вызовом), prefers-reduced-motion форсирован (игнорируем), preview_screenshot может таймаутиться — проверять через preview_eval/inspect/snapshot.

**Зависимости задач:** Задача 1 и Задача 2 обе трогают `Skills.astro`; Задача 1 и Задача 5 обе трогают `PrototypeGrid.astro` — НЕ выполнять параллельно. Безопасные параллельные группы: {1, 3, 6} затем {2, 4, 5}. Последовательное выполнение тоже допустимо.

---

### Задача 1: Тексты, структура, роли (спека п.1-5)

**Files:**
- Modify: `src/components/About.astro` (тексты вех + комментарий)
- Modify: `src/i18n/ui.ts` (nav.skills, удаление nav.prototypes/prototypes.title)
- Modify: `src/layouts/Base.astro` (nav)
- Modify: `src/scripts/header.js:71` (sectionIds)
- Modify: `src/components/Skills.astro` (убрать кикер)
- Modify: `src/components/HomePage.astro` (PrototypeGrid внутрь #projects)
- Modify: `src/components/PrototypeGrid.astro` (обертка секции)
- Modify: `src/components/MiniGame.astro:6` (футер)
- Modify: `src/content/projects/{en,ru}/*.md` (роли, 6 файлов)

- [ ] **Step 1: Убрать космическую лексику из About.astro**

В `src/components/About.astro` заменить тексты вех (только 4 строки `text:`, структура не меняется):

EN Black Games:
```
text: 'Joined a startup as its first developer. Over three years I built the dev team from scratch, led up to 8 programmers, set up the processes, and shipped 200+ prototypes plus releases with millions of installs. Later I led the technical side of Last Wish: released on Steam and VK Play, finalist of the Start Game accelerator.',
```
EN Reaction Games:
```
text: 'One of the developers of Dead Impact, a co-op action-RPG on ECS/DOTS with an 800K+ line codebase. Carried the project from tech launch to a global release with 500K+ installs.',
```
RU Black Games:
```
text: 'Пришел первым разработчиком в стартап. За три года собрал отдел разработки с нуля, руководил командой до 8 программистов, выстроил процессы и выпустил 200+ прототипов, а также релизы с миллионами установок. Позже вел техническую часть «Last Wish»: релиз в Steam и VK Play, финалист акселератора «Start Game».',
```
RU Reaction Games:
```
text: 'Один из разработчиков Dead Impact — кооперативной action-RPG на ECS/DOTS с кодовой базой 800K+ строк. Провел проект от tech launch до глобального релиза с 500K+ установок.',
```
В комментарии перед `type Milestone` убрать фразу про «легкий космический флер» и написать: «Без космических метафор в текстах — космос только в дизайне (решение пользователя, iter9 п.1)». Затем проверить остальные тексты src на космо-метафоры (`grep -in "орбит\|orbit\|звезд\|stellar\|галакт" src --include=*.astro --include=*.ts -r`, исключая orbit.astro/orbit.css/orbit.js/orbit-stars.js и комментарии про дизайн-механику) — в пользовательских текстах их быть не должно.

- [ ] **Step 2: Навигация — Skills вместо Prototypes**

`src/i18n/ui.ts`: добавить в обе локали `'nav.skills': 'Skills'` / `'nav.skills': 'Навыки'`; удалить ключи `'nav.prototypes'` и `'prototypes.title'` из обеих локалей (после Step 4 они больше нигде не используются — проверить grep-ом).

`src/layouts/Base.astro` — блок nav (строки 40-46): заменить ссылку prototypes на skills и поставить ее между About и Projects:
```astro
<a href={localePath(locale, '/#about')} data-section="about">{t(locale, 'nav.about')}</a>
<a href={localePath(locale, '/#skills')} data-section="skills">{t(locale, 'nav.skills')}</a>
<a href={localePath(locale, '/#projects')} data-section="projects">{t(locale, 'nav.projects')}</a>
<a href={localePath(locale, '/#contact')} data-section="contact">{t(locale, 'nav.contact')}</a>
```
Комментарий RR.6 про «пункт убран» заменить на актуальный (iter9 п.2: пункт возвращен).

`src/scripts/header.js:71`: `const sectionIds = ['about', 'skills', 'projects', 'contact'];` — и поправить комментарий над строкой (без «ё»). Секция #skills низкая (~220px), IO-полоса спая (rootMargin -40%/-55%) ее пересекает при проходе — дополнительной логики не нужно, но проверить вживую в preview (Step 7).

- [ ] **Step 3: Skills.astro — убрать видимый кикер**

Удалить из разметки строку `<p class="skills-kicker mono">{t(locale, 'skills.title')}</p>` и CSS-блок `.skills-kicker`. Для a11y добавить на `<section id="skills" class="skills-band">` атрибут `aria-label={t(locale, 'skills.title')}` (ключ `skills.title` в ui.ts ОСТАВИТЬ — он используется здесь и в nav-подписи через nav.skills он не нужен, но aria требует текст). Отступы: у ленты пропал заголовок — проверить глазами, что padding-block 40px не делает стык About/Projects слипшимся; при необходимости поднять до 48-56px.

- [ ] **Step 4: Прототипы внутрь раздела «Проекты»**

`src/components/HomePage.astro`: перенести `<PrototypeGrid locale={locale} />` ВНУТРЬ `<section id="projects">`, сразу после `</div>` сетки карточек (комментарий: iter9 п.3 — прототипы стали хвостом раздела «Проекты»).

`src/components/PrototypeGrid.astro`: корневой элемент `<section id="prototypes" class="section container">` заменить на `<div id="prototypes" class="proto-section">` (id оставить — старые якорные ссылки не ломаем; `.container` не нужен — родительская секция уже container; `.section` не нужен — иначе двойной вертикальный паддинг). Удалить `<h2 class="reveal">{t(locale, 'prototypes.title')}</h2>`. Подводку-строку `prototypes.sub` ОСТАВИТЬ (несет честный контекст «собирал лично / отдел выпустил 200+»), но сделать тише: `class="mono" style="color:var(--muted);font-size:.85rem;"`. Добавить в scoped-стили:
```css
.proto-section { margin-top: 48px; }
```

- [ ] **Step 5: Футер без «All rights reserved.»**

`src/components/MiniGame.astro:6`: текст кнопки `© 2026 Aleksandr Kandakov. All rights reserved.` → `© 2026 Aleksandr Kandakov`. Пасхалка (клик по строке) не трогается.

- [ ] **Step 6: Роли-бейджи — английские в обеих локалях**

Заменить `role:` во frontmatter:
- `src/content/projects/en/mafia-stories.md`: `role: "Team Lead"` (было "Lead")
- `src/content/projects/en/forsaken-kingdom.md`: `role: "Tech Lead"` (было "Solo programmer")
- `src/content/projects/ru/days-after.md`: `role: "Developer"` (было "Разработчик")
- `src/content/projects/ru/dead-impact.md`: `role: "Developer"` (было "Разработчик")
- `src/content/projects/ru/mafia-stories.md`: `role: "Team Lead"` (было "Лид")
- `src/content/projects/ru/last-wish.md`: `role: "Tech Lead"` (было "Техлид")
- `src/content/projects/ru/forsaken-kingdom.md`: `role: "Tech Lead"` (было "Единственный программист")

en/days-after.md, en/dead-impact.md, en/last-wish.md уже корректны. Тексты-описания внутри md НЕ трогать (там «единственный программист» в прозе допустим).

- [ ] **Step 7: Проверка**

Run: `node scripts/validate-content.mjs && npm run build`
Expected: 0 ошибок валидатора, build успешен.
Preview: nav = About·Skills·Projects·Contact (+локаль), скролл-спай подсвечивает Skills при проходе ленты (в headless дергать `window.scrollTo` через preview_eval); прототипы визуально в конце «Проектов» без заголовка; футер без «All rights reserved»; роли-бейджи английские на /ru/; в About нет «орбит».

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(iter9): texts w/o space metaphors, skills in nav, prototypes merged into projects, footer, EN roles"
```

---

### Задача 2: Фикс зацикливания ленты навыков (спека п.6)

**Files:**
- Modify: `src/components/Skills.astro`

Симптом: контент ленты уже вьюпорта, к концу цикла справа растет пустота, на стыке цикла контент «резко появляется». Причина: трек = 2 группы, анимация `translateX(-50%)`; когда ширина ОДНОЙ группы меньше вьюпорта, к концу цикла (сдвиг на ширину группы) правый край трека въезжает в вьюпорт → пустота, затем мгновенный reset.

- [ ] **Step 1: SSR-дублирование контента группы до гарантированной ширины**

Во frontmatter Skills.astro после `marqueeRows` добавить:
```ts
// iter9 п.6, фикс зацикливания: трек = 2 группы, анимация -50% (ширина одной
// группы). Если группа уже вьюпорта, к концу цикла справа появляется пустота
// и контент "прыгает" на reset. Гарантируем ширину группы >= самых широких
// экранов (4К/ультравайд), повторяя контент ряда внутри группы: оценка ширины
// та же, что в estimateDuration, с запасом на неточность шрифтовой оценки.
const MIN_GROUP_PX = 4200;
function rowPx(row: string[]): number {
  return row.reduce((sum, s) => sum + s.length * 7.4 + 34, 0);
}
const repeatedRows = marqueeRows.map((row) => {
  const repeats = Math.max(1, Math.ceil(MIN_GROUP_PX / rowPx(row)));
  const out: string[] = [];
  for (let r = 0; r < repeats; r++) out.push(...row);
  return out;
});
```
В разметке `marqueeRows.map(...)` заменить на `repeatedRows.map(...)` (внутри обеих `.marquee-group` рендерить `row` — это уже повторенный ряд). В `estimateDuration(row, ROW_SPEED[ri])` передавать повторенный ряд `repeatedRows[ri]` — длительность цикла должна считаться от ширины ГРУППЫ, чтобы визуальная скорость осталась ~ROW_SPEED px/s.

ВАЖНО: nth-child-стили калибров (`.tag:nth-child(3n+1)` и т.д.) продолжают работать — паттерн 3n внутри повторенной группы остается периодичным, шов бесшовный, если длина повторенного ряда кратна 3 ИЛИ паттерн совпадает на стыке групп. Ряды раздаются `mixed.forEach((s, i) => marqueeRows[i % 3]...)` — длины рядов могут быть НЕ кратны 3. Чтобы чипы на шве двух групп не «мигали» размером, дополнить повторенный ряд до кратности 3: `while (out.length % 3 !== 0) out.push(...)` НЕЛЬЗЯ (дубль хвоста собьет цикл). Правильно: калибр вешать не через nth-child, а детерминированно в разметке по индексу исходного ряда:
```astro
{row.map((s, si) => <span class={`tag size-${si % 3}${CORE_SKILLS.has(s) ? ' skill-core' : ''}`} data-off={si % 2}>{s}</span>)}
```
и заменить nth-child-правила на классы:
```css
.marquee-group .tag.size-0 { font-size: .72rem; }
.marquee-group .tag.size-1 { font-size: .82rem; }
.marquee-group .tag.size-2 { font-size: .94rem; }
.marquee-group .tag[data-off="0"] { transform: translateY(-4px); }
.marquee-group .tag[data-off="1"] { transform: translateY(4px); }
```
(тогда обе группы идентичны по построению и шов бесшовный при любой длине).

- [ ] **Step 2: Проверка**

Run: `npm run build`
Preview (preview_eval): для каждой `.marquee-group` замерить `getBoundingClientRect().width` — фактическая ширина группы должна быть >= `window.innerWidth` с запасом (целевые ~4200px по оценке); прогнать анимацию вручную: выставить `document.querySelector('.marquee-track').style.animationDelay = '-<duration*0.9>s'` и снять скрин/инспект — пустоты справа быть не должно. Проверить hover-паузу.

- [ ] **Step 3: Commit**

```bash
git add src/components/Skills.astro && git commit -m "fix(iter9): skills marquee gap on wide screens — group content repeated to min width, deterministic chip sizing"
```

---

### Задача 3: Фикс hover-слайдшоу карточек проектов (спека п.7)

**Files:**
- Modify: `src/components/FeaturedCard.astro` (только `<script>`)

Симптом: при первом ховере скрины листаются быстро и хаотично (по мере догрузки), потом штатно. Причина: `setInterval(showNext, 1100)` меняет `src` слоя каждые 1.1с независимо от загрузки; незагруженные кадры «выпрыгивают» с опозданием.

- [ ] **Step 1: Переписать слайдшоу на цепочку setTimeout с ожиданием декода**

Заменить блок слайдшоу в `<script>` FeaturedCard.astro (переменные `index/front/timer`, `showNext`, обработчики pointerenter/pointerleave) на:
```ts
if (layers.length < 2) return;
let shots: string[] = [];
try { shots = JSON.parse(card.dataset.shots ?? '[]'); } catch { shots = []; }
if (shots.length === 0) return;

// iter9 п.7: кадр сменяется только когда СЛЕДУЮЩИЙ скрин реально декодирован
// (img.decode), интервал отсчитывается от фактической смены — никакого
// хаотичного пролистывания на первом ховере, пока кадры догружаются.
const INTERVAL_MS = 1100;
let index = 0;
let front = 0;
let hovering = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let preloaded = false;

const scheduleNext = () => {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(advance, INTERVAL_MS);
};

const advance = () => {
  if (!hovering) return;
  const nextIndex = (index + 1) % shots.length;
  const back = front === 0 ? 1 : 0;
  const img = layers[back];
  img.src = shots[nextIndex];
  const swap = () => {
    if (!hovering) return;
    index = nextIndex;
    img.classList.add('is-visible');
    layers[front].classList.remove('is-visible');
    front = back;
    scheduleNext();
  };
  // decode() ждет фактической готовности кадра; на отказе (редкие форматные
  // косяки) все равно меняем — хуже застывшего слайдшоу ничего нет
  img.decode ? img.decode().then(swap).catch(swap) : (img.onload = swap, img.onerror = swap);
};

card.addEventListener('pointerenter', () => {
  if (hovering) return;
  hovering = true;
  if (!preloaded) {
    preloaded = true;
    shots.forEach((s) => { const p = new Image(); p.src = s; });
  }
  advance();
});
card.addEventListener('pointerleave', () => {
  hovering = false;
  if (timer !== null) { clearTimeout(timer); timer = null; }
  layers.forEach((l) => l.classList.remove('is-visible'));
});
```

- [ ] **Step 2: Проверка**

Run: `npm run build`
Preview: очистить кэш (preview_eval `location.reload(true)` либо devtools-заголовки не доступны — достаточно первого захода), навести на карточку Days After (preview_eval dispatchEvent pointerenter), убедиться через снапшот классов `.is-visible`, что смены идут по одному слою за такт; повторный ховер — мгновенный старт без рывков.

- [ ] **Step 3: Commit**

```bash
git add src/components/FeaturedCard.astro && git commit -m "fix(iter9): hover slideshow waits for image decode — no chaotic first-hover cycling"
```

---

### Задача 4: Sheen на кнопках контактов + монограмма AK (спека п.8-9)

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/layouts/Base.astro` (SVG монограммы)

- [ ] **Step 1: Пробегающий блик по кнопкам hero и Contact**

В `src/styles/global.css` (рядом с .btn/.icon-link) добавить:
```css
/* iter9 п.8: периодический пробегающий блик по кнопкам контактов (CV +
   социконки) — по очереди, ненавязчиво. Общий цикл 9с, каждый элемент
   стартует со своим сдвигом var(--sheen-i); сам пробег занимает ~12% цикла. */
.sheen { position: relative; overflow: hidden; }
.sheen::after {
  content: "";
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 55%;
  background: linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, .22) 50%, transparent 100%);
  transform: translateX(-140%) skewX(-18deg);
  pointer-events: none;
  animation: sheen-run 9s linear infinite;
  animation-delay: calc(var(--sheen-i, 0) * 1.1s);
}
@keyframes sheen-run {
  0% { transform: translateX(-140%) skewX(-18deg); }
  12% { transform: translateX(320%) skewX(-18deg); }
  100% { transform: translateX(320%) skewX(-18deg); }
}
.hero-cta .btn { --sheen-i: 0; }
.hero-cta .icon-link:nth-of-type(1) { --sheen-i: 1; }
.hero-cta .icon-link:nth-of-type(2) { --sheen-i: 2; }
.hero-cta .icon-link:nth-of-type(3) { --sheen-i: 3; }
.hero-cta .icon-link:nth-of-type(4) { --sheen-i: 4; }
.contact-actions .btn-contact { --sheen-i: 0; }
.contact-actions .icon-link:nth-of-type(1) { --sheen-i: 1; }
.contact-actions .icon-link:nth-of-type(2) { --sheen-i: 2; }
.contact-actions .icon-link:nth-of-type(3) { --sheen-i: 3; }
.contact-actions .icon-link:nth-of-type(4) { --sheen-i: 4; }
```
Класс `sheen` повесить: в `Hero.astro` на `<a class="btn sheen" ...>`; в `SocialIcons.astro` на `<a class="icon-link sheen" ...>`; в `Contact.astro` на `.btn-contact` → `class="btn-contact sheen"`. Проверить фактический класс контейнера кнопок в Contact.astro (в плане предположен `.contact-actions` — если там другой класс/структура, использовать реальный селектор; SocialIcons внутри рендерит `<div>` с ссылками — nth-of-type применять к .icon-link внутри этого div). НЕ добавлять никаких reduced-motion гейтов.

- [ ] **Step 2: Монограмма AK — крупнее, свечение изнутри**

В `src/layouts/Base.astro` заменить SVG монограммы (строки 34-37):
```astro
<svg class="brand-mark" width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <text x="32" y="44" font-family="monospace" font-size="34" font-weight="bold" fill="#ff5c1a" text-anchor="middle">AK</text>
</svg>
```
(квадратная подложка `<rect>` удалена, размер 32→40, шрифт 30→34). В `src/styles/global.css` заменить блок `.brand svg`:
```css
/* iter9 п.9: без квадратной подложки — свечение изнутри самих букв:
   постоянный мягкий glow + медленная пульсация, на hover ярче */
.brand svg {
  filter: drop-shadow(0 0 5px rgba(255, 92, 26, .55));
  animation: brand-glow 4s ease-in-out infinite;
  transition: filter .2s;
}
.brand:hover svg {
  filter: drop-shadow(0 0 10px rgba(255, 92, 26, .9));
  animation: none;
}
@keyframes brand-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 92, 26, .4)); }
  50% { filter: drop-shadow(0 0 9px rgba(255, 92, 26, .75)); }
}
```
`.brand-mark { border-radius: 8px }` больше не нужен (подложки нет) — убрать.

- [ ] **Step 3: Проверка**

Run: `npm run build`
Preview: preview_inspect `.brand svg` (filter применен, размер 40); sheen — preview_eval прочитать `getComputedStyle(el, '::after').animationName === 'sheen-run'` на кнопке CV и иконках; глазами (скрин, если не таймаутится) — блик не должен быть кричащим.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(iter9): sheen sweep on contact buttons, AK monogram bigger with inner glow"
```

---

### Задача 5: MediaViewer v2 — заполнение, слайдшоу, переиспользование в модалке прототипов (спека п.10-12)

**Files:**
- Create: `src/scripts/media-viewer.js`
- Modify: `src/components/MediaViewer.astro` (стили → глобальные, скрипт → общий модуль)
- Modify: `src/components/PrototypeGrid.astro` (модалка на вьювер)
- Modify: `src/i18n/ui.ts` (если нужны подписи — переиспользовать существующие gallery.*/viewer.video/carousel.*)

Три проблемы решаются одним рефакторингом: (а) динамически созданные `renderStage()` элементы не получают Astro-scoped атрибут → правила `.mv-stage img {...}` на них не действуют → «жмутся в угол»; лечится переводом стилей вьювера в глобальные (`<style is:global>` с неймспейсом `.media-viewer`); (б) слайдшоу; (в) переиспользование в модалке.

- [ ] **Step 1: Вынести логику вьювера в `src/scripts/media-viewer.js`**

Создать модуль с двумя экспортами (JS, не TS — файл в src/scripts как остальные):

```js
// Общий клиентский движок Steam-вьювера (iter9 п.10-12): используется
// SSR-вьювером страниц проектов (MediaViewer.astro) и JS-собранным вьювером
// модалки прототипов (PrototypeGrid.astro).
//
// attachViewer(root, opts) — вешает поведение на УЖЕ существующую разметку
//   (стейдж + миниатюры с data-атрибутами kind/src/id/poster + лайтбокс).
//   opts: { slideshowMs?: number } — авто-слайдшоу: картинка сменяется через
//   slideshowMs, локальное видео — по событию 'ended', youtube — по
//   onStateChange===0 через enablejsapi/postMessage (без API-ответа не
//   продвигаем). Возвращает { destroy } (снимает таймеры/слушатели window).
// buildViewer(playlist, labels) — создает DOM-структуру вьювера (те же
//   классы: media-viewer, mv-stage, mv-strip-wrap, mv-thumb..., mv-lightbox)
//   из массива {kind:'video'|'youtube'|'image', src, id, poster, label} и
//   возвращает корневой элемент; вызывающий сам вставляет его в DOM и вызывает
//   attachViewer.
export function buildViewer(playlist, labels) { /* ... */ }
export function attachViewer(root, opts = {}) { /* ... */ }
```

Содержимое `attachViewer` — перенос текущего скрипта MediaViewer.astro (readItem, renderStage, setActive, лайтбокс, стрелки, клавиатура) c дополнениями:

1. Слайдшоу (opts.slideshowMs, по умолчанию 3000 для обоих потребителей):
```js
let slideTimer = null;
let destroyed = false;
const stopSlide = () => { if (slideTimer) { clearTimeout(slideTimer); slideTimer = null; } };
const scheduleSlide = () => {
  stopSlide();
  if (!opts.slideshowMs || destroyed) return;
  const item = readItem(thumbs[active]);
  // картинки листаем по таймеру; видео/youtube ждут своего события окончания
  if (item.kind === 'image') slideTimer = setTimeout(() => advanceAuto(), opts.slideshowMs);
};
const advanceAuto = () => {
  if (destroyed || document.hidden) { scheduleSlide(); return; }
  if (lightbox && lightbox.open) { scheduleSlide(); return; } // лайтбокс = пауза
  setActive((active + 1) % thumbs.length, true, /*mutedAuto*/ true);
};
```
2. `renderStage(item, autoplay, mutedAuto)`: для `kind==='video'` при `mutedAuto` ставить `video.muted = true` ДО play() (авто-продвижение без пользовательского жеста — играем приглушенно; ручной клик по миниатюре остается как сейчас: пытаемся со звуком, fallback muted). Добавить `video.addEventListener('ended', () => advanceAuto())`.
3. youtube: `iframe.src = ...embed/{id}?enablejsapi=1&autoplay=...`; после вставки в DOM отправить handshake и слушать окончание:
```js
const onMsg = (e) => {
  if (e.origin !== 'https://www.youtube-nocookie.com') return;
  let data; try { data = JSON.parse(e.data); } catch { return; }
  if (data.event === 'onStateChange' && data.info === 0) advanceAuto();
};
window.addEventListener('message', onMsg); // снять в destroy()
iframe.addEventListener('load', () => {
  iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'mv' }), '*');
});
```
(если сообщение не придет — youtube-слайд просто не продвинется сам; это осознанный fallback по спеке).
4. Каждый `setActive` (и ручной, и авто) завершается `scheduleSlide()` — ручной выбор перезапускает таймер.
5. `destroy()`: `destroyed = true; stopSlide(); window.removeEventListener('message', onMsg); window.removeEventListener('resize', updateArrows);`.
6. SSR-первый элемент: как сейчас — обработчик зума на существующем `<img>`; slideshow стартует сразу после attach (`scheduleSlide()`).

`buildViewer(playlist, labels)`: собрать через createElement/innerHTML ровно ту же структуру, что SSR-часть MediaViewer.astro (включая `data-*` на миниатюрах, кнопки стрелок, dialog-лайтбокс; labels = {prev, next, close, prevShot, nextShot}); первый элемент отрисовать в стейдж тем же `renderStage`-эквивалентом (можно просто после attachViewer вызвать `setActive(0, false)` — для этого attachViewer может принимать `opts.renderFirst = true`).

- [ ] **Step 2: MediaViewer.astro — глобальные стили + подключение модуля**

1. `<style>` → `<style is:global>`; убедиться, что каждый селектор уже неймспейснут (`.media-viewer ...`, `.mv-*`) — конфликтов с модалкой прототипов не будет, там те же классы намеренно.
2. Добавить модификатор заполнения: в стилях `.mv-stage video { object-fit: contain; }` оставить/задать явно, `.mv-stage img { object-fit: cover; }` (скрины проектов 16:9 — cover заполняет сцену без искажений; видео не кропаем — у него контролы и композиция кадра). Для модалки прототипов предусмотреть класс `.media-viewer--contain .mv-stage img { object-fit: contain; background: #000; }` (скрины прототипов бывают портретные — кроп недопустим).
3. `<script>` заменить на:
```ts
import { attachViewer } from '../scripts/media-viewer.js';
document.querySelectorAll<HTMLElement>('.media-viewer').forEach((root) => {
  attachViewer(root, { slideshowMs: 3000 });
});
```
4. Первому youtube-iframe в SSR-разметке добавить `?enablejsapi=1` в src, чтобы авто-продвижение работало и до первого клика.

- [ ] **Step 3: Модалка прототипов — вьювер вместо списка**

В `src/components/PrototypeGrid.astro`:
1. Разметка модалки: заменить `<video class="pm-video">`, `<div class="pm-extra-clips">`, `<div class="pm-shots">`, `<img class="pm-icon">` на один контейнер `<div class="pm-viewer"></div>`.
2. В `openModal(card)` собрать плейлист и вьювер:
```ts
import { buildViewer, attachViewer } from '../scripts/media-viewer.js';
// ...
let viewerHandle: { destroy: () => void } | null = null;
const buildPlaylist = (id: string, hasClip: boolean, hasClipFull: boolean, extraClips: number, shots: number) => {
  const base = `/media/prototypes/${id}`;
  const list: any[] = [];
  if (hasClip) list.push({ kind: 'video', src: `${base}/${hasClipFull ? 'clip-full.webm' : 'clip.webm'}`, id: '', poster: `${base}/poster.jpg` });
  for (let i = 2; i <= 1 + extraClips; i++) list.push({ kind: 'video', src: `${base}/clip-${i}.webm`, id: '', poster: `${base}/poster-${i}.jpg` });
  for (let i = 1; i <= shots; i++) list.push({ kind: 'image', src: `${base}/shots/${i}.webp`, id: '', poster: '' });
  if (list.length === 0) list.push({ kind: 'image', src: `${base}/icon.webp`, id: '', poster: '' });
  return list;
};
// в openModal:
viewerHandle?.destroy();
pmViewerEl.innerHTML = '';
const viewerRoot = buildViewer(buildPlaylist(id, hasClip, hasClipFull, extraClips, shots), labels);
viewerRoot.classList.add('media-viewer--contain');
pmViewerEl.appendChild(viewerRoot);
viewerHandle = attachViewer(viewerRoot, { slideshowMs: 3000 });
```
labels взять из data-атрибутов модалки (добавить `data-label-*` на #proto-modal из t(locale, 'carousel.prev'/'carousel.next'/'gallery.close'/'gallery.prev'/'gallery.next')).
3. В обработчике `modal close`: `viewerHandle?.destroy(); viewerHandle = null; pmViewerEl.innerHTML = '';` (вместо прежней чистки video/extraClips). Старые CSS-блоки `.pm-video/.pm-extra-clips/.pm-shots/.pm-icon` удалить, добавить `.pm-viewer { margin-top: 4px; }`. Ширину модалки поднять до `min(860px, 92vw)` — вьювер с лентой миниатюр в 720px тесноват (посмотреть глазами, решить).
4. Первое видео в модалке раньше стартовало автоплеем с muted — сохранить поведение: после attach вызвать setActive(0, true) с mutedAuto (открытие модалки — это клик, но звук из модалки без явного выбора не нужен; muted как раньше).

- [ ] **Step 4: Проверка**

Run: `node scripts/validate-content.mjs && npm run build`
Preview, страница проекта (например /projects/last-wish/):
- preview_eval: у `.mv-stage img` (после клика по миниатюре-картинке!) computed `object-fit` = cover и размеры = размерам стейджа — фикс «жмутся в угол» именно для динамических элементов;
- слайдшоу: в headless rAF/таймеры живут, но document.hidden=true — advanceAuto перескочит через scheduleSlide; проверять напрямую вызовами или временно подменив document.hidden через Object.defineProperty в preview_eval;
- модалка прототипа (клик по карточке карусели): внутри `.media-viewer--contain`, миниатюры кликабельны, видео играет, стрелки работают, после close — таймеры сняты (destroy), повторное открытие другого прототипа собирает новый плейлист.
Обе локали.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(iter9): media viewer v2 — global styles fix dynamic stage sizing, 3s slideshow with video-end advance, shared engine reused in prototype modal"
```

---

### Задача 6: Контент — обложки DA/FK/LW, чистка скринов DA (спека п.13-15)

**Files:**
- Create: `public/media/projects/days-after/cover.webp`
- Create: `public/media/projects/forsaken-kingdom/cover.webp`
- Modify: `public/media/projects/last-wish/cover.webp` (замена)
- Delete/rename: `public/media/projects/days-after/shot-*.webp`
- Delete: папка `НА РАЗБОР/` (в корне репо)

ffmpeg: `Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe | Select -First 1 -ExpandProperty FullName`.

- [ ] **Step 1: Конвертация постеров**

```powershell
# DA: avif 626x352 -> webp; мягкий апскейл до 960 (карточка ~520px CSS, retina x2)
& $ffmpeg -y -i "НА РАЗБОР\DA_Poster.avif" -vf "scale=960:-2:flags=lanczos,unsharp=5:5:0.4" -c:v libwebp -quality 88 "public\media\projects\days-after\cover.webp"
# FK: jpg 616x353 -> webp, тот же пайплайн
& $ffmpeg -y -i "НА РАЗБОР\FK_Poster.jpg" -vf "scale=960:-2:flags=lanczos,unsharp=5:5:0.4" -c:v libwebp -quality 88 "public\media\projects\forsaken-kingdom\cover.webp"
# LW: обложка youtube c3MGKW_LXAU уже скачана в scratchpad (lw_thumb.jpg 1280x720);
# если файла нет - перекачать: curl.exe -sL -o lw_thumb.jpg https://i.ytimg.com/vi/c3MGKW_LXAU/maxresdefault.jpg
& $ffmpeg -y -i "<scratchpad>\lw_thumb.jpg" -vf "scale=960:-2:flags=lanczos" -c:v libwebp -quality 88 "public\media\projects\last-wish\cover.webp"
```
ОБЯЗАТЕЛЬНО посмотреть все три результата глазами (Read tool на webp — если Read не умеет webp, конвертировать копию в png и посмотреть): нет ли артефактов апскейла/пережатия, кадр не обрезан. Если апскейл DA/FK выглядит мыльно — оставить нативный размер (626/616) без scale-фильтра и сравнить.

- [ ] **Step 2: Чистка скринов Days After**

```powershell
Remove-Item "public\media\projects\days-after\shot-1.webp","public\media\projects\days-after\shot-7.webp"
# перенумерация 2..6 -> 1..5 (по возрастанию, имена не пересекаются)
2..6 | ForEach-Object { Rename-Item "public\media\projects\days-after\shot-$_.webp" "shot-$($_-1).webp" }
```
Проверить итог: ровно shot-1..5, прежний shot-2 стал shot-1 (это новая обложка-фолбэк и первый скрин вьювера).

- [ ] **Step 3: Удалить папку «НА РАЗБОР»**

```powershell
Remove-Item -Recurse -Force "НА РАЗБОР"
```
(файлы уже сконвертированы в public; папка не под git-контролем — untracked).

- [ ] **Step 4: Проверка**

Run: `node scripts/validate-content.mjs && npm run build`
Preview: карточки days-after/forsaken-kingdom/last-wish показывают новые обложки (у days-after раньше был youtube-фолбэк hqdefault — теперь cover.webp); страница days-after: 5 скринов, выбывших нет; страница forsaken-kingdom: постер стал и постером вьювера (localPoster).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "content(iter9): DA and FK posters as card covers, LW cover from official trailer thumb, DA shots pruned to 5"
```

---

### Задача 7: Финал — интеграционное ревью, merge, deploy (все пункты)

**Files:** нет новых (только фиксы по ревью)

- [ ] **Step 1: Полный прогон**

Run: `node scripts/validate-content.mjs && npm run build`
Expected: без ошибок. Дополнительно: `grep -rn "ё" src/` — 0 вхождений; `grep -rn "prefers-reduced-motion" src/` — 0; `grep -in "орбит" src/components src/i18n src/content` — 0 (пользовательские тексты).

- [ ] **Step 2: Интеграционное ревью в preview (обе локали)**

Чеклист по спеке итерации 9: (1) в About нет орбит; (2) nav About·Skills·Projects·Contact, спай подсвечивает Skills; (3) прототипы — хвост «Проектов», без h2; (4) футер «© 2026 Aleksandr Kandakov», пасхалка кликается; (5) роли Developer/Team Lead/Tech Lead/Tech Lead английские в /ru/; (6) marquee без пустот (замерить ширины групп при узком и широком вьюпорте preview_resize); (7) hover-слайдшоу ровное; (8) sheen бежит по очереди; (9) монограмма 40px со свечением без квадрата; (10) вьювер: динамические слайды заполняют стейдж; (11) слайдшоу 3с/по окончании видео; (12) модалка прототипа = тот же вьювер (и для прототипа без клипа/скринов — одиночная иконка); (13-15) обложки на месте. Мобильный вьюпорт (375px): nav влезает в строку (пункт «Навыки» добавился — проверить и RU: «Обо мне · Навыки · Проекты · Контакты · EN»!), модалка-вьювер юзабелен.
ВНИМАНИЕ: если RU-nav не влезает при 320-414px — ужать по образцу существующих media-query в global.css.

- [ ] **Step 3: Merge и deploy**

```bash
git checkout main && git merge --no-ff feature/iter9 -m "Merge iteration 9: text cleanup, nav skills, prototypes in projects, marquee and slideshow fixes, sheen, monogram, media viewer v2, new covers"
git push origin main
```
Дождаться Actions (gh run watch); при ложном падении syncing_files/queue timeout — проверить фактический прод-контент, retry через `gh workflow run` (workflow_dispatch), НЕ `gh run rerun --failed`.

- [ ] **Step 4: Проверка прода**

curl https://sankaaa62.github.io/ и /ru/: маркеры — «Навыки»/«Skills» в nav, отсутствие «All rights reserved», отсутствие «орбит» в About-тексте, `days-after/cover.webp` отдает 200, у days-after `shot-6.webp` отдает 404 (осталось 5), media-viewer--contain присутствует в бандле JS. Обновить память (portfolio-site-launch-state.md) и отчитаться пользователю.
