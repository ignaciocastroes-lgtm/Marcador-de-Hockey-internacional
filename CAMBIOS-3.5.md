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

---

# DESCANSO ≠ SUSPENSIÓN, Y AJUSTES DE LA MESA

## El bug: suspender saltaba de periodo

Todo era "descanso". Suspender en el segundo tiempo **avanzaba al periodo
siguiente y reponía el reloj entero**: el partido se reanudaba en otro minuto
del que se había detenido.

Ahora son dos figuras separadas:

| | Reloj | Al reanudar |
|---|---|---|
| **Descanso** | cuenta atrás propia | avanza de periodo y repone el juego |
| **Suspensión** | se congela donde quedó | **mismo periodo, mismo minuto** |

La suspensión y la reanudación **quedan escritas en el acta**, porque son
hechos del encuentro.

Probado con el caso real: suspender a los 14:22 del segundo tiempo y reanudar
devuelve 14:22 del segundo tiempo, no 25:00 de un tercero que no existe.

El selector ahora se llama **DETENER EL PARTIDO** y ofrece las dos, con
SUSPENDER arriba y separado. En la vista operador el botón dice
**DESCANSO / SUSPENDER**, y el rótulo del reloj distingue "PARTIDO SUSPENDIDO"
de "DESCANSO".

## Los + y − ya no se bloquean con el juego detenido

En las dos vistas. Es precisamente en el descanso o en un tiempo muerto cuando
el operador revisa el acta con el árbitro y corrige lo mal cargado; bloquearlo
ahí era impedir el ajuste justo en el momento en que se hace.

## El penal SÍ se bloquea con el juego detenido

Lo contrario: no se convierte un penal durante un descanso, un tiempo muerto o
con el partido suspendido. **Anular gol sigue disponible**, que es justo cuando
el árbitro se acerca a la mesa.

## La pista, más grande

Periodo, chicharra y giro pasaron **al costado del reloj**. Ocupaban una banda
horizontal entera y esa altura se la quitaban a la pista, que es donde el
operador trabaja. En pantalla angosta bajan solos.

## Los nombres de los profesores

`generateExpressRoster` creaba el cuerpo técnico con nombres **escritos a
mano** —"Director Tecnico", "Ayudante 1"— y un id nuevo cada sábado. En la
banca y en el acta nunca aparecía el nombre real, aunque el plantel lo
tuviera.

Ahora, al cargar una serie se suma el cuerpo técnico **del club**, con su
identidad y su nombre. Si no hay ninguno cargado, se completa con el genérico
de antes para que la banca no quede vacía.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan.**

## NO HECHO EN ESTA RONDA

Lo digo en vez de dejarlo a medias:

1. **El HTML que reemplaza al PDF.** Es el más grande de tu lista y el que
   tiene destino propio: la web del club. Merece una ronda entera, con el
   formato pensado para insertarse como noticia.
2. **Los tres árbitros al inicio del partido**, opcionales.
3. **Sumar al plantel los de banca que no entran a pista** (suplentes). El
   cuerpo técnico ya viaja; los suplentes no todavía.

---

# LA CRÓNICA EN HTML

Reemplaza a la impresión como formato de salida. El acta en papel sirve para
la federación; **esto sirve para el club**: se pega como noticia en la web y
queda el registro de la temporada.

## Dos botones en la planilla

- **CRÓNICA WEB** — descarga un `.html` completo, listo para abrir o archivar.
  El nombre sale solo: `2026-09-12-internacional-lo-espejo-vs-cp-bata.html`.
- **Copiar crónica** — copia sólo el `<article>` al portapapeles, para pegarlo
  en el gestor de la web. Si el navegador no deja copiar, lo descarga como
  archivo en vez de fallar en silencio.

## Qué trae

Campeonato, serie, fecha y estadio · marcador con escudos (y penales si hubo)
· goles con minuto por equipo · tarjetas con su color, marcando las de banca ·
**posesión en barra y en minutos** · faltas, hora y duración real · marcador
por periodo · y una **crónica cronológica** de cómo se jugó.

## Las dos figuras, visibles

- Un **gol anulado por el árbitro** aparece **tachado** en la crónica, seguido
  de la línea que lo anula. No cuenta en el marcador ni en los goleadores,
  pero se ve: es parte de lo que pasó.
- Un gol **borrado por error de la mesa** no aparece. Nunca existió.
- Una **tarjeta anulada** no figura entre las tarjetas.
- **Suspensión y reanudación** salen en la crónica con su minuto.

## Decisiones de formato

- **Todo en un archivo.** Sin hojas de estilo externas, sin fuentes remotas,
  sin scripts. Se abre en cualquier parte dentro de diez años y se ve igual.
  Los escudos son la única excepción, y se ocultan solos si la URL muere.
- **Estilos con prefijo `ardi-` dentro del `<article>`.** Al pegarlo en un CMS
  no pelea con el diseño de la página ni se lo lleva por delante.
- Responsive: en teléfono las cajas se apilan solas.

## Un cabo suelto que apareció al construirlo

`buildSummary` **no excluía los goles anulados**. Lo usa también el lanzador de
estadísticas de la proyección, así que un gol anulado por el árbitro seguía
apareciendo en la pantalla del estadio y en la tabla de goleadores. Corregido
ahí, en los parciales por periodo y en las tarjetas.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan.**

Además, generé una crónica con un partido de prueba —3-1, con gol anulado,
tarjeta anulada, penal y suspensión— y la revisé: HTML bien formado (ninguna
etiqueta sin cerrar), el marcador ignora el gol anulado, el anulado sale
tachado, la roja anulada no figura, y no hay un solo recurso externo.

Va de ejemplo en `ejemplo-cronica.html`.

---

# CORRECCIONES DE CANCHA

## 1. Con el partido suspendido se podía seguir jugando

`toggleMainClock` comprobaba el tiempo muerto **pero no el descanso ni la
suspensión**. El reloj de juego arrancaba igual, corriendo por debajo del
rótulo "PARTIDO SUSPENDIDO". Ahora, para volver a jugar hay que reanudar.

## 2. La barra maestra: una sola fila, el reloj al centro

Era `flex-wrap`: a poco que faltara ancho, la ficha de la visita se caía a una
segunda línea y quedaba **debajo del centro**, lejos de su propio reloj de 45.

Los dos lados son ahora columnas de igual peso que empujan hacia el reloj, y
los controles quedan **anclados a la derecha**, donde los marcaste. No se
envuelve sobre 1024 px; por debajo baja el bloque de controles entero, nunca
media ficha.

## 3. Los avisos verdes, fuera

**41 `toast.success` eliminados** en toda la app. No aportaban: confirmaban lo
que ya se ve en pantalla y tapaban la mesa.

Se conservan los de **advertencia y error**, que son los que dicen por qué el
sistema rechazó algo — sin ellos, un rechazo vuelve a ser silencioso, que es
el modo de falla que más costó arreglar.

## 4. "Copiar crónica" ahora la ABRE

Copiar a ciegas no servía: no se veía qué se copiaba, y si el navegador
bloqueaba el permiso no pasaba nada visible.

**VER CRÓNICA** abre la página en una pestaña nueva, ya dibujada, con dos
botones propios: copiar el código para la web, e imprimir. Ver la página es la
comprobación. Si el navegador bloquea la ventana emergente, se descarga el
archivo en vez de fallar en silencio.

## 5. Impresión en hoja carta

- El acta pasó de **A4 apaisado** a **carta vertical**. En Chile el papel de
  oficina es carta, y apaisado obligaba a girar la hoja para leer una lista.
- Nada se parte entre dos hojas: tablas, filas y cajas llevan
  `page-break-inside: avoid`.
- **La crónica no tenía estilos de impresión.** Ahora tiene los suyos: fondo
  blanco, texto negro, tamaño carta. Verificado generando el PDF real —
  entra en una hoja y se lee en blanco y negro.

Van de ejemplo `ejemplo-cronica.html` y `ejemplo-cronica-carta.pdf`.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan.**

## Queda pendiente

El botón de descanso en la vista operador sigue mal resuelto en pantalla
(centrado y suelto). Lo miro con una foto de cómo se ve ahora, porque la que
mandaste está recortada y no alcanzo a ver contra qué está desalineado.

---

# BOTÓN, ESCUDOS, VENTANA LATERAL Y TEMAS EN PISTA

## 1. El botón DESCANSO / SUSPENDER se desbordaba

Lo rompí yo: renombré el botón de "DESCANSO" a "DESCANSO / SUSPENDER" pero su
bloque mide **140 px fijos**. El texto no cabía, se salía del botón y empujaba
el icono fuera. Ahora va en dos líneas dentro del botón.

## 2. Los escudos no llegaban a la crónica

Leía `state.homeTeam?.logo`, que **en un partido Express está vacío**. La
crónica salía sin escudos aunque en la proyección se vieran perfectamente.

Ahora los toma del **GESTOR DE PANTALLAS** (`ardi-live-logos`), que es donde el
operador los pega y lo que usa el tablero, con respaldo al escudo del club. Se
actualizan solos si se cambian con la planilla abierta.

## 3. La crónica se abre como ventana lateral

No como pestaña: una pestaña obliga a cambiar de contexto y se pierde de vista
el marcador justo cuando se quiere comparar. Se abre en una **ventana aparte,
angosta y anclada a la derecha** (42% del ancho de pantalla, máximo 900 px),
para dejarla al costado de Chrome o en el segundo monitor.

Trae sus propios botones: copiar el código para la web, e imprimir. Si el
navegador bloquea las ventanas emergentes, descarga el archivo en vez de no
hacer nada.

## 4. Los temas llegan a PISTA

Los siete temas visuales vivían **dentro de `operator-view.tsx`**, así que
PISTA no podía usarlos: se elegía un tema, cambiaba CONTROL, y la vista que se
usa cada sábado seguía igual.

**Cuarta vez que aparece el mismo patrón** — después de los atajos, los
editores de plantel y las series: algo compartido declarado dentro de una sola
vista.

Extraídos a `lib/themes.ts`, con un `useTheme()` que las dos vistas consumen y
un evento que las avisa: cambiar de tema en CONTROL se ve en PISTA **sin
recargar**.

En PISTA se aplican a las superficies grandes: barra maestra, reloj (color y
tipografía), rótulos, mesa de control y los botones principales de la barra
inferior. **No todos los botones de PISTA están tematizados** — los de la pista
misma y las fichas conservan su color propio, que es información (rojo/ámbar
por equipo), no decoración.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan.**

---

# AUDITORÍA DE LOS LANZADORES — ejecutada en un navegador

Llevaba dos rondas "arreglando" esto leyendo código. Esta vez levanté la app,
la abrí con un navegador de verdad y medí. El diagnóstico es otro.

## Lo que SÍ funcionaba

Medido en pantalla: pulsar `+` en una capa cambia su escala de **100% a 110%**
y el elemento crece de **472×266 a 519×292 px**. El mecanismo estaba bien.

Y el scroll **no saltaba** en la prueba automatizada. Así que el salto que ves
es del navegador llevando el foco al botón pulsado, no un remonte del modal.

## Lo que NO funcionaba: nada se guardaba

`setPos` sólo tocaba el estado del modal. `saveLayouts` se llamaba
**únicamente al pulsar GUARDAR**.

Comprobado: tras mover una capa y verla cambiar en la previsualización, la
clave `ardi-overlay-layout` **seguía en `null`**. El operador ajustaba, veía el
cambio, cerraba, y se perdía todo.

**Esa es la sensación de "no hacen nada": funcionaban en el modal y nunca
llegaban a la proyección.** No era el zoom: era que no persistía.

## Corregido

- **Cada cambio se guarda solo**, como en el resto de la app. Verificado en el
  navegador: antes `null`, después el ajuste en disco, y **sobrevive a
  recargar** (`watermark: 1.1`).
- GUARDAR pasó a llamarse **LISTO**: ya no es lo que guarda, sólo cierra el
  modo edición. Que un botón prometiera guardar era parte del engaño.
- Los seis botones de capa (los de la lista y los flotantes sobre cada
  elemento) llevan `type="button"` y no roban el foco, que es lo que hacía
  saltar la pantalla al pulsarlos.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan**, más la
comprobación en navegador descrita arriba.

## Una cosa que quiero decir

Este bug sobrevivió dos rondas porque lo busqué leyendo el código en vez de
ejecutarlo. El código de la escala **estaba bien** las dos veces que lo
"arreglé"; el fallo estaba un paso más allá, en que nadie escribía a disco.
Para lo que queda de interfaz conviene que siga probando así.

---

# PANTALLAS: SELECTOR DE PANTALLA Y MONTAJE A LA VISTA

Auditado ejecutando la app, igual que los lanzadores.

## 1. El montaje estaba escondido

Lo puse dentro de "Vistas y proyectores", que es un **panel plegable**: había
que saber que estaba ahí para encontrarlo. Ahora está en la portada del gestor,
junto a las tres tarjetas. Verificado en el navegador: **GUARDAR y CARGAR se
ven al abrir GESTOR PANTALLAS, sin desplegar nada.**

## 2. Editar una pantalla en un recuadro diminuto

Las cinco previsualizaciones convivían siempre: P1 arriba y las otras cuatro en
una rejilla debajo. Para ajustar **una** había que hacerlo en un recuadro
pequeño, con las demás ocupando sitio.

Hay un **selector** arriba: TODAS · P1 · P2 · P3 · P4 · P5 (sólo las
configuradas). Al elegir una, se ve **sola y a todo el alto**.

Medido en el navegador, ventana de 1500×1000:

| | Antes | Con P1 seleccionada |
|---|---|---|
| Alto de P1 | 452 px | **826 px** |
| Previsualizaciones en pantalla | 5 | 1 |

Casi el doble de alto para ajustar, que era el problema.

## 3. De paso: cinco copias a mano, ahora una

Las cinco previsualizaciones estaban **escritas a mano cinco veces** en el JSX,
cada una repitiendo su título, su color y su botón de lanzar. Cambiar un rótulo
obligaba a hacerlo cinco veces, y bastaba olvidar una para que quedaran
distintas.

Ahora son una lista de datos (`PANTALLAS`) y un componente
(`PantallaPreview`). El mismo patrón que ya se corrigió con los atajos, los
planteles, las series y los temas.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan**, más la
comprobación en navegador de las medidas de arriba.

---

# EL PUENTE CON LA WEB DEL CLUB

## Un botón nuevo: "Datos web"

La crónica HTML sirve para pegar una noticia y verla. **No sirve para que una
web filtre por serie, arme una tabla o liste goleadoras**: es dibujo, no dato.

Se agregó `buildMatchJSON`, que entrega el mismo partido en datos planos y con
nombres en español, para que quien lo lea del otro lado no tenga que conocer
ARDI por dentro:

`id` estable · fecha, hora, estadio, campeonato, serie, rama · por equipo
(goles, penales, faltas, posesión en segundos y en %, goleadoras con minuto,
tarjetas) · ganador · parciales por periodo · duración real · cronología.

Dos decisiones del contrato:

- **`id` es estable** (fecha + equipos): la web lo usa como clave y republicar
  el mismo partido reemplaza en vez de duplicar.
- **Los goles anulados vienen marcados y YA descontados** del marcador. La web
  puede mostrarlos tachados sin riesgo de sumarlos dos veces.

Verificado generando el JSON de un partido real con gol anulado, tarjeta
anulada, penal y suspensión.

## El prompt para el otro hilo

En `PROMPT-HILO-WEB.md`, con el contrato y los tres caminos de publicación.

**Lo importante que lleva escrito:** la web es Next.js estático en Vercel, sin
base de datos. Una entrada de administrador que guarde en `localStorage` **no
publica nada** — sólo se vería en el navegador donde se pegó. El prompt obliga
a resolver eso antes de escribir una línea, con tres opciones y su costo real.

Sin esa advertencia, lo más probable es que salga un panel de administrador
bonito que no publica.

---

# LANZADORES: POR QUÉ LOS BOTONES DEL LIENZO NO RESPONDÍAN

Auditado ejecutando la app y midiendo. El cableado **estaba bien**; los
problemas eran otros dos, y ninguno se veía leyendo el código.

## 1. La previsualización era demasiado chica para ver el cambio

Medido: el modal tenía **512 px** de ancho, la previsualización **476×268**, y
el lienzo de 1920×1080 se dibujaba al **24,6%**. Un `+10%` en una capa chica
son dos píxeles. Por eso parecía que el botón no hacía nada: sí lo hacía, pero
era invisible.

**En modo edición el modal se ensancha a 1024 px** y el lienzo pasa a
dibujarse al **41,7%**. (El `max-w-5xl` no bastaba: `DialogContent` trae
`sm:max-w-lg` en su clase base, que gana por orden de media query. Va con
`sm:`.)

## 2. Las barras flotantes se tapaban entre sí

Playwright no podía ni pulsarlas: *"otro elemento intercepta el puntero"*.

Dos causas, las dos de diseño:

- Las capas de la franja alta tenían su barra **fuera del lienzo**, debajo del
  rótulo "Previsualización", que se comía el clic.
- En GOL las capas **se superponen a propósito** —el escudo de fondo ocupa el
  lienzo entero, la camiseta y el escudo van pegados— así que las barras se
  tapaban y el clic se lo llevaba la vecina.

Medido: en GOL respondía **una de cinco**; en FIN y ESTADÍSTICAS, donde no se
pisan, respondían las cuatro.

Probé moverla arriba, abajo y mostrarla sólo al pasar por encima. Cada arreglo
tapaba un caso y abría otro, porque **la superposición es intencional y no va
a desaparecer**.

### La decisión

**El lienzo es para arrastrar. Los ajustes viven en CAPAS.** Se quitó la barra
flotante; queda sólo el nombre de la capa al pasar por encima, para saber qué
se arrastra cuando se superponen.

Una sola vía para cada cosa, como con los atajos y los editores de plantel.

**Verificado en las tres pestañas**: GOL 5/5, FIN 4/4, ESTADÍSTICAS 4/4 —
todas las capas cambian de tamaño y se apagan desde la lista.

## 3. Apagada ahora se ve apagada

Quedaba al 25% de opacidad, que sobre un lienzo oscuro y reducido casi no se
distingue del 100%. Ahora baja al 12% y se marca con borde rojo punteado.

## 4. Más tema en la vista PISTA

Seguía muy por detrás de CONTROL (8 usos contra 66). Se sumó la barra inferior
de administración. Las fichas de jugador **siguen sin tematizar a propósito**:
su rojo y ámbar dicen de qué equipo es cada una — ahí el color es información,
no decoración.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan**, más las
mediciones en navegador descritas arriba.

---

# DOS BUGS DE RAÍZ, ENCONTRADOS EJECUTANDO

## 1. El zoom de las capas: una animación pisaba el estilo

Llevaba varios intentos con esto. La causa real no se ve leyendo el código del
zoom, porque **el código del zoom estaba bien**.

Los lanzadores marcan sus capas con `bc-content-in`, la animación de entrada.
Esa animación declara `animation-fill-mode: both` y **anima `transform`**. En
CSS, una animación **pisa el estilo en línea**.

Así que el `transform: translate(-50%,-50%) scale(s)` que escribe cada capa
nunca llegaba a aplicarse. Medido en el navegador:

```
atributo style  : transform: translate(-50%, -50%) scale(1.1)
transform real  : matrix(1, 0, 0, 1, 0, 0)     ← la identidad
```

El valor se guardaba bien, el rótulo subía a 110%, y el dibujo lo ignoraba. De
paso se perdía también el centrado.

**La animación se mudó a un envoltorio interior.** Entra igual en la
proyección, y la capa exterior recupera el mando sobre posición y escala.

Verificado en las tres pestañas — ahora el transform calculado es
`matrix(1.1, …)` y los elementos crecen de verdad:

| | Antes | Después |
|---|---|---|
| GOL | 981×552 | **1079×607** |
| FIN | 362×17 | **398×19** |
| ESTADÍSTICAS | 758×74 | **834×81** |

## 2. El bucle al pegar un escudo

`rememberShield` se llama desde el `onLoad` de la previsualización, y escribía
**siempre**, con `usedAt: Date.now()`. Escribir emite un evento → se relee la
galería → nuevo estado → se repinta → la imagen vuelve a disparar `onLoad` →
otra vuelta. Y como `Date.now()` cambia cada vez, **el estado nunca se
estabilizaba**: la app quedaba girando y sólo salía con F5, sin dejar pegar la
segunda dirección.

Cortado por dos vías:

- Si el escudo ya está y se usó hace menos de un minuto, **no se escribe ni se
  avisa**. La vuelta se corta en la primera.
- Cada URL se anota **una vez por sesión** en el panel, aunque la imagen se
  recargue por un repintado.

Reproducido y verificado: al pegar la dirección se produce **una sola
escritura**, y el segundo campo acepta su URL con la app viva.

## Verificado

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan**, más las
mediciones en navegador de arriba.

---

# AJUSTES FINOS DE LAS CAPAS

## 1. FIN · "Parciales" — su 100% pasa a ser el triple

Medía `2vh`, unas dos decenas de píxeles sobre un lienzo de 1080: no se leía
desde la tribuna, y al 100% ya estaba en su tope útil.

Ahora su tamaño de fábrica es el triple, así que **el 100% ya sirve** y desde
ahí se puede subir más todavía.

**De paso, un problema de fondo:** esta capa medía en `vh`, que depende de la
ventana del navegador y **no del lienzo de 1920×1080**. El mismo texto salía de
un tamaño en la previsualización y de otro en el proyector. Pasó a píxeles del
lienzo, como el resto.

## 2. ESTADÍSTICAS · "Marcador" — deja de irse a la derecha

Medía **1700 px fijos** con los nombres estirados a los extremos: la capa se
extendía casi todo el lienzo y al agrandarla se salía del cuadro.

Ahora mide lo que ocupa su contenido y crece desde el centro. Medido: de 868 px
de ancho a **302 px**. Los nombres llevan un tope propio para que uno largo no
vuelva a estirar la capa entera.

## 3. "Goleadores" — una capa por equipo

Era **una sola capa de 1700 px con los dos equipos dentro**. Al agrandarla
crecían ambos a la vez, se iban contra los bordes y dejaba de leerse.

Ahora son **dos capas independientes** en los dos lanzadores:
"Goleadores local" y "Goleadores visita". Cada una se coloca y se escala por su
lado, y arrancan a los costados.

## Verificado en el navegador

Al 100%, **ninguna capa se sale del cuadro** en FIN ni en ESTADÍSTICAS.

Llevando **todas** al 200%:

| | Se salen |
|---|---|
| ESTADÍSTICAS | 2 de 5 |
| FIN | 1 de 5 |

Las que se salen son las **barras de ancho completo** —cabecera, equipos y
resultado, comparativas—, que miden casi el lienzo entero: al 200% cualquier
elemento más ancho que medio lienzo se pasa, y eso es geometría, no un fallo.
**Goleadores, marcador y parciales aguantan el 200% dentro del cuadro**, que
era lo que hacía falta.

`tsc --noEmit` y `next build` limpios. **130 pruebas, 130 pasan.**
