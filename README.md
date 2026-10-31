# CHISPA — consola retro de fantasía

CHISPA es una consola retro que funciona en el navegador. Tiene su propio "hardware" virtual, sus propios cartuchos y un editor para crear juegos.

| Característica | Especificación |
| --- | --- |
| Pantalla | 128 × 128 píxeles, 60 fotogramas por segundo |
| Colores | Paleta fija de 16 colores |
| Sprites | 64 sprites de 8 × 8 (hoja de 64 × 64) |
| Fuente | 3 × 5 píxeles (con Ñ, ¡ y ¿) |
| Controles | Cruceta, A, B y START: teclado, mando (Gamepad API) o botones táctiles |
| Sonido | Osciladores cuadrada/triangular/sierra/seno + ruido |
| Guardado | `save`/`load` por cartucho (récords, progreso) |

## Cómo usarla

Abre `index.html` en el navegador (doble clic; no necesita servidor ni instalar nada).

- **Jugar**: elige un cartucho en el menú de la consola o en la lista.
- **Editor**: escribe código, dibuja sprites, pulsa **Ejecutar** (o `Ctrl+Enter`). **Guardar** lo guarda en el navegador; **Exportar** descarga un `.chispa.json` que puedes compartir y abrir con **Cargar cartucho**.
- **Ayuda**: referencia rápida de la API.

Controles: flechas/WASD, `Z` = A, `X` = B, `Enter` = START, `Esc` = volver al menú.

## Cartuchos incluidos

- **DEMO DEL SISTEMA**: paleta, figuras, texto, sprites y sonido.
- **LLUVIA ESTELAR**: atrapa estrellas y esquiva rocas.
- **SALTARIN**: corre sin parar y salta entre plataformas (doble salto).

## Programar un cartucho

```js
let x = 60;

function _init()   { }                           // una vez, al arrancar
function _update() { if (btn(RIGHT)) x++; }      // lógica, 60 veces por segundo
function _draw()   { cls(1); spr(1, x, 60); }    // dibujo
```

API completa:

| Grupo | Funciones |
| --- | --- |
| Dibujo | `cls(c)` `pset(x,y,c)` `pget(x,y)` `line(x0,y0,x1,y1,c)` `rect(x,y,w,h,c)` `rectfill(x,y,w,h,c)` `circ(x,y,r,c)` `circfill(x,y,r,c)` `print(txt,x,y,c,escala)` `textw(txt)` `camera(x,y)` |
| Sprites | `spr(n,x,y,flipX,flipY,escala)` `sget(x,y)` `sset(x,y,c)` `palt(c,transparente)` |
| Entrada | `btn(b)` `btnp(b)` con `LEFT RIGHT UP DOWN A B START` |
| Sonido | `tone(frec,dur,onda,vol,desliz)` `noise(dur,vol)` `note(midi)` |
| Utilidades | `rnd(n)` `rndi(n)` `flr(x)` `mid(a,b,c)` `time()` `frame()` `save(k,v)` `load(k,def)` |

Estos nombres están reservados: no declares variables que se llamen igual.

### Formato de cartucho

Un cartucho es un objeto JSON (o un `.js` en `carts/` que llama a `Chispa.registerCart`):

```json
{
  "format": "chispa-1",
  "id": "mi-juego",
  "title": "MI JUEGO",
  "author": "yo",
  "sprites": { "1": ["..7777..", ".777777.", "...6 filas más..."] },
  "code": "function _draw(){ cls(1); spr(1, 60, 60); }"
}
```

Cada sprite son 8 filas de 8 caracteres hexadecimales (`0`–`f` es el color, `.` es transparente).
Para añadir un cartucho a la consola de forma permanente, crea `carts/mi-juego.js` y añade su `<script>` en `index.html`.

## Estructura

```
index.html          interfaz (pantalla, lista de cartuchos, editor, ayuda)
css/style.css       estilos
js/font.js          fuente de 3x5
js/core.js          núcleo: vídeo, entrada, sonido, bucle, menú, cartuchos
js/shell.js         interfaz: editor de código/sprites, guardado, controles táctiles
carts/*.js          cartuchos incluidos
tests/smoke.js      prueba en Chromium (Playwright)
```

## Pruebas

```bash
node tests/smoke.js
```

Arranca la consola en Chromium, ejecuta cada cartucho, comprueba que un cartucho con error muestra la pantalla de error y que los sprites se exportan e importan sin perder datos.

## Llevarla a una consola física

Como CHISPA es una página web, puede funcionar en una caja de verdad:

1. Una Raspberry Pi (3B+, 4 o 5) con Raspberry Pi OS Lite y Chromium en modo quiosco:
   `chromium-browser --kiosk --autoplay-policy=no-user-gesture-required file:///home/pi/RetroGames/index.html`
2. Un mando USB, que funciona directamente gracias a la Gamepad API.
3. Una pantalla pequeña HDMI o DSI y una carcasa impresa en 3D.
