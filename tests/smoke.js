// Prueba de humo: arranca la consola en Chromium, ejecuta cada cartucho y comprueba
// que no hay errores y que la pantalla dibuja algo. Uso: node tests/smoke.js [carpeta-capturas]
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(500);
  if (outDir) await page.screenshot({ path: path.join(outDir, 'menu.png') });

  const ids = await page.evaluate(() => Chispa.carts.map((c) => c.id));
  let failed = false;
  for (const id of ids) {
    const crashed = await page.evaluate((id) => {
      let err = null;
      Chispa.on('error', (e) => { err = e.message; });
      Chispa.run(Chispa.carts.find((c) => c.id === id));
      return err;
    }, id);
    // pulsa A para salir de la pantalla de título y juega un poco
    await page.keyboard.down('KeyZ'); await page.waitForTimeout(80); await page.keyboard.up('KeyZ');
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
    const colors = await page.evaluate(() => new Set(Chispa._fb).size);
    const ok = !crashed && colors > 2;
    if (!ok) failed = true;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${id}  colores=${colors}${crashed ? '  error=' + crashed : ''}`);
    if (outDir) await page.screenshot({ path: path.join(outDir, id + '.png') });
  }

  // Un cartucho roto debe mostrar la pantalla de error, no romper la consola.
  const caught = await page.evaluate(() => {
    let err = null;
    Chispa.on('error', (e) => { err = e.message; });
    Chispa.run(Chispa.normalizeCart({ id: 'roto', code: 'function _draw(){ noExiste(); }' }));
    Chispa._step(); Chispa._draw();
    return err;
  });
  console.log(`${caught ? 'OK  ' : 'FAIL'} cartucho roto capturado: ${caught}`);
  if (!caught) failed = true;

  // Ida y vuelta del formato de sprites.
  const roundTrip = await page.evaluate(() => {
    const c = Chispa.carts[0];
    const again = Chispa.parseSprites(Chispa.exportSprites(c.sheet));
    return again.every((v, i) => v === c.sheet[i]);
  });
  console.log(`${roundTrip ? 'OK  ' : 'FAIL'} exportar/importar sprites`);
  if (!roundTrip) failed = true;

  const pageErrors = errors.filter((e) => !e.includes('noExiste'));
  if (pageErrors.length) { failed = true; console.log('Errores de página:\n' + pageErrors.join('\n')); }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
