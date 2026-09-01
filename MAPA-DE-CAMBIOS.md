# MAPA DE CAMBIOS — ARDI Hockey Patín 3.5

Referencia contra la versión que corre hoy en producción
(`ardis-marcador-de-hockey-pro.vercel.app`).

**14 archivos nuevos · 12 modificados.** El modo clásico sigue vivo y accesible
desde el botón CONTROL: los dos modos comparten el mismo `GameState`, así que se
puede alternar a mitad de partido sin perder nada.

---

## ARCHIVOS NUEVOS

### `lib/court-rules.ts` — 305 líneas
**El más importante. Léelo primero.**

Motor de reglamento puro, sin React. Antes esta lógica estaba duplicada: una copia
en `use-game-state.ts` y otra dentro de `LiveCourtViewer.tsx`, y ya divergían (el
componente consideraba expulsado a quien tuviera roja en `cardHistory` **o** en
`sanctions`; el hook sólo miraba `cardHistory`).

Contiene:
- `MIN_TOTAL_PLAYERS = 4`, `getMaxAllowed()` → `max(4, 5 - azules - rojas)`
- `isPlayerAvailable()` / `isPlayerExpelled()` — cruzan las tres llaves de
  identidad: número visible, número de camiseta e id
- `getYellowCount()` / `getBlueCount()` — acumulación por persona
- `getLineup()` — portero + jugadores de campo efectivos
- `getPowerPlay()` — con diferencial numérico
- `resolveToggle()` — valida un cambio y devuelve la alineación nueva o el motivo
  del rechazo. Sin efectos secundarios: la vista decide qué hacer
- **Capa de ajustes de partido**: `resolveRoster()` fusiona el plantel firmado con
  las correcciones de cancha (número, portero designado, capitán, lesionado,
  jugadores agregados o eliminados) y devuelve un `Player[]` normal

Por qué importa: como `resolveRoster` devuelve un plantel corriente, el motor de
sanciones **no se entera de que existen los ajustes**. `calculateCourtCardResult` y
`addBenchSanction` no tienen una sola línea cambiada.

---

### `components/court-operator-view.tsx` — 1.255 líneas
El modo PISTA. La pista como mesa de mando.

- Tocar una ficha abre su hoja de acciones. **La posición decide el dominio**: en
  pista salen amarilla, azul y roja; en banca salen amarilla y roja, que abren el
  reparto de colectivas sin cambios
- Gol, falta y penal desde la misma ficha
- Bloque "Gestión del jugador": lesionado, portero, capitán, número de camiseta
- Barra maestra: reloj, doble arranque (con y sin chicharra), periodo, siguiente,
  chicharra manual, tiempo de banca, descanso con FIN y +MIN, cambiar lado
- Mesa de control: azules y rojas cumpliendo. **Tocar la ficha anula la sanción**
- Paneles de equipo: goles, faltas, penales, posesión 45, timeouts, `X/Y en pista`
- Cajón inferior (empuja, no tapa): −1m/−10s/+10s/+1m, fijar duración, reset de
  reloj, agregar jugador, acceso a configuración de atajos
- Fichas de 76 px (las del viewer original eran de 32)

---

### `lib/hotkeys.ts` — 120 líneas
14 acciones configurables, contra las 6 del clásico.

Nuevas: chicharra manual, gol local/visita, falta local/visita, siguiente periodo,
descanso, cerrar diálogo.

Arregla los cinco defectos del sistema anterior:
- `keyMatches()` compara sin distinguir mayúsculas → **el bug de `Space` no puede
  volver** (antes `'Space' !== 'space'` y el atajo principal nunca disparaba)
- guardia `e.repeat` → un botón mantenido no dispara ráfagas
- `KEYS_NEEDING_PREVENT` → intercepta las teclas que el navegador usa para scroll
- `findConflicts()` → avisa si dos acciones comparten tecla
- `CLICKER_HOTKEYS` → perfil para mando Bluetooth (PageDown, PageUp, F5, Esc)

Un mando de presentación se empareja como teclado HID, así que este archivo **es**
la API de control remoto: sin red, sin latencia, sin costo mensual.

---

### `components/scoreboard/HotkeysModal.tsx` — 131 líneas
Captura global con `capture: true`, así que funciona con cualquier mando sin
importar dónde esté el foco — y asignar una tecla ya no ejecuta su acción.
La etiqueta **MESA** marca las acciones que se usan en cada jugada: son las
candidatas para los pocos botones de un clicker.

---

### `lib/match-summary.ts` — 107 líneas
Funciones puras sobre el `matchLog`. **Cero datos nuevos**: es otra lectura del
mismo estado que ya guardabas.

`playedMinute()` convierte el reloj descendente en minuto jugado: un gol con 12:30
en pantalla sale como 12'30 de juego, que es el formato de cualquier acta.

---

### `components/scoreboard/SummaryOverlay.tsx` — 124 líneas
La pantalla proyectada de resumen. Goles con minuto y camiseta, goleadores,
tarjetas con su color (la **B** marca las de banca), faltas, marcador por periodo,
penales y posesión. Respeta los interruptores de sección del modal.

---

### `lib/overlay-config.ts` — 91 líneas + `components/scoreboard/OverlaysModal.tsx` — 195 líneas
Configuración de los tres lanzadores que pasan por sobre la proyección: gol, fin de
partido y estadísticas. Entra desde GESTOR PANTALLAS.

El selector de tableros reemplaza el `bId === 1` que estaba fijo en el código.
Cambios en vivo a las ventanas abiertas por `localStorage` + evento, el mismo
mecanismo que ya usabas para `ardi-live-logos`.

---

### `components/scoreboard/MatchHistoryModal.tsx` — 450 líneas
El `matchLog` se guardaba desde hacía versiones y **nadie lo leía**.

Tres pestañas: Partidos (con filtro por serie, detalle expandible, exportación por
partido, borrado individual), Posiciones (PJ, PG, PE, PP, GF, GC, DIF, PTS más
tarjetas por equipo; el ganador sale del campo guardado, así que respeta la
definición por penales) y Goleadores. Todo exportable a CSV.

---

### `hooks/use-venue-setup.ts` — 120 líneas + `public/sw.js` — 85 líneas
Montaje en cancha con un PC y varias salidas HDMI.

- **Service worker**: tras la primera visita con conexión, la app **abre** sin
  internet. Recargas y ventanas nuevas funcionan con la red caída. También cachea
  imágenes de otros orígenes (ImgBB), o una ventana abierta sin red se quedaría
  sin escudo
- **Wake Lock**: Windows deja de apagar los televisores a mitad del segundo tiempo
- **`launchAllBoards()`**: lee los monitores conectados y reparte P1–P5 por las
  salidas, reservando el principal para la mesa. Si no puede leerlos, abre
  ventanas normales y lo dice

---

### `lib/club-brand.ts` — 46 líneas
**El único archivo que se edita por despliegue de cliente.** Nombre, nombre corto,
escudo, título de la barra, y si el club es local por defecto.

Configurado para Internacional Lo Espejo.

---

## ARCHIVOS MODIFICADOS

### `hooks/use-game-state.ts` — +168 / −8
El de mayor superficie. Todo aditivo; **el motor de sanciones no se tocó**.

- `GameState` gana `homeCourtIds`, `awayCourtIds`, `matchAdjustments`,
  `homePossessionTime`, `awayPossessionTime`
- `MatchEvent.eventType` gana `'cambio'` y `'ajuste'`
- `setCourtLineup()` — alineación + registro del cambio con minuto y periodo
- `reassignPlayerNumber()` — reescribe `cardHistory`, `sanctions` y `matchLog` para
  que la acumulación siga apuntando a la misma persona
- `setPlayerInjured()` — saca de pista, **no genera sanción**, reversible
- `designateGoalie()` / `designateCaptain()` / `addRosterPlayer()` /
  `removeRosterPlayer()` (este último no hace nada si el jugador ya tiene historial:
  borrarlo dejaría tarjetas huérfanas)
- `deleteMatchFromHistory()` + tope de 60 partidos (antes crecía sin límite con el
  `matchLog` y los planteles completos de cada uno)
- **Posesión acumulada** por equipo, usando el mismo delta corregido por deriva de
  los relojes de 45, así que hereda su precisión

### `components/scoreboard-view.tsx` — +115 / −26
- Bloque arrastrable `skaters`: "PATINADORES 5 vs 4", visible en P1
- Lanzadores de descanso y fin, con la coreografía configurable
- La animación de gol lee la configuración en vez de valores fijos
- `useRef` en lugar de `sessionStorage` como guardia del gol, y limpieza del
  `setTimeout` al desmontar

### `components/scoreboard/OfficialSheetModal.tsx` — +87 / −57
La planilla, reparada de punta a punta.

- **Sellar ahora exporta de verdad** (antes sólo hacía `setPlanillaLocked(true)`)
- El sello sube a prop: cerrar el modal ya no des-sella
- Las 8 firmas van al estado real; las de árbitro principal y auxiliar vivían en
  estado local y se perdían al cerrar
- Escapado CSV en campeonato, serie, árbitros, equipos, jugadores y observaciones
- Bloque `REANUDACION (LECTURA AUTOMATICA)` — el exportador y el importador por fin
  hablan el mismo formato
- Resumen con alargue y penales; tanda en el registro cronológico; ganador;
  fecha desde `timestamps.matchStart`

### `components/scoreboard/PreMatchSetup.tsx` — +36 / −8
- Carga de números reales de camiseta en modo Express (el primero es el portero).
  Vacío = plantel genérico de antes
- El parser de reanudación lee las claves que el exportador escribe
- Borrada la línea `gameRules`, que no existe en `MatchConfig`: era el origen de los
  **dos únicos errores de TypeScript** del proyecto

### `components/scoreboard/SignatureCanvas.tsx` — +8 / −4
Escala las coordenadas por `canvas.width / rect.width`. El canvas se dibuja a
400×200 y se renderiza con `w-full`, así que el trazo iba corrido ~20% del dedo.

### `app/page.tsx` — +61 / −9
Tercer modo `pista` con su botón, elección persistida, indicador de estado offline,
botón LANZAR TODO, entrada al modal de lanzadores, precarga del escudo del club.

### `app/layout.tsx` — +9 / −14
`next/font/google` fuera. Tipografías autohospedadas desde npm
(`@fontsource/orbitron`, `@fontsource/share-tech-mono`): **el build ya no consulta
Google Fonts**. Cuatro pesos en vez de seis; el código sólo usaba tres.

### `app/globals.css` — +44 / −2
Hoja de impresión para la planilla: A4 apaisado, sólo el modal, sin scroll interno
ni fondos oscuros. Antes `window.print()` imprimía la página entera cortada.

### `components/operator-view.tsx` — +13 / −3
Sólo dos cosas: botón HISTORIAL y cableado de `planillaLocked`. **El modo clásico
quedó intacto a propósito**, porque es el que corre en los dos clubes.

### `lib/roster-utils.ts` — +15 / −6
`generateExpressRoster()` acepta números reales.

### `package.json` — +3 / −1
Las dos dependencias de tipografías.

---

## VERIFICACIÓN

```
npx tsc --noEmit     # limpio (era imposible antes: había 2 errores tapados
                     #  por ignoreBuildErrors en next.config.mjs)
npx next build       # compila y prerenderiza / y /scoreboard, sin salida a internet
```

Ya puedes quitar `typescript.ignoreBuildErrors` de `next.config.mjs` y recuperar la
protección del build.

---

## POR DÓNDE EMPEZAR A LEER

1. `lib/court-rules.ts` — el reglamento, ahora en un solo lugar
2. `hooks/use-game-state.ts`, sólo lo nuevo — busca `Ajustes de partido`
3. `components/court-operator-view.tsx` — la vista, que sólo consume lo anterior

Si algo no calza con lo que ves en pantalla, el orden de sospecha es ese: la regla
está en el primero, el estado en el segundo, y el tercero sólo dibuja.

---

## DECISIONES QUE TOMÉ SIN EVIDENCIA DE CANCHA

Estas conviene que las valides tú en un partido, porque las elegí yo:

- **5 segundos** de retardo antes del resumen del descanso
- **10 segundos** de letrero de ganador antes de la ficha
- El **piso de 4 cede ante una lesión** (es involuntaria; si el equipo puede seguir
  lo decide el árbitro, no el software). Para cambios voluntarios el piso es firme
- El **reloj y la chicharra responden con un modal abierto**. Con un mando en la
  mano, que un diálogo deje el teclado mudo es inaceptable
- El menú de tarjetas lo decide la **posición**, no el rol
