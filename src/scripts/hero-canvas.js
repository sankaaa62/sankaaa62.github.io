const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('hero-canvas'));
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
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
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = -1e4; mouse.y = -1e4; });
  const tick = () => {
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
  };
  let running = false, rafId;
  const loop = () => { tick(); rafId = requestAnimationFrame(loop); };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; loop(); }
    else if (!entry.isIntersecting && running) { running = false; cancelAnimationFrame(rafId); }
  }).observe(canvas);
}
