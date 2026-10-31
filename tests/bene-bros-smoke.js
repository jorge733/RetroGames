// Prueba de humo de Bene Bros en Chromium.
//  - Versión 3D: el menú y los tres mundos se dibujan sin errores.
//  - Versión 2D (misma lógica): menú, niveles, enemigos, bloques, poder, jefe, meta y victoria.
//  - Editor: pintar, probar, volver y guardar.
// Uso: node tests/bene-bros-smoke.js [carpeta-capturas]
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', 'bene-bros');

(async () => {
  const out = process.argv[2];
  // SwiftShader permite WebGL (3D) sin tarjeta gráfica.
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 576 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let failed = false;
  const check = (ok, msg) => { console.log((ok ? 'OK   ' : 'FAIL ') + msg); if (!ok) failed = true; };
  const shot = async (name) => { if (out) await page.screenshot({ path: path.join(out, name + '.png'), timeout: 120000 }); };

  // ------------------------------------------------------------ 3D
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => window.BB && BB.game && BB.game.frame > 2, null, { timeout: 120000 });
  check(await page.evaluate(() => BB.game.state === 'title'), '3D: arranca en el menú');
  check(await page.evaluate(() => !!BB.game.view3d && BB.game.view3d.renderer.info.render.triangles > 1000), '3D: la escena se dibuja');
  await shot('bb3d-title');
  await page.evaluate(() => { BB.game.running = false; });      // pausa el bucle: lo movemos a mano
  for (let lvl = 0; lvl < 3; lvl++) {
    const info = await page.evaluate((lvl) => {
      const g = BB.game;
      g.newGame(BB.LEVELS); g.levelIndex = lvl; g.startLevel(); g.debugSteps(140);
      g.input.keys = { right: true };
      g.debugSteps(90);
      g.input.keys = {};
      const v = g.view3d;
      return { state: g.state, score: g.score, tris: v.renderer.info.render.triangles, models: v.models.size, theme: v.theme };
    }, lvl);
    check(info.state === 'play' && info.tris > 1000 && Number.isFinite(info.score) && info.theme === ['pradera', 'cueva', 'castillo'][lvl],
      `3D: mundo ${lvl + 1} (${info.theme}) se dibuja: ${info.tris} triángulos, ${info.models} modelos`);
    await shot('bb3d-level' + (lvl + 1));
  }

  // ------------------------------------------------------------ lógica (versión 2D, más rápida)
  await page.goto('file://' + path.join(ROOT, 'clasico.html'));
  await page.waitForTimeout(400);
  check(await page.evaluate(() => BB.game.state === 'title' && !BB.game.view3d), '2D: arranca en el menú');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check(await page.evaluate(() => BB.game.state === 'intro'), 'ENTER empieza la partida');

  for (let lvl = 0; lvl < 3; lvl++) {
    const info = await page.evaluate((lvl) => {
      const g = BB.game;
      g.levelIndex = lvl; g.checkpoint = null; g.startLevel();
      g.debugSteps(140);
      const st = g.state;
      g.input.keys.right = true; g.input.keys.run = true;
      let maxX = 0;
      for (let i = 0; i < 360 && g.state === 'play'; i++) {
        g.input.keys.jump = (i % 50) < 18;
        g.debugSteps(1);
        maxX = Math.max(maxX, g.player.x);
      }
      g.input.keys = {};
      return { st, name: g.level.name, maxX: Math.round(maxX), state: g.state, score: g.score };
    }, lvl);
    check(info.st === 'play', `nivel ${lvl + 1} (${info.name}) se puede jugar`);
    check(info.maxX > 200, `nivel ${lvl + 1}: Santiago avanza (x=${info.maxX}, estado=${info.state}, puntos=${info.score})`);
  }

  const mech = await page.evaluate(() => {
    const g = BB.game, r = {};
    g.levelIndex = 0; g.checkpoint = null; g.startLevel(); g.debugSteps(140);
    const p = g.player, e = g.enemies.find((x) => x.kind === 'bellotin');
    e.active = true; p.x = e.x; p.y = e.y - 20; p.vy = 2; p.prevBottom = p.y + p.h;
    g.debugSteps(3);
    r.stomp = !e.alive;
    const coins = g.coins;
    p.x = 13 * 16 + 3; p.y = 7 * 16 + 1; p.vy = -4; g.debugSteps(2);
    r.block = g.grid[6][13] === 'U' && g.coins === coins + 1;
    g.items.push({ kind: 'bellota', x: p.x, y: p.y, w: 12, h: 12, vx: 0, vy: 0, rise: 0 });
    g.debugSteps(2); r.power = g.power;
    g.levelIndex = 2; g.startLevel(); g.debugSteps(140);
    const b = g.boss; b.active = true; g.bossFight = true;
    for (let i = 0; i < 3; i++) { b.inv = 0; g.damageBoss(b); }
    r.boss = b.dead && g.bellVisible();
    const q = g.player; q.x = g.bell.x; q.y = g.bell.y - 10; q.vy = 0; g.debugSteps(1);
    r.clear = g.state === 'clear';
    g.debugSteps(400);
    r.win = g.state === 'win';
    return r;
  });
  check(mech.stomp, 'pisar a un bellotín lo elimina');
  check(mech.block, 'golpear un bloque estrella da una moneda');
  check(mech.power, 'la bellota dorada da el poder');
  check(mech.boss, 'derrotar al Rey Bellota hace aparecer la campana');
  check(mech.clear, 'tocar la campana supera el nivel');
  check(mech.win, 'superar el último nivel muestra la pantalla de victoria');

  // ------------------------------------------------------------ editor
  await page.goto('file://' + path.join(ROOT, 'editor.html'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { const ed = BB.editor; for (let x = 10; x < 14; x++) ed.paint(x, 6, '='); ed.paint(12, 9, 'g'); ed.draw(); });
  await page.click('#test');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => document.querySelector('#overlay').classList.contains('show') && BB.game.state === 'intro'), 'el editor abre la prueba del nivel');
  await page.evaluate(() => BB.game.debugSteps(140));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check(await page.evaluate(() => !document.querySelector('#overlay').classList.contains('show')), 'Esc vuelve al editor');
  await page.click('#save');
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('benebros:levels') || '[]').length === 1), 'guardar el nivel');
  await page.goto('file://' + path.join(ROOT, 'clasico.html'));
  await page.waitForTimeout(200);
  const menu = await page.evaluate(() => BB.game.menuItems(JSON.parse(localStorage.getItem('benebros:levels'))).map((i) => i.label).join(' / '));
  check(menu.includes('MIS NIVELES (1)'), 'el menú muestra MIS NIVELES: ' + menu);

  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|GL Driver/i.test(e));
  if (real.length) { failed = true; console.log('Errores de página:\n' + real.join('\n')); }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
