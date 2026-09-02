# ARDI Hockey Patín 3.26 — "Pista Viva"

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

## 3.13 — Plantel Express predefinido, fichas y equipaciones

**Express con 10 camisetas predefinidas** (8 jugadores + 2 porteros), el máximo
reglamentario. El modal abre con ellas cargadas: el operador sólo cambia el número
que necesite.
- Lápiz o doble toque en la ficha para cambiar el número, conservando la marca PO.
- Tope duro: 10 camisetas y 2 porteros, con aviso al intentar pasarse.
- Botones DEFECTO (restaura las 10), VACIAR y GUARDAR.

**`lib/appearance.ts` — estilo de ficha elegible.** Cubo, Funco (silueta con número)
y Patinador (silueta con casco y patines; el portero lleva casco integral).
Se elige desde la barra inferior de la vista Pista y se guarda.

**Dos equipaciones por equipo.** Cada equipo tiene kit titular y alternativo, con
polera, pantalón e insignia por separado, y se alterna con un toque cuando los
colores chocan con el rival.
Internacional Lo Espejo viene cargado: titular polera roja, pantalón azul, insignia
roja; alternativa polera azul, pantalón azul, insignia roja.

## 3.14 — Pantalla de resumen rediseñada
La anterior eran dos columnas sin línea base común, con la mitad inferior vacía y
la posesión más chica que el marcador. Rehecha con jerarquía de televisión:

- **Marcador en una sola línea**: escudo, nombre y goles compartiendo base.
  Los escudos pasan de 90 a 128 px.
- **Comparativas con etiqueta al centro** y los dos valores enfrentados, más barra
  proporcional en posesión. Es la estructura estándar de las estadísticas de TV:
  el ojo compara en horizontal sin buscar dónde está cada dato.
- **Un solo tamaño por nivel**: marcador 170, valores comparativos 62, nombres 58,
  goleadores 34, etiquetas 22-24. Antes había siete tamaños sin criterio.
- **Parciales por periodo** centrados bajo el marcador, no perdidos al medio.
- **Pie con goleadores y tarjetas** separado por una línea, ambos lados a la misma
  altura.
- Se usa el alto completo: las comparativas ocupan el centro que antes quedaba vacío.

## 3.15 — Correcciones de reglamento en el modo Pista

**La falta es del equipo, no del jugador.** Botón FALTA eliminado de la hoja de
acciones. Aparece un árbitro al centro superior de la pista: se toca y se elige a
qué equipo se le cobra, con el acumulado a la vista.

**Un jugador en banca no marca.** GOL queda deshabilitado si no está en pista, con
el motivo en el tooltip. En banca sólo quedan las tarjetas de banca.

**Sacar de la pista siempre es un cambio.** Se eliminó SACAR suelto: un equipo no
juega con menos por decisión propia. Sólo la lesión saca sin reemplazo, y para eso
está LESIONADO en gestión del jugador.

**Juego detenido: entretiempo y tiempo muerto.** Con el juego parado se pueden
cargar tarjetas —el árbitro puede sancionar con el juego detenido— pero quedan
bloqueados goles, faltas y la solicitud de tiempo de banca, también por atajo de
teclado. El rótulo del reloj muestra DESCANSO o TIEMPO MUERTO según corresponda.
(Antes el tiempo muerto no bloqueaba nada: sólo el entretiempo, y de forma parcial.)

**`lib/series.ts`** con las series reales: Escuelita, Sub-10 y Sub-11 mixtas,
Sub-13/15/17/19 y Adulta femeninas, Sub-17 y Sub-23 masculinas. La rama va dentro
de la serie, no como campo aparte: no existe "Sub-13 masculino".

## 3.17 — Plantel del club, con el número en la persona
`lib/club-roster.ts`. El número pertenece a la PERSONA, no a la serie: una jugadora
lleva su número en su serie y también cuando la citan a una mayor. Cada serie es
una selección del plantel, no una lista aparte.

- 18 jugadoras y 3 del cuerpo técnico de Internacional, temporada 2026.
- Sub-13, Sub-15 y Sub-17 femeninas armadas; el resto de las series quedan listas
  para cargar.
- Selector "Cargar serie…" en el modal Express: trae los números de esa citación.
- **Detección de choques**: Ariadny Olivares y Eloisa Figueroa comparten el 20.
  Al cargar Sub-17 el sistema avisa con los dos nombres, y si quedan dos fichas
  repetidas muestra una alerta permanente explicando que el motor de tarjetas no
  puede distinguirlas.

**Privacidad:** el archivo NO guarda RUT ni documentos. Las citaciones los llevan
porque son documentos internos; este archivo se versiona en el repositorio y la
mayoría del plantel son menores. Sólo nombre y número.

## 3.17.1 — Arreglo: los modales quedaban bajo el cajón
El cajón GESTOR PANTALLAS usa `z-[200]` y su fondo difuminado `z-[150]`, mientras
los diálogos de shadcn venían con `z-50`. Por eso el modal de Lanzadores se abría
DEBAJO del cajón y se veía borroso a través del fondo.

`components/ui/dialog.tsx`: fondo a `z-[300]` y contenido a `z-[310]`. Afecta a
todos los modales de la aplicación, que ahora abren siempre por encima.

## 3.18 — GESTOR PANTALLAS reagrupado
`components/scoreboard/ScreensPanel.tsx`. El cajón pasa de ~90 controles en un
scroll único a un menú de cinco tarjetas, cada una con su modal:

1. **Lanzadores de proyección** — gol, fin de partido y estadísticas (ya existía).
2. **Escudos e identidad** — escudos, URLs, forma de recorte, presentación,
   perspectiva 3D y animación flotante. Todo lo del escudo, junto: antes la forma
   estaba doscientos píxeles debajo de la imagen.
3. **Tipografía y colores** — fuente, grosor, separación y los cinco colores del
   tablero.
4. **Animación de gol** — diseño de camiseta, duración y los cuatro colores.
5. **Vistas y proyectores** — qué panel se ve en el videowall y lanzar cada pantalla.

**Verificado control por control:** las 20 claves de configuración y las 22
opciones de los selectores del panel original están presentes. Ninguna se perdió.

## 3.19 — Pista, bancas y tanda de penales

**El arco tiene red.** Antes era una línea roja pegada al borde. Ahora es poste
más malla, dibujada como se ve desde arriba, en los dos arcos y también en la
pista de penales.

**El portero pegado a su arco.** Estaba al 12% con el arco al 7,5%: quedaba
separado. Ahora va al 9,5%, justo delante de la portería.

**Tiempo de banca en cada banca.** SOLICITAR y CONCEDER pasan a la zona de banca
de cada equipo, junto a los botones de tarjeta de banca. Es la banca la que pide
el tiempo, así que el control va donde está la banca. Siguen también en los
paneles de equipo: ningún botón se perdió.

**Azules visibles sobre la ficha.** Tenían borde oscuro sobre fondo oscuro y no se
distinguían. Borde claro, sombra marcada y hasta tres acumuladas.

**Acumulación en la zona de castigo.** Sobre la ficha de cada sancionado aparecen
sus amarillas y azules acumuladas. Antes había que abrir la hoja del jugador para
saber en qué situación estaba el que ya está cumpliendo.

**Tanda de penales según World Skate.** Rehecha:
- Portero defensor SOBRE su línea de meta, en el arco con red.
- Punto de penal marcado a 5 m del arco.
- Lanzadores al centro de la pista, uno al lado del otro, mirando al arco.
- El portero del equipo que lanza aparece atenuado en su propia área, al otro
  extremo, fuera de la acción.
- Área de portería dibujada, como en juego.

## 3.20 — Chicharra, reloj rígido y escudo

**La chicharra no sonaba: dos causas.**
1. El navegador crea el AudioContext *suspendido* si no viene de una interacción
   del usuario, y los sonidos que dispara un temporizador —la cuenta atrás, la
   bocina al llegar a cero— no son un gesto. `armAudio()` engancha el primer toque
   o tecla de la página y reanuda el contexto con un tick mudo. Aplicado a las
   dos vistas.
2. En la vista clásica, `triggerAutoBuzzer` sólo sonaba si `buzzerType` era
   exactamente `'native-synth'`. Cualquier otro valor dejaba la mesa muda sin
   avisar. Se eliminó la condición.

La vista clásica pasa a usar `lib/audio-engine`: hereda la envolvente que evita el
chasquido, el margen de amplitud que evita el recorte, y los pulsos de cuenta atrás
con voz propia en vez de bocinazos cortos.

**`RigidClock`.** Cada carácter en su caja de ancho fijo: el reloj deja de bailar
al cambiar de número. Bajo los 10 segundos aparecen las décimas mientras el reloj
corre, como en la mesa de cronometraje.

**El escudo del club reemplaza al avatar "A".** Una sola marca en la barra.

## 3.21 — Atajos anclados a la estación de trabajo
Los atajos vivían duplicados: seis en la vista clásica y catorce en la Pista. Cambiar
de modo cambiaba el teclado bajo las manos del operador, y el modal de 14 acciones
sólo existía en un modo.

Ahora hay **un solo escuchador de teclado, en `app/page.tsx`**, con una sola
definición de teclas para toda la aplicación. Funciona igual en CONTROL, en PISTA
y en PANTALLAS.

- Las acciones globales —reloj, chicharra, posesión, goles, faltas, periodo— las
  ejecuta el page directamente sobre el estado.
- Las dos que son de la vista —cerrar el diálogo abierto y abrir el descanso— viajan
  por un evento (`ardi-hotkey`) que atiende la vista activa.
- Con un diálogo abierto el teclado se apaga, **salvo reloj, chicharra y cerrar**:
  con un mando en la mano, que un modal deje la mesa muda es inaceptable.
- La detección de diálogo abierto es global (`[role="dialog"][data-state="open"]`),
  así que ya no depende de que cada vista informe su propio estado.
- El botón ATAJOS del cajón de la Pista abre el mismo modal, que ahora monta el page.

## 3.22 — Acabados, tipografías recuperadas y limpieza

**Las fuentes descartadas volvieron.** El problema de entonces no era la tipografía
sino la distribución: dependían de Google Fonts. Desde la 3.5 el proyecto
autohospeda, así que ahora entran DSEG7 y DSEG14 —las de siete y catorce segmentos,
las de los marcadores físicos, copiadas a `/public/fonts`— más JetBrains Mono,
Fira Code y Chivo Mono desde npm. Todas viajan dentro del despliegue.

De paso se eliminaron `ds-digital`, `digital-7` y `liquid-crystal`, que estaban en
el código apuntando a fuentes que no existían en ninguna máquina.

**`lib/finishes.ts` — cuatro acabados.** Sólido, Neón, Flúor y Metal. No son colores:
se aplican SOBRE el color elegido.
- Neón y Flúor imitan una fuente de luz, que es lo que una pantalla hace bien:
  núcleo claro y halo, sin degradado, así que la masa del dígito queda intacta.
- Metal necesita degradado con brillo especular, y ese degradado parte el dígito.
  Por eso está **bloqueado para reloj, marcador y posesión**, con el motivo en el
  tooltip, y `resolveFinish()` lo degrada a sólido aunque alguien lo fuerce.
- Presets de Oro, Plata y Bronce, y los cuatro colores flúor que mejor aguantan
  en proyector.
- Vista previa en vivo sobre el color de fondo real del tablero.

**La pista dinámica sale de la vista clásica.** El modo PISTA la superó: allí es
mesa de mando, no vista de sólo lectura. Mantener las dos era tener dos
implementaciones de lo mismo.

## 3.23 — Posesión por toque, mesa de castigo y arreglos

**El cambio de posesión es un solo gesto.** Tocar una mitad de la pista le da la
bocha a ese equipo: repone los 45 y los arranca, y detiene los del rival. Era la
acción más repetida del partido y costaba dos botones. Las zonas van bajo las
fichas, así que tocar un jugador sigue abriendo su hoja.

**Los relojes de 45 flanquean el reloj principal**, uno a cada lado, con controles
chicos para el caso raro —pausar o corregir—. Se eliminó la barra suelta que
ocupaba alto, y **la pista creció** de 2.6/1 a 2.2/1 en escritorio, con 380 px de
alto mínimo.

**Arrancar un 45 ya no suena.** Arrancar la posesión enciende el reloj principal
por acoplamiento, y eso disparaba la chicharra de puesta en juego. Ahora se detecta
el origen y no suena. Corregido en las dos vistas.

**La zona de castigo es sólo de azules.** Las rojas expulsan, no cumplen tiempo en
la silla. Y el dibujo se reemplazó por la **cuenta regresiva grande** con tipografía
LED, que pasa a rojo pulsante bajo los 15 segundos: el operador ya no tiene que
girar la cabeza al televisor.

**El árbitro queda solo al centro arriba** y el diferencial de patinadores baja al
centro abajo, dentro de la pista, con borde verde cuando hay superioridad.

**Reset del reloj con dos pasos.** Un toque arma y otro confirma, y se desarma solo
a los 4 segundos. Un roce accidental ya no puede borrar el tiempo de juego.

**Botón de teclas rápidas en la barra del page.** El modal de 14 acciones existía
pero no había cómo abrirlo desde ahí.

**Pantalla completa en Chrome móvil.** Los lanzadores usaban `fixed inset-0`, que
en Android se dimensiona contra el viewport grande y deja una franja sin cubrir al
retraerse la barra de direcciones. Ahora usan `100dvh`, que sigue al viewport
dinámico. En Windows ya funcionaba, por eso no se veía.

## 3.24 — Equipos por serie y plantel vinculado

**`Team` gana `serie` y `roster`.** El mismo club en Sub-13 y en Adulta son dos
registros distintos: tienen planteles y camisetas distintas. Ambos campos son
opcionales, así que **los equipos guardados antes de esta versión no se pierden**:
al no traer serie, se muestran en todas hasta que el operador los reguarde.

**El diálogo Express se reordenó por dependencia.** Primero la serie, después los
equipos, porque la serie es la que filtra.
- Selector con las **series reales** (`lib/series`), con la rama dentro: elegir
  Sub-13 fija automáticamente rama femenina. Antes eran dos campos independientes
  que permitían combinaciones que no existen, con una lista inventada que incluía
  Sub-9, Sub-21 y "Liga de Honor".
- Los equipos guardados se filtran por la serie elegida y muestran su número de
  camisetas.
- **Elegir un equipo carga su plantel**: nombre, escudo y camisetas de esa serie.
  Si el equipo no tiene plantel guardado, se cargan las del plantel del club para
  esa serie.
- Botón GUARDAR junto a cada equipo: almacena nombre, escudo, serie y camisetas.
  Actualiza si ya existe ese club en esa serie, en vez de duplicar.
- Las tarjetas de camisetas muestran a qué serie pertenecen.

**El flujo con planilla completa usa la misma lista de series.** Tenía su propia
lista inventada, distinta de la del Express.

## 3.25 — Un solo editor de lanzadores

**El conflicto era de arquitectura, no de interfaz.** La animación de gol se
editaba desde dos modales que escribían en llaves distintas: el panel de pantallas
en `ardi-live-logos` (`goalDuration`, `jerseyDesign`, `homeJ1`…) y el de lanzadores
en `ardi-overlays` (`goal.duration`, `goal.text`…). Ganaba el último que guardaba,
y el operador no tenía forma de saber cuál era.

**`ardi-overlays` es ahora la única fuente de verdad del lanzador de gol.** Absorbe
el diseño de camiseta y los cuatro colores. La tarjeta "Animación de gol" se
eliminó del panel de pantallas: hay un solo lugar donde se edita.

**Migración incluida.** La primera carga sin configuración de lanzadores toma lo
que ya estuviera en `ardi-live-logos` —diseño, duración y colores— así que nadie
pierde lo que había elegido.

**Tamaño, posición y previsualización** para los tres lanzadores:
- Tamaño del 60% al 140%.
- Posición vertical: arriba, centro o abajo.
- Previsualización en proporción 16:9, la real del tablero, con el contenido
  a escala y en su posición. Se ve el resultado sin proyectar.

Todo se guarda por lanzador y llega en vivo a las ventanas abiertas.

## 3.26 — Fichas rediseñadas y sanción de banca en un toque

**Las fichas.** La cabeza y el cuerpo eran dos formas sueltas con nueve píxeles de
hueco entre medio, y el patinador era el mismo dibujo del funco con dos rayas.
- **Funco**: silueta de una sola pieza, cabeza y cuerpo compartiendo contorno.
- **Patinador**: torso inclinado hacia adelante, patines y stick. Silueta
  claramente distinta. El portero lleva casco integral en vez de cabeza redonda.

**La sanción de banca pasa de tres pasos a uno.** Antes: abrir el modal, elegir al
infractor, marcar uno por uno a quiénes alcanza el castigo, aplicar.
- Ahora se **arma** la tarjeta desde la banca (AM. BANCA o RJ. BANCA), la zona se
  resalta con el color de la tarjeta, y **un toque sobre el infractor la aplica**.
- El pintado del resto ocurre solo: el reglamento dice que la amonestación al
  banquillo alcanza a todos sus integrantes, así que preguntarlo uno por uno era
  pedirle al operador que decidiera algo que la norma ya decidió.
- CANCELAR visible mientras está armada, y Esc también la desarma.
- Si la banca ya está pintada, avisa que sólo aplica la directa.

`BenchModal` queda sin uso y se retiró de la vista.
