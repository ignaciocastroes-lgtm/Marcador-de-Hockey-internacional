// ─────────────────────────────────────────────────────────────────────────────
// FIGURA DEL PARTIDO
//
// Automática: la mesa no elige. Una sola por partido, de cualquiera de los dos
// equipos — si el que perdió tuvo una jugadora que hizo cinco goles, la figura
// es ella igual.
//
// Es estadística y tiene margen de error, así que la fórmula está pensada para
// que el dato menos confiable pese poco: los minutos dependen de que se toque
// cada cambio, por eso valen mucho menos que un gol.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState, Player } from '@/hooks/use-game-state'

export const PESOS = {
  gol: 10,
  minuto: 0.2,      // un partido entero sin marcar ≈ un gol
  amarilla: -3,
  azul: -6,         // el doble: dejó al equipo en inferioridad
} as const

export interface Figura {
  team: 'home' | 'away'
  dorsal: string
  goles: number
  minutos: number
  esPortera: boolean
  /** Frase corta para la pantalla: "3 goles · 48 min", "Arco en cero". */
  motivo: string
  /** Por qué ganó: 'puntaje' o la regla de la portera. */
  via: 'puntaje' | 'portera'
}

interface Candidata {
  team: 'home' | 'away'
  dorsal: string
  id: string
  goles: number
  amarillas: number
  azules: number
  roja: boolean
  minutos: number
  esPortera: boolean
  puntos: number
}

const esPorteraP = (p: Player) => p.position === 'PO' || p.role === 'portero'

/**
 * Minutos jugados por dorsal, reconstruidos del registro.
 *
 * No hace falta una foto de la formacion inicial: se parte de quien esta en
 * pista AL FINAL (eso si esta guardado) y se recorre el registro HACIA ATRAS,
 * deshaciendo cada cambio. Asi se sabe quien estaba adentro en cada tramo, y
 * tambien quien arranco — la titular que jugo todo sin salir queda contada.
 */
export function minutosPorDorsal(state: GameState, team: 'home' | 'away'): Record<string, number> {
  const roster = (team === 'home' ? state.matchConfig.homePlayers : state.matchConfig.awayPlayers) || []
  const idsFinal = team === 'home' ? state.homeCourtIds : state.awayCourtIds
  const dorsalDe = new Map(roster.map(p => [p.id, p.number]))

  const adentro = new Set((idsFinal || []).map(id => dorsalDe.get(id)).filter(Boolean) as string[])
  // Cada periodo dura lo suyo: el alargue no dura lo mismo que el tiempo
  // reglamentario. (Sin la config, se cae al reloj inicial como antes.)
  const cfg = state.matchConfig
  const largo = (p: string): number => {
    const min = (p === 'alargue' || p === 'alargue2') ? (cfg?.overtimeDuration || cfg?.periodDuration) : cfg?.periodDuration
    return min ? min * 60 : (state.initialClockTime || 25 * 60)
  }
  const seg: Record<string, number> = {}

  // Cambios de este equipo, del mas nuevo al mas viejo.
  const cambios = (state.matchLog || [])
    .filter(e => e.eventType === 'cambio' && e.team === team)
    .slice().reverse()

  // Los periodos JUGADOS son todos hasta el actual, tengan o no eventos.
  // Antes se tomaban de los que aparecian en el registro: un periodo sin un
  // solo evento no contaba, y la titular que lo jugo entero quedaba en cero.
  const ORDEN = ['1er_tiempo', '2do_tiempo', 'alargue', 'alargue2']
  const enElRegistro = (p: string) => (state.matchLog || []).some(e => e.period === p)
  const hasta = state.period === 'penales'
    ? (enElRegistro('alargue2') ? 3 : enElRegistro('alargue') ? 2 : 1)
    : ORDEN.indexOf(state.period)
  const jugados = ORDEN.slice(0, Math.max(0, hasta) + 1).reverse()

  // Se recorre cada periodo desde su final hacia su inicio.
  for (const p of jugados) {
    const esUltimo = p === state.period
    // Reloj en cuenta regresiva: el final del periodo es 0, salvo si el
    // partido termino antes (el reloj quedo donde quedo).
    let reloj = esUltimo ? state.mainClock : 0
    for (const c of cambios.filter(x => x.period === p)) {
      const tramo = Math.max(0, c.gameTime - reloj)
      adentro.forEach(d => { seg[d] = (seg[d] || 0) + tramo })
      // Deshacer el cambio: si "Ingresa", antes no estaba; si "Sale", si.
      if ((c.details || '').startsWith('Ingresa')) adentro.delete(c.actor)
      else adentro.add(c.actor)
      reloj = c.gameTime
    }
    const tramoInicial = Math.max(0, largo(p) - reloj)
    adentro.forEach(d => { seg[d] = (seg[d] || 0) + tramoInicial })
  }

  const min: Record<string, number> = {}
  Object.entries(seg).forEach(([d, s]) => { min[d] = Math.round(s / 60) })
  return min
}

export function calcularFigura(state: GameState): Figura | null {
  const log = state.matchLog || []
  const cards = (state.cardHistory || []).filter(c => !c.anulada && !c.isBench)

  const candidatas: Candidata[] = []
  for (const team of ['home', 'away'] as const) {
    const roster = (team === 'home' ? state.matchConfig.homePlayers : state.matchConfig.awayPlayers) || []
    const minutos = minutosPorDorsal(state, team)
    roster
      .filter(p => !['dt', 'ay1', 'ay2', 'ax1', 'ax2'].includes((p.role as string) || ''))
      .forEach(p => {
        const d = p.number
        const goles = log.filter(e => e.eventType === 'gol' && !e.anulado && e.team === team && e.actor === d).length
        const deEl = cards.filter(c => c.team === team && c.playerNumber === d)
        const amarillas = deEl.filter(c => c.cardType === 'yellow').length
        const azules = deEl.filter(c => c.cardType === 'blue').length
        const roja = deEl.some(c => c.cardType === 'red')
        const m = minutos[d] || 0
        candidatas.push({
          team, dorsal: d, id: p.id, goles, amarillas, azules, roja, minutos: m,
          esPortera: esPorteraP(p),
          puntos: goles * PESOS.gol + m * PESOS.minuto + amarillas * PESOS.amarilla + azules * PESOS.azul
        })
      })
  }

  // Un expulsado no puede ser figura, sin formula que lo discuta.
  const validas = candidatas.filter(c => !c.roja)
  if (validas.length === 0) return null

  // ── La regla de la portera ────────────────────────────────────────────
  // Empate con el rival teniendo más la pelota, o ganar con menos posesión:
  // el equipo que aguantó. La figura es su portera.
  const posH = state.homePossessionTime || 0, posA = state.awayPossessionTime || 0
  const hayPosesion = posH + posA > 0
  const empate = state.homeScore === state.awayScore
  const aguanto: 'home' | 'away' | null = !hayPosesion ? null
    : empate ? (posH < posA ? 'home' : posA < posH ? 'away' : null)
    : state.homeScore > state.awayScore ? (posH < posA ? 'home' : null)
    : (posA < posH ? 'away' : null)

  if (aguanto) {
    const portera = validas.filter(c => c.team === aguanto && c.esPortera)
      .sort((a, b) => b.minutos - a.minutos)[0]
    // Solo si ninguna jugadora de campo la supera por goles: tres goles en un
    // partido que se aguantó siguen siendo el hecho del partido.
    const goleadora = validas.slice().sort((a, b) => b.goles - a.goles)[0]
    if (portera && !(goleadora && goleadora.goles >= 3)) {
      return {
        team: portera.team, dorsal: portera.dorsal, goles: portera.goles,
        minutos: portera.minutos, esPortera: true, via: 'portera',
        motivo: empate ? 'Sostuvo el empate' : 'Sostuvo el triunfo'
      }
    }
  }

  // ── Puntaje, con desempate ────────────────────────────────────────────
  // Mas goles -> menos tarjetas -> mas minutos -> la portera.
  const tarjetas = (c: Candidata) => c.amarillas + c.azules * 2
  const ganadora = validas.slice().sort((a, b) =>
    b.puntos - a.puntos ||
    b.goles - a.goles ||
    tarjetas(a) - tarjetas(b) ||
    b.minutos - a.minutos ||
    Number(b.esPortera) - Number(a.esPortera)
  )[0]

  if (!ganadora || (ganadora.puntos <= 0 && ganadora.goles === 0 && ganadora.minutos === 0)) return null

  const partes: string[] = []
  if (ganadora.goles > 0) partes.push(`${ganadora.goles} ${ganadora.goles === 1 ? 'gol' : 'goles'}`)
  if (ganadora.minutos > 0) partes.push(`${ganadora.minutos} min`)

  return {
    team: ganadora.team, dorsal: ganadora.dorsal, goles: ganadora.goles,
    minutos: ganadora.minutos, esPortera: ganadora.esPortera, via: 'puntaje',
    motivo: partes.join(' · ') || 'Figura del partido'
  }
}
