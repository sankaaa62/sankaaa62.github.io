// M.3: лёгкий параллакс фоновых слоёв (#bg-a, #bg-b).
// Курсор двигает слои на ±2% от размера вьюпорта, скролл — на ±4% (по прогрессу
// прокрутки страницы). Сглаживание через lerp, троттлинг через rAF.
// Полностью выключается при prefers-reduced-motion (тот же паттерн, что и .reveal/фон).

const layers = [
  { el: document.getElementById('bg-a'), depth: 1 },
  { el: document.getElementById('bg-b'), depth: 1.4 },
].filter((l) => l.el);

if (layers.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const CURSOR_STRENGTH = 0.02; // ±2% viewport
  const SCROLL_STRENGTH = 0.04; // ±4% viewport
  const LERP = 0.06;

  let pointerX = 0; // -1..1
  let pointerY = 0; // -1..1
  let scrollProgress = 0; // -1..1 (маппинг scrollY/docHeight)

  const current = layers.map(() => ({ x: 0, y: 0 }));
  const target = layers.map(() => ({ x: 0, y: 0 }));

  const lerp = (a, b, t) => a + (b - a) * t;

  const updateScrollProgress = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = docHeight > 0 ? (window.scrollY / docHeight) * 2 - 1 : 0;
  };

  // fix: rAF-луп не должен крутиться вхолостую вечно — как только текущие и
  // целевые позиции сошлись (лерп практически завершён), останавливаем rAF и
  // лениво перезапускаем его при следующем pointermove/scroll. rafId + running
  // защищают от повторного запуска (double-start) из разных обработчиков.
  const CONVERGE_EPS = 0.001;
  let running = false;

  const ensureRunning = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', (e) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    ensureRunning();
  }, { passive: true });

  window.addEventListener('scroll', () => {
    updateScrollProgress();
    ensureRunning();
  }, { passive: true });
  window.addEventListener('resize', updateScrollProgress, { passive: true });
  updateScrollProgress();

  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  function tick() {
    let allConverged = true;
    if (!document.hidden) {
      layers.forEach((layer, i) => {
        const depth = layer.depth;
        target[i].x = pointerX * CURSOR_STRENGTH * vw() * depth;
        target[i].y = pointerY * CURSOR_STRENGTH * vh() * depth + scrollProgress * SCROLL_STRENGTH * vh() * depth;
        current[i].x = lerp(current[i].x, target[i].x, LERP);
        current[i].y = lerp(current[i].y, target[i].y, LERP);
        layer.el.style.transform = `translate(${current[i].x.toFixed(2)}px, ${current[i].y.toFixed(2)}px)`;
        if (Math.abs(current[i].x - target[i].x) >= CONVERGE_EPS || Math.abs(current[i].y - target[i].y) >= CONVERGE_EPS) {
          allConverged = false;
        }
      });
    } else {
      allConverged = false; // страница скрыта — не гоняем rAF, но и не считаем это сходимостью; просто ждём следующего кадра видимости
    }

    if (allConverged) {
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  }

  ensureRunning();
}
