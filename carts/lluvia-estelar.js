Chispa.registerCart({
  id: 'lluvia-estelar',
  title: 'LLUVIA ESTELAR',
  author: 'CHISPA',
  description: 'Atrapa las estrellas y esquiva las rocas. Izquierda/derecha para moverte.',
  builtin: true,
  sprites: {
    1: [ // nave
      '...77...',
      '..7cc7..',
      '..7cc7..',
      '.777777.',
      '77788777',
      '7.7777.7',
      '..8..8..',
      '..9..9..',
    ],
    2: [ // estrella
      '...a....',
      '...a....',
      '..aaa...',
      'aaa9aaa.',
      '.aaaaa..',
      '..aaa...',
      '.aa.aa..',
      'a.....a.',
    ],
    3: [ // roca
      '..5555..',
      '.566655.',
      '56665555',
      '56655555',
      '55555545',
      '55545545',
      '.555555.',
      '..4444..',
    ],
    4: [ // corazón
      '.88.88..',
      '8e88888.',
      '8888888.',
      '8888888.',
      '.88888..',
      '..888...',
      '...8....',
      '........',
    ],
  },
  code: `// LLUVIA ESTELAR
// Atrapa estrellas (+10) y esquiva las rocas. Tienes 3 vidas.

let fondo = [];
let px, vidas, puntos, objs, cuenta, inv, estado, record, chispas;

function _init() {
  record = load('record', 0);
  estado = 'titulo';
  for (let i = 0; i < 40; i++) {
    fondo.push({ x: rnd(128), y: rnd(128), v: 0.2 + rnd(0.8) });
  }
}

function empezar() {
  px = 60; vidas = 3; puntos = 0; objs = []; chispas = [];
  cuenta = 0; inv = 0; estado = 'juego';
}

function explotar(x, y, c) {
  for (let i = 0; i < 8; i++) {
    const a = rnd(Math.PI * 2);
    chispas.push({ x, y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, vida: 15, c });
  }
}

function _update() {
  for (const s of fondo) {
    s.y += s.v;
    if (s.y > 128) { s.y = 0; s.x = rnd(128); }
  }
  if (estado !== 'juego') {
    if (btnp(A) || btnp(START)) { empezar(); tone(660, 0.1); }
    return;
  }

  if (btn(LEFT)) px -= 2;
  if (btn(RIGHT)) px += 2;
  px = mid(0, px, 120);

  cuenta++;
  const ritmo = Math.max(10, 36 - flr(puntos / 25));
  if (cuenta % ritmo === 0) {
    objs.push({
      x: rndi(120), y: -8,
      tipo: rnd() < 0.55 ? 'estrella' : 'roca',
      v: 0.8 + puntos / 500 + rnd(0.6),
    });
  }
  if (inv > 0) inv--;

  for (const o of objs) {
    o.y += o.v;
    if (Math.abs(o.x - px) < 7 && Math.abs(o.y - 114) < 7) {
      o.muerto = true;
      if (o.tipo === 'estrella') {
        puntos += 10;
        tone(880, 0.08, 'square', 0.15, 400);
        explotar(o.x + 4, o.y + 4, 10);
      } else if (inv === 0) {
        vidas--; inv = 60;
        noise(0.3, 0.3);
        explotar(o.x + 4, o.y + 4, 8);
        if (vidas <= 0) {
          estado = 'fin';
          tone(220, 0.5, 'sawtooth', 0.2, -150);
          if (puntos > record) { record = puntos; save('record', record); }
        }
      }
    }
    if (o.y > 130) o.muerto = true;
  }
  objs = objs.filter(o => !o.muerto);

  for (const c of chispas) { c.x += c.vx; c.y += c.vy; c.vida--; }
  chispas = chispas.filter(c => c.vida > 0);
}

function centrado(txt, y, c) { print(txt, (128 - textw(txt)) / 2, y, c); }

function _draw() {
  cls(1);
  for (const s of fondo) pset(s.x, s.y, s.v > 0.7 ? 7 : 6);

  if (estado === 'titulo') {
    centrado('LLUVIA ESTELAR', 40, 10);
    spr(2, 40, 52); spr(1, 60, 52); spr(3, 80, 52);
    centrado('ATRAPA LAS ESTRELLAS', 70, 7);
    centrado('ESQUIVA LAS ROCAS', 78, 7);
    if (frame() % 40 < 26) centrado('PULSA Z PARA EMPEZAR', 96, 9);
    centrado('RECORD: ' + record, 112, 6);
    return;
  }

  for (const o of objs) spr(o.tipo === 'estrella' ? 2 : 3, o.x, o.y);
  for (const c of chispas) pset(c.x, c.y, c.c);
  if (inv === 0 || frame() % 6 < 3) spr(1, px, 114);

  rectfill(0, 0, 128, 8, 0);
  print('PUNTOS ' + puntos, 2, 2, 7);
  for (let i = 0; i < vidas; i++) spr(4, 100 + i * 9, 0);

  if (estado === 'fin') {
    rectfill(24, 48, 80, 34, 0);
    rect(24, 48, 80, 34, 8);
    centrado('FIN DEL JUEGO', 54, 8);
    centrado('PUNTOS: ' + puntos, 63, 7);
    centrado('Z: OTRA VEZ', 72, 9);
  }
}
`,
});
