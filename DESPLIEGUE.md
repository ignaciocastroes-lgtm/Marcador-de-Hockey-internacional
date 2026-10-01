# GUÍA DE DESPLIEGUE — ARDI Hockey Patín 3.5

Para publicar la versión consolidada en GitHub y Vercel, y para crear un despliegue
por club.

---

## RESUMEN EN UNA LÍNEA

**No hay variables de entorno que configurar.** El proyecto no lee ninguna. Se sube
a GitHub, se importa en Vercel y se despliega con la configuración por defecto.

---

## 1. REQUISITOS

- **Node.js 20 o superior** en tu máquina. El proyecto usa Next.js 16 y React 19;
  Vercel ya trae una versión compatible por defecto.
- Una cuenta de GitHub y una de Vercel.
- No hace falta base de datos, ni servidor, ni servicio externo.

---

## 2. ANTES DE SUBIR — dos cambios recomendados

### 2.1 Quitar el silenciador de errores *(recomendado)*

En `next.config.mjs`:

```js
typescript: {
  ignoreBuildErrors: true,   // ← BORRAR ESTA LÍNEA Y EL BLOQUE
},
```

Esa línea existía porque el proyecto tenía dos errores de TypeScript. **Ya no los
tiene**: `npx tsc --noEmit` sale limpio. Quitándola, el build vuelve a protegerte y
un error real detiene el despliegue en vez de llegar a la cancha.

El bloque `images: { unoptimized: true }` **sí se queda**: es lo que permite usar
escudos desde URLs externas como ImgBB sin configurar dominios.

### 2.2 Verificar antes de subir

```bash
npm install
npx tsc --noEmit     # debe salir sin nada
npm run build        # debe compilar / y /scoreboard
```

Si el build falla por las tipografías, revisa que estén instaladas
`@fontsource/orbitron` y `@fontsource/share-tech-mono`. Ya no se descargan de
Google: vienen de npm y se autohospedan.

---

## 3. SUBIR A GITHUB

```bash
cd ARDI-Hockey-3.5-Internacional-Lo-Espejo

git init
git add .
git commit -m "ARDI Hockey Patín 3.5 - Pista Viva"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

Comprueba que `.gitignore` incluya `node_modules`, `.next` y `tsconfig.tsbuildinfo`.
Si subes `node_modules` el repositorio pesa cientos de megas sin necesidad.

**Sobre el nombre del repositorio:** la URL por defecto de Vercel se construye con
él. El despliegue actual, `ardis-marcador-de-hockey-pro`, es adivinable justamente
por eso. Para un despliegue de club conviene un nombre menos evidente.

---

## 4. DESPLEGAR EN VERCEL

1. En Vercel, **Add New → Project** e importa el repositorio.
2. Vercel detecta Next.js solo. **No cambies nada**: framework Next.js, build
   `next build`, directorio de salida por defecto.
3. **Environment Variables: dejar vacío.** El proyecto no usa ninguna.
4. **Deploy.**

Tarda un par de minutos. Al terminar tienes la URL en HTTPS, que es requisito para
dos funciones: el service worker que permite abrir sin internet, y el permiso de
gestión de ventanas del botón LANZAR TODO.

---

## 5. DESPLIEGUE POR CLUB

El modelo de una URL por club se resuelve en **un solo archivo**: `lib/club-brand.ts`.

```ts
export const CLUB_BRAND: ClubBrand = {
  name: 'INTERNACIONAL LO ESPEJO',
  shortName: 'INTERNACIONAL',
  logoUrl: 'https://i.ibb.co/0jx754rd/Internacional-Lo-Espejo-N.webp',
  appTitle: 'ARDI Marcador Hockey Patín PRO',
  isDefaultHome: true
}
```

Procedimiento por cliente:

1. Clonar el repositorio a uno nuevo con el nombre del club.
2. Editar **sólo** ese archivo.
3. Desplegar en Vercel con un nombre de proyecto propio.
4. Opcional: dominio a medida, por ejemplo `marcador-nombreclub.vercel.app`.

**Recomendación sobre el escudo del club dueño:** ponlo en `public/escudos/` y
apunta a `/escudos/mi-club.webp` en vez de a una URL externa. Así viaja dentro del
despliegue, lo cachea el service worker y funciona sin internet aunque ImgBB no
responda. Los escudos rivales, que cambian cada fecha, sí conviene cargarlos por
URL externa desde el panel.

Para dejar de ser genérico: si `isDefaultHome` es `false`, el sistema se comporta
como antes y no precarga nada.

---

## 6. RESTRINGIR EL ACCESO

Si no quieres que la URL sea pública, Vercel ofrece **protección por contraseña**
del despliegue (en Settings → Deployment Protection; está en los planes de pago).
Se pide una vez por navegador y después la aplicación funciona igual, incluso sin
internet gracias al service worker.

Con un despliegue por club, además, cortar el acceso a uno es borrar ese proyecto
sin afectar a los demás.

---

## 7. EL SERVICE WORKER — lo que hay que saber en cada redespliegue

`public/sw.js` se sirve en la raíz del dominio y es lo que permite que la
aplicación **abra** sin internet después de la primera visita con conexión.

**Al publicar una versión nueva**, sube el número de caché en la primera línea:

```js
const CACHE = 'ardi-v1'   // → 'ardi-v2' en la próxima versión
```

Si no lo subes, los navegadores que ya visitaron el sitio pueden conservar archivos
viejos en caché junto a los nuevos. Cambiar el nombre fuerza la limpieza: el propio
service worker borra las cachés que no coinciden al activarse.

**Cómo verificar que quedó bien**, una sola vez tras publicar:

1. Abre la URL con internet y espera a que cargue.
2. En la barra superior de la mesa de control debe aparecer el punto verde
   **"Offline listo"**.
3. Desconecta la red y **recarga**. Debe abrir igual, y el indicador pasa a
   "Sin red · OK".

Si abre, quedó bien. Esa comprobación es la que garantiza que si Chrome se cierra a
mitad del segundo tiempo puedas reabrirlo sin depender del wifi del pabellón.

---

## 8. PUESTA EN MARCHA EN EL PABELLÓN

1. Abre la URL **una vez con internet** en el PC de la mesa. Eso deja la aplicación
   cacheada. De ahí en adelante no necesita red.
2. Conecta las pantallas por HDMI.
3. En la barra superior, **LANZAR TODO** reparte los tableros por los monitores.
   La primera vez Chrome pide permiso de gestión de ventanas: acéptalo. Si lo
   rechazas, los tableros se abren en ventanas normales y hay que arrastrarlas.
4. Empareja el teclado Bluetooth y revisa los atajos en el cajón de ajustes del
   modo Pista.
5. El bloqueo de suspensión de pantalla se activa solo: los televisores no se
   apagan durante el partido.

**Navegador:** Chrome o Edge. El reparto por monitores y el bloqueo de suspensión
son funciones de esos navegadores; en otros la aplicación funciona pero esas dos
no.

---

## 9. DATOS Y RESPALDO

Todo vive en el `localStorage` del navegador del operador: partido en curso,
historial, equipos guardados, diseño de tableros y atajos.

Consecuencias que conviene tener presentes:

- **Los datos son de ese equipo y ese navegador.** No viajan entre computadores.
- **Borrar los datos de navegación borra el historial de partidos.** Antes de
  limpiar el navegador, exporta el historial desde el botón HISTORIAL.
- El historial guarda los 60 partidos más recientes.
- Un redespliegue **no** borra nada: el almacenamiento va por dominio, no por
  versión. Sólo cambiar de dominio empieza de cero.

---

## 10. SI ALGO FALLA

**El build falla en Vercel y localmente no.** Casi siempre es un archivo que no
subiste, o mayúsculas: Windows no distingue entre `Boton.tsx` y `boton.tsx`, Linux
sí, y Vercel construye en Linux.

**La aplicación no abre sin internet.** No completó la primera visita con conexión,
o estás en HTTP en vez de HTTPS. El service worker exige HTTPS.

**LANZAR TODO abre ventanas sueltas.** Falta el permiso de gestión de ventanas, o
hay un solo monitor. El sistema lo avisa en pantalla.

**Los escudos no cargan sin red.** Si vienen de una URL externa, el service worker
los guarda recién después de haberlos mostrado una vez con conexión. Para el escudo
del club dueño, usa `public/escudos/`.
