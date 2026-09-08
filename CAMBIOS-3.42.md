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
