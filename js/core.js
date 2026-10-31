// CHISPA — núcleo de la consola de fantasía.
// Pantalla 128x128, 16 colores, 64 sprites de 8x8, 7 botones, sonido sintetizado.
(function (global) {
  'use strict';

  const W = 128, H = 128;
  const SHEET = 64;            // hoja de sprites: 64x64 px = 8x8 sprites de 8x8 = 64 sprites
  const STEP = 1000 / 60;      // 60 actualizaciones por segundo
  const FONT = global.CHISPA_FONT;

  // Paleta propia de CHISPA (16 colores).
  const PALETTE = [
    '#0b0b14', '#2a2350', '#6b2d5c', '#1f6f50',
    '#8a4b2b', '#4a4e5a', '#a8acb8', '#f4f1e8',
    '#e43b44', '#f7a23b', '#f7e26b', '#63c74d',
    '#3ba7e5', '#7d6bd6', '#f28fb8', '#f5c9a0',
  ];
  const PAL32 = new Uint32Array(PALETTE.map((h) => {
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    return ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0; // RGBA en memoria little-endian
  }));

  // ---------------------------------------------------------------- memoria de vídeo
  const fb = new Uint8Array(W * H);
  const sheet = new Uint8Array(SHEET * SHEET);
  const transparent = new Array(16).fill(false);
  let camX = 0, camY = 0;

  let canvas = null, ctx = null, imageData = null, pix32 = null;

  function flip() {
    if (!ctx) return;
    for (let i = 0; i < fb.length; i++) pix32[i] = PAL32[fb[i]];
    ctx.putImageData(imageData, 0, 0);
  }

  // ---------------------------------------------------------------- dibujo
  const col = (c) => (c | 0) & 15;

  function cls(c = 0) { fb.fill(col(c)); }

  function rawSet(x, y, c) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    fb[y * W + x] = c;
  }

  function pset(x, y, c = 7) { rawSet(Math.floor(x - camX), Math.floor(y - camY), col(c)); }

  function pget(x, y) {
    x = Math.floor(x - camX); y = Math.floor(y - camY);
    if (x < 0 || y < 0 || x >= W || y >= H) return 0;
    return fb[y * W + x];
  }

  function hline(x0, x1, y, c) {
    if (y < 0 || y >= H) return;
    if (x0 > x1) { const t = x0; x0 = x1; x1 = t; }
    x0 = Math.max(0, x0); x1 = Math.min(W - 1, x1);
    if (x0 <= x1) fb.fill(c, y * W + x0, y * W + x1 + 1);
  }

  function rectfill(x, y, w, h, c = 7) {
    c = col(c);
    const x0 = Math.floor(x - camX), y0 = Math.floor(y - camY);
    const x1 = x0 + Math.floor(w) - 1, y1 = y0 + Math.floor(h) - 1;
    for (let yy = Math.max(0, y0); yy <= Math.min(H - 1, y1); yy++) hline(x0, x1, yy, c);
  }

  function rect(x, y, w, h, c = 7) {
    w = Math.floor(w); h = Math.floor(h);
    if (w <= 0 || h <= 0) return;
    rectfill(x, y, w, 1, c); rectfill(x, y + h - 1, w, 1, c);
    rectfill(x, y, 1, h, c); rectfill(x + w - 1, y, 1, h, c);
  }

  function line(x0, y0, x1, y1, c = 7) {
    c = col(c);
    x0 = Math.floor(x0 - camX); y0 = Math.floor(y0 - camY);
    x1 = Math.floor(x1 - camX); y1 = Math.floor(y1 - camY);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, guard = 0;
    for (;;) {
      rawSet(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || ++guard > 1024) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function circfill(cx, cy, r, c = 7) {
    c = col(c);
    cx = Math.floor(cx - camX); cy = Math.floor(cy - camY); r = Math.floor(r);
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
      hline(cx - dx, cx + dx, cy + dy, c);
    }
  }

  function circ(cx, cy, r, c = 7) {
    c = col(c);
    cx = Math.floor(cx - camX); cy = Math.floor(cy - camY); r = Math.floor(r);
    let x = r, y = 0, d = 1 - r;
    while (x >= y) {
      rawSet(cx + x, cy + y, c); rawSet(cx - x, cy + y, c);
      rawSet(cx + x, cy - y, c); rawSet(cx - x, cy - y, c);
      rawSet(cx + y, cy + x, c); rawSet(cx - y, cy + x, c);
      rawSet(cx + y, cy - x, c); rawSet(cx - y, cy - x, c);
      y++;
      if (d < 0) d += 2 * y + 1; else { x--; d += 2 * (y - x) + 1; }
    }
  }

  function glyphFor(ch) {
    ch = ch.toUpperCase();
    if (FONT.accents[ch]) ch = FONT.accents[ch];
    return FONT.glyphs[ch] || FONT.glyphs['?'];
  }

  // print(texto, x, y, color, escala) — devuelve la x donde terminó.
  function print(str, x = 0, y = 0, c = 7, scale = 1) {
    c = col(c); scale = Math.max(1, Math.floor(scale));
    str = String(str);
    let cx = Math.floor(x), cy = Math.floor(y);
    const startX = cx;
    for (const ch of str) {
      if (ch === '\n') { cx = startX; cy += FONT.lineHeight * scale; continue; }
      const g = glyphFor(ch);
      for (let row = 0; row < 5; row++) {
        const bits = g[row];
        for (let bit = 0; bit < 3; bit++) {
          if (bits & (4 >> bit)) {
            if (scale === 1) pset(cx + bit, cy + row, c);
            else rectfill(cx + bit * scale, cy + row * scale, scale, scale, c);
          }
        }
      }
      cx += FONT.advance * scale;
    }
    return cx;
  }

  // Ancho en píxeles de un texto (útil para centrarlo).
  function textw(str, scale = 1) {
    const lines = String(str).split('\n');
    const longest = Math.max(...lines.map((l) => [...l].length));
    return longest ? (longest * FONT.advance - 1) * scale : 0;
  }

  function sget(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= SHEET || y >= SHEET) return 0;
    return sheet[y * SHEET + x];
  }

  function sset(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= SHEET || y >= SHEET) return;
    sheet[y * SHEET + x] = col(c);
  }

  // spr(n, x, y, voltearX, voltearY, escala)
  function spr(n, x, y, fx = false, fy = false, scale = 1) {
    n = Math.floor(n);
    if (n < 0 || n > 63) return;
    scale = Math.max(1, Math.floor(scale));
    const sx = (n % 8) * 8, sy = Math.floor(n / 8) * 8;
    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        const c = sheet[(sy + (fy ? 7 - j : j)) * SHEET + sx + (fx ? 7 - i : i)];
        if (transparent[c]) continue;
        if (scale === 1) pset(x + i, y + j, c);
        else rectfill(x + i * scale, y + j * scale, scale, scale, c);
      }
    }
  }

  // palt(color, transparente?) — por defecto solo el color 0 es transparente en spr().
  function palt(c, t) {
    if (c === undefined) { transparent.fill(false); transparent[0] = true; return; }
    transparent[col(c)] = !!t;
  }

  function camera(x = 0, y = 0) { camX = Math.floor(x); camY = Math.floor(y); }

  // ---------------------------------------------------------------- entrada
  const NBTN = 7;
  const KEYMAP = {
    ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3,
    KeyA: 0, KeyD: 1, KeyW: 2, KeyS: 3,
    KeyZ: 4, KeyC: 4, KeyN: 4, Space: 4,
    KeyX: 5, KeyV: 5, KeyM: 5,
    Enter: 6,
  };
  const keys = new Array(NBTN).fill(false);
  const virt = new Array(NBTN).fill(false);
  const pad = new Array(NBTN).fill(false);
  const cur = new Array(NBTN).fill(false);
  const prev = new Array(NBTN).fill(false);

  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  function attachKeyboard() {
    global.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      unlockAudio();
      if (e.code === 'Escape') { menu(); e.preventDefault(); return; }
      const b = KEYMAP[e.code];
      if (b !== undefined) { keys[b] = true; e.preventDefault(); }
    });
    global.addEventListener('keyup', (e) => {
      const b = KEYMAP[e.code];
      if (b !== undefined) keys[b] = false;
    });
    global.addEventListener('blur', () => keys.fill(false));
    global.addEventListener('pointerdown', unlockAudio);
  }

  function pollGamepad() {
    pad.fill(false);
    const pads = global.navigator && global.navigator.getGamepads ? global.navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      pad[0] = pad[0] || b(14) || ax < -0.5;
      pad[1] = pad[1] || b(15) || ax > 0.5;
      pad[2] = pad[2] || b(12) || ay < -0.5;
      pad[3] = pad[3] || b(13) || ay > 0.5;
      pad[4] = pad[4] || b(0) || b(2);
      pad[5] = pad[5] || b(1) || b(3);
      pad[6] = pad[6] || b(9);
    }
  }

  function btn(i) { return !!cur[i]; }
  function btnp(i) { return !!cur[i] && !prev[i]; }
  function setVirtual(i, down) { virt[i] = !!down; if (down) unlockAudio(); }

  // ---------------------------------------------------------------- sonido
  let actx = null, master = null, muted = false;

  function unlockAudio() {
    if (!actx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.5;
      master.connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  // tone(frecuencia, duración, onda, volumen, deslizamiento)
  // onda: 'square' | 'triangle' | 'sawtooth' | 'sine'
  function tone(freq = 440, dur = 0.1, wave = 'square', vol = 0.2, slide = 0) {
    if (muted || !actx || actx.state !== 'running') return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(dur = 0.2, vol = 0.2) {
    if (muted || !actx || actx.state !== 'running') return;
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = actx.currentTime;
    const s = actx.createBufferSource(), g = actx.createGain();
    s.buffer = noiseBuf;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  // note(n) → frecuencia de la nota MIDI n (60 = Do central, 69 = La 440).
  function note(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function setMuted(m) { muted = !!m; }

  // ---------------------------------------------------------------- utilidades
  const rnd = (n = 1) => Math.random() * n;
  const rndi = (n) => Math.floor(Math.random() * n);
  const flr = Math.floor;
  const mid = (a, b, c) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
  let frameCount = 0, cartStart = 0;
  const time = () => (now() - cartStart) / 1000;
  const frame = () => frameCount;
  const now = () => (global.performance ? global.performance.now() : Date.now());

  let currentCartId = 'sistema';
  function save(key, value) {
    try { global.localStorage.setItem('chispa:data:' + currentCartId + ':' + key, JSON.stringify(value)); } catch (e) { /* sin almacenamiento */ }
  }
  function load(key, fallback = null) {
    try {
      const v = global.localStorage.getItem('chispa:data:' + currentCartId + ':' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }

  // ---------------------------------------------------------------- API para cartuchos
  const API = {
    cls, pset, pget, line, rect, rectfill, circ, circfill, print, textw,
    spr, sget, sset, palt, camera,
    btn, btnp, tone, noise, note,
    rnd, rndi, flr, mid, time, frame, save, load,
    LEFT: 0, RIGHT: 1, UP: 2, DOWN: 3, A: 4, B: 5, START: 6, SCREEN: W,
  };
  const API_NAMES = Object.keys(API);
  const API_VALUES = API_NAMES.map((k) => API[k]);

  function compile(code) {
    const body = '"use strict";\n' + code + '\n;return {' +
      '_init: typeof _init === "function" ? _init : null,' +
      '_update: typeof _update === "function" ? _update : null,' +
      '_draw: typeof _draw === "function" ? _draw : null};';
    // eslint-disable-next-line no-new-func
    const factory = new Function(...API_NAMES, body);
    return factory(...API_VALUES);
  }

  // ---------------------------------------------------------------- cartuchos
  // Formato de sprites: { n: ["8 caracteres hex", ... x8] }  ('.' = color 0)
  function parseSprites(sprites) {
    const s = new Uint8Array(SHEET * SHEET);
    if (!sprites) return s;
    for (const key of Object.keys(sprites)) {
      const n = parseInt(key, 10);
      if (!(n >= 0 && n < 64)) continue;
      const rows = sprites[key];
      const sx = (n % 8) * 8, sy = Math.floor(n / 8) * 8;
      for (let j = 0; j < 8; j++) {
        const row = (rows[j] || '').padEnd(8, '.');
        for (let i = 0; i < 8; i++) {
          const v = parseInt(row[i], 16);
          s[(sy + j) * SHEET + sx + i] = Number.isNaN(v) ? 0 : v;
        }
      }
    }
    return s;
  }

  function exportSprites(s) {
    const out = {};
    for (let n = 0; n < 64; n++) {
      const sx = (n % 8) * 8, sy = Math.floor(n / 8) * 8;
      const rows = [];
      let used = false;
      for (let j = 0; j < 8; j++) {
        let row = '';
        for (let i = 0; i < 8; i++) {
          const v = s[(sy + j) * SHEET + sx + i];
          if (v) used = true;
          row += v ? v.toString(16) : '.';
        }
        rows.push(row);
      }
      if (used) out[n] = rows;
    }
    return out;
  }

  function normalizeCart(c) {
    if (!c || typeof c.code !== 'string') throw new Error('Cartucho inválido: falta "code"');
    return {
      id: String(c.id || 'cart-' + Date.now()),
      title: String(c.title || 'SIN TITULO'),
      author: String(c.author || 'anónimo'),
      description: String(c.description || ''),
      code: c.code,
      sheet: c.sheet instanceof Uint8Array ? new Uint8Array(c.sheet) : parseSprites(c.sprites),
      builtin: !!c.builtin,
    };
  }

  function cartToJSON(cart) {
    return {
      format: 'chispa-1', id: cart.id, title: cart.title, author: cart.author,
      description: cart.description, sprites: exportSprites(cart.sheet), code: cart.code,
    };
  }

  const carts = [];
  function registerCart(c) {
    const cart = normalizeCart(c);
    const i = carts.findIndex((k) => k.id === cart.id);
    if (i >= 0) carts[i] = cart; else carts.push(cart);
    if (listeners.carts) listeners.carts(carts);
    return cart;
  }

  // ---------------------------------------------------------------- bucle principal
  let program = null;       // objeto con _update/_draw en ejecución
  let running = false;
  let paused = false;
  let acc = 0, last = 0;
  const listeners = { error: null, cart: null, carts: null };

  function resetState() {
    camera(0, 0); palt();
    // un botón que ya estaba pulsado (p. ej. el que lanzó el cartucho) no cuenta como btnp
    for (let i = 0; i < NBTN; i++) prev[i] = keys[i] || virt[i] || pad[i];
    frameCount = 0; cartStart = now();
  }

  function run(cart) {
    resetState();
    sheet.set(cart.sheet);
    currentCartId = cart.id;
    try {
      program = compile(cart.code);
      if (program._init) program._init();
      if (listeners.cart) listeners.cart(cart);
    } catch (e) { crash(e); }
  }

  function crash(e) {
    const msg = (e && e.message) ? e.message : String(e);
    if (listeners.error) listeners.error(e);
    if (global.console) global.console.error(e);
    camera(0, 0);
    const lines = wrap('ERROR: ' + msg, 30);
    program = {
      _update() { if (btnp(6) || btnp(4)) menu(); },
      _draw() {
        cls(1);
        rectfill(0, 0, W, 9, 8);
        print('EL CARTUCHO SE HA DETENIDO', 2, 2, 7);
        lines.slice(0, 15).forEach((l, i) => print(l, 2, 14 + i * 6, 7));
        print('PULSA START PARA VOLVER', 2, 120, 10);
      },
    };
  }

  function wrap(text, n) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let lineStr = '';
      for (const word of para.split(' ')) {
        if ((lineStr + ' ' + word).trim().length > n) { if (lineStr) out.push(lineStr); lineStr = word; while (lineStr.length > n) { out.push(lineStr.slice(0, n)); lineStr = lineStr.slice(n); } }
        else lineStr = (lineStr + ' ' + word).trim();
      }
      out.push(lineStr);
    }
    return out;
  }

  function step() {
    pollGamepad();
    for (let i = 0; i < NBTN; i++) cur[i] = keys[i] || virt[i] || pad[i];
    try { if (program && program._update) program._update(); } catch (e) { crash(e); }
    for (let i = 0; i < NBTN; i++) prev[i] = cur[i];
    frameCount++;
  }

  function draw() {
    try { if (program && program._draw) program._draw(); } catch (e) { crash(e); }
    flip();
  }

  function loop(t) {
    global.requestAnimationFrame(loop);
    if (!running || paused) { last = t; return; }
    acc += Math.min(t - last, 250); last = t;
    let stepped = false;
    while (acc >= STEP) { acc -= STEP; step(); stepped = true; }
    if (stepped) draw();
  }

  // ---------------------------------------------------------------- menú de sistema
  let menuIndex = 0;
  function menu() {
    resetState();
    currentCartId = 'sistema';
    sheet.fill(0);
    if (listeners.cart) listeners.cart(null);
    const sparks = [];
    program = {
      _update() {
        if (!carts.length) return;
        if (btnp(2)) { menuIndex = (menuIndex + carts.length - 1) % carts.length; tone(520, 0.05); }
        if (btnp(3)) { menuIndex = (menuIndex + 1) % carts.length; tone(520, 0.05); }
        if (btnp(4) || btnp(6)) { tone(660, 0.08); tone(990, 0.15, 'square', 0.15); run(carts[menuIndex]); return; }
        if (frameCount % 3 === 0) sparks.push({ x: rnd(W), y: H, v: 0.3 + rnd(0.8), c: [9, 10, 8, 14][rndi(4)] });
        for (const s of sparks) s.y -= s.v;
        while (sparks.length && sparks[0].y < 0) sparks.shift();
      },
      _draw() {
        cls(0);
        for (const s of sparks) pset(s.x, s.y, s.c);
        const title = 'CHISPA';
        const tx = (W - textw(title, 3)) / 2;
        for (let i = 0; i < title.length; i++) {
          const y = 10 + Math.round(Math.sin(frameCount / 12 + i * 0.7) * 2);
          print(title[i], tx + 1 + i * 12, y + 1, 2, 3);
          print(title[i], tx + i * 12, y, [8, 9, 10, 11, 12, 14][i], 3);
        }
        print('CONSOLA DE FANTASIA', (W - textw('CONSOLA DE FANTASIA')) / 2, 30, 6);
        rect(6, 40, W - 12, 66, 5);
        if (!carts.length) { print('SIN CARTUCHOS', 38, 70, 8); return; }
        const visible = 9, first = Math.max(0, Math.min(menuIndex - 4, carts.length - visible));
        for (let k = 0; k < Math.min(visible, carts.length); k++) {
          const i = first + k, cart = carts[i];
          const y = 44 + k * 7;
          const sel = i === menuIndex;
          if (sel) rectfill(8, y - 1, W - 16, 7, 1);
          print((sel ? '> ' : '  ') + cart.title.slice(0, 26), 10, y, sel ? 10 : 7);
        }
        print('ARRIBA/ABAJO: ELEGIR', 24, 110, 6);
        print('Z O ENTER: JUGAR   ESC: MENU', 8, 118, 6);
      },
    };
  }

  // ---------------------------------------------------------------- arranque
  function init(cv) {
    canvas = cv;
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d');
    imageData = ctx.createImageData(W, H);
    pix32 = new Uint32Array(imageData.data.buffer);
    attachKeyboard();
    menu();
    running = true;
    last = now();
    global.requestAnimationFrame(loop);
  }

  global.Chispa = {
    W, H, SHEET, PALETTE, API_NAMES,
    init, run, menu, compile, registerCart, carts, setVirtual, setMuted, unlockAudio,
    parseSprites, exportSprites, normalizeCart, cartToJSON,
    setPaused(p) { paused = !!p; },
    on(evt, fn) { listeners[evt] = fn; },
    // acceso de bajo nivel (para el editor y las pruebas)
    _fb: fb, _sheet: sheet, _step: step, _draw: draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
