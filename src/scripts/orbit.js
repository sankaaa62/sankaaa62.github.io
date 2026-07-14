// Орбиты v2: движок камеры карты + фокус-навигация + модалки визитки/проекта.
// Общая идея координат — см. комментарий в начале orbit.css. Кратко:
//   screenX = viewportCenterX + camera.x + camera.zoom * worldX
// Все pan/zoom-жесты и click-to-focus сводятся к пересчету camera.{x,y,zoom}
// и одному applyCamera(), который проставляет transform на #orbit-scene и
// custom property --zoom (ее читают все .orbit-counter-zoom потомки, чтобы
// сохранять постоянный экранный размер маркеров при любом уровне зума).
//
// itер10: тот же движок вьювера, что у роя прототипов (orbit-prototypes.js) —
// нужен здесь напрямую, т.к. окно карточки проекта (п.6e) тоже получило
// Steam-стиль вьювер (buildViewer/attachViewer) вместо статичной обложки.

import { buildViewer, attachViewer } from '../scripts/media-viewer.js';

(() => {
  const viewport = /** @type {HTMLElement | null} */ (document.getElementById('orbit-viewport'));
  const scene = /** @type {HTMLElement | null} */ (document.getElementById('orbit-scene'));
  if (!viewport || !scene) return;

  const data = window.__ORBIT_DATA__ || { maxOrbitRadius: 900, eras: [] };
  const hint = document.getElementById('orbit-hint');
  const hoverCard = document.getElementById('orbit-hover-card');
  function hideHoverCard() { hoverCard?.classList.remove('is-visible'); }

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 2.6;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // итерация 10 (п.1): взвешенный контр-масштаб маркеров вместо константного
  // экранного размера — "параллакс с размером". W в пределах 0.55-0.75 по
  // ТЗ, подобрано 0.65 (среднее): при отдалении маркеры уменьшаются, но
  // медленнее сцены. MARKER_SCALE_MIN/MAX — кламп итогового ЭКРАННОГО
  // масштаба относительно базового (не дают планетам ни исчезнуть при
  // отдалении, ни разрастись при сильном приближении).
  const MARKER_SCALE_WEIGHT = 0.65;
  const MARKER_SCALE_MIN = 0.5;
  const MARKER_SCALE_MAX = 1.15;
  // итерация 10 (п.5, исправлено повторным ревью): порог zoom, ниже которого
  // подписи планет/звезды (и не-сфокусированные подписи орбит) плавно гаснут.
  // Раньше это было абсолютное число (0.5) — а фактический fit-зум обзора
  // "Вся система" на типичных экранах ВСЕГДА ниже: на 1280x800 fit=0.352, на
  // 1920x1080 fit=0.475 — оба меньше 0.5. Из-за этого labels-hidden был
  // включен уже на дефолтном виде при первой загрузке страницы: пользователь
  // видел только безымянные кружки (на десктопе это отчасти спасали
  // hover-блоки, но на тач-устройствах ховера нет вообще). Порог теперь
  // ОТНОСИТЕЛЬНЫЙ к текущему fit-зуму (labelHideZoom = fitZoom * k,
  // k=0.8 — в пределах согласованных 0.75-0.85): на дефолтном обзоре
  // camera.zoom === fitZoom > labelHideZoom всегда, подписи видны сразу;
  // гаснут только при заметном отдалении ОТ обзора (ниже 80% от него), а не
  // раньше. Пересчитывается вместе с viewport (fit-зум зависит от размера
  // экрана) — см. updateLabelHideZoom()/refreshViewportRect ниже.
  const LABEL_HIDE_ZOOM_FACTOR = 0.8;
  let labelHideZoom = 0;

  const camera = { x: 0, y: 0, zoom: 1 };
  let viewportRect = viewport.getBoundingClientRect();
  function updateLabelHideZoom() {
    // тот же расчет, что и у fitToScreen()/focusOverview() (fitZoomForRadius
    // объявлена ниже как function-декларация — доступна здесь по хойстингу,
    // т.к. вызывается не раньше первого reflow, а не в момент объявления)
    labelHideZoom = fitZoomForRadius(data.maxOrbitRadius + 140, 0.44) * LABEL_HIDE_ZOOM_FACTOR;
  }
  const refreshViewportRect = () => {
    viewportRect = viewport.getBoundingClientRect();
    updateLabelHideZoom();
  };
  window.addEventListener('resize', refreshViewportRect);

  function applyCamera() {
    scene.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
    scene.style.setProperty('--zoom', String(camera.zoom));
    // screenScale — итоговый экранный масштаб маркера (то, что реально видит
    // пользователь), клампится в [MIN,MAX]; markerScale — то, что ставим в
    // CSS (--marker-scale), т.к. маркер лежит ВНУТРИ уже отмасштабированной
    // сцены: screenScale = markerScale * camera.zoom => markerScale = screenScale/zoom
    const screenScale = clamp(Math.pow(camera.zoom, 1 - MARKER_SCALE_WEIGHT), MARKER_SCALE_MIN, MARKER_SCALE_MAX);
    scene.style.setProperty('--marker-scale', String(screenScale / camera.zoom));
    scene.classList.toggle('labels-hidden', camera.zoom < labelHideZoom);
    // читает orbit-stars.js — легкий параллакс фона от смещения камеры
    window.__orbitCamera = camera;
  }

  function screenToWorld(sx, sy) {
    const cx = viewportRect.left + viewportRect.width / 2;
    const cy = viewportRect.top + viewportRect.height / 2;
    return { x: (sx - cx - camera.x) / camera.zoom, y: (sy - cy - camera.y) / camera.zoom };
  }

  function fitZoomForRadius(radius, marginFactor) {
    // на самом первом кадре (до применения CSS/до готовности layout)
    // getBoundingClientRect() иногда возвращает "почти ноль" вместо честного
    // нуля — простой || не спасает, поэтому санity-порог 50px, ниже которого
    // считаем измерение недостоверным и берем размер окна
    const w = viewportRect.width > 50 ? viewportRect.width : window.innerWidth;
    const h = viewportRect.height > 50 ? viewportRect.height : window.innerHeight;
    return clamp((Math.min(w, h) * marginFactor) / Math.max(1, radius), MIN_ZOOM, MAX_ZOOM);
  }

  // --- плавная анимация камеры (клик-фокус) --------------------------------
  let cameraAnimRaf = null;
  function stopCameraAnim() {
    if (cameraAnimRaf !== null) { cancelAnimationFrame(cameraAnimRaf); cameraAnimRaf = null; }
  }
  function animateCamera(targetX, targetY, targetZoom, duration) {
    stopCameraAnim();
    const from = { x: camera.x, y: camera.y, zoom: camera.zoom };
    const to = { x: targetX, y: targetY, zoom: clamp(targetZoom, MIN_ZOOM, MAX_ZOOM) };
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = ease(t);
      camera.x = from.x + (to.x - from.x) * e;
      camera.y = from.y + (to.y - from.y) * e;
      camera.zoom = from.zoom + (to.zoom - from.zoom) * e;
      applyCamera();
      cameraAnimRaf = t < 1 ? requestAnimationFrame(step) : null;
    };
    cameraAnimRaf = requestAnimationFrame(step);
  }
  function focusWorldCenter(wx, wy, zoom, duration) {
    animateCamera(-wx * zoom, -wy * zoom, zoom, duration);
  }

  // итерация 10 (п.6d): "варп-прыжок" — резкий рывок камеры к цели (не
  // плавный ease-in-out, как обычный фокус, а агрессивный ease-in — быстрый
  // разгон в конце) + одновременный визуальный эффект вытянутых звезд на
  // фоне (orbit-stars.js слушает __orbitWarpPulse). Используется при
  // открытии окон проектов/прототипов — обычный клик-фокус (focusEra/
  // focusStar/legend) варпом не считается, там уместнее плавность.
  const WARP_DURATION = 380;
  function warpToWorldPoint(wx, wy, zoom) {
    stopCameraAnim();
    window.__orbitWarpPulse?.(WARP_DURATION);
    const from = { x: camera.x, y: camera.y, zoom: camera.zoom };
    const to = { x: -wx * zoom, y: -wy * zoom, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
    const start = performance.now();
    const easeIn = (t) => t * t * t; // резкий разгон - ощущение рывка, не плавности
    const step = (now) => {
      const t = Math.min(1, (now - start) / WARP_DURATION);
      const e = easeIn(t);
      camera.x = from.x + (to.x - from.x) * e;
      camera.y = from.y + (to.y - from.y) * e;
      camera.zoom = from.zoom + (to.zoom - from.zoom) * e;
      applyCamera();
      cameraAnimRaf = t < 1 ? requestAnimationFrame(step) : null;
    };
    cameraAnimRaf = requestAnimationFrame(step);
  }
  function zoomAroundScreenCenter(factor, duration) {
    const c = screenToWorld(viewportRect.left + viewportRect.width / 2, viewportRect.top + viewportRect.height / 2);
    const newZoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    focusWorldCenter(c.x, c.y, newZoom, duration);
  }

  function fitToScreen(animate) {
    const zoom = fitZoomForRadius(data.maxOrbitRadius + 140, 0.44);
    if (animate) {
      focusWorldCenter(0, 0, zoom, 700);
    } else {
      camera.x = 0; camera.y = 0; camera.zoom = zoom;
      applyCamera();
    }
  }

  // --- онбординг: подсказка гаснет после первого жеста или через паузу ------
  let hintDismissed = false;
  function dismissHint() {
    if (hintDismissed) return;
    hintDismissed = true;
    hint?.classList.add('is-dismissed');
  }
  setTimeout(dismissHint, 7000);

  // --- фокус на эпоху/звезду: подсвечивает легенду, кольцо, подпись --------
  // итерация 10 (п.6c): "__overview__" — сентинел-id пункта "Вся система"
  // (дефолт, снимает приглушение остальных орбит); "__star__" — визитка.
  // Оба НЕ считаются "реальным" фокусом орбиты для приглушения соседей.
  const OVERVIEW_ID = '__overview__';
  let activeEraId = /** @type {string | null} */ (null);
  const eraDetailEl = document.querySelector('[data-era-detail]');
  const legendStarBtn = document.querySelector('.legend-star');
  const legendOverviewBtn = document.querySelector('.legend-overview');

  // приглушает планеты/кольца/подписи орбит, НЕ совпадающих с id (п.6c).
  // Работает через прямое сравнение data-атрибутов в JS, а не через CSS
  // [attr=".."] с динамическим значением (в статичном css так нельзя) —
  // зато один проход по DOM на смену фокуса, дешево.
  function applyEraFocusMode(id) {
    const isRealEraFocus = !!id && id !== '__star__' && id !== OVERVIEW_ID;
    document.querySelectorAll('.orbit-rotor[data-era]').forEach((el) => {
      el.classList.toggle('is-dimmed', isRealEraFocus && el.getAttribute('data-era') !== id);
    });
    document.querySelectorAll('.ring-group[data-focus-era]').forEach((el) => {
      el.classList.toggle('is-dimmed', isRealEraFocus && el.getAttribute('data-focus-era') !== id);
    });
    document.querySelectorAll('.orbit-label[data-era-label]').forEach((el) => {
      el.classList.toggle('is-dimmed', isRealEraFocus && el.getAttribute('data-era-label') !== id);
    });
  }

  function setActiveEra(id) {
    const changed = activeEraId !== id;
    activeEraId = id;
    document.querySelectorAll('[data-focus-era]').forEach((el) => {
      const on = el.getAttribute('data-focus-era') === id;
      el.classList.toggle('is-focused', on);
      el.classList.toggle('is-active', on);
    });
    document.querySelectorAll('[data-era-label]').forEach((el) => {
      if (el.getAttribute('data-era-label') === id) el.setAttribute('data-focused', '');
      else el.removeAttribute('data-focused');
    });
    legendStarBtn?.classList.toggle('is-active', id === '__star__');
    legendOverviewBtn?.classList.toggle('is-active', id === OVERVIEW_ID);
    applyEraFocusMode(id);

    const era = data.eras.find((e) => e.id === id);
    if (eraDetailEl) {
      if (era) {
        eraDetailEl.innerHTML = `<strong>${era.kicker}</strong> <span class="mono" style="color:var(--muted)">· ${era.range}</span><br>${era.milestone}`;
        eraDetailEl.classList.add('is-open');
      } else {
        eraDetailEl.classList.remove('is-open');
      }
    }
    // метеор — заметный акцент при смене фокуса (не чаще, чем реально сменился фокус)
    if (changed && id && typeof window.__spawnOrbitMeteor === 'function') {
      window.__spawnOrbitMeteor();
    }
  }

  function focusEra(id) {
    const era = data.eras.find((e) => e.id === id);
    if (!era) return;
    setActiveEra(id);
    focusWorldCenter(0, 0, fitZoomForRadius(era.radius, 0.4), 650);
  }

  function focusStar() {
    setActiveEra('__star__');
    const targetZoom = clamp(Math.max(camera.zoom, 0.55), MIN_ZOOM, MAX_ZOOM);
    focusWorldCenter(0, 0, targetZoom, 600);
  }

  // итерация 10 (п.6c): "Вся система" — снимает приглушение орбит и
  // возвращает камеру к общему виду (тот же расчет, что при старте/кнопке fit)
  function focusOverview() {
    setActiveEra(OVERVIEW_ID);
    focusWorldCenter(0, 0, fitZoomForRadius(data.maxOrbitRadius + 140, 0.44), 700);
  }

  // --- модалки ---------------------------------------------------------------
  // Гонка (найдена ревью): requestCloseModal откладывает dialog.close() на
  // 150мс (ждет CSS fade-out), но раньше не хранила id таймера — если ТОТ ЖЕ
  // dialog программно открывался заново внутри этого окна (openModalWarped
  // отменяет через requestCloseModal только ДРУГИЕ открытые диалоги, "d !==
  // dialog"), отложенный close() все равно срабатывал через ~150мс и убивал
  // только что открытую карточку. С мышью недостижимо (пока dialog открыт,
  // backdrop перехватывает клики по сцене), но незащищено против любого
  // будущего программного перехода между карточками того же диалога.
  // Фикс — оба слоя защиты: (1) id таймера хранится в pendingCloseTimers и
  // отменяется при любом открытии того же dialog; (2) сам колбэк таймера
  // перепроверяет, что .is-closing все еще висит, и не закрывает, если нет.
  const pendingCloseTimers = new WeakMap();
  function cancelPendingClose(dialog) {
    const timerId = pendingCloseTimers.get(dialog);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      pendingCloseTimers.delete(dialog);
    }
    dialog.classList.remove('is-closing');
  }
  function openModal(dialog) {
    if (!dialog) return;
    document.querySelectorAll('.orbit-modal[open]').forEach((d) => { if (d !== dialog) requestCloseModal(d); });
    cancelPendingClose(dialog);
    if (!dialog.open) dialog.showModal();
  }
  // итерация 10 (п.6d): вариант открытия с "варп"-появлением (короткая
  // вспышка+масштаб, см. @keyframes modal-warp-in в orbit.css) — для окон
  // проекта и прототипа. Звезда-визитка открывается обычным openModal()
  // (без варпа — задание просило варп именно для проектов/прототипов).
  function openModalWarped(dialog) {
    if (!dialog) return;
    document.querySelectorAll('.orbit-modal[open]').forEach((d) => { if (d !== dialog) requestCloseModal(d); });
    cancelPendingClose(dialog);
    dialog.classList.add('is-warping');
    if (!dialog.open) dialog.showModal();
    setTimeout(() => dialog.classList.remove('is-warping'), 360);
  }
  // закрытие — быстрое затухание (не обратный варп: при частом открытии
  // разных карточек полный реверс приедался и слегка укачивал на глаз).
  // Перехватывает и Escape (событие 'cancel' у <dialog>), чтобы затухание
  // проигрывалось единообразно для всех путей закрытия.
  function requestCloseModal(dialog) {
    if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
    dialog.classList.add('is-closing');
    const timerId = setTimeout(() => {
      pendingCloseTimers.delete(dialog);
      // защита №2: если за эти 150мс dialog успели переоткрыть (см.
      // cancelPendingClose выше), класс уже снят — не закрываем то, что
      // пользователь/код только что снова открыл
      if (!dialog.classList.contains('is-closing')) return;
      dialog.classList.remove('is-closing');
      dialog.classList.remove('is-warping');
      dialog.close();
    }, 150);
    pendingCloseTimers.set(dialog, timerId);
  }
  document.querySelectorAll('.orbit-modal').forEach((dialog) => {
    dialog.querySelector('[data-modal-close]')?.addEventListener('click', () => requestCloseModal(/** @type {HTMLDialogElement} */ (dialog)));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) requestCloseModal(/** @type {HTMLDialogElement} */ (dialog)); });
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); requestCloseModal(/** @type {HTMLDialogElement} */ (dialog)); });
  });
  // используется orbit-prototypes.js (модалка прототипа варпится так же)
  window.__orbitOpenModalWarped = openModalWarped;
  window.__orbitScreenToWorld = screenToWorld;
  window.__orbitWarpFocus = warpToWorldPoint;

  const starModal = /** @type {HTMLDialogElement | null} */ (document.getElementById('orbit-star-modal'));
  const projectModal = /** @type {HTMLDialogElement | null} */ (document.getElementById('orbit-project-modal'));
  const projectSlot = document.querySelector('[data-project-slot]');
  projectModal?.addEventListener('close', () => {
    projectViewerHandle?.destroy();
    projectViewerHandle = null;
    if (projectSlot) projectSlot.innerHTML = '';
  });

  function openStar() {
    hideHoverCard();
    focusStar();
    openModal(starModal);
    dismissHint();
  }

  // итерация 10 (п.6e): вьювер карточки проекта — тот же buildViewer()/
  // attachViewer(), что и у роя прототипов, наполняется из data-playlist
  // (JSON, посчитан на SSR в orbit.astro: локальные трейлеры + youtube +
  // скрины, см. buildProjectPlaylist там же)
  const VIEWER_LABELS = {
    prev: 'Назад', next: 'Вперед', close: 'Закрыть',
    prevShot: 'Предыдущий скриншот', nextShot: 'Следующий скриншот',
    video: 'Видео', screenshot: 'скриншот',
  };
  let projectViewerHandle = /** @type {{ destroy: () => void } | null} */ (null);

  function openPlanetCard(btn) {
    hideHoverCard();
    const tplId = btn.dataset.tpl;
    const eraId = btn.dataset.era;
    const tpl = tplId ? /** @type {HTMLTemplateElement | null} */ (document.getElementById(tplId)) : null;
    projectViewerHandle?.destroy();
    projectViewerHandle = null;
    if (tpl && projectSlot) {
      projectSlot.replaceChildren(tpl.content.cloneNode(true));
      const viewerHost = /** @type {HTMLElement | null} */ (projectSlot.querySelector('.pcard-viewer'));
      if (viewerHost) {
        const cover = viewerHost.dataset.cover;
        if (cover) viewerHost.style.backgroundImage = `url(${cover})`;
        let playlist = [];
        try { playlist = JSON.parse(viewerHost.dataset.playlist || '[]'); } catch { /* noop */ }
        if (playlist.length) {
          const root = buildViewer(playlist, { ...VIEWER_LABELS, title: viewerHost.dataset.title || '' });
          viewerHost.appendChild(root);
          projectViewerHandle = attachViewer(root, { slideshowMs: 3500, renderFirst: true });
        }
      }
    }
    if (eraId) setActiveEra(eraId);
    // фокус на РЕАЛЬНОЙ текущей позиции планеты на экране (она непрерывно
    // движется по орбите анимацией) — читаем bounding rect в момент клика,
    // а не пытаемся вычислить фазу CSS-анимации вручную
    const rect = btn.getBoundingClientRect();
    const world = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    warpToWorldPoint(world.x, world.y, clamp(Math.max(camera.zoom, 0.85), MIN_ZOOM, MAX_ZOOM));
    openModalWarped(projectModal);
    dismissHint();
  }

  document.querySelectorAll('[data-planet-open]').forEach((btn) => {
    btn.addEventListener('click', () => openPlanetCard(btn));
  });
  document.querySelectorAll('[data-star-open], [data-focus-star]').forEach((btn) => {
    btn.addEventListener('click', openStar);
  });
  // итерация 10 (п.6c): повторный клик по УЖЕ сфокусированной орбите (легенда
  // или кольцо) снимает фокус-режим — тот же эффект, что клик по "Вся
  // система". Явный клик по "Вся система" делает то же самое безусловно.
  function focusEraOrToggleOff(id) {
    if (activeEraId === id) focusOverview();
    else focusEra(id);
  }
  document.querySelectorAll('.legend-item[data-focus-era]').forEach((btn) => {
    btn.addEventListener('click', () => { focusEraOrToggleOff(btn.getAttribute('data-focus-era')); dismissHint(); });
  });
  document.querySelectorAll('.ring-group[data-focus-era]').forEach((g) => {
    g.addEventListener('click', () => { focusEraOrToggleOff(g.getAttribute('data-focus-era')); dismissHint(); });
  });
  legendOverviewBtn?.addEventListener('click', () => { focusOverview(); dismissHint(); });

  // --- зум-кнопки HUD ---------------------------------------------------------
  document.querySelectorAll('[data-zoom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dismissHint();
      const action = btn.getAttribute('data-zoom');
      if (action === 'fit') { focusOverview(); return; }
      zoomAroundScreenCenter(action === 'in' ? 1.35 : 1 / 1.35, 260);
    });
  });

  // --- колесо мыши: зум к курсору ---------------------------------------------
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    dismissHint();
    stopCameraAnim();
    const world = screenToWorld(e.clientX, e.clientY);
    const factor = Math.exp(-e.deltaY * 0.0016);
    const newZoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    camera.zoom = newZoom;
    camera.x = e.clientX - (viewportRect.left + viewportRect.width / 2) - newZoom * world.x;
    camera.y = e.clientY - (viewportRect.top + viewportRect.height / 2) - newZoom * world.y;
    applyCamera();
  }, { passive: false });

  // --- pan (drag) + pinch-zoom: единый Pointer Events движок -------------------
  // Драг стартует лениво (capture указателя только после подтвержденного
  // сдвига) — тот же паттерн, что и в PrototypeGrid.astro (drag-скролл
  // карусели): безусловный setPointerCapture на pointerdown ретаргетит
  // синтетический click НА viewport, и клики по планетам/звезде/кольцам
  // перестают доходить до своих обработчиков.
  const DRAG_THRESHOLD = 6;
  const pointers = new Map();
  let dragMode = /** @type {'pan' | 'pinch' | null} */ (null);
  let panStart = null;
  let pinchStart = null;
  let dragDistance = 0;
  let justDragged = false;

  viewport.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stopCameraAnim();
    dragDistance = 0;
    if (pointers.size === 1) {
      dragMode = 'pan';
      panStart = { x: e.clientX, y: e.clientY, camX: camera.x, camY: camera.y };
    } else if (pointers.size === 2) {
      dragMode = 'pinch';
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      pinchStart = { dist: Math.max(1, dist), zoom: camera.zoom, world: screenToWorld(mid.x, mid.y) };
    }
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (dragMode === 'pan' && pointers.size === 1 && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      const wasDrag = dragDistance > DRAG_THRESHOLD;
      dragDistance = Math.max(dragDistance, Math.hypot(dx, dy));
      if (!wasDrag && dragDistance > DRAG_THRESHOLD && !viewport.hasPointerCapture(e.pointerId)) {
        try { viewport.setPointerCapture(e.pointerId); } catch { /* noop */ }
        viewport.classList.add('is-panning');
        dismissHint();
      }
      camera.x = panStart.camX + dx;
      camera.y = panStart.camY + dy;
      applyCamera();
    } else if (dragMode === 'pinch' && pointers.size === 2 && pinchStart) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const newZoom = clamp(pinchStart.zoom * (dist / pinchStart.dist), MIN_ZOOM, MAX_ZOOM);
      camera.zoom = newZoom;
      camera.x = mid.x - (viewportRect.left + viewportRect.width / 2) - newZoom * pinchStart.world.x;
      camera.y = mid.y - (viewportRect.top + viewportRect.height / 2) - newZoom * pinchStart.world.y;
      applyCamera();
      dragDistance = DRAG_THRESHOLD + 1;
      dismissHint();
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    viewport.classList.remove('is-panning');
    if (pointers.size === 0) {
      if (dragDistance > DRAG_THRESHOLD) {
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 0);
      }
      dragMode = null; panStart = null; pinchStart = null;
    } else if (pointers.size === 1) {
      // после пинча остался один палец — продолжаем как обычный pan
      const [, pt] = Array.from(pointers.entries())[0];
      dragMode = 'pan';
      panStart = { x: pt.x, y: pt.y, camX: camera.x, camY: camera.y };
      dragDistance = DRAG_THRESHOLD + 1;
    }
  }
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);

  // подавление клика сразу после реального драга (capture-фаза, суммарно
  // гасит клики по планетам/звезде/астероидам/кольцам — все они потомки
  // viewport). Без этого отпускание после перетаскивания открывало бы
  // карточку/модалку под пальцем.
  viewport.addEventListener('click', (e) => {
    if (justDragged) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  // --- hover-блоки (итерация 10, п.6) ------------------------------------------
  // Один общий #orbit-hover-card на всю страницу (см. orbit.astro) — тут
  // только позиционирование и наполнение по pointerenter/leave. Гейт
  // matchMedia(hover:hover) — на тач-устройствах слушатели вообще не
  // вешаются, ховер там физически невозможен, клик по-прежнему открывает
  // карточку/модалку без изменений.
  if (hoverCard && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const HOVER_GAP = 14;
    const HOVER_EDGE_MARGIN = 8;

    function positionHoverCard(rect) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = hoverCard.offsetWidth;
      const ch = hoverCard.offsetHeight;
      // вертикальный флип по квадранту: маркер в верхней половине экрана —
      // карточка снизу, иначе сверху (чтобы не вылезала за верх/низ)
      const showBelow = rect.top < vh / 2;
      let top = showBelow ? rect.bottom + HOVER_GAP : rect.top - HOVER_GAP - ch;
      top = clamp(top, HOVER_EDGE_MARGIN, Math.max(HOVER_EDGE_MARGIN, vh - ch - HOVER_EDGE_MARGIN));
      let left = rect.left + rect.width / 2 - cw / 2;
      left = clamp(left, HOVER_EDGE_MARGIN, Math.max(HOVER_EDGE_MARGIN, vw - cw - HOVER_EDGE_MARGIN));
      hoverCard.style.left = `${left}px`;
      hoverCard.style.top = `${top}px`;
    }

    function showHoverCard(anchorEl, html, colorVar) {
      hoverCard.innerHTML = html;
      hoverCard.style.setProperty('--hc-color', colorVar || 'var(--accent-2)');
      hoverCard.classList.add('is-visible');
      // размеры карточки известны только после простановки контента
      positionHoverCard(anchorEl.getBoundingClientRect());
    }

    document.querySelectorAll('.planet[data-planet-open]').forEach((btn) => {
      btn.addEventListener('pointerenter', (e) => {
        if (/** @type {PointerEvent} */ (e).pointerType === 'touch') return;
        const role = btn.dataset.hoverRole || '';
        const period = btn.dataset.hoverPeriod || '';
        const metric = btn.dataset.hoverMetric || '';
        const html =
          `<span class="hover-card-role">${role}</span>` +
          `<p class="hover-card-line">${period}</p>` +
          (metric ? `<p class="hover-card-line">${metric}</p>` : '');
        showHoverCard(btn, html, btn.style.getPropertyValue('--era-color'));
      });
      btn.addEventListener('pointerleave', hideHoverCard);
    });

    const starHoverBtn = document.querySelector('.orbit-star[data-star-open]');
    if (starHoverBtn) {
      starHoverBtn.addEventListener('pointerenter', (e) => {
        if (/** @type {PointerEvent} */ (e).pointerType === 'touch') return;
        const role = starHoverBtn.dataset.hoverRole || '';
        const years = starHoverBtn.dataset.hoverYears || '';
        const cta = starHoverBtn.dataset.hoverCta || '';
        const html =
          `<span class="hover-card-role">${role}</span>` +
          `<p class="hover-card-line">${years}</p>` +
          (cta ? `<p class="hover-card-line">${cta}</p>` : '');
        showHoverCard(starHoverBtn, html, 'var(--accent-2)');
      });
      starHoverBtn.addEventListener('pointerleave', hideHoverCard);
    }

    // карточка не следит за целью непрерывно (позиционируется один раз на
    // вход указателя) — при начале любого жеста камеры прячем ее, чтобы не
    // повисла оторванной от объекта
    viewport.addEventListener('pointerdown', hideHoverCard);
    viewport.addEventListener('wheel', hideHoverCard, { passive: true });
  }

  // --- фоновый метеор для оживления сцены (не привязан к взаимодействию) -----
  function scheduleAmbientMeteor() {
    const delay = 12000 + Math.random() * 13000;
    setTimeout(() => {
      if (!document.hidden && typeof window.__spawnOrbitMeteor === 'function') window.__spawnOrbitMeteor();
      scheduleAmbientMeteor();
    }, delay);
  }
  scheduleAmbientMeteor();

  // --- deep-link фокус: #focus=<slug> (подготовка к кнопке "Показать на
  // карте" со страниц проектов основной версии). Неизвестный/отсутствующий
  // slug — тихий no-op, без ошибок в консоли. Не открывает карточку сама
  // (пользователь и так пришел со страницы проекта с полными деталями) —
  // только фокусирует камеру и подсвечивает планету коротким пульсом.
  // Возвращает true/false (нашла ли планету) — вызывающий код (обе точки
  // старта ниже) должен знать, состоялся ли реальный фокус, чтобы при
  // мусорном slug (например #focus=garbage) откатиться на обычный
  // fitToScreen(false), а не молча оставить камеру в чем попало. ------
  function focusPlanetBySlug(slug) {
    const btn = /** @type {HTMLElement | null} */ (document.querySelector(`.planet[data-tpl="tpl-${slug}"]`));
    if (!btn) return false;
    const eraId = btn.dataset.era;
    if (eraId) setActiveEra(eraId);
    const rect = btn.getBoundingClientRect();
    const world = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    focusWorldCenter(world.x, world.y, clamp(Math.max(camera.zoom, 0.9), MIN_ZOOM, MAX_ZOOM), 900);
    btn.classList.add('is-deeplink-pulse');
    setTimeout(() => btn.classList.remove('is-deeplink-pulse'), 3400);
    return true;
  }
  // Гонка (найдена ревью): раньше deep-link фокус планировался через
  // setTimeout(550) "чтобы дать начальному fitToScreen отыграть", а
  // отдельный 'load'-обработчик (подстраховка на случай, если самый первый
  // замер viewport пришелся на неготовый layout — см. ниже) БЕЗУСЛОВНО звал
  // fitToScreen(false) заново. 'load' ждет ВСЕ ресурсы страницы (обложки
  // проектов, 29 иконок прототипов) и на медленной сети/диске мог сработать
  // ПОЗЖЕ 550мс — тогда его fitToScreen(false) перезаписывал камеру обратно
  // в обзор ПОВЕРХ уже выполненного deep-link фокуса. Легенда при этом
  // подсвечивалась верно (setActiveEra не зависит от таймера), а камера —
  // нет: чистая гонка порядка двух независимых таймеров.
  //
  // Фикс без таймеров: slug из хэша читается один раз в переменную
  // (detectDeepLinkSlug), и ОБА места, что могут двигать камеру при
  // старте — синхронный запуск ниже и 'load' — используют ОДНУ и ту же
  // ветку "если есть deep-link, фокусируемся на планете, а не на fit".
  // focusPlanetBySlug() идемпотентна (просто наводит камеру на ту же
  // планету свежими размерами viewport), так что не важно, что из двух
  // мест выполнится позже — результат всегда "камера на планете", а не
  // "обзор всей системы". Для обычного захода (без hash) поведение не
  // меняется: и синхронный старт, и 'load' по-прежнему используют
  // fitToScreen(false), как раньше.
  //
  // Пробел (найден повторным ревью): ветвление было по truthy deepLinkSlug
  // (строка из хэша), а не по факту "планета реально найдена". Для
  // мусорного slug (#focus=garbage — опечатка в ссылке, устаревший slug
  // после переименования проекта) focusPlanetBySlug() молча возвращает
  // false, ничего не меняя в камере — но deepLinkSlug все равно truthy,
  // так что safety-refit на 'load' пропускался тоже, и камера могла
  // остаться в некорректном состоянии первого (возможно, неготового)
  // замера viewport. Теперь focusPlanetBySlug возвращает true/false, и обе
  // точки делают fallback на fitToScreen(false), если планета не найдена —
  // мусорный slug гарантированно приводит к обзору всей системы, в обеих
  // точках одинаково.
  function detectDeepLinkSlug() {
    const m = /^#focus=([a-z0-9-]+)$/i.exec(location.hash);
    return m ? m[1] : null;
  }
  const deepLinkSlug = detectDeepLinkSlug();

  // --- старт: вся система целиком в кадре, "Вся система" активна по умолчанию -
  refreshViewportRect();
  fitToScreen(false);
  setActiveEra(OVERVIEW_ID);
  if (!deepLinkSlug || !focusPlanetBySlug(deepLinkSlug)) fitToScreen(false);
  // повторный refit/refocus после полной загрузки (шрифты/CSS/картинки) —
  // подстраховка на случай, если самый первый замер viewport пришелся на
  // еще не готовый layout (наблюдалось в dev-режиме); порядок относительно
  // deep-link фокуса выше НЕ важен — см. комментарий над detectDeepLinkSlug
  window.addEventListener('load', () => {
    refreshViewportRect();
    if (!deepLinkSlug || !focusPlanetBySlug(deepLinkSlug)) fitToScreen(false);
  }, { once: true });
})();
