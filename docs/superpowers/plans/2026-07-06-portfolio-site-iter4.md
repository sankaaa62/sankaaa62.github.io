# Портфолио-сайт, итерация 4 — план реализации («Engineer's Showreel»)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Комплексный дизайн-апгрейд по концепции «Engineer's Showreel» (см. спеку, раздел «Итерация 4»): hero-визитка с портретом и typewriter, живой фон с параллаксом, умный header со scroll-spy, единая система reveal/hover-анимаций, облако тегов навыков, Get In Touch, редакторский проход, эксперимент-карусель прототипов.

**Ветка:** feature/iter4 от main. Правила прежние. Спека — источник концепции; все цвета/движение по её правилам ролей.

---

### Задача M: Система движения + фон v3

**Files:** global.css, src/scripts/reveal.js, новый src/scripts/parallax.js, Base.astro (подключение), точечные правки компонентов (классы .lift, stagger-атрибуты).

- [ ] M.1 Reveal v2: заголовки секций `<h2>` получают полосу-подчёркивание (оранж, ширина 0→48px при .visible); карточки в сетках — stagger через `transition-delay: calc(var(--i) * 60ms)` (проставить style="--i:n" при рендере списков в Metrics/FeaturedCard/PrototypeGrid/Gallery).
- [ ] M.2 .lift: единый hover-класс (transform: translateY(-3px) scale(1.02); border-color accent; box-shadow glow) — применить к карточкам проектов, прототипов, иконкам, кнопкам. Существующий tilt прототипов сохранить (он богаче) — .lift для остальных.
- [ ] M.3 Фон v3: два слоя пятен (::before оранж+тил, ::after добавить фиолет к шуму ИЛИ отдельный div-слой) с разными keyframes в противофазе; parallax.js: на pointermove сдвиг слоёв ±2% (lerp-сглаживание), на scroll ±4% (rAF-троттлинг); reduced-motion выключает.
- [ ] M.4 Проверка (визуально: reveal каскад, полосы заголовков, фон реагирует на курсор и скролл), сборка, коммит.

### Задача N: Header v2 (auto-hide + scroll-spy)

**Files:** Base.astro, global.css, новый src/scripts/header.js.

- [ ] N.1 Header становится fixed: blur-подложка (backdrop-filter), скрытие translateY(-100%) при скролле вниз >80px, появление при скролле вверх; лёгкая тень при «отлипании» от верха.
- [ ] N.2 Scroll-spy: IntersectionObserver по секциям (#about,#projects,#prototypes,#skills,#contact) → активному пункту nav тиловая полоска-underline (анимированная). Работает на главной; на страницах проектов header просто sticky без spy.
- [ ] N.3 Компенсация: body padding-top; якорные ссылки со scroll-margin-top.
- [ ] N.4 Проверка в динамике (скролл вниз/вверх, подсветка меняется), мобильный, сборка, коммит.

### Задача O: Hero-визитка + футер + пасхалка

**Files:** Hero.astro, About.astro, MiniGame.astro, ui.ts, public/media/me.webp (из SankaaaFace.jpg в корне: конвертировать 640px webp, исходник скопировать в media-staging и удалить из корня), новый src/scripts/hero-type.js.

- [x] O.1 Визитка: слева текст (моно-строка «Hi, my name is» / «Привет, меня зовут», имя «Aleksandr Kandakov» крупно с посимвольным появлением (CSS stagger по span'ам), строка typewriter с ротацией ролей [Senior Unity Developer, Team Lead, ECS/DOTS · Multiplayer, AI-driven development] — тиловый мигающий курсор; CTA-ряд: кнопка CV + SocialIcons), справа портрет: круглый, 220-260px, оранжевое кольцо + мягкий glow, лёгкий float-дрейф. На мобильном портрет сверху.
- [x] O.2 About: убрать имя/подзаголовок и фото-слот (портрет теперь в hero) — только h2 + 3 абзаца (+ вычитка). Grid упростить.
- [x] O.3 Футер: «Aleksandr Kandakov» + «© 2026» + SocialIcons, БЕЗ «built with Astro». Мини-игра: убрать кнопку «press start»; вместо неё маленькая иконка-джойстик (inline SVG 20px, muted, без подписи, aria-label="?") в углу футера — клик разворачивает игру как раньше. Логика игры не меняется.
- [x] O.4 Проверка (обе локали, мобильный, портрет живой, typewriter крутится, пасхалка работает), сборка, коммит.

### Задача P: Get In Touch

**Files:** Contact.astro, ui.ts.

- [ ] P.1 Секция: моно-подпись «What's next?» / «Что дальше?», крупный заголовок «Get In Touch» / «Свяжитесь со мной», 1-2 строки текста (открыт к предложениям, удалённо), большая ghost-кнопка `Say hello` → mailto, рядом SocialIcons. Центрировано, много воздуха.
- [ ] P.2 Проверка, сборка, коммит.

### Задача Q: Облако тегов навыков

**Files:** Skills.astro, новый src/scripts/skill-cloud.js.

- [ ] Q.1 Canvas-сфера тегов (vanilla, без библиотек, ~120 строк): теги на сфере (fibonacci-распределение), автовращение + доворот за курсором, размер/яркость по весу (3 уровня: Unity/C#/ECS·DOTS/Multiplayer крупные; средние — Jobs/Burst/оптимизация/архитектура/DI/тесты; мелкие — прочее), глубина = прозрачность. Высота ~380px.
- [ ] Q.2 Fallback: под canvas остаются текущие статичные теги, скрытые при активном JS (`html.js .skills-static { display:none }`); reduced-motion → статичные теги.
- [ ] Q.3 Проверка (вращение, вес, курсор), сборка, коммит.

### Задача R: Карточки проектов + акценты

**Files:** FeaturedCard.astro, ProjectPage.astro, 10 md (role/metrics правки), global.css.

- [ ] R.1 Платформы: бейджи с мини-иконками (inline SVG: монитор для PC/Steam, смартфон для Android/iOS) на обложке карточки (верхний правый угол, полупрозрачная тёмная подложка) — сразу видно PC+mobile.
- [ ] R.2 Роль кратко: "Unity Developer", "Senior Unity Developer", "Lead Unity Developer", "Tech Lead" — без скобок/уточнений (в md, обе локали).
- [ ] R.3 Метрики: максимум 2 на карточку. Пересмотр: days-after ["10M+ installs"] (+ "Live-ops" убрать? оставить 2: 10M+, Live-ops); dead-impact ["500K+ installs", "ECS/DOTS · 800K LoC"]; forsaken-kingdom ["Indie · solo development"/«Инди · соло-разработка»]; mafia-stories ["Refactoring & processes"/«Рефакторинг и процессы», "AI dev pipeline"/«AI-пайплайн разработки»]; last-wish ["Steam + VK Play", "Start Game finalist"]. RU зеркально.
- [ ] R.4 Акценты: жанровый тег — фиолетовая рамка/текст; платформенные бейджи — тил; метрики зелёные как были. Проверить «один доминирующий акцент на блок».
- [ ] R.5 Проверка (карточки собраны, не перегружены), сборка, коммит.

### Задача S: Редакторский проход

**Files:** все md, ui.ts, About.astro, README при необходимости.

- [ ] S.1 Убрать букву «ё» ВЕЗДЕ в RU-текстах (е вместо ё), включая ui.ts и md.
- [ ] S.2 Редакторская вычитка: единый тон, компоновка абзацев, паразитные повторы, длина taglines. Ничего не выдумывать.
- [ ] S.3 Проверка, сборка, коммит.

### Задача T: Карусель прототипов (ОТДЕЛЬНЫЙ КОММИТ, откатываемый)

**Files:** PrototypeGrid.astro.

- [ ] T.1 Горизонтальная карусель: CSS scroll-snap, карточки ~200px, стрелки ‹ › по краям (desktop), свайп (native scroll) на таче; градиентные затемнения по краям как подсказка продолжения; Car Junk первый. Модалка и hover-поведение сохраняются.
- [ ] T.2 Проверка UX на десктопе и мобильном; сборка; коммит строго один: `feat: prototype carousel (experiment, revert-friendly)`.

### Задача U: Финал

- [ ] U.1 Финальное интеграционное ревью (обе локали, мобильный, регрессии, вес, консоль).
- [ ] U.2 Merge → push → деплой (помнить про ложные таймауты Pages) → проверка прода → отчёт.
