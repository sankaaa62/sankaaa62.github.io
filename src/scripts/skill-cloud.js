// Q.1: интерактивное canvas-облако тегов навыков (vanilla, без библиотек).
// Fibonacci-сфера + автовращение + доворот за курсором; глубина -> размер/альфа.
// iter5 (V, доп.): инициализируется для всех безусловно — решение пользователя
// (2026-07-07) отменило любые гейты по системным настройкам моушена.
// IntersectionObserver/document.hidden паузы (ниже) остаются — это про
// производительность, а не про motion-политику.

/**
 * @typedef {{ text: string, tier: 1 | 2 | 3 }} SkillTag
 */

const TIER_COLOR = { 1: '255,92,26', 2: '232,230,225', 3: '154,151,163' };
const TIER_PX = { 1: 22, 2: 16, 3: 13 };
const TIER_WEIGHT = { 1: '700', 2: '500', 3: '400' };

// fix (P0): высота канваса зафиксирована в CSS (#skills-canvas { height: 380px }
// в Skills.astro) — дублируем то же число здесь. Нужно, чтобы уметь измерять
// целевой размер канваса ДО того, как он станет видимым (canvas.offsetHeight
// всегда 0, пока элемент display:none, а мы намеренно не показываем канвас
// раньше первого успешного кадра — см. init() ниже).
const CANVAS_HEIGHT = 380;

// fix: ctx.font не понимает CSS custom properties (var(--font-mono)) — canvas 2D
// тихо откатывается на дефолтный шрифт, если строка font не парсится как валидный
// CSS font-shorthand. Резолвим переменную один раз через getComputedStyle.
const FONT_FAMILY = (getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || "'JetBrains Mono Variable', ui-monospace, monospace").trim();

class SkillCloud {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {SkillTag[]} tags
   * @param {() => void} [onFirstDraw] вызывается один раз после первого успешного
   *   кадра (canvas имел ненулевой размер и реально что-то нарисовал) — на этом
   *   сигнале вызывающий код прячет статичный fallback-список, а не заранее.
   */
  constructor(canvas, tags, onFirstDraw) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tags = tags;
    this.points = this._fibonacciSphere(tags.length);
    this.rotX = 0.35; // легкий постоянный наклон по X
    this.rotY = 0;
    this.autoSpeed = 0.15; // рад/с вокруг Y
    this.targetTiltX = 0.35;
    this.targetSpeed = this.autoSpeed;
    this.pointerActive = false;
    this.running = false;
    this.rafId = 0;
    this.lastT = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // fix (P0): root cause — resize() умел молча закэшировать нулевой размер
    // (canvas.offsetWidth/Height === 0, если канвас на момент вызова ещё
    // display:none), и после этого сфера НИКОГДА не перерисовывалась с
    // правильным размером — единственный триггер переизмерения был window
    // 'resize', который не стреляет при обычном скролле/загрузке страницы.
    // Теперь resize() не перетирает валидные w/h нулями и явно помечает,
    // измерен ли канвас валидно (this.sized), чтобы вызывающий код мог
    // самовосстановиться (см. _tick) вместо вечной пустой отрисовки.
    this.sized = false;
    this.drawn = false; // true после первого успешного кадра
    this._onFirstDraw = onFirstDraw;

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._tick = this._tick.bind(this);

    this.resize();
    this._observeResize();
  }

  _fibonacciSphere(n) {
    const pts = [];
    const offset = 2 / n;
    const increment = Math.PI * (3 - Math.sqrt(5)); // золотой угол
    for (let i = 0; i < n; i++) {
      const y = (i * offset - 1) + offset / 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * increment;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;
      pts.push({ x, y, z });
    }
    return pts;
  }

  resize() {
    const c = this.canvas;
    // fix (P0): раньше ширину/высоту читали с самого канваса
    // (c.offsetWidth/offsetHeight), которые ВСЕГДА равны 0, пока у канваса
    // display:none — а мы намеренно держим канвас display:none до первого
    // успешного кадра (см. init(), onFirstDraw), чтобы не прятать статичный
    // список раньше времени. Поэтому измеряем ширину по РОДИТЕЛЮ (секции),
    // который отрисован и имеет реальный бокс независимо от видимости канваса
    // (canvas растягивается на 100% его ширины). Высота у канваса фиксированная
    // в CSS — берём той же константой (CANVAS_HEIGHT), не завязываясь на бокс
    // самого канваса.
    const parent = c.parentElement;
    const w = parent ? parent.clientWidth : c.offsetWidth;
    const h = CANVAS_HEIGHT;
    // Если ширины всё ещё нет (например, секция сама пока не имеет раскладки —
    // маловероятно, но проверяем), НЕ фиксируем нулевой размер как окончательный.
    // Оставляем предыдущий (валидный, если был) w/h/radius и просто помечаем,
    // что нужно переизмерить позже (см. _tick self-heal и ResizeObserver ниже).
    if (w <= 0 || h <= 0) {
      this.sized = false;
      return;
    }
    this.sized = true;
    c.width = Math.round(w * this.dpr);
    c.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.radius = Math.min(w, h) * 0.42;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  _observeResize() {
    // fix (P0, защита): ResizeObserver реагирует на ЛЮБОЕ изменение бокса
    // родителя (секции) — не только на resize окна браузера, как раньше — это
    // ловит смену ширины контейнера (брейкпоинты, сайдбар и т.п.) без ожидания
    // ручного ресайза окна пользователем. Наблюдаем именно за родителем, а не
    // за самим канвасом: пока канвас display:none, его собственный бокс всегда
    // {0,0}, и ResizeObserver на нём ничего полезного не даст.
    if (typeof ResizeObserver === 'undefined') return;
    const target = this.canvas.parentElement || this.canvas;
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(target);
  }

  attachPointer() {
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave);
  }

  _onPointerMove(e) {
    const r = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1; // -1..1
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1; // -1..1
    this.pointerActive = true;
    // доворот: X-наклон тянется к вертикальной позиции курсора, скорость
    // вращения по Y ускоряется/замедляется/разворачивается горизонтальной
    // позицией курсора. Значения капнуты, чтобы не улетать в дичь.
    this.targetTiltX = 0.35 + Math.max(-0.6, Math.min(0.6, -ny * 0.6));
    this.targetSpeed = Math.max(-0.6, Math.min(0.6, this.autoSpeed + nx * 0.45));
  }

  _onPointerLeave() {
    this.pointerActive = false;
    this.targetTiltX = 0.35;
    this.targetSpeed = this.autoSpeed;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;

    if (!document.hidden) {
      // fix (P0, self-heal): если канвас ещё не измерен валидно (size 0 —
      // именно так проявлялся баг у владельца сайта), пробуем переизмерить на
      // каждом кадре вместо того, чтобы вечно рисовать в 0×0 канвас. Как
      // только раскладка устаканится, sized станет true и сфера появится.
      if (!this.sized) this.resize();
      if (this.sized) {
        const LERP = 0.05;
        this.rotX += (this.targetTiltX - this.rotX) * LERP;
        this.rotY += this.targetSpeed * dt;
        this._draw();
        if (!this.drawn) {
          this.drawn = true;
          if (this._onFirstDraw) this._onFirstDraw();
        }
      }
    }
    this.rafId = requestAnimationFrame(this._tick);
  }

  _draw() {
    const { ctx, w, h, radius, tags, points, rotX, rotY } = this;
    ctx.clearRect(0, 0, w, h);

    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

    const projected = points.map((p, i) => {
      // вращение вокруг Y, затем вокруг X
      let x = p.x * cosY - p.z * sinY;
      let z = p.x * sinY + p.z * cosY;
      let y = p.y * cosX - z * sinX;
      z = p.y * sinX + z * cosX;
      return { x, y, z, tag: tags[i] };
    });

    // рисуем от дальних к ближним, чтобы передний план перекрывал задний
    projected.sort((a, b) => a.z - b.z);

    for (const p of projected) {
      const depth = (p.z + 1) / 2; // 0 (дальше) .. 1 (ближе)
      const scale = 0.55 + depth * 0.6;
      const alpha = 0.25 + depth * 0.75;
      const sx = w / 2 + p.x * radius;
      const sy = h / 2 + p.y * radius;
      const tier = p.tag.tier;
      const px = Math.round(TIER_PX[tier] * scale);
      ctx.font = `${TIER_WEIGHT[tier]} ${px}px ${FONT_FAMILY}`;
      ctx.fillStyle = `rgba(${TIER_COLOR[tier]},${alpha.toFixed(3)})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.tag.text, sx, sy);
    }
  }
}

(function init() {
  const section = document.getElementById('skills');
  const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('skills-canvas'));
  if (!section || !canvas) return;

  const dataAttr = canvas.getAttribute('data-tags');
  if (!dataAttr) return;
  /** @type {SkillTag[]} */
  const tags = JSON.parse(dataAttr);
  if (!tags.length) return;

  const staticList = section.querySelector('.skills-static');

  // fix (P0, ROOT CAUSE): раньше и «показать канвас», и «спрятать статичный
  // список» происходили безусловно сразу при инициализации скрипта — ДО
  // того, как сфера успевала хоть раз отрисоваться. Конструктор SkillCloud
  // сразу вызывает resize(), которая (в старой версии) читала
  // canvas.offsetWidth/offsetHeight; пока канвас ещё display:none (CSS-дефолт
  // в Skills.astro) — а он им и был на момент конструктора, — offsetWidth/
  // offsetHeight равны 0 → w=h=radius=0, canvas.width/height становились 0×0.
  // Дальше это НИЧЕМ не пересчитывалось (только слушатель window 'resize',
  // который не стреляет от обычной загрузки страницы/скролла) — сфера
  // оставалась нулевого размера НАВСЕГДА, а статичный список уже был спрятан.
  // Итог у владельца сайта: пустая секция. В headless-превью баг маскировался,
  // если инструмент программно менял viewport (это стреляет 'resize' и чинит
  // размер задним числом) — поэтому важно тестировать реальный флоу без
  // ручного вызова resize()/instantiation.
  //
  // Фикс: канвас остаётся display:none (и список — видимым) ровно до первого
  // РЕАЛЬНО успешного кадра (onFirstDraw ниже, вызывается из _tick только
  // когда this.sized === true и _draw() отработал). Само измерение размера
  // теперь не зависит от видимости канваса (resize() меряет родителя — см.
  // класс), поэтому можно мерить/готовить сферу, даже пока она не показана.
  // Если сфера по любой причине так и не сможет отрисоваться — .sr-only и
  // display:block сюда никогда не попадут, и пользователь увидит статичный
  // список вместо пустой секции.
  const cloud = new SkillCloud(canvas, tags, () => {
    canvas.style.display = 'block';
    section.classList.add('cloud-on');
    if (staticList) staticList.classList.add('sr-only');
  });
  // fix (review): доворот за курсором включаем только на hover-способных
  // устройствах с точным поинтером — на тач-устройствах pointermove стреляет
  // при скролле/свайпе и дергает сферу неожиданно для пользователя, листающего
  // страницу. На тач остается только чистое автовращение.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    cloud.attachPointer();
  }

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => cloud.resize(), 120);
  });

  // fix (P0): наблюдаем за СЕКЦИЕЙ, а не за канвасом. Пока канвас display:none
  // (до первого успешного кадра — см. выше), у него нет бокса, и
  // IntersectionObserver/getBoundingClientRect на самом канвасе никогда не
  // сработают — цикл _tick вообще не запустился бы, и сфера не смогла бы
  // сделать тот самый первый кадр (дедлок). Секция отрисована всегда.
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !document.hidden) cloud.start();
    else cloud.stop();
  }, { threshold: 0.01 }).observe(section);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cloud.stop();
    else if (section.getBoundingClientRect().top < innerHeight && section.getBoundingClientRect().bottom > 0) cloud.start();
  });

  // экспонируем инстанс для ручной верификации в headless/devtools (не используется рантаймом)
  window.__skillCloud = cloud;
})();
