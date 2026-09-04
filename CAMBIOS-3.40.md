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

## PENDIENTE DE TU DECISIÓN (no lo toqué)

1. **Tope de 10 jugadores** (`MAX_ENTRIES` en `ExpressRosterModal`).
2. **Encaje de los lanzadores**: *contain* actual vs *cover* en `OverlayCanvas`.
