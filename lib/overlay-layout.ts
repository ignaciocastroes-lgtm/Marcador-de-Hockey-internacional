// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT DE LOS LANZADORES
//
// Mismo mecanismo que ya usan los tableros: cada elemento guarda posicion,
// escala y visibilidad, y al cargar se SANEA contra los valores del codigo.
// Ese saneo es lo que hace que un elemento nuevo aparezca en su sitio en
// instalaciones que ya tenian layout guardado, en vez de no aparecer nunca.
//
// Las coordenadas van sobre el lienzo de 1920x1080, igual que el tablero, para
// que la previsualizacion y la proyeccion usen exactamente los mismos numeros.
// ─────────────────────────────────────────────────────────────────────────────

export const OVERLAY_LAYOUT_KEY = 'ardi-overlay-layout'
export const OVERLAY_LAYOUT_EVENT = 'ardi-overlay-layout-updated'

export const CANVAS_W = 1920
export const CANVAS_H = 1080

export interface ElementPos { x: number; y: number; s: number; v: boolean }
export type LauncherId = 'goal' | 'final' | 'stats'
export type LayoutMap = Record<string, ElementPos>

/** Posiciones de fabrica. Son la referencia contra la que se sanea lo guardado. */
export const DEFAULT_LAYOUT: Record<LauncherId, LayoutMap> = {
  goal: {
    watermark: { x: 960, y: 540, s: 1,    v: true },
    text:      { x: 960, y: 300, s: 1,    v: true },
    jersey:    { x: 760, y: 660, s: 1,    v: true },
    shield:    { x: 1160, y: 660, s: 1,   v: true },
    score:     { x: 960, y: 900, s: 1,    v: true }
  },
  final: {
    header:    { x: 960, y: 140, s: 1, v: true },
    teams:     { x: 960, y: 480, s: 1, v: true },
    periods:   { x: 960, y: 760, s: 1, v: true },
    scorers:   { x: 960, y: 930, s: 1, v: true }
  },
  stats: {
    header:    { x: 960, y: 120, s: 1, v: true },
    score:     { x: 960, y: 320, s: 1, v: true },
    compare:   { x: 960, y: 620, s: 1, v: true },
    scorers:   { x: 960, y: 900, s: 1, v: true }
  }
}

export type AllLayouts = Record<LauncherId, LayoutMap>

/**
 * Toma lo guardado y lo contrasta contra el codigo: campo por campo, se usa el
 * valor guardado si existe y el de fabrica si no. Un elemento agregado despues
 * aparece con su posicion por defecto en vez de desaparecer.
 */
export function sanitize(saved: unknown): AllLayouts {
  const out = {} as AllLayouts
  ;(Object.keys(DEFAULT_LAYOUT) as LauncherId[]).forEach(launcher => {
    const base = DEFAULT_LAYOUT[launcher]
    const guardado = (saved as Partial<AllLayouts> | null)?.[launcher] || {}
    const map: LayoutMap = {}
    Object.keys(base).forEach(k => {
      const g = (guardado as LayoutMap)[k]
      map[k] = {
        x: typeof g?.x === 'number' ? g.x : base[k].x,
        y: typeof g?.y === 'number' ? g.y : base[k].y,
        s: typeof g?.s === 'number' ? g.s : base[k].s,
        v: typeof g?.v === 'boolean' ? g.v : base[k].v
      }
    })
    out[launcher] = map
  })
  return out
}

export function loadLayouts(): AllLayouts {
  if (typeof window === 'undefined') return sanitize(null)
  try { return sanitize(JSON.parse(localStorage.getItem(OVERLAY_LAYOUT_KEY) || 'null')) }
  catch { return sanitize(null) }
}

export function saveLayouts(l: AllLayouts): void {
  try {
    localStorage.setItem(OVERLAY_LAYOUT_KEY, JSON.stringify(l))
    window.dispatchEvent(new Event(OVERLAY_LAYOUT_EVENT))
  } catch { /* ignorar */ }
}

/** Vuelve un lanzador a fabrica sin tocar los otros dos. */
export function resetLauncher(l: AllLayouts, id: LauncherId): AllLayouts {
  return { ...l, [id]: { ...DEFAULT_LAYOUT[id] } }
}
