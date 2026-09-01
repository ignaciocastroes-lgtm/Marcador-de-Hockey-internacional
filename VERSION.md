# ARDI Hockey Patín 3.12.1 — "Pista Viva"

## Modo PISTA: la ficha es la mesa de mando
Tocar un jugador abre su hoja de acciones. El menú de tarjetas lo decide la
POSICIÓN, no el rol:
- **En pista** → amarilla, azul, roja (tarjetas de pista)
- **En banca** → amarilla, roja (abren el reparto de colectivas, sin cambios)

Gol, falta y penal desde la misma ficha. Entrar y salir de pista con validación
de reglamento. Gestión del jugador en bloque aparte: lesionado, portero, capitán,
número de camiseta.

## Capa de ajustes de partido
El plantel firmado por los capitanes NO se toca. Encima va `matchAdjustments`,
que viaja en el `GameState`: se sincroniza a las pantallas, sobrevive a una
recarga y llega a la planilla. Contiene número corregido, portero designado,
capitán designado, lesionados, jugadores agregados y eliminados.

`resolveRoster()` fusiona base + ajustes y devuelve un `Player[]` normal, así que
el motor de sanciones no se entera de nada. NINGUNA REGLA CAMBIÓ.

- **Lesión**: saca de pista, no genera sanción, es reversible, entra al acta.
- **Portero**: designable en partido; el anterior vuelve a jugador de campo.
  No altera el máximo en pista — son cuatro patinadores y uno ataja.
- **Número**: se reasigna y arrastra `cardHistory`, `sanctions` y `matchLog`.
  Bloqueado si el número está ocupado o el jugador está expulsado.
- **Agregar / eliminar**: eliminar sólo funciona si el jugador no tiene historial.

## Anular sanción
Tocar la ficha del sancionado en la mesa de control. Un toque, donde ya miras.

## Cajón de ajustes
Empuja, no tapa: -1m / -10s / +10s / +1m, fijar duración, reset de reloj,
agregar jugador y referencia de atajos.

## Modo Express
Carga de números reales de camiseta por equipo. El primero es el portero.
Vacío = plantel genérico de antes.

## Verificación
`npx tsc --noEmit` limpio · `npx next build` compila y prerenderiza / y /scoreboard
Sin salida a internet: tipografías autohospedadas desde npm.

## 3.2 — Montaje en cancha (un PC, varias salidas HDMI)
- **Service worker** (`public/sw.js`): tras la primera visita con conexión, la app
  ABRE sin internet. Recargas y ventanas nuevas de tablero funcionan con la red
  caída. Antes el arranque dependía de Vercel.
- **Wake Lock**: Windows deja de apagar los televisores a mitad del 2do tiempo.
  Se repide solo al volver de minimizar.
- **Lanzar todo**: lee los monitores conectados y reparte P1–P5 por las salidas
  HDMI, reservando el principal para la mesa de control. Si no puede leerlos,
  abre ventanas normales y lo dice.
- **Indicador de estado**: punto verde "Offline listo" / "Sin red · OK".

## 3.3 — Atajos configurables, resúmenes proyectados y posesión
- **`lib/hotkeys.ts`**: 14 acciones configurables, perfil de mando Bluetooth,
  detección de conflictos, guardia `e.repeat`, intercepción de teclas del navegador
  y comparación insensible a mayúsculas (el bug de 'Space' no puede repetirse).
- **`HotkeysModal`**: captura global, así funciona con cualquier mando sin importar
  el foco. Etiqueta MESA marca las acciones de cada jugada.
- **Resumen del descanso**: entra a los 5 s, mantiene el reloj del entretiempo
  visible y se retira cuando el entretiempo termina.
- **Ficha final**: el letrero de ganador manda 10 s, después queda la ficha hasta
  que el operador configura un partido nuevo.
- **Tiempo de posesión por equipo**: se acumula con el mismo delta corregido de los
  relojes de 45 y se proyecta como porcentaje y minutos.

## 3.4 — Modal de lanzadores de proyección
`lib/overlay-config.ts` + `OverlaysModal`, entrada desde GESTOR PANTALLAS.
Tres pestañas, cambios en vivo a las ventanas abiertas (mismo mecanismo que
ardi-live-logos: localStorage + evento).

- **Gol**: activar, en qué tableros, duración, texto, camiseta del goleador,
  marcador, escudo de fondo, resplandor por color de equipo, colores.
- **Fin**: activar, tableros, segundos del letrero de ganador, ficha posterior,
  textos de ganador y empate.
- **Estadísticas**: activar, tableros, mostrar en descanso, retardo de entrada,
  y qué secciones (por periodo, goleadores, minutos, tarjetas, faltas, posesión).

El selector de tableros reemplaza el `bId === 1` que estaba fijo en el código.

## 3.5 — Despliegue por club
`lib/club-brand.ts` es el ÚNICO archivo a editar para personalizar un despliegue:
nombre, nombre corto, escudo, título de la barra y si el club es local por defecto.

Configurado para INTERNACIONAL LO ESPEJO. Su escudo aparece en la barra de la mesa
de control, precarga como escudo local la primera vez, y su nombre reemplaza a
"LOCAL" en las tres vistas mientras no haya equipo configurado.

**Service worker**: ahora también cachea imágenes de otros orígenes (ImgBB). Antes
las ignoraba, así que una ventana de tablero abierta sin red se quedaba sin escudo.

## 3.6 — Motor de audio con tres voces
`lib/audio-engine.ts` + `AudioModal` (cajón de ajustes → SONIDO).

- **BOCINA**: dos sierras a 110/114 Hz. Ahora con **envolvente** (8 ms de ataque,
  40 ms de caída) que elimina el chasquido de arranque y corte, y con **headroom**
  — dos sierras sumadas llegaban al techo y recortaban en cada batido.
- **PULSO**: onda cuadrada a 1568 Hz, 70 ms. Registro y timbre completamente
  distintos de la bocina. El último segundo suena a 1976 Hz y más largo.
- **AVISO**: tres pulsos descendentes, para tiro libre directo y límite de faltas.
- **MP3 propio**: opcional, sólo reemplaza a la bocina. Se guarda como data URL,
  así que **sobrevive a la recarga** (antes se usaba blob URL, que muere al cerrar).
  Tope de 400 KB, validación de tipo, y **botón VACIAR** que devuelve la sintetizada
  al instante. Si el archivo está corrupto, cae en la sintetizada sin dejar la mesa
  en silencio.

## 3.6.1 — Limpieza del audio heredado
Eliminadas TODAS las URLs externas de sonido (myinstants.com). Las ventanas de
tablero ya no intentan reproducir audio: el sonido sale por el plug del PC de la
mesa. Cero dependencias de internet para el audio.

## 3.6.2 — Sonido de faltas
Al quitar el MP3 externo, la falta 10 se quedó sin ningún sonido. Reconectado con
el motor nuevo: AVISO (tres pulsos descendentes) en la 9/14/19, y BOCINA en la
10/15/20 cuando se ejecuta el tiro libre directo.

## 3.7 — Tanda de penales en el modo Pista
Al pasar el periodo a "penales", la pista se transforma: el portero que defiende
queda en su arco y los lanzadores del otro equipo se alinean al medio.

- CAMBIAR LADO alterna qué equipo lanza.
- Tocar una ficha abre CONVIERTE / FALLA. **Los fallados también se registran** —
  antes sólo se podía sumar el convertido y los errados no quedaban en ninguna parte.
- Cada ficha muestra sus lanzamientos previos: punto verde convertido, rojo fallado.
- Los expulsados no aparecen entre los lanzadores.
- El sistema NO fuerza alternancia ni bloquea repeticiones: el árbitro guía el orden.
- Aviso de **definición anticipada**: cuando al que va detrás ya no le alcanzan los
  lanzamientos que le quedan, la pista lo indica.
- Muerte súbita automática tras las cinco series, resolviendo sólo con series parejas.
- Cada lanzamiento entra al acta como `penal_ronda`, tipo que ya existía sin uso.

## 3.8 — Arreglo: cambios bloqueados en inferioridad
**Bug:** con el equipo en el mínimo (4 en pista durante power play) no se podía
sacar ni meter a nadie, ni cambiar porteros. La validación evaluaba cada toque por
separado: sacar dejaba 3 y meter superaba el máximo, así que ninguno de los dos
pasos era legal aunque el cambio completo sí lo fuera.

**Arreglo:** `resolveSubstitution()` valida el ESTADO FINAL, no el paso intermedio.
Un cambio es una sola operación.

- Botón CAMBIAR POR… en la hoja de acciones de todo jugador en pista.
- Si se intenta sacar a alguien estando en el mínimo, se abre el selector de
  reemplazo en vez de rechazar el toque.
- `eligibleReplacements()` filtra a quienes pueden entrar: si sale el portero,
  sólo aparecen porteros; se excluyen expulsados y lesionados.
- El acta registra las dos mitades del cambio, entrada y salida, con su minuto.

## 3.9 — Geometría real de la pista y adaptación a dispositivos

**Pista corregida.** Los arcos estaban pegados al fondo, como en fútbol. En hockey
patín la portería va adelantada ~3 m de la valla y queda un pasillo detrás por
donde se juega. Ahora:
- Arcos al 7,5% de cada extremo (3 m de 40 m), con el pasillo trasero visible.
- Porteros al 12%, delante de su arco.
- Esquinas curvas (radio de 3 m del reglamento).
- Áreas que nacen en la línea de portería.
- Puntos de penal (5,40 m) y de falta directa (7,40 m) marcados.
- Punto y círculo central.

**Responsive.** El modo Pista tenía 11 puntos de quiebre contra 196 del clásico.
- Pista: proporción 1.4/1 en móvil, 2/1 en tablet, 2.6/1 en escritorio.
- Fichas: 46 px en móvil, 68 en tablet, 76 en escritorio.
- Paneles de equipo apilados en móvil, lado a lado desde tablet.
- Banca y reloj escalados por tamaño.
- Administración: 2 columnas en móvil, 3 en tablet, 5 en escritorio.

**Pantalla completa** desde la propia vista Pista, junto a LADO y AJUSTES.

## 3.10 — Lanzadores a pantalla completa con transición de broadcast

**El problema.** Los overlays vivían DENTRO del lienzo de 1920×1080 que se escala
y se centra. En cualquier pantalla que no calzara exacto quedaban bordes visibles
del tablero alrededor del gol. Ahora usan `fixed inset-0`: cubren el viewport
completo, sin importar la escala, el borde ni la calibración de lente.

**Las transiciones.** Curva expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`), que arranca
rápido y frena suave, como los gráficos de televisión.
- Entrada 620 ms: barrido desde el centro con desenfoque que se resuelve.
- Salida 520 ms con curva inversa, más rápida que la entrada.
- El contenido entra 120 ms después que el fondo: sensación de capas, no de bloque.
- Fase de salida real: el overlay se queda montado para animar antes de desaparecer.
  Antes desaparecía de golpe al cumplirse el tiempo.

Aplicado a los tres: gol, letrero de ganador y ficha/resumen.
Respeta `prefers-reduced-motion`.

## 3.11 — Los relojes de 45, juntos al centro
Estaban dentro de cada panel de equipo, o sea en los extremos opuestos de la
pantalla. En un monitor ancho quedaban a medio metro de distancia y obligaban a
mover las dos manos.

Ahora van en una barra centrada bajo la pista, pegados uno al otro, con su play y
su reset a un dedo de distancia — como en el modo clásico, que es donde el operador
ya comprobó que funciona mejor. Respetan CAMBIAR LADO, así que el reloj de cada
equipo queda del mismo lado que su banca en la pista.

## 3.12 — Carga Express con fichas
`ExpressRosterModal`: reemplaza el campo de texto por fichas.

- Se escribe el número y se pulsa Enter; también acepta varios de una vez ("7 9 12").
- **Tocar una ficha la marca como portero**, con anillo verde y etiqueta PO. Antes el
  portero era el primer número de la lista, una convención invisible que nadie podía
  adivinar y que fallaba en cuanto el operador cargaba en otro orden.
- Admite más de un portero (titular y reserva). La regla de uno solo en pista ya la
  aplica el motor.
- Rechaza duplicados y avisa cuál se repitió.
- Botón de quitar en cada ficha y VACIAR para empezar de nuevo.
- Si no se marca portero, se toma el primero y el modal lo dice antes de guardar.
- Vacío = plantel genérico de siempre.

## 3.12.1 — Arreglo: "Rendered more hooks than during the previous render"
Los hooks del resumen de descanso y de la ficha final (agregados en 3.3) quedaron
DEBAJO de `if (!mounted) return ...` en `scoreboard-view.tsx`. En el primer render
no se ejecutaban y en el segundo sí, y React exige que el número y el orden de los
hooks sea idéntico en cada render.

Movidos por encima de la salida temprana, con un comentario que marca la frontera.
Auditados los demás componentes con salida temprana: ninguno tiene hooks después.
