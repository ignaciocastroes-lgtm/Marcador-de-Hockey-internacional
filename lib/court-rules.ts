// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE REGLAMENTO DE PISTA — Funciones puras, sin React.
// Fuente unica de verdad para: disponibilidad, maximos en pista, power play,
// conteo de amarillas y validacion de cambios.
// Reglamento World Skate 2026.
// ─────────────────────────────────────────────────────────────────────────────

import type { Player, Sanction, CardHistory } from '@/hooks/use-game-state'

export const MIN_TOTAL_PLAYERS = 4
export const FULL_STRENGTH = 5
export const MAX_GOALIES = 1

export const STAFF_ROLES = ['dt', 'ay1', 'ay2', 'ax1', 'ax2'] as const
export const NON_COURT_ROLES = ['dt', 'ay1', 'ay2', 'ax1', 'ax2', 'suplente'] as const

const STAFF_LABEL: Record<string, string> = {
  dt: 'DT', ay1: 'AY1', ay2: 'AY2', ax1: 'AX1', ax2: 'AX2'
}

const STAFF_NAME: Record<string, string> = {
  dt: 'Director Tecnico', ay1: 'Ayudante 1', ay2: 'Ayudante 2',
  ax1: 'Auxiliar 1', ax2: 'Auxiliar 2'
}

/** Numero visible de un integrante: DT/AY1/AX2... para cuerpo tecnico, camiseta para el resto. */
export function getDisplayNumber(p: Player): string {
  return STAFF_LABEL[(p.role as string) || ''] || p.number
}

export function getStaffLabel(role: string): string {
  return STAFF_LABEL[role] || 'Suplente'
}

export function getStaffName(role: string): string {
  return STAFF_NAME[role] || ''
}

export function isStaff(p: Player): boolean {
  return (STAFF_ROLES as readonly string[]).includes((p.role as string) || '')
}

export function isBenchOnly(p: Player): boolean {
  return (NON_COURT_ROLES as readonly string[]).includes((p.role as string) || '')
}

export function isGoalie(p: Player): boolean {
  return p.role === 'portero' || p.position === 'PO'
}

// ─── Sanciones activas ───────────────────────────────────────────────────────

export function activeCourtSanctions(sanctions: Sanction[], team: 'home' | 'away'): Sanction[] {
  return sanctions.filter(s => s.team === team && s.remainingTime > 0 && !s.isBench)
}

export function activeBlues(sanctions: Sanction[], team: 'home' | 'away'): Sanction[] {
  return activeCourtSanctions(sanctions, team).filter(s => s.type === 'blue')
}

export function activeReds(sanctions: Sanction[], team: 'home' | 'away'): Sanction[] {
  return activeCourtSanctions(sanctions, team).filter(s => s.type === 'red')
}

/**
 * Maximo legal en pista. Piso duro de 4: una segunda sancion simultanea
 * no baja mas el numero de patinadores, solo alarga el tiempo de inferioridad
 * (el segundo castigo espera su turno en la cola de drenaje).
 */
export function getMaxAllowed(sanctions: Sanction[], team: 'home' | 'away'): number {
  const penalized = activeBlues(sanctions, team).length + activeReds(sanctions, team).length
  return Math.max(MIN_TOTAL_PLAYERS, FULL_STRENGTH - penalized)
}

// ─── Expulsados y penalizados ────────────────────────────────────────────────

/** Llaves de identidad de expulsados: numero visible, numero de camiseta e id. */
export function getExpelledKeys(
  cardHistory: CardHistory[], sanctions: Sanction[], team: 'home' | 'away'
): string[] {
  const fromHistory = cardHistory.filter(c => c.team === team && c.cardType === 'red')
  const fromSanctions = sanctions.filter(s => s.team === team && s.type === 'red')
  return Array.from(new Set([
    ...fromHistory.map(c => c.playerNumber),
    ...fromHistory.map(c => c.staffId),
    ...fromSanctions.map(s => s.playerNumber),
    ...fromSanctions.map(s => s.staffId)
  ])).filter(Boolean) as string[]
}

/** Llaves de quienes cumplen azul: no pueden estar en pista mientras corre. */
export function getPenalizedKeys(sanctions: Sanction[], team: 'home' | 'away'): string[] {
  const blues = activeBlues(sanctions, team)
  return Array.from(new Set([
    ...blues.map(s => s.playerNumber),
    ...blues.map(s => s.staffId)
  ])).filter(Boolean) as string[]
}

export function isPlayerExpelled(
  p: Player, team: 'home' | 'away', cardHistory: CardHistory[], sanctions: Sanction[]
): boolean {
  const keys = getExpelledKeys(cardHistory, sanctions, team)
  const display = getDisplayNumber(p)
  return keys.includes(display) || keys.includes(p.number) || keys.includes(p.id)
}

export function isPlayerAvailable(
  p: Player, team: 'home' | 'away', cardHistory: CardHistory[], sanctions: Sanction[]
): boolean {
  if (p.isDisabled) return false                       // lesionado: fuera, sin sancion
  if (isPlayerExpelled(p, team, cardHistory, sanctions)) return false
  if (!isBenchOnly(p)) {
    const penalized = getPenalizedKeys(sanctions, team)
    const display = getDisplayNumber(p)
    if (penalized.includes(display) || penalized.includes(p.number) || penalized.includes(p.id)) return false
  }
  return true
}

// ─── Amarillas por persona ───────────────────────────────────────────────────

/** Amarillas acumuladas visibles sobre la ficha (historial y sanciones vigentes). */
export function getYellowCount(
  p: Player, team: 'home' | 'away', cardHistory: CardHistory[], sanctions: Sanction[]
): number {
  const display = getDisplayNumber(p)
  const match = (num: string, staffId?: string) =>
    num === p.number || num === display || staffId === p.id

  const fromHistory = cardHistory.filter(
    c => c.team === team && c.cardType === 'yellow' && match(c.playerNumber, c.staffId)
  ).length
  const fromSanctions = sanctions.filter(
    s => s.team === team && s.type === 'yellow' && match(s.playerNumber, s.staffId)
  ).length

  return Math.max(fromHistory, fromSanctions)
}

/** Azules de pista acumuladas: a la segunda, la proxima tarjeta expulsa. */
export function getBlueCount(
  p: Player, team: 'home' | 'away', cardHistory: CardHistory[]
): number {
  return cardHistory.filter(
    c => c.team === team && !c.isBench && c.cardType === 'blue' &&
         (c.playerNumber === p.number || c.playerNumber === getDisplayNumber(p))
  ).length
}

// ─── Alineacion ──────────────────────────────────────────────────────────────

/** Quinteto inicial por defecto: portero + los primeros cuatro de pista. */
export function getDefaultLineup(players: Player[]): string[] {
  const elegibles = players.filter(p => !isBenchOnly(p))
  const portero = elegibles.find(isGoalie)
  const jugadores = elegibles.filter(p => !isGoalie(p)).slice(0, FULL_STRENGTH - 1)
  return [...(portero ? [portero] : []), ...jugadores].map(p => p.id)
}

export interface Lineup {
  goalie: Player | undefined
  field: Player[]
  count: number
}

export function getLineup(
  players: Player[], courtIds: string[], team: 'home' | 'away',
  cardHistory: CardHistory[], sanctions: Sanction[]
): Lineup {
  const onCourt = players.filter(
    p => courtIds.includes(p.id) && isPlayerAvailable(p, team, cardHistory, sanctions)
  )
  const goalie = onCourt.find(isGoalie)
  const field = onCourt.filter(p => !isGoalie(p))
  return { goalie, field, count: field.length + (goalie ? 1 : 0) }
}

// ─── Power play ──────────────────────────────────────────────────────────────

export function getPowerPlay(homeCount: number, awayCount: number, sanctions: Sanction[]): {
  home: boolean; away: boolean; differential: number
} {
  const homePenalized = activeBlues(sanctions, 'home').length + activeReds(sanctions, 'home').length
  const awayPenalized = activeBlues(sanctions, 'away').length + activeReds(sanctions, 'away').length
  return {
    home: awayPenalized > 0 && homeCount > awayCount,
    away: homePenalized > 0 && awayCount > homeCount,
    differential: homeCount - awayCount
  }
}

// ─── Validacion de cambios ───────────────────────────────────────────────────

export type ToggleResult =
  | { ok: true; action: 'in' | 'out'; ids: string[] }
  | { ok: false; reason: string }

/**
 * Valida y resuelve un cambio de jugador sobre la pista.
 * Devuelve la nueva lista de ids o el motivo del rechazo, sin tocar estado.
 */
export function resolveToggle(
  player: Player,
  team: 'home' | 'away',
  courtIds: string[],
  players: Player[],
  cardHistory: CardHistory[],
  sanctions: Sanction[]
): ToggleResult {
  if (isStaff(player)) {
    return { ok: false, reason: 'REGLA: El cuerpo tecnico no puede ingresar a la pista.' }
  }

  if (isPlayerExpelled(player, team, cardHistory, sanctions)) {
    return { ok: false, reason: `El #${getDisplayNumber(player)} esta EXPULSADO y no puede volver a la pista.` }
  }

  if (player.isDisabled && !courtIds.includes(player.id)) {
    return { ok: false, reason: `El #${getDisplayNumber(player)} esta LESIONADO. Reincorporalo primero.` }
  }

  const lineup = getLineup(players, courtIds, team, cardHistory, sanctions)
  const maxAllowed = getMaxAllowed(sanctions, team)

  // Sale de la pista
  if (courtIds.includes(player.id)) {
    if (lineup.count <= MIN_TOTAL_PLAYERS) {
      return { ok: false, reason: `REGLA: El equipo no puede quedar con menos de ${MIN_TOTAL_PLAYERS} jugadores en pista.` }
    }
    return { ok: true, action: 'out', ids: courtIds.filter(id => id !== player.id) }
  }

  // Entra a la pista
  if (isGoalie(player) && lineup.goalie) {
    return { ok: false, reason: 'REGLA: Solo puede haber 1 portero en la pista.' }
  }

  if (lineup.count >= maxAllowed) {
    return { ok: false, reason: `LIMITE ALCANZADO: Por las tarjetas activas el maximo en pista es ${maxAllowed}.` }
  }

  return { ok: true, action: 'in', ids: [...courtIds, player.id] }
}


// ─────────────────────────────────────────────────────────────────────────────
// AJUSTES DE PARTIDO
// El plantel base viene de matchConfig y es lo que firmaron los capitanes: no se
// toca. Encima va esta capa con lo que pasó en la cancha. resolveRoster() las
// fusiona y devuelve un Player[] normal, así que TODAS las funciones de arriba
// siguen operando igual y el motor de sanciones no se entera de nada.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerAdjustment {
  number?: string      // número corregido (la persona es la misma)
  injured?: boolean    // lesionado: sale de pista, no genera sanción, es reversible
}

export interface TeamAdjustments {
  players: Record<string, PlayerAdjustment>
  goalieId?: string    // portero designado en partido (anula el del plantel)
  captainId?: string   // capitán designado en partido
  extraPlayers: Player[]
  removedIds: string[]
}

export interface MatchAdjustments { home: TeamAdjustments; away: TeamAdjustments }

export const emptyTeamAdjustments = (): TeamAdjustments =>
  ({ players: {}, extraPlayers: [], removedIds: [] })

export const emptyMatchAdjustments = (): MatchAdjustments =>
  ({ home: emptyTeamAdjustments(), away: emptyTeamAdjustments() })

export function resolveRoster(base: Player[], adj?: TeamAdjustments): Player[] {
  if (!adj) return base
  const all = [...base, ...(adj.extraPlayers || [])]
  return all
    .filter(p => !(adj.removedIds || []).includes(p.id))
    .map(p => {
      const a = adj.players?.[p.id]
      let role = p.role
      // El portero designado manda sobre el del plantel, en las dos direcciones
      if (adj.goalieId) {
        if (p.id === adj.goalieId) role = 'portero'
        else if (role === 'portero') role = 'jugador_pista'
      }
      if (adj.captainId && p.id === adj.captainId && role !== 'portero') role = 'capitan'
      return {
        ...p,
        number: a?.number ?? p.number,
        position: (adj.goalieId ? (p.id === adj.goalieId ? 'PO' : (p.position === 'PO' ? '' : p.position)) : p.position) as Player['position'],
        role,
        isDisabled: a?.injured ? true : undefined
      }
    })
}

/** Un número sólo puede reasignarse si nadie más del equipo lo ocupa. */
export function canUseNumber(roster: Player[], playerId: string, num: string): boolean {
  const clean = num.trim()
  if (!clean) return false
  return !roster.some(p => p.id !== playerId && getDisplayNumber(p) === clean)
}

// ─────────────────────────────────────────────────────────────────────────────
// SUSTITUCION ATOMICA
//
// Un cambio es UNA operacion, no dos. Validarlo como "sacar" + "meter" bloquea
// al equipo cuando esta en el minimo: sacar dejaria 3 y meter superaria el
// maximo, asi que ninguno de los dos pasos es legal por separado aunque el
// cambio completo si lo sea. Aqui se valida el ESTADO FINAL.
// ─────────────────────────────────────────────────────────────────────────────

export type SubstitutionResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: string }

export function resolveSubstitution(
  playerIn: Player,
  playerOut: Player,
  team: 'home' | 'away',
  courtIds: string[],
  players: Player[],
  cardHistory: CardHistory[],
  sanctions: Sanction[]
): SubstitutionResult {
  if (playerIn.id === playerOut.id) {
    return { ok: false, reason: 'Es el mismo jugador.' }
  }
  if (!courtIds.includes(playerOut.id)) {
    return { ok: false, reason: `El #${getDisplayNumber(playerOut)} no esta en la pista.` }
  }
  if (courtIds.includes(playerIn.id)) {
    return { ok: false, reason: `El #${getDisplayNumber(playerIn)} ya esta en la pista.` }
  }
  if (isStaff(playerIn)) {
    return { ok: false, reason: 'REGLA: El cuerpo tecnico no puede ingresar a la pista.' }
  }
  if (isPlayerExpelled(playerIn, team, cardHistory, sanctions)) {
    return { ok: false, reason: `El #${getDisplayNumber(playerIn)} esta EXPULSADO.` }
  }
  if (playerIn.isDisabled) {
    return { ok: false, reason: `El #${getDisplayNumber(playerIn)} esta LESIONADO. Reincorporalo primero.` }
  }

  const ids = [...courtIds.filter(id => id !== playerOut.id), playerIn.id]

  // Se valida el resultado, no el paso intermedio
  const final = getLineup(players, ids, team, cardHistory, sanctions)
  const onCourt = players.filter(p => ids.includes(p.id))
  const goalies = onCourt.filter(isGoalie).length

  if (goalies > MAX_GOALIES) {
    return { ok: false, reason: 'REGLA: Solo puede haber 1 portero en la pista. Cambia portero por portero.' }
  }
  if (final.count > getMaxAllowed(sanctions, team)) {
    return { ok: false, reason: `LIMITE: Por las tarjetas activas el maximo en pista es ${getMaxAllowed(sanctions, team)}.` }
  }

  return { ok: true, ids }
}

/** Quienes pueden entrar por el que sale, ya filtrados por reglamento. */
export function eligibleReplacements(
  playerOut: Player,
  team: 'home' | 'away',
  courtIds: string[],
  players: Player[],
  cardHistory: CardHistory[],
  sanctions: Sanction[]
): Player[] {
  return players.filter(p =>
    resolveSubstitution(p, playerOut, team, courtIds, players, cardHistory, sanctions).ok
  )
}
