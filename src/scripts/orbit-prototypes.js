// Орбиты v2: рой прототипов (астероиды за орбитой Black Games). Модалка
// переиспользует общий движок вьювера media-viewer.js (тот же, что и на
// главной странице в PrototypeGrid.astro) — импорт скрипта разрешен заданием,
// его CSS (.mv-*) скопирован в orbit.css отдельным подразделом (см. комментарий
// там). Позиционирование самих астероидов на карте — целиком в orbit.astro/css,
// здесь только клик -> плейлист -> вьювер.

import { buildViewer, attachViewer } from '../scripts/media-viewer.js';

(() => {
  const modal = /** @type {HTMLDialogElement | null} */ (document.getElementById('orbit-proto-modal'));
  if (!modal) return;

  const titleEl = modal.querySelector('.opm-title');
  const badgeEl = /** @type {HTMLElement | null} */ (modal.querySelector('.opm-badge'));
  const metaEl = modal.querySelector('.opm-meta');
  const linkEl = /** @type {HTMLAnchorElement | null} */ (modal.querySelector('.opm-link'));
  const viewerEl = modal.querySelector('.opm-viewer');

  const viewerLabels = {
    prev: 'Назад', next: 'Вперед', close: 'Закрыть',
    prevShot: 'Предыдущий скриншот', nextShot: 'Следующий скриншот',
    video: 'Видео', screenshot: 'скриншот',
  };

  let viewerHandle = /** @type {{ destroy: () => void } | null} */ (null);

  function buildPlaylist(id, hasClip, hasClipFull, extraClips, shots) {
    const base = `/media/prototypes/${id}`;
    const list = [];
    if (hasClip) list.push({ kind: 'video', src: `${base}/${hasClipFull ? 'clip-full.webm' : 'clip.webm'}`, id: '', poster: `${base}/poster.jpg` });
    for (let i = 2; i <= 1 + extraClips; i++) list.push({ kind: 'video', src: `${base}/clip-${i}.webm`, id: '', poster: `${base}/poster-${i}.jpg` });
    for (let i = 1; i <= shots; i++) list.push({ kind: 'image', src: `${base}/shots/${i}.webp`, id: '', poster: '' });
    if (list.length === 0) list.push({ kind: 'image', src: `${base}/icon.webp`, id: '', poster: '' });
    return list;
  }

  function openFromAsteroid(el) {
    const { title, genre, year, clip, clipFull, shots, extraClips, link, badge, id } = /** @type {DOMStringMap} */ (el.dataset);
    if (titleEl) titleEl.textContent = title || '';
    if (metaEl) metaEl.textContent = [genre, year].filter(Boolean).join(' · ');
    if (badgeEl) {
      if (badge) { badgeEl.textContent = badge; badgeEl.style.display = 'inline-flex'; }
      else { badgeEl.style.display = 'none'; }
    }
    if (linkEl) {
      if (link) { linkEl.href = link; linkEl.textContent = 'Открыть в Google Play'; linkEl.style.display = 'inline-flex'; }
      else { linkEl.style.display = 'none'; linkEl.removeAttribute('href'); }
    }

    // итерация 10 (п.6d): варп-прыжок к астероиду + появление окна —
    // общий движок камеры/модалки, экспортирован orbit.js на window
    // (порядок скриптов: orbit.js гарантированно загружен раньше).
    // итерация 12 (п.10): передаем экранные координаты клика (центр
    // астероида) третьим/четвертым аргументом — __orbitWarpFocus теперь
    // прокидывает их в __orbitWarpPulse, звездные штрихи расходятся ОТ
    // ЭТОЙ точки, а не от центра экрана (см. orbit.js/orbit-stars.js).
    const rect = el.getBoundingClientRect();
    if (window.__orbitScreenToWorld && window.__orbitWarpFocus && window.__orbitCamera) {
      const focalX = rect.left + rect.width / 2;
      const focalY = rect.top + rect.height / 2;
      const world = window.__orbitScreenToWorld(focalX, focalY);
      window.__orbitWarpFocus(world.x, world.y, Math.max(window.__orbitCamera.zoom, 1.05), focalX, focalY);
    }
    if (window.__orbitOpenModalWarped) {
      window.__orbitOpenModalWarped(modal);
    } else {
      document.querySelectorAll('.orbit-modal[open]').forEach((d) => { if (d !== modal) /** @type {HTMLDialogElement} */ (d).close(); });
      if (!modal.open) modal.showModal();
    }

    if (viewerEl) {
      viewerHandle?.destroy();
      viewerHandle = null;
      viewerEl.innerHTML = '';
      const playlist = buildPlaylist(id || '', clip === '1', clipFull === '1', Number(extraClips || '0'), Number(shots || '0'));
      const root = buildViewer(playlist, { ...viewerLabels, title });
      // скрины прототипов бывают портретными — contain вместо cover (см. .media-viewer--contain)
      root.classList.add('media-viewer--contain');
      viewerEl.appendChild(root);
      viewerHandle = attachViewer(root, { slideshowMs: 3000, renderFirst: true });
    }
  }

  document.querySelectorAll('.asteroid').forEach((el) => {
    el.addEventListener('click', () => openFromAsteroid(/** @type {HTMLElement} */ (el)));
  });

  modal.addEventListener('close', () => {
    viewerHandle?.destroy();
    viewerHandle = null;
    if (viewerEl) viewerEl.innerHTML = '';
  });
})();
