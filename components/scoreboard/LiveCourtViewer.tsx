"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Move, ChevronRight, ArrowRightLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Player, Sanction, Period, CardHistory } from '@/hooks/use-game-state'

export interface LiveCourtViewerProps {
  homePlayers: Player[]
  awayPlayers: Player[]
  homeRoster: string[]
  awayRoster: string[]
  homeTeamName: string
  awayTeamName: string
  sanctions: Sanction[]
  period: Period
  cardHistory?: CardHistory[]
}

export function LiveCourtViewer({
  homePlayers, awayPlayers, homeRoster, awayRoster,
  homeTeamName, awayTeamName, sanctions, period, cardHistory = []
}: LiveCourtViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  // Diseñador de camisetas
  const [homeC1, setHomeC1]         = useState('#2563eb')
  const [homeC2, setHomeC2]         = useState('#ffffff')
  const [homeDesign, setHomeDesign] = useState('solid')
  const [awayC1, setAwayC1]         = useState('#f59e0b')
  const [awayC2, setAwayC2]         = useState('#000000')
  const [awayDesign, setAwayDesign] = useState('solid')

  const [homeCourtIds, setHomeCourtIds] = useState<string[]>([])
  const [awayCourtIds, setAwayCourtIds] = useState<string[]>([])

  const formatSanctionTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const homePlayersList = useMemo(() =>
    homePlayers.length > 0
      ? homePlayers
      : homeRoster.map((num, i) => ({ id: `home-${i}`, number: num, name: '', rut: '', position: '' as const, role: 'jugador_pista' as const })),
    [homePlayers, homeRoster])

  const awayPlayersList = useMemo(() =>
    awayPlayers.length > 0
      ? awayPlayers
      : awayRoster.map((num, i) => ({ id: `away-${i}`, number: num, name: '', rut: '', position: '' as const, role: 'jugador_pista' as const })),
    [awayPlayers, awayRoster])

  // Auto-flip por periodo
  useEffect(() => {
    setIsFlipped(period === '2do_tiempo' || period === 'penales')
  }, [period])

  const resetTacticalBoard = useCallback(() => {
    const getInitialCourt = (players: Player[]) => {
      const elegibles = players.filter(p => !['dt', 'ay1', 'ay2', 'ax1', 'ax2', 'suplente'].includes((p.role as string) || ''))
      const portero   = elegibles.find(p => p.role === 'portero' || p.position === 'PO')
      const jugadores = elegibles.filter(p => p.role !== 'portero' && p.position !== 'PO').slice(0, 4)
      return [...(portero ? [portero] : []), ...jugadores].map(p => p.id)
    }
    setHomeCourtIds(getInitialCourt(homePlayersList))
    setAwayCourtIds(getInitialCourt(awayPlayersList))
  }, [homePlayersList, awayPlayersList])

  useEffect(() => {
    if (homeCourtIds.length === 0 && homePlayersList.length > 0) resetTacticalBoard()
  }, [homePlayersList, homeCourtIds.length, resetTacticalBoard])

  // Sanciones activas
  const activeHomeSanctions = sanctions.filter(s => s.team === 'home' && s.remainingTime > 0 && !s.isBench)
  const activeAwaySanctions = sanctions.filter(s => s.team === 'away' && s.remainingTime > 0 && !s.isBench)
  const blueSanctionsHome   = activeHomeSanctions.filter(s => s.type === 'blue')
  const blueSanctionsAway   = activeAwaySanctions.filter(s => s.type === 'blue')
  const redSanctionsHome    = activeHomeSanctions.filter(s => s.type === 'red')
  const redSanctionsAway    = activeAwaySanctions.filter(s => s.type === 'red')

  const expelledHomeNumbers = Array.from(new Set([
    ...cardHistory.filter(c => c.team === 'home' && c.cardType === 'red').map(c => c.playerNumber),
    ...cardHistory.filter(c => c.team === 'home' && c.cardType === 'red').map(c => c.staffId),
    ...sanctions.filter(s => s.team === 'home' && s.type === 'red').map(s => s.playerNumber),
    ...sanctions.filter(s => s.team === 'home' && s.type === 'red').map(s => s.staffId)
  ])).filter(Boolean) as string[]

  const expelledAwayNumbers = Array.from(new Set([
    ...cardHistory.filter(c => c.team === 'away' && c.cardType === 'red').map(c => c.playerNumber),
    ...cardHistory.filter(c => c.team === 'away' && c.cardType === 'red').map(c => c.staffId),
    ...sanctions.filter(s => s.team === 'away' && s.type === 'red').map(s => s.playerNumber),
    ...sanctions.filter(s => s.team === 'away' && s.type === 'red').map(s => s.staffId)
  ])).filter(Boolean) as string[]

  const penalizedHomeNumbers = Array.from(new Set([
    ...blueSanctionsHome.map(s => s.playerNumber),
    ...blueSanctionsHome.map(s => s.staffId)
  ])).filter(Boolean) as string[]

  const penalizedAwayNumbers = Array.from(new Set([
    ...blueSanctionsAway.map(s => s.playerNumber),
    ...blueSanctionsAway.map(s => s.staffId)
  ])).filter(Boolean) as string[]

  const isPlayerAvailable = (p: Player, team: 'home' | 'away') => {
    const displayNumber = p.role === 'dt' ? 'DT' : p.role === 'ay1' ? 'AY1' : p.role === 'ay2' ? 'AY2' : p.role === 'ax1' ? 'AX1' : p.role === 'ax2' ? 'AX2' : p.number
    const expelled   = team === 'home' ? expelledHomeNumbers  : expelledAwayNumbers
    const penalized  = team === 'home' ? penalizedHomeNumbers : penalizedAwayNumbers
    if (expelled.includes(displayNumber) || expelled.includes(p.number) || expelled.includes(p.id)) return false
    if (!['dt', 'ay1', 'ay2', 'ax1', 'ax2', 'suplente'].includes((p.role as string) || '')) {
      if (penalized.includes(displayNumber) || penalized.includes(p.number) || penalized.includes(p.id)) return false
    }
    return true
  }

  // 🛡️ REGLAMENTO WORLD SKATE 2026: El mínimo legal y matemático en pista es 4.
  const MIN_TOTAL_PLAYERS = 4 
  const MAX_HOME_ALLOWED  = Math.max(MIN_TOTAL_PLAYERS, 5 - blueSanctionsHome.length - redSanctionsHome.length)
  const MAX_AWAY_ALLOWED  = Math.max(MIN_TOTAL_PLAYERS, 5 - blueSanctionsAway.length - redSanctionsAway.length)

  // ─── Lógica de click reglamentaria — toast en vez de alert() ──────────────
  const togglePlayerPosition = (player: Player, team: 'home' | 'away') => {
    const isHome      = team === 'home'
    const courtIds    = isHome ? homeCourtIds    : awayCourtIds
    const setCourtIds = isHome ? setHomeCourtIds : setAwayCourtIds
    const playersList = isHome ? homePlayersList : awayPlayersList
    const maxAllowed  = isHome ? MAX_HOME_ALLOWED : MAX_AWAY_ALLOWED

    if (['dt', 'ay1', 'ay2', 'ax1', 'ax2'].includes(player.role as string)) {
      toast.warning('REGLA TÁCTICA: El Cuerpo Técnico no puede ingresar a la pista.')
      return
    }

    const currentOnCourt = playersList.filter(p => courtIds.includes(p.id) && isPlayerAvailable(p, team))
    const goaliesCount   = currentOnCourt.filter(p => p.role === 'portero' || p.position === 'PO').length
    const totalCount     = currentOnCourt.length

    if (courtIds.includes(player.id)) {
      // 🛡️ Bloqueo exacto: No puedes bajar de 4 jugadores manualmente.
      if (totalCount <= MIN_TOTAL_PLAYERS) {
        toast.warning(`REGLA: El equipo no puede quedar con menos de ${MIN_TOTAL_PLAYERS} jugadores en pista.`)
        return
      }
      setCourtIds(prev => prev.filter(id => id !== player.id))
      return
    }

    if (player.role === 'portero' || player.position === 'PO') {
      if (goaliesCount >= 1) {
        toast.warning('REGLA TÁCTICA: Solo puede haber 1 portero en la pista.')
        return
      }
    }

    if (totalCount >= maxAllowed) {
      toast.warning(`LÍMITE ALCANZADO: Por las tarjetas activas, el máximo permitido en cancha es ${maxAllowed}.`)
      return
    }

    setCourtIds(prev => [...prev, player.id])
  }

  // Cálculos tácticos finales
  const homeFieldPlayers = homePlayersList.filter(p => homeCourtIds.includes(p.id) && isPlayerAvailable(p, 'home') && p.role !== 'portero' && p.position !== 'PO')
  const homeGoalie       = homePlayersList.find(p  => homeCourtIds.includes(p.id) && isPlayerAvailable(p, 'home') && (p.role === 'portero' || p.position === 'PO'))
  const awayFieldPlayers = awayPlayersList.filter(p => awayCourtIds.includes(p.id) && isPlayerAvailable(p, 'away') && p.role !== 'portero' && p.position !== 'PO')
  const awayGoalie       = awayPlayersList.find(p  => awayCourtIds.includes(p.id) && isPlayerAvailable(p, 'away') && (p.role === 'portero' || p.position === 'PO'))

  const homeOnCourtCount = homeFieldPlayers.length + (homeGoalie ? 1 : 0)
  const awayOnCourtCount = awayFieldPlayers.length + (awayGoalie ? 1 : 0)
  const isHomePowerPlay  = (blueSanctionsAway.length > 0 || redSanctionsAway.length > 0) && homeOnCourtCount > awayOnCourtCount
  const isAwayPowerPlay  = (blueSanctionsHome.length > 0 || redSanctionsHome.length > 0) && awayOnCourtCount > homeOnCourtCount

  // Máscara portero SVG
  const GoalieMask = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full opacity-60">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="8" cy="10" r="1.5" fill="#18181b" />
      <circle cx="16" cy="10" r="1.5" fill="#18181b" />
      <circle cx="12" cy="15" r="1"   fill="#18181b" />
      <circle cx="9"  cy="16" r="1"   fill="#18181b" />
      <circle cx="15" cy="16" r="1"   fill="#18181b" />
      <circle cx="12" cy="18" r="1"   fill="#18181b" />
      <path d="M12 2L12 8 M6 5L9 8 M18 5L15 8" stroke="#18181b" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )

  // Ficha visual "Funko Jersey"
  const FunkoToken = ({ p, isGoalie, c1, c2, design, team, onClick }: {
    p: Player; isGoalie: boolean; c1: string; c2: string; design: string; team: 'home' | 'away'; onClick: () => void
  }) => {
    const displayNumber = p.role === 'dt' ? 'DT' : p.role === 'ay1' ? 'AY1' : p.role === 'ay2' ? 'AY2' : p.role === 'ax1' ? 'AX1' : p.role === 'ax2' ? 'AX2' : p.number
    const yellowCountH  = cardHistory?.filter(c => c.team === team && c.cardType === 'yellow' && (c.playerNumber === p.number || c.playerNumber === displayNumber || c.staffId === p.id)).length || 0
    const yellowCountS  = sanctions.filter(s => s.team === team && s.type === 'yellow' && (s.playerNumber === p.number || s.playerNumber === displayNumber || s.staffId === p.id)).length
    const yellowCount   = Math.max(yellowCountH, yellowCountS)
    const isStaff       = ['dt', 'ay1', 'ay2', 'ax1', 'ax2', 'suplente'].includes(p.role as string)

    const bgStyle = design === 'striped'
      ? { background: `repeating-linear-gradient(90deg, ${c1}, ${c1} 6px, ${c2} 6px, ${c2} 12px)` }
      : design === 'halved'
      ? { background: `linear-gradient(90deg, ${c1} 50%, ${c2} 50%)` }
      : { background: c1 }

    const YellowCards = () => {
      if (yellowCount === 0) return null
      return (
        <div className="absolute -top-1 -left-1 sm:-top-1.5 sm:-left-1.5 flex -space-x-1.5 z-30 pointer-events-none drop-shadow-md">
          {Array.from({ length: yellowCount }).map((_, i) => (
            <div key={i} className="w-2.5 h-3.5 sm:w-3 sm:h-4 bg-yellow-400 border border-yellow-700 rounded-[1px] transform -rotate-12 shadow-sm" style={{ zIndex: 30 + i }} />
          ))}
        </div>
      )
    }

    if (isStaff) {
      return (
        <div onClick={onClick} className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shadow-lg cursor-pointer rounded-sm border-2 transition-transform hover:scale-110 active:scale-95 border-zinc-500 opacity-80 z-10" style={bgStyle} title="Cuerpo Técnico">
          <YellowCards />
          <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-black text-white">{displayNumber}</span>
        </div>
      )
    }

    return (
      <div onClick={onClick} className={`relative flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 group ${isGoalie ? 'mt-1' : ''}`} title={`${p.name || `Jugador ${p.number}`} — Click para mover`}>
        <YellowCards />
        <div className={`w-4 h-4 sm:w-5 sm:h-5 z-10 -mb-1.5 sm:-mb-2 border-2 shadow-sm flex items-center justify-center overflow-hidden ${isGoalie ? 'bg-zinc-200 border-zinc-400 rounded-md w-5 h-5 sm:w-6 sm:h-6 -mb-2 sm:-mb-3' : 'bg-white/80 border-white/80 rounded-full'}`} style={!isGoalie ? { backgroundColor: c1 } : { color: c1 }}>
          {isGoalie && <div className="w-full h-full text-zinc-100 flex items-center justify-center"><GoalieMask /></div>}
        </div>
        <div className={`w-7 h-6 sm:w-9 sm:h-7 rounded-t-xl rounded-b-md flex items-center justify-center shadow-[0_5px_15px_rgba(0,0,0,0.5)] pt-1 sm:pt-1.5 border-2 ${isGoalie ? 'border-white ring-1 ring-white/50 w-9 sm:w-11' : 'border-white/80'}`} style={bgStyle}>
          <span className="text-[10px] sm:text-[11px] font-black text-white bg-black/40 px-1 rounded-sm backdrop-blur-sm">{p.number}</span>
        </div>
        {p.role === 'capitan' && <div className="absolute top-0 -right-2 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[8px] sm:text-[10px] font-bold shadow-sm border border-yellow-600 z-20">C</div>}
        {isGoalie && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1 bg-green-600 rounded text-[6px] sm:text-[7px] text-white font-bold z-20 border border-green-400 shadow-sm">PO</div>}
      </div>
    )
  }

  if (homePlayersList.length === 0 && awayPlayersList.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shrink-0 shadow-xl w-full mt-4">
      {/* Header */}
      <div className="w-full p-3 flex flex-wrap items-center justify-between bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Move className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold tracking-widest uppercase text-sm sm:text-base">Pista Dinámica 2026</span>
            <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded transition-colors ${homeOnCourtCount >= 4 ? 'bg-blue-900/50 text-blue-400' : 'bg-red-900/50 text-red-400 animate-pulse border border-red-500'}`}>
            {isFlipped ? awayTeamName : homeTeamName}: {isFlipped ? awayOnCourtCount : homeOnCourtCount}/{isFlipped ? MAX_AWAY_ALLOWED : MAX_HOME_ALLOWED}
          </span>
          <Button onClick={() => setIsFlipped(!isFlipped)} size="icon" variant="outline" className="h-8 w-8 bg-zinc-800 border-zinc-700" title="Cambiar de Lado">
            <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
          </Button>
          <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded transition-colors ${awayOnCourtCount >= 4 ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400 animate-pulse border border-red-500'}`}>
            {!isFlipped ? awayTeamName : homeTeamName}: {!isFlipped ? awayOnCourtCount : homeOnCourtCount}/{!isFlipped ? MAX_AWAY_ALLOWED : MAX_HOME_ALLOWED}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-2 sm:p-4 pt-4 bg-zinc-900 flex flex-col items-center w-full overflow-hidden">

          {/* Creador de camisetas */}
          <div className="flex justify-between items-center w-full max-w-5xl mb-4 px-2 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800">
            <div className={`flex items-center gap-1 sm:gap-2 ${isFlipped ? 'order-last' : 'order-first'}`}>
              <span className="text-[10px] text-zinc-500 font-bold uppercase hidden sm:inline">{homeTeamName}</span>
              <input type="color" value={homeC1} onChange={e => setHomeC1(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" title="Color Primario" />
              <input type="color" value={homeC2} onChange={e => setHomeC2(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" title="Color Secundario" />
              <select value={homeDesign} onChange={e => setHomeDesign(e.target.value)} className="bg-zinc-800 text-[10px] text-white rounded border border-zinc-700 p-1.5 outline-none cursor-pointer shadow-sm">
                <option value="solid">Liso</option><option value="halved">Mitades</option><option value="striped">Rayas</option>
              </select>
            </div>
            <Button onClick={resetTacticalBoard} size="sm" variant="outline" className="h-8 text-[10px] border-zinc-700 bg-zinc-800 text-zinc-300 font-bold">
              <RotateCcw className="w-3 h-3 mr-1" /> REORDENAR FICHAS
            </Button>
            <div className={`flex items-center gap-1 sm:gap-2 ${isFlipped ? 'order-first' : 'order-last'}`}>
              <span className="text-[10px] text-zinc-500 font-bold uppercase hidden sm:inline">{awayTeamName}</span>
              <select value={awayDesign} onChange={e => setAwayDesign(e.target.value)} className="bg-zinc-800 text-[10px] text-white rounded border border-zinc-700 p-1.5 outline-none cursor-pointer shadow-sm">
                <option value="solid">Liso</option><option value="halved">Mitades</option><option value="striped">Rayas</option>
              </select>
              <input type="color" value={awayC1} onChange={e => setAwayC1(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" title="Color Primario" />
              <input type="color" value={awayC2} onChange={e => setAwayC2(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" title="Color Secundario" />
            </div>
          </div>

          {/* Cancha principal */}
          <div className={`w-full max-w-6xl aspect-[2.4/1] flex rounded-2xl overflow-hidden border-4 border-zinc-700 shadow-2xl ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Banca local */}
            <div className="w-[18%] bg-blue-950/20 border-r border-blue-500/30 p-2 flex flex-col items-center">
              <span className="text-[8px] text-blue-400 font-black tracking-widest mb-3 border-b border-blue-500/50 pb-1 w-full text-center">BANCA</span>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 overflow-y-auto h-full w-full content-start pt-2">
                {homePlayersList.filter(p => !homeCourtIds.includes(p.id) && isPlayerAvailable(p, 'home')).map(p => (
                  <FunkoToken key={p.id} p={p} team="home" c1={homeC1} c2={homeC2} design={homeDesign} isGoalie={p.role === 'portero' || p.position === 'PO'} onClick={() => togglePlayerPosition(p, 'home')} />
                ))}
              </div>
            </div>

            {/* Cancha central */}
            <div className="w-[64%] bg-slate-900 relative border-x-2 border-white/50">
              {isHomePowerPlay && <div className={`absolute ${isFlipped ? 'right-2' : 'left-2'} top-2 bg-green-500 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 rounded shadow-[0_0_10px_#22c55e] animate-pulse z-10`}>POWER PLAY</div>}
              {isAwayPowerPlay && <div className={`absolute ${isFlipped ? 'left-2' : 'right-2'} top-2 bg-green-500 text-white text-[8px] sm:text-[10px] font-black px-2 py-1 rounded shadow-[0_0_10px_#22c55e] animate-pulse z-10`}>POWER PLAY</div>}

              {/* Líneas de cancha */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 -translate-x-1/2" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] aspect-square border-2 border-white/30 rounded-full" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[18%] h-[45%] border-2 border-l-0 border-white/30" />
              <div className="absolute left-[18%] top-1/2 -translate-y-1/2 w-[12%] h-[25%] border-2 border-l-0 border-white/30 rounded-r-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-[12%] bg-red-600/60 border-r-2 border-red-500 shadow-[0_0_8px_red]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[18%] h-[45%] border-2 border-r-0 border-white/30" />
              <div className="absolute right-[18%] top-1/2 -translate-y-1/2 w-[12%] h-[25%] border-2 border-r-0 border-white/30 rounded-l-full" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-[12%] bg-red-600/60 border-l-2 border-red-500 shadow-[0_0_8px_red]" />

              {/* Portero local */}
              {homeGoalie && (
                <div className={`absolute -translate-y-1/2 -translate-x-1/2 transition-all duration-500 top-[50%] ${isFlipped ? 'right-[5%]' : 'left-[5%]'}`}>
                  <FunkoToken p={homeGoalie} team="home" c1={homeC1} c2={homeC2} design={homeDesign} isGoalie={true} onClick={() => togglePlayerPosition(homeGoalie, 'home')} />
                </div>
              )}
              {homeFieldPlayers.map((p, i) => {
                const positions = [{ top: '25%', left: '25%' }, { top: '75%', left: '25%' }, { top: '35%', left: '45%' }, { top: '65%', left: '45%' }]
                const pos = positions[i] || { top: '50%', left: '35%' }
                return (
                  <div key={p.id} className="absolute -translate-y-1/2 -translate-x-1/2 transition-all duration-500 z-10" style={{ top: pos.top, [isFlipped ? 'right' : 'left']: pos.left }}>
                    <FunkoToken p={p} team="home" c1={homeC1} c2={homeC2} design={homeDesign} isGoalie={false} onClick={() => togglePlayerPosition(p, 'home')} />
                  </div>
                )
              })}

              {/* Portero visita */}
              {awayGoalie && (
                <div className={`absolute -translate-y-1/2 -translate-x-1/2 transition-all duration-500 top-[50%] ${isFlipped ? 'left-[5%]' : 'right-[5%]'}`}>
                  <FunkoToken p={awayGoalie} team="away" c1={awayC1} c2={awayC2} design={awayDesign} isGoalie={true} onClick={() => togglePlayerPosition(awayGoalie, 'away')} />
                </div>
              )}
              {awayFieldPlayers.map((p, i) => {
                const positions = [{ top: '25%', right: '25%' }, { top: '75%', right: '25%' }, { top: '35%', right: '45%' }, { top: '65%', right: '45%' }]
                const pos = positions[i] || { top: '50%', right: '35%' }
                return (
                  <div key={p.id} className="absolute -translate-y-1/2 -translate-x-1/2 transition-all duration-500 z-10" style={{ top: pos.top, [isFlipped ? 'left' : 'right']: pos.right }}>
                    <FunkoToken p={p} team="away" c1={awayC1} c2={awayC2} design={awayDesign} isGoalie={false} onClick={() => togglePlayerPosition(p, 'away')} />
                  </div>
                )
              })}
            </div>

            {/* Banca visita */}
            <div className="w-[18%] bg-amber-950/20 border-l border-amber-500/30 p-2 flex flex-col items-center">
              <span className="text-[8px] text-amber-400 font-black tracking-widest mb-3 border-b border-amber-500/50 pb-1 w-full text-center">BANCA</span>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 overflow-y-auto h-full w-full content-start pt-2">
                {awayPlayersList.filter(p => !awayCourtIds.includes(p.id) && isPlayerAvailable(p, 'away')).map(p => (
                  <FunkoToken key={p.id} p={p} team="away" c1={awayC1} c2={awayC2} design={awayDesign} isGoalie={p.role === 'portero' || p.position === 'PO'} onClick={() => togglePlayerPosition(p, 'away')} />
                ))}
              </div>
            </div>
          </div>

          {/* Mesa de control */}
          <div className="w-full mt-6 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-zinc-800/50 py-1.5 border-b border-zinc-800 text-center flex justify-center items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">MESA DE CONTROL (CUMPLIMIENTO AZULES Y ROJAS)</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <div className={`flex min-h-[70px] w-full relative ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-600 shadow-[0_0_5px_red] -translate-x-1/2 z-10" />
              {[
                { sanctions: blueSanctionsHome, redS: redSanctionsHome, color: 'blue' },
                { sanctions: blueSanctionsAway, redS: redSanctionsAway, color: 'amber' }
              ].map(({ sanctions: blues, redS, color }, idx) => (
                <div key={idx} className={`flex-1 flex flex-wrap items-center justify-center gap-4 p-3 bg-${color}-950/20`}>
                  {blues.map((s, i) => (
                    <div key={`blue-${i}`} className="flex flex-col items-center z-20">
                      <div className={`w-8 h-8 rounded-full bg-${color}-600 flex items-center justify-center text-white text-sm font-black shadow-[0_0_8px_rgba(59,130,246,0.5)] border-2 border-${color}-400`}>{s.playerNumber}</div>
                      <span className="text-[9px] font-bold font-mono mt-1 bg-blue-900/50 border border-blue-500/50 text-blue-300 px-1.5 py-0.5 rounded">{formatSanctionTime(s.remainingTime)}</span>
                    </div>
                  ))}
                  {redS.map((s, i) => (
                    <div key={`red-${i}`} className="flex flex-col items-center z-20 bg-red-950/40 p-1.5 rounded border border-red-800/50">
                      <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center border border-white text-white font-black text-[10px] shadow-[0_0_8px_rgba(239,68,68,0.5)]">RJ</div>
                      <span className="text-[9px] font-bold font-mono mt-1 text-red-400">{formatSanctionTime(s.remainingTime)}</span>
                    </div>
                  ))}
                  {(blues.length === 0 && redS.length === 0) && <span className="text-[10px] text-zinc-600 font-bold italic uppercase">Silla Vacía</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center w-full px-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-zinc-600 border border-white/50 rounded-full" /><span className="text-zinc-500 text-[10px] font-bold">Jugador</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-zinc-600 border-2 border-white rounded-md" /><span className="text-zinc-500 text-[10px] font-bold">Portero</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-3 bg-yellow-400 border border-yellow-700 rounded-sm transform -rotate-12" /><span className="text-zinc-500 text-[10px] font-bold">Amonestado (Amarillas)</span></div>
            </div>
            <p className="text-zinc-500 text-[9px] sm:text-[10px] mt-2 sm:mt-0 text-center font-bold">
              Expulsados (Roja) desaparecen de la pista. Las tarjetas rojas dejan un tiempo por cumplir en mesa.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}