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
export type LauncherId = 'goal' | 'final' | 'stats' | 'figura'
export type LayoutMap = Record<string, ElementPos>

/** Posiciones de fabrica. Son la referencia contra la que se sanea lo guardado. */
/** Posiciones de fábrica, tomadas del montaje del club. */
export const DEFAULT_LAYOUT: Record<LauncherId, LayoutMap> = {
  goal: {
    watermark: {
      x: 960,
      y: 540,
      s: 0.3,
      v: true
    },
    text: {
      x: 1420,
      y: 234,
      s: 1,
      v: true
    },
    jersey: {
      x: 1224,
      y: 607,
      s: 1.1,
      v: true
    },
    shield: {
      x: 373,
      y: 437,
      s: 1.6,
      v: true
    },
    score: {
      x: 918,
      y: 950,
      s: 1,
      v: true
    },
    marca: {
      x: 1700,
      y: 140,
      s: 1,
      v: true
    }
  },
  final: {
    header: {
      x: 1153,
      y: -59,
      s: 1.9,
      v: true
    },
    teams: {
      x: 82,
      y: 499,
      s: 1.5,
      v: true
    },
    periods: {
      x: 1354,
      y: 171,
      s: 2.6,
      v: true
    },
    scorersHome: {
      x: 929,
      y: 672,
      s: 3,
      v: true
    },
    scorersAway: {
      x: 1893,
      y: 723,
      s: 2.2,
      v: true
    },
    marca: {
      x: 1700,
      y: 140,
      s: 1.2,
      v: false
    }
  },
  stats: {
    header: {
      x: 954,
      y: 133,
      s: 1.6,
      v: true
    },
    score: {
      x: 989,
      y: 529,
      s: 1.3,
      v: true
    },
    compare: {
      x: 915,
      y: 984,
      s: 1.5,
      v: true
    },
    scorersHome: {
      x: 359,
      y: 601,
      s: 1.4,
      v: true
    },
    scorersAway: {
      x: 1589,
      y: 576,
      s: 1.4,
      v: true
    },
    marca: {
      x: 1700,
      y: 120,
      s: 1,
      v: true
    }
  },
  figura: {
    titulo: {
      x: 960,
      y: 150,
      s: 1,
      v: true
    },
    escudo: {
      x: 474,
      y: 518,
      s: 2.5,
      v: true
    },
    dorsal: {
      x: 1365,
      y: 522,
      s: 1.9,
      v: true
    },
    motivo: {
      x: 967,
      y: 955,
      s: 3,
      v: true
    },
    marca: {
      x: 1700,
      y: 140,
      s: 1,
      v: true
    }
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
