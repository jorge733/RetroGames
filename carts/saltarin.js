Chispa.registerCart({
  id: 'saltarin',
  title: 'SALTARIN',
  author: 'CHISPA',
  description: 'Corre sin parar, salta entre plataformas y recoge monedas. Z para saltar (doble salto).',
  builtin: true,
  sprites: {
    5: [ // correr 1
      '..999...',
      '.9fff...',
      '.ff1f...',
      '.fffff..',
      '..ddd...',
      '.fdddf..',
      '..d.d...',
      '.dd..d..',
    ],
    6: [ // correr 2
      '..999...',
      '.9fff...',
      '.ff1f...',
      '.fffff..',
      '..ddd...',
      '.fdddf..',
      '..d.d...',
      '..d..dd.',
    ],
    7: [ // saltar
      '..999...',
      '.9fff...',
      '.ff1f...',
      '.fffff..',
      'f.ddd.f.',
      '..ddd...',
      '.d...d..',
      'd.....d.',
    ],
    8: [ // moneda
      '..aaa...',
      '.a9aaa..',
      'a9aaaaa.',
      'a9aaaaa.',
      'a9aaaaa.',
      '.aaaaa..',
      '..aaa...',
      '........',
    ],
  },
  code: `// SALTARIN
// Z (o A en el mando) para saltar. Puedes saltar otra vez en el aire.

const GRAVEDAD = 0.18, IMPULSO = -3.1, PX = 24;
let py, vy, saltos, plats, monedas, nubes, vel, dist, puntos, estado, record;

function _init() {
  record = load('record', 0);
  nubes = [];
  for (let i = 0; i < 6; i++) nubes.push({ x: rnd(160), y: 10 + rnd(40), r: 4 + rndi(5) });
  reiniciar();
  estado = 'titulo';
}

function reiniciar() {
  py = 80; vy = 0; saltos = 0; vel = 1.4; dist = 0; puntos = 0;
  plats = [{ x: 0, w: 140, y: 100 }];
  monedas = [];
  while (ultima().x + ultima().w < 220) nuevaPlataforma();
  estado = 'juego';
}

function ultima() { return plats[plats.length - 1]; }

function nuevaPlataforma() {
  const u = ultima();
  const hueco = 14 + rndi(10 + flr(vel * 10));
  const w = 24 + rndi(40);
  const y = mid(56, u.y + rndi(41) - 20, 112);
  const x = u.x + u.w + hueco;
  plats.push({ x, w, y });
  if (rnd() < 0.7) monedas.push({ x: x + rndi(w - 8), y: y - 14 - rndi(12) });
}

function _update() {
  for (const n of nubes) { n.x -= 0.2; if (n.x < -12) { n.x = 140; n.y = 10 + rnd(40); } }
  if (estado !== 'juego') {
    if (btnp(A) || btnp(START)) { reiniciar(); tone(660, 0.1); }
    return;
  }

  vel = Math.min(2.6, vel + 0.0006);
  dist += vel;
  for (const p of plats) p.x -= vel;
  for (const m of monedas) m.x -= vel;
  plats = plats.filter(p => p.x + p.w > -10);
  monedas = monedas.filter(m => m.x > -10 && !m.cogida);
  while (ultima().x + ultima().w < 220) nuevaPlataforma();

  if (btnp(A) && saltos < 2) {
    vy = IMPULSO; saltos++;
    tone(saltos === 1 ? 440 : 660, 0.12, 'square', 0.15, 300);
  }

  const antes = py + 8;
  vy = Math.min(vy + GRAVEDAD, 5);
  py += vy;
  for (const p of plats) {
    const encima = PX + 6 > p.x && PX + 2 < p.x + p.w;
    if (encima && vy >= 0 && antes <= p.y + 0.5 && py + 8 >= p.y) {
      py = p.y - 8; vy = 0; saltos = 0;
    }
  }

  for (const m of monedas) {
    if (Math.abs(m.x - PX) < 7 && Math.abs(m.y - py) < 8) {
      m.cogida = true; puntos += 5;
      tone(988, 0.06, 'square', 0.12); tone(1319, 0.12, 'square', 0.1);
    }
  }

  if (py > 130) {
    estado = 'fin';
    noise(0.4, 0.3);
    const total = flr(dist / 10) + puntos;
    if (total > record) { record = total; save('record', record); }
  }
}

function centrado(t, y, c) { print(t, (128 - textw(t)) / 2, y, c); }

function _draw() {
  cls(12);
  for (const n of nubes) { circfill(n.x, n.y, n.r, 7); circfill(n.x + n.r, n.y + 2, n.r - 1, 7); }

  for (const p of plats) {
    rectfill(p.x, p.y, p.w, 128 - p.y, 4);
    rectfill(p.x, p.y, p.w, 3, 11);
    for (let x = p.x + 3; x < p.x + p.w - 2; x += 7) pset(x, p.y + 6, 2);
  }
  for (const m of monedas) spr(8, m.x, m.y + Math.sin(frame() / 8 + m.x) * 1.5);

  if (estado !== 'titulo') {
    const sprite = saltos > 0 || vy < 0 ? 7 : (flr(frame() / 6) % 2 ? 5 : 6);
    spr(sprite, PX, py);
  }

  rectfill(0, 0, 128, 8, 1);
  print('DIST ' + flr(dist / 10), 2, 2, 7);
  print('MONEDAS ' + puntos / 5, 60, 2, 10);

  if (estado === 'titulo') {
    rectfill(16, 34, 96, 50, 1);
    centrado('SALTARIN', 40, 10);
    spr(5, 52, 50); spr(8, 68, 50);
    centrado('Z: SALTAR (DOBLE)', 64, 7);
    if (frame() % 40 < 26) centrado('PULSA Z', 74, 9);
    centrado('RECORD: ' + record, 92, 1);
  }
  if (estado === 'fin') {
    rectfill(20, 44, 88, 38, 1);
    rect(20, 44, 88, 38, 8);
    centrado('TE CAISTE!', 50, 8);
    centrado('TOTAL: ' + (flr(dist / 10) + puntos), 60, 7);
    centrado('RECORD: ' + record, 68, 6);
    centrado('Z: OTRA VEZ', 76, 9);
  }
}
`,
});
