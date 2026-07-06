// N.1: fixed header auto-hide — прячется при скролле вниз (после 80px), появляется
// при любом скролле вверх. rAF-троттлинг + passive listener (функциональный
// transition, не декоративный — оставляем и под reduced-motion).
// N.2: scroll-spy — активный пункт nav подсвечивается тиловой полоской (только
// на главной, где есть секции #about/#projects/#prototypes/#skills/#contact).
// На страницах проектов секций нет — IntersectionObserver просто не находит
// целей и ничего не делает; скрипт не должен ошибаться в этом случае.

const header = document.getElementById('site-header');

if (header) {
  const HIDE_THRESHOLD = 80;
  let lastScrollY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);

    if (y > lastScrollY && y > HIDE_THRESHOLD) {
      header.classList.add('is-hidden');
    } else if (y < lastScrollY) {
      header.classList.remove('is-hidden');
    }

    lastScrollY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  // fix: rAF is paused while the tab/document is hidden (backgrounded), so a
  // scroll event that sets `ticking` right before backgrounding would never
  // get its update() run, leaving the header stuck in whatever state it had.
  // Re-sync as soon as the page becomes visible again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) update();
  });

  update();
}

// N.2: scroll-spy (только там, где есть секции — homepage)
const sectionIds = ['about', 'projects', 'prototypes', 'skills', 'contact'];
const sections = sectionIds
  .map((id) => document.getElementById(id))
  .filter((el) => el !== null);

if (sections.length) {
  const navLinks = document.querySelectorAll('.site-nav a[data-section]');

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.section === id);
    });
  };

  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) setActive(entry.target.id);
    }
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach((section) => spy.observe(section));
}
