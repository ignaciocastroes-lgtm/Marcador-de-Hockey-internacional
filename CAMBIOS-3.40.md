# ARDI Hockey Patín 3.40 — sobre la 3.39

`npx tsc --noEmit` y `npx next build` limpios. **El proyecto usa pnpm.**

2 archivos nuevos · 6 modificados. Nada del motor de reglamento fue tocado:
`lib/court-rules.ts` y `hooks/use-game-state.ts` quedan exactamente igual.

---

## 1. LOS EFECTOS AHORA SÍ LLEGAN A LA PROYECCIÓN

El diagnóstico del guión era correcto y estaba completo, pero el arreglo tenía
un segundo tramo que no se veía desde afuera.

`digitFxClass` y `nameFxClass` se declaraban y no se usaban. Aplicarlas no
bastaba: cada elemento del tablero escribe su color en el atributo `style`, y un
`color` inline le gana por especificidad a `.fx-neon { color: #fff }`. Con la
clase puesta y el color inline intacto, Neón habría seguido sin verse.

Por eso el color pasó a resolverse con dos helpers nuevos en `scoreboard-view`:

```ts
const numFx  = (color, glow?) => digitFxOn ? { '--fx-color': color } : { color, textShadow: glow }
const nameFx = (color)        => nameFxOn  ? { '--fx-color': color } : { color }
```

Con acabado, el color viaja como variable y la clase dibuja. Sin acabado, todo
queda como estaba. Aplicado en: reloj, marcador, periodo, faltas, posesión,
penales, patinadores, relojes de sanción y nombres de equipo.

El halo inline de la posesión (`textShadow`) sólo se pinta cuando el acabado es
sólido: con Neón o Flúor lo aporta la clase, y superponerlos ensucia el dígito.

**Metal sigue degradando a sólido en las cifras críticas**, como ya definía
`resolveFinish`. No se tocó ese criterio.

---

## 2. EL RESUMEN QUE "SE CORTA Y VUELVE" — CAUSA ENCONTRADA

No era `breakDelay` cambiando de identidad. Los tres lanzadores declaraban su
ayudante de capa arrastrable (`const D = …`) **dentro** del cuerpo del
componente. Eso crea un tipo de componente nuevo en cada render: React no puede
saber que es el mismo, así que desmonta y vuelve a montar.

El resumen del descanso muestra el reloj, que cambia cada segundo. Se remontaba
una vez por segundo y repetía su animación de entrada. Eso es exactamente lo que
se veía.

- **`components/scoreboard/OverlaySlot.tsx` (nuevo)** — la capa arrastrable
  definida una sola vez, en el ámbito del módulo. El contexto (layout, modo
  edición, escala) viaja como prop: cambiarlo re-renderiza, no remonta.
- `SummaryOverlay`, `WinnerOverlay` y `GoalOverlay` la usan. Sus otros ayudantes
  internos (`StatRow`, `Cards`, `Scorers`, `Side`) pasaron a invocarse como
  función en vez de montarse como componente: mismo resultado visual, sin
  frontera de montaje que reiniciar.

Esto también arregla el parpadeo del letrero de ganador, que tenía el mismo
origen aunque no estuviera reportado.

---

## 3. LA PREVISUALIZACIÓN DEJA DE MENTIR

- **`lib/board-look.ts` (nuevo)** — la apariencia del tablero en un solo lugar:
  pilas de tipografía por identificador (`resolveLedFont`) y lectura tolerante
  de `ardi-live-logos` (`loadBoardLook`). La cadena de fuentes vivía escrita a
  mano dentro de `scoreboard-view`; ahora la lee de aquí.
- `OverlaysModal` lee esa apariencia real en vez de `#dc2626` / `#ffffff` /
  `var(--font-led)` fijos: color de acento, color de texto, color de posesión
  para el ganador, tipografía elegida, peso, interletrado y acabado.
- Se actualiza sola con `storage` y `ardi-screens-updated`, así que cambiar el
  color en el gestor de pantallas se ve en el modal sin reabrirlo.
- `SummaryOverlay` y `WinnerOverlay` ganaron `numberClass` y `nameClass`, que es
  como el acabado llega tanto a la previsualización como a la proyección.

---

## 4. MESA DE CONTROL

- **Contenedor propio con alto reservado** (`relative z-30 isolate
  min-h-[104px]`). El alto ya no depende del contenido, así que la página no
  salta cuando entra o sale un sancionado, y el contexto de apilado propio
  impide que el cajón o la barra inferior se le encimen.
- **Los sancionados dejaron de bailar**: las fichas usan `RigidClock` con
  `tenthsUnder={0}` dentro de un contenedor de ancho fijo (150/168 px). Cada
  dígito tiene su caja: `1:59 → 0:59` ya no mueve nada.
- **Cambio de portero directo**: sale el portero y hay exactamente un portero
  disponible → se aplica sin abrir el selector, con aviso por toast. Cualquier
  otro caso abre el selector como antes. La lógica vive en `startSubstitution()`
  y reutiliza `eligibleReplacements` + `resolveSubstitution` sin cambiarlos.
- **DESCANSO se movió a la barra inferior** como *DESCANSO / SUSPENDIDO*
  (la rejilla pasó de 7 a 8 columnas). En la barra maestra queda sólo el estado
  en curso con FIN y +MIN, que es información viva y tiene que estar junto al
  reloj.

---

## 5. BARRA MAESTRA: dos botones menos, un marcador manual más

Los dos botones verdes de arranque que flanqueaban el reloj (sin chicharra y
con chicharra) eran el mismo gesto que ya existe en dos lugares: el círculo
central de la pista ya arranca/pausa sin chicharra (sacar del centro, como en
la cancha real), y CHICHARRA ya está como botón aparte. Sostenerlos los tres
era redundancia pura.

Se quitaron los dos botones. En su lugar, **goles y faltas editables junto al
reloj** (`ManualScore`, local a la izquierda, visita a la derecha) — la fila
que había agregado por separado se fusionó aquí, que es más cerca del pulgar
todavía. Misma acción y mismos límites de siempre (bloqueada con el reloj
detenido o el partido terminado); sólo cambió el lugar.

---

## PENDIENTE DE TU DECISIÓN (no lo toqué)

1. **Tope de 10 jugadores** (`MAX_ENTRIES` en `ExpressRosterModal`).
2. **Encaje de los lanzadores**: *contain* actual vs *cover* en `OverlayCanvas`.

---

## 6. GIRAR PISTA, TICKET DE EQUIPO ELIMINADO, ESCALA DE ESCRITORIO

- **Botón GIRAR PISTA**, junto a CHICHARRA en la barra maestra. Cambia qué
  lado ataca cada equipo — útil para el sorteo de campo al inicio, pero queda
  disponible todo el partido. El cambio automático de lado en el entretiempo
  sigue funcionando igual; esto sólo lo adelanta o lo corrige a mano.
- **La ficha de equipo (goles/faltas/tiempo muerto/penales) se eliminó por
  completo.** Cada control ya tenía un lugar más directo: goles y faltas
  junto al reloj (`ManualScore`), tiempo muerto junto a la banca (`BenchZone`),
  y los penales de la tanda los registra sola la vista de shootout al cargar
  cada tiro — la ficha los duplicaba con un camino manual que podía
  desincronizarse del conteo real.
- **Los números de `ManualScore` crecen al tamaño de los relojes de 45** en
  vista de escritorio (`sm:text-4xl`, misma fuente LED), con botones +/-
  proporcionalmente más grandes.
- **"SOLICITAR" pasó a "SOLICITAR BANCA"** en el botón de tiempo muerto de la
  banca, para que quede claro qué se está pidiendo.
- **Escala de escritorio**: la pista y las bancas tenían casi todos sus
  tamaños tope en el punto de quiebre `lg` (1024px) mientras el contenedor
  seguía creciendo con la pantalla — en un monitor grande la cancha se veía
  enorme y los jugadores, chicos. Se agregó un peldaño `xl` a fichas, texto de
  dorsal y ancho de banca, y un tope de ancho (`xl:max-w-[1500px] xl:mx-auto`)
  para que la cancha no se estire más allá de lo razonable. Los modales de
  contenido sustancial (ficha de jugador, apariencia de la pista, editor de
  camiseta, falta de equipo, descanso, fin de partido) crecen un paso más en
  pantallas grandes (`lg:max-w-xl` / `lg:max-w-2xl`).

---

## 7. GIRAR PISTA: FICHAS SUPERPUESTAS — CAUSA ENCONTRADA

Al girar la pista las fichas quedaban mal ubicadas hasta forzar F5. La causa
estaba en `court-operator-view.tsx`: la posición de cada ficha se anclaba
alternando entre las propiedades CSS `left` y `right` según `isFlipped`, pero
el `translateX` de centrado se quedaba fijo en un solo sentido. Dos problemas
distintos, uno encima del otro:

1. **CSS no anima entre dos propiedades distintas.** Pasar de `left: 28%` a
   `right: 28%` no es una transición — son dos valores inconexos. El
   resultado quedaba mal calculado hasta que algo forzaba un reflow, como F5.
2. **El centrado dependía del lado.** `left` + `translateX(-50%)` centra
   correctamente; `right` + `translateX(-50%)` no — habría necesitado
   `translateX(+50%)`. Al no ajustarse, las fichas quedaban corridas un ancho
   completo de token en el lado girado.

Arreglo: todas las fichas (porteros y jugadores de campo, local y visita) se
anclan ahora **siempre con `left` + `translateX(-50%)`**, sin excepción. El
giro se resuelve espejando el porcentaje (`100 - x`) según `isFlipped`, no
cambiando de propiedad. Con eso la transición siempre es entre dos valores de
`left` — que sí es animable — y el centrado nunca se descuadra.

---

## 8. BOTONES DE BANCA: RENOMBRADO Y MÁS GRANDES

- **"T.B. {usados}/2" → "CONCEDER {usados}/2"**, para que quede claro qué
  acción hace el botón sin tener que descifrar la sigla.
- Los cuatro botones de banca (AM. BANCA, RJ. BANCA, SOLICITAR BANCA,
  CONCEDER) crecen de `h-7` a `h-8 sm:h-10` con texto más grande en
  escritorio — la banca ya tiene más aire (`lg:min-w-[130px]
  xl:min-w-[150px]` de la ronda anterior) y la ficha de equipo que
  competía por espacio ya no existe.

---

## 9. LANZADORES: TAMAÑO Y POSICIÓN VERTICAL — TRES BUGS DISTINTOS, UNO POR LANZADOR

El modal de lanzadores parecía una maqueta en los mismos controles que en
GESTOR PANTALLAS sí funcionan (arrastrar, tamaño, posición). No era un problema
de mecanismo — el arrastre (`MOVER`) y el guardado de posiciones ya
funcionaban correctamente en los tres. El bug estaba en el control de
**Tamaño** y el de **Posición vertical**, y cada lanzador lo tenía roto de una
forma distinta:

- **GOL**: la Posición vertical funcionaba (`cfg.align` sí se leía). El
  **Tamaño no hacía nada** — `cfg.scale` se guardaba pero nunca se pasaba al
  lienzo. Arreglo: `<OverlayCanvas zoom={cfg.scale}>`.
- **ESTADÍSTICAS y FIN**: el Tamaño funcionaba (`scale` sí llegaba al
  lienzo). La **Posición vertical no hacía nada** — el prop `align` se
  recibía pero nunca se usaba: dentro de `SummaryOverlay` y `WinnerOverlay`
  había otra variable local también llamada `align` (horizontal, `left`/
  `right`, para alinear goleadores y equipos) que tapaba a la de verdad sin
  que nada fallara en la compilación. Arreglo: pasar el `align` real al
  lienzo (`<OverlayCanvas zoom={scale} align={align}>`).
- **`OverlayCanvas` no sabía alinear verticalmente.** Tenía `items-center`
  escrito a mano en el string base; agregarle una clase por fuera no la podía
  ganar (misma especificidad, orden de cascada impredecible). Ahora
  `OverlayCanvas` acepta `align` y calcula la clase una sola vez
  (`items-start` / `items-center` / `items-end`), reemplazando al valor fijo
  en vez de competir con él.

Con esto los tres lanzadores quedan al mismo nivel que GESTOR PANTALLAS:
arrastre, tamaño y posición vertical funcionando de punta a punta, desde el
modal hasta la proyección real.

---

## 10. MODO EDITAR DE LOS LANZADORES — POR FIN ARRASTRA DE VERDAD

El diagnóstico anterior (que el mecanismo de arrastre "en principio funciona")
era incompleto. Comparé `OverlayDraggable.tsx` línea por línea contra el
editor de pantallas de `scoreboard-view.tsx` — el que sí funciona — y le
faltaban exactamente las tres piezas que existen ahí para blindar el gesto
contra el scroll del navegador:

1. **`touchAction: 'none'` no estaba.** Sin esto, el navegador interpreta el
   arrastre como un intento de hacer scroll — la previsualización vive dentro
   de un modal con `overflow-y-auto` — y la página salta en vez de mover el
   elemento. Esto solo explica una parte del síntoma "salta la pantalla".
2. **Faltaba `e.stopPropagation()`** en el pointerdown, el pointermove y el
   pointerup. Sin eso el gesto se le sigue escapando al contenedor
   scrolleable en algunos navegadores aunque `touchAction` ya lo frene a
   nivel del navegador.
3. **La captura de puntero se pedía sobre `e.target`, no sobre
   `e.currentTarget`.** Si el pointerdown arrancaba sobre un hijo interno
   del elemento (un escudo, un número, un texto), la captura quedaba en ese
   hijo mientras el resto de la lógica asumía el contenedor — en algunos
   navegadores eso es exactamente lo que hace que el mouse se mueva pero el
   elemento no se mueva con él: el modo edición se sentía como una maqueta
   porque, técnicamente, lo era en ese caso.

Reescribí `OverlayDraggable.tsx` con las tres piezas alineadas al patrón
comprobado. Además:

- **Se eliminó el `ref` inline que medía `prevW`.** Era estado muerto —se
  escribía pero nunca se leía en ningún lado— y al ser una función anónima
  creada en cada render, React desmontaba y volvía a montar esa referencia
  en cada pintado, generando renders de sobra que podían contribuir al salto
  visual. No cumplía ninguna función; se quitó entera.
- **GOL: la Posición vertical tampoco funcionaba, y no se había detectado.**
  El contenedor externo de `GoalOverlay` intentaba alinear verticalmente con
  `flex` + `justifyContent`, pero su único hijo (`OverlayCanvas`) es
  `position: absolute` — queda fuera del flujo del flex, así que ese
  `justifyContent` nunca pudo hacer nada, con zoom o sin él. Ahora `align` se
  pasa directo al lienzo (`<OverlayCanvas zoom={cfg.scale} align={cfg.align}>`),
  igual que ya se había arreglado para Estadísticas y Fin la ronda anterior.

Con esto los tres lanzadores arrastran, escalan y alinean de punta a punta —
en el modal y en la proyección real— sin necesidad de F5 ni de que el gesto
se le escape al scroll.

---

## 11. EL MODAL DE LANZADORES NO EDITABA NADA — CAUSA RAÍZ ENCONTRADA (no el arrastre)

La ronda pasada until endurecí `OverlayDraggable` (touchAction, stopPropagation,
captura sobre `currentTarget`) asumiendo que el problema era el arrastre en sí.
Era necesario pero no era la causa raíz: **`Layout` — el componente que
envuelve el lienzo completo de cada lanzador (Gol, Fin, Estadísticas) —
estaba declarado DENTRO del cuerpo de `OverlaysModal`**, junto con `Toggle`,
`BoardPicker`, `NumberField`, `ColorField` y `TabBtn`. Es la misma familia de
bug que ya se había corregido una vez para las capas internas de los
lanzadores (`OverlaySlot.tsx`), pero un nivel más arriba, sin corregir.

Consecuencia exacta: arrastrar un elemento llama a `onChange` en cada
`pointermove`, que actualiza el estado `layouts` del modal. Con `Layout`
redefinida en cada render, React trataba cada `<Layout tab="goal" />` como un
tipo de componente distinto al del render anterior y **desmontaba y volvía a
montar el lienzo completo en el primerísimo píxel de movimiento** — perdiendo
la captura del puntero y la referencia de arrastre al instante. El modo
editar "no destrababa nada" porque, literalmente, el lienzo se recreaba antes
de que el arrastre pudiera completar un solo frame. Remontar un árbol tan
grande en cada movimiento es también lo que producía el salto de scroll: no
era un elemento arrastrándose fuera de lugar, era el modal completo
reconstruyéndose.

Se movieron los seis (`Toggle`, `BoardPicker`, `NumberField`, `ColorField`,
`TabBtn`, `Layout`) fuera del cuerpo de `OverlaysModal`, como componentes de
verdad de nivel de módulo, recibiendo todo lo que antes tomaban por clausura
como props explícitas. Ahora se renderizan de nuevo cuando cambian sus props,
pero nunca se remontan — el arrastre puede completar un gesto entero sin que
nada por debajo se reconstruya.

Con esto, sumado al blindaje de la ronda anterior (`touchAction: 'none'`,
`stopPropagation`, captura sobre `currentTarget`), el modo editar de los tres
lanzadores queda funcionando de punta a punta: arrastra, no salta el scroll,
y guarda.

---

## 12. OTROS DOS AJUSTES DE ESTA RONDA

- **`'led-classic'` no existía en el mapa de fuentes.** El selector de
  GESTOR PANTALLAS ofrece "LED clásico (Orbitron)" con ese identificador,
  pero `LED_FONT_STACKS` no lo tenía — `resolveLedFont` caía en silencio al
  valor por defecto. Coincidía visualmente con Orbitron sólo porque
  `--font-led` en `globals.css` también es Orbitron; con cualquier otro tema
  esa coincidencia se habría roto sin avisar. Se agregó el alias.
- **Aviso visible de pantalla completa en `/scoreboard`.** El mecanismo para
  pedir pantalla completa ya existía (intento automático + clic para
  reintentar), pero el navegador exige un gesto genuino dentro de ESA
  ventana — abrirla con `window.open` desde la mesa de control no cuenta — así
  que el intento automático casi siempre se rechaza en silencio, y el único
  indicio de que hacía falta un clic era un `title` que sólo se ve al pasar
  el mouse por encima. Ahora, si la pantalla completa no se logra sola,
  aparece un aviso grande y visible ("Toca la pantalla para pantalla
  completa") que desaparece solo apenas se logra.

## PENDIENTE — NO PUDE CONFIRMARLO

Sobre "el puente al botón lanzar hace que los cables estén rotos": audité de
punta a punta la cadena que conecta GESTOR PANTALLAS con la ventana real que
abre "Lanzar" — la clave de `localStorage` (`ardi-live-logos`), el evento
(`ardi-screens-updated`), la resolución del número de tablero desde la URL
(`?board=`), y la carga de fuentes en el layout raíz (que aplica a todas las
rutas, incluida `/scoreboard`) — y las encontré consistentes entre la
previsualización y la ventana lanzada. No encontré, con eso, un quiebre
concreto para reproducir y arreglar con confianza.

Para no arriesgar un arreglo a ciegas sobre algo que no pude verificar: ¿me
podrías indicar qué botón "Lanzar" exactamente (el de una tarjeta P2–P5, el
de "Lanzar a proyector" dentro de Vistas y proyectores, o LANZAR TODO), y qué
se ve roto en la ventana que abre — un color equivocado, la tipografía por
defecto, el marcador en blanco? Con eso lo reproduzco y lo corrijo en la
próxima ronda.

---

## 13. PASADA TÁCTIL PARA TABLET — "HÁPTICO DE LUJO"

Auditoría de la vista PISTA pensada para un dedo sobre vidrio, no un mouse.
El hallazgo central: **la mayoría de los controles no daban ninguna señal al
tocarlos.** El componente base `Button` (65 usos sólo en esta vista) sólo
tenía `hover:` — que en touch casi nunca dispara — así que se tocaba un botón
y no pasaba nada visible hasta que el efecto de la acción se reflejaba en
otra parte de la pantalla. Eso es lo opuesto de "lujo": se siente como que la
app no respondió.

**Arreglo de fondo, uno solo, máximo alcance:** `components/ui/button.tsx`
—la base que usan los 65 botones de esta vista y todos los del resto de la
app— ahora tiene:
- `active:scale-[0.97]` + un tono más oscuro por variante al presionar
  (`active:bg-primary/80`, etc.) — la respuesta inmediata que faltaba.
- `touch-manipulation` — le saca al navegador el retraso de ~300ms que usa
  para distinguir un toque de un intento de doble-toque-para-zoom. Importa
  cuando hay que anotar goles o faltas rápido, tocando varias veces seguidas.
- `select-none` — un dedo moviéndose rápido entre botones adyacentes ya no
  arrastra selección de texto por accidente.

**Controles sueltos que no usan `Button` y no tenían nada de esto:**
el silbato del árbitro, las dos zonas de posesión (se tocan ~40 veces por
partido), el círculo central de puesta en juego (el control más importante
de toda la mesa — arranca y pausa el reloj), el botón de anular sanción en
la mesa de control, los dos diálogos de falta de equipo y de sustitución, y
el selector de estilo de ficha. Los ocho ahora responden al tacto con
`active:` + `touch-manipulation` + `select-none`, igual que el resto.

**Último punto, a nivel de página:** se suprimió el resaltado gris/azul que
dibuja el navegador solo en cada toque (`-webkit-tap-highlight-color:
transparent` en `html`). Sin esto, ese highlight por defecto se dibuja
ENCIMA del `active:` a medida de cada botón — los dos a la vez se ven
baratos y en conflicto. Con uno solo, hecho a propósito, se siente como una
app nativa y no como una página web.

No se tocó el layout ni el tamaño de nada: los pasos `sm:`/`lg:`/`xl:` que ya
se habían afinado en rondas anteriores (fichas, banca, reloj, botones de
banca) ya daban objetivos de toque generosos para tablet. Lo que faltaba era
la respuesta al tacto, no el tamaño.

---

## 14. AUDITORÍA COMPLETA DEL MODAL DE LANZADORES — TRES BUGS DISTINTOS CERRADOS

### 14.1 · Posición vertical: ARRIBA/ABAJO hacían desaparecer todo el lienzo

Causa encontrada: el lienzo mide 1920×1080 completos siempre — su tamaño de
layout no cambia, sólo se le aplica `transform: scale()` para verse chico.
`transform-origin` por defecto es el CENTRO del elemento. Con ARRIBA/ABAJO,
flexbox posicionaba el borde superior/inferior del lienzo en el borde de la
caja, pero la escala seguía pivotando desde su propio centro — que en
coordenadas sin escalar está en y=540, muy por debajo de una caja de
previsualización típica de ~200px. El contenido, ya reducido, terminaba
empujado fuera del área visible y el `overflow-hidden` lo recortaba por
completo. Con CENTRO coincidía por casualidad el pivote de la escala con el
centrado de flexbox — por eso era la única opción que se veía, y por eso
Estadísticas y Fin parecían "maquetas rotas": probablemente quedaron
guardados en ARRIBA o ABAJO de una prueba anterior, e invisibles
permanentemente hasta volver a CENTRO a mano.

Arreglo: `OverlayCanvas` ya no depende de flexbox para esto. Se posiciona con
coordenadas absolutas y el `transform-origin` se ancla al MISMO borde que la
alineación elegida (`top center` / `bottom center` / `center center`), así la
escala siempre reduce hacia el lado correcto y el contenido nunca se sale de
la caja.

### 14.2 · GOL: sólo dos de cinco capas eran de verdad — las otras tres eran maqueta

Confirmado exactamente como se reportó: `DEFAULT_LAYOUT.goal` declara cinco
capas (`watermark`, `text`, `jersey`, `shield`, `score`), pero
`GoalOverlay.tsx` sólo envolvía **dos** (`text` y `score`) en un `<Slot>` de
verdad. El escudo de fondo, el escudo del equipo y la camiseta eran divs
sueltos: se veían, pero moverlos o escalarlos desde Capas no tenía ningún
efecto porque no había ningún elemento arrastrable ahí — la configuración
guardada existía pero no estaba conectada a nada.

Se envolvieron las tres capas restantes en `<Slot>`. De paso, el escudo y la
camiseta vivían **combinados en un solo bloque flex** (una fila con `gap`),
cuando el layout de fábrica define posiciones INDEPENDIENTES para cada uno
(`jersey: x:760`, `shield: x:1160`) — se separaron en dos `<Slot>`
independientes para que cada uno se pueda mover y escalar por su cuenta,
como ya prometía el panel de Capas.

### 14.3 · `/scoreboard?board=1` no mostraba nada — regresión introducida por mí

Encontré un `app/scoreboard/layout.tsx` que envuelve la página en un `div`
con `min-h-screen` (un **mínimo**, no una altura fija). Mi página usaba
`h-full` — que necesita que el padre tenga una altura *definida* para
resolver el porcentaje. Como el único contenido real (`ScoreboardView`) es
`position: absolute` y no aporta altura a un contenedor en flujo normal, mi
`div` colapsaba a prácticamente cero de alto, y el tablero — anclado con
`inset-0` adentro de esa caja colapsada — quedaba con tamaño cero: no se veía
nada, y el aviso de pantalla completa (agregado en la ronda anterior, también
`absolute inset-0`) se desarmaba contra el mismo colapso, apareciendo
recortado arriba de la pantalla.

Esta regresión la introduje yo mismo la ronda pasada, al agregar `relative`
al contenedor para poder posicionar el aviso de pantalla completa encima —
antes de eso, sin ningún ancestro `position != static`, el tablero se
posicionaba directo contra el viewport y el colapso no importaba.

Arreglo: el contenedor de la página pasa a `fixed inset-0` en vez de `w-full
h-full relative`. Ancla directo al viewport, sin depender de la altura de
ningún ancestro — el tablero y el aviso de pantalla completa vuelven a
tener el tamaño correcto sin importar qué haga el layout que lo envuelve.

---

## 15. "ESPACIO FUNCIONA COMO ENTER" — DIAGNÓSTICO DEL OPERADOR, CERRADO DE RAÍZ

Diagnóstico correcto y completo, aportado directamente: un botón clickeado
con el mouse se queda con el foco; Espacio y Enter activan el elemento
enfocado; la siguiente vez que se apretaba Espacio para el reloj, el
navegador además volvía a pulsar el último botón tocado. Dos acciones por una
tecla, sin ninguna pista visible en el atajo en sí para saber por qué.

El `preventDefault` que ya existía en `app/page.tsx` no alcanzaba porque sólo
actúa cuando la tecla presionada coincide con una entrada de
`KEYS_NEEDING_PREVENT` — un parche por tecla que cualquier atajo nuevo
hereda sin cubrir, a menos que alguien se acuerde de sumarlo ahí a mano.

Arreglo implementado tal como se planteó: un solo listener global de `click`
en `app/page.tsx`, junto al teclado único de la estación, que le quita el
foco al botón apenas se suelta el clic. La distinción entre un clic real de
mouse/touch y una activación por teclado (Enter/Espacio, que también disparan
un evento `click`) es `event.detail === 0` — así que esto no interfiere con
navegar la interfaz a propósito con Tab + Enter. Corta el problema de raíz en
vez de tecla por tecla, y cubre cualquier atajo que se agregue después sin
que nadie tenga que acordarse de nada.

---

## 16. LA PROYECCIÓN REAL SE VEÍA CHICA — BUG ESTRUCTURAL DE FONDO

Este era el más serio de la ronda: en la proyección real de FIN y
ESTADÍSTICAS (y probablemente GOL también, aunque no reportado — el modal
tapaba el síntoma), el contenido aparecía como una isla chica flotando en
medio de una pantalla negra, sin cubrir la pantalla completa.

**Causa:** los tres lanzadores viven, cuando NO están en una previsualización,
con `position: fixed` (la clase `overlay-fullscreen`), que normalmente ancla
directo contra el viewport real sin importar dónde vivan en el árbol de
React. Pero un `transform` en cualquier ANCESTRO crea, para los descendientes
`position: fixed`, un "containing block" nuevo — dejan de anclarse contra la
ventana y pasan a anclarse (y a escalarse visualmente) contra ese ancestro.

Los tres lanzadores se renderizaban **dentro** del div del tablero, que tiene
exactamente ese `transform: translate() scale()` para encajar el lienzo de
1920×1080 en la ventana real. Quedaban atrapados: en vez de cubrir la
pantalla, se encogían con el mismo factor que reduce el tablero para caber
en la ventana — de ahí la isla chica en medio de la pantalla negra, con lo
que hubiera detrás asomando por los bordes (los círculos de banca que se ven
en las fotos 3, 5 y 6 son la página de control asomando por debajo, no parte
de la proyección).

**Arreglo:** los tres lanzadores se movieron a vivir como HERMANOS del div
del tablero — ambos dentro del mismo contenedor exterior, que no tiene
transform — así su `position: fixed` encuentra el viewport real. Y para que
las tarjetas de previsualización P2–P5 de la página de control (que sí
necesitan quedar contenidas dentro de su recuadro chico) no empezaran a
cubrir toda la ventana con este cambio, se conectó el prop `embedded` que ya
existía —pero nunca se usaba en la proyección real— pasándole
`embedded={isPreview}`: contenido en las tarjetas de previsualización,
pantalla completa de verdad en la ventana real y en el proyector del
estadio.

---

## 17. BLOQUEO DE FIN DE PARTIDO — SE PERDÍA AL CAMBIAR DE VISTA

Confirmado en los dos modos (Pista y Control): el bloqueo de controles al
terminar el partido vivía en un `useState` local del componente
(`matchEnded`), sincronizado a mano en cada punto donde el partido termina,
se reanuda o se resetea. Cambiar de PISTA a CONTROL (o abrir cualquier modal
que desmonte la vista) y volver desmonta y vuelve a montar el componente —el
`useState` arranca de nuevo en `false`, desbloqueando todo, aunque el partido
siguiera terminado de verdad en el estado compartido.

Arreglo: `matchEnded` ahora lee directo de `state.isMatchEnded` (persistido
en el GameState compartido, sobrevive cualquier cambio de vista) en vez de
ser un estado propio. Se quitaron las cuatro llamadas de sincronización
manual que ya no hacen falta, en ambas vistas.

---

## 18. OTROS DOS AJUSTES DE ESTA RONDA

- **La barra PROYECTAR (P1–P5) ahora respeta los monitores configurados.**
  Antes mostraba los cinco botones siempre, sin importar cuántas pantallas
  estuvieran activadas en GESTOR PANTALLAS. Ahora P2–P5 sólo aparecen si
  están en `visibleScreens` (P1 siempre está, es el tablero principal), y
  "LANZAR TODO" reparte sólo los tableros configurados.
- **La previsualización de cada lanzador se movió al principio de su
  pestaña**, justo debajo del interruptor de activar/desactivar, en vez de
  al final de una lista larga de ajustes — ahora se ve por defecto sin
  necesidad de bajar el scroll.
