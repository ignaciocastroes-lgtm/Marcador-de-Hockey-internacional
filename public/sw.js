// ARDI — Service Worker
// Objetivo: que el marcador ABRA sin internet, no solo que funcione una vez abierto.
// Tras la primera visita con conexión, el pabellón puede quedarse sin señal y el
// operador igual puede recargar o abrir una ventana de tablero nueva.

// El nombre del caché ES el número de versión del despliegue. Al cambiarlo, el
// handler de 'activate' de abajo borra todos los cachés que no coincidan, así
// que subirlo en cada release es lo que obliga a los navegadores de los clubes
// a soltar la versión vieja. Quedó en 'ardi-v1' durante toda la 3.x: un club
// que abrió la app hace meses podía seguir corriendo aquel código, con los
// bugs ya arreglados, sin manera de enterarse.
//
// SUBIR ESTE NÚMERO EN CADA DESPLIEGUE. Es la única línea que hay que tocar.
const CACHE = 'ardi-v342'
const CORE = ['/', '/scoreboard']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).catch(() => undefined))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Escudos alojados fuera (ImgBB y similares): caché primero. Sin esto, una
  // ventana de tablero abierta sin red se queda sin escudo.
  if (url.origin !== self.location.origin) {
    if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname)) {
      event.respondWith(
        caches.match(req).then(hit => hit || fetch(req).then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => undefined)
          return res
        }).catch(() => hit || Response.error()))
      )
    }
    return
  }

  // Navegación (abrir o recargar /, /scoreboard): red primero para tomar
  // actualizaciones, caché como red de seguridad si no hay señal.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => undefined)
          return res
        })
        .catch(async () => {
          const hit = await caches.match(req)
          if (hit) return hit
          const root = await caches.match('/')
          return root || Response.error()
        })
    )
    return
  }

  // Estáticos con hash en el nombre: caché primero, se revalida en segundo plano.
  event.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => undefined)
          }
          return res
        })
        .catch(() => hit || Response.error())
      return hit || net
    })
  )
})
