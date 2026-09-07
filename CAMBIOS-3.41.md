# ARDI Hockey Patín 3.41 — R1 · Higiene

Primera de las 6 rondas de la hoja de ruta 3.41–3.5.
`npx tsc --noEmit` y `npx next build` limpios. **El proyecto usa pnpm.**

Seis cambios independientes entre sí, riesgo cero: ninguno toca el motor de
reglamento, el estado del partido ni la lógica de sanciones. Cualquiera de
ellos se puede revertir solo sin afectar a los demás.

---

## 1. `<Toaster />` MONTADO — el que desbloquea trabajo ya escrito

`toast()` se llama en decenas de lugares del sistema: validaciones de
reglamento rechazadas, cambio directo de portero, sanción anulada, partido
reanudado. El componente que los dibuja **no estaba montado en ninguna
parte**. Sonner no falla cuando eso pasa: simplemente no dibuja nada. Los
avisos existían en el código, se ejecutaban, y no llegaban a la pantalla.

Fallar en silencio es la peor forma de fallar en una mesa de control: el
operador tocaba algo, el sistema lo rechazaba con razón, y no había manera de
saber por qué.

Montado en `app/layout.tsx` con criterio de cancha:
- `theme="dark"` fijo, no "seguir al sistema" — la app es negra siempre y un
  toast claro encandila en un gimnasio a oscuras.
- `richColors` — un rechazo de reglamento se ve rojo y una confirmación
  verde sin necesidad de leer.
- `position="top-center"` — abajo compiten con la barra inferior y el cajón
  de ajustes, que es justo donde el operador tiene las manos.

**No se agregó ni un solo `toast()` nuevo.** Todos los que ahora se ven ya
estaban escritos.

---

## 2. Service worker: `ardi-v1` → `ardi-v341`

El nombre del caché **es** el número de versión del despliegue: el handler de
`activate` borra todo caché que no coincida. Quedó en `ardi-v1` durante toda
la 3.x, así que un club que abrió la app hace meses podía seguir corriendo
aquel código —con los bugs ya corregidos— sin manera de enterarse.

Queda documentado en el propio archivo: **subir este número en cada
despliegue**. Es la única línea que hay que tocar.

---

## 3. Fuera `ignoreBuildErrors`

Estaba en `true` desde la 3.x, contra lo que dice el propio `DESPLIEGUE.md`.
Tapaba dos errores reales que ya fueron corregidos hace varias versiones.

Se puede quitar hoy sin arreglar nada más porque `tsc --noEmit` viene limpio
desde hace varias rondas. La diferencia se ve en la salida del build: antes
decía `Skipping validation of types`, ahora `Running TypeScript... Finished`.
Un error de tipos vuelve a romper el build en vez de llegar callado a cancha.

---

## 4. Escudo del club: local, con respaldo

El escudo del dueño vivía en ImgBB. Un producto offline-first que necesita
internet para dibujar su propio logo al abrir cada ventana tiene un problema
de disponibilidad, y el service worker sólo lo cachea bien desde el mismo
origen.

`logoUrl` apunta ahora a `/escudos/internacional-lo-espejo.webp`, y se agregó
`logoUrlFallback` con la URL externa de antes. Si el archivo local no está,
el `onError` cae al respaldo una sola vez (con guardia contra bucles) y todo
se ve exactamente igual que hoy. **No hay regresión posible en ninguno de los
dos escenarios.**

> **QUEDA PENDIENTE DE TU LADO:** dejar el archivo
> `internacional-lo-espejo.webp` en `/public/escudos/`. No pude descargarlo
> —el entorno donde compilo no tiene acceso a ImgBB—, así que la carpeta va
> creada y documentada, pero vacía. Hasta que el archivo esté, sigue usando
> la URL externa. Instrucciones en `/public/escudos/LEEME.txt`.

---

## 5. `LiveCourtViewer.tsx` eliminado

413 líneas, cero referencias en todo el proyecto (verificado antes de
borrar). Era la versión anterior de la vista de pista, reemplazada por
`court-operator-view.tsx`. Contenía además una copia divergente de reglas de
elegibilidad — exactamente el patrón de duplicación que el guión advierte que
se repitió seis veces.

---

## 6. Metadata

`package.json` de `0.1.0` a `3.41.0`. Título del layout, de
"ARDI Hockey Patín 3.0 — Pista Viva" a "ARDI Hockey Patín 3.41".

---

## LO QUE SIGUE

- **R2 · Un solo teclado.** Fusionar `ardi-hotkeys` (CONTROL) en
  `ardi-hotkeys-v2` con migración. Antes de congelar CONTROL, no después.
- **R3 · Identidad sin club compilado.** `CLUB_BRAND.prefix`, sacar el `if`
  de Inter del modal, `rut` → `documento` opcional, subir escudo desde
  archivo.
- **R4 · Un almacén de equipos** (la delicada: hay datos reales de dos clubes
  en producción).
- **R5 · Vitest + tests del anexo 6, luego mudar la escalada** a
  `court-rules.ts`.
- **R6 · Express como puerta + reloj que no se recicla.**

---

# R2 · ESCUDOS: GENÉRICOS ARDI Y GALERÍA

Se mantiene el enlace directo como forma de cargar escudos —no cambia nada de
cómo se pega una URL—, pero deja de perderse lo que ya se cargó.

## 1. Escudos ARDI genéricos

Los genéricos anteriores eran una silueta de una sola línea (la misma en azul
y en rojo), y estaban **copiados tres veces**: en `scoreboard-view.tsx`, en
`GoalOverlay.tsx` y en `page.tsx`. Cambiar el genérico obligaba a acordarse de
los tres lugares — el patrón de duplicación de siempre.

Ahora son dos archivos reales, dibujados para aguantar los 450 px del lanzador
de gol y no sólo el ícono del panel:

- `/escudos/ardi-local.svg` — azul acero con canto plateado.
- `/escudos/ardi-visita.svg` — grafito con canto dorado.

Los dos comparten la misma silueta de escudo, palos cruzados en X, bocho y
banda con "ARDI". Local y visita se distinguen de un vistazo desde la tribuna,
que es lo único que importa a esa distancia.

Viven en `/public/escudos/`, así que son del mismo origen: los cachea el
service worker y funcionan sin internet. La lógica quedó unificada en
`lib/generic-shields.ts` — un solo lugar, y los tres archivos que tenían copia
ahora importan de ahí.

## 2. Galería

Cada escudo que se carga por URL y **se dibuja bien** queda guardado. El
enganche es el `onLoad` de la previsualización: si la imagen se pintó, la URL
sirve. Una URL rota nunca dispara `onLoad`, así que la galería no se ensucia
con enlaces muertos — no hace falta validar nada a mano.

- Se guarda sólo la URL (texto), no la imagen: entra de sobra en localStorage
  y viaja liviano al exportar la configuración del club.
- Cada escudo se puede renombrar con el nombre del club, para reconocerlo al
  sábado siguiente.
- Dos botones por escudo, LOCAL y VISITA: el mismo escudo sirve para cualquier
  lado según quién juegue de local esa fecha.
- Tope de 40, ordenados por último uso. QUITAR sólo lo saca de la galería;
  nunca toca lo que esté puesto en el tablero.
- Los genéricos ARDI no se guardan en la galería: ya están siempre disponibles
  como botón fijo, y ocuparían lugar repitiendo lo que no hace falta recordar.

**La galería nace vacía y se llena sola con los rivales que este club enfrenta
de verdad.** Esa es la diferencia con un catálogo: no hay escudos chilenos
precargados que a un club de otro país le sobren. Cada despliegue construye la
suya sin que nadie tenga que curar nada.

## Verificado

- `npx tsc --noEmit` y `npx next build` limpios, con validación de tipos
  activa (`Running TypeScript... Finished`, ya no `Skipping`).
- Los dos SVG rasterizados e inspeccionados antes de entregarlos: la primera
  versión tenía los ganchos hacia adentro y se leía como una "V" en vez de
  palos cruzados; se rehízo.
- Servidos por el servidor real: `HTTP 200`, `image/svg+xml`.

---

# R3 · UN SOLO TECLADO

El briefing lo planteaba como "dos sistemas de atajos compitiendo". Al abrirlo,
la realidad era distinta y peor: **un sistema vivo y un zombi**.

El listener global ya se había unificado en `app/page` hace versiones. Lo que
quedó en CONTROL fue su mapa viejo de seis acciones (clave `ardi-hotkeys`) más
su propio editor, `HotkeyInput` — **que hacía rato no se renderizaba en ninguna
parte**. O sea: la clave vieja ya no la podía cambiar nadie, pero CONTROL
seguía leyendo de ella para pintar los atajos en sus tooltips.

**El resultado era que los tooltips de CONTROL mentían.** Si el operador
remapeaba una tecla en el modal de atajos, el panel clásico seguía mostrando la
anterior. Sin error, sin aviso, sin manera de notarlo salvo probando.

## Qué se hizo

- **Fuera el zombi**: se eliminaron el mapa de seis acciones, el editor muerto
  y la función que escribía la clave vieja.
- **CONTROL lee del sistema único** (`ardi-hotkeys-v2`) y se refresca con un
  evento nuevo, `HOTKEYS_CHANGED_EVENT`, que emite `saveHotkeys`. Lo que dice
  el botón es lo que hace la tecla, siempre.
- **Migración de teclas personalizadas.** Un operador que se acostumbró a sus
  teclas en CONTROL no las pierde: `loadHotkeys` trae una sola vez las seis del
  sistema viejo, mapeadas a los nombres de hoy. Sólo rellena acciones que el
  sistema nuevo no tenga configuradas — si el operador ya personalizó algo ahí,
  eso manda. **La clave vieja no se borra**: si algo saliera mal, el dato
  original sigue disponible.

## La otra mitad del teclado universal

Auditando apareció un hueco que el briefing no nombraba. Dos acciones no las
puede resolver `app/page` desde afuera, porque dependen de qué diálogo tiene
abierto la vista: **cerrar lo abierto** y **abrir el selector de descanso**.
Para esas, `page` emite un evento que atiende la vista montada.

PISTA lo escuchaba desde el principio. **CONTROL no.** En el panel clásico, las
teclas de descanso (`D`) y de cerrar diálogo (`Escape`) no hacían nada. El
mismo atajo funcionaba o no según el modo — justo lo que la homologación tiene
que terminar. CONTROL ahora las atiende, cerrando además todos sus diálogos.

## Atajos visibles

Sólo seis botones de CONTROL mostraban su tecla. Se completaron los que la
tenían asignada y no la enseñaban: chicharra, siguiente periodo, descanso, y
gol y falta de cada equipo. Un teclado universal que el operador no puede
descubrir no sirve de nada.

De paso, el acceso al editor que ya existía en CONTROL disparaba el evento con
el nombre escrito a mano (`'ardi-open-hotkeys'`); ahora usa la constante. Si
algún día cambia, deja de poder quedarse mudo en silencio.

## Verificado

- `npx tsc --noEmit` y `npx next build` limpios, con validación de tipos activa.
- La migración se probó con los cuatro escenarios que importan, y pasa todos:
  operador que sólo usó CONTROL (trae sus teclas), conflicto entre ambos
  sistemas (manda el nuevo), instalación limpia (valores de fábrica) y dato
  corrupto (no tumba nada).

## Nota para R4

CONTROL queda homologado, que era el requisito para congelarlo. La siguiente
es la delicada: **un solo almacén de equipos**, con datos reales de dos clubes
en producción. La migración ahí se lee de los tres y se escribe en uno, sin
borrar los viejos hasta confirmar que nadie perdió nada.

---

# R4 · EL MODELO Y EL ALMACÉN

No toca la pantalla de pre-partido: eso es R5. De cara al operador, el sistema
funciona igual que ayer. Lo que cambia es de dónde salen los datos y quién es
quién.

## Archivos nuevos

- **`lib/identity.ts`** — `clubId` (UUID invisible, hace global la solución),
  prefijo legible desde `CLUB_BRAND` y `personId` tipo `ILE-0007`. Un id
  retirado nunca se reasigna: las tarjetas viejas del acta apuntan ahí.
- **`lib/roster-csv.ts`** — los dos formatos, con los bugs del importador
  corregidos.
- **`lib/club-store.ts`** — el almacén único, con el emparejamiento del §3 del
  contrato y el diagnóstico para la pantalla de reconciliación de R5.
- **`lib/club-pack.ts`** — exportar/importar el club entero. Es lo que permite
  montar un club de otro país sin recompilar.
- **`lib/club-seed.ts`** — el plantel de Internacional, migrado desde el código.
- **`tests/csv.test.mjs`** — `node tests/csv.test.mjs`.

## Los dos bugs del CSV, corregidos y con prueba

Antes de escribir nada reproduje el viaje de ida y vuelta con el código real.
Exportar un plantel y volver a importarlo daba: **3 personas de 4, cero
nombres, todos los roles perdidos y el DT desaparecido**.

1. **Metadatos como filas.** El exportador escribía tres líneas de encabezado
   antes de la fila de columnas y el importador usaba `header: true`, así que
   tomaba `"PLANILLA DE JUGADORES - Internacional"` como nombre de columna.
   Ahora los metadatos van en líneas `#` que se separan antes de parsear.
2. **Tildes borradas.** El normalizador quitaba todo lo que no fuera `a-z0-9`,
   así que `Número` quedaba en `nmero` y no coincidía: sólo funcionaba
   `Numero` sin tilde. Y al no reconocer, se caía a la primera columna **en
   silencio**. Un archivo de una liga real entraba mal sin que nadie se
   enterara. Ahora se quitan los diacríticos (NFD), no los caracteres.

También: el cuerpo técnico ya no se pierde (el filtro `isNaN(parseInt(dorsal))`
descartaba al DT), se aceptan `;` como separador y sinónimos de cabecera
(`Dorsal`, `Camiseta`, `Jugadora`, `Alias`…), y si falta una columna
obligatoria **se dice en pantalla con las cabeceras que sí se encontraron**.

**16 pruebas, 16 pasan**, incluidas las cuatro que hoy fallan.

## La migración, verificada

21 personas (18 jugadoras + 3 del cuerpo técnico) y las 10 series pasaron del
código al almacén, con verificación automática:

- Ningún id repetido; las 3 porteras siguen siendo porteras.
- **Ariadny y Eloisa conservan el 20 las dos, y ahora tienen identidades
  distintas.** Ese choque —que hacía que el motor acumulara las tarjetas de una
  sobre la otra— queda resuelto por construcción.
- Las series migradas con el mismo número de integrantes: sub13f 10, sub15f 10,
  sub17f 8.

## Privacidad

`buildPlantelCSV` **no escribe el documento por defecto**. Sólo sale con
`incluirDoc: true`, la exportación explícita para la federación. Hasta ahora el
archivo que circula por correo llevaba la columna RUT de un plantel de menores,
contra lo que el propio `club-roster.ts` declara por escrito.

## Lo que NO se hizo, a propósito

- **Las claves viejas no se borran** (`hockey-teams`, `hockey-saved-rosters`,
  `CLUB_PLAYERS`). Se dejan de leer. Cuesta cero y deja salida si el sábado
  algo no cuadra.
- No se tocó la interfaz. El almacén está listo y probado, pero nadie lo
  consume todavía: eso es R5, junto con la pantalla de reconciliación, el apodo
  en el lanzador de gol y Express como puerta.

## Antes de R5

Conviene el partido de prueba acá. R4 cambia de dónde salen los planteles, y la
primera vez que se abra la versión nueva hay que cargar el plantel **antes**
del partido — un día de semana, no a las 9 de la mañana de un sábado.

---

# R5a · LA PUERTA

## 1. "Empezar de cero" — y una corrección importante

**Ctrl+F5 no borra nada de esto.** Una recarga forzada se salta la caché HTTP,
pero `localStorage` sobrevive intacto — y ahí viven los planteles, los equipos,
los atajos, los layouts y el partido en curso. Recargar esperando empezar
limpio deja todo igual, y eso se descubre tarde.

Por eso el borrado es ahora una acción de la app, en GESTOR PANTALLAS → Vistas
y proyectores:

- **Dice qué se va a borrar antes de borrarlo**, agrupado (plantel, historial,
  partido en curso, apariencia, preferencias).
- **Sólo toca claves `ardi-` y `hockey-`.** Verificado: no roza datos de otras
  aplicaciones que compartan el dominio.
- Al terminar informa cuántos elementos se fueron. Un borrado que no rinde
  cuentas es indistinguible de uno que falló a medias.

## 2. Arranque: la siembra es condicional

Con el almacén vacío, el plantel se siembra desde `CLUB_SEED` **sólo si este
despliegue es el del club dueño** (`CLUB_BRAND.isDefaultHome`).

Sin esa condición, el primer cliente de otro país abriría ARDI con el plantel
de Internacional Lo Espejo adentro — exactamente el tipo de dato compilado que
R4 vino a sacar del código. En un despliegue ajeno arranca vacío.

## 3. La identidad sobrevive al Express

`generateExpressRoster` fabricaba `crypto.randomUUID()` para cada ficha, así
que la misma persona era alguien distinto cada sábado y el motor no podía
acumularle tarjetas. Ahora, cuando la ficha viene del plantel del club, viaja
con su `personId` (`ILE-0007`) y con su nombre legal.

El modal de camisetas lee del almacén de R4, no del plantel compilado. Cargar
una serie trae identidad, no sólo números — y el aviso de dorsales repetidos se
calcula sobre el plantel real.

Sólo se ofrece para el equipo de casa: la visita se carga a mano y su identidad
es de la jornada, como dice el contrato.

## 4. El apodo, donde tu flujo lo pedía

- Se escribe **al elegir la ficha para el partido**, con un botón `A` en cada
  camiseta (verde cuando ya tiene).
- Se muestra bajo el dorsal, para ver de un vistazo quién tiene y quién no.
- **Al guardar vuelve al plantel del club**: se pide una vez en la vida, no cada
  fecha. Sólo para fichas con identidad permanente; la visita no deja rastro.
- Máximo 12 caracteres, validado al escribir.
- Vacío = la animación muestra sólo el dorsal, como siempre.

## 5. Dos duplicaciones cerradas

- **`ExpressEntry` estaba declarado dos veces** (en `ExpressRosterModal` y en
  `roster-utils`), y las copias ya habían divergido: la del modal no conocía
  apodo ni identidad. Ahora hay una sola.
- El modal ya no importa `CLUB_PLAYERS` ni `squadFor` del plantel compilado.

## Corrección de algo que dije mal

Afirmé que faltaba la rama **Mixta** y que no se podía configurar un partido de
Escuelita con la rama correcta. **Era falso.** Está en los dos flujos, y en
Express se deriva sola de la serie elegida. Mi grep estaba truncado y saqué la
conclusión sin verificar. No había nada que arreglar ahí.

## Verificado

- `tsc --noEmit` y `next build` limpios.
- **24 pruebas, 24 pasan**: 16 del CSV y 8 nuevas del arranque y el borrado
  (`node tests/csv.test.mjs`, `node tests/boot.test.mjs`).

## Lo que falta para cerrar R5

R5b: importar CSV con la pantalla de reconciliación, el apodo como capa del
lanzador de gol, el selector único de serie y `rut` → `doc`.

**Antes de eso conviene el partido de prueba.** El camino a probar: borrar todo
desde el gestor, abrir, cargar una serie del club, poner un par de apodos,
ajustar dorsales y jugar. Lo que importa mirar es si al terminar el partido las
tarjetas quedaron en la persona correcta.
