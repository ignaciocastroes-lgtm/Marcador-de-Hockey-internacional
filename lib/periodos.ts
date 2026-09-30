// ─────────────────────────────────────────────────────────────────────────────
// PERIODOS — el modelo del partido en un solo lugar
//
// Un partido tiene hasta CINCO periodos: 1T, 2T, primer alargue, segundo
// alargue y la tanda de penales. Este archivo es la unica fuente de verdad de:
//
//   · el ORDEN de los periodos y sus ROTULOS (corto, largo, de pantalla);
//   · cual es el periodo SIGUIENTE, segun la configuracion pactada;
//   · cuanto dura cada uno;
//   · el GOL DE ORO, que termina el partido en el instante del gol.
//
// POR QUE EXISTE. En la 3.56 el segundo alargue se agrego SOLO al motor. Nadie
// revisó quien mas miraba el periodo, y la app tenia ocho copias del mismo
// ternario `'1er_tiempo' ? '1T' : '2do_tiempo' ? '2T' : 'alargue' ? 'ET' : 'PEN'`.
// Resultado: durante el segundo alargue el marcador decia "P" (penales), el
// boton ">" saltaba del primer alargue directo a penales, y las crónicas no
// sumaban el marcador porque dejaban fuera sus goles. Cada consumidor de
// `Period` lee ahora de aqui, y `tests/periodos.test.mjs` falla si alguien
// vuelve a escribir uno a mano.
//
// Es puro: sin React, sin almacenamiento. Por eso se puede probar contra el
// codigo real y no contra una copia.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState, MatchConfig, MatchEvent, Period } from '@/hooks/use-game-state'

export const PERIODOS_ORDEN: Period[] = ['1er_tiempo', '2do_tiempo', 'alargue', 'alargue2', 'penales']

/** 1T, 2T, ET1, ET2, PEN — barras de estado, registros. */
export const PERIODO_CORTO: Record<Period, string> = {
  '1er_tiempo': '1T', '2do_tiempo': '2T', 'alargue': 'ET1', 'alargue2': 'ET2', 'penales': 'PEN',
}

/** Encabezados de seccion, en mayusculas. */
export const PERIODO_LARGO: Record<Period, string> = {
  '1er_tiempo': '1ER TIEMPO', '2do_tiempo': '2DO TIEMPO',
  'alargue': '1ER ALARGUE', 'alargue2': '2DO ALARGUE', 'penales': 'TANDA DE PENALES',
}

/** Texto corrido: "Fin del 1er alargue", crónica, registro. */
export const PERIODO_NOMBRE: Record<Period, string> = {
  '1er_tiempo': '1er tiempo', '2do_tiempo': '2do tiempo',
  'alargue': '1er alargue', 'alargue2': '2do alargue', 'penales': 'penales',
}

/** El recuadro PERIODO del marcador. Los de dos caracteres se dibujan mas chicos. */
export const PERIODO_MARCADOR: Record<Period, string> = {
  '1er_tiempo': '1', '2do_tiempo': '2', 'alargue': 'E1', 'alargue2': 'E2', 'penales': 'P',
}

/** 1 a 5, en el orden en que se juegan. */
export const numeroDePeriodo = (p: Period): number => PERIODOS_ORDEN.indexOf(p) + 1

/** Los dos periodos de alargue. */
export const esAlargue = (p: Period): boolean => p === 'alargue' || p === 'alargue2'

/** Segundos que dura un periodo: el alargue tiene su propia duracion. */
export function duracionPeriodo(cfg: MatchConfig, p: Period): number {
  if (esAlargue(p)) return (cfg.overtimeDuration || cfg.periodDuration) * 60
  return cfg.periodDuration * 60
}

/**
 * A QUE PERIODO SE PASA, O `null` SI EL PARTIDO TERMINA.
 *
 * El alargue son DOS periodos. Al cerrar el primero:
 *  · con GOL DE PLATA y diferencia -> el partido termina ahi;
 *  · empatados, o sin regla de plata -> se juega el segundo.
 * Al cerrar el segundo, si siguen iguales, van a penales.
 *
 * El GOL DE ORO no pasa por aqui: termina el partido EN EL MOMENTO del gol
 * (ver `aplicarGolDeOro`), no al cerrar el periodo.
 */
export function siguientePeriodo(prev: GameState): Period | null {
  const empatados = prev.homeScore === prev.awayScore
  const cfg = prev.matchConfig
  switch (prev.period) {
    case '1er_tiempo':
      return '2do_tiempo'
    case '2do_tiempo':
      if (empatados && cfg.allowOvertime) return 'alargue'
      if (empatados && cfg.allowPenalties) return 'penales'
      return null
    case 'alargue':
      // Con diferencia y gol de plata, el partido ya esta resuelto.
      if (!empatados && cfg.overtimeRule === 'plata') return null
      return 'alargue2'
    case 'alargue2':
      if (empatados && cfg.allowPenalties) return 'penales'
      return null
    default:
      return null
  }
}

/**
 * GOL DE ORO: el partido termina EN EL INSTANTE del gol.
 *
 * Se aplica sobre el estado YA con el gol sumado. Es distinto del gol de plata,
 * que se evalua al cerrar el periodo. Solo en alargue, solo con la regla
 * activa, y solo si hay diferencia: un gol que iguala no resuelve nada.
 *
 * Cierra el partido igual que el boton FIN (`endMatch`): ganador, relojes
 * detenidos, hora de termino, linea en el registro y fase 'finalizado'.
 */
export function aplicarGolDeOro(st: GameState): GameState {
  if (!esAlargue(st.period)) return st
  if (st.matchConfig.overtimeRule !== 'oro') return st
  if (st.homeScore === st.awayScore) return st

  const ganador = st.homeScore > st.awayScore ? 'home' : 'away'
  const ahora = new Date().toISOString()
  const evento: MatchEvent = {
    id: crypto.randomUUID(), timestamp: ahora, gameTime: st.mainClock,
    period: st.period, eventType: 'fin', team: ganador, actor: 'SISTEMA',
    details: `GOL DE ORO: termina el partido ${st.homeScore} - ${st.awayScore}`,
  }
  return {
    ...st,
    isMatchEnded: true,
    winner: ganador,
    matchPhase: 'post-partido',
    isMainClockRunning: false,
    isPossessionLeftRunning: false,
    isPossessionRightRunning: false,
    isIntermission: false,
    timestamps: { ...st.timestamps, matchEnd: ahora },
    matchLog: [...st.matchLog, evento],
  }
}
