// ─────────────────────────────────────────────────────────────────────────────
// LANZADORES — las pantallas que pasan POR SOBRE la proyección.
// Tres: la animación de gol, el fin de partido y el resumen estadístico.
// Config global (los cinco tableros son del mismo club) con selección de en
// qué tableros aparece cada uno.
// ─────────────────────────────────────────────────────────────────────────────

export const OVERLAYS_STORAGE_KEY = 'ardi-overlays'
export const OVERLAYS_EVENT = 'ardi-overlays-updated'

export interface GoalOverlayConfig {
  enabled: boolean
  boards: number[]          // en qué tableros aparece
  duration: number          // segundos
  text: string              // "¡GOL!"
  showPlayerNumber: boolean
  showScore: boolean
  showWatermark: boolean    // escudo difuminado de fondo
  textColor: string
  scoreColor: string
  useTeamColor: boolean     // el resplandor toma el color de camiseta del equipo
  // Camiseta: vivía duplicado en ardi-live-logos, editable desde dos modales
  // distintos que escribían en llaves distintas. Aquí es la única fuente.
  jerseyDesign: 'solid' | 'striped' | 'halved'
  homeJ1: string; homeJ2: string
  awayJ1: string; awayJ2: string
}

/** Tamaño y posición vertical, comunes a los tres lanzadores. */
export interface LayoutConfig {
  scale: number             // 0.6 – 1.4
  align: 'top' | 'center' | 'bottom'
}

export interface FinalOverlayConfig {
  enabled: boolean
  boards: number[]
  winnerSeconds: number     // cuánto manda el letrero de ganador antes de la ficha
  showFicha: boolean        // después del letrero, la ficha completa
  winnerText: string
  drawText: string
}

export interface StatsOverlayConfig {
  enabled: boolean
  boards: number[]
  breakDelay: number        // segundos tras iniciar el descanso
  showInBreak: boolean
  showScorers: boolean
  showGoalMinutes: boolean
  showCards: boolean
  showFouls: boolean
  showPossession: boolean
  showByPeriod: boolean
}

export interface OverlaysConfig {
  goal: GoalOverlayConfig & LayoutConfig
  final: FinalOverlayConfig & LayoutConfig
  stats: StatsOverlayConfig & LayoutConfig
}

export const DEFAULT_LAYOUT: LayoutConfig = { scale: 1, align: 'center' }

export const DEFAULT_OVERLAYS: OverlaysConfig = {
  goal: {
    enabled: true, boards: [1], duration: 5, text: '¡GOL!',
    showPlayerNumber: true, showScore: true, showWatermark: true,
    textColor: '#ffffff', scoreColor: '#facc15', useTeamColor: true,
    jerseyDesign: 'solid',
    homeJ1: '#ef4444', homeJ2: '#ffffff', awayJ1: '#f59e0b', awayJ2: '#000000',
    scale: 1, align: 'center'
  },
  final: {
    enabled: true, boards: [1], winnerSeconds: 10, showFicha: true,
    winnerText: '¡GANADOR!', drawText: 'EMPATE',
    scale: 1, align: 'center'
  },
  stats: {
    enabled: true, boards: [1], breakDelay: 5, showInBreak: true,
    showScorers: true, showGoalMinutes: true, showCards: true,
    showFouls: true, showPossession: true, showByPeriod: true,
    scale: 1, align: 'center'
  }
}

/**
 * Trae la configuración de camiseta que vivía en ardi-live-logos. Se hace una
 * sola vez, la primera que se carga sin config de lanzadores: así nadie pierde
 * los colores que ya había elegido cuando el editor estaba duplicado.
 */
function migrateFromLiveLogos(): Partial<GoalOverlayConfig> {
  try {
    const raw = localStorage.getItem('ardi-live-logos')
    if (!raw) return {}
    const l = JSON.parse(raw)
    const out: Partial<GoalOverlayConfig> = {}
    if (l.jerseyDesign) out.jerseyDesign = l.jerseyDesign
    if (l.goalDuration) out.duration = parseInt(l.goalDuration) || 5
    if (l.homeJ1) out.homeJ1 = l.homeJ1
    if (l.homeJ2) out.homeJ2 = l.homeJ2
    if (l.awayJ1) out.awayJ1 = l.awayJ1
    if (l.awayJ2) out.awayJ2 = l.awayJ2
    return out
  } catch { return {} }
}

export function loadOverlays(): OverlaysConfig {
  if (typeof window === 'undefined') return DEFAULT_OVERLAYS
  try {
    const raw = localStorage.getItem(OVERLAYS_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_OVERLAYS, goal: { ...DEFAULT_OVERLAYS.goal, ...migrateFromLiveLogos() } }
    }
    const p = JSON.parse(raw)
    return {
      goal:  { ...DEFAULT_OVERLAYS.goal,  ...(p.goal  || {}) },
      final: { ...DEFAULT_OVERLAYS.final, ...(p.final || {}) },
      stats: { ...DEFAULT_OVERLAYS.stats, ...(p.stats || {}) }
    }
  } catch { return DEFAULT_OVERLAYS }
}

/** Guarda y avisa a las ventanas de tablero abiertas, igual que ardi-live-logos. */
export function saveOverlays(cfg: OverlaysConfig): void {
  try {
    localStorage.setItem(OVERLAYS_STORAGE_KEY, JSON.stringify(cfg))
    window.dispatchEvent(new Event(OVERLAYS_EVENT))
  } catch { /* ignorar */ }
}

export const showsOn = (boards: number[], bId: number) => boards.includes(bId)
