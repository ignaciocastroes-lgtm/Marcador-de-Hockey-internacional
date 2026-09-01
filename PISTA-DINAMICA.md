# ARDI Hockey — Modo Pista Dinámica

Capa aditiva sobre la v4. El panel clásico sigue intacto y funcionando; el modo nuevo
convive con él y se elige desde la barra superior (CONTROL / PISTA / PANTALLAS).
La elección se guarda en `localStorage` (`ardi-view-mode`), así que sobrevive a un F5
en plena mesa.

## Archivos nuevos

### `lib/court-rules.ts`
Motor de reglamento puro, sin React. Es ahora la única fuente de verdad para todo lo
que antes estaba duplicado entre `LiveCourtViewer` y el hook:

- `MIN_TOTAL_PLAYERS = 4` — piso duro World Skate.
- `getMaxAllowed()` — `max(4, 5 - azules - rojas)`. Una segunda sanción simultánea no
  baja más el número de patinadores: sólo alarga la inferioridad, porque el segundo
  castigo espera turno en la cola de drenaje del reloj.
- `isPlayerAvailable()` / `isPlayerExpelled()` — cruzan `cardHistory` y `sanctions`
  por las tres llaves de identidad (número visible, camiseta, id).
- `getYellowCount()` / `getBlueCount()` — acumulación por persona.
- `getLineup()` — portero + jugadores de campo efectivos.
- `getPowerPlay()` — incluye diferencial numérico.
- `resolveToggle()` — valida un cambio y devuelve la nueva alineación o el motivo del
  rechazo. Sin efectos secundarios: la vista decide qué hacer con el resultado.

Funciones puras = testeables sin montar React, y el día que agregues otro deporte
reescribes este archivo, no la vista.

### `components/court-operator-view.tsx`
La pista como mesa de mando. Contiene todo lo que el operador necesita para llevar
un partido completo sin volver al panel clásico:

- **Barra maestra**: reloj principal grande, play/pausa con y sin chicharra, selector
  de periodo, siguiente periodo, chicharra manual, tiempo de banca, descanso (con FIN
  y + MIN), cambiar de lado.
- **Pista**: fichas grandes (68–76 px, más del doble que las del viewer original),
  banca a los costados, marcador de patinadores "5 vs 4" al centro, indicadores de
  power play, amarillas y azules acumuladas dibujadas sobre cada ficha.
- **Sanción por contacto directo**: click en una ficha abre la hoja de acciones con
  GOL, FALTA, PENAL, AMARILLA, AZUL, ROJA, y ENTRAR/SACAR DE PISTA. Ya sabe el equipo
  y el número, así que no hay grilla intermedia de veinte números.
- **Cuerpo técnico**: las fichas de DT y auxiliares sólo ofrecen sanción de banca, y
  abren el `BenchModal` con esa persona preseleccionada como infractor directo.
- **Mesa de control**: cumplimiento de azules y rojas con tiempo restante.
- **Paneles de equipo**: goles, faltas, penales, posesión 45 s, timeouts, contador
  `X/Y en pista`.
- **Administración**: diseñador de camisetas, FIN, PLANILLA, NUEVO, REANUDAR.
- **Atajos**: Espacio (play con chicharra), M (mudo), A/S posesión local, L/K visita.
  Se desactivan solos cuando hay una hoja de acciones abierta.

## Archivos modificados

### `hooks/use-game-state.ts`
- `GameState` gana `homeCourtIds` y `awayCourtIds`.
- `MatchEvent.eventType` gana `'cambio'`.
- Acción nueva `setCourtLineup(team, ids, change?)`: aplica la alineación y, si se le
  pasa `change`, registra el cambio en el `matchLog` con minuto y periodo. Un solo
  `setState`, sin doble render.

Como el estado de pista vive en `GameState`, viaja por el canal de sincronización,
se persiste en `localStorage`, sobrevive a una recarga y llega a la planilla.

### `components/scoreboard-view.tsx`
- Elemento arrastrable nuevo `skaters`: bloque "PATINADORES 5 vs 4", visible por
  defecto en P1 y oculto en P2–P5 (se activa desde el modo diseño de cada tablero).
  El equipo con ventaja se pinta en verde.

### `app/page.tsx`
- Tercer modo de vista `pista`, botón PISTA en la barra, persistencia de la elección.

### `components/scoreboard/PreMatchSetup.tsx`
- Eliminada la línea `gameRules`, que no existe en `MatchConfig`. Con eso
  `npx tsc --noEmit` queda **limpio por primera vez** y ya puedes sacar
  `typescript.ignoreBuildErrors` de `next.config.mjs`.

## Verificación

```
npx tsc --noEmit     # sin errores
npx next build       # compila y prerenderiza / y /scoreboard
```

## Pendiente (no tocado en esta entrega)

Sigue abierto el bloque de planilla: "SELLAR Y EXPORTAR" no exporta, las firmas de
árbitro principal y auxiliar se pierden al cerrar el modal, la importación de partido
suspendido no lee el formato que exporta la app, el CSV no escapa comas, el resumen
por periodo omite alargue y la tanda de penales, y el canvas de firma no escala
coordenadas. También sigue la chicharra de las ventanas de proyección apuntando a
myinstants en vez del motor local.
