// Interfaz de CHISPA: lista de cartuchos, controles táctiles y editor.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const STORE = 'chispa:usercarts';

  // ---------------------------------------------------------------- cartuchos del usuario
  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { return []; }
  }
  function writeStore(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function persist(cart) {
    const list = readStore().filter((c) => c.id !== cart.id);
    list.push(Chispa.cartToJSON(cart));
    return writeStore(list);
  }
  for (const c of readStore()) {
    try { Chispa.registerCart(Object.assign({}, c, { builtin: false })); } catch (e) { console.warn(e); }
  }

  // ---------------------------------------------------------------- pantalla
  Chispa.init($('#screen'));

  Chispa.on('cart', (cart) => {
    $('#now-playing').textContent = cart ? cart.title : 'MENÚ';
    $('#led').classList.toggle('on', !!cart);
  });
  Chispa.on('error', (e) => editorMsg('Error: ' + (e && e.message ? e.message : e), true));

  $('#btn-menu').addEventListener('click', () => Chispa.menu());
  let muted = false;
  $('#btn-mute').addEventListener('click', () => {
    muted = !muted; Chispa.setMuted(muted);
    $('#btn-mute').textContent = muted ? '🔇' : '🔊';
  });
  $('#btn-full').addEventListener('click', () => {
    const el = $('.bezel');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  });

  // controles táctiles
  document.querySelectorAll('.touch [data-b]').forEach((b) => {
    const i = Number(b.dataset.b);
    const down = (e) => { e.preventDefault(); b.classList.add('down'); Chispa.setVirtual(i, true); };
    const up = (e) => { e.preventDefault(); b.classList.remove('down'); Chispa.setVirtual(i, false); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // ---------------------------------------------------------------- pestañas
  function showTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    for (const p of ['jugar', 'editor', 'ayuda']) $('#panel-' + p).classList.toggle('hidden', p !== name);
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    showTab(t.dataset.tab);
    if (t.dataset.tab === 'editor' && !work) openInEditor(blankCart());
  }));

  // ---------------------------------------------------------------- lista de cartuchos
  function renderList() {
    const ul = $('#cart-list');
    ul.innerHTML = '';
    for (const cart of Chispa.carts) {
      const li = document.createElement('li');
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = cart.title;
      const meta = document.createElement('small');
      meta.textContent = ' · ' + cart.author + (cart.builtin ? '' : ' · tuyo');
      const desc = document.createElement('p');
      desc.textContent = cart.description;
      info.append(title, meta, desc);
      const play = document.createElement('button');
      play.textContent = '▶ Jugar'; play.className = 'primary';
      play.addEventListener('click', () => { Chispa.unlockAudio(); Chispa.run(cart); });
      const edit = document.createElement('button');
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => { openInEditor(cart); showTab('editor'); });
      const actions = document.createElement('div');
      actions.className = 'actions';
      actions.append(play, edit);
      li.append(info, actions);
      ul.append(li);
    }
  }
  Chispa.on('carts', renderList);
  renderList();

  $('#import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const cart = Chispa.registerCart(Object.assign({}, data, { builtin: false }));
      persist(cart);
      openInEditor(cart);
      Chispa.run(cart);
    } catch (err) {
      alert('No se pudo cargar el cartucho: ' + err.message);
    }
  });

  // ---------------------------------------------------------------- editor
  let work = null;     // copia del cartucho que se está editando
  let sel = 1, color = 7;

  function blankCart() {
    return Chispa.normalizeCart({
      id: 'mi-' + Date.now(),
      title: 'MI JUEGO',
      author: 'yo',
      sprites: { 1: ['..7777..', '.777777.', '77177177', '77777777', '77777777', '71777717', '.771177.', '..7777..'] },
      code: `// Mi primer cartucho
let x = 60, y = 60;

function _init() {
}

function _update() {
  if (btn(LEFT)) x -= 1;
  if (btn(RIGHT)) x += 1;
  if (btn(UP)) y -= 1;
  if (btn(DOWN)) y += 1;
  if (btnp(A)) tone(440, 0.1);
}

function _draw() {
  cls(1);
  print('HOLA!', 52, 20, 10);
  spr(1, x, y);
}
`,
    });
  }

  function openInEditor(cart) {
    work = Chispa.normalizeCart(Object.assign({}, cart, { sheet: cart.sheet }));
    $('#ed-title').value = work.title;
    $('#ed-author').value = work.author;
    $('#ed-code').value = work.code;
    $('#ed-delete').disabled = cart.builtin || !readStore().some((c) => c.id === cart.id);
    editorMsg(cart.builtin ? 'Cartucho de sistema: al guardar se creará una copia tuya.' : '');
    drawSpriteEditor(); drawSheet();
  }

  function syncWork() {
    work.title = ($('#ed-title').value || 'SIN TITULO').toUpperCase();
    work.author = $('#ed-author').value || 'anónimo';
    work.code = $('#ed-code').value;
  }

  function editorMsg(text, isError) {
    const el = $('#ed-msg');
    el.textContent = text;
    el.classList.toggle('error', !!isError);
  }

  $('#ed-run').addEventListener('click', () => {
    syncWork();
    editorMsg('');
    Chispa.unlockAudio();
    Chispa.run(work);
    $('#screen').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('#ed-save').addEventListener('click', () => {
    syncWork();
    if (work.builtin) {
      work.id = 'mi-' + work.id + '-' + Date.now();
      work.builtin = false;
      work.title = work.title.slice(0, 20) + ' (MIO)';
      $('#ed-title').value = work.title;
    }
    const cart = Chispa.registerCart(work);
    const ok = persist(cart);
    $('#ed-delete').disabled = false;
    editorMsg(ok ? 'Guardado en este navegador.' : 'No se pudo guardar (almacenamiento no disponible).', !ok);
  });

  $('#ed-export').addEventListener('click', () => {
    syncWork();
    const json = JSON.stringify(Chispa.cartToJSON(work), null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = work.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.chispa.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#ed-new').addEventListener('click', () => openInEditor(blankCart()));

  $('#ed-delete').addEventListener('click', () => {
    if (!work || work.builtin) return;
    if (!confirm('¿Borrar "' + work.title + '" de este navegador?')) return;
    writeStore(readStore().filter((c) => c.id !== work.id));
    const i = Chispa.carts.findIndex((c) => c.id === work.id);
    if (i >= 0) Chispa.carts.splice(i, 1);
    renderList();
    Chispa.menu();
    openInEditor(blankCart());
  });

  // Tab inserta espacios en el código
  $('#ed-code').addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const t = e.target, s = t.selectionStart;
      t.setRangeText('  ', s, t.selectionEnd, 'end');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault(); $('#ed-run').click();
    }
  });

  // ---------------------------------------------------------------- editor de sprites
  const P = Chispa.PALETTE, S = Chispa.SHEET;

  function buildPalette(el, pickable) {
    P.forEach((hex, i) => {
      const sw = document.createElement('button');
      sw.className = 'swatch';
      sw.style.background = hex;
      sw.title = 'Color ' + i;
      sw.textContent = i;
      if (pickable) sw.addEventListener('click', () => { color = i; markPalette(); });
      else sw.disabled = true;
      el.append(sw);
    });
  }
  function markPalette() {
    document.querySelectorAll('#palette .swatch').forEach((s, i) => s.classList.toggle('sel', i === color));
  }
  buildPalette($('#palette'), true);
  buildPalette($('#help-palette'), false);
  markPalette();

  const sprEdit = $('#spr-edit'), ectx = sprEdit.getContext('2d');
  const sheetCv = $('#spr-sheet'), sctx = sheetCv.getContext('2d');
  const CELL = sprEdit.width / 8, SZ = sheetCv.width / S;

  function px(n, i, j) { return work.sheet[(Math.floor(n / 8) * 8 + j) * S + (n % 8) * 8 + i]; }
  function setPx(n, i, j, c) { work.sheet[(Math.floor(n / 8) * 8 + j) * S + (n % 8) * 8 + i] = c; }

  function drawSpriteEditor() {
    if (!work) return;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const c = px(sel, i, j);
      if (c === 0) {
        ectx.fillStyle = (i + j) % 2 ? '#2b2b33' : '#1f1f26';
      } else ectx.fillStyle = P[c];
      ectx.fillRect(i * CELL, j * CELL, CELL, CELL);
    }
    ectx.strokeStyle = 'rgba(255,255,255,.08)';
    for (let k = 1; k < 8; k++) {
      ectx.beginPath(); ectx.moveTo(k * CELL + 0.5, 0); ectx.lineTo(k * CELL + 0.5, sprEdit.height); ectx.stroke();
      ectx.beginPath(); ectx.moveTo(0, k * CELL + 0.5); ectx.lineTo(sprEdit.width, k * CELL + 0.5); ectx.stroke();
    }
    $('#spr-info').textContent = 'sprite nº ' + sel + ' · spr(' + sel + ', x, y)';
  }

  function drawSheet() {
    if (!work) return;
    sctx.fillStyle = '#111'; sctx.fillRect(0, 0, sheetCv.width, sheetCv.height);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const c = work.sheet[y * S + x];
      if (!c) continue;
      sctx.fillStyle = P[c]; sctx.fillRect(x * SZ, y * SZ, SZ, SZ);
    }
    sctx.strokeStyle = 'rgba(255,255,255,.07)';
    for (let k = 1; k < 8; k++) {
      sctx.beginPath(); sctx.moveTo(k * 8 * SZ + 0.5, 0); sctx.lineTo(k * 8 * SZ + 0.5, sheetCv.height); sctx.stroke();
      sctx.beginPath(); sctx.moveTo(0, k * 8 * SZ + 0.5); sctx.lineTo(sheetCv.width, k * 8 * SZ + 0.5); sctx.stroke();
    }
    sctx.strokeStyle = '#f7e26b'; sctx.lineWidth = 2;
    sctx.strokeRect((sel % 8) * 8 * SZ + 1, Math.floor(sel / 8) * 8 * SZ + 1, 8 * SZ - 2, 8 * SZ - 2);
    sctx.lineWidth = 1;
  }

  let painting = -1;
  function paintAt(e) {
    const r = sprEdit.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left) / r.width * 8), j = Math.floor((e.clientY - r.top) / r.height * 8);
    if (i < 0 || j < 0 || i > 7 || j > 7) return;
    setPx(sel, i, j, painting);
    drawSpriteEditor(); drawSheet();
  }
  sprEdit.addEventListener('contextmenu', (e) => e.preventDefault());
  sprEdit.addEventListener('pointerdown', (e) => {
    if (!work) return;
    painting = e.button === 2 ? 0 : color;
    sprEdit.setPointerCapture(e.pointerId);
    paintAt(e);
  });
  sprEdit.addEventListener('pointermove', (e) => { if (painting >= 0) paintAt(e); });
  sprEdit.addEventListener('pointerup', () => { painting = -1; });
  sprEdit.addEventListener('pointercancel', () => { painting = -1; });

  sheetCv.addEventListener('click', (e) => {
    const r = sheetCv.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left) / r.width * 8), j = Math.floor((e.clientY - r.top) / r.height * 8);
    sel = Math.max(0, Math.min(63, j * 8 + i));
    drawSpriteEditor(); drawSheet();
  });
})();
