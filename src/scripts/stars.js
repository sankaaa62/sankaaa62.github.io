// AA: полностраничный звездный фон. Раньше (hero-canvas.js) частицы жили только
// внутри hero-секции; теперь canvas — fixed-слой на весь вьюпорт (см. Base.astro,
// #stars-canvas), звезды видны на любой прокрутке и любой странице.
//
// Модель на звезду:
// - home{x,y} — «домашняя» точка в системе координат вьюпорта (не зависит от скролла).
// - displace{x,y}/velocity — пружинное отклонение от home (курсор тянет, пружина
//   и демпфирование возвращают обратно) — считается в экранных координатах,
//   поэтому притяжение мышью всегда соответствует тому, что реально нарисовано.
// - wander — маленький синусоидальный дрейф поверх пружины (никогда не сходится
//   в ноль, звезды всегда чуть «дышат»), свой per-star фазовый сдвиг.
// - twinkle — независимая синусоида яркости.
// - depth (0.15–0.35) — коэффициент скролл-параллакса k: рендер-Y дополнительно
//   смещается на scrollY*k и заворачивается по модулю высоты вьюпорта, поэтому
//   поле звезд не пустеет при скролле (глубокий слой отстает от контента).
//
// Метеор: window.__spawnMeteor() и событие 'meteor' на window — короткий яркий
// штрих, пролетающий верхние ~40% экрана со случайной стороны. header.js дергает
// это при смене активной секции scroll-spy (не чаще раза в 4с).

const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('stars-canvas'));

if (canvas) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

  const SMALL_SCREEN_W = 480;
  const STAR_CAP_DESKTOP = 140;
  const STAR_CAP_SMALL = 80;

  const ATTRACT_RADIUS2 = 22500; // 150px
  // AA.3: подобрано численно (см. scratchpad/tune-stars.js) так, чтобы при
  // typичном расстоянии курсора (~50-140px) звезда заметно отклонялась
  // (12-34px) — слабее, чем безрессорный hero-canvas (там смещение
  // накапливалось без ограничения), но не исчезающе мало — и полностью
  // возвращалась домой (<0.01px) за ~3с после ухода курсора.
  const ATTRACT_DIVISOR = 200;
  const SPRING_K = 0.015;
  const DAMPING = 0.90;
  const WANDER_AMPLITUDE = 7; // px
  const WANDER_SPEED = 0.00055; // рад/мс

  let w = 0, h = 0;
  /** @type {Array<any>} */
  let stars = [];
  const mouse = { x: -1e4, y: -1e4 };
  const meteors = [];
  let lastFrameTime = performance.now();

  const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const cap = w <= SMALL_SCREEN_W ? STAR_CAP_SMALL : STAR_CAP_DESKTOP;
    const count = Math.min(cap, Math.round((w * h) / 9000));
    stars = Array.from({ length: count }, () => {
      const depth = 0.15 + Math.random() * 0.2; // 0.15..0.35
      return {
        homeX: Math.random() * w,
        homeY: Math.random() * h,
        dx: 0, dy: 0, // displace from home
        vx: 0, vy: 0,
        depth,
        r: 0.8 + depth * 4,
        baseAlpha: 0.45 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.0009 + Math.random() * 0.0012,
        // экранные координаты — заполняются в tick(), нужны для линий-созвездий
        sx: 0, sy: 0,
      };
    });
  };
  resize();
  // защита от гонки при инициализации (типовой баг с canvas-размером:
  // window.innerWidth/innerHeight иногда еще 0 в момент разбора скрипта) —
  // перемеряем на следующем кадре и на 'load', если размер не устаканился.
  const ensureSized = () => { if (!canvas.width || !canvas.height) resize(); };
  requestAnimationFrame(ensureSized);
  addEventListener('load', ensureSized, { once: true });

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });

  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
  }, { passive: true });
  document.addEventListener('mouseleave', () => { mouse.x = -1e4; mouse.y = -1e4; });
  window.addEventListener('blur', () => { mouse.x = -1e4; mouse.y = -1e4; });

  // --- метеор ---
  const spawnMeteor = () => {
    if (!w || !h) return;
    const fromLeft = Math.random() < 0.5;
    const dirX = fromLeft ? 1 : -1;
    const startX = fromLeft ? -30 : w + 30;
    const startY = Math.random() * h * 0.4; // верхние 40%
    const angleDeg = 55 + Math.random() * 10; // 55-65°
    const angleRad = (angleDeg * Math.PI) / 180;
    const duration = 850 + Math.random() * 100; // ~0.9s
    const travel = w * 1.25;
    const speed = travel / duration; // px/ms
    meteors.push({
      x: startX, y: startY,
      vx: dirX * Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      age: 0,
      duration,
      trailMs: 130,
    });
  };
  window.__spawnMeteor = spawnMeteor;
  window.addEventListener('meteor', spawnMeteor);
  // iter7 (п.2, верификация): читает текущие множители альфы звезд по расстоянию
  // от центра вьюпорта — без этого пришлось бы сэмплить пиксели canvas вручную.
  window.__starsCenterMuls = () => stars.map((s) => ({ sx: s.sx, sy: s.sy, centerMul: s.centerMul }));

  const drawMeteors = (dt) => {
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt; m.y += m.vy * dt; m.age += dt;
      if (m.age >= m.duration) { meteors.splice(i, 1); continue; }
      const t = m.age / m.duration;
      // fade-in первые 15%, держим, fade-out последние 35%
      let alpha = 1;
      if (t < 0.15) alpha = t / 0.15;
      else if (t > 0.65) alpha = 1 - (t - 0.65) / 0.35;
      alpha = Math.max(0, Math.min(1, alpha));
      const tailX = m.x - m.vx * m.trailMs;
      const tailY = m.y - m.vy * m.trailMs;
      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(255,255,255,${(0.85 * alpha).toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(m.x, m.y); ctx.stroke();
      // яркая головка
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  };

  // iter7 (п.2): звезды у центра вьюпорта бледнее, чтобы не спорить с текстом
  // поверх них. smoothstep сглаживает переход (плавный градиент вместо
  // ступеньки на границе); множитель применяется и к самой звезде, и к линиям
  // созвездий (среднее двух множителей), пересчитывается каждый кадр от
  // текущих sx/sy — дешево (одно extra умножение на звезду).
  const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const centerAlphaMul = (sx, sy, cx, cy, maxDist) => {
    if (maxDist <= 0) return 1;
    const dist = Math.hypot(sx - cx, sy - cy);
    return 0.4 + 0.6 * smoothstep(dist / maxDist);
  };

  const tick = (now) => {
    const dt = Math.min(48, now - lastFrameTime); // clamp против табов на фоне
    lastFrameTime = now;
    const scrollY = window.scrollY;
    const centerX = w / 2, centerY = h / 2;
    const maxDist = Math.hypot(centerX, centerY); // расстояние центр→угол вьюпорта

    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      // fix: притяжение курсора сравнивается с РЕАЛЬНО нарисованной на прошлом
      // кадре позицией (s.sx/s.sy, уже включает wander + scrollY*depth параллакс
      // + заворот) — не с "домашней" homeX+dx. Иначе при любом скролле
      // курсор считался бы смещенным от звезды на scrollY*depth px (при
      // глубоком скролле — сотни px), и притяжение переставало бы совпадать
      // с тем, что видно на экране.
      const mdx = mouse.x - s.sx, mdy = mouse.y - s.sy;
      const d2 = mdx * mdx + mdy * mdy;
      let ax = 0, ay = 0;
      if (d2 < ATTRACT_RADIUS2) {
        ax += mdx / ATTRACT_DIVISOR;
        ay += mdy / ATTRACT_DIVISOR;
      }
      // пружина к дому + демпфирование
      ax -= s.dx * SPRING_K;
      ay -= s.dy * SPRING_K;
      s.vx = (s.vx + ax) * DAMPING;
      s.vy = (s.vy + ay) * DAMPING;
      s.dx += s.vx * (dt / 16.7);
      s.dy += s.vy * (dt / 16.7);

      const wanderX = Math.sin(now * WANDER_SPEED + s.phase) * WANDER_AMPLITUDE;
      const wanderY = Math.cos(now * WANDER_SPEED * 0.8 + s.phase) * WANDER_AMPLITUDE;

      const sx = s.homeX + s.dx + wanderX;
      let sy = s.homeY + s.dy + wanderY + scrollY * s.depth;
      sy = ((sy % h) + h) % h; // заворот по вертикали

      s.sx = sx; s.sy = sy;
      s.centerMul = centerAlphaMul(sx, sy, centerX, centerY, maxDist);

      const twinkle = 0.55 + 0.45 * Math.sin(now * s.twinkleSpeed + s.twinklePhase);
      ctx.fillStyle = `rgba(232,230,225,${(s.baseAlpha * twinkle * s.centerMul).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // линии-созвездия между близкими звездами (чуть тише, чем в hero-canvas)
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i], b = stars[j];
        const dd2 = (a.sx - b.sx) ** 2 + (a.sy - b.sy) ** 2;
        if (dd2 < 7200) {
          const lineMul = (a.centerMul + b.centerMul) / 2;
          ctx.strokeStyle = `rgba(154,151,163,${((1 - dd2 / 7200) * 0.18 * lineMul).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
        }
      }
    }

    drawMeteors(dt);

    rafId = requestAnimationFrame(tick);
  };

  let rafId = requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  });
}
