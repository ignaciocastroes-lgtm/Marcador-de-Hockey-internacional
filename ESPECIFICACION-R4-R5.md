# ESPECIFICACIÓN R4 + R5 — Identidad e ingesta CSV

Contrato de las dos rondas. Se escribe antes de tocar código porque una vez que
haya planteles cargados con este modelo, cambiarlo cuesta una migración.

**Decisión de fondo: el documento de identidad NUNCA es la llave.** La
identidad la emite ARDI y es válida en cualquier país. El RUT chileno —o
cualquier documento nacional— es un dato del acta, opcional, no una identidad.

---

## 0. POR QUÉ R4 Y R5 SON UN SOLO TRABAJO

R4 existe para que las sanciones se acumulen sobre la persona correcta. Pero
hoy `processRosterImport` hace `id: crypto.randomUUID()` en cada fila, y
`downloadRosterCSV` no escribe ninguna columna de id.

Por bien que quede el modelo, **la identidad se destruye en el momento en que un
plantel entra por CSV**. Si el CSV es la puerta, la identidad se decide en el
borde del CSV. Todo lo demás es consecuencia.

---

## 1. MODELO DE IDENTIDAD

### 1.1 `clubId` — lo que hace global la solución
UUID v4, generado **una vez** al crear el club, guardado en el paquete del club.
Nunca cambia, nunca se muestra en pantalla, no se deriva de nada.

Es lo que permite que dos clubes de países distintos que eligieron el mismo
prefijo legible no colisionen si algún día sus paquetes conviven en un
despliegue de liga.

### 1.2 Prefijo legible — para el humano
Sale de `CLUB_BRAND.prefix` (ej. `ILE`). Existe sólo para que una persona
pueda leer un CSV y reconocer de qué club es. **Puede repetirse en el mundo**;
`clubId` desempata. Nunca se usa solo como llave.

### 1.3 `personId` — la identidad de una persona
Formato `<PREFIJO>-<serial de 4 dígitos>` → `ILE-0007`.

- Serial correlativo por club, asignado por ARDI al dar de alta a la persona.
- **Estable de por vida.** Sobrevive cambios de dorsal, de serie y de temporada.
- **Nunca** es el dorsal. **Nunca** es el documento. **Nunca** se reasigna
  aunque la persona deje el club — un id retirado no vuelve a usarse, o las
  tarjetas viejas del acta apuntarían a otra persona.

### 1.4 La visita no persiste
Un rival distinto cada fecha no tiene registro histórico que mantener. Su
identidad es de la jornada: `V-<dorsal>`, válida sólo dentro de ese partido.

Si un rival se repite tanto que conviene guardarlo, deja de ser "visita" y pasa
a ser un club con su propio `clubId` y sus propios `personId`. Es el mismo
mecanismo, no uno nuevo.

### 1.5 El documento
Campo `doc`, **genérico y opcional**, texto libre.
- En Chile la liga pide el fragmento: últimos dígitos + verificador (`222-3`).
- En otro país será otra cosa, o nada.
- **No es llave, no se usa para emparejar, no participa de la identidad.**
- Fuera del CSV normal. Viaja sólo en la exportación explícita para la
  federación.

Esto además cierra una contradicción que hoy existe en el código:
`lib/club-roster.ts` dice por escrito *"aquí NO van RUT... la mayoría del
plantel son menores de edad"*, y `downloadRosterCSV` escribe la columna RUT en
un archivo que circula por correo.

### 1.6 `apodo` — el nombre de la pantalla
Campo opcional, corto, separado del nombre legal.

**El acta lleva el nombre legal. La pantalla lleva el apodo.** No son el mismo
dato y no deben compartir campo.

Motivo doble, y el segundo pesa más que el primero:

1. A un jugador de 12 años, ver su gol anunciado con su apodo es la mejor parte
   del producto. Es lo que hace que un club quiera la pantalla.
2. **Es más prudente.** Un nombre completo de un menor proyectado en un estadio
   —y a menudo transmitido— es más exposición de la que el club normalmente
   quiere. Un apodo da el reconocimiento sin el dato personal.

Reglas:

- **Máximo 12 caracteres.** El lanzador de gol dibuja a 450 px; un nombre largo
  rompe la composición o se recorta. El límite se valida al cargar, no al
  proyectar.
- **Cadena de respaldo en pantalla**: `apodo` → primer nombre → dorsal. Nunca
  queda vacío, y si nadie cargó apodos el comportamiento es el de hoy.
- No participa de la identidad ni del emparejamiento. Es decoración con
  cariño, nada más.

#### Dónde se escribe, y hasta cuándo

El punto natural de captura es **cuando se elige a la persona para un partido**
(la citación): ahí el operador ya está mirando a esa persona. Lo que escriba
**queda guardado en el plantel para siempre** — se pide una vez en la vida, no
cada fecha.

También se puede corregir desde la mesa, desde la planilla de entrada y desde
la vista Pista, **pero sólo antes de iniciar el partido**. Una vez que arranca,
el campo queda congelado para ese encuentro.

> Esa regla es mejor que prohibir la edición en la mesa, que era la propuesta
> original de este documento. El riesgo real no era "que lo escriba la mesa",
> era "que lo escriba con el reloj corriendo". El corte en el pitazo inicial
> ataca el riesgo exacto y deja abierto el momento en que sí hay tiempo.

#### En la animación de gol

- **La camiseta sigue mostrando el dorsal**, sin cambios.
- El apodo es una **capa propia del lanzador** (`nickname`), con su posición,
  tamaño y visibilidad, igual que las otras cinco.
- **Se apaga sola si la persona no tiene apodo.** Sin apodo, la animación es
  exactamente la de hoy: nadie ve un hueco ni un rótulo vacío.

---

## 2. LOS DOS CSV

Hoy un solo archivo mezcla dos cosas con vidas distintas, y esa mezcla es la
razón de que el dorsal termine actuando de llave.

### 2.1 Plantel — las personas del club
Cambia poco: altas, bajas, cambios de dorsal.

```
# ardi:plantel v1
# club: Internacional Lo Espejo
# clubId: 7c1f...  (lo escribe ARDI; no editar a mano)
id,nombre,apodo,dorsal,rol,portero,doc
ILE-0001,Keily Lorca,Keily,19,jugador,si,
ILE-0007,Pascale Celis,Pascu,7,jugador,no,
,Nueva Jugadora,,23,jugador,no,
```

- **Los metadatos van en líneas `#`, no como filas de datos.** Esto es lo que
  arregla el bug de ida y vuelta: hoy el exportador escribe tres filas de
  encabezado y el importador toma la primera como nombres de columna.
- `id` vacío = persona nueva; ARDI le asigna el siguiente serial.
- El staff (DT, AY1, AX1…) va en este archivo, con `rol` propio y `dorsal`
  vacío. Hoy se exporta y **no se puede reimportar**, porque el filtro
  `isNaN(parseInt(dorsal))` lo descarta.

### 2.2 Citación — quiénes juegan hoy
Cambia cada fecha. Es lo que arma el partido.

Se puede armar de dos maneras, y **elegir del plantel en pantalla es la vía por
defecto**: es lo que ocurre el 90% de los sábados, cuando no hay archivo que
importar. Importar un archivo de citación es la otra vía, para cuando la liga
o el club lo manda preparado.

```
# ardi:citacion v1
# serie: sub15f   fecha: 2026-09-12
id,dorsal,rol
ILE-0001,19,portero
ILE-0007,7,capitan
```

- `id` referencia al plantel. Si no existe, entra a reconciliación.
- `dorsal` es **el de hoy**: puede diferir del habitual sin tocar el plantel.

---

## 3. REGLAS DE IMPORTACIÓN

En orden. La primera que aplica, gana:

1. **Trae `id` y lo conozco** → es esa persona. Se actualizan sus datos.
2. **Trae `id` y no lo conozco** → persona nueva, **conservando ese id**. Viene
   de otro despliegue o de un respaldo; pisarlo rompería su historial.
3. **Sin `id`** → busco por nombre normalizado dentro del club.
4. **Ambiguo o sin coincidencia** → **pantalla de reconciliación**.

### 3.1 La reconciliación es obligatoria, no un aviso
Si algo no calza, el archivo **no se acepta** hasta resolverlo:

> No reconozco a 3 personas de este archivo.
> · "Genesis Cardenas" → ¿es `ILE-0002 Génesis Cárdenas`? [sí] [es nueva]
> · "Sofia M." → ¿`ILE-0011 Sofia Matus`? [sí] [es nueva]

El modo de falla que más ha costado en este proyecto es el error que entra
callado. Un choque de identidad que se nota recién cuando una tarjeta se le
acumula a la persona equivocada es exactamente eso.

### 3.2 Normalización de nombres
`NFD` + quitar diacríticos + minúsculas + colapsar separadores. Verificado:

| entrada | resultado |
|---|---|
| `Genesis Cardenas` | `genesis cardenas` |
| `Génesis Cárdenas` | `genesis cardenas` |
| `  GENESIS   CARDENAS ` | `genesis cardenas` |

### 3.3 Cabeceras tolerantes
El normalizador de hoy borra todo lo que no sea `a-z0-9`, así que **`Número` se
convierte en `nmero` y no se reconoce**: sólo funciona `Numero` sin tilde.
`N°`, `Dorsal` y `Camiseta` tampoco. Y cuando no reconoce, no avisa — se cae a
la primera columna en silencio. Un archivo de una liga real entra mal sin que
nadie se entere.

Se corrige con la misma normalización de 3.2 más sinónimos:

- **dorsal**: `numero`, `número`, `n°`, `nº`, `num`, `dorsal`, `camiseta`
- **nombre**: `nombre`, `jugador`, `jugadora`, `nombre completo`
- **apodo**: `apodo`, `alias`, `sobrenombre`, `nick`
- **rol**: `rol`, `role`, `cargo`
- **doc**: `doc`, `documento`, `rut`, `dni`, `id nacional`

Si aun así no aparece una columna obligatoria, **se dice en pantalla** con las
cabeceras que sí se encontraron. Nunca se adivina en silencio.

---

## 4. REPARTO ENTRE RONDAS

### R4 — el modelo y el almacén (no toca la UI de pre-partido)
1. `clubId`, `personId` con prefijo desde `CLUB_BRAND`, emisor de seriales.
2. Un almacén del club (reemplaza `CLUB_PLAYERS` compilado en git,
   `hockey-teams` y `hockey-saved-rosters`).
3. Lector/escritor de los dos CSV, con las reglas de §3 y **tests del viaje de
   ida y vuelta**: exportar → importar → tiene que dar exactamente lo mismo.
   Hoy da 3 de 4 personas, 0 nombres y todos los roles perdidos.
4. Paquete de club: exportar/importar el club entero. Es lo que permite montar
   un despliegue en otro país sin tocar código.
5. Las claves viejas **no se borran**. Se dejan de leer. Cuesta cero y deja
   salida si algo no cuadra el sábado.

### R5 — la puerta
6. Express como pantalla principal; el asistente oficial a un clic (degradado,
   no destruido — mismo argumento con el que se salvó el panel CONTROL).
7. Importar CSV desde la puerta, con la pantalla de reconciliación.
8. `rut` → `doc` genérico y opcional, fuera del export normal.
9. Un solo selector de serie (hoy hay tres, y el de "Cargar serie…" carga
   Internacional aunque la ficha sea la visita).

---

## 5. LO QUE ESTA ESPECIFICACIÓN DA POR CERRADO

- El documento no es identidad. En ningún país.
- El dorsal no es identidad. Se muestra en pantalla; no se guarda como llave.
- La visita no tiene identidad permanente.
- Un id nunca se reasigna.
- Ningún error de identidad entra sin que el operador lo vea.
- El acta lleva el nombre legal; la pantalla, el apodo. Nunca al revés.
- El apodo se congela al iniciar el partido.
- La citación se arma eligiendo del plantel; importar archivo es la alternativa.
