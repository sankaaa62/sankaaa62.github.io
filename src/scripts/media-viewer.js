// Итерация 9 (п.5 YE): общий движок Steam-стиля медиа-вьювера, вынесенный
// из MediaViewer.astro. Раньше вся логика (renderStage/setActive/лайтбокс)
// жила в <script> компонента и обслуживала только SSR-разметку страниц
// проектов — теперь ее используют оба места: страницы проектов (SSR-разметка,
// см. attachViewer ниже) и модалка прототипов (PrototypeGrid.astro), которая
// строит вьювер на клиенте через buildViewer() и тоже вызывает attachViewer().
//
// Заодно этот вынос лечит баг "картинки в стейдже жмутся в угол": элементы,
// созданные тут через document.createElement, не несут Astro-scoped атрибут
// (data-astro-cid-*), поэтому старые scoped-стили MediaViewer.astro на них не
// действовали — фикс сделан в MediaViewer.astro (style is:global), не здесь.

const YT_ORIGIN = 'https://www.youtube-nocookie.com';

/**
 * Строит DOM-разметку вьювера (те же классы, что и SSR-версия в
 * MediaViewer.astro: media-viewer/mv-stage/mv-strip-wrap/mv-strip/mv-thumb/
 * mv-arrow--prev|next/mv-lightbox) из плейлиста и возвращает корневой
 * элемент — вызывающий сам вставляет его в DOM и вызывает attachViewer().
 *
 * playlist: массив { kind: 'video'|'youtube'|'image', src, id, poster }
 * labels: { prev, next, close, prevShot, nextShot, video, screenshot, title? }
 *   (prev/next — стрелки ленты, close/prevShot/nextShot — кнопки лайтбокса,
 *   video/screenshot — префиксы подписей миниатюр "Видео N"/"скриншот N",
 *   title — опционально, имя проекта/прототипа для aria-label и alt)
 */
export function buildViewer(playlist, labels) {
  const root = document.createElement('div');
  root.className = 'media-viewer';
  if (labels.title) root.dataset.title = labels.title;

  const stage = document.createElement('div');
  stage.className = 'mv-stage';
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', labels.title ? `${labels.title} — media viewer` : 'media viewer');
  root.appendChild(stage);

  const stripWrap = document.createElement('div');
  stripWrap.className = 'mv-strip-wrap';

  const prevArrow = document.createElement('button');
  prevArrow.type = 'button';
  prevArrow.className = 'mv-arrow mv-arrow--prev';
  prevArrow.setAttribute('aria-label', labels.prev);
  prevArrow.textContent = '‹';

  const strip = document.createElement('div');
  strip.className = 'mv-strip';

  const titlePrefix = labels.title ? `${labels.title} — ` : '';
  let videoCounter = 0;
  let imageCounter = 0;
  playlist.forEach((item, i) => {
    let itemLabel;
    if (item.kind === 'image') {
      imageCounter += 1;
      itemLabel = `${labels.screenshot} ${imageCounter}`;
    } else {
      videoCounter += 1;
      itemLabel = `${labels.video} ${videoCounter}`;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = i === 0 ? 'mv-thumb is-active' : 'mv-thumb';
    btn.dataset.index = String(i);
    btn.dataset.kind = item.kind;
    btn.dataset.src = item.src;
    btn.dataset.id = item.id;
    btn.dataset.poster = item.poster;
    btn.setAttribute('aria-label', `${titlePrefix}${itemLabel}`);

    if (item.kind === 'image' || item.kind === 'youtube') {
      const img = document.createElement('img');
      img.src = item.kind === 'image' ? item.src : item.poster;
      img.loading = 'lazy';
      img.alt = '';
      btn.appendChild(img);
    } else if (item.poster) {
      const img = document.createElement('img');
      img.src = item.poster;
      img.loading = 'lazy';
      img.alt = '';
      btn.appendChild(img);
    } else {
      const blank = document.createElement('span');
      blank.className = 'mv-thumb-blank';
      blank.setAttribute('aria-hidden', 'true');
      btn.appendChild(blank);
    }
    if (item.kind !== 'image') {
      const play = document.createElement('span');
      play.className = 'mv-play';
      play.setAttribute('aria-hidden', 'true');
      play.textContent = '▶';
      btn.appendChild(play);
    }
    strip.appendChild(btn);
  });

  const nextArrow = document.createElement('button');
  nextArrow.type = 'button';
  nextArrow.className = 'mv-arrow mv-arrow--next';
  nextArrow.setAttribute('aria-label', labels.next);
  nextArrow.textContent = '›';

  stripWrap.appendChild(prevArrow);
  stripWrap.appendChild(strip);
  stripWrap.appendChild(nextArrow);
  root.appendChild(stripWrap);

  const lightbox = document.createElement('dialog');
  lightbox.className = 'mv-lightbox';

  const lbClose = document.createElement('button');
  lbClose.type = 'button';
  lbClose.className = 'mv-lb-close';
  lbClose.setAttribute('aria-label', labels.close);
  lbClose.textContent = '✕';

  const lbPrev = document.createElement('button');
  lbPrev.type = 'button';
  lbPrev.className = 'mv-lb-prev';
  lbPrev.setAttribute('aria-label', labels.prevShot);
  lbPrev.textContent = '‹';

  const lbImage = document.createElement('img');
  lbImage.className = 'mv-lb-image';
  lbImage.src = '';
  lbImage.alt = '';
  lbImage.decoding = 'async';

  const lbNext = document.createElement('button');
  lbNext.type = 'button';
  lbNext.className = 'mv-lb-next';
  lbNext.setAttribute('aria-label', labels.nextShot);
  lbNext.textContent = '›';

  lightbox.appendChild(lbClose);
  lightbox.appendChild(lbPrev);
  lightbox.appendChild(lbImage);
  lightbox.appendChild(lbNext);
  root.appendChild(lightbox);

  return root;
}

/**
 * Вешает поведение вьювера на уже существующую разметку (SSR или только
 * что вставленную buildViewer()). opts:
 *  - slideshowMs: интервал автопрокрутки картинок (видео/youtube ждут своего
 *    события окончания, см. ниже); без опции слайдшоу выключено.
 *  - renderFirst: true для разметки от buildViewer() — ее стейдж изначально
 *    пуст, первый слайд нужно отрисовать явно (см. низ функции). SSR-разметка
 *    страниц проектов уже содержит первый слайд — renderFirst не передается.
 * Возвращает { destroy } — снимает свои window-слушатели и таймер слайдшоу
 * (используется модалкой прототипов при закрытии/переоткрытии с новым плейлистом).
 */
export function attachViewer(root, opts = {}) {
  const stage = root.querySelector('.mv-stage');
  const thumbs = Array.from(root.querySelectorAll('.mv-thumb'));
  const strip = root.querySelector('.mv-strip');
  const prevArrow = root.querySelector('.mv-arrow--prev');
  const nextArrow = root.querySelector('.mv-arrow--next');
  const lightbox = root.querySelector('.mv-lightbox');
  const lbImage = root.querySelector('.mv-lb-image');
  const lbClose = root.querySelector('.mv-lb-close');
  const lbPrev = root.querySelector('.mv-lb-prev');
  const lbNext = root.querySelector('.mv-lb-next');
  const title = root.dataset.title ?? '';

  if (!stage || thumbs.length === 0) return { destroy() {} };

  let active = 0;
  let destroyed = false;
  // youtube-iframe текущего слайда — нужен, чтобы в обработчике 'message'
  // отличать событие "своего" iframe от возможного другого вьювера,
  // одновременно слушающего window (на практике одновременно живет максимум
  // один вьювер, но проверка дешевая и снимает риск на будущее)
  let currentYoutubeFrame = null;

  const readItem = (btn) => ({
    kind: btn.dataset.kind ?? 'image',
    src: btn.dataset.src ?? '',
    id: btn.dataset.id ?? '',
    poster: btn.dataset.poster ?? '',
  });

  const imageIndices = thumbs
    .map((btn, i) => (btn.dataset.kind === 'image' ? i : -1))
    .filter((i) => i >= 0);

  let lbCurrent = 0;
  let previousOverflow = '';

  const showLightbox = (posInImages) => {
    if (!lightbox || !lbImage || imageIndices.length === 0) return;
    lbCurrent = (posInImages + imageIndices.length) % imageIndices.length;
    const btn = thumbs[imageIndices[lbCurrent]];
    lbImage.src = btn.dataset.src ?? '';
    lbImage.alt = title;
  };

  const openLightbox = (thumbIndex) => {
    const pos = imageIndices.indexOf(thumbIndex);
    if (pos === -1 || !lightbox) return;
    showLightbox(pos);
    if (!lightbox.open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      lightbox.showModal();
    }
  };

  // --- слайдшоу ---------------------------------------------------------
  let slideTimer = null;
  const stopSlide = () => {
    if (slideTimer) {
      clearTimeout(slideTimer);
      slideTimer = null;
    }
  };
  const scheduleSlide = () => {
    stopSlide();
    if (!opts.slideshowMs || destroyed) return;
    const item = readItem(thumbs[active]);
    // картинки листаем по таймеру; видео/youtube ждут своего события
    // окончания (video 'ended' / youtube postMessage onStateChange===0,
    // см. renderStage ниже) — там advanceAuto() вызывается напрямую
    if (item.kind === 'image') slideTimer = setTimeout(() => advanceAuto(), opts.slideshowMs);
  };
  const advanceAuto = () => {
    if (destroyed || !opts.slideshowMs) return;
    // Пауза: скрытая вкладка или открытый лайтбокс — стейдж не должен
    // уехать у пользователя из-под увеличенной картинки. Ретрай — тем же
    // интервалом, БЕЗУСЛОВНЫМ setTimeout (не через scheduleSlide — та
    // планирует таймер только для картинок, а сюда можно попасть и от
    // video 'ended'/youtube-события на видео-слайде).
    if (document.hidden || (lightbox && lightbox.open)) {
      stopSlide();
      slideTimer = setTimeout(() => advanceAuto(), opts.slideshowMs);
      return;
    }
    setActive((active + 1) % thumbs.length, true, true);
  };

  // --- лайтбокс -----------------------------------------------------------
  lbClose?.addEventListener('click', () => lightbox?.close());
  lbPrev?.addEventListener('click', () => showLightbox(lbCurrent - 1));
  lbNext?.addEventListener('click', () => showLightbox(lbCurrent + 1));
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.close();
  });
  lightbox?.addEventListener('close', () => {
    if (lbImage) lbImage.src = '';
    document.body.style.overflow = previousOverflow;
    // закрытие лайтбокса возвращает слайдшоу к жизни — перезапуск таймера
    scheduleSlide();
  });
  lightbox?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showLightbox(lbCurrent - 1);
    else if (e.key === 'ArrowRight') showLightbox(lbCurrent + 1);
  });

  // Первый элемент плейлиста, если это картинка, может быть уже отрисован
  // на сервере (SSR-разметка страниц проектов) — renderStage() ниже его не
  // создает и не навешивает клик-зум, поэтому вешаем его отдельно на уже
  // существующий <img>. Для разметки от buildViewer() (модалка прототипов)
  // стейдж изначально пуст — тут просто ничего не найдется.
  const initialImg = stage.querySelector('img');
  if (initialImg && thumbs[0]?.dataset.kind === 'image') {
    initialImg.style.cursor = 'zoom-in';
    initialImg.addEventListener('click', () => openLightbox(0));
  }

  const onYoutubeMessage = (e) => {
    if (e.origin !== YT_ORIGIN || !currentYoutubeFrame || e.source !== currentYoutubeFrame.contentWindow) return;
    let data;
    try {
      data = JSON.parse(e.data);
    } catch {
      return;
    }
    // onStateChange info === 0 — видео на youtube доиграло до конца
    if (data.event === 'onStateChange' && data.info === 0) advanceAuto();
  };
  window.addEventListener('message', onYoutubeMessage);

  const renderStage = (item, autoplay, mutedAuto) => {
    stage.innerHTML = '';
    currentYoutubeFrame = null;
    if (item.kind === 'video') {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      if (item.poster) video.poster = item.poster;
      const source = document.createElement('source');
      source.src = item.src;
      source.type = 'video/webm';
      video.appendChild(source);
      video.addEventListener('ended', () => advanceAuto());
      stage.appendChild(video);
      if (autoplay) {
        if (mutedAuto) {
          // авто-продвижение слайдшоу без пользовательского жеста — играем
          // сразу приглушенно (иначе браузер молча откажет в play())
          video.muted = true;
          video.play().catch(() => {});
        } else {
          // явный клик пользователя = user gesture — разрешает автоплей
          // СО ЗВУКОМ; fallback на приглушенный, если браузер все равно
          // откажет (нестандартные политики)
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      }
    } else if (item.kind === 'youtube') {
      const iframe = document.createElement('iframe');
      const params = new URLSearchParams({ enablejsapi: '1' });
      if (autoplay) params.set('autoplay', '1');
      iframe.src = `${YT_ORIGIN}/embed/${item.id}?${params.toString()}`;
      iframe.title = title;
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.addEventListener('load', () => {
        iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'mv' }), '*');
      });
      currentYoutubeFrame = iframe;
      stage.appendChild(iframe);
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = title;
      img.decoding = 'async';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        const idx = thumbs.findIndex((b) => b.dataset.kind === 'image' && b.dataset.src === item.src);
        if (idx !== -1) openLightbox(idx);
      });
      stage.appendChild(img);
    }
  };

  const setActive = (index, autoplay, mutedAuto) => {
    index = Math.max(0, Math.min(thumbs.length - 1, index));
    thumbs[active]?.classList.remove('is-active');
    active = index;
    thumbs[active].classList.add('is-active');
    thumbs[active].scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    renderStage(readItem(thumbs[active]), autoplay, mutedAuto);
    // и ручной выбор, и авто-переход одинаково перезапускают таймер слайдшоу
    scheduleSlide();
  };

  thumbs.forEach((btn, i) => {
    btn.addEventListener('click', () => setActive(i, true));
  });

  stage.addEventListener('keydown', (e) => {
    if (document.activeElement !== stage) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActive(active - 1, true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActive(active + 1, true);
    }
  });

  const updateArrows = () => {
    if (!strip || !prevArrow || !nextArrow) return;
    const overflow = strip.scrollWidth > strip.clientWidth + 1;
    prevArrow.classList.toggle('has-overflow', overflow);
    nextArrow.classList.toggle('has-overflow', overflow);
  };
  updateArrows();
  window.addEventListener('resize', updateArrows);

  prevArrow?.addEventListener('click', () => strip?.scrollBy({ left: -240, behavior: 'smooth' }));
  nextArrow?.addEventListener('click', () => strip?.scrollBy({ left: 240, behavior: 'smooth' }));

  if (opts.renderFirst) {
    // Разметка от buildViewer() (модалка прототипов) — стейдж пуст, первый
    // слайд рисуем сами. Раньше первое видео модалки играло приглушенно
    // сразу при открытии — сохраняем то же поведение (autoplay+mutedAuto).
    setActive(0, true, true);
  } else {
    // SSR-случай (страницы проектов) — первый слайд уже отрисован сервером,
    // сразу планируем от него слайдшоу.
    scheduleSlide();
  }

  const destroy = () => {
    destroyed = true;
    stopSlide();
    window.removeEventListener('resize', updateArrows);
    window.removeEventListener('message', onYoutubeMessage);
  };

  return { destroy };
}
