"use client"

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { Download, FileText, X, CheckCircle2, AlertTriangle, Save, RotateCcw, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SignatureCanvas } from './SignatureCanvas'
import type { GameState, Player, Period, ClosingSignatureData, CardHistory } from '@/hooks/use-game-state'

const OBS_KEY = 'ardi-planilla-observaciones'

export interface OfficialSheetModalProps {
  open: boolean
  onClose: () => void
  state: GameState
  homeTeamName: string
  awayTeamName: string
  matchEnded: boolean
  setSigningClosingRole: (role: keyof ClosingSignatureData | null) => void
  onSaveMatchToHistory: () => void
  onSaveAndReset?: () => void
  planillaLocked?: boolean
  onLockPlanilla?: () => void
}

export function OfficialSheetModal({
  open, onClose, state,
  homeTeamName, awayTeamName,
  matchEnded, setSigningClosingRole, onSaveMatchToHistory, onSaveAndReset,
  planillaLocked: lockedProp, onLockPlanilla,
}: OfficialSheetModalProps) {

  const [localLocked, setLocalLocked]   = useState(false)
  const planillaLocked = lockedProp ?? localLocked
  const [forzarCierre, setForzarCierre] = useState(false)

  // Observaciones persistentes: sobreviven a cerrar el modal y a una recarga
  const [observacionesArbitro, setObservacionesArbitro]   = useState('')
  const [observacionesDirector, setObservacionesDirector] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OBS_KEY)
      if (raw) {
        const o = JSON.parse(raw)
        setObservacionesArbitro(o.arbitro || '')
        setObservacionesDirector(o.director || '')
      }
    } catch { /* ignorar */ }
  }, [])

  const saveObs = (arbitro: string, director: string) => {
    setObservacionesArbitro(arbitro)
    setObservacionesDirector(director)
    try { localStorage.setItem(OBS_KEY, JSON.stringify({ arbitro, director })) } catch { /* ignorar */ }
  }

  const allClosingSignaturesComplete = useMemo(() => {
    const sigs = state.matchConfig.closingSignatures
    return !!(
      sigs?.capitanLocal && sigs?.capitanVisita &&
      sigs?.dtLocal && sigs?.dtVisita &&
      sigs?.encargadoCancha && sigs?.arbitroCronometrista &&
      sigs?.arbitroPrincipal && sigs?.arbitroAuxiliar
    )
  }, [state.matchConfig.closingSignatures])

  // ─── Helpers de Formato ───────────────────────────────────────────────────
  const fmtTime  = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const fmtStamp = (ts?: string) => ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'

  // CSV: Devuelve texto plano (ej: "1T 25:00")
  const formatCardTimeText = (card?: CardHistory) => {
    if (!card) return '';
    const m = Math.floor(card.gameTime / 60);
    const s = (card.gameTime % 60).toString().padStart(2, '0');
    const pLabel = card.period === '1er_tiempo' ? '1T' : card.period === '2do_tiempo' ? '2T' : card.period === 'alargue' ? 'ET' : 'PEN';
    return `${pLabel} ${m}:${s}`;
  };

  // UI: Devuelve un div apilado para ahorrar ancho en pantalla
  const getCardUI = (playerId: string, playerNumber: string, cardType: 'yellow' | 'blue' | 'red', index: number, isBench: boolean, team: 'home' | 'away') => {
    const cards = (state.cardHistory || []).filter(c =>
      c.team === team && (c.playerNumber === playerNumber || c.staffId === playerId) && c.cardType === cardType && c.isBench === isBench
    );
    const card = cards[index];
    if (!card) return <span className="opacity-10">-</span>; 

    const m = Math.floor(card.gameTime / 60);
    const s = (card.gameTime % 60).toString().padStart(2, '0');
    const pLabel = card.period === '1er_tiempo' ? '1T' : card.period === '2do_tiempo' ? '2T' : card.period === 'alargue' ? 'ET' : 'PEN';

    return (
      <div className="flex flex-col items-center justify-center leading-tight py-0.5">
        <span className="text-[9px] opacity-70 font-sans tracking-widest">{pLabel}</span>
        <span className="font-mono text-[11px] font-bold">{m}:{s}</span>
      </div>
    );
  };

  const separatePlayers = (players: Player[]) => ({
    court: players.filter(p => !['dt', 'ay1', 'ay2', 'ax1', 'ax2'].includes((p.role as string) || '')),
    bench: players.filter(p => ['dt', 'ay1', 'ay2', 'ax1', 'ax2'].includes((p.role as string) || ''))
  })

  // Escapa cualquier campo: comas, comillas y saltos de linea rompen el CSV
  const q = (v: unknown) => {
    const t = (v ?? '').toString()
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }

  // ─── Exportar CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    const allGoals = (state.matchLog || []).filter(e => e.eventType === 'gol').sort((a, b) => {
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
        period: g.period === '1er_tiempo' ? '1T' : g.period === '2do_tiempo' ? '2T' : g.period === 'alargue' ? 'ET' : 'PEN',
        time: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
        player: `#${g.actor}`,
        team: g.team === 'home' ? homeTeamName : awayTeamName,
        score: `${cH}-${cA}`
      }
    })

    let csv = '═══════════════════════════════════════════════════════════════════════════\n'
    csv += '                    PLANILLA OFICIAL DE JUEGO - FEDERACION 2026\n'
    csv += '═══════════════════════════════════════════════════════════════════════════\n\n'
    csv += 'ENCABEZADO OFICIAL\n'
    const matchDate = state.timestamps?.matchStart ? new Date(state.timestamps.matchStart) : new Date()
    csv += `Campeonato,${q(state.matchConfig.campeonato || 'Liga Regular')}\n`
    csv += `Partido N,${q(state.matchConfig.partidoNumero || '1')}\n`
    csv += `Fecha,${matchDate.toLocaleDateString('es-CL')}\n`
    csv += `Hora Inicio,${fmtStamp(state.timestamps?.matchStart)}\n`
    csv += `Serie,${q(state.matchConfig.seriesName)}\n`
    csv += `Rama,${q(state.matchConfig.gender)}\n\n`
    csv += 'CUERPO ARBITRAL\n'
    csv += `Arbitro Principal,${q(state.matchConfig.referees?.principal || '')}\n`
    csv += `Segundo Arbitro,${q(state.matchConfig.referees?.segundo || '')}\n`
    csv += `Arbitro Auxiliar,${q(state.matchConfig.referees?.auxiliar || '')}\n`
    csv += `Cronometrista,${q(state.matchConfig.referees?.cronometrista || '')}\n`
    csv += `Encargado Pista,${q(state.matchConfig.referees?.encargadoPista || '')}\n\n`

    // Bloque de lectura automatica: lo que consume "Reanudar partido suspendido"
    const periodKey = state.period
    csv += 'REANUDACION (LECTURA AUTOMATICA)\n'
    csv += `Periodo Reanudacion,${periodKey}\n`
    csv += `Minuto Reanudacion,${Math.floor(state.mainClock / 60).toString().padStart(2, '0')}:${(state.mainClock % 60).toString().padStart(2, '0')}\n`
    csv += `Resultado Local,${state.homeScore}\n`
    csv += `Resultado Visita,${state.awayScore}\n`
    csv += `Faltas Local,${state.homeFouls}\n`
    csv += `Faltas Visita,${state.awayFouls}\n\n`

    csv += 'CONTROL HORARIO Y GOLES POR PERIODO\n'
    if (goalsData.length === 0) {
      csv += 'N de Gol,-\nPeriodo,-\nMinuto,-\nJugador,-\nEquipo,-\nMarcador,-\n\n'
    } else {
      csv += `N de Gol,${goalsData.map(g => g.num).join(',')}\n`
      csv += `Periodo,${goalsData.map(g => g.period).join(',')}\n`
      csv += `Minuto,${goalsData.map(g => g.time).join(',')}\n`
      csv += `Jugador,${goalsData.map(g => g.player).join(',')}\n`
      csv += `Equipo,${goalsData.map(g => q(g.team)).join(',')}\n`
      csv += `Marcador,${goalsData.map(g => `'${g.score}`).join(',')}\n\n`
    }

    const gh = (p: Period) => (state.matchLog || []).filter(e => e.team === 'home' && e.eventType === 'gol' && e.period === p).length
    const ga = (p: Period) => (state.matchLog || []).filter(e => e.team === 'away' && e.eventType === 'gol' && e.period === p).length
    const tieBreak = state.homeScore === state.awayScore && (state.homePenalties > 0 || state.awayPenalties > 0)
    csv += 'RESUMEN POR PERIODO\n'
    csv += `1T,${gh('1er_tiempo')} - ${ga('1er_tiempo')}\n`
    csv += `2T,${gh('2do_tiempo')} - ${ga('2do_tiempo')}\n`
    if (state.matchConfig.allowOvertime || gh('alargue') + ga('alargue') > 0) {
      csv += `ET,${gh('alargue')} - ${ga('alargue')}\n`
    }
    if (state.matchConfig.allowPenalties || state.homePenalties > 0 || state.awayPenalties > 0) {
      csv += `TANDA DE PENALES,${state.homePenalties} - ${state.awayPenalties}\n`
    }
    csv += `RESULTADO FINAL,${state.homeScore} - ${state.awayScore}${tieBreak ? ` (Penales ${state.homePenalties}-${state.awayPenalties})` : ''}\n\n`
    csv += 'RESULTADO FINAL\n'
    csv += `${q(homeTeamName)},${state.homeScore}\n${q(awayTeamName)},${state.awayScore}\n`
    if (tieBreak) csv += `Definicion por penales,${state.homePenalties} - ${state.awayPenalties}\n`
    if (state.winner) csv += `Ganador,${q(state.winner === 'draw' ? 'EMPATE' : state.winner === 'home' ? homeTeamName : awayTeamName)}\n`
    csv += '\n'

    // Grillas de jugadores CSV (Con texto plano "1T 25:00")
    ;([{ team: 'home' as const, name: homeTeamName }, { team: 'away' as const, name: awayTeamName }]).forEach(({ team: t, name }) => {
      csv += `${q('=== ' + name.toUpperCase() + ' ===')}\n`
      csv += 'N Camiseta,Nombre y Apellido,RUT,BANCA Am1,BANCA Am2,BANCA R,PISTA Am1,PISTA Am2,PISTA Am3,PISTA Am4,PISTA Az1,PISTA Az2,PISTA Az3,PISTA R\n'
      const sep = separatePlayers(t === 'home' ? (state.matchConfig.homePlayers || []) : (state.matchConfig.awayPlayers || []))
      
      const getGridRowText = (pNum: string, pId: string, isBench: boolean) => {
        const cards = (state.cardHistory || []).filter(c => c.team === t && (c.playerNumber === pNum || c.staffId === pId))
        const getT = (type: 'yellow' | 'blue' | 'red', idx: number) => formatCardTimeText(cards.filter(c => c.cardType === type && c.isBench === isBench)[idx])
        if (isBench) return `${getT('yellow',0)},${getT('yellow',1)},${getT('red',0)},-,-,-,-,-,-,-,-`
        return `-,-,-,${getT('yellow',0)},${getT('yellow',1)},${getT('yellow',2)},${getT('yellow',3)},${getT('blue',0)},${getT('blue',1)},${getT('blue',2)},${getT('red',0)}`
      }

      csv += '--- JUGADORES DE PISTA ---\n'
      sep.court.forEach(p => csv += `${q(p.number)},${q(p.name)},${q(p.rut || '')},${getGridRowText(p.number, p.id, false)}\n`)
      csv += '--- BANCA (DT/AY1/AY2/AX1/AX2) ---\n'
      sep.bench.forEach(p => {
        const label = p.role === 'dt' ? 'DT' : p.role === 'ay1' ? 'AY1' : p.role === 'ay2' ? 'AY2' : p.role === 'ax1' ? 'AX1' : 'AX2'
        csv += `${label},${q(p.name)},${q(p.rut || '')},${getGridRowText(label, p.id, true)}\n`
      })
      csv += '\n'
    })

    csv += '═══════════════ REGISTRO CRONOLOGICO DE INCIDENCIAS ═══════════════\n'
    ;(['1er_tiempo', '2do_tiempo', 'alargue', 'penales'] as Period[]).forEach(key => {
      const label = key === '1er_tiempo' ? '1ER TIEMPO' : key === '2do_tiempo' ? '2DO TIEMPO' : key === 'alargue' ? 'ALARGUE/PRORROGA' : 'TANDA DE PENALES'
      const events = (state.matchLog || []).filter(e => e.period === key).sort((a, b) => b.gameTime - a.gameTime)
      if (events.length > 0) {
        csv += `\n--- ${label} ---\nMinuto,Equipo,Evento,Actor,Detalles\n`
        events.forEach(e => {
          const teamN = e.team === 'home' ? homeTeamName : e.team === 'away' ? awayTeamName : 'SISTEMA'
          
          // FIX TYPESCRIPT: Uso de Record<string, string> para compilar en Vercel
          const eventLabels: Record<string, string> = {
            gol: 'GOL', falta: 'FALTA',
            tarjeta_amarilla: 'TARJETA AMARILLA', tarjeta_azul: 'TARJETA AZUL', tarjeta_roja: 'TARJETA ROJA',
            timeout: 'TIEMPO MUERTO', periodo: 'PERIODO', inicio: 'INICIO', fin: 'FIN',
            penal: 'PENAL', penal_ronda: 'RONDA DE PENALES', cambio: 'CAMBIO'
          };
          const evLabel = eventLabels[e.eventType] || e.eventType.toUpperCase();
          
          csv += `${fmtTime(e.gameTime)},${q(teamN)},${evLabel},${q(e.actor)},${q(e.details || '')}\n`
        })
      }
    })

    csv += '\nFALTAS ACUMULADAS\n'
    csv += `${q(homeTeamName)},${state.homeFouls}\n${q(awayTeamName)},${state.awayFouls}\n\n`
    csv += 'OBSERVACIONES\n'
    csv += `Delegados,${q(observacionesArbitro)}\n`
    csv += `Director de Turno,${q(observacionesDirector)}\n\n`
    csv += 'ESTADO DE PLANILLA\n'
    if (forzarCierre) csv += 'Estado,CIERRE FORZADO (Partido Suspendido / Falta de Firmas)\n'
    else if (planillaLocked) csv += 'Estado,PLANILLA SELLADA CON TODAS LAS FIRMAS (8/8)\n'
    else csv += 'Estado,PENDIENTE DE FIRMAS\n'

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `planilla_${homeTeamName}_vs_${awayTeamName}_${new Date().toISOString().split('T')[0]}_${crypto.randomUUID().slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-zinc-900 border-zinc-700 text-white w-[98vw] max-w-6xl max-h-[95vh] h-[95vh] p-0 flex flex-col overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="sr-only"><DialogTitle>Planilla Oficial de Juego</DialogTitle></DialogHeader>

        {/* Cabecera Fija Responsiva */}
        <div className="bg-black p-3 sm:p-4 border-b-2 border-yellow-600 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
          <div className="pr-6">
            <h2 className="text-xl sm:text-2xl font-black text-yellow-400 leading-tight">PLANILLA OFICIAL DE JUEGO</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">Federación Hockey Patín Chile 2026</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportCSV} className="bg-green-600 hover:bg-green-500 font-bold h-9">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button onClick={() => window.print()} variant="outline" className="border-zinc-600 h-9">
              <FileText className="w-4 h-4 mr-2" /> PDF
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
              <div><span className="text-zinc-500 text-xs block">FECHA</span><p className="font-bold">{new Date().toLocaleDateString('es-CL')}</p></div>
              <div><span className="text-zinc-500 text-xs block">SERIE</span><p className="font-bold">{state.matchConfig.seriesName}</p></div>
              <div><span className="text-zinc-500 text-xs block">RAMA</span><p className="font-bold">{state.matchConfig.gender}</p></div>
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

          { planillaLocked && (
            <div className="bg-green-900/30 border-2 border-green-600 p-3 rounded-lg text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-1" />
              <h3 className="text-green-400 font-black">PLANILLA SELLADA Y BLOQUEADA</h3>
            </div>
          )}

          {/* 2. Control Horario y Goles */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 w-full">
            <h3 className="text-yellow-400 font-bold text-sm mb-3">CONTROL HORARIO Y GOLES POR PERIODO</h3>
            
            <div className="w-full overflow-x-auto pb-2 border-b border-zinc-700">
              {(() => {
                const allGoals = (state.matchLog || []).filter(e => e.eventType === 'gol').sort((a, b) => {
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
                    period: g.period === '1er_tiempo' ? '1T' : g.period === '2do_tiempo' ? '2T' : g.period === 'alargue' ? 'ET' : 'PEN',
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
                {(['1er_tiempo', '2do_tiempo', 'alargue'] as Period[]).map((p, i) => {
                  const gh = (state.matchLog || []).filter(e => e.team === 'home' && e.eventType === 'gol' && e.period === p).length
                  const ga = (state.matchLog || []).filter(e => e.team === 'away' && e.eventType === 'gol' && e.period === p).length
                  const label = ['1T', '2T', 'ET'][i]
                  return (
                    <div key={p} className="flex flex-col border border-zinc-800 rounded overflow-hidden min-w-[50px] text-center">
                      <span className="bg-zinc-800 text-zinc-400 py-0.5 text-[10px]">{label}</span>
                      <span className="py-1 bg-zinc-900 text-sm"><span className="text-blue-400">{gh}</span><span className="text-zinc-600 mx-1">-</span><span className="text-amber-400">{ga}</span></span>
                    </div>
                  )
                })}
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
            {(['1er_tiempo', '2do_tiempo', 'alargue'] as Period[]).map(period => {
              const events = (state.matchLog || []).filter(e => e.period === period).sort((a, b) => b.gameTime - a.gameTime)
              if (events.length === 0) return null
              const periodLabel = period === '1er_tiempo' ? '1ER TIEMPO' : period === '2do_tiempo' ? '2DO TIEMPO' : 'ALARGUE'
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

          {/* 5. Faltas Acumuladas */}
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

          {/* 6. Firmas de Cierre */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
            <h3 className="text-yellow-400 font-bold text-sm mb-3">FIRMAS DE CIERRE (8 Obligatorias)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                { key: 'capitanLocal'        as const, label: `1. Capitán ${homeTeamName}` },
                { key: 'capitanVisita'       as const, label: `2. Capitán ${awayTeamName}` },
                { key: 'dtLocal'             as const, label: `3. DT ${homeTeamName}` },
                { key: 'dtVisita'            as const, label: `4. DT ${awayTeamName}` },
                { key: 'encargadoCancha'     as const, label: '5. Encargado Cancha' },
                { key: 'arbitroCronometrista' as const, label: '6. Cronometrista' },
                { key: 'arbitroPrincipal'    as const, label: '7. Árbitro Principal' },
                { key: 'arbitroAuxiliar'     as const, label: '8. Árbitro Auxiliar' },
              ]).map(({ key, label }) => (
                <div key={key} className={`border-2 rounded-lg p-2 text-center ${state.matchConfig.closingSignatures?.[key] ? 'border-green-600 bg-green-950/20' : 'border-zinc-600'}`}>
                  <p className="text-xs text-zinc-400 mb-1 truncate px-1" title={label}>{label}</p>
                  {state.matchConfig.closingSignatures?.[key] ? (
                    <Image src={state.matchConfig.closingSignatures[key]!} alt="Firma" width={80} height={40} className="mx-auto border border-zinc-600 rounded bg-white" />
                  ) : (
                    <Button onClick={() => setSigningClosingRole(key)} variant="outline" size="sm" className="border-zinc-600 w-full">
                      <PenTool className="w-3 h-3 mr-1" /> Firmar
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 border border-red-800 rounded-lg bg-red-950/20">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={forzarCierre} onChange={e => setForzarCierre(e.target.checked)} className="w-4 h-4 accent-red-500 shrink-0" />
                <span className="text-red-400 font-bold text-xs">Forzar cierre (Partido suspendido / Falta de firmas)</span>
              </label>
            </div>
          </div>

          {/* 7. Observaciones */}
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3">
            <h3 className="text-yellow-400 font-bold text-sm mb-2">OBSERVACIONES</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Observaciones Delegados</label>
                <textarea value={observacionesArbitro} onChange={e => saveObs(e.target.value, observacionesDirector)} disabled={planillaLocked}
                  placeholder="Observaciones de los delegados..."
                  className="w-full h-20 bg-zinc-900 border border-zinc-600 rounded p-2 text-xs resize-none disabled:opacity-50" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Observaciones Director de Turno</label>
                <textarea value={observacionesDirector} onChange={e => saveObs(observacionesArbitro, e.target.value)} disabled={planillaLocked}
                  placeholder="Observaciones del director de turno..."
                  className="w-full h-20 bg-zinc-900 border border-zinc-600 rounded p-2 text-xs resize-none disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 pb-4">
            {!planillaLocked && matchEnded && (
              <Button onClick={() => { setLocalLocked(true); onLockPlanilla?.(); exportCSV(); }} disabled={!allClosingSignaturesComplete && !forzarCierre} className={`w-full h-12 font-black ${(allClosingSignaturesComplete || forzarCierre) ? 'bg-green-600 hover:bg-green-500' : 'bg-zinc-700 cursor-not-allowed'}`}>
                {(allClosingSignaturesComplete || forzarCierre) ? <><CheckCircle2 className="w-5 h-5 mr-2" /> SELLAR Y EXPORTAR PLANILLA</> : <><AlertTriangle className="w-5 h-5 mr-2" /> COMPLETE LAS 8 FIRMAS O MARQUE EXCEPCIÓN</>}
              </Button>
            )}
            {planillaLocked && (
              <div className="flex gap-2">
                <Button onClick={exportCSV} className="flex-1 h-12 bg-green-600 hover:bg-green-500 font-black"><Download className="w-5 h-5 mr-2" /> DESCARGAR CSV</Button>
                <Button onClick={() => window.print()} className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 font-black"><FileText className="w-5 h-5 mr-2" /> IMPRIMIR PDF</Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => { onSaveMatchToHistory(); onClose() }} className="flex-1 h-10 bg-purple-600 hover:bg-purple-500 font-bold"><Save className="w-4 h-4 mr-2" /> Historial</Button>
              <Button onClick={() => { onSaveAndReset?.(); onClose() }}    className="flex-1 h-10 bg-amber-600 hover:bg-amber-500 font-bold"><RotateCcw className="w-4 h-4 mr-2" /> Nuevo</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}