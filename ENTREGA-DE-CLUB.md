# Cómo se entrega ARDI a un club

Procedimiento interno. El club **no** configura nada: recibe su web lista.

---

## Por qué no hay un botón de importar en la app

Darle a un operador la posibilidad de reemplazar el plantel entero desde un
botón es un riesgo sin contrapartida: un toque equivocado un sábado a las nueve
de la mañana deja al club sin jugadores justo antes del partido.

Y además no hace falta: la entrega la hacemos nosotros.

En la app, "Sé el marcador para tu club" es una **invitación** que enlaza a
ardisport.cl. Lo único que un club puede hacer con sus datos es descargar un
respaldo, que es información suya y no rompe nada.

---

## El procedimiento

### 1. Armar el club
En cualquier instalación de ARDI:

- **Planteles** → cargar las personas (a mano, con la plantilla CSV, o
  importando un archivo que mande la liga).
- **Equipos y series** → definir las categorías de esa liga. Si no son las
  chilenas, se crean acá: no hay nada compilado.
- Asignar el dorsal de cada persona **en cada serie**.

### 2. Exportar el paquete
**Planteles → Sé el marcador para tu club → RESPALDO.**

Descarga `ardi-club-<prefijo>.json` con la identidad del club, sus personas,
sus series y los dorsales.

### 3. Preparar el despliegue

1. Clonar el proyecto.
2. Editar **`lib/club-brand.ts`** — es el único archivo de código que se toca:
   nombre, nombre corto, escudo, título de la barra.
3. Dejar el escudo en **`/public/escudos/`** y apuntarlo desde `logoUrl`.
   Con el archivo local, el marcador abre sin internet.
4. Dejar el paquete del paso 2 como **`/public/club.json`**.
5. Subir el número de caché del service worker en `public/sw.js`.
6. Desplegar en su dominio.

### 4. La primera apertura
La app detecta `/club.json`, siembra el club y recarga. **Ocurre una sola vez**:
en cuanto hay club guardado, el archivo no se vuelve a mirar, así que las altas
que haga el club nunca se pisan con un redespliegue.

Si el archivo no existe, la app arranca vacía y funciona igual.

---

## Lo que NO hay que hacer

- **No editar `lib/club-seed.ts`.** Es la semilla de Internacional y sólo se
  usa cuando `CLUB_BRAND.isDefaultHome` es `true`. Para otro club se deja
  `isDefaultHome: false` y manda `/club.json`.
- **No compilar planteles en el código.** Ese era el modelo viejo
  (`lib/club-roster.ts`) y es lo que obligaba a recompilar por cada cliente.

---

## Por qué los identificadores importan

Cada persona tiene un id estable (`ILE-0007`) que **nunca se reasigna**, y el
club un `clubId` único. Un paquete llevado a otra máquina sigue siendo el mismo
club: las tarjetas y los goles siguen siendo de quien son.

Es lo que permitirá, el día que exista el módulo de ligas, enlazar la base de
la federación con los jugadores ya cargados sin rehacer nada.
