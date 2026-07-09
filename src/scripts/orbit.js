// Орбиты v2: движок камеры карты + фокус-навигация + модалки визитки/проекта.
// Общая идея координат — см. комментарий в начале orbit.css. Кратко:
//   screenX = viewportCenterX + camera.x + camera.zoom * worldX
// Все pan/zoom-жесты и click-to-focus сводятся к пересчету camera.{x,y,zoom}
// и одному applyCamera(), который проставляет transform на #orbit-scene и
// custom property --zoom (ее читают все .orbit-counter-zoom потомки, чтобы
// сохранять постоянный экранный размер маркеров при любом уровне зума).

(() => {
  const viewport = /** @type {HTMLElement | null} */ (document.getElementById('orbit-viewport'));
  const scene = /** @type {HTMLElement | null} */ (document.getElementById('orbit-scene'));
  if (!viewport || !scene) return;

  const data = window.__ORBIT_DATA__ || { maxOrbitRadius: 900, eras: [] };
  const hint = document.getElementById('orbit-hint');

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 2.6;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const camera = { x: 0, y: 0, zoom: 1 };
  let viewportRect = viewport.getBoundingClientRect();
  const refreshViewportRect = () => { viewportRect = viewport.getBoundingClientRect(); };
  window.addEventListener('resize', refreshViewportRect);

  function applyCamera() {
    scene.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
    scene.style.setProperty('--zoom', String(camera.zoom));
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
  let activeEraId = /** @type {string | null} */ (null);
  const eraDetailEl = document.querySelector('[data-era-detail]');
  const legendStarBtn = document.querySelector('.legend-star');

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

  // --- модалки ---------------------------------------------------------------
  function openModal(dialog) {
    if (!dialog) return;
    document.querySelectorAll('.orbit-modal[open]').forEach((d) => { if (d !== dialog) /** @type {HTMLDialogElement} */ (d).close(); });
    if (!dialog.open) dialog.showModal();
  }
  document.querySelectorAll('.orbit-modal').forEach((dialog) => {
    dialog.querySelector('[data-modal-close]')?.addEventListener('click', () => /** @type {HTMLDialogElement} */ (dialog).close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) /** @type {HTMLDialogElement} */ (dialog).close(); });
  });

  const starModal = /** @type {HTMLDialogElement | null} */ (document.getElementById('orbit-star-modal'));
  const projectModal = /** @type {HTMLDialogElement | null} */ (document.getElementById('orbit-project-modal'));
  const projectSlot = document.querySelector('[data-project-slot]');

  function openStar() {
    focusStar();
    openModal(starModal);
    dismissHint();
  }

  function openPlanetCard(btn) {
    const tplId = btn.dataset.tpl;
    const eraId = btn.dataset.era;
    const tpl = tplId ? /** @type {HTMLTemplateElement | null} */ (document.getElementById(tplId)) : null;
    if (tpl && projectSlot) projectSlot.replaceChildren(tpl.content.cloneNode(true));
    if (eraId) setActiveEra(eraId);
    // фокус на РЕАЛЬНОЙ текущей позиции планеты на экране (она непрерывно
    // движется по орбите анимацией) — читаем bounding rect в момент клика,
    // а не пытаемся вычислить фазу CSS-анимации вручную
    const rect = btn.getBoundingClientRect();
    const world = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    focusWorldCenter(world.x, world.y, clamp(Math.max(camera.zoom, 0.85), MIN_ZOOM, MAX_ZOOM), 550);
    openModal(projectModal);
    dismissHint();
  }

  document.querySelectorAll('[data-planet-open]').forEach((btn) => {
    btn.addEventListener('click', () => openPlanetCard(btn));
  });
  document.querySelectorAll('[data-star-open], [data-focus-star]').forEach((btn) => {
    btn.addEventListener('click', openStar);
  });
  document.querySelectorAll('.legend-item[data-focus-era]').forEach((btn) => {
    btn.addEventListener('click', () => { focusEra(btn.getAttribute('data-focus-era')); dismissHint(); });
  });
  document.querySelectorAll('.ring-group[data-focus-era]').forEach((g) => {
    g.addEventListener('click', () => { focusEra(g.getAttribute('data-focus-era')); dismissHint(); });
  });

  // --- зум-кнопки HUD ---------------------------------------------------------
  document.querySelectorAll('[data-zoom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      dismissHint();
      const action = btn.getAttribute('data-zoom');
      if (action === 'fit') { setActiveEra(null); fitToScreen(true); return; }
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

  // --- фоновый метеор для оживления сцены (не привязан к взаимодействию) -----
  function scheduleAmbientMeteor() {
    const delay = 12000 + Math.random() * 13000;
    setTimeout(() => {
      if (!document.hidden && typeof window.__spawnOrbitMeteor === 'function') window.__spawnOrbitMeteor();
      scheduleAmbientMeteor();
    }, delay);
  }
  scheduleAmbientMeteor();

  // --- старт: вся система целиком в кадре -------------------------------------
  refreshViewportRect();
  fitToScreen(false);
  // повторный fit после полной загрузки (шрифты/CSS/картинки) — подстраховка
  // на случай, если самый первый замер viewport пришелся на еще не готовый
  // layout (наблюдалось в dev-режиме)
  window.addEventListener('load', () => {
    refreshViewportRect();
    fitToScreen(false);
  }, { once: true });
})();
