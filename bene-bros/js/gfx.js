// BENE BROS — gráficos: fuente pixelada, sprites, tiles y fondos.
(function (global) {
  'use strict';
  const BB = global.BB;
  const T = 16;

  // ------------------------------------------------------------------ fuente 3x5
  const GLYPHS = {
    ' ': '00000', '0': '75557', '1': '26227', '2': '71747', '3': '71317', '4': '55711',
    '5': '74717', '6': '74757', '7': '71122', '8': '75757', '9': '75717', 'A': '25755',
    'B': '65656', 'C': '34443', 'D': '65556', 'E': '74647', 'F': '74644', 'G': '34553',
    'H': '55755', 'I': '72227', 'J': '11152', 'K': '55655', 'L': '44447', 'M': '57755',
    'N': '65555', 'O': '25552', 'P': '65644', 'Q': '25563', 'R': '65655', 'S': '34216',
    'T': '72222', 'U': '55557', 'V': '55552', 'W': '55775', 'X': '55255', 'Y': '55222',
    'Z': '71247', 'Ñ': '70655', '!': '22202', '¡': '20222', '?': '71202', '¿': '20247',
    '.': '00002', ',': '00024', ':': '02020', '-': '00700', '+': '02720', '/': '11244',
    '(': '24442', ')': '21112', '=': '07070', "'": '22000', '<': '12421', '>': '42124',
    '*': '05250', '%': '51245', '_': '00007', '×': '05250', '♥': '05775', '·': '00200',
  };
  const ACC = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U' };

  function text(ctx, str, x, y, color = '#fff', scale = 1, shadow = '#1a1c2c') {
    str = String(str).toUpperCase();
    if (shadow) drawText(ctx, str, x + scale, y + scale, shadow, scale);
    drawText(ctx, str, x, y, color, scale);
  }
  function drawText(ctx, str, x, y, color, scale) {
    ctx.fillStyle = color;
    let cx = Math.round(x);
    for (let ch of str) {
      if (ACC[ch]) ch = ACC[ch];
      const g = GLYPHS[ch] || GLYPHS['?'];
      for (let r = 0; r < 5; r++) {
        const bits = +g[r];
        for (let b = 0; b < 3; b++) if (bits & (4 >> b)) ctx.fillRect(cx + b * scale, Math.round(y) + r * scale, scale, scale);
      }
      cx += 4 * scale;
    }
  }
  // Letras grandes 5x7 para el logotipo.
  const BIG = {
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  };
  function bigLetter(ctx, ch, x, y, color, scale) {
    const g = BIG[ch];
    if (!g) return;
    ctx.fillStyle = color;
    g.forEach((row, r) => [...row].forEach((b, c) => { if (b === '1') ctx.fillRect(x + c * scale, y + r * scale, scale, scale); }));
  }

  const textWidth = (str, scale = 1) => (String(str).length * 4 - 1) * scale;
  function textCenter(ctx, str, cx, y, color, scale = 1, shadow) {
    text(ctx, str, Math.round(cx - textWidth(str, scale) / 2), y, color, scale, shadow);
  }

  // ------------------------------------------------------------------ sprites
  const cache = {};
  function sprite(name, swap) {
    const key = name + '|' + (swap || '');
    if (cache[key]) return cache[key];
    const rows = BB.SPRITES[name];
    const pal = Object.assign({}, BB.PAL, swap ? BB.PAL_SWAPS[swap] : null);
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16;
    const c = cv.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < 16; x++) {
        const ch = row[x];
        if (ch === '.' || !pal[ch]) continue;
        c.fillStyle = pal[ch];
        c.fillRect(x, y, 1, 1);
      }
    });
    cache[key] = cv;
    return cv;
  }

  // drawSprite(ctx, nombre, x, y, {flip, flipY, swap, scale, alpha})
  function drawSprite(ctx, name, x, y, o = {}) {
    const img = sprite(name, o.swap);
    const s = o.scale || 1;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    ctx.translate(Math.round(x) + (o.flip ? 16 * s : 0), Math.round(y) + (o.flipY ? 16 * s : 0));
    ctx.scale(o.flip ? -1 : 1, o.flipY ? -1 : 1);
    ctx.drawImage(img, 0, 0, 16 * s * (o.sx || 1), 16 * s * (o.sy || 1));
    ctx.restore();
  }

  // ------------------------------------------------------------------ temas
  const THEMES = {
    pradera: {
      sky: ['#73eff7', '#41a6f6'], ground: '#a0703c', groundDark: '#73464c', top: '#38b764', topLight: '#a7f070',
      brick: '#c4553b', brickDark: '#7a2d26', block: '#7d6bd6', blockDark: '#3d2e8a', stone: '#94b0c2', stoneDark: '#566c86',
    },
    cueva: {
      sky: ['#1a1c2c', '#29366f'], ground: '#5d4a7a', groundDark: '#33244a', top: '#7d6bd6', topLight: '#b0a2f0',
      brick: '#3b7a8a', brickDark: '#1f4550', block: '#c4553b', blockDark: '#7a2d26', stone: '#6d6d8a', stoneDark: '#3a3a52',
    },
    castillo: {
      sky: ['#2a0f1f', '#5d275d'], ground: '#566c86', groundDark: '#333c57', top: '#94b0c2', topLight: '#c2d3e0',
      brick: '#8a3b3b', brickDark: '#4a1c1c', block: '#7d6bd6', blockDark: '#3d2e8a', stone: '#94b0c2', stoneDark: '#566c86',
    },
  };

  function px(c, color, x, y, w = 1, h = 1) { c.fillStyle = color; c.fillRect(x, y, w, h); }

  const tileCache = {};
  function makeTile(theme, key, draw) {
    const k = theme + key;
    if (!tileCache[k]) {
      const cv = document.createElement('canvas');
      cv.width = T; cv.height = T;
      draw(cv.getContext('2d'), THEMES[theme]);
      tileCache[k] = cv;
    }
    return tileCache[k];
  }

  const TILE_DRAW = {
    ground(c, th) {
      px(c, th.ground, 0, 0, 16, 16);
      for (const [x, y] of [[3, 4], [11, 2], [7, 10], [13, 12], [2, 13], [9, 6]]) px(c, th.groundDark, x, y, 2, 1);
    },
    groundTop(c, th) {
      TILE_DRAW.ground(c, th);
      px(c, th.top, 0, 0, 16, 5);
      px(c, th.topLight, 0, 0, 16, 1);
      for (let x = 0; x < 16; x += 3) px(c, th.top, x, 5, 2, (x * 7) % 3 + 1);
    },
    brick(c, th) {
      px(c, th.brickDark, 0, 0, 16, 16);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let x = -8 + off; x < 16; x += 8) px(c, th.brick, x + 1, row * 4 + 1, 7, 3);
      }
    },
    block(c, th, used) {
      px(c, '#1a1c2c', 0, 0, 16, 16);
      px(c, used ? '#566c86' : th.block, 1, 1, 14, 14);
      px(c, used ? '#333c57' : th.blockDark, 2, 13, 13, 2);
      px(c, used ? '#333c57' : th.blockDark, 13, 2, 2, 13);
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px(c, '#1a1c2c', x, y);
      if (!used) { // estrella
        const s = ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'y.....y'];
        s.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'y') px(c, '#ffcd75', 4 + x, 4 + y); }));
      }
    },
    stone(c, th) {
      px(c, th.stoneDark, 0, 0, 16, 16);
      px(c, th.stone, 0, 0, 15, 15);
      px(c, '#ffffff33', 1, 1, 13, 1);
      px(c, th.stoneDark, 3, 3, 10, 10);
      px(c, th.stone, 4, 4, 8, 8);
    },
    log(c) {
      px(c, '#73464c', 0, 0, 16, 16);
      px(c, '#a0703c', 2, 0, 12, 16);
      for (let y = 2; y < 16; y += 5) px(c, '#73464c', 5, y, 1, 3);
      px(c, '#73464c', 10, 4, 1, 4);
    },
    logTop(c) {
      TILE_DRAW.log(c);
      px(c, '#d9a066', 1, 0, 14, 5);
      px(c, '#a0703c', 4, 1, 8, 3);
      px(c, '#d9a066', 6, 2, 4, 1);
    },
    plank(c) {
      px(c, '#73464c', 0, 0, 16, 6);
      px(c, '#d9a066', 0, 0, 16, 4);
      px(c, '#a0703c', 0, 3, 16, 1);
      px(c, '#73464c', 7, 0, 1, 4);
    },
    spikes(c) {
      for (let i = 0; i < 4; i++) {
        for (let y = 0; y < 8; y++) {
          const w = Math.floor(y / 2) + 1;
          px(c, '#c2d3e0', i * 4 + 2 - w / 2, 8 + y, w, 1);
        }
      }
      px(c, '#566c86', 0, 15, 16, 1);
    },
  };

  function tileImage(theme, ch, above) {
    switch (ch) {
      case '#': return makeTile(theme, BB.SOLID.has(above) && above === '#' ? 'g' : 'gt', above === '#' ? TILE_DRAW.ground : TILE_DRAW.groundTop);
      case '=': return makeTile(theme, '=', TILE_DRAW.brick);
      case '*': case 'P': case 'H': return makeTile(theme, '*', (c, th) => TILE_DRAW.block(c, th, false));
      case 'U': return makeTile(theme, 'U', (c, th) => TILE_DRAW.block(c, th, true));
      case 'X': return makeTile(theme, 'X', TILE_DRAW.stone);
      case 'L': return above === 'L' ? makeTile(theme, 'L', TILE_DRAW.log) : makeTile(theme, 'Lt', TILE_DRAW.logTop);
      case '-': return makeTile(theme, '-', TILE_DRAW.plank);
      case '^': return makeTile(theme, '^', TILE_DRAW.spikes);
      default: return null;
    }
  }

  function drawLava(ctx, x, y, t) {
    ctx.fillStyle = '#e43b44'; ctx.fillRect(x, y + 3, T, T - 3);
    ctx.fillStyle = '#f7a23b';
    for (let i = 0; i < T; i += 2) {
      const h = 3 + Math.round(Math.sin((x + i) * 0.4 + t * 0.1) * 2);
      ctx.fillRect(x + i, y + 6 - h, 2, h);
    }
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(x + ((t >> 2) + x) % 14, y + 8, 2, 1);
  }

  // ------------------------------------------------------------------ fondos
  function background(ctx, theme, camX, W, H, t) {
    const th = THEMES[theme];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, th.sky[0]); grad.addColorStop(1, th.sky[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    if (theme === 'pradera') {
      // nubes
      for (let i = 0; i < 8; i++) {
        const x = ((i * 157 - camX * 0.2 + t * 0.05) % (W + 80) + W + 80) % (W + 80) - 40;
        const y = 18 + (i * 37) % 50;
        cloud(ctx, x, y);
      }
      // colinas
      hills(ctx, camX * 0.35, H - 60, '#38b764', 60, 0.018, W);
      hills(ctx, camX * 0.55, H - 40, '#257953', 40, 0.03, W);
    } else if (theme === 'cueva') {
      ctx.fillStyle = '#33244a';
      for (let i = -1; i < 12; i++) {
        const x = i * 40 - ((camX * 0.4) % 40);
        const h = 20 + ((i + Math.floor(camX * 0.4 / 40)) * 13) % 30;
        ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x + 10, 16 + h); ctx.lineTo(x + 20, 16); ctx.fill();
      }
      for (let i = 0; i < 30; i++) {
        const x = ((i * 97 - camX * 0.25) % W + W) % W, y = 30 + (i * 53) % 120;
        ctx.fillStyle = (t >> 4) % 6 === i % 6 ? '#b0a2f0' : '#5d4a7a';
        ctx.fillRect(x, y, 1, 1);
      }
    } else {
      // ventanas y columnas del castillo
      for (let i = -1; i < 10; i++) {
        const x = i * 48 - ((camX * 0.4) % 48);
        ctx.fillStyle = '#3d1a3a'; ctx.fillRect(x, 0, 14, H);
        ctx.fillStyle = '#1a0a14'; ctx.fillRect(x + 24, 50, 12, 22);
        ctx.beginPath(); ctx.arc(x + 30, 50, 6, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#f7a23b'; ctx.fillRect(x + 6, 90, 2, 4 + (t >> 3) % 2);
      }
    }
  }

  function cloud(ctx, x, y) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y, 20, 8); ctx.fillRect(x, y + 4, 30, 6); ctx.fillRect(x + 10, y - 4, 10, 6);
    ctx.fillStyle = '#d6f1ff'; ctx.fillRect(x, y + 9, 30, 1);
  }

  function hills(ctx, off, base, color, amp, freq, W) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 400);
    for (let x = 0; x <= W; x += 4) {
      const y = base - Math.abs(Math.sin((x + off) * freq)) * amp;
      ctx.lineTo(x, Math.round(y / 2) * 2);
    }
    ctx.lineTo(W, 400); ctx.fill();
  }

  // ------------------------------------------------------------------ objetos especiales
  function drawBell(ctx, x, y, t, ringing) {
    // poste
    ctx.fillStyle = '#73464c'; ctx.fillRect(x + 6, y - 40, 4, 56);
    ctx.fillStyle = '#a0703c'; ctx.fillRect(x - 2, y - 44, 20, 4);
    const sw = ringing ? Math.sin(t * 0.5) * 3 : Math.sin(t * 0.05);
    const bx = x + 8 + sw, by = y - 38;
    ctx.fillStyle = '#1a1c2c'; ctx.beginPath(); ctx.moveTo(bx - 9, by + 16); ctx.lineTo(bx + 9, by + 16); ctx.lineTo(bx + 6, by + 2); ctx.lineTo(bx - 6, by + 2); ctx.fill();
    ctx.fillStyle = '#f7a23b'; ctx.beginPath(); ctx.moveTo(bx - 8, by + 15); ctx.lineTo(bx + 8, by + 15); ctx.lineTo(bx + 5, by + 3); ctx.lineTo(bx - 5, by + 3); ctx.fill();
    ctx.fillStyle = '#ffcd75'; ctx.fillRect(bx - 3, by + 5, 2, 8);
    ctx.fillStyle = '#c46a1c'; ctx.fillRect(bx - 1, by + 16, 3, 3);
  }

  function drawFlag(ctx, x, y, active, t) {
    ctx.fillStyle = '#94b0c2'; ctx.fillRect(x + 3, y - 16, 2, 32);
    ctx.fillStyle = active ? '#38b764' : '#e43b44';
    const w = Math.round(Math.sin(t * 0.15));
    ctx.fillRect(x + 5, y - 15 + w, 9, 6);
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + 8, y - 13 + w, 3, 2);
  }

  function drawPlatform(ctx, x, y, w) {
    for (let i = 0; i < w; i += 16) ctx.drawImage(makeTile('pradera', '-', TILE_DRAW.plank), Math.round(x + i), Math.round(y));
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(Math.round(x), Math.round(y) + 6, w, 1);
  }

  BB.GFX = { T, bigLetter, text, textCenter, textWidth, sprite, drawSprite, tileImage, drawLava, background, drawBell, drawFlag, drawPlatform, THEMES };
})(typeof window !== 'undefined' ? window : globalThis);
