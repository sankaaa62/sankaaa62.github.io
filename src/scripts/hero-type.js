const el = /** @type {HTMLElement | null} */ (document.getElementById('hero-type'));
if (el) {
  const roles = ['Senior Unity Developer', 'Team Lead', 'ECS/DOTS · Multiplayer', 'AI-driven development'];
  const TYPE_MS = 45;
  const ERASE_MS = 25;
  const PAUSE_MS = 1800;
  let roleIndex = 0;
  let charIndex = 0;

  function tick() {
    const current = roles[roleIndex];
    if (charIndex <= current.length) {
      el.textContent = current.slice(0, charIndex);
      charIndex++;
      setTimeout(tick, TYPE_MS);
    } else {
      setTimeout(erase, PAUSE_MS);
    }
  }

  function erase() {
    const current = roles[roleIndex];
    if (charIndex > 0) {
      charIndex--;
      el.textContent = current.slice(0, charIndex);
      setTimeout(erase, ERASE_MS);
    } else {
      roleIndex = (roleIndex + 1) % roles.length;
      setTimeout(tick, TYPE_MS);
    }
  }

  charIndex = 0;
  tick();
}
