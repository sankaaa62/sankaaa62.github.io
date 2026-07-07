const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById('hero-scroll-cue'));
if (btn) {
  btn.addEventListener('click', () => {
    document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' });
  });
}
