// Задача OO (iter7): переключатель трех статичных SSR-вариантов секции Skills
// (A «Категории» / B «Созвездия» / C «Бегущие ряды»). Никакой отрисовки тут
// нет — все три варианта уже в разметке (Skills.astro), скрипт только
// показывает один и прячет остальные через display, и запоминает выбор.
// Без JS виден вариант A (инлайн style="display:none" у панелей B/C в
// разметке) — единственный источник правды для no-JS fallback.
(function () {
  const KEY = 'skills-variant';
  const VARIANTS = ['a', 'b', 'c'];
  const section = document.getElementById('skills');
  if (!section) return;

  const panels = section.querySelectorAll('[data-variant-panel]');
  const buttons = section.querySelectorAll('[data-variant-btn]');
  if (!panels.length || !buttons.length) return;

  function apply(variant) {
    panels.forEach((p) => {
      p.style.display = p.getAttribute('data-variant-panel') === variant ? '' : 'none';
    });
    buttons.forEach((b) => {
      const active = b.getAttribute('data-variant-btn') === variant;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }

  let stored = 'a';
  try {
    stored = localStorage.getItem(KEY) || 'a';
  } catch {
    // localStorage может быть недоступен (приватный режим / политики) — просто остаемся на 'a'
  }
  if (!VARIANTS.includes(stored)) stored = 'a';
  apply(stored);

  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      const variant = b.getAttribute('data-variant-btn');
      if (!variant) return;
      apply(variant);
      try { localStorage.setItem(KEY, variant); } catch { /* см. выше */ }
    });
  });
})();
