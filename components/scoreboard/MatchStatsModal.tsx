"use client"

import { useState, useEffect } from 'react'
import { Globe, Download, Save, RotateCcw } from 'lucide-react'
import { openMatchReport, downloadMatchJSON, reportOptsFor } from '@/lib/match-report'
import { buildSummary } from '@/lib/match-summary'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { GameState, Period } from '@/hooks/use-game-state'

/**
 * ESTADÍSTICAS DEL PARTIDO.
 *
 * Fue la "planilla oficial" para la federación, con ocho firmas de cierre y
 * un sello. Ya nadie la firma: lo que se lleva son las estadísticas, y lo que
 * sale es la crónica (HTML) y los Datos web (JSON). En la 3.54 salieron el
 * sello, las firmas, "Forzar cierre", las observaciones y el ACTA (PDF); en la
 * 3.55 el CSV, que ya no ocupaba nadie. Su bloque de reanudación viaja ahora
 * dentro de los Datos web.
 */
export interface MatchStatsModalProps {
  open: boolean
  onClose: () => void
  state: GameState
  homeTeamName: string
  awayTeamName: string
  matchEnded: boolean
  onSaveMatchToHistory: () => void
  onSaveAndReset?: () => void
}

/** Rótulo corto del periodo. Estaba escrito cuatro veces en este archivo. */
const PERIODO_CORTO: Record<Period, string> = {
  '1er_tiempo': '1T', '2do_tiempo': '2T', 'alargue': 'ET', 'penales': 'PEN',
}
const PERIODO_LARGO: Record<Period, string> = {
  '1er_tiempo': '1ER TIEMPO', '2do_tiempo': '2DO TIEMPO', 'alargue': 'ALARGUE', 'penales': 'TANDA DE PENALES',
}

export function MatchStatsModal({
  open, onClose, state,
  homeTeamName, awayTeamName,
  matchEnded, onSaveMatchToHistory, onSaveAndReset,
}: MatchStatsModalProps) {

  /**
   * "Guardar y nuevo" con el partido EN JUEGO guarda lo que va y resetea la
   * mesa. Un toque equivocado cortaba un partido. Con el partido en juego pide
   * un segundo toque; si no llega en 4 s, se desarma solo.
   */
  const [confirmarNuevo, setConfirmarNuevo] = useState(false)
  useEffect(() => {
    if (!confirmarNuevo) return
    const t = setTimeout(() => setConfirmarNuevo(false), 4000)
    return () => clearTimeout(t)
  }, [confirmarNuevo])
  useEffect(() => { if (!open) setConfirmarNuevo(false) }, [open])

  const nuevoPartido = () => {
    if (!matchEnded && !confirmarNuevo) { setConfirmarNuevo(true); return }
    setConfirmarNuevo(false)
    onSaveAndReset?.()
    onClose()
  }

  /** Nombres y escudos: los mismos que usa el historial (`reportOptsFor`). */
  const opts = () => reportOptsFor(state, { home: homeTeamName, away: awayTeamName })

  // UI: Devuelve un div apilado para ahorrar ancho en pantalla
  const getCardUI = (playerId: string, playerNumber: string, cardType: 'yellow' | 'blue' | 'red', index: number, isBench: boolean, team: 'home' | 'away') => {
    // La grilla es POSICIONAL (amarilla 1, 2, 3...), asi que una anulada
    // ocupaba casillero como si valiera. Se excluye de la grilla; la traza no
    // se pierde: el registro cronologico imprime "ANULADA por la mesa".
    const cards = (state.cardHistory || []).filter(c =>
      !c.anulada &&
      c.team === team && (c.playerNumber === playerNumber || c.staffId === playerId) && c.cardType === cardType && c.isBench === isBench
    );
    const card = cards[index];
    if (!card) return <span className="opacity-10">-</span>; 

    const m = Math.floor(card.gameTime / 60);
    const s = (card.gameTime % 60).toString().padStart(2, '0');
    const pLabel = PERIODO_CORTO[card.period];

    return (
      <div className="flex flex-col items-center justify-center leading-tight py-0.5">
        <span className="text-[9px] opacity-70 font-sans tracking-widest">{pLabel}</span>
        <span className="font-mono text-[11px] font-bold">{m}:{s}</span>
      </div>
    );
  };


  const inicio = state.timestamps?.matchStart ? new Date(state.timestamps.matchStart) : null

  /**
   * LO QUE SOLO NOSOTROS SABEMOS.
   *
   * La posesion por equipo sale de los relojes de 45: se acumula el tiempo
   * que cada uno tuvo la bocha, medido de verdad, no estimado. Ninguna
   * planilla de papel lleva ese dato, y es el que hace que un acta de ARDI
   * valga mas que una hoja.
   *
   * La duracion real es de pared —cuanto duro la jornada con descansos,
   * tiempos muertos y suspensiones— frente al tiempo de juego reglamentario.
   * Es lo que un club necesita para programar una fecha.
   */
  const posHome = Math.round(state.homePossessionTime || 0)
  const posAway = Math.round(state.awayPossessionTime || 0)
  const posTotal = posHome + posAway
  const pct = (v: number) => posTotal > 0 ? Math.round((v / posTotal) * 100) : 0
  const mmss = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}`

  const fin = state.timestamps?.matchEnd ? new Date(state.timestamps.matchEnd) : null
  const duracionReal = inicio && fin
    ? Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 1000))
    : null
  const tiempoJuego = (state.matchConfig.periodsCount || 2) * (state.matchConfig.periodDuration || 25) * 60
  const fechaPartido = state.matchConfig.fecha
    ? new Date(`${state.matchConfig.fecha}T00:00:00`).toLocaleDateString('es-CL')
    : (inicio ?? new Date()).toLocaleDateString('es-CL')
  const horaPartido = state.matchConfig.hora
    || (inicio ? inicio.toTimeString().slice(0, 5) : '')

  const subtitulo = [state.matchConfig.campeonato, state.matchConfig.seriesName, state.matchConfig.gender]
    .filter(Boolean).join(' · ')

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-zinc-900 border-zinc-700 text-white w-[98vw] max-w-6xl max-h-[95vh] h-[95vh] p-0 flex flex-col overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="sr-only"><DialogTitle>Estadísticas del partido</DialogTitle></DialogHeader>

        {/* Cabecera fija: título y UNA fila de exportaciones.
            Antes eran cinco botones en dos sitios (tres de ellos sólo tras
            sellar). La crónica trae dentro Imprimir y Copiar para la web. */}
        <div className="bg-black p-3 sm:p-4 border-b-2 border-yellow-600 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
          <div className="pr-8 min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-yellow-400 leading-tight">Estadísticas del partido</h2>
            <p className="text-zinc-400 text-xs sm:text-sm truncate">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:mr-8">
            <Button onClick={() => openMatchReport(state, opts())}
              className="bg-emerald-700 hover:bg-emerald-600 font-bold h-9">
              <Globe className="w-4 h-4 mr-2" /> Ver crónica
            </Button>
            {/* El dato, para que la web pueda filtrar por serie y armar
                tablas. La crónica es el dibujo; esto es el contenido. También
                sirve para retomar un partido suspendido. El archivo con TODOS
                los partidos del día está en Historial. */}
            <Button onClick={() => downloadMatchJSON(state, opts())}
              variant="outline" className="border-zinc-600 font-bold h-9">
              <Download className="w-4 h-4 mr-2" /> Datos web
            </Button>
          </div>
        </div>

        {/* Cuerpo del Modal (Scroll Interno) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* 1. Encabezado Oficial */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
              <div className="md:col-span-2">
                <span className="text-zinc-500 text-xs block">CAMPEONATO</span>
                <p className="font-bold text-yellow-400">{state.matchConfig.campeonato || 'Liga Regular'}</p>
              </div>
              <div><span className="text-zinc-500 text-xs block">PARTIDO N°</span><p className="font-bold">{state.matchConfig.partidoNumero || '1'}</p></div>
              {/* Antes decia `new Date()`: la fecha de HOY, no la del partido.
                  Reimprimir el acta una semana despues la fechaba mal. */}
              <div><span className="text-zinc-500 text-xs block">FECHA</span><p className="font-bold">{fechaPartido}</p></div>
              <div><span className="text-zinc-500 text-xs block">HORA</span><p className="font-bold">{horaPartido}</p></div>
              <div><span className="text-zinc-500 text-xs block">SERIE</span><p className="font-bold">{state.matchConfig.seriesName}</p></div>
              <div><span className="text-zinc-500 text-xs block">RAMA</span><p className="font-bold">{state.matchConfig.gender}</p></div>
              {state.matchConfig.estadio && (
                <div className="md:col-span-2"><span className="text-zinc-500 text-xs block">ESTADIO</span><p className="font-bold">{state.matchConfig.estadio}</p></div>
              )}
            </div>
            {(state.matchConfig.referees?.principal || state.matchConfig.referees?.cronometrista) && (
              <div className="mt-3 pt-3 border-t border-zinc-700 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                {state.matchConfig.referees?.principal    && <div><span className="text-zinc-500">Árb. Principal:</span> <span className="text-white">{state.matchConfig.referees.principal}</span></div>}
                {state.matchConfig.referees?.segundo      && <div><span className="text-zinc-500">2do Árbitro:</span>   <span className="text-white">{state.matchConfig.referees.segundo}</span></div>}
                {state.matchConfig.referees?.auxiliar     && <div><span className="text-zinc-500">Auxiliar:</span>      <span className="text-white">{state.matchConfig.referees.auxiliar}</span></div>}
                {state.matchConfig.referees?.cronometrista && <div><span className="text-zinc-500">Cronometrista:</span> <span className="text-white">{state.matchConfig.referees.cronometrista}</span></div>}
                {state.matchConfig.referees?.encargadoPista && <div><span className="text-zinc-500">Enc. Pista:</span>  <span className="text-white">{state.matchConfig.referees.encargadoPista}</span></div>}
              </div>
            )}
          </div>


          {/* 2. Control Horario y Goles */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 w-full">
            <h3 className="text-yellow-400 font-bold text-sm mb-3">CONTROL HORARIO Y GOLES POR PERIODO</h3>
            
            <div className="w-full overflow-x-auto pb-2 border-b border-zinc-700">
              {(() => {
                const allGoals = (state.matchLog || []).filter(e => e.eventType === 'gol' && !e.anulado).sort((a, b) => {
                  const o: Record<string, number> = { '1er_tiempo': 1, '2do_tiempo': 2, 'alargue': 3, 'penales': 4 }
                  if (o[a.period] !== o[b.period]) return o[a.period] - o[b.period]
                  return a.gameTime - b.gameTime
                })
                let cH = 0; let cA = 0
                const goalsData = allGoals.map((g, idx) => {
                  if (g.team === 'home') cH++; if (g.team === 'away') cA++
                  const m = Math.floor(g.gameTime / 60); const s = g.gameTime % 60
                  return {
                    num: idx + 1,
                    period: PERIODO_CORTO[g.period],
                    time: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
                    player: `#${g.actor}`,
                    team: g.team === 'home' ? homeTeamName : awayTeamName,
                    score: `${cH} - ${cA}`,
                    isHome: g.team === 'home'
                  }
                })
                const cols  = Math.max(15, goalsData.length)
                const dummy = Array.from({ length: cols })
                return (
                  <table className="w-full text-xs text-center border-collapse min-w-[650px]">
                    <thead>
                      <tr>
                        <th className="border border-zinc-600 bg-zinc-700/80 p-1.5 text-left font-bold text-zinc-300 sticky left-0 z-10 w-24">N° GOL</th>
                        {dummy.map((_, i) => <th key={`h-${i}`} className="border border-zinc-600 bg-zinc-700/50 p-1.5 min-w-[45px] font-black text-white">{i + 1}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'PERIODO',  key: 'period',  cls: 'text-zinc-300 font-bold' },
                        { label: 'MINUTO',   key: 'time',    cls: 'font-mono text-zinc-300' },
                        { label: 'JUGADOR',  key: 'player',  cls: 'font-black text-white' },
                        { label: 'EQUIPO',   key: 'team',    cls: 'truncate max-w-[80px]' },
                        { label: 'MARCADOR', key: 'score',   cls: 'font-black text-yellow-400 tracking-wider bg-yellow-950/20' },
                      ].map(row => (
                        <tr key={row.label}>
                          <td className={`border border-zinc-600 bg-zinc-900 p-1.5 text-left font-bold sticky left-0 z-10 ${row.label === 'MARCADOR' ? 'text-yellow-500' : 'text-zinc-400'}`}>{row.label}</td>
                          {dummy.map((_, i) => {
                            const g = goalsData[i]
                            const val = g ? (g as Record<string, unknown>)[row.key] as string : ''
                            const teamCls = row.key === 'team' ? (g?.isHome ? 'text-blue-400' : 'text-amber-400') : ''
                            return <td key={`${row.key}-${i}`} className={`border border-zinc-600 p-1.5 ${row.cls} ${teamCls}`}>{val}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>

            {/* FIX UI: Flex-wrap para evitar desbordamiento del marcador final */}
            <div className="mt-4 flex flex-wrap justify-between items-center gap-4 bg-zinc-950 border border-zinc-700 rounded-lg p-4 w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm font-bold">
                <span className="text-zinc-500 uppercase tracking-widest text-xs mr-2 hidden sm:block">Parciales:</span>
                {/* Los MISMOS parciales que la crónica, los Datos web y el resumen
                    proyectado: salen de buildSummary. Aquí se contaban aparte y
                    llegaron a sumar goles anulados. */}
                {buildSummary(state, 'completo').byPeriod.map(p => (
                  <div key={p.label} className="flex flex-col border border-zinc-800 rounded overflow-hidden min-w-[50px] text-center">
                    <span className="bg-zinc-800 text-zinc-400 py-0.5 text-[10px]">{p.label}</span>
                    <span className="py-1 bg-zinc-900 text-sm"><span className="text-blue-400">{p.home}</span><span className="text-zinc-600 mx-1">-</span><span className="text-amber-400">{p.away}</span></span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 bg-zinc-900 px-4 py-2 sm:px-6 sm:py-3 rounded-lg border-2 border-zinc-800 ml-auto">
                <span className="text-xs sm:text-sm font-black text-zinc-400 tracking-[0.1em] sm:tracking-[0.2em] uppercase">RESULTADO FINAL</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-blue-500">{state.homeScore}</span>
                  <span className="text-xl sm:text-2xl font-black text-zinc-600">-</span>
                  <span className="text-3xl sm:text-4xl font-black text-amber-500">{state.awayScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Grilla de Jugadores (FIX UI: Tiempos apilados) */}
          {([{ team: 'home' as const, name: homeTeamName, color: 'blue' }, { team: 'away' as const, name: awayTeamName, color: 'red' }]).map(({ team: t, name, color }) => {
            const players      = t === 'home' ? (state.matchConfig.homePlayers || []) : (state.matchConfig.awayPlayers || [])
            const courtPlayers = players.filter(p => !['dt', 'ay1', 'ay2', 'ax1', 'ax2'].includes((p.role as string) || ''))
            const benchStaff   = players.filter(p => ['dt', 'ay1', 'ay2', 'ax1', 'ax2'].includes((p.role as string) || ''))

            return (
              <div key={t} className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 w-full">
                <h3 className={`font-bold text-sm mb-2 ${color === 'blue' ? 'text-blue-400' : 'text-red-400'}`}>{name.toUpperCase()}</h3>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-xs min-w-[750px] table-auto">
                    <thead>
                      <tr className="border-b border-zinc-600">
                        <th className="text-center py-1 px-1 text-zinc-400 w-8">N°</th>
                        <th className="text-left py-1 px-2 text-zinc-400 w-32">NOMBRE</th>
                        <th className="text-center py-1 px-2 text-zinc-400 w-20">RUT</th>
                        <th colSpan={3} className="text-center py-1 px-1 text-yellow-600 border-l border-zinc-600 bg-yellow-900/20">BANCA</th>
                        <th colSpan={8} className="text-center py-1 px-1 text-cyan-400 border-l border-zinc-600 bg-cyan-900/10">PISTA</th>
                      </tr>
                      <tr className="border-b border-zinc-700 text-[10px]">
                        <th /><th /><th />
                        <th className="text-center px-1 text-yellow-500 border-l border-zinc-600 w-12">Am1</th>
                        <th className="text-center px-1 text-yellow-500 w-12">Am2</th>
                        <th className="text-center px-1 text-red-500 w-12">R</th>
                        <th className="text-center px-1 text-yellow-400 border-l border-zinc-600 w-12">Am1</th>
                        <th className="text-center px-1 text-yellow-400 w-12">Am2</th>
                        <th className="text-center px-1 text-yellow-400 w-12">Am3</th>
                        <th className="text-center px-1 text-yellow-400 w-12">Am4</th>
                        <th className="text-center px-1 text-blue-400 w-12">Az1</th>
                        <th className="text-center px-1 text-blue-400 w-12">Az2</th>
                        <th className="text-center px-1 text-blue-400 w-12">Az3</th>
                        <th className="text-center px-1 text-red-400 w-12">R</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-zinc-700/30"><td colSpan={14} className="py-1 px-2 text-zinc-500 text-[10px] font-bold">JUGADORES DE PISTA</td></tr>
                      {courtPlayers.map(p => (
                        <tr key={p.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/20">
                          <td className="py-1 px-1 font-bold text-center">{p.number}</td>
                          <td className="py-1 px-2 truncate max-w-[150px]">{p.name || '-'}</td>
                          <td className="py-1 px-2 text-center text-zinc-500 font-mono text-[10px]">{p.rut || '-'}</td>
                          <td className="text-center px-1 border-l border-zinc-600 text-yellow-400 align-middle h-10">{getCardUI(p.id, p.number, 'yellow', 0, true, t)}</td>
                          <td className="text-center px-1 text-yellow-400 align-middle">{getCardUI(p.id, p.number, 'yellow', 1, true, t)}</td>
                          <td className="text-center px-1 text-red-400 align-middle">{getCardUI(p.id, p.number, 'red', 0, true, t)}</td>
                          <td className="text-center px-1 border-l border-zinc-600 text-yellow-400 align-middle">{getCardUI(p.id, p.number, 'yellow', 0, false, t)}</td>
                          <td className="text-center px-1 text-yellow-400 align-middle">{getCardUI(p.id, p.number, 'yellow', 1, false, t)}</td>
                          <td className="text-center px-1 text-yellow-400 align-middle">{getCardUI(p.id, p.number, 'yellow', 2, false, t)}</td>
                          <td className="text-center px-1 text-yellow-400 align-middle">{getCardUI(p.id, p.number, 'yellow', 3, false, t)}</td>
                          <td className="text-center px-1 text-blue-400 align-middle">{getCardUI(p.id, p.number, 'blue', 0, false, t)}</td>
                          <td className="text-center px-1 text-blue-400 align-middle">{getCardUI(p.id, p.number, 'blue', 1, false, t)}</td>
                          <td className="text-center px-1 text-blue-400 align-middle">{getCardUI(p.id, p.number, 'blue', 2, false, t)}</td>
                          <td className="text-center px-1 text-red-400 align-middle">{getCardUI(p.id, p.number, 'red', 0, false, t)}</td>
                        </tr>
                      ))}
                      <tr className="bg-yellow-900/20"><td colSpan={14} className="py-1 px-2 text-yellow-600 text-[10px] font-bold">BANCA (DT / AY1 / AY2 / AX1 / AX2)</td></tr>
                      {benchStaff.map(p => {
                        const label = p.role === 'dt' ? 'DT' : p.role === 'ay1' ? 'AY1' : p.role === 'ay2' ? 'AY2' : p.role === 'ax1' ? 'AX1' : 'AX2'
                        return (
                          <tr key={p.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/20">
                            <td className="py-1 px-1 font-bold text-center text-yellow-500">{label}</td>
                            <td className="py-1 px-2 truncate max-w-[150px]">{p.name || '-'}</td>
                            <td className="py-1 px-2 text-center text-zinc-500 font-mono text-[10px]">{p.rut || '-'}</td>
                            <td className="text-center px-1 border-l border-zinc-600 text-yellow-400 align-middle h-10">{getCardUI(p.id, label, 'yellow', 0, true, t)}</td>
                            <td className="text-center px-1 text-yellow-400 align-middle">{getCardUI(p.id, label, 'yellow', 1, true, t)}</td>
                            <td className="text-center px-1 text-red-400 align-middle">{getCardUI(p.id, label, 'red', 0, true, t)}</td>
                            <td colSpan={8} className="text-center px-1 border-l border-zinc-600 text-zinc-600 bg-black/20"></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {/* 4. Registro Cronológico */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
            <h3 className="text-yellow-400 font-bold text-sm mb-2">REGISTRO CRONOLÓGICO DE INCIDENCIAS</h3>
            {/* Con la tanda de penales: el registro la omitía y los tiros no se veían. */}
            {(['1er_tiempo', '2do_tiempo', 'alargue', 'penales'] as Period[]).map(period => {
              const events = (state.matchLog || []).filter(e => e.period === period).sort((a, b) => b.gameTime - a.gameTime)
              if (events.length === 0) return null
              const periodLabel = PERIODO_LARGO[period]
              return (
                <div key={period} className="mb-3">
                  <h4 className="text-zinc-400 text-xs font-bold mb-1 border-b border-zinc-700 pb-1">{periodLabel}</h4>
                  <div className="space-y-1">
                    {events.map(e => {
                      const m = Math.floor(e.gameTime / 60); const s = e.gameTime % 60
                      const teamN = e.team === 'home' ? homeTeamName : e.team === 'away' ? awayTeamName : 'SISTEMA'
                      const teamColor = e.team === 'home' ? 'text-blue-400' : e.team === 'away' ? 'text-red-400' : 'text-zinc-400'
                      
                      const eventLabels: Record<string, [string, string]> = {
                        gol:              ['GOL',        'text-green-400'],
                        falta:            ['FALTA',      'text-orange-400'],
                        tarjeta_amarilla: ['AMARILLA',   'text-yellow-400'],
                        tarjeta_azul:     ['AZUL',       'text-blue-400'],
                        tarjeta_roja:     ['ROJA',       'text-red-400'],
                        timeout:          ['T.MUERTO',   'text-purple-400']
                      };
                      const [evLabel, evColor] = eventLabels[e.eventType] || [e.eventType.toUpperCase(), 'text-zinc-300'];

                      return (
                        <div key={e.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs bg-zinc-700/30 px-2 py-1 rounded">
                          <span className="font-mono text-zinc-400 w-12">[{m}:{s.toString().padStart(2, '0')}]</span>
                          <span className={`font-bold w-16 sm:w-20 truncate ${teamColor}`}>{teamN}</span>
                          <span className={`font-bold w-16 ${evColor}`}>{evLabel}</span>
                          <span className="text-white shrink-0">#{e.actor}</span>
                          {e.details && <span className="text-zinc-500 truncate flex-1 min-w-[100px]">- {e.details}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {(state.matchLog || []).length === 0 && <p className="text-zinc-500 text-xs text-center py-2">Sin incidencias registradas</p>}
          </div>

          {/* 5. Posesión y tiempos — el dato que no trae una planilla de papel */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
            <h3 className="text-yellow-400 font-bold text-sm mb-2">POSESIÓN Y TIEMPOS</h3>

            {posTotal > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-blue-400 truncate max-w-[40%]">{homeTeamName}</span>
                  <span className="text-zinc-500">POSESIÓN</span>
                  <span className="text-red-400 truncate max-w-[40%] text-right">{awayTeamName}</span>
                </div>
                <div className="flex h-6 rounded overflow-hidden border border-zinc-600">
                  <div className="bg-blue-600 flex items-center justify-center text-[11px] font-black"
                    style={{ width: `${pct(posHome)}%` }}>
                    {pct(posHome) >= 12 && `${pct(posHome)}%`}
                  </div>
                  <div className="bg-red-600 flex items-center justify-center text-[11px] font-black"
                    style={{ width: `${pct(posAway)}%` }}>
                    {pct(posAway) >= 12 && `${pct(posAway)}%`}
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
                  <span>{mmss(posHome)}</span>
                  <span>{mmss(posAway)}</span>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-zinc-500">
                No se registró posesión: los relojes de 45 no se usaron en este partido.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-zinc-900 rounded p-2">
                <p className="text-zinc-500 text-[10px]">HORA INICIO</p>
                <p className="font-black text-sm">{inicio ? inicio.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
              </div>
              <div className="bg-zinc-900 rounded p-2">
                <p className="text-zinc-500 text-[10px]">HORA TÉRMINO</p>
                <p className="font-black text-sm">{fin ? fin.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
              </div>
              <div className="bg-zinc-900 rounded p-2">
                <p className="text-zinc-500 text-[10px]">DURACIÓN REAL</p>
                <p className="font-black text-sm">{duracionReal !== null ? mmss(duracionReal) : '—'}</p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5">
              Tiempo de juego reglamentario: {mmss(tiempoJuego)}
              {duracionReal !== null && duracionReal > tiempoJuego &&
                ` · en cancha: ${mmss(duracionReal - tiempoJuego)} de más entre descansos, tiempos muertos y detenciones`}
            </p>
          </div>

          {/* 6. Faltas Acumuladas */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
            <h3 className="text-yellow-400 font-bold text-sm mb-2">FALTAS ACUMULADAS</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
                <p className="text-zinc-400 text-xs truncate px-2">{homeTeamName}</p>
                <p className="text-4xl font-black text-blue-400">{state.homeFouls}</p>
              </div>
              <div className="bg-red-900/20 border border-red-700 rounded p-3">
                <p className="text-zinc-400 text-xs truncate px-2">{awayTeamName}</p>
                <p className="text-4xl font-black text-red-400">{state.awayFouls}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie fijo: guardar y seguir. Sin firmas ni sello: disponible
            apenas termina el partido, sin bajar hasta el fondo. */}
        <div className="shrink-0 border-t border-zinc-800 bg-black p-3 flex gap-2">
          <Button onClick={() => { onSaveMatchToHistory(); onClose() }}
            className="flex-1 h-11 bg-purple-600 hover:bg-purple-500 font-bold">
            <Save className="w-4 h-4 mr-2" /> Guardar en historial
          </Button>
          <Button onClick={nuevoPartido}
            className={`flex-1 h-11 font-bold ${confirmarNuevo ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {confirmarNuevo ? 'El partido sigue en juego: toca otra vez' : 'Guardar y nuevo partido'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
