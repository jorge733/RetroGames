// BENE BROS — datos: paleta, sprites y niveles.
(function (global) {
  'use strict';
  const BB = global.BB = global.BB || {};

  // ------------------------------------------------------------------ paleta
  BB.PAL = {
    k: '#1a1c2c', w: '#f4f4f4', e: '#1a1c2c',
    b: '#3b5dc9', B: '#41a6f6',                 // gorro de Santiago
    s: '#f4c29a', S: '#d9926a', h: '#6b3e26',   // piel y pelo
    o: '#ef7d57', O: '#b13e53',                 // bufanda
    c: '#38b764', j: '#29366f', g: '#73464c',   // chaqueta, vaqueros, botas
    H: '#5b3a29', t: '#d9a066',                 // bellota
    p: '#f28fb8', P: '#b13e53', y: '#a7f070',   // caracol
    v: '#7d6bd6', m: '#566c86', r: '#e43b44',   // pájaro, erizo, rojo
    Y: '#ffcd75', G: '#f7a23b', D: '#c46a1c',   // oro
    q: '#ffd700', Q: '#b8860b',                 // corona
  };

  // Variaciones de paleta
  BB.PAL_SWAPS = {
    dorado: { b: '#f7a23b', B: '#ffcd75' },                     // Santiago con la bellota dorada
    bellotaDorada: { H: '#c46a1c', h: '#f7a23b', t: '#ffcd75' },
    murcielago: { v: '#4a3a6a' },
    rey: { H: '#5d275d', h: '#b13e53' },
  };

  // ------------------------------------------------------------------ sprites 16x16
  const SANTI_HEAD = [
    '.......kk.......',
    '......kwwk......',
    '.....kkbbkk.....',
    '....kbbbbbbk....',
    '...kbbbbbbbbk...',
    '...kBBBBBBBBk...',
    '...khhsssksk....',
    '....khsssssSk...',
    '....kssssssk....',
    '...kooooooook...',
    '..kOkooooook....',
  ];
  BB.SPRITES = {
    santiIdle: SANTI_HEAD.concat([
      '...kccccccccsk..',
      '...kscccccccck..',
      '....kjjjjjjk....',
      '....kjjkkjjk....',
      '...kgggk.kgggk..',
    ]),
    santiRun1: SANTI_HEAD.concat([
      '...kccccccccsk..',
      '...kscccccccck..',
      '....kjjjjjjk....',
      '...kjjk..kjjk...',
      '..kgggk...kgggk.',
    ]),
    santiRun2: SANTI_HEAD.concat([
      '...kccccccccsk..',
      '...kscccccccck..',
      '....kjjjjjjk....',
      '.....kjjjjk.....',
      '.....kggggk.....',
    ]),
    santiJump: SANTI_HEAD.concat([
      '..kscccccccck...',
      '...kcccccccck...',
      '....kjjjjjjk....',
      '...kjjk.kjjjk...',
      '...kggk..kggk...',
    ]),
    bellotin1: [
      '.......kk.......',
      '.......kk.......',
      '....kkkkkkkk....',
      '...kHhHhHhHhk...',
      '..kHhHhHhHhHhk..',
      '..kkkkkkkkkkkk..',
      '...kttttttttk...',
      '...ktkkttkktk...',
      '...ktwettewtk...',
      '...kttttttttk...',
      '...kttkkkkttk...',
      '....kttttttk....',
      '.....kttttk.....',
      '......kkkk......',
      '....kgk..kgk....',
      '....kkk..kkk....',
    ],
    bellotin2: [
      '.......kk.......',
      '.......kk.......',
      '....kkkkkkkk....',
      '...kHhHhHhHhk...',
      '..kHhHhHhHhHhk..',
      '..kkkkkkkkkkkk..',
      '...kttttttttk...',
      '...ktkkttkktk...',
      '...ktwettewtk...',
      '...kttttttttk...',
      '...kttkkkkttk...',
      '....kttttttk....',
      '.....kttttk.....',
      '......kkkk......',
      '.....kgkkgk.....',
      '.....kkkkkk.....',
    ],
    caracol: [
      '...........k..k.',
      '...........k..k.',
      '....kkkkk..k..k.',
      '...kpppppk.k..k.',
      '..kpPPPPppkyyyk.',
      '.kpPpppPppkyeyk.',
      '.kpPpPpPppkyyyk.',
      '.kpPpPPpppkyyyk.',
      '.kpPppppPpkyyk..',
      '.kppPPPPppkyk...',
      '..kppppppkyk....',
      '...kkkkkkyyk....',
      '.kyyyyyyyyyyk...',
      'kyyyyyyyyyyyyk..',
      '.kkkkkkkkkkkk...',
      '................',
    ],
    concha: [
      '................',
      '................',
      '................',
      '................',
      '.....kkkkk......',
      '...kkpppppkk....',
      '..kpPPPPPppk....',
      '.kpPpppppPpk....',
      '.kpPpPPPpPpk....',
      '.kpPpPppPPpk....',
      '.kpPpPPPpppk....',
      '.kppPpppppPpk...',
      '..kppPPPPPppk...',
      '...kkkkkkkkk....',
      '................',
      '................',
    ],
    pajaro1: [
      '................',
      '................',
      '.kvk.......kvk..',
      '.kvvk.....kvvk..',
      '..kvvk...kvvk...',
      '...kvvkkkvvk....',
      '....kvvvvvvkk...',
      '...kvvvvvwekok..',
      '...kvvvvvvvkk...',
      '....kvvvvvvk....',
      '.....kkkkkk.....',
      '......k..k......',
      '................',
      '................',
      '................',
      '................',
    ],
    pajaro2: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....kvvvvvvkk...',
      '...kvvvvvwekok..',
      '...kvvvvvvvkk...',
      '..kvvkvvvvkvvk..',
      '.kvvk.kkkk.kvvk.',
      '.kk...k..k...kk.',
      '................',
      '................',
      '................',
      '................',
    ],
    erizo: [
      '................',
      '................',
      '................',
      '....k.k.k.k.....',
      '...kkkkkkkkk....',
      '..kmkmkmkmkmk...',
      '.kmmmmmmmmmmmk..',
      'kmmmmmmmmmmmssk.',
      'kmmmmmmmmmmsesk.',
      'kmmmmmmmmmmssskk',
      '.kmmmmmmmmmssk..',
      '..kkkkkkkkkkk...',
      '...kgk...kgk....',
      '...kk.....kk....',
      '................',
      '................',
    ],
    moneda: [
      '................',
      '................',
      '......kkkk......',
      '....kkYYYYkk....',
      '...kYGGGGGGDk...',
      '...kYGkkkGGDk...',
      '...kYGkGGkGDk...',
      '...kYGkkkGGDk...',
      '...kYGkGGkGDk...',
      '...kYGkkkGGDk...',
      '...kYGGGGGGDk...',
      '....kkDDDDkk....',
      '......kkkk......',
      '................',
      '................',
      '................',
    ],
    corazon: [
      '................',
      '................',
      '................',
      '...kkk...kkk....',
      '..krrrk.krrrk...',
      '.krwrrrkrrrrrk..',
      '.krwrrrrrrrrrk..',
      '.krrrrrrrrrrrk..',
      '..krrrrrrrrrk...',
      '...krrrrrrrk....',
      '....krrrrrk.....',
      '.....krrrk......',
      '......krk.......',
      '.......k........',
      '................',
      '................',
    ],
    bellota: [
      '................',
      '................',
      '........k.......',
      '.......kk.......',
      '.....kkkkkk.....',
      '....kHhHhHhk....',
      '...kHhHhHhHhk...',
      '...kkkkkkkkkk...',
      '....kttttttk....',
      '....ktwttttk....',
      '....kttttttk....',
      '.....kttttk.....',
      '......kttk......',
      '.......kk.......',
      '................',
      '................',
    ],
    corona: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '...k...k...k....',
      '..kqk.kqk.kqk...',
      '..kqqkqrqkqqk...',
      '..kqqqqqqqqqk...',
      '..kqQqQqQqQqk...',
      '..kkkkkkkkkkk...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  };

  // ------------------------------------------------------------------ tiles
  // Caracteres del mapa:
  //  .  vacío            #  suelo             =  ladrillo (se rompe)
  //  *  bloque estrella con moneda           P  bloque con bellota dorada
  //  H  bloque con corazón                   X  bloque de piedra
  //  L  tronco (sólido)  -  plataforma de madera (se atraviesa desde abajo)
  //  ^  pinchos          ~  lava              o  moneda
  //  @  inicio de Santiago   !  campana de meta   C  bandera de control
  //  g  bellotín  s  caracol  b  pájaro  p  erizo  K  Rey Bellota
  //  M  plataforma móvil horizontal          V  plataforma móvil vertical
  BB.TILE_INFO = {
    '.': 'Vacío', '#': 'Suelo', '=': 'Ladrillo', '*': 'Bloque moneda', 'P': 'Bloque bellota',
    'H': 'Bloque corazón', 'X': 'Piedra', 'L': 'Tronco', '-': 'Plataforma', '^': 'Pinchos',
    '~': 'Lava', 'o': 'Moneda', '@': 'Inicio', '!': 'Meta', 'C': 'Control',
    'g': 'Bellotín', 's': 'Caracol', 'b': 'Pájaro', 'p': 'Erizo', 'K': 'Rey Bellota',
    'M': 'Plataforma ↔', 'V': 'Plataforma ↕',
  };
  BB.SOLID = new Set(['#', '=', '*', 'P', 'H', 'X', 'L', 'U']);
  BB.ROWS = 12;

  // ------------------------------------------------------------------ constructor de niveles
  function Builder(width) {
    const g = [];
    for (let y = 0; y < BB.ROWS; y++) g.push(new Array(width).fill('.'));
    const inside = (x, y) => x >= 0 && x < width && y >= 0 && y < BB.ROWS;
    const api = {
      set(x, y, ch) { if (inside(x, y)) g[y][x] = ch; return api; },
      fill(x0, y0, x1, y1, ch) {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) api.set(x, y, ch);
        return api;
      },
      ground(x0, x1, top = 10) { return api.fill(x0, top, x1, BB.ROWS - 1, '#'); },
      row(x, y, str) { [...str].forEach((ch, i) => { if (ch !== ' ') api.set(x + i, y, ch); }); return api; },
      coins(x0, x1, y) { return api.fill(x0, y, x1, y, 'o'); },
      // escalera de piedra: n columnas, sube (dir=1) o baja (dir=-1)
      stairs(x, n, dir = 1, top = 10) {
        for (let i = 0; i < n; i++) {
          const h = dir > 0 ? i + 1 : n - i;
          api.fill(x + i, top - h, x + i, top - 1, 'X');
        }
        return api;
      },
      rows() { return g.map((r) => r.join('')); },
    };
    return api;
  }
  BB.Builder = Builder;

  function pradera() {
    const b = Builder(190);
    b.ground(0, 40).set(3, 9, '@');
    b.coins(7, 10, 7);
    b.set(13, 6, '*');
    b.row(17, 6, '=*=P=');
    b.set(19, 2, '*');
    b.set(24, 9, 'g');
    b.fill(28, 8, 29, 9, 'L');
    b.set(32, 9, 'g');
    b.fill(35, 7, 36, 9, 'L');
    b.coins(37, 39, 5);
    // hueco 41-43
    b.ground(44, 72);
    b.row(48, 6, '==*=P==');
    b.coins(48, 54, 5);
    b.set(58, 9, 's');
    b.set(66, 5, 'b');
    b.set(70, 9, 'g');
    // hueco 73-76 con plataforma
    b.row(74, 7, '--');
    b.ground(77, 85);
    b.stairs(82, 4, 1);
    b.ground(88, 112);
    b.stairs(88, 4, -1);
    b.coins(86, 87, 4);
    b.set(95, 9, 'p');
    b.row(98, 5, '=*=');
    b.set(100, 9, 'g').set(102, 9, 'g');
    b.set(106, 9, 'C');
    b.coins(108, 111, 8);
    b.ground(113, 132);
    b.row(118, 9, '^^');
    b.row(124, 6, '-----');
    b.coins(124, 128, 5);
    b.set(129, 9, 's');
    // gran hueco 133-141 con plataforma móvil
    b.set(133, 8, 'M');
    b.coins(135, 139, 4);
    b.ground(142, 189);
    b.set(150, 5, 'b');
    b.row(152, 6, '=P=');
    b.set(156, 9, 'g').set(158, 9, 'g');
    b.stairs(166, 6, 1);
    b.fill(172, 4, 172, 9, 'X');
    b.set(180, 9, '!');
    return { name: 'LA PRADERA', theme: 'pradera', time: 300, rows: b.rows() };
  }

  function cueva() {
    const b = Builder(180);
    b.fill(0, 0, 179, 0, '#');
    b.ground(0, 30).set(3, 9, '@');
    b.row(8, 6, '=*==*=');
    b.coins(9, 12, 4);
    b.set(16, 9, 'g').set(20, 9, 's');
    b.fill(23, 1, 30, 4, '#');
    b.coins(24, 29, 8);
    // hueco 31-33
    b.ground(34, 60);
    b.set(40, 4, 'b');
    b.row(44, 6, '=P=');
    b.set(48, 9, 'p');
    b.fill(52, 7, 53, 9, 'X');
    b.set(56, 9, 'g').set(58, 9, 'g');
    // foso 61-66 con plataformas
    b.row(62, 8, '--');
    b.row(65, 7, '--');
    b.ground(67, 100);
    b.fill(72, 1, 80, 5, '#');
    b.coins(73, 79, 9);
    b.set(77, 9, 'g');
    b.set(84, 9, 'C');
    b.row(88, 9, '^^^');
    b.set(94, 9, 's').set(97, 9, 's');
    // ascensor hacia la repisa alta
    b.set(102, 9, 'V');
    b.fill(105, 5, 115, 11, '#');
    b.coins(106, 114, 3);
    b.row(108, 1, '=H=');
    b.ground(116, 140);
    b.set(122, 5, 'b').set(127, 3, 'b');
    b.row(130, 6, '=*=*=');
    b.set(134, 9, 'p').set(137, 9, 'g');
    // foso 141-145 con plataforma móvil
    b.set(141, 8, 'M');
    b.ground(146, 179);
    b.set(150, 9, 's');
    b.row(154, 5, '=*=');
    b.stairs(160, 4, 1);
    b.fill(164, 6, 165, 9, 'X');
    b.set(172, 9, '!');
    return { name: 'LA CUEVA ECO', theme: 'cueva', time: 300, rows: b.rows() };
  }

  function castillo() {
    const b = Builder(170);
    b.fill(0, 0, 169, 0, '#');
    b.ground(0, 20).set(3, 9, '@');
    b.set(12, 9, 'p');
    b.coins(14, 18, 7);
    b.fill(21, 11, 24, 11, '~');
    b.ground(25, 45);
    b.row(30, 6, '=P=');
    b.set(35, 5, 'b');
    b.set(40, 9, 'p');
    // lago de lava con plataforma móvil
    b.fill(46, 11, 55, 11, '~');
    b.set(47, 8, 'M');
    b.coins(48, 53, 4);
    b.ground(56, 80);
    b.fill(60, 6, 62, 6, 'X');
    b.coins(60, 62, 5);
    b.set(66, 9, 'g').set(69, 9, 'p');
    b.row(72, 5, '=*=');
    b.fill(81, 11, 84, 11, '~');
    b.ground(85, 105);
    b.set(88, 9, 'C');
    b.set(92, 9, 's');
    b.set(96, 5, 'b');
    b.set(100, 9, 'p');
    b.fill(106, 11, 112, 11, '~');
    b.set(106, 8, 'M');
    b.ground(113, 169);
    b.set(120, 6, 'H');
    // arena del jefe
    b.row(127, 6, '---');
    b.row(150, 6, '---');
    b.set(142, 8, 'K');
    b.set(162, 9, '!');
    return { name: 'EL CASTILLO', theme: 'castillo', time: 300, boss: true, rows: b.rows() };
  }

  BB.LEVELS = [pradera(), cueva(), castillo()];
})(typeof window !== 'undefined' ? window : globalThis);
