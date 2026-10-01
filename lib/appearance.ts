// ─────────────────────────────────────────────────────────────────────────────
// APARIENCIA DE LA PISTA
// Estilo de ficha y equipaciones. Dos kits por equipo, como en la cancha:
// titular y alternativo, para cuando los colores chocan con el rival.
// ─────────────────────────────────────────────────────────────────────────────

export const APPEARANCE_KEY = 'ardi-appearance'
export const APPEARANCE_EVENT = 'ardi-appearance-updated'

export type TokenStyle = 'cubo' | 'funco' | 'jugador'

export interface Kit {
  name: string
  shirt: string   // polera
  pants: string   // pantalón
  badge: string   // insignia / logo
}

export interface TeamKits { primary: Kit; alternate: Kit; active: 'primary' | 'alternate' }

export interface Appearance {
  tokenStyle: TokenStyle
  home: TeamKits
  away: TeamKits
}

/** Equipación del club dueño del despliegue. Internacional Lo Espejo. */
export const INTERNACIONAL_KITS: TeamKits = {
  primary:   { name: 'Titular',     shirt: '#dc2626', pants: '#1e3a8a', badge: '#dc2626' },
  alternate: { name: 'Alternativa', shirt: '#1e3a8a', pants: '#1e3a8a', badge: '#dc2626' },
  active: 'primary'
}

export const DEFAULT_AWAY_KITS: TeamKits = {
  primary:   { name: 'Titular',     shirt: '#f59e0b', pants: '#000000', badge: '#f59e0b' },
  alternate: { name: 'Alternativa', shirt: '#ffffff', pants: '#000000', badge: '#f59e0b' },
  active: 'primary'
}

export const DEFAULT_APPEARANCE: Appearance = {
  tokenStyle: 'funco',
  home: INTERNACIONAL_KITS,
  away: DEFAULT_AWAY_KITS
}

export const TOKEN_STYLES: Array<{ id: TokenStyle; label: string; hint: string }> = [
  { id: 'cubo',    label: 'Cubo',     hint: 'Ficha cuadrada, la más legible de lejos' },
  { id: 'funco',   label: 'Funco',    hint: 'Silueta de jugador con el número' },
  { id: 'jugador', label: 'Patinador', hint: 'Silueta con casco y patines' }
]

export function loadAppearance(): Appearance {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY)
    if (!raw) return DEFAULT_APPEARANCE
    const p = JSON.parse(raw)
    return {
      tokenStyle: p.tokenStyle || DEFAULT_APPEARANCE.tokenStyle,
      home: { ...DEFAULT_APPEARANCE.home, ...(p.home || {}) },
      away: { ...DEFAULT_APPEARANCE.away, ...(p.away || {}) }
    }
  } catch { return DEFAULT_APPEARANCE }
}

export function saveAppearance(a: Appearance): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a))
    window.dispatchEvent(new Event(APPEARANCE_EVENT))
  } catch { /* ignorar */ }
}

export const activeKit = (t: TeamKits): Kit => t[t.active]
