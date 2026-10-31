Chispa.registerCart({
  id: 'demo',
  title: 'DEMO DEL SISTEMA',
  author: 'CHISPA',
  description: 'Paleta, figuras, texto, sprites y sonido. Ideal para aprender la API.',
  builtin: true,
  sprites: {
    1: [
      '..aaaa..',
      '.aaaaaa.',
      'aa1aa1aa',
      'aaaaaaaa',
      'a1aaaa1a',
      'aa1111aa',
      '.aaaaaa.',
      '..aaaa..',
    ],
  },
  code: `// DEMO DEL SISTEMA
// Flechas: mover la cara. Z: nota musical. X: ruido.

let x = 60, y = 90, n = 0;
let bolas = [];

function _init() {
  for (let i = 0; i < 6; i++) {
    bolas.push({ x: rnd(120), y: 30 + rnd(40), vx: rnd(2) - 1, vy: rnd(2) - 1, c: 8 + i });
  }
}

function _update() {
  if (btn(LEFT)) x--;
  if (btn(RIGHT)) x++;
  if (btn(UP)) y--;
  if (btn(DOWN)) y++;
  x = mid(0, x, 120); y = mid(28, y, 112);

  const escala = [60, 62, 64, 65, 67, 69, 71, 72];
  if (btnp(A)) { tone(note(escala[n % 8]), 0.25, 'triangle', 0.3); n++; }
  if (btnp(B)) noise(0.2);

  for (const b of bolas) {
    b.x += b.vx; b.y += b.vy;
    if (b.x < 3 || b.x > 124) b.vx *= -1;
    if (b.y < 30 || b.y > 110) b.vy *= -1;
  }
}

function _draw() {
  cls(0);
  // paleta
  for (let c = 0; c < 16; c++) rectfill(c * 8, 0, 8, 8, c);
  print('HOLA, MUNDO RETRO!', 2, 11, 7);
  print('T=' + flr(time()), 100, 11, 6);
  line(0, 19, 127, 19, 5);

  for (const b of bolas) circfill(b.x, b.y, 3, b.c);
  circ(64, 70, 20 + Math.sin(time() * 3) * 6, 13);
  rect(4, 26, 120, 90, 1);

  spr(1, x, y);
  print('Z NOTA  X RUIDO', 2, 120, 6);
}
`,
});
