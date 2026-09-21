# ARDI Hockey Patín 3.53 — El reloj de los últimos diez segundos

`tsc --noEmit` y `next build` limpios. **158 pruebas, 158 pasan.**
`pnpm install --frozen-lockfile` verificado.

Todo lo de abajo está **medido en el navegador**, en desarrollo y en la
compilación de producción.

---

## 1. Los elementos "bailaban" al pasar a décimas

`MM:SS` ocupa **cinco** casillas; `SS.d` ocupa **cuatro**. Al entrar en los
últimos diez segundos el reloj se angostaba un dígito y arrastraba todo lo que
tenía al lado: en PISTA, los 45 y los marcadores de gol y falta.

`RigidClock` reserva ahora siempre el ancho del formato largo y centra el
contenido dentro.

Medido de 0:14 a 0:07: **el reloj midió 273 px todo el tiempo y el 45 vecino
no se movió de su sitio.**

## 2. Las décimas eran falsas

El estado del partido guarda **segundos enteros**, así que
`(s - entero) * 10` daba siempre **0**. El reloj mostraba `04.0`, `03.0`,
`02.0`: la décima nunca se movía.

Bajar el estado a décimas hubiera sido peor: el acta entera viajaría diez
veces por segundo a cada proyector, que es justo lo que se frenó en la 3.5.

`RelojVivo` calcula las décimas **sólo en pantalla**: cada ventana toma el
último segundo que recibió y descuenta el tiempo transcurrido, a 10 Hz y sólo
en los últimos diez segundos. Y vive en su propio componente: a esa frecuencia
se vuelve a pintar el reloj, no la pista entera.

Medido en la proyección: `08.7 · 08.3 · 07.9 · 07.5 · 07.1`.

## 3. El reloj principal avisa, como el 45

En los últimos diez segundos del periodo se pone **rojo** y **pulsa** — el
mismo pulso del 45: baja al 35% de opacidad, no se apaga, así que el número se
sigue leyendo. En PISTA, CONTROL y la proyección.

No avisa en el descanso ni en un tiempo muerto, que no son el fin de nada.

## 4. Un defecto del ancla del reloj — mío, de la 3.5

**Esto lo encontré midiendo lo anterior.** En modo desarrollo, el reloj
oscilaba: `14 → 13 → 14 → 14 → 13` y no avanzaba.

La causa: el ancla que arreglé en la 3.5 detectaba "alguien cambió el reloj
por fuera" **dentro de la función de `setState`, y escribía referencias ahí**.
React puede ejecutar esa función más de una vez con el mismo estado anterior.
En la segunda pasada, el código veía su propia escritura como un cambio
externo, reanclaba y descartaba el tick.

**En la compilación de producción funcionaba** — lo medí: bajaba limpio. Así
que lo publicado no estaba roto. Pero no es un defecto sólo de desarrollo:
en producción React también puede reejecutar esas funciones cuando una
actualización interrumpe a otra, por ejemplo si el operador toca un botón justo
durante un tick. Se perdería un segundo, que es la deriva que la 3.5 venía a
eliminar. Y además dejaba el modo desarrollo inservible para probar.

Corregido en **los cinco relojes** —principal, descanso, tiempo muerto y los
dos de 45—. La detección pasó al latido, que compara contra el último valor
pintado; la función de `setState` quedó pura.

Verificado:
- en desarrollo baja limpio: `14 → 13 → 12 → 11 → 10 → 09.0 → 08.5 → 08.0`;
- los 45 siguen corriendo;
- **un ajuste externo con el reloj en marcha se respeta**: `98 → +1m → 157`,
  y tres segundos después `154`, sin volver atrás.

## Versión

3.53, service worker `ardi-v353`.
