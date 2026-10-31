// BENE BROS — vista 3D con Three.js.
// La lógica del juego sigue siendo la de game.js (en píxeles 2D); aquí se traduce cada
// frame a una escena 3D: 1 casilla = 1 unidad, x hacia la derecha, y hacia arriba, z hacia la cámara.
(function (global) {
  'use strict';
  const BB = global.BB, THREE = global.THREE;
  // Los colores hexadecimales se interpretan en sRGB (colores fieles con iluminación realista).
  THREE.ColorManagement.legacyMode = false;
  const T = 16, ROWS = 12, VW = 320, VH = 192;
  const DEPTH = 3;                              // profundidad del suelo
  const wx = (px) => px / T;
  const wy = (py) => ROWS - py / T;
  const lerp = (a, b, k) => a + (b - a) * k;

  function seeded(seed) {
    let s = (seed % 2147483647 + 2147483647) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ================================================================== texturas procedurales
  const texCache = {};
  function canvasTex(key, size, draw, linear) {
    const k = key + (linear ? ':lin' : '');
    if (texCache[k]) return texCache[k];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size, seeded(key.length * 7919 + size));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (!linear) t.encoding = THREE.sRGBEncoding;
    return (texCache[k] = t);
  }
  function speckle(ctx, size, rnd, colors, n, r0, r1) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      const r = r0 + rnd() * (r1 - r0);
      ctx.beginPath(); ctx.ellipse(rnd() * size, rnd() * size, r, r * (0.6 + rnd() * 0.6), rnd() * 3, 0, 7); ctx.fill();
    }
  }

  const DRAW = {
    grass(ctx, s, rnd) {
      ctx.fillStyle = '#4c9636'; ctx.fillRect(0, 0, s, s);
      const greens = ['#3a7d28', '#5aad40', '#6fc24f', '#2f6a22', '#84cf5c'];
      for (let i = 0; i < 3500; i++) {
        ctx.strokeStyle = greens[Math.floor(rnd() * greens.length)];
        const x = rnd() * s, y = rnd() * s, l = 2 + rnd() * 5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd() * 2 - 1, y - l); ctx.stroke();
      }
    },
    dirt(ctx, s, rnd) {
      ctx.fillStyle = '#7a5233'; ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, rnd, ['#6a4429', '#8d613d', '#5a3a22', '#9c7048', '#704a2e'], 1800, 0.6, 2);
      speckle(ctx, s, rnd, ['#8f8578', '#a39888', '#6d665c'], 30, 2, 5);
    },
    dirtGrass(ctx, s, rnd) {
      DRAW.dirt(ctx, s, rnd);
      ctx.fillStyle = 'rgba(40,25,10,.35)';
      for (let x = 0; x < s; x += 2) ctx.fillRect(x, 0, 2, s * 0.3 + rnd() * 6 + 3);
      for (let x = 0; x < s; x += 2) {
        const h = s * (0.2 + rnd() * 0.1);
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#6fc24f'); grd.addColorStop(1, '#3a7d28');
        ctx.fillStyle = grd; ctx.fillRect(x, 0, 2, h);
      }
    },
    rock(ctx, s, rnd) {
      ctx.fillStyle = '#463b5c'; ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, rnd, ['#3a3050', '#54486e', '#5f527a', '#2f2742'], 1500, 1, 4);
      ctx.strokeStyle = 'rgba(15,10,25,.7)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        let x = rnd() * s, y = rnd() * s; ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += rnd() * 24 - 12; y += rnd() * 24 - 12; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    },
    rockTop(ctx, s, rnd) {
      DRAW.rock(ctx, s, rnd);
      speckle(ctx, s, rnd, ['#7c6aa8', '#8f7cc0', '#6e5d99'], 900, 1, 4);
      speckle(ctx, s, rnd, ['#7fe0d0', '#a3f0e2'], 40, 0.5, 1.4);
    },
    rockSide(ctx, s, rnd) {
      DRAW.rock(ctx, s, rnd);
      ctx.fillStyle = 'rgba(140,120,190,.45)'; ctx.fillRect(0, 0, s, s * 0.14);
    },
    castle(ctx, s, rnd) {
      ctx.fillStyle = '#2e3443'; ctx.fillRect(0, 0, s, s);
      const rows = 4, h = s / rows;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? s / 4 : 0;
        for (let c = -1; c < 2; c++) {
          const v = 95 + Math.floor(rnd() * 30);
          ctx.fillStyle = `rgb(${v - 10},${v},${v + 18})`;
          ctx.fillRect(c * s / 2 + off + 2, r * h + 2, s / 2 - 4, h - 4);
        }
      }
      speckle(ctx, s, rnd, ['rgba(0,0,0,.25)', 'rgba(255,255,255,.08)'], 600, 0.5, 2);
    },
    castleTop(ctx, s, rnd) {
      ctx.fillStyle = '#7b879c'; ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, rnd, ['#6c7890', '#8c97ab', '#5d6880'], 1200, 1, 3);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, s / 2 - 1, s, 2);
    },
    brick(ctx, s, rnd) {
      ctx.fillStyle = '#b9ad9c'; ctx.fillRect(0, 0, s, s);
      const rows = 4, h = s / rows;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? s / 4 : 0;
        for (let c = -1; c < 2; c++) {
          const v = rnd() * 30;
          ctx.fillStyle = `rgb(${160 + v},${62 + v / 2},${42 + v / 3})`;
          ctx.fillRect(c * s / 2 + off + 3, r * h + 3, s / 2 - 6, h - 6);
        }
      }
      speckle(ctx, s, rnd, ['rgba(60,20,10,.35)', 'rgba(255,200,170,.15)'], 500, 0.5, 2);
    },
    brickBump(ctx, s) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s);
      const rows = 4, h = s / rows;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? s / 4 : 0;
        for (let c = -1; c < 2; c++) { ctx.fillStyle = '#fff'; ctx.fillRect(c * s / 2 + off + 3, r * h + 3, s / 2 - 6, h - 6); }
      }
    },
    block(ctx, s) {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, '#6a55e0'); g.addColorStop(1, '#2a1f73');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#9d8cff'; ctx.lineWidth = s * 0.06; ctx.strokeRect(s * 0.05, s * 0.05, s * 0.9, s * 0.9);
      ctx.fillStyle = '#c9b8ff';
      for (const [x, y] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]]) { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.035, 0, 7); ctx.fill(); }
      DRAW.star(ctx, s, '#ffcf4d', '#a86a00');
    },
    star(ctx, s, fill, stroke) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 ? 0.14 : 0.32) * s, a = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.lineWidth = s * 0.02; ctx.strokeStyle = stroke; ctx.stroke(); }
    },
    blockGlow(ctx, s) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s); DRAW.star(ctx, s, '#ffb300'); },
    used(ctx, s, rnd) {
      ctx.fillStyle = '#6b5a4a'; ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, rnd, ['#5a4a3c', '#7d6a58', '#4a3c30'], 500, 1, 3);
      ctx.strokeStyle = '#3e3228'; ctx.lineWidth = s * 0.05; ctx.strokeRect(s * 0.05, s * 0.05, s * 0.9, s * 0.9);
      ctx.fillStyle = '#8a7660';
      for (const [x, y] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]]) { ctx.beginPath(); ctx.arc(x * s, y * s, s * 0.035, 0, 7); ctx.fill(); }
    },
    stone(ctx, s, rnd) {
      ctx.fillStyle = '#8f9bab'; ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, rnd, ['#7f8b9b', '#a3aebc', '#76818f', '#98a3b2'], 1200, 1, 3.5);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = s * 0.04; ctx.strokeRect(s * 0.03, s * 0.03, s * 0.94, s * 0.94);
      ctx.strokeStyle = 'rgba(30,35,45,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.3); ctx.lineTo(s * 0.35, s * 0.45); ctx.lineTo(s * 0.3, s * 0.7); ctx.stroke();
    },
    wood(ctx, s, rnd) {
      ctx.fillStyle = '#9a6a3c'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 4; i++) {
        const v = rnd() * 25;
        ctx.fillStyle = `rgb(${150 + v},${100 + v},${55 + v / 2})`;
        ctx.fillRect(0, i * s / 4 + 1, s, s / 4 - 2);
      }
      ctx.strokeStyle = 'rgba(80,45,20,.4)';
      for (let i = 0; i < 40; i++) { const y = rnd() * s; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(s / 3, y + rnd() * 4 - 2, s * 2 / 3, y + rnd() * 4 - 2, s, y); ctx.stroke(); }
    },
    bark(ctx, s, rnd) {
      ctx.fillStyle = '#5d3d24'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 60; i++) {
        const x = rnd() * s, w = 1 + rnd() * 3;
        ctx.fillStyle = rnd() < 0.5 ? '#4a2f1b' : '#73502f';
        ctx.fillRect(x, 0, w, s);
      }
      speckle(ctx, s, rnd, ['rgba(20,10,5,.4)'], 80, 1, 3);
    },
    rings(ctx, s) {
      ctx.fillStyle = '#c99a62'; ctx.fillRect(0, 0, s, s);
      for (let r = s / 2; r > 2; r -= 5) { ctx.strokeStyle = r % 10 ? '#a87a46' : '#b8894f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s / 2, s / 2, r, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = '#5d3d24'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 3, 0, 7); ctx.stroke();
    },
    lava(ctx, s, rnd) {
      ctx.fillStyle = '#c72a12'; ctx.fillRect(0, 0, s, s);
      speckle(ctx, s, rnd, ['#ff6a1a', '#ff8c2a', '#e0401a', '#ffb347'], 160, 3, 12);
      speckle(ctx, s, rnd, ['#ffe08a'], 40, 1, 3);
      speckle(ctx, s, rnd, ['rgba(60,10,0,.6)'], 50, 2, 7);
    },
    cap(ctx, s, rnd) {
      ctx.fillStyle = '#c9c9c9'; ctx.fillRect(0, 0, s, s);
      const n = 12;
      for (let y = 0; y < n; y++) for (let x = 0; x < n * 2; x++) {
        const v = 120 + rnd() * 60;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.beginPath(); ctx.ellipse((x + (y % 2) * 0.5) * s / (n * 2), y * s / n + s / n / 2, s / (n * 4), s / n / 2.2, 0, 0, 7); ctx.fill();
      }
    },
    knit(ctx, s) {
      ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 8) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, 0, 4, s); }
      for (let y = 0; y < s; y += 4) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, y, s, 1); }
    },
    denim(ctx, s, rnd) {
      ctx.fillStyle = '#d0d0d0'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2500; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.12)'; ctx.fillRect(rnd() * s, rnd() * s, 2, 1); }
    },
    spiral(ctx, s) {
      ctx.clearRect(0, 0, s, s);
      ctx.strokeStyle = '#8d2846'; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.1) { const r = a / (Math.PI * 6) * s * 0.46; ctx.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); }
      ctx.stroke();
    },
  };

  const tx = (name, linear) => canvasTex(name, name === 'grass' || name === 'dirt' || name === 'rock' ? 256 : 128, DRAW[name], linear);

  // ================================================================== materiales
  const matCache = {};
  function mat(key, make) { return matCache[key] || (matCache[key] = make()); }
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const M = {
    skin: () => mat('skin', () => std({ color: '#f2bf98', roughness: 0.6 })),
    dark: () => mat('dark', () => std({ color: '#141418', roughness: 0.3 })),
    eye: () => mat('eye', () => std({ color: '#ffffff', roughness: 0.15 })),
    gold: () => mat('gold', () => std({ color: '#ffc93c', metalness: 1, roughness: 0.22, emissive: '#5a3c00' })),
    wood: () => mat('wood', () => std({ map: tx('wood'), roughness: 0.8, bumpMap: tx('wood', true), bumpScale: 0.02 })),
    bark: () => mat('bark', () => std({ map: tx('bark'), roughness: 0.95, bumpMap: tx('bark', true), bumpScale: 0.03 })),
    metal: () => mat('metal', () => std({ color: '#c8d0da', metalness: 0.9, roughness: 0.3 })),
  };

  function groundMats(theme) {
    return mat('ground-' + theme, () => {
      const T3 = {
        pradera: ['grass', 'dirtGrass', 'dirt'],
        cueva: ['rockTop', 'rockSide', 'rock'],
        castillo: ['castleTop', 'castle', 'castle'],
      }[theme];
      const mk = (n, rough) => std({ map: tx(n), roughness: rough, bumpMap: tx(n, true), bumpScale: 0.04 });
      const top = mk(T3[0], 0.95), side = mk(T3[1], 0.95), fill = mk(T3[2], 0.95);
      return { top, side, fill, topArr: [side, side, top, fill, side, side], fillArr: [fill, fill, fill, fill, fill, fill] };
    });
  }

  // Caja cuyos lados largos repiten la textura en lugar de estirarla.
  function boxGeo(w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < 24; i++) {
      const face = Math.floor(i / 4);
      if (face === 0 || face === 1) uv.setX(i, uv.getX(i) * d / h);
      if (face === 2 || face === 3) uv.setY(i, uv.getY(i) * d / w);
    }
    return g;
  }

  // ================================================================== modelos
  function mesh(geo, material, cast = true) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = cast; m.receiveShadow = true;
    return m;
  }
  const sphere = (r, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);

  function addEyes(parent, x, y, z, r, spread, look = 0, angry = false) {
    for (const s of [-1, 1]) {
      const e = mesh(sphere(r, 14, 10), M.eye(), false);
      e.position.set(x + s * spread, y, z); e.scale.z = 0.6;
      const p = mesh(sphere(r * 0.55, 10, 8), M.dark(), false);
      p.position.set(x + s * spread + look * -s * r * 0.25, y, z + r * 0.45);
      parent.add(e, p);
      if (angry) {
        const b = mesh(new THREE.BoxGeometry(r * 2.2, r * 0.5, r * 0.5), M.dark(), false);
        b.position.set(x + s * spread, y + r * 1.25, z + r * 0.3);
        b.rotation.z = s * 0.45;
        parent.add(b);
      }
    }
  }

  function makeSantiago() {
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body); body.scale.setScalar(0.9);
    const knit = tx('knit');
    const beanie = std({ color: '#3b5dc9', roughness: 0.95, map: knit });
    const scarfM = std({ color: '#ef7d57', roughness: 0.95, map: knit });
    const jacket = std({ color: '#2f9e57', roughness: 0.7 });
    const jeans = std({ color: '#3a5296', roughness: 0.9, map: tx('denim') });
    const boots = std({ color: '#5a3a2e', roughness: 0.55 });
    const hair = std({ color: '#5b3420', roughness: 0.8 });

    const legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.1, 0.4, 0);
      const leg = mesh(new THREE.CapsuleGeometry(0.085, 0.2, 4, 10), jeans); leg.position.y = -0.16;
      const boot = mesh(new THREE.BoxGeometry(0.16, 0.11, 0.26), boots); boot.position.set(0, -0.34, 0.04);
      hip.add(leg, boot); body.add(hip); legs.push(hip);
    }
    const torso = mesh(new THREE.CapsuleGeometry(0.2, 0.17, 6, 16), jacket); torso.position.y = 0.58; torso.scale.z = 0.85;
    const zip = mesh(new THREE.BoxGeometry(0.03, 0.3, 0.02), M.metal(), false); zip.position.set(0, 0.56, 0.17);
    body.add(torso, zip);
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.7, 0);
      const arm = mesh(new THREE.CapsuleGeometry(0.062, 0.2, 4, 10), jacket); arm.position.y = -0.14;
      const hand = mesh(sphere(0.068, 12, 10), M.skin()); hand.position.y = -0.3;
      sh.add(arm, hand); body.add(sh); arms.push(sh);
    }
    const scarf = mesh(new THREE.TorusGeometry(0.15, 0.065, 10, 22), scarfM); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.77;
    const tail = new THREE.Group(); tail.position.set(0.08, 0.76, -0.14);
    const tailM = mesh(new THREE.BoxGeometry(0.11, 0.32, 0.05), scarfM); tailM.position.y = -0.15; tail.add(tailM);
    body.add(scarf, tail);
    const head = new THREE.Group(); head.position.y = 1.0; body.add(head);
    head.add(mesh(sphere(0.24, 24, 18), M.skin()));
    const hairBack = mesh(new THREE.SphereGeometry(0.248, 20, 14, Math.PI, Math.PI, 0.3, 1.6), hair); hairBack.position.y = 0.01;
    head.add(hairBack);
    for (const s of [-1, 1]) { const ear = mesh(sphere(0.055, 10, 8), M.skin()); ear.position.set(s * 0.235, -0.02, 0); head.add(ear); }
    addEyes(head, 0, 0.03, 0.2, 0.048, 0.085);
    const nose = mesh(sphere(0.04, 10, 8), std({ color: '#e8a37f', roughness: 0.6 })); nose.position.set(0, -0.03, 0.235); head.add(nose);
    const mouth = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), std({ color: '#7a2e2e', roughness: 0.6 }), false);
    mouth.position.set(0, -0.09, 0.215); mouth.rotation.z = Math.PI; head.add(mouth);
    const hat = new THREE.Group(); hat.position.y = 0.04; head.add(hat);
    const dome = mesh(new THREE.SphereGeometry(0.255, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), beanie); dome.scale.y = 1.1;
    const brim = mesh(new THREE.TorusGeometry(0.245, 0.055, 10, 26), beanie); brim.rotation.x = Math.PI / 2;
    const pom = mesh(sphere(0.09, 14, 10), std({ color: '#f4f4f4', roughness: 1 })); pom.position.y = 0.3;
    hat.add(dome, brim, pom);

    return { root, body, legs, arms, tail, head, beanie, squash: 0, wasGround: true };
  }

  function makeAcorn(king) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const nut = mesh(sphere(0.36, 26, 20), std({ color: king ? '#d9a066' : '#c98a4b', roughness: 0.32 }));
    nut.position.y = 0.42; nut.scale.y = 1.12;
    const capM = std({ color: king ? '#6a2a6a' : '#6b4528', roughness: 0.95, map: tx('cap'), bumpMap: tx('cap', true), bumpScale: 0.03 });
    const cap = mesh(new THREE.SphereGeometry(0.4, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2), capM); cap.position.y = 0.6; cap.scale.y = 0.72;
    const rim = mesh(new THREE.TorusGeometry(0.37, 0.05, 8, 26), capM); rim.rotation.x = Math.PI / 2; rim.position.y = 0.6;
    const stem = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 8), std({ color: '#4a2f1b', roughness: 0.9 })); stem.position.y = 0.95; stem.rotation.z = 0.3;
    body.add(nut, cap, rim, stem);
    addEyes(body, 0, 0.5, 0.31, 0.075, 0.12, 1, true);
    const mouth = mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12, Math.PI), M.dark(), false); mouth.position.set(0, 0.32, 0.345); body.add(mouth);
    const feet = [];
    for (const s of [-1, 1]) {
      const f = mesh(sphere(0.09, 12, 8), std({ color: '#3e2a1c', roughness: 0.7 })); f.scale.set(1, 0.6, 1.4); f.position.set(s * 0.14, 0.05, 0.04);
      body.add(f); feet.push(f);
    }
    if (king) {
      const crown = new THREE.Group(); crown.position.y = 1.0;
      crown.add(mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.16, 16, 1, true), M.gold()));
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const sp = mesh(new THREE.ConeGeometry(0.04, 0.13, 6), M.gold()); sp.position.set(Math.cos(a) * 0.22, 0.13, Math.sin(a) * 0.22);
        const gem = mesh(sphere(0.03, 8, 6), std({ color: i % 2 ? '#e43b44' : '#41a6f6', roughness: 0.1, metalness: 0.2 }), false);
        gem.position.set(Math.cos(a) * 0.245, 0, Math.sin(a) * 0.245);
        crown.add(sp, gem);
      }
      body.add(crown);
      root.scale.setScalar(1.9);
    }
    return { root, body, feet };
  }

  function makeSnail() {
    const root = new THREE.Group(), body = new THREE.Group(), shell = new THREE.Group();
    root.add(body, shell);
    const slime = std({ color: '#b3e06a', roughness: 0.2 });
    const foot = mesh(new THREE.CapsuleGeometry(0.12, 0.55, 6, 12), slime); foot.rotation.z = Math.PI / 2; foot.position.set(0.05, 0.12, 0); foot.scale.z = 0.9;
    const headM = mesh(sphere(0.14, 16, 12), slime); headM.position.set(0.36, 0.24, 0);
    body.add(foot, headM);
    for (const s of [-1, 1]) {
      const st = mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.24, 6), slime); st.position.set(0.4, 0.42, s * 0.06); st.rotation.z = -0.35; st.rotation.x = s * 0.25;
      const e = mesh(sphere(0.04, 10, 8), M.dark(), false); e.position.set(0.45, 0.54, s * 0.09);
      body.add(st, e);
    }
    const shellM = std({ color: '#f28fb8', roughness: 0.3 });
    const ball = mesh(sphere(0.3, 24, 18), shellM); ball.scale.z = 0.62; shell.add(ball);
    const decal = new THREE.MeshStandardMaterial({ map: tx('spiral'), transparent: true, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24), decal);
      d.position.z = s * 0.187; if (s < 0) d.rotation.y = Math.PI;
      shell.add(d);
    }
    shell.position.set(-0.05, 0.36, 0);
    return { root, body, shell };
  }

  function makeBird(bat) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const c = bat ? '#3d2f55' : '#7d6bd6';
    const feathers = std({ color: c, roughness: bat ? 0.8 : 0.6 });
    const torso = mesh(sphere(0.22, 18, 14), feathers); torso.scale.set(1.3, 0.9, 0.9);
    const belly = mesh(sphere(0.17, 14, 10), std({ color: bat ? '#5a4a75' : '#c9bdf5', roughness: 0.7 })); belly.position.set(0.06, -0.05, 0.05);
    const head = mesh(sphere(0.15, 16, 12), feathers); head.position.set(0.26, 0.12, 0);
    body.add(torso, belly, head);
    if (bat) {
      for (const s of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.05, 0.14, 6), feathers); ear.position.set(0.26, 0.28, s * 0.07); body.add(ear); }
    } else {
      const beak = mesh(new THREE.ConeGeometry(0.05, 0.16, 8), std({ color: '#f7a23b', roughness: 0.4 })); beak.rotation.z = -Math.PI / 2; beak.position.set(0.44, 0.1, 0);
      const tail = mesh(new THREE.ConeGeometry(0.1, 0.25, 4), feathers); tail.rotation.z = Math.PI / 2; tail.position.set(-0.36, 0.04, 0); tail.scale.z = 0.3;
      body.add(beak, tail);
    }
    for (const s of [-1, 1]) {
      const e = mesh(sphere(0.04, 10, 8), M.eye(), false); e.position.set(0.34, 0.16, s * 0.09);
      const p = mesh(sphere(0.022, 8, 6), M.dark(), false); p.position.set(0.37, 0.16, s * 0.1);
      body.add(e, p);
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(0, 0.08, s * 0.14);
      const w = mesh(sphere(0.3, 14, 8), feathers); w.scale.set(0.9, 0.05, 1.2); w.position.z = s * 0.3;
      pivot.add(w); body.add(pivot); wings.push(pivot);
    }
    return { root, body, wings };
  }

  function makeHedgehog() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const fur = std({ color: '#6d6052', roughness: 0.95 });
    const b = mesh(sphere(0.32, 20, 14), fur); b.scale.set(1.15, 0.8, 0.9); b.position.y = 0.28; body.add(b);
    const snout = mesh(sphere(0.14, 14, 10), std({ color: '#d9b48a', roughness: 0.7 })); snout.scale.set(1.3, 0.9, 0.9); snout.position.set(0.33, 0.22, 0);
    const nose = mesh(sphere(0.045, 10, 8), M.dark()); nose.position.set(0.51, 0.24, 0);
    body.add(snout, nose);
    for (const s of [-1, 1]) { const e = mesh(sphere(0.035, 8, 6), M.dark(), false); e.position.set(0.38, 0.33, s * 0.09); body.add(e); }
    const cone = new THREE.ConeGeometry(0.035, 0.24, 5);
    const spikes = new THREE.InstancedMesh(cone, std({ color: '#3a2f28', roughness: 0.6 }), 60);
    spikes.castShadow = true;
    const d = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), rnd = seeded(42);
    let n = 0;
    for (let i = 0; i < 400 && n < 60; i++) {
      const th = 0.15 + rnd() * 1.45, ph = rnd() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
      if (dir.x > 0.3) continue;
      d.position.set(dir.x * 0.37, 0.28 + dir.y * 0.26, dir.z * 0.29);
      d.quaternion.setFromUnitVectors(up, dir.clone().add(new THREE.Vector3(-0.3, 0, 0)).normalize());
      d.updateMatrix(); spikes.setMatrixAt(n++, d.matrix);
    }
    spikes.count = n;
    body.add(spikes);
    const feet = [];
    for (const s of [-1, 1]) { const f = mesh(sphere(0.07, 10, 8), std({ color: '#3e2a1c', roughness: 0.7 })); f.position.set(0.12 * s, 0.04, 0.12 * s); body.add(f); feet.push(f); }
    return { root, body, feet };
  }

  let heartGeo = null;
  function makeHeart() {
    if (!heartGeo) {
      const s = new THREE.Shape();
      s.moveTo(0, -0.3);
      s.bezierCurveTo(-0.05, -0.2, -0.32, -0.1, -0.32, 0.08);
      s.bezierCurveTo(-0.32, 0.25, -0.12, 0.3, 0, 0.16);
      s.bezierCurveTo(0.12, 0.3, 0.32, 0.25, 0.32, 0.08);
      s.bezierCurveTo(0.32, -0.1, 0.05, -0.2, 0, -0.3);
      heartGeo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4, curveSegments: 16 });
      heartGeo.center();
    }
    const root = new THREE.Group();
    root.add(mesh(heartGeo, mat('heart', () => std({ color: '#e8283a', roughness: 0.25, emissive: '#3a0005' }))));
    return { root };
  }

  function makeGoldAcorn() {
    const root = new THREE.Group();
    const nut = mesh(sphere(0.2, 18, 14), M.gold()); nut.scale.y = 1.15; nut.position.y = 0;
    const cap = mesh(new THREE.SphereGeometry(0.22, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('goldCap', () => std({ color: '#c4801c', metalness: 1, roughness: 0.4 })));
    cap.position.y = 0.1; cap.scale.y = 0.7;
    const stem = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 6), M.gold()); stem.position.y = 0.3;
    root.add(nut, cap, stem);
    return { root };
  }

  let coinGeo = null;
  function coinGeometry() {
    if (!coinGeo) { coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 28); coinGeo.rotateX(Math.PI / 2); }
    return coinGeo;
  }
  function makeCoin() { const root = new THREE.Group(); root.add(mesh(coinGeometry(), M.gold())); return { root }; }

  function makeBell() {
    const root = new THREE.Group();
    const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 10), M.bark()); post.position.y = 1.7;
    const bar = mesh(new THREE.BoxGeometry(1.2, 0.14, 0.14), M.wood()); bar.position.set(0, 3.35, 0);
    const swing = new THREE.Group(); swing.position.set(0.4, 3.28, 0);
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.06 + Math.pow(t, 1.8) * 0.42 + (t > 0.9 ? (t - 0.9) * 1.2 : 0), -t * 0.75)); }
    const bell = mesh(new THREE.LatheGeometry(pts, 28), M.gold()); bell.material.side = THREE.DoubleSide;
    const clap = mesh(sphere(0.08, 10, 8), M.metal()); clap.position.y = -0.72;
    swing.add(bell, clap);
    root.add(post, bar, swing);
    return { root, swing };
  }

  function makeFlag() {
    const root = new THREE.Group();
    const pole = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8), M.metal()); pole.position.y = 1.15;
    const ball = mesh(sphere(0.07, 10, 8), M.gold()); ball.position.y = 2.32;
    const geo = new THREE.PlaneGeometry(0.85, 0.5, 12, 4);
    const cloth = mesh(geo, std({ color: '#e43b44', roughness: 0.85, side: THREE.DoubleSide }));
    cloth.position.set(0.46, 1.95, 0);
    root.add(pole, ball, cloth);
    return { root, cloth, base: geo.attributes.position.array.slice() };
  }

  // ================================================================== cielo
  function skyDome(top, horizon, bottom, sunDir, sunColor) {
    const u = {
      top: { value: new THREE.Color(top) },
      horizon: { value: new THREE.Color(horizon) },
      bottom: { value: new THREE.Color(bottom) },
      sunDir: { value: sunDir.clone().normalize() },
      sunColor: { value: new THREE.Color(sunColor) },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunColor;
        varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.4));
          float s = max(dot(vDir, normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 600.0) * 6.0 + pow(s, 12.0) * 0.35);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m);
    dome.renderOrder = -10;
    return dome;
  }

  const THEMES = {
    pradera: {
      sky: ['#2f78d0', '#c7e8ff', '#e8f6ff'], sunDir: new THREE.Vector3(-0.4, 0.75, 0.55), sunColor: '#fff3d6',
      fog: ['#cfe9ff', 35, 160], sun: ['#fff1d6', 2.6], hemi: ['#cfe8ff', '#5a7a3a', 0.65], exposure: 1.0, playerLight: 0,
    },
    cueva: {
      sky: ['#0b0814', '#1b1430', '#07050c'], sunDir: new THREE.Vector3(0.2, 1, 0.6), sunColor: '#000000',
      fog: ['#120d1f', 8, 45], sun: ['#9db4ff', 0.55], hemi: ['#6a5a9a', '#1a1424', 0.45], exposure: 1.25, playerLight: 2.2,
    },
    castillo: {
      sky: ['#1a0610', '#5a1c2c', '#2a0a10'], sunDir: new THREE.Vector3(0.3, 0.3, -1), sunColor: '#ff7a3a',
      fog: ['#2a0f1f', 18, 80], sun: ['#ffc9a3', 1.3], hemi: ['#b29ac4', '#4a1a14', 0.9], exposure: 1.35, playerLight: 2.4,
    },
  };

  // ================================================================== vista
  class View3D {
    constructor(canvas) {
      this.canvas = canvas;
      const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.outputEncoding = THREE.sRGBEncoding;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(38, 5 / 3, 0.1, 900);
      this.pmrem = new THREE.PMREMGenerator(r);
      this.models = new Map();
      this.grid = null;
      this.camPos = new THREE.Vector3(10, 7, 17);
      this.camLook = new THREE.Vector3(10, 6, 0);
      this.dummy = new THREE.Object3D();
      this.envs = {};
    }

    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      if (w !== this.w || h !== this.h) {
        this.w = w; this.h = h;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      }
    }

    // ---------------------------------------------------------------- construcción del nivel
    build(game) {
      if (this.world) {
        this.scene.remove(this.world);
        this.world.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      }
      for (const m of this.models.values()) this.scene.remove(m.root);
      this.models.clear();
      this.grid = game.grid;
      const theme = this.theme = game.theme;
      const TH = THEMES[theme];
      const world = this.world = new THREE.Group();
      this.scene.add(world);
      this.renderer.toneMappingExposure = TH.exposure;

      // cielo, niebla, entorno
      this.sky = skyDome(TH.sky[0], TH.sky[1], TH.sky[2], TH.sunDir, TH.sunColor);
      world.add(this.sky);
      this.scene.fog = new THREE.Fog(TH.fog[0], TH.fog[1], TH.fog[2]);
      if (!this.envs[theme]) {
        const envScene = new THREE.Scene();
        envScene.add(skyDome(TH.sky[0], TH.sky[1], TH.sky[2], TH.sunDir, TH.sunColor));
        this.envs[theme] = this.pmrem.fromScene(envScene, 0.04, 0.1, 1000).texture;
      }
      this.scene.environment = this.envs[theme];

      // luces
      const hemi = new THREE.HemisphereLight(TH.hemi[0], TH.hemi[1], TH.hemi[2]);
      const sun = this.sun = new THREE.DirectionalLight(TH.sun[0], TH.sun[1]);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 13, bottom: -8, near: 1, far: 60 });
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
      world.add(hemi, sun, sun.target);
      this.playerLight = null;
      if (TH.playerLight) {
        this.playerLight = new THREE.PointLight('#ffc98a', TH.playerLight, 9, 1.6);
        world.add(this.playerLight);
      }

      this.buildTiles(game);
      this.buildDecor(game);

      // objetos fijos
      this.bellModel = null;
      if (game.bell) {
        this.bellModel = makeBell();
        this.bellModel.root.position.set(wx(game.bell.x + 8), wy(game.bell.y + 16), -0.6);
        world.add(this.bellModel.root);
      }
      this.flagModels = game.flags.map((f) => {
        const m = makeFlag();
        m.root.position.set(wx(f.x + 4), wy(f.y + 16), -0.5);
        world.add(m.root);
        return m;
      });
      this.platModels = game.platforms.map(() => {
        const m = mesh(new THREE.BoxGeometry(3, 0.32, 1.5), M.wood());
        world.add(m); return m;
      });
      // partículas
      this.particles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std({ roughness: 0.7 }), 400);
      this.particles.castShadow = true; this.particles.count = 0;
      this.particles.setColorAt(0, new THREE.Color());
      world.add(this.particles);

      if (this.player) this.scene.remove(this.player.root);
      this.player = makeSantiago();
      this.scene.add(this.player.root);
      this.camPos.set(wx(game.cam + VW / 2), 7.5, 17);
      this.camLook.set(wx(game.cam + VW / 2), 5.6, 0);
    }

    buildTiles(game) {
      const W = game.W, grid = game.grid, theme = game.theme, world = this.world;
      const cells = { top: [], fill: [], X: [], L: [], Ltop: [], '-': [], '^': [], '~': [], dyn: [], o: [] };
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < W; x++) {
          const ch = grid[y][x], above = y > 0 ? grid[y - 1][x] : '.';
          if (ch === '#') (above === '#' ? cells.fill : cells.top).push([x, y]);
          else if (ch === 'X') cells.X.push([x, y]);
          else if (ch === 'L') { cells.L.push([x, y]); if (above !== 'L') cells.Ltop.push([x, y]); }
          else if (ch === '-' || ch === '^' || ch === '~') cells[ch].push([x, y]);
          else if ('=*PHU'.includes(ch)) cells.dyn.push([x, y]);
          else if (ch === 'o') cells.o.push([x, y]);
        }
      }
      const d = this.dummy;
      const inst = (geo, material, list, place, shadow = true) => {
        if (!list.length) return null;
        const im = new THREE.InstancedMesh(geo, material, list.length);
        list.forEach((c, i) => { place(d, c[0], c[1], i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
        im.castShadow = shadow; im.receiveShadow = true;
        world.add(im);
        return im;
      };
      const center = (o, x, y) => { o.position.set(x + 0.5, ROWS - y - 0.5, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); };
      const gm = groundMats(theme);
      const gGeo = boxGeo(1, 1, DEPTH);
      inst(gGeo, gm.topArr, cells.top, center);
      inst(gGeo, gm.fillArr, cells.fill, center);
      inst(boxGeo(1, 1, 1.6), mat('stone', () => std({ map: tx('stone'), roughness: 0.85, bumpMap: tx('stone', true), bumpScale: 0.04 })), cells.X, center);
      inst(new THREE.CylinderGeometry(0.46, 0.48, 1, 22), M.bark(), cells.L, center);
      inst(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 22), mat('rings', () => std({ map: tx('rings'), roughness: 0.8 })), cells.Ltop, (o, x, y) => { center(o, x, y); o.position.y += 0.5; });
      inst(boxGeo(1, 0.28, 1.4), M.wood(), cells['-'], (o, x, y) => { center(o, x, y); o.position.y += 0.36; });
      // pinchos: tres conos por casilla
      const spikes = [];
      cells['^'].forEach(([x, y]) => { for (let k = 0; k < 3; k++) for (const z of [-0.35, 0.35]) spikes.push([x, y, k, z]); });
      if (spikes.length) {
        const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.14, 0.55, 8), mat('spike', () => std({ color: '#c7ced8', metalness: 0.85, roughness: 0.25 })), spikes.length);
        spikes.forEach(([x, y, k, z], i) => { d.position.set(x + 0.18 + k * 0.32, ROWS - y - 1 + 0.27, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
        im.castShadow = true; world.add(im);
      }
      // lava
      this.lavaTex = null;
      if (cells['~'].length) {
        const lt = tx('lava').clone(); lt.needsUpdate = true; lt.repeat.set(1, 1);
        this.lavaTex = lt;
        const lm = std({ map: lt, emissive: '#ff4a10', emissiveMap: lt, emissiveIntensity: 1.6, roughness: 0.5 });
        inst(boxGeo(1, 0.7, DEPTH), lm, cells['~'], (o, x, y) => { center(o, x, y); o.position.y -= 0.15; }, false);
        // luces del brillo de la lava (una por charco)
        const runs = [];
        cells['~'].forEach(([x, y]) => { const r = runs[runs.length - 1]; if (r && r.y === y && r.x1 === x - 1) r.x1 = x; else runs.push({ x0: x, x1: x, y }); });
        runs.slice(0, 8).forEach((r) => {
          const l = new THREE.PointLight('#ff6a2a', 3, 9, 1.5);
          l.position.set((r.x0 + r.x1 + 1) / 2, ROWS - r.y + 0.6, 1);
          world.add(l);
        });
      }
      // casillas que cambian: ladrillos, bloques estrella y bloques usados
      this.dyn = cells.dyn.map(([x, y]) => ({ x, y }));
      const n = Math.max(1, this.dyn.length);
      const mk = (material) => { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, n); im.castShadow = im.receiveShadow = true; world.add(im); return im; };
      this.dynMeshes = {
        '=': mk(mat('brick', () => std({ map: tx('brick'), roughness: 0.85, bumpMap: canvasTex('brickBump', 128, DRAW.brickBump, true), bumpScale: 0.05 }))),
        '*': mk(mat('block', () => std({ map: tx('block'), roughness: 0.35, metalness: 0.2, emissive: '#ffffff', emissiveMap: canvasTex('blockGlow', 128, DRAW.blockGlow), emissiveIntensity: 0.6 }))),
        'U': mk(mat('used', () => std({ map: tx('used'), roughness: 0.6, metalness: 0.4 }))),
      };
      this.coins = cells.o.map(([x, y]) => ({ x, y }));
      this.coinMesh = new THREE.InstancedMesh(coinGeometry(), M.gold(), Math.max(1, this.coins.length));
      this.coinMesh.castShadow = true;
      world.add(this.coinMesh);
    }

    buildDecor(game) {
      const W = game.W, world = this.world, theme = game.theme, rnd = seeded(W * 31 + theme.length);
      this.flames = null; this.torch = null; this.caveFill = null;
      const d = this.dummy;
      const scatter = (geo, material, n, place, shadow = false) => {
        const im = new THREE.InstancedMesh(geo, material, n);
        for (let i = 0; i < n; i++) { d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); place(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
        im.castShadow = shadow; im.receiveShadow = true;
        world.add(im); return im;
      };
      // superficie superior de cada columna (para colocar cosas encima)
      const topY = (x) => { for (let y = 0; y < ROWS; y++) if (game.grid[y][x] === '#') return ROWS - y; return null; };

      if (theme === 'pradera') {
        // suelo lejano
        const far = mesh(new THREE.PlaneGeometry(W + 400, 300), std({ color: '#5d9a45', roughness: 1 }), false);
        far.rotation.x = -Math.PI / 2; far.position.set(W / 2, -0.5, -150);
        world.add(far);
        // montañas
        scatter(new THREE.ConeGeometry(1, 1, 7), std({ color: '#7f93ad', roughness: 1, flatShading: true }), Math.ceil(W / 18) + 6, (o, i) => {
          o.position.set(-60 + i * 22 + rnd() * 10, -1, -120 - rnd() * 40); o.scale.set(25 + rnd() * 25, 25 + rnd() * 30, 20);
        });
        // colinas
        scatter(sphere(1, 24, 12), std({ color: '#5aa043', roughness: 1, map: tx('grass') }), Math.ceil(W / 10) + 4, (o, i) => {
          o.position.set(-20 + i * 11 + rnd() * 6, -3, -30 - rnd() * 25); o.scale.set(12 + rnd() * 10, 6 + rnd() * 6, 8);
        });
        // árboles detrás del camino
        const trees = [];
        for (let x = 1; x < W; x += 2 + Math.floor(rnd() * 4)) {
          trees.push({ x: x + rnd(), y: 1.7, z: -2.6 - rnd() * 10, s: 0.8 + rnd() * 0.9 });
        }
        scatter(new THREE.CylinderGeometry(0.12, 0.2, 1, 8), M.bark(), trees.length, (o, i) => {
          const t = trees[i]; o.position.set(t.x, t.y + t.s * 0.9, t.z); o.scale.set(t.s, t.s * 1.8, t.s);
        }, true);
        const leaves = scatter(new THREE.IcosahedronGeometry(1, 2), std({ roughness: 0.85, color: '#ffffff' }), trees.length * 3, (o, i) => {
          const t = trees[Math.floor(i / 3)], k = i % 3;
          o.position.set(t.x + (k - 1) * 0.35 * t.s, t.y + t.s * (2.2 + (k === 1 ? 0.5 : 0)), t.z + (k - 1) * 0.2);
          o.scale.setScalar(t.s * (k === 1 ? 0.75 : 0.6));
        }, true);
        const greens = ['#3f8a36', '#4d9a3c', '#357a2f', '#5aa846'];
        for (let i = 0; i < trees.length * 3; i++) leaves.setColorAt(i, new THREE.Color(greens[Math.floor(rnd() * greens.length)]));
        // suelo detrás del camino (para que los árboles no floten)
        const back = mesh(new THREE.PlaneGeometry(W + 60, 14), std({ map: (() => { const t = tx('grass').clone(); t.needsUpdate = true; t.repeat.set((W + 60) / 4, 3.5); return t; })(), roughness: 1 }), false);
        back.rotation.x = -Math.PI / 2; back.position.set(W / 2, 1.7, -1.5 - 7); world.add(back);
        // briznas de hierba sobre el suelo del camino
        const tops = [];
        for (let x = 0; x < W; x++) { const y = topY(x); if (y !== null) tops.push([x, y]); }
        const blades = scatter(new THREE.ConeGeometry(0.035, 0.28, 3), std({ color: '#ffffff', roughness: 0.9 }), tops.length * 10, (o, i) => {
          const [x, y] = tops[Math.floor(i / 10)];
          let z = -1.4 + rnd() * 2.8; if (Math.abs(z) < 0.45) z += z < 0 ? -0.45 : 0.45;
          o.position.set(x + rnd(), y + 0.1, z); o.rotation.set(rnd() * 0.5 - 0.25, rnd() * 3, rnd() * 0.5 - 0.25);
          o.scale.setScalar(0.7 + rnd() * 0.8);
        });
        for (let i = 0; i < tops.length * 10; i++) blades.setColorAt(i, new THREE.Color(greens[Math.floor(rnd() * greens.length)]));
        // flores
        const fl = scatter(sphere(0.06, 8, 6), std({ color: '#ffffff', roughness: 0.6 }), Math.floor(tops.length / 2), (o, i) => {
          const [x, y] = tops[Math.floor(rnd() * tops.length)];
          o.position.set(x + rnd(), y + 0.14, (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.8));
        });
        const fc = ['#f4f4f4', '#ffcd75', '#f28fb8', '#e43b44', '#b0a2f0'];
        for (let i = 0; i < Math.floor(tops.length / 2); i++) fl.setColorAt(i, new THREE.Color(fc[Math.floor(rnd() * fc.length)]));
        // nubes
        scatter(sphere(1, 14, 10), std({ color: '#ffffff', roughness: 1, emissive: '#dfe9f5', emissiveIntensity: 0.35 }), Math.ceil(W / 6) * 4, (o, i) => {
          const c = Math.floor(i / 4), k = i % 4;
          o.position.set(c * 6.5 + rnd() * 3 + k * 1.6, 15 + (c * 37 % 7) + (k % 2) * 0.8, -35 - (c * 13 % 20));
          o.scale.set(2 + rnd() * 1.5, 1.2 + rnd() * 0.8, 1.5);
        });
      } else if (theme === 'cueva') {
        const rockMat = (rep) => { const t = tx('rock').clone(); t.needsUpdate = true; t.repeat.set(rep[0], rep[1]); return std({ map: t, roughness: 1, color: '#9a8fb5' }); };
        const wall = mesh(new THREE.PlaneGeometry(W + 40, 16), rockMat([(W + 40) / 6, 3]), false);
        wall.position.set(W / 2, 6, -7); world.add(wall);
        const floor = mesh(new THREE.PlaneGeometry(W + 40, 6), rockMat([(W + 40) / 6, 1]), false);
        floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 1.2, -4.5); world.add(floor);
        // estalactitas y estalagmitas
        scatter(new THREE.ConeGeometry(0.35, 1, 7), std({ color: '#5d4f7a', roughness: 0.9, flatShading: true }), Math.ceil(W / 2), (o, i) => {
          o.position.set(i * 2 + rnd() * 2, 11 - rnd() * 0.5, -2 - rnd() * 4.5); o.rotation.x = Math.PI; o.scale.set(1, 1 + rnd() * 2.5, 1);
        }, true);
        scatter(new THREE.ConeGeometry(0.4, 1, 7), std({ color: '#4b3f63', roughness: 0.9, flatShading: true }), Math.ceil(W / 4), (o, i) => {
          o.position.set(i * 4 + rnd() * 3, 1.5, -2.5 - rnd() * 4); o.scale.set(1, 1 + rnd() * 2, 1);
        }, true);
        // cristales brillantes
        const cr = scatter(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), Math.ceil(W / 3), (o, i) => {
          o.position.set(i * 3 + rnd() * 2, 1.6 + rnd() * 0.4, -3 - rnd() * 3.5); o.scale.set(0.6 + rnd(), 1.4 + rnd() * 2, 0.6 + rnd()); o.rotation.set(rnd() * 0.5, rnd() * 3, rnd() * 0.5);
        });
        const cc = ['#7fe0d0', '#b48cff', '#5ab0ff'];
        for (let i = 0; i < Math.ceil(W / 3); i++) cr.setColorAt(i, new THREE.Color(cc[i % 3]));
        this.caveFill = new THREE.PointLight('#7f9bff', 1.2, 22, 1.2);
        world.add(this.caveFill);
      } else {
        const stoneWall = (rx, ry) => { const t = tx('castle').clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return std({ map: t, roughness: 0.95, color: '#c4c4d8' }); };
        const wall = mesh(new THREE.PlaneGeometry(W + 40, 16), stoneWall((W + 40) / 2, 8), false);
        wall.position.set(W / 2, 6, -5.5); wall.receiveShadow = true; world.add(wall);
        const floor = mesh(new THREE.PlaneGeometry(W + 40, 4), stoneWall((W + 40) / 2, 2), false);
        floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 1.0, -3.5); world.add(floor);
        // columnas, ventanas, estandartes y antorchas
        const nCol = Math.ceil(W / 8) + 2;
        scatter(new THREE.BoxGeometry(1.2, 11, 0.9), stoneWall(1, 6), nCol, (o, i) => { o.position.set(i * 8 - 4, 6.5, -4.9); }, true);
        scatter(new THREE.PlaneGeometry(1.4, 2.6), std({ color: '#000000', emissive: '#ff8a4a', emissiveIntensity: 0.8 }), nCol, (o, i) => { o.position.set(i * 8, 7, -5.45); });
        scatter(new THREE.PlaneGeometry(1, 2.4), std({ color: '#8a1c2c', roughness: 0.9, side: THREE.DoubleSide }), nCol, (o, i) => { o.position.set(i * 8 + 2.6, 7.5, -5.4); });
        this.flames = scatter(new THREE.ConeGeometry(0.13, 0.42, 8), std({ color: '#000000', emissive: '#ff7a1a', emissiveIntensity: 1.2 }), nCol, (o, i) => { o.position.set(i * 8 - 4, 5.4, -4.3); });
        scatter(new THREE.CylinderGeometry(0.06, 0.04, 0.5, 6), M.bark(), nCol, (o, i) => { o.position.set(i * 8 - 4, 5, -4.35); });
        this.torch = new THREE.PointLight('#ff9a4a', 4, 18, 1.4);
        world.add(this.torch);
      }
    }

    // ---------------------------------------------------------------- por fotograma
    render(game) {
      this.resize();
      if (game.grid !== this.grid) this.build(game);
      const t = game.frame;
      this.syncTiles(game, t);
      this.syncActors(game, t);
      this.syncCamera(game);
      this.renderer.render(this.scene, this.camera);
    }

    syncTiles(game, t) {
      const d = this.dummy, grid = game.grid;
      const counts = { '=': 0, '*': 0, 'U': 0 };
      for (const c of this.dyn) {
        let ch = grid[c.y][c.x];
        if (ch === 'P' || ch === 'H') ch = '*';
        if (!counts.hasOwnProperty(ch)) continue;
        const b = game.bumps[c.x + ',' + c.y];
        d.position.set(c.x + 0.5, ROWS - c.y - 0.5 + (b ? Math.sin(b / 8 * Math.PI) * 0.3 : 0), 0);
        d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        this.dynMeshes[ch].setMatrixAt(counts[ch]++, d.matrix);
      }
      for (const k in counts) { const m = this.dynMeshes[k]; m.count = counts[k]; m.instanceMatrix.needsUpdate = true; }
      // monedas girando
      let n = 0;
      for (const c of this.coins) {
        if (grid[c.y][c.x] !== 'o') continue;
        d.position.set(c.x + 0.5, ROWS - c.y - 0.5 + Math.sin(t * 0.05 + c.x) * 0.05, 0);
        d.rotation.set(0, t * 0.05 + c.x * 0.5, 0); d.scale.set(1, 1, 1); d.updateMatrix();
        this.coinMesh.setMatrixAt(n++, d.matrix);
      }
      this.coinMesh.count = n; this.coinMesh.instanceMatrix.needsUpdate = true;
      if (this.lavaTex) { this.lavaTex.offset.x = Math.sin(t * 0.01) * 0.3; this.lavaTex.offset.y = t * 0.002; }
      game.platforms.forEach((pl, i) => this.platModels[i].position.set(wx(pl.x + pl.w / 2), wy(pl.y) - 0.16, 0));
      if (this.flames) {
        const fl = 0.85 + Math.sin(t * 0.4) * 0.1 + Math.sin(t * 1.3) * 0.05;
        this.flames.material.emissiveIntensity = 1.2 * fl;
      }
    }

    model(obj, make) {
      let m = this.models.get(obj);
      if (!m) { m = make(); this.models.set(obj, m); this.scene.add(m.root); }
      m.seen = true;
      return m;
    }

    syncActors(game, t) {
      for (const m of this.models.values()) m.seen = false;
      const face = (m, right, k = 0.25) => {
        const target = right ? Math.PI / 2 - 0.45 : -Math.PI / 2 + 0.45;
        m.root.rotation.y = lerp(m.root.rotation.y, target, k);
      };

      // Santiago
      const p = game.player, S = this.player;
      const title = game.state === 'title';
      if (title) {
        // en el menú, Santiago corre por el centro de la pantalla
        const cx = wx(game.cam + VW / 2), col = Math.floor(cx);
        let ty = null;
        for (let y = 0; y < ROWS; y++) if (BB.SOLID.has(game.grid[y][col])) { ty = ROWS - y; break; }
        S.root.visible = ty !== null;
        S.root.position.set(cx, ty || 0, 0.3);
        face(S, true);
        this.animSanti(S, { onGround: true, vx: 2, anim: t * 0.3, dead: false }, t, false);
      } else {
        S.root.visible = !(p.inv > 0 && Math.floor(p.inv / 4) % 2 && !p.dead);
        S.root.position.set(wx(p.x + p.w / 2), wy(p.y + p.h), 0);
        face(S, p.dir > 0);
        this.animSanti(S, p, t, game.power);
      }
      if (this.playerLight) this.playerLight.position.set(S.root.position.x + 0.6, S.root.position.y + 1.6, 1.4);

      // enemigos
      for (const e of game.enemies) {
        if (!e.active && e.kind !== 'rey') continue;
        const cx = wx(e.x + e.w / 2), by = wy(e.y + e.h);
        const dead = e.state === 'dead';
        switch (e.kind) {
          case 'bellotin': case 'rey': {
            const m = this.model(e, () => makeAcorn(e.kind === 'rey'));
            m.root.visible = !(e.inv > 0 && (e.inv >> 2) % 2);
            m.root.position.set(cx, by, 0);
            if (!dead) face(m, e.vx > 0, 0.15);
            m.body.rotation.z = dead ? Math.PI : 0;
            if (dead) m.root.position.y += e.kind === 'rey' ? 1.8 : 0.9;
            m.body.scale.y = e.state === 'flat' ? 0.3 : 1;
            const ph = e.t * 0.25;
            m.feet[0].position.z = 0.04 + Math.sin(ph) * 0.08; m.feet[1].position.z = 0.04 - Math.sin(ph) * 0.08;
            m.body.position.y = e.state === 'flat' ? 0 : Math.abs(Math.sin(ph)) * 0.04;
            break;
          }
          case 'caracol': {
            const m = this.model(e, makeSnail);
            m.root.position.set(cx, by, 0);
            const shell = e.state !== 'walk' && !dead;
            m.body.visible = !shell;
            if (!shell) {
              m.root.rotation.y = lerp(m.root.rotation.y, e.vx < 0 ? Math.PI + 0.25 : -0.25, 0.15);
              m.shell.position.set(-0.05, 0.36, 0); m.shell.rotation.set(0, 0, 0);
              m.body.scale.x = 1 + Math.sin(e.t * 0.12) * 0.06;
            } else {
              m.shell.position.set(0, 0.3, 0);
              if (e.state === 'slide') m.shell.rotation.z -= e.vx * 0.12;
              else m.shell.rotation.z = e.timer < 60 ? Math.sin(e.t * 0.8) * 0.15 : 0;
            }
            m.root.rotation.z = dead ? Math.PI : 0;
            if (dead) m.root.position.y += 0.7;
            break;
          }
          case 'pajaro': {
            const m = this.model(e, () => makeBird(game.theme === 'cueva'));
            m.root.position.set(cx, wy(e.y + e.h / 2) - 0.1, 0);
            m.root.rotation.y = lerp(m.root.rotation.y, e.vx < 0 ? Math.PI + 0.3 : -0.3, 0.2);
            const f = Math.sin(e.t * 0.35) * 0.9;
            m.wings[0].rotation.x = f; m.wings[1].rotation.x = -f;
            m.root.rotation.z = dead ? Math.PI : 0;
            break;
          }
          case 'erizo': {
            const m = this.model(e, makeHedgehog);
            m.root.position.set(cx, by, 0);
            m.root.rotation.y = lerp(m.root.rotation.y, e.vx < 0 ? Math.PI + 0.3 : -0.3, 0.15);
            const ph = e.t * 0.3;
            m.feet[0].position.x = 0.12 + Math.sin(ph) * 0.05; m.feet[1].position.x = -0.12 - Math.sin(ph) * 0.05;
            m.root.rotation.z = dead ? Math.PI : 0;
            if (dead) m.root.position.y += 0.6;
            break;
          }
        }
      }

      // objetos
      for (const it of game.items) {
        if (it.kind === 'coinpop') {
          const m = this.model(it, makeCoin);
          m.root.position.set(wx(it.x + 8), wy(it.y + 8), 0);
          m.root.rotation.y = it.life * 0.6;
        } else if (it.kind === 'bellota') {
          const m = this.model(it, makeGoldAcorn);
          m.root.position.set(wx(it.x + it.w / 2), wy(it.y + it.h) + 0.25, 0);
          m.root.rotation.y = t * 0.08;
        } else {
          const m = this.model(it, makeHeart);
          m.root.position.set(wx(it.x + it.w / 2), wy(it.y + it.h) + 0.35, 0);
          m.root.rotation.y = Math.sin(t * 0.06) * 0.6;
        }
      }
      for (const s of game.shots) {
        const m = this.model(s, makeGoldAcorn);
        m.root.position.set(wx(s.x + 3), wy(s.y + 3), 0);
        m.root.scale.setScalar(0.7);
        m.root.rotation.z -= Math.sign(s.vx) * 0.4;
      }
      for (const [k, m] of this.models) if (!m.seen) { this.scene.remove(m.root); this.models.delete(k); }

      // campana y banderas
      if (this.bellModel) {
        this.bellModel.root.visible = game.bellVisible();
        const ring = game.bell.ringing;
        this.bellModel.swing.rotation.z = ring ? Math.sin(t * 0.3) * 0.5 : Math.sin(t * 0.03) * 0.05;
      }
      game.flags.forEach((f, i) => {
        const m = this.flagModels[i];
        m.cloth.material.color.set(f.active ? '#38b764' : '#e43b44');
        const pos = m.cloth.geometry.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const x0 = m.base[v * 3];
          pos.setZ(v, Math.sin(x0 * 6 - t * 0.15) * 0.08 * (x0 + 0.43));
        }
        pos.needsUpdate = true;
      });

      // partículas (escombros, confeti)
      const P = this.particles, d = this.dummy, col = new THREE.Color();
      let n = 0;
      for (const q of game.particles) {
        if (n >= 400) break;
        d.position.set(wx(q.x + q.size / 2), wy(q.y + q.size / 2), 0.3);
        d.rotation.set(q.life * 0.2, q.life * 0.3, 0);
        d.scale.setScalar(q.size / T);
        d.updateMatrix(); P.setMatrixAt(n, d.matrix); P.setColorAt(n, col.set(q.color)); n++;
      }
      P.count = n; P.instanceMatrix.needsUpdate = true; if (P.instanceColor) P.instanceColor.needsUpdate = true;
    }

    animSanti(S, p, t, power) {
      const speed = Math.abs(p.vx);
      const ph = p.anim * 1.6;
      const [lL, lR] = S.legs, [aL, aR] = S.arms;
      if (p.dead) {
        S.body.rotation.z += 0.2;
        aL.rotation.x = aR.rotation.x = -2.6;
      } else if (!p.onGround) {
        S.body.rotation.z = 0;
        lL.rotation.x = lerp(lL.rotation.x, -0.9, 0.3); lR.rotation.x = lerp(lR.rotation.x, 0.5, 0.3);
        aL.rotation.x = lerp(aL.rotation.x, -2.5, 0.3); aR.rotation.x = lerp(aR.rotation.x, -0.6, 0.3);
      } else if (speed > 0.2) {
        S.body.rotation.z = 0;
        const a = Math.min(1, speed / 1.6) * 0.9;
        lL.rotation.x = Math.sin(ph) * a; lR.rotation.x = -Math.sin(ph) * a;
        aL.rotation.x = -Math.sin(ph) * a * 0.8; aR.rotation.x = Math.sin(ph) * a * 0.8;
      } else {
        S.body.rotation.z = 0;
        for (const l of [lL, lR, aL, aR]) l.rotation.x = lerp(l.rotation.x, 0, 0.2);
      }
      aL.rotation.z = -0.12; aR.rotation.z = 0.12;
      S.body.rotation.x = p.onGround ? Math.min(speed, 2.6) * 0.06 : 0;
      S.body.position.y = p.onGround && speed > 0.2 ? Math.abs(Math.sin(ph)) * 0.05 : 0;
      // aplastar al aterrizar
      if (p.onGround && !S.wasGround) S.squash = 1;
      S.wasGround = p.onGround;
      S.squash *= 0.82;
      S.body.scale.set(0.9 * (1 + S.squash * 0.15), 0.9 * (1 - S.squash * 0.2), 0.9 * (1 + S.squash * 0.15));
      S.tail.rotation.x = 0.3 + Math.sin(t * 0.3) * 0.15 + speed * 0.25;
      S.head.rotation.y = Math.sin(t * 0.02) * 0.1;
      // gorro dorado con la bellota
      if (power !== S.power) {
        S.power = power;
        S.beanie.color.set(power ? '#ffc93c' : '#3b5dc9');
        S.beanie.metalness = power ? 0.8 : 0; S.beanie.roughness = power ? 0.3 : 0.95;
        S.beanie.emissive.set(power ? '#4a3000' : '#000000');
      }
    }

    syncCamera(game) {
      const cx = wx(game.cam + VW / 2);
      const p = game.player;
      const py = game.state === 'title' ? 5 : wy(p.y + p.h);
      const ty = Math.max(5.6, Math.min(7.5, 5.2 + (py - 3) * 0.35));
      this.camPos.set(lerp(this.camPos.x, cx, 0.2), lerp(this.camPos.y, ty + 1.9, 0.08), 17.5);
      this.camLook.set(lerp(this.camLook.x, cx, 0.2), lerp(this.camLook.y, ty, 0.08), 0);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      this.sky.position.copy(this.camera.position);
      // la luz del sol sigue a la cámara para que las sombras siempre se vean
      const TH = THEMES[this.theme];
      this.sun.position.set(this.camLook.x + TH.sunDir.x * 25, this.camLook.y + TH.sunDir.y * 25, TH.sunDir.z * 25);
      this.sun.target.position.set(this.camLook.x, this.camLook.y - 1, 0);
      if (this.torch) {
        this.torch.position.set(Math.round(cx / 8) * 8 - 4, 5.4, -3.6);
        this.torch.intensity = 3.8 + Math.sin(game.frame * 0.4) * 0.4;
      }
      if (this.caveFill) this.caveFill.position.set(cx, 7, 3);
    }

    // Convierte coordenadas del juego (px) a coordenadas de la pantalla de 320x192.
    project(x, y) {
      const v = new THREE.Vector3(wx(x), wy(y), 0).project(this.camera);
      return { x: (v.x + 1) / 2 * VW, y: (1 - v.y) / 2 * VH };
    }
  }

  BB.View3D = View3D;
})(typeof window !== 'undefined' ? window : globalThis);
