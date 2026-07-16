const el = /** @type {HTMLElement | null} */ (document.getElementById('hero-type'));
if (el) {
  const roles = ['Senior Unity Developer', 'Team Lead', 'ECS/DOTS · Multiplayer', 'AI-driven development'];
  const TYPE_MS = 45;
  const ERASE_MS = 25;
  const PAUSE_MS = 1800;
  let roleIndex = 0;
  let charIndex = 0;

  // iter13 (задача CA, п.5): пока hero вне вьюпорта, цепочка setTimeout не
  // тикает - roleIndex/charIndex остаются обычными замыканиями (не сбрасываются
  // паузой), поэтому при возврате typewriter продолжает с того же места, а не
  // начинает роль заново. schedule() либо ставит настоящий таймер (видимо),
  // либо просто запоминает "что сделать дальше" (не видимо) - IO ниже вызывает
  // это напрямую при возврате в вьюпорт, без ожидания оставшейся задержки
  // (для typewriter-эффекта незаметно, зато без дрейфа/накопления времени).
  let visible = true;
  let pending = /** @type {(() => void) | null} */ (null);

  const schedule = (fn, ms) => {
    if (visible) setTimeout(fn, ms);
    else pending = fn;
  };

  function tick() {
    const current = roles[roleIndex];
    if (charIndex <= current.length) {
      el.textContent = current.slice(0, charIndex);
      charIndex++;
      schedule(tick, TYPE_MS);
    } else {
      schedule(erase, PAUSE_MS);
    }
  }

  function erase() {
    const current = roles[roleIndex];
    if (charIndex > 0) {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      schedule(erase, ERASE_MS);
    } else {
      roleIndex = (roleIndex + 1) % roles.length;
      schedule(tick, TYPE_MS);
    }
  }

  charIndex = 0;
  tick();

  const heroSection = el.closest('.hero-section');
  if (heroSection && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        visible = e.isIntersecting;
        if (visible && pending) {
          const fn = pending;
          pending = null;
          fn();
        }
      }
    }, { threshold: 0 });
    io.observe(heroSection);
  }
}
