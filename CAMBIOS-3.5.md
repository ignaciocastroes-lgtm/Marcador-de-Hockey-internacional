# ARDI Hockey Patín 3.5

`tsc --noEmit` y `next build` limpios. **104 pruebas, 104 pasan.**

---

## 1. EL PARTIDO DURABA DE MÁS — y se puede medir

La auditoría del reloj era **correcta**, y el orden de magnitud también.

El reloj es híbrido: latido de 250 ms para refrescar, `performance.now()` para
saber cuánto tiempo pasó de verdad. Bien pensado. Pero `state.mainClock` estaba
entre las dependencias del efecto, así que **cada segundo** React destruía el
intervalo y creaba otro con `startTs` nuevo. Los milisegundos entre que el tick
calculaba y el efecto volvía a anclarse se tiraban. Cada segundo.

No adelantaba: **atrasaba**. Y el atraso crecía con el partido, porque el acta
engorda y cada tick cuesta más.

Simulado en `tests/reloj.test.mjs`, periodo de 20 minutos:

| Máquina | Antes | Ahora |
|---|---|---|
| Holgada (commit ~12 ms) | **20:14** | 20:00 |
| Lenta con 5 pantallas (~60 ms) | **21:12** | 20:00 |

Más de un minuto de más por periodo en la máquina mala. El árbitro con
cronómetro de pulsera lo nota al final, no al minuto dos.

**Arreglo:** el ancla vive en un `ref` y se pone una vez, al arrancar. El
efecto sólo depende de si el reloj corre. Si alguien cambia el minuto por
fuera —ajuste fino, o la reposición del Art. 30.9— el tick lo detecta y
reancla, en vez de pelear con el cambio.

**Aplicado a los cinco relojes**: principal, descanso, tiempo muerto y los dos
de 45. Los cuatro tenían el mismo defecto.

## 2. La sincronía con las pantallas, con freno

Corría en cada cambio de estado —una vez por segundo— y mandaba el `GameState`
**entero**: acta, plantel, registro y ajustes, serializados a JSON, por
BroadcastChannel y además escritos en localStorage. A la hora de juego eso
cuesta, y el costo se paga dentro del segundo, empujando el reloj.

Ahora se agrupa a **4 Hz como máximo**. El ojo no distingue 250 ms en un
marcador. Lo pendiente no se pierde: queda agendado, y al desmontar se escribe
—una recarga no puede perder el último cuarto de segundo del partido.

## 3. Art. 30.9 — reposición a 0:05

Ante un tiro libre directo, si al reloj le quedan **menos** de cinco segundos,
se repone a cinco: es el tiempo previsto para ejecutar el lanzamiento.

Nunca descuenta —si quedan más de cinco, no se toca— y **queda constancia en
el acta**: *"Cronómetro repuesto a 0:05 — tiro libre directo (Art. 30.9)"*.

Estaba listado como pendiente prioritario en `REGLAMENTO-Y-USO`. Es distinto
de la tanda de penales, que ya existía.

## 4. El acta: lo que sólo nosotros sabemos

El acta ya no es una hoja con el resultado. Bloque nuevo **POSESIÓN Y
TIEMPOS**:

- **Posesión por equipo**, en barra y en minutos, con porcentaje. Sale de los
  relojes de 45: es tiempo **medido**, no estimado. Ninguna planilla de papel
  lleva ese dato.
- **Hora de inicio y de término.**
- **Duración real** frente al tiempo de juego reglamentario, y cuánto se fue
  entre descansos, tiempos muertos y detenciones. Es lo que un club necesita
  para programar una fecha.

Todo va también al CSV. Si no se usaron los relojes de 45, lo dice en vez de
mostrar ceros.

## 5. Entrega cerrada

- **El escudo está en el zip**: `/public/escudos/`, con su copia de 64 px, y
  los tres iconos de la app generados desde él. `logoUrlFallback` vacío: ya no
  depende de ImgBB.
- **`/public/club.json`**: Internacional con sus 21 personas y 10 series. Un
  despliegue nuevo se siembra solo en la primera apertura.
- `VERSION.md`, `package.json` y el título a **3.5**; caché del service worker
  a `ardi-v350`.

> **OJO CON EL ESCUDO:** el archivo que me pasaste es de **128 px**. Sirve de
> sobra para el icono y la barra, pero en el lanzador de gol se dibuja a 450 px
> y se verá blando. No inventé resolución. El escudo de proyección conviene
> pegarlo por URL en GESTOR PANTALLAS, que es lo que usa el tablero.

## 6. CONTROL, congelado

Marcado por escrito en el encabezado del archivo. Se corrigen bugs y cambios
de reglamento; las funciones nuevas van a PISTA. Lo compartido vive fuera y lo
consumen los dos paneles — **si algo hay que tocar en los dos, es señal de que
no estaba compartido**.

Mantener dos interfaces con funciones propias fue lo que produjo los atajos
duplicados, los dos editores de plantel y las dos vías de sanción.

---

## Lo que queda de la auditoría

**La anulación no llega al acta ni a CONTROL.** Sigue en pie: `CardTally` y la
vía vieja de sanción de banca no filtran `anulada`, y la planilla imprime la
tarjeta como válida. Baja de prioridad porque la planilla es historia hasta
que la liga defina su formato — pero **si se anula una tarjeta, el acta de ese
partido miente**.

**Sancionar por `player.id`.** El plantel emite `ILE-0007` y el motor sigue
viendo `"20"`. Contenido dentro de un partido por la regla del dorsal único en
la citación; el residuo real es el cuerpo técnico y la suma de temporada.

---

# GOL ANULADO, ENMIENDA Y PENAL

## Dos figuras que pesan distinto

Un **gol anulado por el árbitro** y un **gol cargado por error de la mesa**
bajaban el marcador exactamente igual: `delta < 0`, en silencio y sin dejar
rastro. Son cosas distintas y el acta tiene que notarlo.

| | Marcador | Acta |
|---|---|---|
| **Anula el árbitro** | baja | el gol **queda**, marcado ANULADO, con una línea que lo consigna |
| **Se equivocó la mesa** | baja | el gol **se borra**: nunca existió. Queda una línea de corrección |

El árbitro cobró, el marcador subió, la gente lo vio: eso ocurrió y el papel
lo dice. Un error de tecleo nunca pasó, y dejarlo escrito ensucia el registro.

En la interfaz: el **−** del marcador es la enmienda de la mesa. **Anular gol**
es una decisión arbitral y vive donde vive el silbato.

## El penal: la distinción clave

`case 'penal'` sumaba **siempre** al contador de la tanda, incluso en juego. Y
el botón estaba deshabilitado fuera de los penales, así que **en partido no
había forma de registrar uno**.

Ahora `scorePenalty` decide según el periodo:

- **En partido → es GOL.** Suma al marcador, detiene el reloj y repone las
  posesiones como cualquier gol. El acta lo distingue: *"Gol de penal"*.
- **En la tanda → no es gol.** Va al contador aparte, porque en la definición
  los penales no cuentan como goles del encuentro.

## Dónde están, y el bloqueo

- **Vista PISTA:** dentro del árbitro, junto a la falta de equipo. El diálogo
  pasó a llamarse "Decisiones del árbitro".
- **Vista CONTROL:** junto al reloj, que era el hueco libre y donde el
  operador ya está mirando cuando el árbitro señala el punto.
- **Confirmación en dos pasos**, con el texto de lo que va a pasar. Son
  irreversibles de cara al público —el marcador ya cambió en la pantalla del
  estadio— y un toque de más con la tablet en la mano cuesta caro. Si nadie
  confirma, se desarma solo a los seis segundos.

## Verificado

`tsc --noEmit` y `next build` limpios. **121 pruebas, 121 pasan** — 17 nuevas,
incluida la que fija la diferencia: misma cifra en el marcador, distinto peso
en el acta.

## Sobre el PDF: no lo revisé

Cambié el sellado para que imprima en vez de exportar CSV, pero **nunca
inspeccioné la salida real**. Cuando dices que son puras líneas, te creo. La
hoja de impresión venía de antes y di por hecho que servía.

Que evolucione a un HTML por partido para la web del club es mejor destino que
arreglar la hoja de impresión, y se lleva bien con el bloque de posesión y
tiempos que ya trae el acta.
