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
