// Орбиты: интерактив страницы /orbit/ — независимый от основного сайта скрипт.
// 1) IntersectionObserver подсвечивает активную эпоху (веху карьеры) по мере
//    прокрутки — планеты этой секции "оживают" (см. .is-active в orbit.css),
//    остальные притушены. При входе в новую эпоху — редкий метеор (переиспользуем
//    прием основного сайта, но со своим хуком, см. orbit-stars.js).
// 2) Клик по планете разворачивает/сворачивает карточку с деталями проекта.
// 3) Клик по астероиду (прототипу) открывает легкую модалку с иконкой/клипом.

(() => {
  const stages = Array.from(document.querySelectorAll('.orbit-stage'));
  let lastMeteorAt = 0;

  if (stages.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = /** @type {HTMLElement} */ (entry.target);
          const wasActive = el.classList.contains('is-active');
          if (entry.isIntersecting) {
            el.classList.add('is-active');
            if (!wasActive) {
              const now = performance.now();
              if (now - lastMeteorAt > 3000 && typeof window.__spawnOrbitMeteor === 'function') {
                window.__spawnOrbitMeteor();
                lastMeteorAt = now;
              }
            }
          } else {
            el.classList.remove('is-active');
          }
        }
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 }
    );
    stages.forEach((s) => io.observe(s));
  } else {
    // без IntersectionObserver — просто показываем все эпохи активными
    stages.forEach((s) => s.classList.add('is-active'));
  }

  // --- планеты: разворачивание деталей ------------------------------------
  const planetCards = Array.from(document.querySelectorAll('.planet-card'));
  const closeAllExcept = (except) => {
    planetCards.forEach((card) => {
      if (card !== except) {
        card.classList.remove('is-expanded');
        const btn = card.querySelector('.planet, .planet-expand-btn[aria-expanded]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  };

  planetCards.forEach((card) => {
    const triggers = card.querySelectorAll('[data-planet-toggle]');
    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const willExpand = !card.classList.contains('is-expanded');
        closeAllExcept(willExpand ? card : null);
        card.classList.toggle('is-expanded', willExpand);
        triggers.forEach((t) => t.setAttribute('aria-expanded', String(willExpand)));
      });
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllExcept(null);
  });

  // --- рой прототипов: модалка ---------------------------------------------
  const modal = /** @type {HTMLDialogElement | null} */ (document.getElementById('orbit-proto-modal'));
  if (modal) {
    const titleEl = modal.querySelector('.opm-title');
    const metaEl = modal.querySelector('.opm-meta');
    const badgeEl = modal.querySelector('.opm-badge');
    const imgEl = /** @type {HTMLImageElement} */ (modal.querySelector('.opm-icon'));
    const videoEl = /** @type {HTMLVideoElement} */ (modal.querySelector('.opm-video'));
    const closeBtn = modal.querySelector('.opm-close');

    const openFromAsteroid = (el) => {
      const { title, genre, year, icon, clip, poster, badge } = el.dataset;
      if (titleEl) titleEl.textContent = title || '';
      if (metaEl) metaEl.textContent = [genre, year].filter(Boolean).join(' · ');
      if (badgeEl) {
        if (badge) { badgeEl.textContent = badge; badgeEl.style.display = 'block'; }
        else { badgeEl.textContent = ''; badgeEl.style.display = 'none'; }
      }
      if (clip) {
        videoEl.setAttribute('poster', poster || '');
        videoEl.querySelector('source')?.remove();
        const source = document.createElement('source');
        source.src = clip; source.type = 'video/webm';
        videoEl.appendChild(source);
        videoEl.load();
        videoEl.style.display = 'block';
        imgEl.style.display = 'none';
        videoEl.play().catch(() => {});
      } else {
        videoEl.style.display = 'none';
        imgEl.src = icon || '';
        imgEl.style.display = 'block';
      }
      modal.showModal();
    };

    const closeModal = () => {
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.querySelector('source')?.remove();
      modal.close();
    };

    document.querySelectorAll('.asteroid').forEach((el) => {
      el.addEventListener('click', () => openFromAsteroid(el));
    });
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modal.addEventListener('close', () => {
      videoEl.pause();
      videoEl.removeAttribute('src');
    });
  }
})();
