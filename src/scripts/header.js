// N.1: fixed header auto-hide — прячется при скролле вниз (после 80px), появляется
// при скролле вверх (с гистерезисом — см. UP_HYSTERESIS ниже, чтобы не дергаться
// у порога). rAF-троттлинг + passive listener (функциональный transition, не
// декоративный — оставляем и под reduced-motion).
// N.2: scroll-spy — активный пункт nav подсвечивается тиловой полоской (только
// на главной, где есть секции #about/#projects/#prototypes/#skills/#contact).
// На страницах проектов секций нет — IntersectionObserver просто не находит
// целей и ничего не делает; скрипт не должен ошибаться в этом случае.

const header = document.getElementById('site-header');

if (header) {
  const HIDE_THRESHOLD = 80;
  // a11y/UX fix (review): небольшой гистерезис на появление — прячем сразу при
  // скролле вниз, но показываем только после накопленного скролла вверх > 8px,
  // чтобы шапка не дергалась туда-обратно у порога (дрожащая рука/трекпад).
  const UP_HYSTERESIS = 8;
  let lastScrollY = window.scrollY;
  let upAccum = 0;
  let ticking = false;

  const show = () => {
    header.classList.remove('is-hidden');
    upAccum = 0;
  };

  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);

    if (y > lastScrollY) {
      upAccum = 0;
      if (y > HIDE_THRESHOLD) header.classList.add('is-hidden');
    } else if (y < lastScrollY) {
      upAccum += lastScrollY - y;
      if (upAccum > UP_HYSTERESIS) show();
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

  // a11y fix (review, CRITICAL): keyboard focus landing on a hidden header
  // (Tab from the top of the page, or Shift+Tab back into it) must reveal it —
  // otherwise a focused nav link is invisible/off-screen for keyboard users.
  // Reuses the same show() path as scroll-up so state (upAccum) stays consistent.
  header.addEventListener('focusin', show);

  update();
}

// N.2: scroll-spy (только там, где есть секции — homepage)
const sectionIds = ['about', 'projects', 'prototypes', 'skills', 'contact'];
const sections = sectionIds
  .map((id) => document.getElementById(id))
  .filter((el) => el !== null);

if (sections.length) {
  const navLinks = document.querySelectorAll('.site-nav a[data-section]');

  // AA.4: метеор в stars.js — дергаем при смене активной секции scroll-spy,
  // не чаще раза в METEOR_COOLDOWN мс (спека: "не чаще раза в несколько секунд").
  const METEOR_COOLDOWN = 4000;
  let currentActiveId = null;
  let lastMeteorAt = 0;

  const setActive = (id) => {
    if (id !== currentActiveId) {
      currentActiveId = id;
      const now = performance.now();
      if (now - lastMeteorAt > METEOR_COOLDOWN) {
        lastMeteorAt = now;
        window.dispatchEvent(new CustomEvent('meteor'));
      }
    }
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

  // fix (review, verified live): the last section (#contact) is followed by a
  // <footer>, so once the page is scrolled to its absolute bottom there's no
  // more room to push #contact into the IO's trigger band (rootMargin
  // -40%/-55%) — the observer never reports it intersecting there, leaving
  // nav with no .active link. Force the last section active whenever the
  // page is scrolled to (near) the bottom, overriding the IO in that case.
  const lastId = sectionIds[sectionIds.length - 1];
  let bottomTicking = false;
  const checkBottom = () => {
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) setActive(lastId);
    bottomTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!bottomTicking) {
      bottomTicking = true;
      requestAnimationFrame(checkBottom);
    }
  }, { passive: true });
  checkBottom();
}
