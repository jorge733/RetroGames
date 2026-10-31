// Prueba de humo de Bene Bros en Chromium: menú, los tres niveles, enemigos y editor.
// Uso: node tests/bene-bros-smoke.js [carpeta-capturas]
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', 'bene-bros');

(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 576 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  let failed = false;
  const check = (ok, msg) => { console.log((ok ? 'OK   ' : 'FAIL ') + msg); if (!ok) failed = true; };
  const shot = async (name) => { if (out) await page.screenshot({ path: path.join(out, name + '.png') }); };

  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(400);
  await shot('bb-title');
  check(await page.evaluate(() => BB.game.state === 'title'), 'arranca en el menú');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  check(await page.evaluate(() => BB.game.state === 'intro'), 'ENTER empieza la partida');

  for (let lvl = 0; lvl < 3; lvl++) {
    const info = await page.evaluate((lvl) => {
      const g = BB.game;
      g.levelIndex = lvl; g.checkpoint = null; g.startLevel();
      g.debugSteps(140);                       // intro → juego
      const st = g.state;
      // Santiago corre a la derecha y salta de vez en cuando durante 6 s
      g.input.keys.right = true; g.input.keys.run = true;
      let maxX = 0;
      for (let i = 0; i < 360 && g.state === 'play'; i++) {
        g.input.keys.jump = (i % 50) < 18;
        g.debugSteps(1);
        maxX = Math.max(maxX, g.player.x);
      }
      g.input.keys = {};
      return { st, name: g.level.name, maxX: Math.round(maxX), state: g.state, enemies: g.enemies.length, score: g.score };
    }, lvl);
    check(info.st === 'play', `nivel ${lvl + 1} (${info.name}) se puede jugar`);
    check(info.maxX > 200, `nivel ${lvl + 1}: Santiago avanza (x=${info.maxX}, estado=${info.state}, puntos=${info.score})`);
    await page.evaluate(() => { BB.game.state = 'play'; BB.game.render(); });
    await shot('bb-level' + (lvl + 1));
  }

  // Mecánicas: pisar un enemigo, golpear un bloque, recoger la bellota dorada, derrotar al jefe.
  const mech = await page.evaluate(() => {
    const g = BB.game, r = {};
    g.levelIndex = 0; g.checkpoint = null; g.startLevel(); g.debugSteps(140);
    const p = g.player, e = g.enemies.find((x) => x.kind === 'bellotin');
    e.active = true; p.x = e.x; p.y = e.y - 20; p.vy = 2; p.prevBottom = p.y + p.h;
    g.debugSteps(3);
    r.stomp = !e.alive;
    // golpe al bloque estrella (13,6) desde abajo
    const coins = g.coins;
    p.x = 13 * 16 + 3; p.y = 7 * 16 + 1; p.vy = -4; g.debugSteps(2);
    r.block = g.grid[6][13] === 'U' && g.coins === coins + 1;
    // bellota dorada
    g.items.push({ kind: 'bellota', x: p.x, y: p.y, w: 12, h: 12, vx: 0, vy: 0, rise: 0 });
    g.debugSteps(2); r.power = g.power;
    // jefe
    g.levelIndex = 2; g.startLevel(); g.debugSteps(140);
    const b = g.boss; b.active = true; g.bossFight = true;
    for (let i = 0; i < 3; i++) { b.inv = 0; g.damageBoss(b); }
    r.boss = b.dead && g.bellVisible();
    // tocar la campana
    p.x = g.bell.x; p.y = g.bell.y - 10; p.vy = 0; g.player = p; g.debugSteps(1);
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
  await page.evaluate(() => BB.game.debugSteps(130));
  await shot('bb-win');
  // captura del combate contra el jefe
  await page.evaluate(() => {
    const g = BB.game; g.levelIndex = 2; g.checkpoint = null; g.startLevel(); g.debugSteps(140);
    g.player.x = 134 * 16; g.player.y = 144; g.debugSteps(120);
  });
  await shot('bb-boss');

  // Editor: pintar, probar el nivel, volver y guardar.
  await page.goto('file://' + path.join(ROOT, 'editor.html'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { const ed = BB.editor; for (let x = 10; x < 14; x++) ed.paint(x, 6, '='); ed.paint(12, 9, 'g'); ed.draw(); });
  await shot('bb-editor');
  await page.click('#test');
  await page.waitForTimeout(300);
  const testing = await page.evaluate(() => document.querySelector('#overlay').classList.contains('show') && BB.game.state === 'intro');
  check(testing, 'el editor abre la prueba del nivel');
  await page.evaluate(() => BB.game.debugSteps(140));
  await shot('bb-editor-test');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  check(await page.evaluate(() => !document.querySelector('#overlay').classList.contains('show')), 'Esc vuelve al editor');
  await page.click('#save');
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('benebros:levels') || '[]').length === 1), 'guardar el nivel');
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(200);
  const menu = await page.evaluate(() => BB.game.menuItems(JSON.parse(localStorage.getItem('benebros:levels'))).map((i) => i.label).join(' / '));
  check(menu.includes('MIS NIVELES (1)'), 'el menú muestra MIS NIVELES: ' + menu);

  if (errors.length) { failed = true; console.log('Errores de página:\n' + errors.join('\n')); }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
