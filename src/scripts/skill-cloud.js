// Q.1: интерактивное canvas-облако тегов навыков (vanilla, без библиотек).
// Fibonacci-сфера + автовращение + доворот за курсором; глубина -> размер/альфа.
// iter5 (V): инициализируется для всех, включая prefers-reduced-motion —
// автовращение сферы не вестибулярный триггер (не курсор/скролл-параллакс и
// не keyframes-дрейф фона), так что под новую политику движения не гейтится.
// IntersectionObserver/document.hidden паузы (ниже) остаются — это про
// производительность, а не про motion-политику.

/**
 * @typedef {{ text: string, tier: 1 | 2 | 3 }} SkillTag
 */

const TIER_COLOR = { 1: '255,92,26', 2: '232,230,225', 3: '154,151,163' };
const TIER_PX = { 1: 22, 2: 16, 3: 13 };
const TIER_WEIGHT = { 1: '700', 2: '500', 3: '400' };

// fix: ctx.font не понимает CSS custom properties (var(--font-mono)) — canvas 2D
// тихо откатывается на дефолтный шрифт, если строка font не парсится как валидный
// CSS font-shorthand. Резолвим переменную один раз через getComputedStyle.
const FONT_FAMILY = (getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || "'JetBrains Mono Variable', ui-monospace, monospace").trim();

class SkillCloud {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {SkillTag[]} tags
   */
  constructor(canvas, tags) {
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

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._tick = this._tick.bind(this);

    this.resize();
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
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    c.width = Math.round(w * this.dpr);
    c.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.radius = Math.min(w, h) * 0.42;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
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
      const LERP = 0.05;
      this.rotX += (this.targetTiltX - this.rotX) * LERP;
      this.rotY += this.targetSpeed * dt;
      this._draw();
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

  const cloud = new SkillCloud(canvas, tags);
  // fix (review): доворот за курсором включаем только на hover-способных
  // устройствах с точным поинтером — на тач-устройствах pointermove стреляет
  // при скролле/свайпе и дергает сферу неожиданно для пользователя, листающего
  // страницу. На тач остается только чистое автовращение.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    cloud.attachPointer();
  }

  canvas.style.display = 'block';
  section.classList.add('cloud-on');
  // fix (review): вместо дублирующего CSS-правила #skills.cloud-on .skills-static
  // переиспользуем существующую утилиту .sr-only — список остается в DOM/для
  // скринридеров, но визуально скрыт, т.к. canvas теперь показывает то же самое.
  const staticList = section.querySelector('.skills-static');
  if (staticList) staticList.classList.add('sr-only');

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => cloud.resize(), 120);
  });

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !document.hidden) cloud.start();
    else cloud.stop();
  }, { threshold: 0.01 }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cloud.stop();
    else if (canvas.getBoundingClientRect().top < innerHeight && canvas.getBoundingClientRect().bottom > 0) cloud.start();
  });

  // экспонируем инстанс для ручной верификации в headless/devtools (не используется рантаймом)
  window.__skillCloud = cloud;
})();
