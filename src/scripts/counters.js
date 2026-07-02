const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    const target = +(/** @type {HTMLElement} */ (e.target).dataset.target);
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 1200);
      e.target.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
document.querySelectorAll('.counter').forEach((el) => io.observe(el));
