// ─────────────────────────────────────────────────────────────────────────────
// PARTIDO DE EJEMPLO PARA LA PREVISUALIZACION
//
// Los lanzadores se dibujan con los componentes REALES, asi que necesitan un
// GameState. Este es uno de mentira con datos representativos: goles con minuto,
// tarjetas de los dos colores, faltas y posesion desbalanceada. Sirve para ver
// como queda la pantalla llena, que es cuando se rompe un diseno, y no vacia.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState } from '@/hooks/use-game-state'

export const DEMO_HOME = 'INTERNACIONAL'
export const DEMO_AWAY = 'VISITA'

const ev = (
  id: string, eventType: GameState['matchLog'][number]['eventType'],
  team: 'home' | 'away' | null, actor: string, gameTime: number,
  period: GameState['period'] = '1er_tiempo', details = ''
) => ({ id, timestamp: '', gameTime, period, eventType, team, actor, details })

export const DEMO_STATE = {
  homeScore: 2,
  awayScore: 1,
  homeFouls: 6,
  awayFouls: 3,
  homePenalties: 0,
  awayPenalties: 0,
  homePossessionTime: 940,
  awayPossessionTime: 560,
  period: '1er_tiempo',
  mainClock: 272,
  initialClockTime: 1500,
  winner: 'home',
  isMatchEnded: true,
  matchConfig: { seriesName: 'SUB-15 FEM', gender: 'FEMENINA' },
  cardHistory: [
    { id: 'c1', team: 'home', playerNumber: '14', isBench: false, cardType: 'yellow', sanctionType: 'direct', period: '1er_tiempo', gameTime: 900, timestamp: '' },
    { id: 'c2', team: 'away', playerNumber: '8',  isBench: false, cardType: 'blue',   sanctionType: 'direct', period: '1er_tiempo', gameTime: 600, timestamp: '' },
    { id: 'c3', team: 'away', playerNumber: 'DT', isBench: true,  cardType: 'yellow', sanctionType: 'direct', period: '1er_tiempo', gameTime: 400, timestamp: '' }
  ],
  matchLog: [
    ev('g1', 'gol', 'home', '15', 1020),
    ev('g2', 'gol', 'away', '8', 720),
    ev('g3', 'gol', 'home', '22', 310)
  ]
} as unknown as GameState
