"use client"

import { RigidClock } from '@/components/scoreboard/RigidClock'

import { defaultHomeName, defaultHomeLogo, CLUB_BRAND } from '@/lib/club-brand'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Play, Pause, RotateCcw, Plus, Minus, Bell, Timer, Coffee, Goal, Square,
  ArrowRightLeft, ChevronRight, FileText, AlertTriangle, AlertCircle, Users,
  VolumeX, LogOut, LogIn, X, History, HeartPulse, Shield, Hash, Star, SlidersHorizontal, Trash2, UserPlus, Maximize
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type {
  GameState, Period, Player, MatchPhase, Team, MatchConfig,
  SignatureData, ClosingSignatureData, MatchRecord
} from '@/hooks/use-game-state'

import { BenchModal, type BenchStaffUI } from '@/components/scoreboard/BenchModal'
import { OfficialSheetModal } from '@/components/scoreboard/OfficialSheetModal'
import { PreMatchSetup } from '@/components/scoreboard/PreMatchSetup'
import { MatchHistoryModal } from '@/components/scoreboard/MatchHistoryModal'
import { AudioModal } from '@/components/scoreboard/AudioModal'
import { getShootout, shotsBy, SHOOTOUT_ROUNDS } from '@/lib/match-summary'
import {
  loadAppearance, saveAppearance, activeKit, TOKEN_STYLES,
  APPEARANCE_EVENT, DEFAULT_APPEARANCE, type Appearance
} from '@/lib/appearance'
import {
  loadAudioConfig, playHorn, playBeep, releaseAudio, armAudio,
  AUDIO_EVENT, DEFAULT_AUDIO, type AudioConfig
} from '@/lib/audio-engine'
import { HOTKEY_EVENT, OPEN_HOTKEYS_EVENT } from '@/lib/hotkeys'
import { SignatureCanvas } from '@/components/scoreboard/SignatureCanvas'

import {
  MIN_TOTAL_PLAYERS, getDisplayNumber, getStaffLabel, getStaffName,
  isStaff, isBenchOnly, isGoalie, isPlayerAvailable, isPlayerExpelled,
  getMaxAllowed, getYellowCount, getBlueCount, getDefaultLineup, getLineup,
  getPowerPlay, resolveToggle, activeBlues, activeReds, resolveRoster, canUseNumber,
  resolveSubstitution, eligibleReplacements
} from '@/lib/court-rules'

// ─────────────────────────────────────────────────────────────────────────────

type CardAction = 'gol' | 'penal' | 'yellow' | 'blue' | 'red' | 'falta'

interface ResumeParams {
  period: Period; clockTime: number; homeScore: number; awayScore: number
  homeFouls: number; awayFouls: number
}

export interface CourtOperatorViewProps {
  state: GameState
  savedTeams: Team[]
  matchHistory: MatchRecord[]
  deleteMatchFromHistory: (id: string) => void
  clearHistory: () => void
  playBuzzer: () => void
  configureMatch: (config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null) => void
  configureMatchWithResume?: (config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null, resume: ResumeParams) => void
  setSignature: (role: keyof SignatureData, signatureData: string) => void
  setClosingSignature: (role: keyof ClosingSignatureData, signatureData: string) => void
  setMatchPhase: (phase: MatchPhase) => void
  saveTeam: (team: Team) => void
  deleteTeam: (teamId: string) => void

  toggleMainClock: () => void
  resetMainClock: () => void
  adjustMainClock: (seconds: number) => void
  setMainClockTime: (minutes: number) => void
  setPeriod: (period: Period) => void
  nextPeriod: () => void
  startIntermission: (durationMinutes?: number) => void
  endIntermission: () => void

  adjustHomeScore: (delta: number, playerNumber?: string) => void
  adjustAwayScore: (delta: number, playerNumber?: string) => void
  adjustHomeFouls: (delta: number) => void
  adjustAwayFouls: (delta: number) => void
  adjustHomePenalties: (delta: number) => void
  adjustAwayPenalties: (delta: number) => void

  addSanction: (team: 'home' | 'away', type: 'yellow' | 'blue' | 'red', playerNumber: string, isBench?: boolean, staffId?: string, sanctionType?: 'direct' | 'collective') => void
  addBenchSanction: (team: 'home' | 'away', sentCard: 'yellow' | 'red', directInfractor: { id: string; name: string; role: string; number: string }, collectiveTargets: Array<{ id: string; name: string; role: string; number: string }>) => void
  removeSanction: (id: string) => void

  requestTimeoutHome: () => void
  requestTimeoutAway: () => void
  grantTimeoutHome: () => void
  grantTimeoutAway: () => void
  cancelTimeoutRequest: (team: 'home' | 'away') => void
  cancelActiveTimeout: () => void

  togglePossessionLeft: () => void
  togglePossessionRight: () => void
  resetPossessionLeft: () => void
  resetPossessionRight: () => void
  resetAndPausePossession: () => void

  setCourtLineup: (
    team: 'home' | 'away',
    ids: string[],
    change?: { playerNumber: string; direction: 'in' | 'out' }
      | Array<{ playerNumber: string; direction: 'in' | 'out' }>
  ) => void
  logShootoutShot: (team: 'home' | 'away', playerNumber: string, scored: boolean) => void
  reassignPlayerNumber: (team: 'home' | 'away', playerId: string, oldNumber: string, newNumber: string) => void
  setPlayerInjured: (team: 'home' | 'away', playerId: string, playerNumber: string, injured: boolean) => void
  designateGoalie: (team: 'home' | 'away', playerId: string, playerNumber: string) => void
  designateCaptain: (team: 'home' | 'away', playerId: string, playerNumber: string) => void
  addRosterPlayer: (team: 'home' | 'away', number: string, name?: string) => void
  removeRosterPlayer: (team: 'home' | 'away', playerId: string, playerNumber: string) => void

  endMatch: () => void
  closeMatchEndModal: () => void
  saveMatchToHistory: () => void
  resetAll: () => void
  onSaveAndReset?: () => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────

export function CourtOperatorView(props: CourtOperatorViewProps) {
  const { state } = props

  const homeTeamName = state.homeTeam?.name || defaultHomeName()
  const awayTeamName = state.awayTeam?.name || 'VISITA'

  const [isFlipped, setIsFlipped] = useState(false)
  const [matchEnded, setMatchEnded] = useState(false)
  const [showOfficialSheet, setShowOfficialSheet] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [planillaLocked, setPlanillaLocked] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showHotkeys, setShowHotkeys] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  // Árbitro: las faltas son del EQUIPO, no de un jugador
  const [refOpen, setRefOpen] = useState(false)

  /**
   * Juego detenido: entretiempo o tiempo muerto. Con el juego parado NO puede
   * haber goles ni faltas, y no se solicita otro tiempo de banca. Las tarjetas
   * SI se pueden cargar: el árbitro puede sancionar con el juego detenido.
   */
  const stopped = state.isIntermission || !!state.activeTimeout
  const stoppedLabel = state.activeTimeout ? 'tiempo muerto' : 'entretiempo'
  const [look, setLook] = useState<Appearance>(DEFAULT_APPEARANCE)
  useEffect(() => {
    const load = () => setLook(loadAppearance())
    load()
    window.addEventListener(APPEARANCE_EVENT, load)
    return () => window.removeEventListener(APPEARANCE_EVENT, load)
  }, [])
  const patchLook = (a: Appearance) => { setLook(a); saveAppearance(a) }

  /** Pantalla completa: en tablet y celular gana el alto de la barra del navegador. */
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      else await document.exitFullscreen()
    } catch { toast.info('Este navegador no permite pantalla completa aqui.') }
  }
  const [audioCfg, setAudioCfg] = useState<AudioConfig>(DEFAULT_AUDIO)
  useEffect(() => {
    const load = () => setAudioCfg(loadAudioConfig())
    load()
    window.addEventListener(AUDIO_EVENT, load)
    return () => window.removeEventListener(AUDIO_EVENT, load)
  }, [])
  const [renaming, setRenaming] = useState<{ player: Player; team: 'home' | 'away' } | null>(null)
  const [newNumber, setNewNumber] = useState('')
  const [addTo, setAddTo] = useState<'home' | 'away' | null>(null)
  const [addNumber, setAddNumber] = useState('')
  const [cancelling, setCancelling] = useState<{ id: string; num: string; tipo: string } | null>(null)
  const [subbing, setSubbing] = useState<{ out: Player; team: 'home' | 'away' } | null>(null)

  const askCancel = (id: string, num: string, tipo: string) => setCancelling({ id, num, tipo })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showIntermissionSelector, setShowIntermissionSelector] = useState(false)
  const [customIntermissionMinutes, setCustomIntermissionMinutes] = useState('')
  const [signingClosingRole, setSigningClosingRole] = useState<keyof ClosingSignatureData | null>(null)

  const [benchModalOpen, setBenchModalOpen] = useState(false)
  const [benchModalTeam, setBenchModalTeam] = useState<'home' | 'away'>('home')
  const [benchModalCard, setBenchModalCard] = useState<'yellow' | 'red'>('yellow')
  const [benchStaffList, setBenchStaffList] = useState<BenchStaffUI[]>([])

  // Ficha seleccionada -> hoja de acciones
  const [selected, setSelected] = useState<{ player: Player; team: 'home' | 'away'; onCourt: boolean } | null>(null)

  // Diseñador de camisetas (compartido con la animacion de gol via ardi-live-logos)
  const [jersey, setJersey] = useState({
    homeJ1: '#2563eb', homeJ2: '#ffffff', awayJ1: '#f59e0b', awayJ2: '#000000', jerseyDesign: 'solid'
  })

  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem('ardi-live-logos')
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        setJersey(prev => ({ ...prev, ...parsed }))
      } catch { /* ignorar */ }
    }
    load()
    window.addEventListener('storage', load)
    window.addEventListener('ardi-screens-updated', load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('ardi-screens-updated', load)
    }
  }, [])

  const saveJersey = (patch: Partial<typeof jersey>) => {
    setJersey(prev => {
      const next = { ...prev, ...patch }
      try {
        const raw = localStorage.getItem('ardi-live-logos')
        const base = raw ? JSON.parse(raw) : {}
        localStorage.setItem('ardi-live-logos', JSON.stringify({ ...base, ...next }))
        window.dispatchEvent(new Event('ardi-screens-updated'))
      } catch { /* ignorar */ }
      return next
    })
  }

  // ─── Planteles ─────────────────────────────────────────────────────────────

  const homeBase = useMemo<Player[]>(() => {
    const list = state.matchConfig.homePlayers || []
    if (list.length > 0) return list
    return (state.matchConfig.homeRoster || []).map((num, i) => ({
      id: `home-${i}`, number: num, name: '', rut: '', position: '' as const, role: 'jugador_pista' as const
    }))
  }, [state.matchConfig.homePlayers, state.matchConfig.homeRoster])

  const awayBase = useMemo<Player[]>(() => {
    const list = state.matchConfig.awayPlayers || []
    if (list.length > 0) return list
    return (state.matchConfig.awayRoster || []).map((num, i) => ({
      id: `away-${i}`, number: num, name: '', rut: '', position: '' as const, role: 'jugador_pista' as const
    }))
  }, [state.matchConfig.awayPlayers, state.matchConfig.awayRoster])

  const adj = state.matchAdjustments
  const homePlayers = useMemo(() => resolveRoster(homeBase, adj?.home), [homeBase, adj])
  const awayPlayers = useMemo(() => resolveRoster(awayBase, adj?.away), [awayBase, adj])

  const homeCourtIds = state.homeCourtIds || []
  const awayCourtIds = state.awayCourtIds || []

  // Alineacion inicial automatica, una sola vez por equipo
  const seeded = useRef({ home: false, away: false })
  useEffect(() => {
    if (!seeded.current.home && homeCourtIds.length === 0 && homePlayers.length > 0) {
      seeded.current.home = true
      props.setCourtLineup('home', getDefaultLineup(homePlayers))
    }
    if (!seeded.current.away && awayCourtIds.length === 0 && awayPlayers.length > 0) {
      seeded.current.away = true
      props.setCourtLineup('away', getDefaultLineup(awayPlayers))
    }
  }, [homePlayers, awayPlayers, homeCourtIds.length, awayCourtIds.length, props])

  // Auto-flip por periodo
  useEffect(() => {
    setIsFlipped(state.period === '2do_tiempo' || state.period === 'penales')
  }, [state.period])

  const cardHistory = state.cardHistory || []
  const sanctions = state.sanctions || []

  const homeLineup = getLineup(homePlayers, homeCourtIds, 'home', cardHistory, sanctions)
  const awayLineup = getLineup(awayPlayers, awayCourtIds, 'away', cardHistory, sanctions)
  const homeMax = getMaxAllowed(sanctions, 'home')
  const awayMax = getMaxAllowed(sanctions, 'away')
  const powerPlay = getPowerPlay(homeLineup.count, awayLineup.count, sanctions)

  // ─── Tanda de penales ──────────────────────────────────────────────────────
  const isShootout = state.period === 'penales'
  const shootout = getShootout(state)
  // El boton CAMBIAR LADO elige quien ataca: sin voltear ataca el local
  const shootingTeam: 'home' | 'away' = isFlipped ? 'away' : 'home'
  const keepingTeam: 'home' | 'away' = shootingTeam === 'home' ? 'away' : 'home'

  const shooters = (shootingTeam === 'home' ? homePlayers : awayPlayers)
    .filter(p => !isStaff(p) && !isPlayerExpelled(p, shootingTeam, cardHistory, sanctions))

  const shootingKeeper = (shootingTeam === 'home' ? homeLineup : awayLineup).goalie
    || (shootingTeam === 'home' ? homePlayers : awayPlayers).find(isGoalie)

  const keeper = (keepingTeam === 'home' ? homeLineup : awayLineup).goalie
    || (keepingTeam === 'home' ? homePlayers : awayPlayers).find(isGoalie)

  const registerShot = (player: Player, scored: boolean) => {
    const num = getDisplayNumber(player)
    props.logShootoutShot(shootingTeam, num, scored)
    if (scored) {
      if (shootingTeam === 'home') props.adjustHomePenalties(1)
      else props.adjustAwayPenalties(1)
      buzz(500)
    }
    toast[scored ? 'success' : 'info'](`#${num} ${scored ? 'convierte' : 'falla'}`, { duration: 1500 })
    setSelected(null)
  }

  const blueHome = activeBlues(sanctions, 'home')
  const blueAway = activeBlues(sanctions, 'away')
  const redHome = activeReds(sanctions, 'home')
  const redAway = activeReds(sanctions, 'away')

  // ─── Acciones sobre una ficha ──────────────────────────────────────────────

  const openSheet = (player: Player, team: 'home' | 'away') => {
    if (matchEnded) {
      toast.error("El partido finalizo. Presiona REANUDAR para hacer cambios.")
      return
    }
    if (isPlayerExpelled(player, team, cardHistory, sanctions)) {
      toast.error(`#${getDisplayNumber(player)} esta EXPULSADO. No puede recibir mas sanciones ni volver a pista.`)
      return
    }
    const onCourt = (team === 'home' ? homeCourtIds : awayCourtIds).includes(player.id)
    setSelected({ player, team, onCourt })
  }

  const handleToggleCourt = () => {
    if (!selected) return
    const { player, team } = selected
    const ids = team === 'home' ? homeCourtIds : awayCourtIds
    const players = team === 'home' ? homePlayers : awayPlayers
    const result = resolveToggle(player, team, ids, players, cardHistory, sanctions)
    if (!result.ok) {
      // Con el equipo en el minimo, un toque suelto nunca es legal: hay que
      // cambiar jugador por jugador, que es UNA operacion.
      if (selected.onCourt) {
        setSubbing({ out: player, team })
        setSelected(null)
        toast.info('El equipo esta en el minimo: elige por quien entra.', { duration: 3000 })
        return
      }
      toast.warning(result.reason)
      return
    }
    props.setCourtLineup(team, result.ids, {
      playerNumber: getDisplayNumber(player),
      direction: result.action
    })
    toast.success(
      result.action === 'in'
        ? `#${getDisplayNumber(player)} ingresa a pista`
        : `#${getDisplayNumber(player)} sale de pista`,
      { duration: 1500 }
    )
    setSelected(null)
  }

  const handleAction = (action: CardAction) => {
    if (!selected) return
    const { player, team } = selected
    const num = getDisplayNumber(player)

    switch (action) {
      case 'gol':
        if (team === 'home') props.adjustHomeScore(1, num)
        else props.adjustAwayScore(1, num)
        break
      case 'penal':
        if (team === 'home') props.adjustHomePenalties(1)
        else props.adjustAwayPenalties(1)
        break
      case 'yellow':
      case 'blue':
      case 'red':
        props.addSanction(team, action, num, false)
        props.resetAndPausePossession()
        break
    }
    setSelected(null)
  }

  // ─── Sancion de banca ──────────────────────────────────────────────────────

  const openBench = (team: 'home' | 'away', card: 'yellow' | 'red', preselect?: Player) => {
    if (matchEnded) {
      toast.error("El partido finalizo. Presiona REANUDAR para hacer cambios.")
      return
    }
    const players = team === 'home' ? homePlayers : awayPlayers
    const teamHasBenchYellow = cardHistory.some(c => c.team === team && c.isBench && c.cardType === 'yellow')

    const uiList: BenchStaffUI[] = players
      .filter(p => isBenchOnly(p) || !isBenchOnly(p))
      .map(p => {
        const staff = isStaff(p)
        return {
          id: p.id,
          name: staff ? getStaffName(p.role as string) : `#${p.number}`,
          role: staff ? getStaffLabel(p.role as string) : 'Suplente',
          number: getDisplayNumber(p),
          selected: teamHasBenchYellow ? false : staff,
          isDirectInfractor: preselect ? p.id === preselect.id : false
        }
      })

    setBenchStaffList(uiList)
    setBenchModalTeam(team)
    setBenchModalCard(card)
    setBenchModalOpen(true)
    setSelected(null)
  }

  // ─── Fin / reanudacion ─────────────────────────────────────────────────────

  const confirmEndMatch = () => {
    props.setMatchPhase('finalizado' as MatchPhase)
    props.endMatch()
    setMatchEnded(true)
    setShowEndConfirm(false)
    setShowOfficialSheet(true)
  }

  const handleFullReset = () => {
    props.resetAll()
    setShowResetConfirm(false)
    setMatchEnded(false)
    setShowOfficialSheet(false)
    setPlanillaLocked(false)
    seeded.current = { home: false, away: false }
  }

  const resumeMatch = () => {
    setMatchEnded(false)
    props.closeMatchEndModal()
    props.setMatchPhase('en-curso' as MatchPhase)
    toast.info("Partido reanudado. Controles desbloqueados.", { position: 'top-center' })
  }

  // ─── Chicharra nativa ──────────────────────────────────────────────────────

  const buzz = useCallback((ms = 800) => { playHorn(ms, loadAudioConfig()) }, [])
  const skipNextBuzzer = useRef(false)

  useEffect(() => { armAudio(); return () => { releaseAudio() } }, [])

  // Automatizacion de chicharra
  const prevClockRunning = useRef(state.isMainClockRunning)
  const prevMainClock = useRef(state.mainClock)
  const prevPossL = useRef(state.possessionClockLeft)
  const prevPossR = useRef(state.possessionClockRight)
  const prevHomeFouls = useRef(state.homeFouls)
  const prevAwayFouls = useRef(state.awayFouls)

  useEffect(() => {
    if (!prevClockRunning.current && state.isMainClockRunning) {
      if (skipNextBuzzer.current) skipNextBuzzer.current = false
      else buzz(500)
    }
    if (prevMainClock.current > 0 && state.mainClock === 0) buzz(2000)
    if ((prevPossL.current > 0 && state.possessionClockLeft === 0) ||
        (prevPossR.current > 0 && state.possessionClockRight === 0)) buzz(800)

    // Cuenta atras: PULSO agudo, no bocina. El ultimo segundo suena distinto.
    const countdown = (prev: number, curr: number) => {
      if (curr >= prev || curr <= 0) return
      if (curr <= 3) playBeep(curr === 1 ? 'last' : 'tick', audioCfg)
      else if (curr <= 10 && curr % 2 === 0) playBeep('tick', audioCfg)
    }
    if (state.isPossessionLeftRunning)  countdown(prevPossL.current, state.possessionClockLeft)
    if (state.isPossessionRightRunning) countdown(prevPossR.current, state.possessionClockRight)
    if (state.isMainClockRunning && state.mainClock <= 10) countdown(prevMainClock.current, state.mainClock)

    // Faltas: aviso en la 9/14/19 (la siguiente es tiro libre directo) y
    // bocina en la 10/15/20, cuando el tiro libre se ejecuta.
    const foulSound = (prev: number, curr: number) => {
      if (curr <= prev) return
      if (curr === 10 || (curr > 10 && (curr - 10) % 5 === 0)) buzz(700)
      else if (curr === 9 || (curr > 10 && (curr - 9) % 5 === 0)) playBeep('alert', audioCfg)
    }
    foulSound(prevHomeFouls.current, state.homeFouls)
    foulSound(prevAwayFouls.current, state.awayFouls)
    prevHomeFouls.current = state.homeFouls
    prevAwayFouls.current = state.awayFouls

    prevClockRunning.current = state.isMainClockRunning
    prevMainClock.current = state.mainClock
    prevPossL.current = state.possessionClockLeft
    prevPossR.current = state.possessionClockRight
  }, [state.isMainClockRunning, state.mainClock, state.possessionClockLeft, state.possessionClockRight, state.isPossessionLeftRunning, state.isPossessionRightRunning, state.homeFouls, state.awayFouls, buzz, audioCfg])

  // ─── Atajos de teclado ─────────────────────────────────────────────────────

  /**
   * Los atajos viven en app/page: son de la estacion de trabajo, no de la vista.
   * Aqui solo se atienden las dos acciones que la vista puede resolver.
   */
  useEffect(() => {
    const onHotkey = (e: Event) => {
      const action = (e as CustomEvent).detail as string
      if (action === 'undo') {
        setSelected(null); setCancelling(null); setRenaming(null)
        setAddTo(null); setSubbing(null); setRefOpen(false)
      } else if (action === 'intermission' && !matchEnded) {
        setShowIntermissionSelector(true)
      }
    }
    window.addEventListener(HOTKEY_EVENT, onHotkey)
    return () => window.removeEventListener(HOTKEY_EVENT, onHotkey)
  }, [matchEnded])

  // ─── Pre-partido ───────────────────────────────────────────────────────────

  if (signingClosingRole) {
    const titles: Record<keyof ClosingSignatureData, string> = {
      capitanLocal: `Firma Capitan ${homeTeamName}`, capitanVisita: `Firma Capitan ${awayTeamName}`,
      dtLocal: `Firma DT ${homeTeamName}`, dtVisita: `Firma DT ${awayTeamName}`,
      encargadoCancha: 'Firma Encargado de Cancha', arbitroCronometrista: 'Firma Arbitro Cronometrista',
      arbitroPrincipal: 'Firma Arbitro Principal', arbitroAuxiliar: 'Firma Arbitro Auxiliar'
    }
    return (
      <SignatureCanvas
        title={titles[signingClosingRole]}
        onSave={sig => { props.setClosingSignature(signingClosingRole, sig); setSigningClosingRole(null) }}
        onCancel={() => setSigningClosingRole(null)}
      />
    )
  }

  if (state.matchPhase === 'pre-partido' && !state.isMatchConfigured) {
    return (
      <PreMatchSetup
        state={state}
        savedTeams={props.savedTeams}
        configureMatch={props.configureMatch}
        configureMatchWithResume={props.configureMatchWithResume}
        setSignature={props.setSignature}
        saveTeam={props.saveTeam}
        deleteTeam={props.deleteTeam}
      />
    )
  }

  // ─── Ficha ─────────────────────────────────────────────────────────────────

  const Token = ({ p, team, onCourt }: { p: Player; team: 'home' | 'away'; onCourt: boolean }) => {
    const kit = activeKit(team === 'home' ? look.home : look.away)
    const c1 = kit.shirt
    const c2 = kit.pants
    const yellows = getYellowCount(p, team, cardHistory, sanctions)
    const blues = getBlueCount(p, team, cardHistory)
    const goalie = isGoalie(p)
    const staff = isStaff(p)
    const display = getDisplayNumber(p)
    const style = look.tokenStyle

    const bg = style !== 'cubo'
      ? { background: 'transparent' }
      : { background: c1 }

    return (
      <button
        onClick={() => openSheet(p, team)}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 shadow-lg transition-transform hover:scale-105 active:scale-95
          ${onCourt ? 'w-[46px] h-[46px] sm:w-[68px] sm:h-[68px] lg:w-[76px] lg:h-[76px]' : 'w-[38px] h-[38px] sm:w-[54px] sm:h-[54px] lg:w-[60px] lg:h-[60px] opacity-90'}
          ${style !== 'cubo' ? 'border-transparent' : goalie ? 'border-white ring-2 ring-green-400/60' : staff ? 'border-purple-400/70' : 'border-white/70'}`}
        style={bg}
        title={p.name || `Jugador ${display}`}
      >
        {yellows > 0 && (
          <div className="absolute -top-1.5 -left-1.5 flex -space-x-1 z-20">
            {Array.from({ length: Math.min(yellows, 3) }).map((_, i) => (
              <div key={i} className="w-3 h-4 bg-yellow-400 border border-yellow-700 rounded-[1px] -rotate-12 shadow" />
            ))}
          </div>
        )}
        {blues > 0 && (
          <div className="absolute -top-1.5 -right-1.5 flex -space-x-1 z-20">
            {Array.from({ length: Math.min(blues, 3) }).map((_, i) => (
              <div key={i} className="w-3 h-4 bg-blue-500 border border-blue-200 rounded-[1px] rotate-12 shadow-lg" />
            ))}
          </div>
        )}
        {style === 'cubo' ? (
          <span className={`font-black text-white bg-black/50 px-1.5 rounded backdrop-blur-sm ${onCourt ? 'text-sm sm:text-lg lg:text-xl' : 'text-[11px] sm:text-sm'}`}>
            {display}
          </span>
        ) : (
          <svg viewBox="0 0 40 44" className="w-full h-full" aria-hidden>
            {/* Casco del portero o cabeza */}
            {style === 'jugador' && goalie
              ? <rect x="12" y="3" width="16" height="13" rx="5" fill={c2} stroke="#fff" strokeWidth="1.2" />
              : <circle cx="20" cy="10" r="7" fill={c2} stroke="#fff" strokeWidth="1.2" />}
            {/* Torso */}
            <path d="M6 40c0-8 6-14 14-14s14 6 14 14z" fill={c1} stroke="#fff" strokeWidth="1.2" />
            {/* Patines */}
            {style === 'jugador' && (
              <path d="M10 41h8M22 41h8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            )}
            <text x="20" y="38" textAnchor="middle" fontSize="14" fontWeight="900"
              fill="#fff" stroke="#000" strokeWidth="0.6" paintOrder="stroke">{display}</text>
          </svg>
        )}
        {goalie && (
          <span className="absolute -bottom-2 px-1 bg-green-600 rounded text-[8px] text-white font-bold border border-green-400">PO</span>
        )}
        {staff && (
          <span className="absolute -bottom-2 px-1 bg-purple-600 rounded text-[8px] text-white font-bold border border-purple-400">BANCA</span>
        )}
        {p.isDisabled && (
          <span className="absolute inset-0 rounded-xl bg-rose-950/70 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-rose-300" />
          </span>
        )}
        {p.role === 'capitan' && !staff && (
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 bg-amber-500 rounded text-[7px] text-black font-black border border-amber-300">C</span>
        )}
      </button>
    )
  }

  const BenchZone = ({ team }: { team: 'home' | 'away' }) => {
    const players = team === 'home' ? homePlayers : awayPlayers
    const ids = team === 'home' ? homeCourtIds : awayCourtIds
    const accent = team === 'home' ? 'blue' : 'amber'
    const list = players.filter(p =>
      !ids.includes(p.id) &&
      (p.isDisabled || isPlayerAvailable(p, team, cardHistory, sanctions)))

    return (
      <div className={`w-[22%] min-w-[68px] sm:min-w-[110px] p-1 sm:p-2 flex flex-col ${team === 'home' ? 'bg-blue-950/20 border-r border-blue-500/30' : 'bg-amber-950/20 border-l border-amber-500/30'}`}>
        <span className={`text-[9px] font-black tracking-widest mb-2 pb-1 w-full text-center border-b ${accent === 'blue' ? 'text-blue-400 border-blue-500/50' : 'text-amber-400 border-amber-500/50'}`}>
          BANCA
        </span>
        <div className="flex flex-wrap justify-center gap-2 overflow-y-auto content-start flex-1">
          {list.map(p => <Token key={p.id} p={p} team={team} onCourt={false} />)}
        </div>
        <div className="grid grid-cols-2 gap-1 mt-2">
          <Button onClick={() => openBench(team, 'yellow')} disabled={matchEnded} size="sm" className="h-7 px-0 text-[9px] font-black bg-yellow-500 hover:bg-yellow-400 text-black">AM. BANCA</Button>
          <Button onClick={() => openBench(team, 'red')} disabled={matchEnded} size="sm" className="h-7 px-0 text-[9px] font-black bg-red-600 hover:bg-red-500 text-white">RJ. BANCA</Button>
        </div>

        {/* El tiempo de banca lo pide la banca: va donde esta la banca */}
        {(() => {
          const used = team === 'home' ? (state.homeTimeoutsUsed || 0) : (state.awayTimeoutsUsed || 0)
          const req = team === 'home' ? state.homeTimeoutRequested : state.awayTimeoutRequested
          return (
            <div className="grid grid-cols-2 gap-1 mt-1">
              <Button size="sm"
                onClick={() => req ? props.cancelTimeoutRequest(team) : (team === 'home' ? props.requestTimeoutHome() : props.requestTimeoutAway())}
                disabled={stopped || matchEnded || state.period === 'penales' || used >= 2}
                className={`h-7 px-0 text-[9px] font-black ${req ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                {req ? 'CANCELAR' : 'SOLICITAR'}
              </Button>
              <Button size="sm"
                onClick={() => team === 'home' ? props.grantTimeoutHome() : props.grantTimeoutAway()}
                disabled={stopped || matchEnded || state.period === 'penales' || !req || used >= 2}
                className="h-7 px-0 text-[9px] font-black bg-cyan-700 hover:bg-cyan-600 disabled:opacity-30">
                T.B. {used}/2
              </Button>
            </div>
          )
        })()}
      </div>
    )
  }

  /** Tarjetas acumuladas del sancionado, sobre su ficha en la zona de castigo. */
  const CardTally = ({ team, number }: { team: 'home' | 'away'; number: string }) => {
    const hist = cardHistory.filter(c => c.team === team && c.playerNumber === number)
    const am = hist.filter(c => c.cardType === 'yellow').length
    const az = hist.filter(c => c.cardType === 'blue').length
    if (am + az === 0) return null
    return (
      <div className="absolute -top-2 -right-2 flex -space-x-1">
        {Array.from({ length: Math.min(am, 3) }).map((_, i) => (
          <span key={`a${i}`} className="w-2.5 h-3.5 bg-yellow-400 border border-yellow-700 rounded-[1px] -rotate-12 shadow" />
        ))}
        {Array.from({ length: Math.min(az, 3) }).map((_, i) => (
          <span key={`b${i}`} className="w-2.5 h-3.5 bg-blue-500 border border-blue-200 rounded-[1px] rotate-12 shadow" />
        ))}
      </div>
    )
  }

  const FIELD_POS = [
    { top: '22%', left: '30%' }, { top: '78%', left: '30%' },
    { top: '38%', left: '44%' }, { top: '62%', left: '44%' }
  ]

  const homeTimeoutsUsed = state.homeTimeoutsUsed || 0
  const awayTimeoutsUsed = state.awayTimeoutsUsed || 0

  // ─── Bloque de equipo (marcador, faltas, timeouts) ─────────────────────────

  const TeamPanel = ({ team }: { team: 'home' | 'away' }) => {
    const isHome = team === 'home'
    const name = isHome ? homeTeamName : awayTeamName
    const score = isHome ? state.homeScore : state.awayScore
    const fouls = isHome ? state.homeFouls : state.awayFouls
    const foulActive = isHome ? state.isHomeFoul10Active : state.isAwayFoul10Active
    const used = isHome ? homeTimeoutsUsed : awayTimeoutsUsed
    const requested = isHome ? state.homeTimeoutRequested : state.awayTimeoutRequested
    const poss = isHome ? state.possessionClockLeft : state.possessionClockRight
    const possRunning = isHome ? state.isPossessionLeftRunning : state.isPossessionRightRunning
    const count = isHome ? homeLineup.count : awayLineup.count
    const max = isHome ? homeMax : awayMax
    const accent = isHome ? 'text-blue-400' : 'text-amber-400'
    const border = isHome ? 'border-blue-800' : 'border-amber-800'

    return (
      <div className={`flex-1 min-w-[260px] bg-zinc-950 border-2 ${border} rounded-xl p-3 flex flex-col gap-2`}>
        <div className="flex items-center justify-between">
          <h2 className={`${accent} font-black text-base sm:text-lg uppercase truncate`}>{name}</h2>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${count >= MIN_TOTAL_PLAYERS ? 'bg-zinc-800 text-zinc-300' : 'bg-red-900/60 text-red-300 animate-pulse'}`}>
            {count}/{max} EN PISTA
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/60 rounded-lg p-2 text-center">
            <span className="text-[10px] font-bold text-zinc-500 block">GOLES</span>
            <span className="text-4xl font-black text-red-500 tabular-nums block">{score}</span>
            <div className="flex justify-center gap-1 mt-1">
              <Button size="sm" disabled={stopped || matchEnded} onClick={() => isHome ? props.adjustHomeScore(-1) : props.adjustAwayScore(-1)} className="h-7 w-7 p-0 bg-zinc-800 hover:bg-zinc-700"><Minus className="w-3 h-3" /></Button>
              <Button size="sm" disabled={stopped || matchEnded} onClick={() => isHome ? props.adjustHomeScore(1) : props.adjustAwayScore(1)} className="h-7 w-7 p-0 bg-zinc-800 hover:bg-zinc-700"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
          <div className={`rounded-lg p-2 text-center border-2 ${foulActive ? 'bg-red-900/50 border-red-500 animate-pulse' : 'bg-black/60 border-transparent'}`}>
            <span className="text-[10px] font-bold text-zinc-500 block">FALTAS</span>
            <span className={`text-4xl font-black tabular-nums block ${foulActive ? 'text-red-500' : 'text-amber-400'}`}>{fouls}</span>
            <div className="flex justify-center gap-1 mt-1">
              <Button size="sm" disabled={stopped || matchEnded} onClick={() => isHome ? props.adjustHomeFouls(-1) : props.adjustAwayFouls(-1)} className="h-7 w-7 p-0 bg-zinc-800 hover:bg-zinc-700"><Minus className="w-3 h-3" /></Button>
              <Button size="sm" disabled={stopped || matchEnded} onClick={() => isHome ? props.adjustHomeFouls(1) : props.adjustAwayFouls(1)} className="h-7 w-7 p-0 bg-zinc-800 hover:bg-zinc-700"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
        </div>

        {state.matchConfig.allowPenalties && (
          <div className="bg-black/60 rounded-lg p-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500">PENALES</span>
            <span className="text-2xl font-black text-purple-400 tabular-nums">{isHome ? state.homePenalties : state.awayPenalties}</span>
            <div className="flex gap-1">
              <Button size="sm" disabled={state.period !== 'penales' || matchEnded} onClick={() => isHome ? props.adjustHomePenalties(-1) : props.adjustAwayPenalties(-1)} className="h-7 w-7 p-0 bg-zinc-800 hover:bg-zinc-700"><Minus className="w-3 h-3" /></Button>
              <Button size="sm" disabled={state.period !== 'penales' || matchEnded} onClick={() => isHome ? props.adjustHomePenalties(1) : props.adjustAwayPenalties(1)} className="h-7 w-7 p-0 bg-zinc-800 hover:bg-zinc-700"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1">
          <Button
            onClick={() => requested ? props.cancelTimeoutRequest(team) : (isHome ? props.requestTimeoutHome() : props.requestTimeoutAway())}
            disabled={stopped || matchEnded || state.period === 'penales' || used >= 2}
            className={`h-8 text-[9px] font-bold px-1 ${requested ? 'bg-red-600 hover:bg-red-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}
          >
            {requested ? 'CANCELAR' : 'SOLICITAR T.B.'}
          </Button>
          <Button
            onClick={() => isHome ? props.grantTimeoutHome() : props.grantTimeoutAway()}
            disabled={stopped || matchEnded || state.period === 'penales' || !requested || used >= 2}
            className="h-8 text-[9px] font-bold px-1 bg-cyan-700 hover:bg-cyan-600"
          >
            <Coffee className="w-3 h-3 mr-1" /> CONCEDER ({used}/2)
          </Button>
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full bg-zinc-950 p-2 sm:p-3 overflow-y-auto flex flex-col gap-3">

      <BenchModal
        open={benchModalOpen}
        onClose={() => setBenchModalOpen(false)}
        team={benchModalTeam}
        cardType={benchModalCard}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        staffList={benchStaffList}
        onStaffListChange={setBenchStaffList}
        cardHistory={cardHistory}
        onApply={(team, card, direct, collective) => {
          if (!matchEnded) {
            props.addBenchSanction(team, card, direct, collective)
            props.resetAndPausePossession()
          }
        }}
      />

      <AudioModal open={showAudio} onClose={() => setShowAudio(false)} onChange={setAudioCfg} />

      <MatchHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        matchHistory={props.matchHistory || []}
        deleteMatchFromHistory={props.deleteMatchFromHistory}
        clearHistory={props.clearHistory}
      />

      <OfficialSheetModal
        open={showOfficialSheet}
        onClose={() => setShowOfficialSheet(false)}
        state={state}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        matchEnded={matchEnded}
        setSigningClosingRole={setSigningClosingRole}
        onSaveMatchToHistory={props.saveMatchToHistory}
        onSaveAndReset={props.onSaveAndReset}
        planillaLocked={planillaLocked}
        onLockPlanilla={() => setPlanillaLocked(true)}
      />

      {/* ── BARRA MAESTRA: reloj, periodo, chicharra ───────────────────────── */}
      <div className="bg-black border-2 border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => { skipNextBuzzer.current = true; props.toggleMainClock() }}
          disabled={matchEnded}
          className={`h-14 w-20 sm:h-16 sm:w-24 font-black ${state.isMainClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-800 hover:bg-green-700'}`}
          title="Iniciar/Pausar SIN chicharra [M]"
        >
          {state.isMainClockRunning ? <Pause className="w-7 h-7" /> : <div className="flex items-center"><Play className="w-6 h-6" /><VolumeX className="w-4 h-4 ml-1 opacity-70" /></div>}
        </Button>

        <div className="flex flex-col items-center px-4">
          <span className={`text-[10px] font-black tracking-widest ${
            state.activeTimeout ? 'text-cyan-400' : state.isIntermission ? 'text-amber-400' : 'text-zinc-500'}`}>
            {state.activeTimeout ? 'TIEMPO MUERTO' : state.isIntermission ? 'DESCANSO' : 'TIEMPO DE JUEGO'}
          </span>
          <span className="text-4xl sm:text-6xl lg:text-7xl font-black leading-none tabular-nums text-red-500" style={{ fontFamily: 'var(--font-led)' }}>
            <RigidClock seconds={state.activeTimeout ? state.timeoutClock : state.mainClock} tenthsUnder={state.isMainClockRunning ? 10 : 0} />
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-zinc-500">
              {state.period === '1er_tiempo' ? '1T' : state.period === '2do_tiempo' ? '2T' : state.period === 'alargue' ? 'ET' : 'PEN'}
            </span>
            <div className={`w-2 h-2 rounded-full ${state.isMainClockRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
        </div>

        <Button
          onClick={() => { skipNextBuzzer.current = false; props.toggleMainClock() }}
          disabled={matchEnded}
          className={`h-14 w-20 sm:h-16 sm:w-24 font-black ${state.isMainClockRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-700 hover:bg-green-600'}`}
          title="Iniciar/Pausar CON chicharra [Espacio]"
        >
          {state.isMainClockRunning ? <Pause className="w-7 h-7" /> : <div className="flex items-center"><Play className="w-6 h-6" /><Bell className="w-4 h-4 ml-1" /></div>}
        </Button>

        <div className="flex flex-col gap-1 min-w-[150px]">
          <div className="flex gap-1">
            <Select value={state.period} onValueChange={v => props.setPeriod(v as Period)} disabled={matchEnded}>
              <SelectTrigger className="h-8 text-xs font-bold bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="1er_tiempo">1er Tiempo</SelectItem>
                <SelectItem value="2do_tiempo">2do Tiempo</SelectItem>
                {state.matchConfig.allowOvertime && <SelectItem value="alargue">Alargue</SelectItem>}
                {state.matchConfig.allowPenalties && <SelectItem value="penales">Penales</SelectItem>}
              </SelectContent>
            </Select>
            <Button onClick={props.nextPeriod} disabled={matchEnded} className="h-8 w-9 p-0 bg-zinc-800 hover:bg-zinc-700"><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button onPointerDown={() => buzz(1200)} className="h-8 font-black bg-red-700 hover:bg-red-600 text-xs">
            <Bell className="w-4 h-4 mr-1" /> CHICHARRA
          </Button>
        </div>

        <div className="flex flex-col items-center gap-1 min-w-[120px]">
          {state.activeTimeout ? (
            <div className="bg-green-900/60 border-2 border-green-500 rounded-lg p-2 text-center w-full">
              <span className="text-[9px] text-green-400 font-black block">T. BANCA</span>
              <span className={`text-2xl font-black tabular-nums ${state.timeoutClock <= 15 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>{formatTime(state.timeoutClock)}</span>
              <Button onClick={props.cancelActiveTimeout} size="sm" className="h-6 w-full mt-1 text-[9px] bg-red-700 hover:bg-red-600">FIN</Button>
            </div>
          ) : state.isIntermission ? (
            <div className="bg-amber-900/60 border-2 border-amber-500 rounded-lg p-2 text-center w-full">
              <span className="text-[9px] text-amber-400 font-black block mb-1">DESCANSO</span>
              <div className="flex gap-1">
                <Button onClick={props.endIntermission} size="sm" className="h-6 flex-1 text-[9px] bg-red-700 hover:bg-red-600">FIN</Button>
                <Button onClick={() => setShowIntermissionSelector(true)} size="sm" className="h-6 flex-1 text-[9px] bg-zinc-800 hover:bg-zinc-700">+ MIN</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowIntermissionSelector(true)} disabled={matchEnded} className="h-10 w-full font-bold text-xs bg-orange-700 hover:bg-orange-600">
              <Timer className="w-4 h-4 mr-1" /> DESCANSO
            </Button>
          )}
          <div className="grid grid-cols-3 gap-1 w-full">
            <Button onClick={() => setIsFlipped(!isFlipped)} className="h-8 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700">
              <ArrowRightLeft className="w-3 h-3 mr-1" /> LADO
            </Button>
            <Button onClick={toggleFullscreen} className="h-8 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700">
              <Maximize className="w-3 h-3 mr-1" /> PANTALLA
            </Button>
            <Button onClick={() => setShowDrawer(v => !v)} className={`h-8 text-[10px] font-bold ${showDrawer ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
              <SlidersHorizontal className="w-3 h-3 mr-1" /> AJUSTES
            </Button>
          </div>
        </div>
      </div>

      {/* ── PISTA ───────────────────────────────────────────────────────────── */}
      {isShootout ? (
        <div className="w-full aspect-[1.8/1] sm:aspect-[2.4/1] min-h-[300px] rounded-2xl overflow-hidden border-4 border-purple-800 shadow-2xl bg-slate-900 relative">

          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
            <div className="bg-black/80 border-2 border-purple-700 rounded-lg px-4 py-1">
              <span className="text-white font-black text-2xl tabular-nums">
                {shootout.homeGoals} <span className="text-zinc-600 text-base">-</span> {shootout.awayGoals}
              </span>
            </div>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded ${shootout.decided ? 'bg-green-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
              {shootout.message}
            </span>
          </div>

          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
          <div className={`absolute top-1/2 -translate-y-1/2 w-[22%] h-[58%] border-2 border-white/25 ${isFlipped ? 'right-[7.5%] rounded-l-lg' : 'left-[7.5%] rounded-r-lg'}`} />

          <div className={`absolute top-1/2 -translate-y-1/2 h-[16%] z-[5] flex ${isFlipped ? 'right-[4.5%] flex-row-reverse' : 'left-[4.5%] flex-row'}`}>
            <div className="w-[6px] h-full bg-red-600 rounded-sm shadow-[0_0_8px_rgba(220,38,38,.8)]" />
            <div className="w-[18px] h-full opacity-70" style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 1px, transparent 1px 5px), repeating-linear-gradient(-45deg, rgba(255,255,255,.45) 0 1px, transparent 1px 5px)', borderTop: '2px solid rgba(255,255,255,.6)', borderBottom: '2px solid rgba(255,255,255,.6)' }} />
          </div>

          <div className={`absolute top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 ${isFlipped ? 'right-[9.5%]' : 'left-[9.5%]'}`}>
            {keeper ? <Token p={keeper} team={keepingTeam} onCourt /> : <span className="text-[10px] text-zinc-600 font-bold">SIN PORTERO</span>}
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{keepingTeam === 'home' ? homeTeamName : awayTeamName}</span>
          </div>

          <div className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white/70 rounded-full z-[6] ${isFlipped ? 'right-[21%]' : 'left-[21%]'}`} />

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] flex flex-col items-center gap-2">
            <span className={`text-[11px] font-black uppercase tracking-widest ${shootingTeam === 'home' ? 'text-blue-400' : 'text-amber-400'}`}>
              Lanza {shootingTeam === 'home' ? homeTeamName : awayTeamName}
            </span>
            <div className="flex flex-wrap justify-center gap-2 max-h-[150px] overflow-y-auto px-2">
              {shooters.map(p => {
                const mine = shotsBy(shootingTeam === 'home' ? shootout.home : shootout.away, getDisplayNumber(p))
                return (
                  <div key={p.id} className="relative">
                    <Token p={p} team={shootingTeam} onCourt={false} />
                    {mine.length > 0 && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {mine.slice(-4).map((sh, i) => (
                          <span key={i} className={`w-2 h-2 rounded-full border ${sh.scored ? 'bg-green-500 border-green-300' : 'bg-red-600 border-red-400'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {shooters.length === 0 && <span className="text-xs text-zinc-600 font-bold">Sin lanzadores disponibles</span>}
            </div>
          </div>

          {shootingKeeper && (
            <div className={`absolute top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 opacity-45 ${isFlipped ? 'left-[6%]' : 'right-[6%]'}`}>
              <Token p={shootingKeeper} team={shootingTeam} onCourt={false} />
              <span className="text-[8px] font-bold text-zinc-600 uppercase">en su area</span>
            </div>
          )}

          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 font-bold text-center px-4">
            CAMBIAR LADO alterna que equipo lanza - el arbitro guia el orden
          </span>
        </div>
      ) : (
      <div className={`w-full aspect-[1.4/1] sm:aspect-[2/1] lg:aspect-[2.6/1] min-h-[260px] sm:min-h-[300px] flex rounded-2xl overflow-hidden border-2 sm:border-4 border-zinc-700 shadow-2xl ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
        <BenchZone team="home" />

        <div className="flex-1 bg-slate-900 relative border-x-2 border-white/40 rounded-[40px] sm:rounded-[70px] overflow-hidden">
          {powerPlay.home && <div className={`absolute ${isFlipped ? 'right-2' : 'left-2'} top-2 bg-green-500 text-white text-[9px] sm:text-[10px] font-black px-2 py-1 rounded shadow z-20 animate-pulse`}>POWER PLAY</div>}
          {powerPlay.away && <div className={`absolute ${isFlipped ? 'left-2' : 'right-2'} top-2 bg-green-500 text-white text-[9px] sm:text-[10px] font-black px-2 py-1 rounded shadow z-20 animate-pulse`}>POWER PLAY</div>}

          <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            <div className="bg-black/70 border border-zinc-700 rounded-lg px-2 sm:px-3 py-0.5 sm:py-1">
              <span className="text-white font-black text-sm sm:text-lg tabular-nums">
                {isFlipped ? awayLineup.count : homeLineup.count} <span className="text-zinc-500 text-xs">vs</span> {isFlipped ? homeLineup.count : awayLineup.count}
              </span>
            </div>
            {/* El árbitro cobra la falta al EQUIPO, no a un jugador */}
            <button onClick={() => { if (stopped) { toast.info(`Juego detenido (${stoppedLabel}): no se cobran faltas`); return } setRefOpen(true) }}
              disabled={matchEnded}
              title="Árbitro — cobrar falta de equipo"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-zinc-900 border-2 border-zinc-400 hover:border-white flex items-center justify-center shadow-lg disabled:opacity-30">
              <svg viewBox="0 0 40 44" className="w-8 h-8" aria-hidden>
                <circle cx="20" cy="10" r="7" fill="#18181b" stroke="#e4e4e7" strokeWidth="1.6" />
                <path d="M6 40c0-8 6-14 14-14s14 6 14 14z" fill="#18181b" stroke="#e4e4e7" strokeWidth="1.6" />
                <path d="M6 30h28" stroke="#e4e4e7" strokeWidth="3" />
                <path d="M6 35h28" stroke="#e4e4e7" strokeWidth="3" />
              </svg>
            </button>
          </div>

          {/* Linea central y circulo */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/25 -translate-x-1/2" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[16%] aspect-square border-2 border-white/25 rounded-full" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />

          {/* Areas: parten en la linea de porteria, que esta adelantada */}
          <div className="absolute left-[7.5%] top-1/2 -translate-y-1/2 w-[22%] h-[58%] border-2 border-white/25 rounded-r-lg" />
          <div className="absolute right-[7.5%] top-1/2 -translate-y-1/2 w-[22%] h-[58%] border-2 border-white/25 rounded-l-lg" />

          {/* Arcos adelantados ~3 m del fondo: queda el pasillo por detras */}
          {(['left', 'right'] as const).map(side => (
            <div key={side} className={`absolute top-1/2 -translate-y-1/2 h-[13%] z-[5] flex ${side === 'left' ? 'left-[4.5%] flex-row' : 'right-[4.5%] flex-row-reverse'}`}>
              <div className="w-[6px] h-full bg-red-600 rounded-sm shadow-[0_0_6px_rgba(220,38,38,0.7)]" />
              <div className="w-[16px] h-full opacity-70" style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 1px, transparent 1px 5px), repeating-linear-gradient(-45deg, rgba(255,255,255,.45) 0 1px, transparent 1px 5px)', borderTop: '2px solid rgba(255,255,255,.6)', borderBottom: '2px solid rgba(255,255,255,.6)' }} />
            </div>
          ))}

          {/* Puntos de penal (5,40 m) y de falta directa (7,40 m) */}
          <div className="absolute left-[21%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
          <div className="absolute right-[21%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
          <div className="absolute left-[26%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/35 rounded-full" />
          <div className="absolute right-[26%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/35 rounded-full" />

          {homeLineup.goalie && (
            <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 ${isFlipped ? 'right-[9.5%]' : 'left-[9.5%]'}`}>
              <Token p={homeLineup.goalie} team="home" onCourt />
            </div>
          )}
          {homeLineup.field.map((p, i) => {
            const pos = FIELD_POS[i] || { top: '50%', left: '36%' }
            return (
              <div key={p.id} className="absolute -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-500"
                style={{ top: pos.top, [isFlipped ? 'right' : 'left']: pos.left }}>
                <Token p={p} team="home" onCourt />
              </div>
            )
          })}

          {awayLineup.goalie && (
            <div className={`absolute top-1/2 -translate-y-1/2 translate-x-1/2 z-10 ${isFlipped ? 'left-[9.5%]' : 'right-[9.5%]'}`}>
              <Token p={awayLineup.goalie} team="away" onCourt />
            </div>
          )}
          {awayLineup.field.map((p, i) => {
            const pos = FIELD_POS[i] || { top: '50%', left: '36%' }
            return (
              <div key={p.id} className="absolute -translate-y-1/2 translate-x-1/2 z-10 transition-all duration-500"
                style={{ top: pos.top, [isFlipped ? 'left' : 'right']: pos.left }}>
                <Token p={p} team="away" onCourt />
              </div>
            )
          })}
        </div>

        <BenchZone team="away" />
      </div>

      )}

      {/* ── RELOJES DE 45: juntos al centro ──────────────────────────────────
           Van pegados uno al otro a proposito. Una sola mano cubre los dos,
           que es como se opera de verdad la mesa. Repartidos en los paneles
           de equipo quedaban a medio metro de distancia en pantalla ancha. */}
      <div className="flex justify-center">
        <div className={`flex items-stretch gap-2 sm:gap-3 ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
          {([
            { team: 'home' as const, name: homeTeamName, clock: state.possessionClockLeft, running: state.isPossessionLeftRunning,
              toggle: props.togglePossessionLeft, reset: props.resetPossessionLeft, accent: 'text-blue-400', border: 'border-blue-800' },
            { team: 'away' as const, name: awayTeamName, clock: state.possessionClockRight, running: state.isPossessionRightRunning,
              toggle: props.togglePossessionRight, reset: props.resetPossessionRight, accent: 'text-amber-400', border: 'border-amber-800' }
          ]).map(side => (
            <div key={side.team} className={`bg-zinc-950 border-2 ${side.border} rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3`}>
              <div className="text-center min-w-[92px] sm:min-w-[130px]">
                <span className={`block text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate ${side.accent}`}>
                  {side.name}
                </span>
                <span className={`block text-3xl sm:text-5xl font-black tabular-nums leading-none ${
                  side.clock <= 10 && side.running ? 'text-red-500 animate-pulse' : 'text-green-400'}`}
                  style={{ fontFamily: 'var(--font-led)' }}>
                  {formatTime(side.clock)}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" disabled={matchEnded} onClick={side.toggle}
                  className={`h-9 w-12 sm:h-10 sm:w-14 p-0 ${side.running ? 'bg-red-600 hover:bg-red-500' : 'bg-green-700 hover:bg-green-600'}`}>
                  {side.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="sm" disabled={matchEnded} onClick={side.reset}
                  className="h-9 w-12 sm:h-10 sm:w-14 p-0 bg-zinc-800 hover:bg-zinc-700">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MESA DE CONTROL: cumplimiento de azules y rojas ─────────────────── */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="bg-zinc-900 py-1 text-center border-b border-zinc-800">
          <span className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">Mesa de control — cumplimiento de azules y rojas</span>
        </div>
        <div className={`flex min-h-[64px] relative ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-600 -translate-x-1/2 z-10" />
          {([
            { blues: blueHome, reds: redHome, tone: 'bg-blue-950/20', chip: 'bg-blue-600 border-blue-400' },
            { blues: blueAway, reds: redAway, tone: 'bg-amber-950/20', chip: 'bg-amber-600 border-amber-400' }
          ]).map((side, idx) => (
            <div key={idx} className={`flex-1 flex flex-wrap items-center justify-center gap-3 p-2 ${side.tone}`}>
              {side.blues.map(s => (
                <button key={s.id} onClick={() => askCancel(s.id, s.playerNumber, 'azul')}
                  className="flex flex-col items-center z-20 group" title="Tocar para anular esta sanción">
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black border-2 group-hover:ring-2 group-hover:ring-white/60 ${side.chip}`}>{s.playerNumber}</div>
                    <CardTally team={idx === 0 ? 'home' : 'away'} number={s.playerNumber} />
                  </div>
                  <span className="text-[9px] font-mono font-bold mt-0.5 text-blue-300">{formatTime(s.remainingTime)}</span>
                </button>
              ))}
              {side.reds.map(s => (
                <button key={s.id} onClick={() => askCancel(s.id, s.playerNumber, 'roja')}
                  className="flex flex-col items-center z-20 bg-red-950/50 px-2 py-1 rounded border border-red-800 group" title="Tocar para anular esta sanción">
                  <div className="relative">
                    <div className="w-8 h-8 rounded bg-red-600 border-2 border-white flex items-center justify-center text-white text-xs font-black group-hover:ring-2 group-hover:ring-white/60">{s.playerNumber}</div>
                    <CardTally team={idx === 0 ? 'home' : 'away'} number={s.playerNumber} />
                  </div>
                  <span className="text-[9px] font-mono font-bold mt-0.5 text-red-400">{formatTime(s.remainingTime)}</span>
                </button>
              ))}
              {side.blues.length === 0 && side.reds.length === 0 && (
                <span className="text-[10px] text-zinc-600 font-bold italic uppercase">Silla vacia</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── PANELES DE EQUIPO ──────────────────────────────────────────────── */}
      <div className={`flex flex-wrap gap-3 ${isFlipped ? 'flex-row-reverse' : 'flex-row'}`}>
        <TeamPanel team="home" />
        <TeamPanel team="away" />
      </div>

      {/* ── ADMINISTRACION ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pb-4">
        <div className="col-span-2 lg:col-span-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 overflow-x-auto">
          <span className="text-[9px] text-zinc-500 font-black uppercase shrink-0">Fichas</span>
          <div className="flex gap-1 shrink-0">
            {TOKEN_STYLES.map(t => (
              <button key={t.id} onClick={() => patchLook({ ...look, tokenStyle: t.id })} title={t.hint}
                className={`px-2 h-7 rounded text-[9px] font-black transition-colors ${
                  look.tokenStyle === t.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <span className="w-px h-6 bg-zinc-700 shrink-0" />
          {(['home', 'away'] as const).map(side => {
            const kits = look[side]
            const k = activeKit(kits)
            return (
              <button key={side}
                onClick={() => patchLook({ ...look, [side]: { ...kits, active: kits.active === 'primary' ? 'alternate' : 'primary' } })}
                title={`${side === 'home' ? homeTeamName : awayTeamName} — ${k.name}. Tocar para cambiar de equipación.`}
                className="flex items-center gap-1 px-1.5 h-7 rounded bg-zinc-800 hover:bg-zinc-700 shrink-0">
                <span className="w-3.5 h-3.5 rounded-sm border border-white/40" style={{ background: k.shirt }} />
                <span className="w-3.5 h-3.5 rounded-sm border border-white/40" style={{ background: k.pants }} />
                <span className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ background: k.badge }} />
                <span className="text-[8px] font-black text-zinc-400 uppercase">{k.name.slice(0, 3)}</span>
              </button>
            )
          })}
        </div>

        {matchEnded ? (
          <Button onClick={resumeMatch} disabled={planillaLocked} className="h-10 font-bold text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40"><Play className="w-4 h-4 mr-1" /> REANUDAR</Button>
        ) : (
          <Button onClick={() => setShowEndConfirm(true)} disabled={planillaLocked} className="h-10 font-bold text-xs bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40"><Square className="w-4 h-4 mr-1" /> FIN</Button>
        )}
        <Button onClick={() => setShowOfficialSheet(true)} className="h-10 font-bold text-xs bg-purple-700 hover:bg-purple-600"><FileText className="w-4 h-4 mr-1" /> PLANILLA</Button>
        <Button onClick={() => setShowHistory(true)} className="h-10 font-bold text-xs bg-zinc-700 hover:bg-zinc-600"><History className="w-4 h-4 mr-1" /> HISTORIAL</Button>
        <Button onClick={() => setShowResetConfirm(true)} className="h-10 font-bold text-xs bg-red-700 hover:bg-red-600"><RotateCcw className="w-4 h-4 mr-1" /> NUEVO</Button>
      </div>

      {/* ── CAJÓN INFERIOR: controles que no caben arriba. Empuja, no tapa ──── */}
      {showDrawer && (
        <div className="bg-zinc-900 border-2 border-blue-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase">Ajustes de partido</span>
            <Button onClick={() => setShowDrawer(false)} variant="ghost" size="sm" className="h-6 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></Button>
          </div>

          <div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Ajuste fino del reloj</span>
            <div className="grid grid-cols-4 gap-1">
              {([['-1m', -60], ['-10s', -10], ['+10s', 10], ['+1m', 60]] as const).map(([lbl, sec]) => (
                <Button key={lbl} onClick={() => props.adjustMainClock(sec)} disabled={matchEnded}
                  className="h-10 text-xs font-bold bg-zinc-800 hover:bg-zinc-700">{lbl}</Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex gap-1">
              <Input type="number" min="1" max="60" placeholder="Min" value={customIntermissionMinutes}
                onChange={e => setCustomIntermissionMinutes(e.target.value)}
                className="h-10 bg-zinc-800 border-zinc-700 text-center font-bold text-xs" />
              <Button onClick={() => { const m = parseInt(customIntermissionMinutes); if (m > 0) { props.setMainClockTime(m); setCustomIntermissionMinutes(''); toast.success(`Periodo fijado en ${m} min`) } }}
                disabled={matchEnded} className="h-10 px-2 text-[10px] font-bold bg-zinc-700 hover:bg-zinc-600">FIJAR</Button>
            </div>
            <Button onClick={() => { props.resetMainClock(); toast.info('Reloj reiniciado') }} disabled={matchEnded}
              className="h-10 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700"><RotateCcw className="w-3 h-3 mr-1" /> RESET RELOJ</Button>
            <Button onClick={() => setAddTo('home')} disabled={matchEnded}
              className="h-10 text-[10px] font-bold bg-blue-900 hover:bg-blue-800"><UserPlus className="w-3 h-3 mr-1" /> + JUGADOR {homeTeamName.slice(0, 8)}</Button>
            <Button onClick={() => setAddTo('away')} disabled={matchEnded}
              className="h-10 text-[10px] font-bold bg-amber-900 hover:bg-amber-800"><UserPlus className="w-3 h-3 mr-1" /> + JUGADOR {awayTeamName.slice(0, 8)}</Button>
          </div>

          <div className="border-t border-zinc-800 pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase">Atajos y mando</span>
              <div className="flex gap-1">
                <Button onClick={() => setShowAudio(true)} size="sm" className="h-7 text-[10px] font-bold bg-zinc-700 hover:bg-zinc-600">SONIDO</Button>
                <Button onClick={() => window.dispatchEvent(new Event(OPEN_HOTKEYS_EVENT))} size="sm" className="h-7 text-[10px] font-bold bg-blue-700 hover:bg-blue-600">ATAJOS</Button>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              <b className="text-white">Espacio</b> reloj con chicharra · <b className="text-white">M</b> reloj sin chicharra ·
              <b className="text-white"> A</b>/<b className="text-white">S</b> posesión local · <b className="text-white">L</b>/<b className="text-white">K</b> posesión visita.
              Se desactivan con un modal abierto o el partido finalizado.
            </p>
          </div>
        </div>
      )}

      {/* ── HOJA DE ACCIONES SOBRE LA FICHA ────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-lg p-0" aria-describedby={undefined}>
          <DialogHeader className="sr-only"><DialogTitle>Acciones del jugador</DialogTitle></DialogHeader>
          {selected && (
            <>
              <div className={`p-4 border-b-4 ${selected.team === 'home' ? 'border-blue-500 bg-blue-950/40' : 'border-amber-500 bg-amber-950/40'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border-2 border-white/70 flex items-center justify-center font-black text-2xl text-white"
                    style={{ background: selected.team === 'home' ? jersey.homeJ1 : jersey.awayJ1 }}>
                    {getDisplayNumber(selected.player)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black truncate">{selected.player.name || `Jugador ${getDisplayNumber(selected.player)}`}</h2>
                    <p className={`text-xs font-bold ${selected.team === 'home' ? 'text-blue-400' : 'text-amber-400'}`}>
                      {selected.team === 'home' ? homeTeamName : awayTeamName}
                      {' · '}
                      {selected.onCourt ? 'EN PISTA' : 'EN BANCA'}
                      {isGoalie(selected.player) ? ' · PORTERO' : ''}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                      Amarillas: {getYellowCount(selected.player, selected.team, cardHistory, sanctions)}
                      {' · '}
                      Azules: {getBlueCount(selected.player, selected.team, cardHistory)}
                    </p>
                  </div>
                  <Button onClick={() => setSelected(null)} variant="ghost" className="text-zinc-400 hover:text-white"><X className="w-6 h-6" /></Button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {isShootout ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => registerShot(selected.player, true)}
                        className="h-20 font-black text-xl bg-green-700 hover:bg-green-600">
                        <Goal className="w-6 h-6 mr-2" /> CONVIERTE
                      </Button>
                      <Button onClick={() => registerShot(selected.player, false)}
                        className="h-20 font-black text-xl bg-zinc-700 hover:bg-zinc-600">
                        <X className="w-6 h-6 mr-2" /> FALLA
                      </Button>
                    </div>
                    <p className="text-[11px] text-zinc-500 text-center leading-snug">
                      Tanda de penales · {shootout.suddenDeath ? 'muerte súbita' : `serie de ${SHOOTOUT_ROUNDS}`}
                      {shotsBy(shootingTeam === 'home' ? shootout.home : shootout.away, getDisplayNumber(selected.player)).length > 0 &&
                        ` · el #${getDisplayNumber(selected.player)} ya lanzó ${shotsBy(shootingTeam === 'home' ? shootout.home : shootout.away, getDisplayNumber(selected.player)).length} vez(ces)`}
                    </p>
                  </>
                ) : (
                <div className={`grid ${state.matchConfig.allowPenalties ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                  <Button onClick={() => handleAction('gol')}
                    disabled={stopped || !selected.onCourt}
                    title={!selected.onCourt ? 'Un jugador en banca no puede marcar' : stopped ? `Juego detenido (${stoppedLabel}): sin goles` : ''}
                    className="h-16 font-black text-lg bg-green-700 hover:bg-green-600 disabled:opacity-25">
                    <Goal className="w-5 h-5 mr-1" /> GOL
                  </Button>
                  {state.matchConfig.allowPenalties && (
                    <Button onClick={() => handleAction('penal')} disabled={state.period !== 'penales'} className="h-16 font-black bg-purple-700 hover:bg-purple-600 disabled:opacity-30">
                      PENAL
                    </Button>
                  )}
                </div>

                )}

                {!isShootout && (selected.onCourt ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <Button onClick={() => handleAction('yellow')} className="h-14 font-black bg-yellow-500 hover:bg-yellow-400 text-black">AMARILLA</Button>
                      <Button onClick={() => handleAction('blue')} className="h-14 font-black bg-blue-600 hover:bg-blue-500">AZUL</Button>
                      <Button onClick={() => handleAction('red')} className="h-14 font-black bg-red-600 hover:bg-red-500">ROJA</Button>
                    </div>
                    <p className="text-[10px] text-zinc-600 text-center font-bold">EN PISTA · tarjetas de pista</p>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => openBench(selected.team, 'yellow', selected.player)} className="h-14 font-black bg-yellow-500 hover:bg-yellow-400 text-black">AMARILLA BANCA</Button>
                      <Button onClick={() => openBench(selected.team, 'red', selected.player)} className="h-14 font-black bg-red-600 hover:bg-red-500">ROJA BANCA</Button>
                    </div>
                    <p className="text-[10px] text-zinc-600 text-center font-bold">EN BANCA · abre el reparto de colectivas</p>
                  </>
                ))}

                {!isStaff(selected.player) && (selected.onCourt ? (
                    /* Sacar a alguien de la pista SIEMPRE es un cambio: el equipo
                       no juega con menos por decisión propia. */
                    <Button
                      onClick={() => { setSubbing({ out: selected.player, team: selected.team }); setSelected(null) }}
                      className="w-full h-12 font-black bg-indigo-700 hover:bg-indigo-600 text-sm">
                      <ArrowRightLeft className="w-4 h-4 mr-2" /> CAMBIAR POR…
                    </Button>
                  ) : (
                    <Button onClick={handleToggleCourt}
                      className="w-full h-12 font-black bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-sm">
                      <LogIn className="w-4 h-4 mr-2" /> ENTRAR A PISTA
                    </Button>
                  ))}

                {/* Gestión del jugador: poco frecuente, separada de lo que se aprieta a cada rato */}
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Gestión del jugador</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        const inj = !!selected.player.isDisabled
                        props.setPlayerInjured(selected.team, selected.player.id, getDisplayNumber(selected.player), !inj)
                        toast[inj ? 'success' : 'warning'](inj
                          ? `#${getDisplayNumber(selected.player)} se reincorpora`
                          : `#${getDisplayNumber(selected.player)} sale lesionado — sin sanción`)
                        setSelected(null)
                      }}
                      variant="outline"
                      className={`h-11 text-xs font-bold ${selected.player.isDisabled ? 'border-green-700 text-green-300 hover:bg-green-950' : 'border-rose-800 text-rose-300 hover:bg-rose-950'}`}
                    >
                      <HeartPulse className="w-4 h-4 mr-1.5" /> {selected.player.isDisabled ? 'REINCORPORAR' : 'LESIONADO'}
                    </Button>

                    <Button
                      onClick={() => { props.designateGoalie(selected.team, selected.player.id, getDisplayNumber(selected.player)); toast.success(`#${getDisplayNumber(selected.player)} designado portero`); setSelected(null) }}
                      disabled={isStaff(selected.player) || isGoalie(selected.player)}
                      variant="outline" className="h-11 text-xs font-bold border-emerald-800 text-emerald-300 hover:bg-emerald-950 disabled:opacity-30"
                    >
                      <Shield className="w-4 h-4 mr-1.5" /> PORTERO
                    </Button>

                    <Button
                      onClick={() => { props.designateCaptain(selected.team, selected.player.id, getDisplayNumber(selected.player)); toast.success(`#${getDisplayNumber(selected.player)} designado capitán`); setSelected(null) }}
                      disabled={isStaff(selected.player)}
                      variant="outline" className="h-11 text-xs font-bold border-amber-800 text-amber-300 hover:bg-amber-950 disabled:opacity-30"
                    >
                      <Star className="w-4 h-4 mr-1.5" /> CAPITÁN
                    </Button>

                    <Button
                      onClick={() => { setRenaming({ player: selected.player, team: selected.team }); setNewNumber(getDisplayNumber(selected.player)); setSelected(null) }}
                      disabled={isStaff(selected.player)}
                      variant="outline" className="h-11 text-xs font-bold border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
                    >
                      <Hash className="w-4 h-4 mr-1.5" /> N° CAMISETA
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOGOS DE CONTROL ────────────────────────────────────────────── */}

      {/* ── ÁRBITRO: la falta es del equipo ─────────────────────────────────── */}
      <Dialog open={refOpen} onOpenChange={setRefOpen}>
        <DialogContent className="bg-zinc-900 border-2 border-zinc-500 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Falta de equipo</DialogTitle>
            <p className="text-[11px] text-zinc-500 leading-snug">
              En hockey patín la falta se cobra al equipo, no al jugador. El semáforo se
              enciende en la 9ª avisando que la siguiente es tiro libre directo.
            </p>
          </DialogHeader>
          <div className={`grid grid-cols-2 gap-3 ${isFlipped ? 'flex-row-reverse' : ''}`}>
            {([
              { team: 'home' as const, name: homeTeamName, fouls: state.homeFouls, cls: 'border-blue-600 bg-blue-950/40 hover:border-blue-400' },
              { team: 'away' as const, name: awayTeamName, fouls: state.awayFouls, cls: 'border-amber-600 bg-amber-950/40 hover:border-amber-400' }
            ]).map(t => (
              <button key={t.team}
                onClick={() => {
                  if (t.team === 'home') props.adjustHomeFouls(1)
                  else props.adjustAwayFouls(1)
                  toast.warning(`Falta de ${t.name} — van ${t.fouls + 1}`, { duration: 2200 })
                  setRefOpen(false)
                }}
                className={`h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors ${t.cls}`}>
                <span className="text-sm font-black uppercase truncate max-w-full px-2">{t.name}</span>
                <span className="text-4xl font-black tabular-nums">{t.fouls}</span>
                <span className="text-[10px] font-bold text-zinc-500">faltas · tocar para sumar</span>
              </button>
            ))}
          </div>
          <Button onClick={() => setRefOpen(false)} variant="outline" className="w-full h-11 font-bold border-zinc-600">CERRAR</Button>
        </DialogContent>
      </Dialog>

      {/* ── Cambio jugador por jugador: una sola operación ──────────────────── */}
      <Dialog open={!!subbing} onOpenChange={o => { if (!o) setSubbing(null) }}>
        <DialogContent className="bg-zinc-900 border-2 border-indigo-700 text-white max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              Sale el #{subbing ? getDisplayNumber(subbing.out) : ''} — ¿quién entra?
            </DialogTitle>
          </DialogHeader>
          {subbing && (() => {
            const roster = subbing.team === 'home' ? homePlayers : awayPlayers
            const ids = subbing.team === 'home' ? homeCourtIds : awayCourtIds
            const opciones = eligibleReplacements(subbing.out, subbing.team, ids, roster, cardHistory, sanctions)
            return (
              <div className="space-y-3">
                <p className="text-[11px] text-zinc-500 leading-snug">
                  El cambio se aplica de una vez, así que el equipo nunca queda por debajo
                  del mínimo. {isGoalie(subbing.out) && 'Como sale el portero, sólo aparecen porteros.'}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto">
                  {opciones.map(p => (
                    <button key={p.id}
                      onClick={() => {
                        const r = resolveSubstitution(p, subbing.out, subbing.team, ids, roster, cardHistory, sanctions)
                        if (!r.ok) { toast.warning(r.reason); return }
                        props.setCourtLineup(subbing.team, r.ids, [
                          { playerNumber: getDisplayNumber(subbing.out), direction: 'out' },
                          { playerNumber: getDisplayNumber(p), direction: 'in' }
                        ])
                        toast.success(`Entra #${getDisplayNumber(p)} por #${getDisplayNumber(subbing.out)}`, { duration: 1800 })
                        setSubbing(null)
                      }}
                      className="h-16 rounded-xl border-2 border-zinc-700 bg-zinc-950 hover:border-indigo-500 flex flex-col items-center justify-center transition-colors">
                      <span className="font-black text-lg">{getDisplayNumber(p)}</span>
                      {isGoalie(p) && <span className="text-[8px] font-black text-green-400">PO</span>}
                    </button>
                  ))}
                </div>
                {opciones.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-6">
                    No hay nadie disponible para entrar. Revisa expulsados y lesionados.
                  </p>
                )}
                <Button onClick={() => setSubbing(null)} variant="outline" className="w-full h-11 font-bold border-zinc-600">CANCELAR</Button>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Reasignar número: la persona es la misma, el historial la sigue ─── */}
      <Dialog open={!!renaming} onOpenChange={o => { if (!o) setRenaming(null) }}>
        <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="text-lg font-black">Corregir número de camiseta</DialogTitle></DialogHeader>
          {renaming && (
            <div className="p-2 space-y-3">
              <p className="text-xs text-zinc-400">
                Actual <b className="text-white">#{getDisplayNumber(renaming.player)}</b>. Las tarjetas y los eventos
                ya registrados pasan al número nuevo, porque es la misma persona.
              </p>
              <Input value={newNumber} onChange={e => setNewNumber(e.target.value)} autoFocus
                className="h-14 bg-zinc-800 border-zinc-600 text-center text-3xl font-black" />
              <div className="flex gap-2">
                <Button onClick={() => setRenaming(null)} variant="outline" className="flex-1 h-11 font-bold border-zinc-600">CANCELAR</Button>
                <Button
                  onClick={() => {
                    const roster = renaming.team === 'home' ? homePlayers : awayPlayers
                    const num = newNumber.trim()
                    if (!canUseNumber(roster, renaming.player.id, num)) {
                      toast.error(`El #${num} ya está ocupado en ese equipo.`); return
                    }
                    if (isPlayerExpelled(renaming.player, renaming.team, cardHistory, sanctions)) {
                      toast.error('No se puede reasignar el número de un expulsado.'); return
                    }
                    props.reassignPlayerNumber(renaming.team, renaming.player.id, getDisplayNumber(renaming.player), num)
                    toast.success(`Ahora es el #${num}`)
                    setRenaming(null)
                  }}
                  className="flex-1 h-11 font-black bg-green-700 hover:bg-green-600">GUARDAR</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Agregar jugador al plantel en partido ───────────────────────────── */}
      <Dialog open={!!addTo} onOpenChange={o => { if (!o) { setAddTo(null); setAddNumber('') } }}>
        <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="text-lg font-black">Agregar jugador</DialogTitle></DialogHeader>
          <div className="p-2 space-y-3">
            <p className="text-xs text-zinc-400">
              Se suma a <b className="text-white">{addTo === 'home' ? homeTeamName : awayTeamName}</b> y queda
              registrado en el acta con el minuto de incorporación.
            </p>
            <Input value={addNumber} onChange={e => setAddNumber(e.target.value)} placeholder="N° camiseta" autoFocus
              className="h-14 bg-zinc-800 border-zinc-600 text-center text-3xl font-black" />
            <div className="flex gap-2">
              <Button onClick={() => { setAddTo(null); setAddNumber('') }} variant="outline" className="flex-1 h-11 font-bold border-zinc-600">CANCELAR</Button>
              <Button
                onClick={() => {
                  if (!addTo) return
                  const roster = addTo === 'home' ? homePlayers : awayPlayers
                  const num = addNumber.trim()
                  if (!canUseNumber(roster, '', num)) { toast.error(`El #${num} ya existe en ese equipo.`); return }
                  props.addRosterPlayer(addTo, num)
                  toast.success(`#${num} agregado`)
                  setAddTo(null); setAddNumber('')
                }}
                className="flex-1 h-11 font-black bg-green-700 hover:bg-green-600">AGREGAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Anular sanción cargada por error ────────────────────────────────── */}
      <Dialog open={!!cancelling} onOpenChange={o => { if (!o) setCancelling(null) }}>
        <DialogContent className="bg-zinc-900 border-2 border-red-700 text-white max-w-sm" aria-describedby={undefined}>
          <DialogHeader className="sr-only"><DialogTitle>Anular sanción</DialogTitle></DialogHeader>
          {cancelling && (
            <div className="text-center p-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-black text-red-500 mb-2">ANULAR SANCIÓN</h2>
              <p className="text-zinc-400 mb-5 text-sm">
                Se retira la {cancelling.tipo} del <b className="text-white">#{cancelling.num}</b> y se libera el cupo en pista.
                La tarjeta queda en el historial para la planilla.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setCancelling(null)} variant="outline" className="flex-1 h-11 font-bold border-zinc-600">NO</Button>
                <Button onClick={() => { props.removeSanction(cancelling.id); toast.success(`Sanción del #${cancelling.num} anulada`); setCancelling(null) }}
                  className="flex-1 h-11 font-black bg-red-600 hover:bg-red-500">ANULAR</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showIntermissionSelector} onOpenChange={setShowIntermissionSelector}>
        <DialogContent className="bg-zinc-900 border-2 border-amber-600 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="text-amber-400 text-xl font-black text-center">TIEMPO DE DESCANSO</DialogTitle></DialogHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[2, 5, 10].map(m => (
                <Button key={m} onClick={() => { props.startIntermission(m); setShowIntermissionSelector(false) }} className="h-16 text-lg font-black bg-amber-700 hover:bg-amber-600">{m} MIN</Button>
              ))}
            </div>
            <div className="border-t border-zinc-700 pt-4">
              <Label className="text-zinc-400 text-xs">Personalizado (minutos):</Label>
              <div className="flex gap-2 mt-2">
                <Input type="number" min="1" max="30" value={customIntermissionMinutes} onChange={e => setCustomIntermissionMinutes(e.target.value)} placeholder="Ej: 15" className="bg-zinc-800 border-zinc-600 flex-1 font-bold text-center" />
                <Button onClick={() => { props.startIntermission(parseInt(customIntermissionMinutes) || 10); setShowIntermissionSelector(false); setCustomIntermissionMinutes('') }} disabled={!customIntermissionMinutes} className="bg-amber-700 hover:bg-amber-600 font-bold px-6">INICIAR</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="bg-zinc-900 border-2 border-red-700 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader className="sr-only"><DialogTitle>Confirmar fin</DialogTitle></DialogHeader>
          <div className="text-center p-4">
            <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-red-500 mb-2">FINALIZAR PARTIDO</h2>
            <p className="text-zinc-400 mb-5">Bloquea controles y genera la planilla oficial.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowEndConfirm(false)} variant="outline" className="flex-1 h-12 font-bold border-zinc-600">CANCELAR</Button>
              <Button onClick={confirmEndMatch} className="flex-1 h-12 font-black bg-red-600 hover:bg-red-500">SI, FINALIZAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="bg-zinc-900 border-2 border-red-700 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader className="sr-only"><DialogTitle>Confirmar reset</DialogTitle></DialogHeader>
          <div className="text-center p-4">
            <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-red-500 mb-2">NUEVO PARTIDO</h2>
            <p className="text-zinc-400 mb-5">Borra todos los datos actuales y NO se guardan en el historial.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowResetConfirm(false)} variant="outline" className="flex-1 h-12 font-bold border-zinc-600">CANCELAR</Button>
              <Button onClick={handleFullReset} className="flex-1 h-12 font-black bg-red-600 hover:bg-red-500">SI, RESETEAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
