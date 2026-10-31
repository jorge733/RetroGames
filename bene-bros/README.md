# Bene Bros — Las aventuras de Santiago

Juego de plataformas protagonizado por **Santiago**. Personajes, niveles, gráficos y música son originales.

## Jugar

- **`index.html`**: versión 3D (recomendada).
- **`clasico.html`**: versión clásica con gráficos pixelados en 2D (también se abre sola si el navegador no admite 3D).

No necesita internet ni instalar nada: basta con abrir el archivo en el navegador.

### La versión 3D

- Gráficos generados con Three.js:
  - modelos 3D de Santiago y de todos los enemigos;
  - materiales realistas (metal dorado, madera, piedra, ladrillo, lava brillante);
  - sombras suaves, cielo, niebla de distancia y reflejos del entorno.
- Cada mundo tiene su ambiente:
  - **Pradera**: colinas, árboles, hierba, flores, nubes y montañas.
  - **Cueva**: estalactitas y cristales que brillan, con Santiago iluminado por un farol.
  - **Castillo**: columnas, ventanas, antorchas que parpadean y el resplandor de la lava.
- Se juega exactamente igual que la versión 2D: comparten la misma física y los mismos niveles.

| Acción | Teclado | Mando | Móvil |
| --- | --- | --- | --- |
| Moverse | ← → o A D | Cruceta / stick | ◀ ▶ |
| Saltar (más alto si lo mantienes) | Z, Espacio o ↑ | A | SALTAR |
| Correr / lanzar bellotas | X o Mayús | X / B | CORRER |
| Pausa | Enter o P | Start | PAUSA |
| Salir | Esc | Select | |
| Sonido sí/no | M | | 🔊 |

## El juego

- **3 niveles**: La Pradera, La Cueva Eco y El Castillo, donde espera el jefe final, el **Rey Bellota**.
- **Santiago** tiene 3 corazones. Si cae a un foso o a la lava, pierde una vida. Empiezas con 3 vidas, y cada 100 monedas ganas otra.
- **Bloques estrella**: golpéalos desde abajo. Pueden tener una moneda, la **bellota dorada** o un corazón. Los ladrillos se rompen.
- **Bellota dorada**: el gorro de Santiago se vuelve dorado y puede lanzar bellotas con X. Si te golpean, pierdes el poder en lugar de un corazón.
- **Enemigos**:
  - **Bellotín**: se elimina saltándole encima.
  - **Caracol**: si lo pisas, se esconde en su concha, y puedes patear la concha contra otros enemigos.
  - **Pájaro**: vuela en ondas. En la cueva aparece como murciélago.
  - **Erizo**: no se puede pisar. Elimínalo con una concha o una bellota.
- **Bandera de control**: si pierdes una vida, vuelves a empezar desde la última bandera que hayas tocado.
- **Meta**: toca la campana. El tiempo que te sobre se convierte en puntos extra.

## Editor de niveles

Abre `editor.html`, o pulsa «✎ Editor» en el juego.

- Elige una pieza de la paleta y pinta con el ratón. El clic derecho borra.
- **Probar** lanza tu nivel al momento. Pulsa Esc para volver al editor.
- **Guardar** lo guarda en el navegador. Tus niveles aparecen en el menú del juego, en **MIS NIVELES**.
- **Exportar** e **Importar** sirven para compartir niveles como archivos `.benebros.json`.
- **Copiar nivel del juego** te deja partir de uno de los niveles originales.

## Crear niveles en código

Los niveles están en `js/data.js`. Cada nivel tiene 12 filas de caracteres:

```
.  vacío        #  suelo         =  ladrillo       *  bloque con moneda
P  bloque con bellota dorada     H  bloque con corazón
X  piedra       L  tronco        -  plataforma     ^  pinchos      ~  lava
o  moneda       @  inicio        !  meta (campana) C  bandera de control
g  bellotín     s  caracol       b  pájaro         p  erizo        K  Rey Bellota
M  plataforma móvil ↔            V  plataforma móvil ↕
```

## Estructura

```
index.html      juego en 3D
clasico.html    juego en 2D (pixel art)
editor.html     editor de niveles
vendor/         Three.js r149 (licencia MIT, en THREE-LICENSE)
js/view3d.js    vista 3D: modelos, materiales, luces, decorados y cámara
js/data.js      paleta, sprites (dibujados como texto) y niveles
js/gfx.js       fuente pixelada, tiles, fondos
js/audio.js     efectos y música chiptune (Web Audio)
js/game.js      motor: entrada, física, enemigos, jefe, pantallas
js/touch.js     botones táctiles
js/editor.js    editor
```

## Pruebas

```bash
node tests/bene-bros-smoke.js
```

Esta prueba (en la carpeta raíz del repositorio) abre el juego en Chromium y comprueba lo siguiente:

- que la vista 3D dibuja el menú y los tres mundos;
- el menú;
- los tres niveles;
- pisar enemigos, golpear bloques, la bellota dorada y el jefe;
- la meta y la pantalla de victoria;
- el editor: probar, volver y guardar.
