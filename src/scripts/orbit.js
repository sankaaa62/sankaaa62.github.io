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
  const hoverLine = /** @type {SVGPathElement | null} */ (hoverCard?.querySelector('.hover-card-leader-line') ?? null);
  const hoverDot = /** @type {HTMLElement | null} */ (hoverCard?.querySelector('.hover-card-dot') ?? null);
  const hoverBox = /** @type {HTMLElement | null} */ (hoverCard?.querySelector('.hover-card-box') ?? null);
  // итерация 11 (п.12a): карточка раньше позиционировалась ОДИН РАЗ на вход
  // указателя и дальше не двигалась, пока планета/звезда непрерывно едет по
  // орбите под ней — визуально "отклеивалась" от объекта уже через долю
  // секунды. hoverAnchorEl/hoverRafId — состояние небольшого rAF-цикла,
  // который, пока курсор наведен, каждый кадр перечитывает текущий
  // getBoundingClientRect() цели и пересчитывает и точку-маркер, и
  // ломаную линию-выноску, и позицию текста (см. positionHoverCard ниже).
  // Объявлено на верхнем уровне (не внутри matchMedia-гейта ниже), т.к.
  // hideHoverCard() дергается и из кода вне гейта (openStar/openPlanetCard) —
  // должен безопасно останавливать трекинг независимо от того, включились
  // ли вообще hover-слушатели на этом устройстве.
  let hoverRafId = null;
  let hoverAnchorEl = null;
  function stopHoverTracking() {
    hoverAnchorEl = null;
    if (hoverRafId !== null) { cancelAnimationFrame(hoverRafId); hoverRafId = null; }
  }
  function hideHoverCard() {
    hoverCard?.classList.remove('is-visible');
    stopHoverTracking();
  }

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 2.6;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // итерация 10 (п.1) / итерация 12 (п.6b): взвешенный контр-масштаб маркеров
  // вместо константного экранного размера — "параллакс с размером".
  // screenScale = zoom^(1-W) — чем БОЛЬШЕ W, тем СЛАБЕЕ маркеры реагируют на
  // отдаление (при W=1 экранный размер был бы вообще constant). Итерация 10
  // подобрала W=0.65 — по фидбеку итерации 12 маркеры на отдалении все еще
  // уменьшались недостаточно заметно ("параллакс" читался слабо). Опущено до
  // W=0.52 (нижняя половина диапазона 0.5-0.55 из ТЗ) — показатель степени
  // (1-W) вырос с 0.35 до 0.48, зависимость от zoom стала заметно круче.
  // Нижний кламп MARKER_SCALE_MIN тоже опущен (0.5 -> 0.42, в пределах ~0.4
  // из ТЗ) — иначе более крутая формула быстро уперлась бы в старый пол и
  // эффект не читался бы при сильном отдалении. Измерено (см. отчет
  // итерации 12): на дефолтном fit-зуме 1280x800 (zoom~0.352) screenScale
  // упал с 0.694 (W=0.65) до 0.606 (W=0.52); при дальнейшем 2х-отдалении
  // (zoom~0.176) — с 0.5 (старый кламп) до ~0.434 (новый, кламп еще не
  // достигнут). MARKER_SCALE_MAX не трогали (клампится на приближении и там
  // не менялась логика ТЗ).
  const MARKER_SCALE_WEIGHT = 0.52;
  const MARKER_SCALE_MIN = 0.42;
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
    // итерация 13 (п.4): вьюпорт поменял размер/позицию — старое
    // офф-скрин-решение по роторам могло устареть (см. scheduleRotorPauseCheck
    // ниже, доступна по хойстингу function-декларации)
    scheduleRotorPauseCheck();
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
    // итерация 13 (п.4, перф-аудит): планирует пересчет паузы офф-скрин
    // роторов на каждый реальный кадр камеры (см. scheduleRotorPauseCheck
    // ниже, объявлена после pausableRotors) — единая точка входа для ВСЕХ
    // путей движения камеры (wheel/pan/pinch/focus-анимации/варп), т.к. все
    // они уже сходятся в applyCamera().
    scheduleRotorPauseCheck();
  }

  // итерация 13 (п.2, перф-аудит): wheel/pointermove раньше синхронно звали
  // applyCamera() НА КАЖДОЕ событие — трекпад сыплет десятки wheel-событий
  // за кадр, каждое вызывало инлайн-transform + 2 custom properties на
  // #orbit-scene (каскадный recalc на ~700 узлов сцены). Математика
  // (screenToWorld/zoom-к-курсору/пан) остается ПОЛНОСТЬЮ синхронной и
  // событийной — она читает только camera.{x,y,zoom} (in-memory) и
  // закэшированные точки отсчета (viewportRect/panStart/pinchStart), НИКОГДА
  // не читает DOM/getBoundingClientRect сцены, поэтому отложить именно
  // DOM-ЗАПИСЬ (applyCamera) без изменения порядка накопления состояния —
  // безопасно и математически идентично прежнему по-событийному применению:
  // каждое событие по-прежнему обновляет camera.{x,y,zoom} немедленно (как
  // и раньше), просто ФАКТИЧЕСКИЙ рендер (applyCamera -> DOM) схлопывается в
  // один вызов на кадр через rAF. Используется ТОЛЬКО для "ручных" путей
  // (wheel/pan/pinch) — focus-анимации (animateCamera/warpToWorldPoint) уже
  // сами по себе rAF-циклы (одна applyCamera() на шаг анимации), их трогать
  // не нужно (и не стоит — батчинг поверх уже-rAF цикла ничего не даст).
  let cameraApplyScheduled = false;
  function scheduleApplyCamera() {
    if (cameraApplyScheduled) return;
    cameraApplyScheduled = true;
    requestAnimationFrame(() => {
      cameraApplyScheduled = false;
      applyCamera();
    });
  }

  // итерация 13 (п.4, перф-аудит): офф-скрин роторы (--r постоянный, центр
  // орбиты — мировая точка (0,0)) продолжают крутиться (CSS animation) даже
  // когда их кольцевая траектория ЦЕЛИКОМ вне вьюпорта — актуально для
  // пояса/роя астероидов (62 ротора + их .orbit-counter-rotate) при фокусе
  // на одной эре, когда остальная карта офф-скрин. Чисто аналитическая
  // проверка (БЕЗ getBoundingClientRect в цикле): кольцо радиуса r с
  // центром в мировом (0,0) пересекает экранный прямоугольник (+ запас
  // PAUSE_MARGIN_FACTOR от размера вьюпорта) тогда и только тогда, когда
  // dMin <= r <= dMax, где dMin/dMax — мин/макс расстояние от центра кольца
  // до прямоугольника (функция расстояния до выпуклой области непрерывна и
  // принимает все промежуточные значения между своим мин и макс). Область
  // применения ОГРАНИЧЕНА роторами с орбитой вокруг мирового (0,0)
  // (planet/belt/debris) — .moon-rotor намеренно исключен: его орбита
  // движется вместе с родительской планетой, эта формула для него
  // неприменима без пересчета центра на каждый кадр (вне заявленного
  // скоупа "62 ротора пояса/роя").
  const PAUSE_MARGIN_FACTOR = 0.25;
  const PAUSE_DEBOUNCE_MS = 200;
  const pausableRotors = Array.from(
    document.querySelectorAll('.orbit-rotor.belt-rotor, .orbit-rotor.debris-rotor, .orbit-rotor[data-era]')
  )
    .map((el) => ({ el, r: parseFloat(el.style.getPropertyValue('--r')) || 0 }))
    .filter((item) => item.r > 0);

  let rotorsPaused = false;
  function resumeAllRotors() {
    // идемпотентно — вызывается на КАЖДЫЙ реальный кадр камеры (см.
    // scheduleRotorPauseCheck), должно быть O(1) в общем случае (когда
    // роторы и так не на паузе), поэтому ранний выход по флагу
    if (!rotorsPaused) return;
    rotorsPaused = false;
    for (const item of pausableRotors) item.el.classList.remove('is-paused');
  }

  function updateRotorVisibility() {
    // мировая точка (0,0) в экранных координатах — та же формула, что и в
    // screenToWorld, только в обратную сторону
    const cx = viewportRect.left + viewportRect.width / 2 + camera.x;
    const cy = viewportRect.top + viewportRect.height / 2 + camera.y;
    const marginX = viewportRect.width * PAUSE_MARGIN_FACTOR;
    const marginY = viewportRect.height * PAUSE_MARGIN_FACTOR;
    const left = viewportRect.left - marginX;
    const right = viewportRect.right + marginX;
    const top = viewportRect.top - marginY;
    const bottom = viewportRect.bottom + marginY;
    let anyPaused = false;
    for (const item of pausableRotors) {
      const r = item.r * camera.zoom;
      const dxMin = Math.max(left - cx, 0, cx - right);
      const dyMin = Math.max(top - cy, 0, cy - bottom);
      const dMin = Math.hypot(dxMin, dyMin);
      const dxMax = Math.max(Math.abs(cx - left), Math.abs(cx - right));
      const dyMax = Math.max(Math.abs(cy - top), Math.abs(cy - bottom));
      const dMax = Math.hypot(dxMax, dyMax);
      const hidden = !(dMin <= r && r <= dMax);
      item.el.classList.toggle('is-paused', hidden);
      if (hidden) anyPaused = true;
    }
    rotorsPaused = anyPaused;
  }

  // мгновенный резюм на КАЖДОМ реальном кадре камеры (см. вызов в
  // applyCamera выше) + пересчет паузы с задержкой PAUSE_DEBOUNCE_MS после
  // последнего кадра — так движение камеры никогда не "спотыкается" о
  // застывший в паузе ротор, а пауза применяется только когда камера
  // действительно остановилась
  let rotorPauseTimer = null;
  function scheduleRotorPauseCheck() {
    resumeAllRotors();
    if (rotorPauseTimer !== null) clearTimeout(rotorPauseTimer);
    rotorPauseTimer = setTimeout(() => {
      rotorPauseTimer = null;
      updateRotorVisibility();
    }, PAUSE_DEBOUNCE_MS);
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
  // итерация 12 (п.10): focalX/focalY — ЭКРАННЫЕ координаты точки, куда
  // (визуально) устремляются звездные штрихи (см. orbit-stars.js) — раньше
  // всегда был центр экрана независимо от того, к какой планете/астероиду
  // шел варп, из-за чего эффект "прыжка К ЦЕЛИ" не читался, если цель была
  // не в центре. Необязательные — вызывающая сторона передает их, когда
  // известна конкретная точка (клик по планете/астероиду); без них
  // __orbitWarpPulse сама подставит центр вьюпорта (см. дефолт там же) —
  // используется для обратного варпа на закрытии окна (п.10 задания прямо
  // разрешило центр экрана для этого случая, "по вкусу").
  const WARP_DURATION = 380;
  function warpToWorldPoint(wx, wy, zoom, focalX, focalY) {
    stopCameraAnim();
    window.__orbitWarpPulse?.(WARP_DURATION, focalX, focalY);
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
  // итерация 11 (п.9): открытие окна проекта/прототипа раньше показывало
  // showModal() СИНХРОННО с началом варп-рывка камеры — рывок (380мс) и
  // звездные штрихи проигрывались уже ЗА окном, зритель их не видел. Теперь
  // openModalWarped откладывает фактическое появление окна до MODAL_OPEN_DELAY
  // (~70% длительности варпа — в заданных 65-80%): камера успевает разогнаться
  // и почти долететь, а окно всплывает "к концу рывка", внахлест с еще не
  // погасшими штрихами (см. warpIntensity() в orbit-stars.js — там же спад
  // растянут на весь хвост warpT, так что в момент появления окна штрихи еще
  // заметны). Тот же WeakMap-паттерн защиты от гонок, что и pendingCloseTimers
  // ниже — pendingOpenTimers хранит id отложенного открытия, чтобы повторный/
  // отменяющий клик мог его отменить и не всплыть окном поверх уже другого
  // выбранного объекта.
  const pendingOpenTimers = new WeakMap();
  function cancelPendingOpen(dialog) {
    const timerId = pendingOpenTimers.get(dialog);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      pendingOpenTimers.delete(dialog);
    }
  }
  // Гонка (найдена повторным ревью): openModalWarped отменяла отложенное
  // открытие ЛЮБОГО ДРУГОГО диалога перед планированием своего, а openModal
  // (путь звезды-визитки) — только своего. Сценарий: клик по планете
  // (openModalWarped планирует showModal() через ~266мс) -> в этом окне
  // клик по звезде -> openModal() открывает star-modal СРАЗУ (не отменяя
  // уже запланированный таймер project-modal), таймер планеты все равно
  // стреляет по расписанию -> оба диалога открыты одновременно, бэкдропы
  // наложены друг на друга. Фикс — кросс-диалоговая отмена вынесена в общую
  // функцию и вызывается из ОБОИХ путей открытия (не только из
  // openModalWarped), симметрично с тем, как оба пути уже закрывают чужие
  // ОТКРЫТЫЕ диалоги строкой выше.
  function cancelOtherPendingOpens(dialog) {
    document.querySelectorAll('.orbit-modal').forEach((d) => { if (d !== dialog) cancelPendingOpen(d); });
  }
  function openModal(dialog) {
    if (!dialog) return;
    document.querySelectorAll('.orbit-modal[open]').forEach((d) => { if (d !== dialog) requestCloseModal(d); });
    cancelOtherPendingOpens(dialog);
    cancelPendingOpen(dialog);
    cancelPendingClose(dialog);
    if (!dialog.open) dialog.showModal();
  }
  // WARP_DURATION объявлена выше вместе с warpToWorldPoint (варп-рывок камеры)
  const MODAL_OPEN_DELAY = Math.round(WARP_DURATION * 0.7);
  // итерация 10 (п.6d) / итерация 11 (п.9): вариант открытия с "варп"-появлением
  // (короткая вспышка+масштаб, см. @keyframes modal-warp-in в orbit.css) — для
  // окон проекта и прототипа, отложенный на MODAL_OPEN_DELAY (см. выше).
  // Звезда-визитка открывается обычным openModal() (без варпа и без задержки —
  // задание просило варп именно для проектов/прототипов). Класс 'was-warped'
  // вешается на диалог вместе с фактическим открытием и живет, пока диалог
  // открыт — requestCloseModal() читает его, чтобы понять, нужен ли обратный
  // варп при закрытии (п.10), см. ниже.
  function openModalWarped(dialog) {
    if (!dialog) return;
    document.querySelectorAll('.orbit-modal[open]').forEach((d) => { if (d !== dialog) requestCloseModal(d); });
    // отменяем отложенное открытие ЛЮБОГО другого диалога того же семейства —
    // пользователь мог кликнуть по второму объекту раньше, чем успело
    // всплыть окно первого (оба используют общие shared-диалоги проекта/
    // прототипа, повторный клик просто переоткрывает тот же <dialog>)
    cancelOtherPendingOpens(dialog);
    cancelPendingOpen(dialog);
    cancelPendingClose(dialog);
    const timerId = setTimeout(() => {
      pendingOpenTimers.delete(dialog);
      dialog.classList.add('is-warping', 'was-warped');
      if (!dialog.open) dialog.showModal();
      setTimeout(() => dialog.classList.remove('is-warping'), 360);
    }, MODAL_OPEN_DELAY);
    pendingOpenTimers.set(dialog, timerId);
  }
  // итерация 11 (п.10): закрытие окна, открытого варпом (project/proto —
  // помечены классом 'was-warped', см. openModalWarped выше), тоже получает
  // обратный эффект: короткий рывок камеры К ОБЗОРУ ВСЕЙ СИСТЕМЫ той же
  // "рывковой" функцией warpToWorldPoint (что и у открытия) + повторный пульс
  // звездных штрихов, синхронизированные по длительности с CSS-анимацией
  // "схлопывания" окна (@keyframes modal-warp-out, см. orbit.css). Заодно
  // закрывает п.11: setActiveEra(OVERVIEW_ID) тут же снимает фокус-режим и
  // подсвечивает "Вся система" в легенде — камера и легенда возвращаются к
  // обзору синхронно. Звезда-визитка (не 'was-warped') просто быстро гаснет,
  // как и раньше — задание п.11 просило сброс легенды именно для карточек
  // проекта/прототипа, не для визитки.
  //
  // Защита от гонки (WeakMap pendingCloseTimers) СОХРАНЕНА без изменений —
  // как и просило ревью при задаче п.10: только ПАРАМЕТРИЗОВАНА длительность
  // отложенного close() (WARP_CLOSE_DELAY вместо фиксированных 150мс для
  // варпнутых диалогов, чтобы совпадать с более долгой CSS-анимацией
  // схлопывания), сама защита (id таймера + повторная проверка is-closing в
  // колбэке) — та же, что фиксила предыдущая гонка.
  const SIMPLE_CLOSE_DELAY = 150;
  const WARP_CLOSE_DELAY = 320; // = длительность modal-warp-out в orbit.css
  function requestCloseModal(dialog) {
    if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
    cancelPendingOpen(dialog);
    const warped = dialog.classList.contains('was-warped');
    dialog.classList.add('is-closing');
    if (warped) {
      // итерация 12 (п.10, попутно найдено): warpToWorldPoint() САМА зовет
      // __orbitWarpPulse(WARP_DURATION, ...) внутри себя — вызов ниже ДО нее
      // (как было раньше) немедленно перезаписывался бы этим внутренним
      // вызовом (WARP_DURATION=380мс вместо желаемых WARP_CLOSE_DELAY=320мс,
      // синхронизированных с CSS modal-warp-out). Порядок исправлен: сперва
      // warpToWorldPoint (со своим 380мс дефолтом), ЗАТЕМ явный вызов с
      // WARP_CLOSE_DELAY поверх — он и остается финальным, длительность
      // штрихов синхронизирована с CSS-анимацией схлопывания окна. Фокальная
      // точка не передается (undefined) — обратный варп на закрытии
      // намеренно идет из ЦЕНТРА экрана (см. warpFocalX/Y дефолт в
      // orbit-stars.js), а не из точки последнего клика: п.10 задания прямо
      // разрешил центр для этого случая ("по вкусу, главное согласованно") -
      // камера и так возвращается К ОБЗОРУ ВСЕЙ СИСТЕМЫ (world 0,0 = центр
      // сцены), центр экрана здесь физически совпадает со смыслом действия.
      warpToWorldPoint(0, 0, fitZoomForRadius(data.maxOrbitRadius + 140, 0.44));
      window.__orbitWarpPulse?.(WARP_CLOSE_DELAY);
      setActiveEra(OVERVIEW_ID);
    }
    const delay = warped ? WARP_CLOSE_DELAY : SIMPLE_CLOSE_DELAY;
    const timerId = setTimeout(() => {
      pendingCloseTimers.delete(dialog);
      // защита №2: если за это время dialog успели переоткрыть (см.
      // cancelPendingClose выше), класс уже снят — не закрываем то, что
      // пользователь/код только что снова открыл
      if (!dialog.classList.contains('is-closing')) return;
      dialog.classList.remove('is-closing', 'is-warping', 'was-warped');
      dialog.close();
    }, delay);
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
    const focalX = rect.left + rect.width / 2;
    const focalY = rect.top + rect.height / 2;
    const world = screenToWorld(focalX, focalY);
    warpToWorldPoint(world.x, world.y, clamp(Math.max(camera.zoom, 0.85), MIN_ZOOM, MAX_ZOOM), focalX, focalY);
    openModalWarped(projectModal);
    dismissHint();
  }

  document.querySelectorAll('[data-planet-open]').forEach((btn) => {
    btn.addEventListener('click', () => openPlanetCard(btn));
  });
  // [data-focus-star] убран из селектора: атрибут исчез из разметки вместе
  // с пунктом "Визитка" легенды (итерация 11, п.6) — остался только сам
  // клик по звезде (data-star-open)
  document.querySelectorAll('[data-star-open]').forEach((btn) => {
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

  // --- легенда: сворачивание (итерация 11, п.5 / итерация 12, п.9) ------------
  // Дефолтное состояние решаем по ширине экрана на старте: на десктопе легенда
  // и так компактна и полезна развернутой сразу, на мобильных (та же граница
  // 720px, что и у responsive-раскладки HUD в orbit.css) она в развернутом виде
  // съедает заметную часть небольшого экрана поверх карты — сворачиваем по
  // умолчанию, пользователь разворачивает по кнопке при необходимости.
  // Итерация 12: легенда стала док-панелью — сворачивается/разворачивается
  // теперь ВЕСЬ .hud-dock (см. .is-collapsed в orbit.css — max-width всего
  // блока, а не max-height одной nav), не только список пунктов.
  const legendToggleBtn = document.querySelector('[data-legend-toggle]');
  const legendDock = document.querySelector('[data-dock]');
  if (legendToggleBtn && legendDock) {
    const setLegendExpanded = (expanded) => {
      legendToggleBtn.setAttribute('aria-expanded', String(expanded));
      legendDock.classList.toggle('is-collapsed', !expanded);
    };
    legendToggleBtn.addEventListener('click', () => {
      setLegendExpanded(legendToggleBtn.getAttribute('aria-expanded') !== 'true');
    });
    // вызов ниже дублирует то, что уже сделал синхронный is:inline script в
    // orbit.astro сразу после разметки легенды (см. комментарий там) — тот
    // отрабатывает ДО первого пейнта и убирает FOUC схлопывания на мобиле,
    // этот модуль грузится/выполняется позже. Дублирование безопасно и
    // идемпотентно (то же условие, то же вычисление) — оставлено как второй
    // рубеж на случай, если инлайн-скрипт по какой-то причине не найдет
    // элементы (например, будущий рефакторинг разметки уберет их порядок).
    setLegendExpanded(window.innerWidth > 720);
  }

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
    scheduleApplyCamera();
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
      scheduleApplyCamera();
    } else if (dragMode === 'pinch' && pointers.size === 2 && pinchStart) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const newZoom = clamp(pinchStart.zoom * (dist / pinchStart.dist), MIN_ZOOM, MAX_ZOOM);
      camera.zoom = newZoom;
      camera.x = mid.x - (viewportRect.left + viewportRect.width / 2) - newZoom * pinchStart.world.x;
      camera.y = mid.y - (viewportRect.top + viewportRect.height / 2) - newZoom * pinchStart.world.y;
      scheduleApplyCamera();
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

  // --- hover-блоки: "sci-fi" callout с линией-выноской (итерация 10, п.6 +
  // итерация 11, п.12) ----------------------------------------------------
  // Один общий #orbit-hover-card на всю страницу (см. orbit.astro) — тут
  // только позиционирование и наполнение по pointerenter/leave. Гейт
  // matchMedia(hover:hover) — на тач-устройствах слушатели вообще не
  // вешаются, ховер там физически невозможен, клик по-прежнему открывает
  // карточку/модалку без изменений.
  //
  // п.12b (редизайн): точка-маркер НА объекте -> ломаная линия (диагональ
  // 45° + горизонтальный отрезок) -> текст-сноска в стороне. Диагональ и
  // горизонталь считаются от края объекта (не от центра — на маркере под
  // курсором), направление (право/лево, вверх/вниз) выбирается по
  // квадранту экрана, где сейчас находится объект — та же идея, что и у
  // прежнего вертикального флипа, но на обе оси сразу. Линия рисуется
  // через <path> с stroke-dasharray/dashoffset = длина пути — на старте
  // ховера offset выставляется в length (линия невидима), затем классом
  // is-visible включается CSS-transition dashoffset->0 (эффект "прочерчивания
  // линии"), текст проявляется отдельным fade с небольшой задержкой following.
  if (hoverCard && hoverLine && hoverDot && hoverBox && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const LEADER_DIAG = 26; // длина диагонального сегмента, px
    const LEADER_GAP = 14; // зазор между концом горизонтали и текстом
    const HOVER_EDGE_MARGIN = 10;

    // считает точки маркера/излома/конца линии по текущему rect цели и
    // квадранту экрана, кладет их в DOM (dot/path/box) — вызывается и один
    // раз на старте ховера, и каждый кадр rAF-трекинга, пока курсор наведен
    //
    // Баг (найден ревью, скрин Last Wish): направление диагонали (dirX/dirY)
    // раньше выбиралось ТОЛЬКО по тому, в какой половине экрана лежит сам
    // объект — а итоговая позиция бокса после этого еще и КЛАМПАЛАСЬ к
    // границам экрана независимо. Если объект был близко к краю и клампу
    // приходилось сильно сдвигать бокс, тот уезжал в сторону, противоположную
    // исходной диагонали (напр. диагональ идет вверх-влево, а бокс из-за
    // клампа в итоге у правого края) — линия и текст читались как
    // указывающие в разные стороны ("зигзаг"), плюс второй (номинально
    // горизонтальный) отрезок становился почти вертикальным. Фикс: перед
    // тем, как считать точки, проверяем, ХВАТИТ ЛИ места в предпочтительном
    // направлении для диагонали+зазора+бокса ЦЕЛИКОМ; если нет и с другой
    // стороны места больше — ПЕРЕВОРАЧИВАЕМ направление (dirX/dirY), а не
    // просто клампим результат. После этого клампы ниже — лишь подстраховка
    // на совсем крайний случай (очень узкий экран), в норме почти не
    // срабатывают, и линия с текстом всегда читаются как единая стрелка ОТ
    // маркера К тексту.
    function positionHoverCard(rect) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = Math.min(rect.width, rect.height) / 2;
      const bw = hoverBox.offsetWidth;
      const bh = hoverBox.offsetHeight;

      let dirX = cx < vw / 2 ? 1 : -1;
      let dirY = cy < vh / 2 ? 1 : -1;
      const neededX = LEADER_DIAG + LEADER_GAP + bw + HOVER_EDGE_MARGIN;
      const spaceRight = vw - cx;
      const spaceLeft = cx;
      if (dirX > 0 && spaceRight < neededX && spaceLeft > spaceRight) dirX = -1;
      else if (dirX < 0 && spaceLeft < neededX && spaceRight > spaceLeft) dirX = 1;
      const neededY = LEADER_DIAG + bh / 2 + HOVER_EDGE_MARGIN;
      const spaceBelow = vh - cy;
      const spaceAbove = cy;
      if (dirY > 0 && spaceBelow < neededY && spaceAbove > spaceBelow) dirY = -1;
      else if (dirY < 0 && spaceAbove < neededY && spaceBelow > spaceAbove) dirY = 1;

      // точка на краю объекта под 45° в сторону, куда пойдет линия
      const dotX = cx + dirX * r * Math.SQRT1_2;
      const dotY = cy + dirY * r * Math.SQRT1_2;
      const kneeX = dotX + dirX * LEADER_DIAG;
      const kneeY = dotY + dirY * LEADER_DIAG;
      let boxLeft = dirX > 0 ? kneeX + LEADER_GAP : kneeX - LEADER_GAP - bw;
      let boxTop = kneeY - bh / 2;
      boxLeft = clamp(boxLeft, HOVER_EDGE_MARGIN, Math.max(HOVER_EDGE_MARGIN, vw - bw - HOVER_EDGE_MARGIN));
      boxTop = clamp(boxTop, HOVER_EDGE_MARGIN, Math.max(HOVER_EDGE_MARGIN, vh - bh - HOVER_EDGE_MARGIN));
      const lineEndX = dirX > 0 ? boxLeft : boxLeft + bw;
      const lineEndY = boxTop + bh / 2;

      // акцентная граница/градиент подложки текста всегда со стороны линии
      // (см. .hover-card-box--flip в orbit.css, п.5b) — без этого при
      // dirX<0 линия физически приходит к ПРАВОМУ краю бокса, а акцент
      // (бордер+градиент) висел на ЛЕВОМ, создавая тот же эффект "разного
      // направления" линии и текста, что и баг геометрии выше
      hoverBox.classList.toggle('hover-card-box--flip', dirX < 0);

      hoverDot.style.left = `${dotX}px`;
      hoverDot.style.top = `${dotY}px`;
      hoverBox.style.left = `${boxLeft}px`;
      hoverBox.style.top = `${boxTop}px`;
      hoverLine.setAttribute('d', `M${dotX},${dotY} L${kneeX},${kneeY} L${lineEndX},${lineEndY}`);
      return hoverLine.getTotalLength();
    }

    function hoverTrackTick() {
      if (!hoverAnchorEl) { hoverRafId = null; return; }
      positionHoverCard(hoverAnchorEl.getBoundingClientRect());
      hoverRafId = requestAnimationFrame(hoverTrackTick);
    }

    function showHoverCard(anchorEl, html, colorVar) {
      hoverBox.innerHTML = html;
      hoverCard.style.setProperty('--hc-color', colorVar || 'var(--accent-2)');
      // размеры бокса известны только после простановки контента — считаем
      // позиции/длину пути, ЗАТЕМ проигрываем draw-in (без is-visible на
      // старте, чтобы dashoffset=length применился мгновенно, без transition)
      const length = positionHoverCard(anchorEl.getBoundingClientRect());
      hoverLine.style.strokeDasharray = String(length);
      hoverLine.style.strokeDashoffset = String(length);
      // force reflow — гарантирует, что браузер зафиксировал dashoffset=length
      // ДО добавления класса, иначе переход к 0 может не проиграться (both
      // изменения схлопнутся в один кадр без анимации)
      void hoverLine.getBoundingClientRect();
      hoverCard.classList.add('is-visible');
      hoverLine.style.strokeDashoffset = '0';
      hoverAnchorEl = anchorEl;
      if (hoverRafId === null) hoverRafId = requestAnimationFrame(hoverTrackTick);
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

    // при начале любого жеста камеры прячем карточку — иначе трекинг гнался
    // бы за целью, чья экранная позиция скачком поменялась из-за пана/зума,
    // и линия дернулась бы рывком вместо плавного слежения за орбитой
    viewport.addEventListener('pointerdown', hideHoverCard);
    viewport.addEventListener('wheel', hideHoverCard, { passive: true });
  }

  // --- тултип спутников-лун (итерация 12.1, п.2) ------------------------------
  // Нативный title медленный (браузерная задержка появления) и не
  // стилизуется — маленький кастомный тултип, тот же общий-элемент-на-
  // страницу + rAF-трекинг паттерн, что и у .hover-card выше, но проще (без
  // линии-выноски, просто ярлык у самого спутника — луна продолжает
  // вращаться, пока курсор наведен, трекинг не дает тултипу отстать).
  // Тот же гейт matchMedia(hover:hover) — на тач не показывается.
  const moonTooltip = document.getElementById('orbit-moon-tooltip');
  if (moonTooltip && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const MOON_TIP_GAP = 8;
    const MOON_TIP_EDGE_MARGIN = 8;
    let moonTipRafId = null;
    let moonTipAnchor = null;

    function positionMoonTip(rect) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tw = moonTooltip.offsetWidth;
      const th = moonTooltip.offsetHeight;
      // вертикальный флип: обычно тултип НАД спутником, если места сверху
      // не хватает (спутник у самого верха экрана) — снизу
      const showBelow = rect.top - th - MOON_TIP_GAP < MOON_TIP_EDGE_MARGIN;
      let top = showBelow ? rect.bottom + MOON_TIP_GAP : rect.top - MOON_TIP_GAP - th;
      top = clamp(top, MOON_TIP_EDGE_MARGIN, Math.max(MOON_TIP_EDGE_MARGIN, vh - th - MOON_TIP_EDGE_MARGIN));
      let left = rect.left + rect.width / 2 - tw / 2;
      left = clamp(left, MOON_TIP_EDGE_MARGIN, Math.max(MOON_TIP_EDGE_MARGIN, vw - tw - MOON_TIP_EDGE_MARGIN));
      moonTooltip.style.left = `${left}px`;
      moonTooltip.style.top = `${top}px`;
    }

    function moonTipTick() {
      if (!moonTipAnchor) { moonTipRafId = null; return; }
      positionMoonTip(moonTipAnchor.getBoundingClientRect());
      moonTipRafId = requestAnimationFrame(moonTipTick);
    }

    function hideMoonTip() {
      moonTooltip.classList.remove('is-visible');
      moonTipAnchor = null;
      if (moonTipRafId !== null) { cancelAnimationFrame(moonTipRafId); moonTipRafId = null; }
    }

    document.querySelectorAll('.moon-badge').forEach((badge) => {
      badge.addEventListener('pointerenter', (e) => {
        if (/** @type {PointerEvent} */ (e).pointerType === 'touch') return;
        const text = badge.dataset.tooltip || '';
        if (!text) return;
        moonTooltip.textContent = text;
        positionMoonTip(badge.getBoundingClientRect());
        moonTooltip.classList.add('is-visible');
        moonTipAnchor = badge;
        if (moonTipRafId === null) moonTipRafId = requestAnimationFrame(moonTipTick);
      });
      badge.addEventListener('pointerleave', hideMoonTip);
    });

    // тот же повод спрятать, что и у основной hover-карточки — жест камеры
    // мог скачком сдвинуть все сцену, трекинг не должен гнаться за этим
    viewport.addEventListener('pointerdown', hideMoonTip);
    viewport.addEventListener('wheel', hideMoonTip, { passive: true });
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
