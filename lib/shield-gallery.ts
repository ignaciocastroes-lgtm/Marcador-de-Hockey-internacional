// ─────────────────────────────────────────────────────────────────────────────
// GALERÍA DE ESCUDOS
//
// Los escudos se siguen cargando por enlace directo, como hasta ahora: se pega
// una URL y listo. Lo que cambia es que ya no se pierden.
//
// Cada escudo que carga bien queda guardado acá, y el sábado siguiente está a
// un toque en vez de haber que buscar el enlace de nuevo. Es importante que la
// galería NO sea un catálogo: nace vacía y se llena sola con los equipos que
// este club enfrenta de verdad. Un club de otro país no ve escudos ajenos que
// no le sirven — ve los suyos, los que él mismo fue usando.
//
// Se guarda sólo la URL (texto), no la imagen. Por eso entra de sobra en
// localStorage y viaja liviano al exportar la configuración del club.
// ─────────────────────────────────────────────────────────────────────────────

export const SHIELD_GALLERY_KEY = 'ardi-shield-gallery'
export const SHIELD_GALLERY_EVENT = 'ardi-shield-gallery-updated'

/** Tope de escudos recordados. Al pasarse, se cae el más antiguo sin usar. */
const MAX_SHIELDS = 40

export interface GalleryShield {
  /** URL del escudo. Es la identidad: no se guardan duplicados. */
  url: string
  /** Rótulo opcional que el operador puede escribir (el nombre del club). */
  label?: string
  /** Última vez que se usó, para ordenar por lo más reciente. */
  usedAt: number
}

const isUsableUrl = (u: string): boolean =>
  !!u && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/'))

export function loadGallery(): GalleryShield[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SHIELD_GALLERY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s): s is GalleryShield => !!s && typeof s.url === 'string' && isUsableUrl(s.url))
      .sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0))
  } catch {
    return []
  }
}

function persist(list: GalleryShield[]) {
  try {
    localStorage.setItem(SHIELD_GALLERY_KEY, JSON.stringify(list.slice(0, MAX_SHIELDS)))
    window.dispatchEvent(new Event(SHIELD_GALLERY_EVENT))
  } catch {
    /* cuota llena: la galería es comodidad, nunca puede voltear un partido */
  }
}

/**
 * Recuerda un escudo que acaba de cargar bien. Si ya estaba, sólo actualiza
 * cuándo se usó (así sube al principio) y conserva el rótulo que tuviera.
 *
 * Los escudos ARDI genéricos no se guardan: ya están siempre disponibles como
 * botón fijo, y ocuparían lugar repitiendo lo que no hace falta recordar.
 */
/** Tiempo tras el cual vale la pena volver a anotar que se uso un escudo. */
const REFRESCO_MS = 60_000

export function rememberShield(url: string, label?: string): void {
  if (typeof window === 'undefined' || !isUsableUrl(url)) return
  if (url.startsWith('/escudos/ardi-')) return

  const list = loadGallery()
  const found = list.find(s => s.url === url)

  /**
   * EL BUCLE QUE COLGABA LA APP AL PEGAR UN ESCUDO.
   *
   * Esto se llama desde el `onLoad` de la previsualizacion. Antes escribia
   * SIEMPRE, con `usedAt: Date.now()`, y `persist` emite un evento que hace
   * releer la galeria -> nuevo estado -> se vuelve a pintar -> la imagen
   * dispara `onLoad` otra vez -> vuelta a empezar. Como `Date.now()` cambia en
   * cada vuelta, el estado NUNCA se estabilizaba: la aplicacion quedaba
   * girando y solo salia con F5, sin dejar pegar la segunda direccion.
   *
   * Ahora, si el escudo ya esta y se uso hace menos de un minuto, no se
   * escribe ni se avisa a nadie. La vuelta se corta en la primera.
   */
  if (found && !label && Date.now() - (found.usedAt || 0) < REFRESCO_MS) return
  if (found && label && found.label === label &&
      Date.now() - (found.usedAt || 0) < REFRESCO_MS) return

  const next: GalleryShield[] = found
    ? list.map(s => s.url === url ? { ...s, usedAt: Date.now(), label: label ?? s.label } : s)
    : [{ url, label, usedAt: Date.now() }, ...list]

  persist(next.sort((a, b) => b.usedAt - a.usedAt))
}

/** Renombra un escudo guardado (el nombre del club, para reconocerlo). */
export function labelShield(url: string, label: string): void {
  persist(loadGallery().map(s => s.url === url ? { ...s, label } : s))
}

/** Saca un escudo de la galería. No toca el que esté puesto en el tablero. */
export function forgetShield(url: string): void {
  persist(loadGallery().filter(s => s.url !== url))
}
