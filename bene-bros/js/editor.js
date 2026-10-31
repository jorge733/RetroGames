// BENE BROS — editor de niveles.
(function () {
  'use strict';
  const G = BB.GFX, T = 16, ROWS = BB.ROWS, SCALE = 2;
  const $ = (s) => document.querySelector(s);
  const STORE = 'benebros:levels';

  let level = null;   // { id, name, theme, time, grid: [[ch]] }
  let brush = '#';

  // ---------------------------------------------------------------- iconos
  function icon(ch, theme) {
    const cv = document.createElement('canvas');
    cv.width = T; cv.height = T;
    const c = cv.getContext('2d');
    const spr = (name, o) => G.drawSprite(c, name, 0, 0, o || {});
    switch (ch) {
      case '.': c.fillStyle = '#ffffff22'; c.fillRect(0, 0, T, T); c.strokeStyle = '#e43b44'; c.beginPath(); c.moveTo(3, 3); c.lineTo(13, 13); c.moveTo(13, 3); c.lineTo(3, 13); c.stroke(); break;
      case 'o': spr('moneda'); break;
      case '~': G.drawLava(c, 0, 0, 0); break;
      case '@': spr('santiIdle'); break;
      case '!': c.fillStyle = '#f7a23b'; c.beginPath(); c.moveTo(3, 13); c.lineTo(13, 13); c.lineTo(11, 3); c.lineTo(5, 3); c.fill(); c.fillStyle = '#73464c'; c.fillRect(7, 0, 2, 3); c.fillRect(7, 13, 2, 3); break;
      case 'C': G.drawFlag(c, 2, 16, false, 0); break;
      case 'g': spr('bellotin1'); break;
      case 's': spr('caracol'); break;
      case 'b': spr('pajaro1', { swap: theme === 'cueva' ? 'murcielago' : null }); break;
      case 'p': spr('erizo'); break;
      case 'K': spr('bellotin1', { swap: 'rey' }); G.drawSprite(c, 'corona', 0, -6, { scale: 1 }); break;
      case 'M': case 'V':
        G.drawPlatform(c, 0, 5, 16);
        c.fillStyle = '#f4f4f4';
        G.text(c, ch === 'M' ? '<>' : '+', ch === 'M' ? 4 : 6, 0, '#f4f4f4', 1, null);
        break;
      default: {
        const img = G.tileImage(theme, ch, '.');
        if (img) c.drawImage(img, 0, 0);
      }
    }
    return cv;
  }

  // ---------------------------------------------------------------- paleta
  const BRUSHES = ['#', 'X', '=', '*', 'P', 'H', 'L', '-', '^', '~', 'o', 'g', 's', 'b', 'p', 'K', 'M', 'V', 'C', '@', '!', '.'];
  function buildPalette() {
    const pal = $('#palette');
    pal.innerHTML = '';
    for (const ch of BRUSHES) {
      const b = document.createElement('button');
      const cv = icon(ch, level.theme);
      cv.style.background = G.THEMES[level.theme].sky[1];
      b.append(cv, document.createTextNode(BB.TILE_INFO[ch]));
      b.title = BB.TILE_INFO[ch] + ' (' + ch + ')';
      b.classList.toggle('sel', ch === brush);
      b.addEventListener('click', () => { brush = ch; buildPalette(); });
      pal.append(b);
    }
  }

  // ---------------------------------------------------------------- lienzo
  const cv = $('#ed-canvas');
  const ctx = cv.getContext('2d');
  const iconCache = {};
  function cachedIcon(ch) {
    const k = ch + level.theme;
    return iconCache[k] || (iconCache[k] = icon(ch, level.theme));
  }

  function draw() {
    const W = level.grid[0].length;
    if (cv.width !== W * T) { cv.width = W * T; cv.height = ROWS * T; }
    cv.style.width = W * T * SCALE + 'px'; cv.style.height = ROWS * T * SCALE + 'px';
    ctx.imageSmoothingEnabled = false;
    const th = G.THEMES[level.theme];
    const grad = ctx.createLinearGradient(0, 0, 0, cv.height);
    grad.addColorStop(0, th.sky[0]); grad.addColorStop(1, th.sky[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, cv.width, cv.height);
    // cuadrícula y marcas de pantalla
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let x = 0; x < W; x++) ctx.fillRect(x * T, 0, 1, cv.height);
    for (let y = 0; y < ROWS; y++) ctx.fillRect(0, y * T, cv.width, 1);
    ctx.fillStyle = 'rgba(255,205,117,.25)';
    for (let x = 0; x < W; x += 20) ctx.fillRect(x * T, 0, 1, cv.height);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < W; x++) {
        const ch = level.grid[y][x];
        if (ch === '.') continue;
        const img = ['#', '='].includes(ch) || ch === 'L' ? G.tileImage(level.theme, ch, y > 0 ? level.grid[y - 1][x] : '.') : cachedIcon(ch);
        if (img) ctx.drawImage(img, x * T, y * T);
        if (ch === 'M' || ch === 'V') { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x * T, y * T, 48, 8); }
      }
    }
  }

  function cellFromEvent(e) {
    const r = cv.getBoundingClientRect();
    return { x: Math.floor((e.clientX - r.left) / r.width * level.grid[0].length), y: Math.floor((e.clientY - r.top) / r.height * ROWS) };
  }

  function paint(x, y, ch) {
    if (x < 0 || y < 0 || y >= ROWS || x >= level.grid[0].length) return;
    if (ch === '@' || ch === '!') {
      for (const row of level.grid) for (let i = 0; i < row.length; i++) if (row[i] === ch) row[i] = '.';
    }
    if (level.grid[y][x] === ch) return;
    level.grid[y][x] = ch;
    dirty = true;
  }

  let painting = null, dirty = false;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    painting = e.button === 2 ? '.' : brush;
    cv.setPointerCapture(e.pointerId);
    const c = cellFromEvent(e); paint(c.x, c.y, painting); draw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const c = cellFromEvent(e); paint(c.x, c.y, painting);
    if (dirty) { draw(); dirty = false; }
  });
  const stop = () => { painting = null; };
  cv.addEventListener('pointerup', stop);
  cv.addEventListener('pointercancel', stop);

  // ---------------------------------------------------------------- nivel
  function blank(width = 100) {
    const b = BB.Builder(width);
    b.ground(0, width - 1).set(2, 9, '@').set(width - 6, 9, '!');
    return fromLevel({ name: 'MI NIVEL', theme: 'pradera', time: 300, rows: b.rows() });
  }
  function fromLevel(L) {
    const W = Math.max(20, ...L.rows.map((r) => r.length));
    const grid = [];
    for (let y = 0; y < ROWS; y++) grid.push([...(L.rows[y] || '').padEnd(W, '.')].slice(0, W));
    return { id: L.id || 'nivel-' + Date.now(), name: L.name || 'MI NIVEL', theme: L.theme || 'pradera', time: L.time || 300, grid };
  }
  function toLevel() {
    readForm();
    return { id: level.id, name: level.name, theme: level.theme, time: level.time, rows: level.grid.map((r) => r.join('')) };
  }

  function open(l) {
    level = l;
    $('#name').value = level.name;
    $('#theme').value = level.theme;
    $('#width').value = level.grid[0].length;
    $('#time').value = level.time;
    buildPalette(); draw();
  }

  function readForm() {
    level.name = ($('#name').value || 'MI NIVEL').toUpperCase().slice(0, 16);
    level.time = Math.max(30, Math.min(999, parseInt($('#time').value, 10) || 300));
  }

  $('#theme').addEventListener('change', () => { level.theme = $('#theme').value; buildPalette(); draw(); });
  $('#width').addEventListener('change', () => {
    const W = Math.max(20, Math.min(400, parseInt($('#width').value, 10) || 100));
    $('#width').value = W;
    for (let y = 0; y < ROWS; y++) {
      const row = level.grid[y];
      if (W < row.length) row.length = W; else while (row.length < W) row.push(y >= 10 ? '#' : '.');
    }
    draw();
  });

  function msg(text, error) { const m = $('#msg'); m.textContent = text; m.classList.toggle('error', !!error); }

  function validate() {
    const all = level.grid.map((r) => r.join('')).join('');
    if (!all.includes('@')) { msg('Falta el inicio de Santiago (@).', true); return false; }
    if (!all.includes('!')) msg('Aviso: el nivel no tiene meta (!), no se podrá terminar.', true);
    else msg('');
    return true;
  }

  // ---------------------------------------------------------------- guardado
  const saved = () => BB.store.get(STORE, []);
  function renderSaved() {
    const ul = $('#saved'); ul.innerHTML = '';
    const list = saved();
    if (!list.length) { const li = document.createElement('li'); li.textContent = 'Todavía no hay ninguno.'; ul.append(li); return; }
    list.forEach((L) => {
      const li = document.createElement('li');
      const span = document.createElement('span'); span.textContent = L.name;
      const edit = document.createElement('button'); edit.className = 'btn'; edit.textContent = 'Abrir';
      edit.addEventListener('click', () => { open(fromLevel(L)); msg('Nivel abierto.'); });
      const del = document.createElement('button'); del.className = 'btn danger'; del.textContent = '✕';
      del.title = 'Borrar';
      del.addEventListener('click', () => {
        if (!confirm('¿Borrar «' + L.name + '»?')) return;
        BB.store.set(STORE, saved().filter((x) => x.id !== L.id)); renderSaved();
      });
      li.append(span, edit, del); ul.append(li);
    });
  }

  $('#save').addEventListener('click', () => {
    if (!validate()) return;
    const L = toLevel();
    const list = saved().filter((x) => x.id !== L.id);
    list.push(L);
    BB.store.set(STORE, list);
    renderSaved();
    msg('Guardado. Juégalo desde el menú: MIS NIVELES.');
  });

  $('#new').addEventListener('click', () => { if (confirm('¿Empezar un nivel nuevo? Lo que no hayas guardado se perderá.')) open(blank()); });

  const copySel = $('#copy');
  BB.LEVELS.forEach((L, i) => { const o = document.createElement('option'); o.value = i; o.textContent = L.name; copySel.append(o); });
  copySel.addEventListener('change', () => {
    const i = copySel.value; copySel.value = '';
    if (i === '') return;
    const L = fromLevel(Object.assign({}, BB.LEVELS[i], { id: 'nivel-' + Date.now() }));
    L.name = (L.name + ' 2').slice(0, 16);
    open(L); msg('Copia creada: modifícala y guárdala como tuya.');
  });

  $('#export').addEventListener('click', () => {
    const L = toLevel();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(Object.assign({ format: 'benebros-1' }, L), null, 1)], { type: 'application/json' }));
    a.download = L.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.benebros.json';
    document.body.append(a); a.click(); a.remove();
  });

  $('#import').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const L = JSON.parse(await f.text());
      if (!Array.isArray(L.rows)) throw new Error('falta "rows"');
      open(fromLevel(L)); msg('Nivel importado. Pulsa Guardar para conservarlo.');
    } catch (err) { msg('No se pudo importar: ' + err.message, true); }
  });

  // ---------------------------------------------------------------- probar
  let testGame = null;
  $('#test').addEventListener('click', () => {
    if (!validate()) return;
    BB.Audio.unlock();
    $('#overlay').classList.add('show');
    testGame = new BB.Game($('#test-canvas'), { levels: [toLevel()], testMode: true, onExit: closeTest });
    BB.game = testGame;
  });
  BB.bindTouch({ get input() { return testGame ? testGame.input : { virt: {} }; } }, $('#overlay'));
  function closeTest() {
    if (testGame) testGame.destroy();
    testGame = null;
    $('#overlay').classList.remove('show');
  }

  open(blank());
  renderSaved();
  BB.editor = { get level() { return level; }, paint, draw, toLevel };
})();
