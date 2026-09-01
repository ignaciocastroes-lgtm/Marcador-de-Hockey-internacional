// ─────────────────────────────────────────────────────────────────────────────
// RESUMEN DE PARTIDO — funciones puras sobre el matchLog.
// Cero datos nuevos: es otra lectura del mismo estado.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState, MatchEvent, Period } from '@/hooks/use-game-state'

export interface GoalLine { minute: string; number: string; team: 'home' | 'away' }
export interface CardLine { number: string; type: 'yellow' | 'blue' | 'red'; isBench: boolean }
export interface ScorerLine { number: string; goals: number }

export interface TeamSummary {
  score: number
  fouls: number
  goals: GoalLine[]
  scorers: ScorerLine[]
  cards: CardLine[]
  possession: number      // segundos acumulados
  possessionPct: number   // 0-100
}

export interface MatchSummary {
  home: TeamSummary
  away: TeamSummary
  byPeriod: Array<{ label: string; home: number; away: number }>
  hasPenalties: boolean
  homePenalties: number
  awayPenalties: number
}

const PERIOD_LABEL: Record<Period, string> = {
  '1er_tiempo': '1T', '2do_tiempo': '2T', 'alargue': 'ET', 'penales': 'PEN'
}

/** El reloj cuenta hacia atrás: el minuto jugado es la duración menos lo que resta. */
export function playedMinute(state: GameState, gameTime: number): string {
  const total = state.initialClockTime || 0
  const jugado = Math.max(0, total - gameTime)
  const m = Math.floor(jugado / 60)
  const s = jugado % 60
  return `${m}'${s.toString().padStart(2, '0')}`
}

export function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function teamSummary(
  state: GameState, team: 'home' | 'away', periods: Period[]
): TeamSummary {
  const log: MatchEvent[] = state.matchLog || []

  const goals: GoalLine[] = log
    .filter(e => e.eventType === 'gol' && e.team === team && periods.includes(e.period))
    .map(e => ({ minute: playedMinute(state, e.gameTime), number: e.actor || '—', team }))

  const tally = new Map<string, number>()
  goals.forEach(g => tally.set(g.number, (tally.get(g.number) || 0) + 1))
  const scorers: ScorerLine[] = Array.from(tally.entries())
    .map(([number, gls]) => ({ number, goals: gls }))
    .sort((a, b) => b.goals - a.goals || a.number.localeCompare(b.number))

  const cards: CardLine[] = (state.cardHistory || [])
    .filter(c => c.team === team && periods.includes(c.period))
    .map(c => ({ number: c.playerNumber, type: c.cardType, isBench: c.isBench }))

  const own = team === 'home' ? (state.homePossessionTime || 0) : (state.awayPossessionTime || 0)
  const other = team === 'home' ? (state.awayPossessionTime || 0) : (state.homePossessionTime || 0)
  const total = own + other

  return {
    score: team === 'home' ? state.homeScore : state.awayScore,
    fouls: team === 'home' ? state.homeFouls : state.awayFouls,
    goals,
    scorers,
    cards,
    possession: own,
    possessionPct: total > 0 ? Math.round((own / total) * 100) : 50
  }
}

/**
 * @param scope 'primer_tiempo' para el resumen del descanso, 'completo' para el final.
 */
export function buildSummary(state: GameState, scope: 'primer_tiempo' | 'completo'): MatchSummary {
  const periods: Period[] = scope === 'primer_tiempo'
    ? ['1er_tiempo']
    : ['1er_tiempo', '2do_tiempo', 'alargue', 'penales']

  const goalsIn = (p: Period, team: 'home' | 'away') =>
    (state.matchLog || []).filter(e => e.eventType === 'gol' && e.team === team && e.period === p).length

  const byPeriod = (scope === 'primer_tiempo' ? (['1er_tiempo'] as Period[]) : (['1er_tiempo', '2do_tiempo', 'alargue'] as Period[]))
    .filter(p => p === '1er_tiempo' || p === '2do_tiempo' || goalsIn(p, 'home') + goalsIn(p, 'away') > 0)
    .map(p => ({ label: PERIOD_LABEL[p], home: goalsIn(p, 'home'), away: goalsIn(p, 'away') }))

  return {
    home: teamSummary(state, 'home', periods),
    away: teamSummary(state, 'away', periods),
    byPeriod,
    hasPenalties: (state.homePenalties || 0) > 0 || (state.awayPenalties || 0) > 0,
    homePenalties: state.homePenalties || 0,
    awayPenalties: state.awayPenalties || 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TANDA DE PENALES
// El arbitro guia el orden: el sistema no fuerza alternancia ni bloquea
// repeticiones. Solo registra y calcula. Los expulsados no lanzan.
// ─────────────────────────────────────────────────────────────────────────────

export const SHOOTOUT_ROUNDS = 5

export interface Shot { number: string; scored: boolean; order: number }

export interface ShootoutState {
  home: Shot[]
  away: Shot[]
  homeGoals: number
  awayGoals: number
  /** Ronda en curso, contando desde 1. */
  round: number
  /** true una vez que ambos completaron las 5 series reglamentarias. */
  suddenDeath: boolean
  /** El resultado ya no puede cambiar: se puede finalizar. */
  decided: boolean
  leader: 'home' | 'away' | null
  message: string
}

export function getShootout(state: GameState): ShootoutState {
  const log = (state.matchLog || []).filter(e => e.eventType === 'penal_ronda')

  const build = (team: 'home' | 'away'): Shot[] =>
    log.filter(e => e.team === team).map((e, i) => ({
      number: e.actor || '?',
      scored: (e.details || '').startsWith('CONVIERTE'),
      order: i + 1
    }))

  const home = build('home')
  const away = build('away')
  const homeGoals = home.filter(s => s.scored).length
  const awayGoals = away.filter(s => s.scored).length

  const suddenDeath = home.length >= SHOOTOUT_ROUNDS && away.length >= SHOOTOUT_ROUNDS
  const round = Math.max(home.length, away.length) + (home.length === away.length ? 1 : 0)

  let decided = false
  let leader: 'home' | 'away' | null = null
  let message = ''

  if (!suddenDeath) {
    // Definicion anticipada: cuando al que va detras ya no le alcanzan los que le quedan
    const homeLeft = Math.max(0, SHOOTOUT_ROUNDS - home.length)
    const awayLeft = Math.max(0, SHOOTOUT_ROUNDS - away.length)
    if (homeGoals > awayGoals + awayLeft) { decided = true; leader = 'home' }
    else if (awayGoals > homeGoals + homeLeft) { decided = true; leader = 'away' }
    if (decided) message = 'DEFINIDO — no es necesario lanzar mas'
    else message = `Serie de ${SHOOTOUT_ROUNDS} · ronda ${Math.min(round, SHOOTOUT_ROUNDS)}`
  } else {
    // Muerte subita: se define solo con las series parejas
    if (home.length === away.length && homeGoals !== awayGoals) {
      decided = true
      leader = homeGoals > awayGoals ? 'home' : 'away'
      message = 'DEFINIDO en muerte subita'
    } else {
      message = home.length === away.length
        ? 'Muerte subita · lanza el siguiente'
        : 'Muerte subita · falta igualar la serie'
    }
  }

  return { home, away, homeGoals, awayGoals, round, suddenDeath, decided, leader, message }
}

/** Cuantas veces lanzo ya esa camiseta. El arbitro decide si puede repetir. */
export function shotsBy(shots: Shot[], number: string): Shot[] {
  return shots.filter(s => s.number === number)
}
