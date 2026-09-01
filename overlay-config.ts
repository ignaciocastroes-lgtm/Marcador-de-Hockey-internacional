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
  goal: GoalOverlayConfig
  final: FinalOverlayConfig
  stats: StatsOverlayConfig
}

export const DEFAULT_OVERLAYS: OverlaysConfig = {
  goal: {
    enabled: true, boards: [1], duration: 5, text: '¡GOL!',
    showPlayerNumber: true, showScore: true, showWatermark: true,
    textColor: '#ffffff', scoreColor: '#facc15', useTeamColor: true
  },
  final: {
    enabled: true, boards: [1], winnerSeconds: 10, showFicha: true,
    winnerText: '¡GANADOR!', drawText: 'EMPATE'
  },
  stats: {
    enabled: true, boards: [1], breakDelay: 5, showInBreak: true,
    showScorers: true, showGoalMinutes: true, showCards: true,
    showFouls: true, showPossession: true, showByPeriod: true
  }
}

export function loadOverlays(): OverlaysConfig {
  if (typeof window === 'undefined') return DEFAULT_OVERLAYS
  try {
    const raw = localStorage.getItem(OVERLAYS_STORAGE_KEY)
    if (!raw) return DEFAULT_OVERLAYS
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
