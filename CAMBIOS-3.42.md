# ARDI Hockey Patín 3.42 — R4+R5 consolidadas: el dorsal pertenece a la serie

`tsc --noEmit` y `next build` limpios. **36 pruebas, 36 pasan.**

Esta versión corrige un **defecto de modelo que venía en la 3.41**, detectado
desde datos reales antes de usarse en un partido.

---

## EL DEFECTO

`ClubPerson` guardaba **un solo** `dorsal`. Pero Ariadny es la 20 en Sub-15 y,
si sube a Sub-17 donde el 20 es de Eloisa, tiene que usar otro número. El
modelo no podía representar eso, así que la semilla generada en R4 salió con
**las dos con el 20 en Sub-17** — y jugar así es infracción sancionable.

No era un dato viejo mal migrado: era el modelo entregado en la 3.41.

## LA CORRECCIÓN

**El dorsal baja de la persona a la serie.**

```ts
// antes                          // ahora
ClubPerson { dorsal: string }     SerieMember { personId, dorsal }
series: Record<string, string[]>  series: Record<string, SerieMember[]>
```

- `ClubPerson` ya no tiene dorsal. La misma persona puede ser la 20 en Sub-15 y
  la 33 en Sub-17 al mismo tiempo.
- **Migración v1 → v2 automática** al cargar: el dorsal que tenía cada persona
  baja a las series donde estaba. Si dos quedan repetidas, la segunda queda sin
  número y el sistema lo marca — nunca inventa uno.

## LA SEMILLA, CORREGIDA Y VERIFICADA

- Ariadny conserva el **20 en Sub-15**.
- En **Sub-17 queda sin dorsal**, listada como no citable hasta que le asignes
  uno. Prefiero que la app te pida el dato a que se invente un número que
  después aparezca en un acta.
- Verificado: **ninguna serie repite dorsal**.

## LA VALIDACIÓN: DE AVISO A BLOQUEO

Era un toast que dejaba seguir. Ahora:

- `assignDorsal()` **rechaza** un número ya tomado en esa serie y dice de quién
  es: *"El 20 en esta serie ya es de Eloisa Figueroa"*.
- Al cargar una serie, quien no tenga dorsal **no se carga**, y se avisa por
  nombre.
- **El caso que se escapaba**: cambiar a mano un dorsal a uno que está libre en
  la citación de hoy pero pertenece a alguien **no citada** de esa serie. Se
  bloquea también. Sin eso, la próxima fecha salían dos con el mismo número.
- Lo corregido en la mesa **vuelve al plantel**, pasando por la misma
  validación. Si un cambio se rechaza, se avisa y no se guarda ese: mejor
  quedarse sin el cambio que dejar dos jugadoras con el mismo número.

## EL CSV DE PLANTEL PIERDE LA COLUMNA DORSAL

Por la misma razón: el dorsal depende de la serie, así que no cabe en una ficha
de persona. Queda en la citación, que es de una serie y una fecha. El CSV de
plantel lleva `id, nombre, apodo, rol, portero` (y `doc` sólo en la exportación
para la federación).

## PRUEBAS

`node tests/dorsal.test.mjs` · `csv.test.mjs` · `boot.test.mjs` — **36 en total**.

Las de dorsal fijan la regla con el caso real: Ariadny 20 en Sub-15, sin número
en Sub-17, el 20 rechazado por ser de Eloisa, el 7 rechazado por ser de
Pascale, y la misma persona con dos números distintos en dos series.

> Escribiendo esas pruebas elegí el 7 como "número libre" sin comprobarlo. La
> prueba falló: el 7 en Sub-17 es de Pascale Celis. Quedó como caso extra.

## LO QUE SIGUE

- **Mundo mínimo**: series y clubes como datos (`lib/series.ts` sigue compilado
  y chileno), arranque desde un paquete por cliente, selector de equipos
  visual.
- **Campeonatos** encima de eso.

Antes de seguir conviene el partido de prueba: borrar todo desde el gestor,
cargar una serie, jugar, y revisar que las tarjetas quedaron en la persona
correcta.

---

# LA PUERTA: TRES TARJETAS

## Lo que había

Al abrir, el operador caía en **"CERTIFICACIÓN PRE-PARTIDO"**, con el subtítulo
*"Complete la planilla y obtenga las firmas antes de iniciar"*, el botón
principal deshabilitado diciendo **"COMPLETE LAS 3 FIRMAS PARA CONTINUAR"**, y
el INICIO EXPRESS al fondo, debajo del scroll.

Quien usa Express el 100% de las veces aterrizaba en el asistente que nunca
usa, tenía que bajar hasta el final, y de paso leía que le faltaban unas firmas
obligatorias que en su flujo no aplican.

## Lo que hay

Tres tarjetas, en el orden en que se usan de verdad:

1. **INICIAR PARTIDO** — grande y primero. Es lo de cada sábado.
2. **EQUIPOS Y SERIES** — los clubes y las categorías de la liga.
3. **JUGADORES** — el plantel: altas, dorsales por serie, apodos.

Con el escudo y el nombre del club arriba, y `ardisport.cl` al pie.

## Las 3 firmas de apertura, eliminadas

**Verificado antes de sacarlas**: `delegadoLocal`, `delegadoVisita` y
`arbitroAuxiliarMesa` no los leía nada más que esa pantalla. El acta usa las
**ocho firmas de cierre**, que son otras, viven en la planilla y siguen
intactas. **El acta no pierde ningún campo.**

Se eliminó también el código que quedó muerto: el cálculo
`allSignaturesComplete`, el lienzo de firma de apertura y su estado.

## Las series salen del código

`lib/series.ts` decía de sí mismo que era *"la estructura real de la
competencia chilena"*. Un club español tiene Benjamín, Alevín e Infantil, y no
había forma de cambiarlo sin recompilar — la misma lección que el plantel
compilado, un nivel más arriba.

Ahora las series viven en el almacén de la liga (`serieDefs`), con
`saveSerie()` y `deleteSerie()`. Dos guardas: **el identificador no se puede
repetir**, y **una serie con gente adentro no se borra** (avisa cuántos hay).
Si se cambia el id de una serie, sus integrantes se mudan con ella en vez de
quedar colgando de una serie que ya no existe.

Ausente = se usa la lista chilena de fábrica, así que nada de lo que ya corre
se rompe. En cuanto se edita una serie, la liga manda sobre el código.

## Verificado

`tsc --noEmit` y `next build` limpios. **36 pruebas, 36 pasan.**

## Nota de nombres

La pantalla de detalle se llama ahora **"Jugadores y planteles"**, no
"Certificación pre-partido": certificar es validar un partido, y cargar
jugadores se hace un martes. El nombre sigue a la función.

## Pendiente

La tarjeta **Equipos y series** abre hoy el gestor de equipos. El **editor de
series** ya tiene su motor y sus guardas en el almacén, pero le falta la
interfaz — es lo primero del Mundo mínimo.

---

# LA HERRAMIENTA DEJA DE IMPONER REGLAS DE FEDERACIÓN

## Corrección de algo que yo apreté de más

Implementé la regla del dorsal como **"único dentro de la serie"**. Pero la
infracción real no es de la serie: es que **dos jugadoras salgan a la pista con
el mismo número en el mismo partido**. La serie sólo guarda el número habitual.

El resultado era que un amistoso Sub-15 contra Sub-17, o subir a alguien de
categoría, chocaba contra una reja que ARDI no tiene por qué poner mientras no
sea una herramienta federativa.

**Qué cambió:**

- **El bloqueo se movió a la citación.** Dos fichas del mismo partido no pueden
  compartir número. De qué serie venga cada una es indiferente.
- **Cargar una serie es un punto de partida, no una reja.** Antes descartaba a
  quien no tuviera dorsal ahí. Ahora quedan a la vista, abajo, y se suman con
  un toque: entran con el primer número libre y se puede cambiar.
- Si el número lo usa alguien de la serie que hoy no juega, **se avisa sin
  bloquear**. Puede ser exactamente lo que el operador quiere.
- **El número editado ya no se guarda solo en el plantel.** Hay un interruptor,
  apagado por defecto: en un amistoso los números son de la ocasión y
  guardarlos ensuciaba la ficha. El apodo sí se guarda solo, porque es de la
  persona, no del partido.

## Planteles: el ambiente para construir la base

`RosterLabModal` — tres caminos al mismo lugar, según lo que el operador tenga
a mano:

- **A mano**: nombre y número, Enter, listo. Cada alta recibe su `personId`.
- **Plantilla descargable**: se baja un CSV de ejemplo con las columnas
  correctas, se llena en Excel y se devuelve.
- **Importación**: con la pantalla de revisión antes de aplicar — cuántas
  reconoció, cuántas son nuevas, cuántas quedaron dudosas. **Las dudosas no se
  aplican**: si hay dos personas con el mismo nombre, se dice y se pide
  resolverlo en el archivo. Nada de identidad entra callado.
- Exportar el plantel completo, sin la columna de documento.

Dentro de cada serie se edita el dorsal (con su validación) y el apodo, y se
puede sacar a alguien de la serie sin borrar a la persona.

## Cuarta tarjeta: ligas y campeonatos

Un túnel, no una promesa: explica que esta herramienta dirige los partidos de
**un club**, que la liga completa es un módulo aparte que todavía no existe, y
que los jugadores que se carguen hoy se enlazarán sin perder nada — porque los
`personId` no cambian nunca. Enlaza a `ardisport.cl`.

## Verificado

`tsc --noEmit` y `next build` limpios. **36 pruebas, 36 pasan.**

---

# LA PLANILLA Y LOS DATOS DEL PARTIDO

## Había dos editores de plantel, y no daban lo mismo

La "Planilla Oficial de Jugadores" tenía su propio Importar CSV y su propia
alta con RUT. El ambiente de Planteles hace lo mismo, pero con identidad.

**Un jugador cargado en la pantalla vieja no tenía identidad**:
`processRosterImport` y `addPlayerToRoster` le ponían un `crypto.randomUUID()`
nuevo, así que sus goles y tarjetas no se acumulaban de una fecha a otra. Dos
puertas al mismo dato, resultados distintos, y sin manera de que el operador lo
notara. **Esa duplicación la introduje yo** al agregar el ambiente nuevo sin
retirar el viejo.

- Se retiró el importador y el alta manual de esa pantalla. En su lugar, un
  acceso a Planteles: *"¿Falta alguien?"*.
- Se **eliminaron las dos funciones**, no sólo sus botones: dejarlas sin uso
  invitaba a volver a cablearlas.
- De paso, el alta con RUT escribía el documento de un menor en una ficha que
  después viaja en el CSV.

## Fecha, hora y estadio

No existían. `MatchConfig` guardaba campeonato, serie, rama, periodos y
duración; la fecha se deducía del reloj al arrancar y el estadio no se
guardaba en ninguna parte.

- Los tres campos están en los datos del partido y **van al acta**.
- **En Express se rellenan solos** con el reloj del equipo: el partido se está
  jugando ahora. Lo escrito a mano manda, que es lo que hace falta al reanudar
  un suspendido de otra fecha.
- **El estadio se recuerda**: las canchas de una liga son siempre las mismas,
  así que se escriben una vez y después se eligen — como los escudos.

## Un bug encontrado de paso: el acta se fechaba mal

La cabecera mostraba `new Date()`, es decir **la fecha de hoy**, no la del
partido. Reimprimir un acta la semana siguiente la fechaba mal. Ahora usa la
fecha configurada y, si no hay, la del inicio real del encuentro. Nunca "ahora".

## Sellar entrega el acta con formato

`SELLAR Y EXPORTAR` disparaba el **CSV** — una grilla de comas que como
documento se ve, literalmente, como blanco, líneas y datos.

La exportación con formato ya existía: `window.print()` sobre la hoja A4
apaisada definida en `globals.css`. Sólo estaba en segundo plano. Ahora sellar
entrega **el acta con formato**, la misma planilla que se ve en pantalla, y el
CSV queda como opción secundaria para quien necesite los datos crudos.

## La planilla ya no se abre sola

Al terminar el partido saltaba encima del operador — justo cuando hay gente
preguntando el resultado, jugadores saliendo y el árbitro acercándose a la
mesa— y había que cerrarla para ver el marcador final. Se quitó de los tres
puntos donde se abría sola (fin normal, gol de oro, y la vista Pista). Se
genera **sólo con el botón PLANILLA**.

## Sin tocar

Los escudos siguen viviendo en `page` como entidad única, como pediste.

## Verificado

`tsc --noEmit` y `next build` limpios. **36 pruebas, 36 pasan.**

---

# EDITOR DE SERIES

## Primero, dos correcciones

Dije tres veces que el motor de series estaba **"probado"**. No lo estaba: no
había ni una prueba de `saveSerie` ni de `deleteSerie`. Lo repetí sin
verificarlo.

Y al ir a construir la pantalla apareció algo peor: **cuatro sitios seguían
leyendo `SERIES_ORDERED`**, la lista compilada, mientras el editor guardaba en
el almacén. Una serie creada por el operador se habría guardado bien y **no
habría aparecido en ningún desplegable** — ni para elegirla en un partido, ni
para cargarle camisetas. El editor habría guardado al vacío.

Es la tercera vez que aparece el mismo patrón —dos fuentes para el mismo dato—
después de los atajos de teclado y los editores de plantel.

## Los cuatro, conectados

| Dónde | Qué hace |
|---|---|
| Modal de camisetas | el desplegable "Cargar serie…" |
| Crear equipo guardado | arma un plantel vacío por cada serie |
| Asistente oficial | selector "Serie / Categoría" |
| Express | selector "Elige la serie…" |

Todos leen ahora `seriesOf(club)`, y `PreMatchSetup` se refresca con el evento
del almacén: una serie nueva aparece **sin recargar**. La lista compilada queda
sólo como valor de fábrica para quien nunca editó nada.

## La pantalla

Corta a propósito: una serie son tres datos —nombre, rama y orden— y el resto
es consecuencia.

- **El identificador se deduce del nombre.** El operador no debería inventarlo
  ni verlo. Si dos nombres generan el mismo, se numera solo: "Sub 15" y
  "Sub 15 B" conviven sin que nadie pelee con un campo técnico.
- **No hay botón de guardar**: lo escrito queda al salir del campo, como en el
  resto de la app.
- Subir y bajar para ordenar; el contador de integrantes a la vista.
- **Renombrar conserva el id**, así que los jugadores no se enteran.
- **Una serie con gente adentro no se borra**, y el ícono lo dice al pasar por
  encima.

## Auditoría del recorrido

`tests/flujo.test.mjs` recorre lo que hará el operador: crear una serie
escribiendo sólo el nombre → que aparezca en los selectores del partido →
cargarle una jugadora → renombrarla sin perderla → intentar borrarla con gente
(bloqueado) → vaciarla y borrarla → reordenar sin perder ni duplicar.

Escribiendo esa auditoría **una prueba falló por un error mío al contarla**, no
del código: había escrito mal el identificador esperado por el corte de 16
caracteres.

## Verificado

`tsc --noEmit` y `next build` limpios. **62 pruebas, 62 pasan**
(csv 15 · dorsal 13 · boot 8 · series 15 · flujo 11).

## Queda abierto

`MatchConfig.seriesName` guarda el **nombre** como texto y el historial agrupa
por él. Si mañana renombras "Sub-15 Fem" a "Infantil Femenino", los partidos
viejos conservan el nombre viejo y la tabla los vería como dos series
distintas. Lo dejo así —el acta es una foto del día— pero conviene saberlo
antes de renombrar a mitad de temporada.

---

# AUDITORÍA: CÓDIGO MUERTO Y BUGS

## Bug 1 · El operador podía subir una chicharra que nunca sonaría

Había **dos sistemas de audio**. El que suena es `lib/audio-engine.ts`. El otro
—`BUZZER_OPTIONS`, `buzzerSound`, `changeBuzzerSound`— seguía cableado a una
interfaz con selector de tipo y carga de MP3, pero **nadie reproducía ese
estado**. Además `BUZZER_OPTIONS` era `{ reggaeton: '', hockey: '', buzzer: '' }`:
las tres opciones, cadenas vacías.

Un operador subía su chicharra, no veía ningún error, y en el partido no sonaba.

**Eliminado por completo**: el estado, la clave de localStorage, el selector y
el botón de carga. La chicharra manual pasa siempre por el motor real, así que
respeta lo que se elija en AJUSTES DE AUDIO.

## Bug 2 · Un equipo nuevo nacía con el plantel de Internacional

`rostersPorDefecto()` llamaba a `squadFor()`, que lee `CLUB_PLAYERS` —el
plantel compilado en git—. Crear un rival llamado "Bata" lo dejaba con las
jugadoras de Internacional adentro, serie por serie.

Era el último cable a la fuente vieja que R4 debía cortar. Ahora **un equipo
nuevo nace vacío**: sin jugadores inventados que después haya que borrar uno
por uno.

## Chicharra de estadio

Se añadió una tercera voz al motor, junto a la sintetizada y al archivo propio.
Sigue la receta de diseño de sonido: sierra y pulso desafinados 12 cents, ruido
blanco al 18%, envolvente de tono que entra un 12% más agudo y cae en 35 ms,
LFO a 12 Hz sobre la afinación, dos filtros paso bajo en cascada (los 24 dB/oct)
con resonancia alta, saturación por `WaveShaper` y ADSR duro.

**La sintetizada anterior no se tocó**: son dos opciones, no un reemplazo.
La saturación sube el nivel percibido, así que se compensó la ganancia para que
cambiar de voz no dispare el volumen en el amplificador del pabellón.

## Express: la ficha completa

- **El nombre ahora se edita** antes del partido, junto al apodo. Antes sólo se
  podían tocar el dorsal y el apodo.
- Lo corregido vuelve al plantel del club (para fichas con identidad).
- **El tope subió de 10 a 16.** Diez era el plantel reglamentario *en pista* (8
  + 2 porteros), pero la citación incluye la banca: una serie de 12 se cortaba
  en 10 **sin decir nada**. Ahora, si aun así sobra gente, se avisa cuántas
  quedaron fuera.

## Limpieza

- **58 imports sin usar** en 11 archivos.
- Funciones huérfanas ya retiradas en rondas anteriores.

## Lo que NO corté, y por qué

- **`playBuzzer()`** parece muerto: escribe una clave que nadie lee y emite un
  mensaje que el receptor ignora. Pero el receptor lo ignora **a propósito**,
  con un comentario que lo dice: *"las ventanas de tablero no reproducen
  audio"*. Es una decisión, no un descuido, y el gancho sirve si algún día se
  quiere audio en las pantallas. Lo dejo.
- **El kit shadcn**: ~5.700 líneas en 43 archivos que nadie importa. **No pesan
  en el sitio publicado** —Next no incluye lo que no se importa—, así que es
  peso de repositorio, no de producto.
- **`lib/club-pack.ts`**: escrito en R4, sin interfaz todavía. Es tu
  herramienta para entregar clientes; sigue pendiente, no muerta.

## Verificado

`tsc --noEmit` y `next build` limpios. **62 pruebas, 62 pasan.**

---

# RONDA DE RELOJES Y POSESIÓN

## 1. El reloj principal "colapsado" (foto 2)

Cada carácter vivía en una caja de **`0.62em` fija**. Si la tipografía elegida
en el gestor de pantallas es más ancha que eso, los glifos se desbordan de su
caja y se pisan — que es exactamente el "21:50" con el 5 y el 0 superpuestos.

Ahora la caja mide **`1ch`**: el ancho real de un dígito en la fuente activa,
sea cual sea. Con `tabular-nums` todos miden igual. Se adapta solo, así que
cambiar de tipografía no puede volver a romperlo.

## 2. El tiempo muerto secuestraba el reloj principal (foto 1)

`RigidClock seconds={activeTimeout ? timeoutClock : mainClock}` — con un
timeout activo, el reloj grande dejaba de mostrar el tiempo de juego. El
operador perdía de vista el minuto del partido justo cuando el árbitro
pregunta por él, y el timeout ya tiene su propio panel al lado.

Corregido en **las dos vistas**. El rótulo también: decía "TIEMPO MUERTO"
sobre una cifra que ahora es el tiempo de juego.

## 3. Los 45 ya no corren con el juego detenido

No se puede dar posesión durante el descanso ni durante un tiempo muerto, y
los botones quedan deshabilitados. Los 45 sólo corren mientras corre el
partido.

## 4. El play de los 45 sonaba la chicharra

Dar posesión arranca también el reloj de juego, y la vista operador disparaba
la chicharra en cada arranque de reloj: unas cuarenta veces por partido. La
vista Pista ya tenía la guarda; aquí faltaba.

## 5. El play de posesión ya no pausa

Pulsar dos veces pausaba los 45. Eso no ocurre en un partido —la bocha siempre
la tiene alguien— y además convivía con un botón de "reset" al lado: dos gestos
para una sola cosa.

**Ahora el play fusiona dar y reiniciar.** Cada pulsación pone los 45 de ese
equipo en 45 y los arranca, repone los del rival y echa a andar el reloj.
Pulsarlo de nuevo reinicia; nunca pausa. Quien detiene el tiempo es el reloj
principal, y al pausarlo se reponen los dos medidores — eso ya funcionaba así.

En consecuencia:
- **Se eliminaron los botones de reinicio** de posesión (uno por equipo).
- **Se eliminaron los atajos** `possLeftReset` y `possRightReset`, y con ellos
  el atajo que pausaba la posesión.
- El icono ya no alterna entre play y pausa: siempre es play.

## Verificado

`tsc --noEmit` y `next build` limpios. **62 pruebas, 62 pasan.**

## LO QUE FALTA DE TU LISTA

No lo hice en esta ronda y prefiero decirlo en vez de dejarlo a medias:

1. **Anular tarjetas en el live no descuenta la acumulación**, y las amarillas
   no se pueden anular.
2. **La sección de penalizaciones activas** no existe en el live ni en la vista
   operador.
3. **En los penales, marcar gol no lanza la pantalla de gol.**
4. **`club-pack` sigue sin interfaz** (exportar/importar club).

Los tres primeros son del mismo territorio —sanciones y su visualización— y
conviene hacerlos juntos, con pruebas del motor de tarjetas, que es la parte
del sistema que más cuesta si se rompe.

---

# ANULAR TARJETAS, PENALIZACIONES ACTIVAS Y GOL DE PENAL

## Una corrección a lo que dábamos por hecho

Creíamos que la cruz del visor de eventos sí borraba la acumulación y que sólo
fallaba el "anular" de la mesa del live. **No era así: fallaban las dos.**

`removeSanction()` hacía exactamente una cosa:

```ts
sanctions: prev.sanctions.filter(s => s.id !== id)
```

Nada tocaba `cardHistory` — verificado: ese arreglo **sólo recibe altas, nunca
bajas**. La cruz parecía funcionar porque la fila desaparecía de la lista
activa, pero la tarjeta seguía entera en el historial y la acumulación con
ella. Un jugador con una amarilla anulada recibía azul en la siguiente.

## Cómo quedó

La tarjeta **no se borra: se marca como anulada**. Así el acta conserva la
traza de que se mostró y se anuló —que es lo que pide `REGLAMENTO-Y-USO`— y a
la vez deja de contar para la escalada.

Para eso hizo falta **enlazar la sanción con su tarjeta**: se creaban con
`uid()` independientes y no había forma de saber cuál correspondía a cuál. La
sanción lleva ahora `cardId`. Las tarjetas de partidos anteriores no lo tienen,
así que hay un respaldo por coincidencia de persona, tipo y banca.

Se excluyen las anuladas de **todos** los contadores, en los dos motores: las
amarillas, las azules, la escalada y **la expulsión** (anular una roja devuelve
al jugador a la pista). Y queda constancia en el registro: *"Tarjeta AZUL de #7
ANULADA por la mesa"*.

## Penalizaciones activas en las dos vistas

La mesa del live muestra sólo las azules cumpliendo, porque es el reloj de la
inferioridad. Una amarilla no tiene tiempo, así que **no aparecía en ninguna
parte de esa vista**: cargada por error, no había forma de anularla sin cambiar
de modo.

Se añadió `SanctionsList` —**el mismo componente que ya usaba CONTROL**, no una
copia— debajo de la mesa. Las tres tarjetas, con su cruz. Una implementación
para los dos paneles.

## El gol de penal lanza la pantalla

`adjustHomePenalties` / `adjustAwayPenalties` aceptan el dorsal y disparan la
animación, igual que un gol de juego. **No tocan el marcador del partido** —en
la tanda los goles no cuentan como goles—: sólo celebran. Un penal que define
un partido es EL momento del encuentro y la pantalla se quedaba muda.

## Verificado

`tsc --noEmit` y `next build` limpios. **75 pruebas, 75 pasan** — 13 nuevas de
anulación, incluido el caso que motivó todo: tras anular una amarilla, la
siguiente vuelve a ser amarilla en vez de escalar a azul.

---

# "SÉ EL MARCADOR PARA TU CLUB"

`lib/club-pack.ts` llevaba tres rondas escrito y sin interfaz. Ya la tiene, en
Planteles, y con ese nombre: no es un botón técnico, es lo que la pieza hace.

## Qué es

El club entero en un archivo: identidad, personas, series y el dorsal de cada
una en cada serie. Se exporta, se entrega, se importa.

Hasta ahora, montar ARDI en otro club significaba **editar el código fuente y
recompilar** — el plantel vivía compilado en `lib/club-roster.ts`. Una edición
de código por cada club, con el riesgo de que uno se lleve el error de otro.

Lo que lo hace funcionar es el `clubId`: un paquete importado en otra máquina
**sigue siendo el mismo club**, así que los `ILE-0007` conservan su significado
y el historial no se rompe. Por eso la identidad se diseñó así en R4.

## Corregido: no lleva botón de importar

La primera versión de esta pantalla traía exportar **e importar**. Estaba mal
pensado: darle a un operador la posibilidad de reemplazar el plantel entero
desde un botón es un riesgo sin contrapartida —un toque equivocado un sábado a
las nueve deja al club sin jugadores— y además **no es así como se entrega**.

Montar ARDI para un club es trabajo nuestro: se arma el paquete, se sube al
hosting y el club recibe su propia web lista.

Así quedó:

- **En la app, la pantalla es una invitación** que enlaza a ardisport.cl. Lo
  único que un club puede hacer con sus datos es **descargar un respaldo**, que
  es información suya y no rompe nada.
- **La entrega es por despliegue.** El paquete se deja como `/public/club.json`
  y la app lo siembra en la primera apertura. **Ocurre una sola vez**: en
  cuanto hay club guardado el archivo no se vuelve a mirar, así que las altas
  del club nunca se pisan con un redespliegue.
- Si el archivo no existe o es inválido, la app arranca igual y lo dice en
  consola. Nada a medias.

El procedimiento completo quedó escrito en **`ENTREGA-DE-CLUB.md`**: armar el
club, exportar, qué tocar en el despliegue (sólo `club-brand.ts`, el escudo y
`club.json`) y qué no tocar nunca.

## Verificado

`tsc --noEmit` y `next build` limpios. **87 pruebas, 87 pasan** — 12 nuevas del
paquete, incluida la que más importa para tu plan: un club de otro país viaja
entero, con su prefijo y sus propias series, y no colisiona con el club de casa
aunque convivan.

---

# VISTA LIVE EN TABLET, E ICONOS

## La barra maestra se desarmaba en tablet

Era un `flex-wrap` con siete piezas sueltas. En pantalla de tablet, la ficha de
GOL/FALTA de **la visita se caía a una segunda línea y quedaba debajo del
centro** — lejos del reloj de 45 al que pertenece, y con el bloque de periodo y
chicharra encima.

Ahora la barra son **tres zonas que no se envuelven**: cada equipo con su ficha
pegada a su propio 45, y el reloj al medio. Los controles de periodo, chicharra
y giro bajan a **su propia fila**, que es donde ya terminaban de hecho.

## APARIENCIA se fue dentro de AJUSTES

Ocupaba uno de los ocho lugares de la barra inferior, junto a FIN, PLANILLA y
NUEVO —acciones de cada jornada— cuando es un ajuste que se toca una vez y no
se vuelve a mirar. Está en el cajón de ajustes, como
"Apariencia de los jugadores". La rejilla bajó de 8 a 7.

## El icono y el escudo que demoraba

Dos problemas distintos, con la misma raíz: **una sola imagen para todos los
tamaños**.

**El icono de la app no estaba declarado.** No había `icons` en la metadata,
así que el navegador buscaba un `/favicon.ico` inexistente y la pantalla de
inicio quedaba con el icono genérico. Se generaron tres —32, 180 y 192 px— y se
declararon. Pesan 2 KB y 30 KB.

**El escudo de la barra usaba el archivo de proyección.** El escudo bueno pesa
lo que tiene que pesar para verse en una pantalla de estadio; usarlo también
para el icono de 36 px obliga al navegador a descargar y reescalar esa imagen
entera antes de pintar la barra. Por eso demoraba en aparecer.

`CLUB_BRAND` tiene ahora `logoIconUrl`, una copia reducida que se usa en la
barra y en la pantalla de inicio. **Si el archivo no está, se usa el grande**:
funciona igual, sólo más lento. Los dos `<img>` declaran además su tamaño, así
que el espacio queda reservado y la barra no salta al cargar.

> **PENDIENTE DE TU LADO:** dejar `internacional-lo-espejo-64.webp` en
> `/public/escudos/` (unos 64 px de lado), y reemplazar los tres iconos por el
> escudo del club ya reducido. Instrucciones en `/public/escudos/LEEME.txt`.

## Verificado

`tsc --noEmit` y `next build` limpios. **87 pruebas, 87 pasan.**

---

# MONTAJES EXPORTABLES, Y LA LÍNEA BASURA

## Montajes: guardar cómo quedó encuadrado

Resuelve "es un tema tener que encuadrar todo para empezar". Dos botones —
GUARDAR y CARGAR — en el modal de lanzadores y en el de pantallas.

- **Pantallas** se lleva la apariencia, las pantallas visibles y las
  posiciones, calibración y zoom **de cada uno de los cinco tableros**.
- **Lanzadores** se lleva la configuración y las posiciones de los tres.
- **Ninguno se lleva el plantel ni el partido en curso.** Un montaje es cómo
  se ve la cancha, no quién juega. Eso viaja en el paquete de club.

Guardas puestas, con el error del sábado en mente:

- Importar el archivo cruzado —el de lanzadores en pantallas— se detecta y
  **dice cuál es**: *"Ese archivo es un montaje de lanzadores. Impórtalo desde
  ahí."* No aplica nada.
- Un archivo manipulado que intente escribir claves ajenas (el plantel, el
  partido) **se rechaza entero**, no a medias.
- Importar recarga. Las posiciones las leen media docena de componentes al
  montarse, varios en ventanas distintas; refrescar en caliente dejaría la
  mitad vieja.

## La línea basura: eran seis, no una

La auditoría externa señaló un import a medio borrar en `PreMatchSetup.tsx`.
**Tenía razón, y me quedé corto al verificarlo**: al buscar el patrón completo
aparecieron **seis** líneas iguales en tres archivos, todas dejadas por mi
script de limpieza de imports.

Donde la auditoría se equivoca es en la consecuencia: decía que el zip no
arranca y que el changelog mentía. `tsc --noEmit` y `next build` pasaban — una
cadena suelta es una expresión válida en TypeScript. Era suciedad, no un
binario roto. Ya no está.

## Verificado

`tsc --noEmit` y `next build` limpios. **98 pruebas, 98 pasan.**
