// BENE BROS — botones táctiles para móvil y tableta.
(function (global) {
  'use strict';
  global.BB.bindTouch = function (game, root) {
    root.querySelectorAll('.touch [data-a]').forEach((b) => {
      const a = b.dataset.a;
      const set = (on) => (e) => {
        e.preventDefault();
        b.classList.toggle('down', on);
        game.input.virt[a] = on;
        if (on) global.BB.Audio.unlock();
      };
      b.addEventListener('pointerdown', set(true));
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
