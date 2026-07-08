// Орбиты: полностраничный звездный фон. АДАПТИРОВАНО (не импортировано) из
// src/scripts/stars.js основного сайта — сознательно скопировано, чтобы
// /orbit/ оставался полностью изолированной страницей (см. задание: "copy,
// don't import, to keep isolation"). Логика звезд/пружины/твинкла идентична
// оригиналу (уже настроена и проверена там); отличия: свой canvas id, свой
// глобальный хук для метеора (чтобы не пересекаться с основным сайтом,
// хотя обе страницы никогда не грузятся одновременно), и вызов метеора
// используется здесь при смене активной "эпохи" (см. orbit.js).

const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('orbit-stars-canvas'));

if (canvas) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

  const SMALL_SCREEN_W = 480;
  const STAR_CAP_DESKTOP = 150;
  const STAR_CAP_SMALL = 85;

  const ATTRACT_RADIUS2 = 22500; // 150px
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
        dx: 0, dy: 0,
        vx: 0, vy: 0,
        depth,
        r: 0.8 + depth * 4,
        baseAlpha: 0.45 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.0009 + Math.random() * 0.0012,
        sx: 0, sy: 0,
      };
    });
  };
  resize();
  const ensureSized = () => { if (!canvas.width || !canvas.height) resize(); };
  requestAnimationFrame(ensureSized);
  addEventListener('load', ensureSized, { once: true });

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });

  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener('mouseleave', () => { mouse.x = -1e4; mouse.y = -1e4; });
  window.addEventListener('blur', () => { mouse.x = -1e4; mouse.y = -1e4; });

  const spawnMeteor = () => {
    if (!w || !h) return;
    const fromLeft = Math.random() < 0.5;
    const dirX = fromLeft ? 1 : -1;
    const startX = fromLeft ? -30 : w + 30;
    const startY = Math.random() * h * 0.4;
    const angleDeg = 55 + Math.random() * 10;
    const angleRad = (angleDeg * Math.PI) / 180;
    const duration = 850 + Math.random() * 100;
    const travel = w * 1.25;
    const speed = travel / duration;
    meteors.push({
      x: startX, y: startY,
      vx: dirX * Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      age: 0, duration, trailMs: 130,
    });
  };
  window.__spawnOrbitMeteor = spawnMeteor;
  window.addEventListener('orbit-meteor', spawnMeteor);

  const drawMeteors = (dt) => {
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt; m.y += m.vy * dt; m.age += dt;
      if (m.age >= m.duration) { meteors.splice(i, 1); continue; }
      const t = m.age / m.duration;
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
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
  };

  const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const CENTER_MUL_MIN = 0.3;
  const CENTER_DIST_EXPONENT = 4 / 3;
  const centerAlphaMul = (sx, sy, cx, cy, maxDist) => {
    if (maxDist <= 0) return 1;
    const dist = Math.hypot(sx - cx, sy - cy);
    const t = Math.min(1, dist / maxDist) ** CENTER_DIST_EXPONENT;
    return CENTER_MUL_MIN + (1 - CENTER_MUL_MIN) * smoothstep(t);
  };

  const tick = (now) => {
    const dt = Math.min(48, now - lastFrameTime);
    lastFrameTime = now;
    const scrollY = window.scrollY;
    const centerX = w / 2, centerY = h / 2;
    const maxDist = Math.hypot(centerX, centerY);

    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      const mdx = mouse.x - s.sx, mdy = mouse.y - s.sy;
      const d2 = mdx * mdx + mdy * mdy;
      let ax = 0, ay = 0;
      if (d2 < ATTRACT_RADIUS2) {
        ax += mdx / ATTRACT_DIVISOR;
        ay += mdy / ATTRACT_DIVISOR;
      }
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
      sy = ((sy % h) + h) % h;

      s.sx = sx; s.sy = sy;
      const centerMul = centerAlphaMul(sx, sy, centerX, centerY, maxDist);
      s.centerMul = centerMul;

      const twinkle = 0.55 + 0.45 * Math.sin(now * s.twinkleSpeed + s.twinklePhase);
      ctx.fillStyle = `rgba(232,230,225,${(s.baseAlpha * twinkle * centerMul).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

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
