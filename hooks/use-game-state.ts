"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { emptyMatchAdjustments, type MatchAdjustments, type TeamAdjustments } from '@/lib/court-rules'
import { toast } from 'sonner'

// ─── Generador de IDs único (sin colisiones en loops síncronos) ──────────────
const uid = () => crypto.randomUUID()

export type Period = '1er_tiempo' | '2do_tiempo' | 'alargue' | 'penales'

export interface Team {
  id: string
  name: string
  logo: string | null
  /**
   * Serie a la que pertenece este registro (id de lib/series).
   * El mismo club en Sub-13 y en Adulta son DOS equipos guardados distintos,
   * porque tienen planteles y camisetas distintas.
   * Opcional: los equipos guardados antes de la 3.24 no lo traen y se muestran
   * en todas las series hasta que el operador los reguarde.
   */
  serie?: string
  /** Camisetas de ese equipo en esa serie. */
  roster?: Array<{ number: string; isGoalie: boolean }>
}

// PLANILLA OFICIAL 2026: Jugador registrado
export interface Player {
  id: string
  number: string
  name: string
  rut: string
  position: 'PO' | 'DEF' | 'MED' | 'DEL' | ''
  role: 'capitan' | 'portero' | 'dt' | 'ay1' | 'ay2' | 'ax1' | 'ax2' | 'jugador_pista' | 'suplente' | ''
  isDisabled?: boolean
}

// MOTOR TARJETAS 2026: Personal de Banca
export interface BenchStaff {
  id: string
  name: string
  role: 'dt' | 'ay1' | 'ay2' | 'ax1' | 'ax2' | 'suplente'
  team: 'home' | 'away'
}

// MOTOR TARJETAS 2026: Historial de tarjetas individuales (acumulado en todo el partido)
export interface CardHistory {
  id: string
  team: 'home' | 'away'
  playerNumber: string
  staffId?: string
  isBench: boolean
  cardType: 'yellow' | 'blue' | 'red'
  sanctionType: 'direct' | 'collective'
  period: Period
  gameTime: number
  timestamp: string
}

// Cuerpo Arbitral
export interface RefereeData {
  principal: string
  segundo: string
  auxiliar: string
  cronometrista: string
  encargadoPista: string
}

// Firmas Digitales Pre-Partido (Apertura)
export interface SignatureData {
  delegadoLocal: string | null
  delegadoVisita: string | null
  arbitroAuxiliarMesa: string | null
}

// Firmas Digitales Post-Partido (Cierre) - 8 Obligatorias Federacion 2026
export interface ClosingSignatureData {
  capitanLocal: string | null
  capitanVisita: string | null
  dtLocal: string | null
  dtVisita: string | null
  encargadoCancha: string | null
  arbitroCronometrista: string | null
  arbitroPrincipal: string | null
  arbitroAuxiliar: string | null
}

// Fase del partido
export type MatchPhase = 'pre-partido' | 'en-juego' | 'post-partido'

// Motor de Eventos (Logging)
export interface MatchEvent {
  id: string
  timestamp: string
  gameTime: number
  period: Period
  eventType: 'gol' | 'falta' | 'penal' | 'penal_ronda' | 'tarjeta_amarilla' | 'tarjeta_azul' | 'tarjeta_roja' | 'timeout' | 'periodo' | 'inicio' | 'fin' | 'cambio' | 'ajuste'
  team: 'home' | 'away' | null
  actor: string
  details?: string
}

export interface MatchRecord {
  id: string
  date: string
  series: string
  gender: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homePenalties?: number 
  awayPenalties?: number 
  winner?: 'home' | 'away' | 'draw' | null 
  homeLogo: string | null
  awayLogo: string | null
  sanctions: Array<{
    team: 'home' | 'away'
    type: 'yellow' | 'blue' | 'red'
    playerNumber: string
    isBench: boolean
  }>
  referees?: RefereeData
  homePlayers?: Player[]
  awayPlayers?: Player[]
  matchLog?: MatchEvent[]
}

export interface MatchConfig {
  seriesName: string
  gender: string
  periodsCount: number
  periodDuration: number
  campeonato: string
  partidoNumero: string
  homeRoster: string[]
  awayRoster: string[]
  homePlayers: Player[]
  awayPlayers: Player[]
  referees: RefereeData
  signatures: SignatureData
  closingSignatures: ClosingSignatureData
  isExpressMode: boolean
  allowOvertime: boolean
  allowPenalties: boolean
}

// REGLAMENTO 2026: Sanciones con Power Play Total (sin cancelación por gol)
export interface Sanction {
  id: string
  team: 'home' | 'away'
  type: 'yellow' | 'blue' | 'red'
  playerNumber: string
  staffId?: string
  isBench: boolean
  sanctionType?: 'direct' | 'collective'
  remainingTime: number
  startTime: number
  originalCard?: 'yellow' | 'blue' | 'red'
  wasEscalated?: boolean
}

export interface GameState {
  matchConfig: MatchConfig
  isMatchConfigured: boolean
  matchPhase: MatchPhase
  mainClock: number
  isMainClockRunning: boolean
  initialClockTime: number
  period: Period
  currentPeriodNumber: number
  isIntermission: boolean
  homeScore: number
  awayScore: number
  homeTeam: Team | null
  awayTeam: Team | null
  homeFouls: number
  awayFouls: number
  homePenalties: number
  awayPenalties: number
  isHomeFoul10Active: boolean
  isAwayFoul10Active: boolean
  homeYellowCards: number
  awayYellowCards: number
  homeTimeoutsUsed: number
  awayTimeoutsUsed: number
  homeTimeoutRequested: boolean
  awayTimeoutRequested: boolean
  activeTimeout: 'home' | 'away' | null
  timeoutClock: number
  possessionClockLeft: number
  possessionClockRight: number
  isPossessionLeftRunning: boolean
  isPossessionRightRunning: boolean
  isMatchEnded: boolean
  winner: 'home' | 'away' | 'draw' | null
  sanctions: Sanction[]
  cardHistory: CardHistory[]
  matchLog: MatchEvent[]
  homeCourtIds: string[]
  awayCourtIds: string[]
  homePossessionTime: number
  awayPossessionTime: number
  matchAdjustments: MatchAdjustments
  timestamps: {
    matchStart?: string
    matchEnd?: string
    period1Start?: string
    period1End?: string
    period2Start?: string
    period2End?: string
    overtimeStart?: string
    overtimeEnd?: string
  }
  goalAnimation?: { id: string; team: 'home' | 'away'; playerNumber: string; timestamp: number };
}

const TIMEOUT_DURATION = 60
const POSSESSION_DURATION = 45
const DEFAULT_PERIOD_DURATION = 25
export const INTERMISSION_DURATION = 600
const BLUE_CARD_DURATION = 120  // 2 minutos
const RED_CARD_DURATION = 240   // 4 minutos
const TIMEOUT_WARNING = 15

// Sin URLs externas: el sonido lo genera lib/audio-engine y el MP3 propio se
// carga como archivo local desde el modal de sonido.
export const BUZZER_OPTIONS = { reggaeton: '', hockey: '', buzzer: '' }

const initialReferees: RefereeData = {
  principal: '', segundo: '', auxiliar: '', cronometrista: '', encargadoPista: ''
}

const initialSignatures: SignatureData = {
  delegadoLocal: null, delegadoVisita: null, arbitroAuxiliarMesa: null
}

const initialClosingSignatures: ClosingSignatureData = {
  capitanLocal: null, capitanVisita: null, dtLocal: null, dtVisita: null,
  encargadoCancha: null, arbitroCronometrista: null, arbitroPrincipal: null, arbitroAuxiliar: null
}

const initialConfig: MatchConfig = {
  seriesName: 'Adulta', gender: 'MASCULINA', periodsCount: 2,
  periodDuration: DEFAULT_PERIOD_DURATION,
  campeonato: 'Liga Regular', partidoNumero: '1',
  homeRoster: [], awayRoster: [], homePlayers: [], awayPlayers: [],
  referees: initialReferees, signatures: initialSignatures,
  closingSignatures: initialClosingSignatures,
  isExpressMode: false, allowOvertime: false, allowPenalties: false
}

const initialState: GameState = {
  matchConfig: initialConfig,
  isMatchConfigured: false,
  matchPhase: 'pre-partido',
  mainClock: DEFAULT_PERIOD_DURATION * 60,
  isMainClockRunning: false,
  initialClockTime: DEFAULT_PERIOD_DURATION * 60,
  period: '1er_tiempo',
  currentPeriodNumber: 1,
  isIntermission: false,
  homeScore: 0, awayScore: 0,
  homeTeam: null, awayTeam: null,
  homeFouls: 0, awayFouls: 0,
  homePenalties: 0, awayPenalties: 0,
  isHomeFoul10Active: false, isAwayFoul10Active: false,
  homeYellowCards: 0, awayYellowCards: 0,
  homeTimeoutsUsed: 0, awayTimeoutsUsed: 0,
  homeTimeoutRequested: false, awayTimeoutRequested: false,
  activeTimeout: null, timeoutClock: 0,
  possessionClockLeft: POSSESSION_DURATION,
  possessionClockRight: POSSESSION_DURATION,
  isPossessionLeftRunning: false, isPossessionRightRunning: false,
  isMatchEnded: false, winner: null,
  sanctions: [], cardHistory: [], matchLog: [], timestamps: {},
  homeCourtIds: [], awayCourtIds: [], homePossessionTime: 0, awayPossessionTime: 0, matchAdjustments: emptyMatchAdjustments()
}

const TEAMS_STORAGE_KEY      = 'hockey-teams'
const HISTORY_STORAGE_KEY    = 'hockey-match-history'
const HISTORY_MAX_RECORDS    = 60
const BUZZER_STORAGE_KEY     = 'hockey-buzzer-sound'
const LIVE_GAME_STORAGE_KEY  = 'hockey-live-game-state'
const BUZZER_TRIGGER_KEY     = 'hockey-buzzer-trigger'

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    toast.error('Error al guardar datos locales. Puede que el almacenamiento esté lleno.')
  }
}

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState)
  const [savedTeams, setSavedTeams]       = useState<Team[]>([])
  const [matchHistory, setMatchHistory]   = useState<MatchRecord[]>([])
  const [buzzerSound, setBuzzerSound]     = useState<string>(BUZZER_OPTIONS.reggaeton)

  const audioRef     = useRef<HTMLAudioElement | null>(null)
  const channelRef   = useRef<BroadcastChannel | null>(null)

  const pathname   = usePathname()
  const isReceiver = pathname?.includes('/scoreboard') ?? false

  useEffect(() => {
    setSavedTeams(lsGet<Team[]>(TEAMS_STORAGE_KEY, []))
    setMatchHistory(lsGet<MatchRecord[]>(HISTORY_STORAGE_KEY, []))
    const savedBuzzer = localStorage.getItem(BUZZER_STORAGE_KEY)
    if (savedBuzzer) setBuzzerSound(savedBuzzer)

    const savedLiveGame = localStorage.getItem(LIVE_GAME_STORAGE_KEY)
    if (savedLiveGame) {
      try {
        const parsed = JSON.parse(savedLiveGame) as Partial<GameState>
        if (isReceiver) {
          setState({ ...initialState, ...parsed })
        } else {
          setState({
            ...initialState, ...parsed,
            isMainClockRunning: false,
            isPossessionLeftRunning: false,
            isPossessionRightRunning: false,
          })
        }
      } catch { /* estado corrupto — ignorar */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isReceiver) return
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LIVE_GAME_STORAGE_KEY && e.newValue) {
        try { setState(JSON.parse(e.newValue) as GameState) } catch { /* ignorar */ }
      }

    }
    window.addEventListener('storage', handleStorage)

    const channel = new BroadcastChannel('hockey-scoreboard-sync')
    channel.onmessage = (event) => {
      if (event.data.type === 'GAME_STATE_UPDATE') {
        setState(event.data.state as GameState)
      } else if (event.data.type === 'PLAY_BUZZER') {
        // Las ventanas de tablero no reproducen audio
      }
    }
    return () => {
      window.removeEventListener('storage', handleStorage)
      channel.close()
    }
  }, [isReceiver])

  useEffect(() => {
    if (isReceiver) return
    lsSet(LIVE_GAME_STORAGE_KEY, state)
    if (!channelRef.current) {
      channelRef.current = new BroadcastChannel('hockey-scoreboard-sync')
    }
    channelRef.current.postMessage({ type: 'GAME_STATE_UPDATE', state })
  }, [state, isReceiver])

  useEffect(() => {
    return () => {
      if (!isReceiver) channelRef.current?.close()
    }
  }, [isReceiver])

  // El sonido lo produce lib/audio-engine en la maquina del operador.
  // Aqui habia un Audio() apuntando a una URL externa: dependencia de internet
  // en un gimnasio y, en las ventanas de tablero, un MP3 distinto del que sonaba
  // en la mesa. El audio sale por el plug del notebook, no por los tableros.

  const playBuzzer = useCallback(() => {
    if (!isReceiver) {
      lsSet(BUZZER_TRIGGER_KEY, Date.now())
      channelRef.current?.postMessage({ type: 'PLAY_BUZZER' })
    }
  }, [isReceiver])

  const changeBuzzerSound = useCallback((src: string) => {
    setBuzzerSound(src)
    lsSet(BUZZER_STORAGE_KEY, src)
  }, [])

  useEffect(() => {
    if (isReceiver || !state.isMainClockRunning || state.mainClock <= 0) return
    const startTs    = performance.now()
    const startClock = state.mainClock

    const interval = setInterval(() => {
      const elapsed  = (performance.now() - startTs) / 1000
      const accurate = Math.max(0, startClock - Math.floor(elapsed))
      setState(prev => {
        if (!prev.isMainClockRunning || accurate === prev.mainClock) return prev
        
        const delta = prev.mainClock - accurate
        let finalSanctions = [...prev.sanctions]
        
        if (delta > 0) {
            let remainingDeltaHome = delta;
            while (remainingDeltaHome > 0) {
                const activeIndex = finalSanctions.findIndex(s => s.team === 'home' && s.remainingTime > 0 && !s.isBench);
                if (activeIndex === -1) break;
                const deduct = Math.min(finalSanctions[activeIndex].remainingTime, remainingDeltaHome);
                finalSanctions[activeIndex] = { ...finalSanctions[activeIndex], remainingTime: finalSanctions[activeIndex].remainingTime - deduct };
                remainingDeltaHome -= deduct;
            }
            
            let remainingDeltaAway = delta;
            while (remainingDeltaAway > 0) {
                const activeIndex = finalSanctions.findIndex(s => s.team === 'away' && s.remainingTime > 0 && !s.isBench);
                if (activeIndex === -1) break;
                const deduct = Math.min(finalSanctions[activeIndex].remainingTime, remainingDeltaAway);
                finalSanctions[activeIndex] = { ...finalSanctions[activeIndex], remainingTime: finalSanctions[activeIndex].remainingTime - deduct };
                remainingDeltaAway -= deduct;
            }
        }

        if (accurate <= 0) {
          playBuzzer()
          return {
            ...prev, mainClock: 0, isMainClockRunning: false, isIntermission: false,
            sanctions: finalSanctions
          }
        }
        
        return {
          ...prev, mainClock: accurate,
          sanctions: finalSanctions
        }
      })
    }, 250)
    return () => clearInterval(interval)
  }, [isReceiver, state.isMainClockRunning, state.mainClock, playBuzzer])

  useEffect(() => {
    if (isReceiver || !state.activeTimeout || state.timeoutClock <= 0) return
    const startTs    = performance.now()
    const startClock = state.timeoutClock

    const interval = setInterval(() => {
      const elapsed  = (performance.now() - startTs) / 1000
      const accurate = Math.max(0, startClock - Math.floor(elapsed))
      setState(prev => {
        if (!prev.activeTimeout || accurate === prev.timeoutClock) return prev
        if (accurate <= 0) {
          playBuzzer()
          return { ...prev, timeoutClock: 0, activeTimeout: null }
        }
        if (prev.timeoutClock > TIMEOUT_WARNING + 1 && accurate <= TIMEOUT_WARNING) {
          playBuzzer()
        }
        return { ...prev, timeoutClock: accurate }
      })
    }, 250)
    return () => clearInterval(interval)
  }, [isReceiver, state.activeTimeout, state.timeoutClock, playBuzzer])

  // 🛡️ REPARADO: Vuelve el reloj a la normalidad cuando termina el descanso.
  useEffect(() => {
    if (isReceiver || !state.isIntermission || state.mainClock <= 0) return
    const startTs    = performance.now()
    const startClock = state.mainClock

    const interval = setInterval(() => {
      const elapsed  = (performance.now() - startTs) / 1000
      const accurate = Math.max(0, startClock - Math.floor(elapsed))
      setState(prev => {
        if (!prev.isIntermission || accurate === prev.mainClock) return prev
        if (accurate <= 0) {
          playBuzzer()
          return { ...prev, mainClock: prev.initialClockTime, isIntermission: false, isMainClockRunning: false }
        }
        return { ...prev, mainClock: accurate }
      })
    }, 250)
    return () => clearInterval(interval)
  }, [isReceiver, state.isIntermission, state.mainClock, playBuzzer])

  useEffect(() => {
    if (isReceiver || !state.isPossessionLeftRunning || state.possessionClockLeft <= 0) return
    const startTs    = performance.now()
    const startClock = state.possessionClockLeft

    const interval = setInterval(() => {
      const elapsed  = (performance.now() - startTs) / 1000
      const accurate = Math.max(0, startClock - Math.floor(elapsed))
      setState(prev => {
        if (!prev.isPossessionLeftRunning || accurate === prev.possessionClockLeft) return prev
        const usado = prev.possessionClockLeft - accurate
        if (accurate <= 0) {
          playBuzzer()
          return {
            ...prev, possessionClockLeft: 0, isPossessionLeftRunning: false, isMainClockRunning: false,
            homePossessionTime: (prev.homePossessionTime || 0) + usado
          }
        }
        return { ...prev, possessionClockLeft: accurate, homePossessionTime: (prev.homePossessionTime || 0) + usado }
      })
    }, 250)
    return () => clearInterval(interval)
  }, [isReceiver, state.isPossessionLeftRunning, state.possessionClockLeft, playBuzzer])

  useEffect(() => {
    if (isReceiver || !state.isPossessionRightRunning || state.possessionClockRight <= 0) return
    const startTs    = performance.now()
    const startClock = state.possessionClockRight

    const interval = setInterval(() => {
      const elapsed  = (performance.now() - startTs) / 1000
      const accurate = Math.max(0, startClock - Math.floor(elapsed))
      setState(prev => {
        if (!prev.isPossessionRightRunning || accurate === prev.possessionClockRight) return prev
        const usado = prev.possessionClockRight - accurate
        if (accurate <= 0) {
          playBuzzer()
          return {
            ...prev, possessionClockRight: 0, isPossessionRightRunning: false, isMainClockRunning: false,
            awayPossessionTime: (prev.awayPossessionTime || 0) + usado
          }
        }
        return { ...prev, possessionClockRight: accurate, awayPossessionTime: (prev.awayPossessionTime || 0) + usado }
      })
    }, 250)
    return () => clearInterval(interval)
  }, [isReceiver, state.isPossessionRightRunning, state.possessionClockRight, playBuzzer])

  const configureMatch = useCallback((config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null) => {
    const clockSeconds = config.periodDuration * 60
    const now = new Date().toISOString()
    const startEvent: MatchEvent = {
      id: uid(), timestamp: now, gameTime: clockSeconds, period: '1er_tiempo',
      eventType: 'inicio', team: null, actor: 'SISTEMA',
      details: `Partido iniciado: ${homeTeam?.name || 'LOCAL'} vs ${awayTeam?.name || 'VISITA'}`
    }
    setState(() => ({
      ...initialState, matchConfig: config, isMatchConfigured: true, matchPhase: 'en-juego',
      initialClockTime: clockSeconds, mainClock: clockSeconds, homeTeam, awayTeam,
      period: '1er_tiempo', currentPeriodNumber: 1,
      timestamps: { matchStart: now, period1Start: now }, matchLog: [startEvent]
    }))
  }, [])

  interface ResumeParams {
    period: Period
    clockTime: number
    homeScore: number
    awayScore: number
    homeFouls: number
    awayFouls: number
  }

  const configureMatchWithResume = useCallback((
    config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null, resume: ResumeParams
  ) => {
    const now = new Date().toISOString()
    const periodNumber = resume.period === '1er_tiempo' ? 1 : resume.period === '2do_tiempo' ? 2 : 3
    const resumeEvent: MatchEvent = {
      id: uid(), timestamp: now, gameTime: resume.clockTime, period: resume.period,
      eventType: 'inicio', team: null, actor: 'SISTEMA',
      details: `Partido REANUDADO desde ${resume.period === '1er_tiempo' ? '1er Tiempo' : resume.period === '2do_tiempo' ? '2do Tiempo' : 'Prorroga'} - ${Math.floor(resume.clockTime / 60)}:${(resume.clockTime % 60).toString().padStart(2, '0')} - Marcador: ${resume.homeScore}-${resume.awayScore}`
    }
    setState(() => ({
      ...initialState, matchConfig: config, isMatchConfigured: true, matchPhase: 'en-juego',
      initialClockTime: config.periodDuration * 60, mainClock: resume.clockTime,
      homeTeam, awayTeam, period: resume.period, currentPeriodNumber: periodNumber,
      homeScore: resume.homeScore, awayScore: resume.awayScore,
      homeFouls: resume.homeFouls, awayFouls: resume.awayFouls,
      timestamps: { matchStart: now }, matchLog: [resumeEvent]
    }))
  }, [])

  const setSignature = useCallback((role: keyof SignatureData, signatureData: string) => {
    setState(prev => ({
      ...prev,
      matchConfig: { ...prev.matchConfig, signatures: { ...prev.matchConfig.signatures, [role]: signatureData } }
    }))
  }, [])

  const setClosingSignature = useCallback((role: keyof ClosingSignatureData, signatureData: string) => {
    setState(prev => ({
      ...prev,
      matchConfig: { ...prev.matchConfig, closingSignatures: { ...prev.matchConfig.closingSignatures, [role]: signatureData } }
    }))
  }, [])

  const setMatchPhase = useCallback((phase: MatchPhase) => {
    setState(prev => ({ ...prev, matchPhase: phase }))
  }, [])

  const startIntermission = useCallback((durationMinutes?: number) => {
    playBuzzer()
    const duration = durationMinutes ? durationMinutes * 60 : INTERMISSION_DURATION
    setState(prev => ({
      ...prev, isIntermission: true, mainClock: duration, isMainClockRunning: false,
      isPossessionLeftRunning: false, isPossessionRightRunning: false, 
      possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION,
      activeTimeout: null
    }))
  }, [playBuzzer])

  const endIntermission = useCallback(() => {
    setState(prev => ({ ...prev, isIntermission: false, mainClock: prev.initialClockTime, isMainClockRunning: false }))
  }, [])

  const toggleMainClock = useCallback(() => setState(prev => {
    if (prev.activeTimeout) return prev
    if (prev.isMainClockRunning) {
      return { 
        ...prev, 
        isMainClockRunning: false, 
        isPossessionLeftRunning: false, 
        isPossessionRightRunning: false,
        possessionClockLeft: POSSESSION_DURATION,
        possessionClockRight: POSSESSION_DURATION
      }
    }
    return { ...prev, isMainClockRunning: true }
  }), [])

  const pauseMainClock = useCallback(() => setState(prev => ({ 
    ...prev, 
    isMainClockRunning: false,
    isPossessionLeftRunning: false,
    isPossessionRightRunning: false,
    possessionClockLeft: POSSESSION_DURATION,
    possessionClockRight: POSSESSION_DURATION
  })), [])

  const resetMainClock = useCallback(() => setState(prev => ({ 
    ...prev, 
    mainClock: prev.isIntermission ? INTERMISSION_DURATION : prev.initialClockTime, 
    isMainClockRunning: false,
    isPossessionLeftRunning: false,
    isPossessionRightRunning: false,
    possessionClockLeft: POSSESSION_DURATION,
    possessionClockRight: POSSESSION_DURATION
  })), [])

  const setMainClockTime = useCallback((minutes: number) => setState(prev => ({ 
    ...prev, 
    mainClock: minutes * 60, 
    initialClockTime: minutes * 60, 
    isMainClockRunning: false 
  })), [])
  
  const adjustMainClock  = useCallback((seconds: number) => setState(prev => ({ 
    ...prev, 
    mainClock: Math.max(0, prev.mainClock + seconds) 
  })), [])

  const setPeriod = useCallback((period: Period) => setState(prev => {
    if (period === 'alargue' && !prev.matchConfig.allowOvertime) {
      toast.error('REGLA DE JUEGO: El Alargue no está habilitado en la configuración inicial de este partido.')
      return prev
    }
    if (period === 'penales' && !prev.matchConfig.allowPenalties) {
      toast.error('REGLA DE JUEGO: Los Penales no están habilitados en la configuración inicial de este partido.')
      return prev
    }
    return {
      ...prev, period, isIntermission: false,
      mainClock: period === 'penales' ? 0 : prev.initialClockTime,
      isMainClockRunning: false, isPossessionLeftRunning: false, isPossessionRightRunning: false
    }
  }), [])

  const nextPeriod = useCallback(() => {
    setState(prev => {
      const now = new Date().toISOString()
      let nextPeriodVal: Period
      let nextNum = prev.currentPeriodNumber + 1
      let periodName = ''

      if (prev.period === '1er_tiempo') {
        nextPeriodVal = '2do_tiempo'; periodName = '2do Tiempo'
      } else if (prev.period === '2do_tiempo') {
        if (prev.matchConfig.allowOvertime) {
          nextPeriodVal = 'alargue'; periodName = 'Prorroga'
        } else if (prev.matchConfig.allowPenalties) {
          nextPeriodVal = 'penales'; periodName = 'Penales'; nextNum = 4
        } else {
          toast.error('Configuración de Partido: No hay alargue ni penales configurados. El partido debe finalizar.')
          return prev
        }
      } else if (prev.period === 'alargue') {
        if (prev.matchConfig.allowPenalties) {
          nextPeriodVal = 'penales'; periodName = 'Penales'; nextNum = 4
        } else {
          toast.error('Configuración de Partido: No hay penales configurados. El partido debe finalizar.')
          return prev
        }
      } else {
        return prev 
      }

      const periodEndEvent: MatchEvent = {
        id: uid(), timestamp: now, gameTime: prev.mainClock, period: prev.period,
        eventType: 'periodo', team: null, actor: 'SISTEMA',
        details: `Fin del ${prev.period === '1er_tiempo' ? '1er Tiempo' : prev.period === '2do_tiempo' ? '2do Tiempo' : 'Periodo'}`
      }
      const periodStartEvent: MatchEvent = {
        id: uid(), timestamp: now,
        gameTime: nextPeriodVal === 'penales' ? 0 : prev.initialClockTime,
        period: nextPeriodVal, eventType: 'periodo', team: null, actor: 'SISTEMA',
        details: `Inicio de ${periodName}`
      }

      const newTimestamps = { ...prev.timestamps }
      if (prev.period === '1er_tiempo') newTimestamps.period1End = now
      if (nextPeriodVal === '2do_tiempo') newTimestamps.period2Start = now
      if (nextPeriodVal === 'alargue') { newTimestamps.period2End = now; newTimestamps.overtimeStart = now }

      return {
        ...prev, period: nextPeriodVal, currentPeriodNumber: nextNum,
        mainClock: nextPeriodVal === 'penales' ? 0 : prev.initialClockTime,
        isMainClockRunning: false, isIntermission: false,
        homeTimeoutsUsed: 0, awayTimeoutsUsed: 0,
        homeTimeoutRequested: false, awayTimeoutRequested: false,
        matchLog: [...prev.matchLog, periodEndEvent, periodStartEvent],
        timestamps: newTimestamps
      }
    })
  }, [])

  // ─── Marcador ─────────────────────────────────────────────────────────────
  
  const adjustHomeScore = useCallback((delta: number, playerNumber?: string) => setState(prev => {
    const newScore = Math.max(0, prev.homeScore + delta)
    if (delta > 0) {
      const event: MatchEvent = {
        id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
        period: prev.period, eventType: 'gol', team: 'home',
        actor: playerNumber || '?', details: `Gol ${newScore}`
      }
      
      const goalAnimation = playerNumber !== undefined ? { id: uid(), team: 'home' as const, playerNumber, timestamp: Date.now() } : undefined;

      return {
        ...prev, homeScore: newScore, matchLog: [...prev.matchLog, event],
        isMainClockRunning: false,
        possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION,
        isPossessionLeftRunning: false, isPossessionRightRunning: false,
        ...(goalAnimation && { goalAnimation })
      }
    }
    return { ...prev, homeScore: newScore }
  }), [])

  const adjustAwayScore = useCallback((delta: number, playerNumber?: string) => setState(prev => {
    const newScore = Math.max(0, prev.awayScore + delta)
    if (delta > 0) {
      const event: MatchEvent = {
        id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
        period: prev.period, eventType: 'gol', team: 'away',
        actor: playerNumber || '?', details: `Gol ${newScore}`
      }
      
      const goalAnimation = playerNumber !== undefined ? { id: uid(), team: 'away' as const, playerNumber, timestamp: Date.now() } : undefined;

      return {
        ...prev, awayScore: newScore, matchLog: [...prev.matchLog, event],
        isMainClockRunning: false,
        possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION,
        isPossessionLeftRunning: false, isPossessionRightRunning: false,
        ...(goalAnimation && { goalAnimation })
      }
    }
    return { ...prev, awayScore: newScore }
  }), [])

  const adjustHomePenalties = useCallback((delta: number) => setState(prev => ({ ...prev, homePenalties: Math.max(0, (prev.homePenalties || 0) + delta) })), [])
  const adjustAwayPenalties = useCallback((delta: number) => setState(prev => ({ ...prev, awayPenalties: Math.max(0, (prev.awayPenalties || 0) + delta) })), [])

  const isFoulWarning    = (fouls: number) => fouls === 9 || (fouls > 10 && (fouls - 9) % 5 === 0)
  const isFoulDirectKick = (fouls: number) => fouls === 10 || (fouls > 10 && (fouls - 10) % 5 === 0)

  const adjustHomeFouls = useCallback((delta: number, playerNumber?: string) => {
    setState(prev => {
      const newFouls = Math.max(0, (prev.homeFouls || 0) + delta)
      const warning = isFoulWarning(newFouls)
      if (delta > 0) {
        const isDirectKick = isFoulDirectKick(newFouls)
        if (isDirectKick) playBuzzer()
        const event: MatchEvent = {
          id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
          period: prev.period, eventType: 'falta', team: 'home',
          actor: playerNumber || '?',
          details: isDirectKick ? `Falta ${newFouls} - TIRO LIBRE DIRECTO` : `Falta ${newFouls}`
        }
        return {
          ...prev, homeFouls: newFouls,
          isHomeFoul10Active: warning && !isDirectKick,
          isMainClockRunning: isDirectKick ? false : prev.isMainClockRunning,
          isPossessionLeftRunning: isDirectKick ? false : prev.isPossessionLeftRunning,
          isPossessionRightRunning: isDirectKick ? false : prev.isPossessionRightRunning,
          possessionClockLeft: isDirectKick ? POSSESSION_DURATION : prev.possessionClockLeft,
          possessionClockRight: isDirectKick ? POSSESSION_DURATION : prev.possessionClockRight,
          matchLog: [...prev.matchLog, event]
        }
      }
      return { ...prev, homeFouls: newFouls, isHomeFoul10Active: warning }
    })
  }, [playBuzzer])

  const adjustAwayFouls = useCallback((delta: number, playerNumber?: string) => {
    setState(prev => {
      const newFouls = Math.max(0, (prev.awayFouls || 0) + delta)
      const warning = isFoulWarning(newFouls)
      if (delta > 0) {
        const isDirectKick = isFoulDirectKick(newFouls)
        if (isDirectKick) playBuzzer()
        const event: MatchEvent = {
          id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
          period: prev.period, eventType: 'falta', team: 'away',
          actor: playerNumber || '?',
          details: isDirectKick ? `Falta ${newFouls} - TIRO LIBRE DIRECTO` : `Falta ${newFouls}`
        }
        return {
          ...prev, awayFouls: newFouls,
          isAwayFoul10Active: warning && !isDirectKick,
          isMainClockRunning: isDirectKick ? false : prev.isMainClockRunning,
          isPossessionLeftRunning: isDirectKick ? false : prev.isPossessionLeftRunning,
          isPossessionRightRunning: isDirectKick ? false : prev.isPossessionRightRunning,
          possessionClockLeft: isDirectKick ? POSSESSION_DURATION : prev.possessionClockLeft,
          possessionClockRight: isDirectKick ? POSSESSION_DURATION : prev.possessionClockRight,
          matchLog: [...prev.matchLog, event]
        }
      }
      return { ...prev, awayFouls: newFouls, isAwayFoul10Active: warning }
    })
  }, [playBuzzer])

  const resetFouls = useCallback(() => setState(prev => ({
    ...prev, homeFouls: 0, awayFouls: 0, isHomeFoul10Active: false, isAwayFoul10Active: false
  })), [])

  const addYellowCard = useCallback((team: 'home' | 'away') => {
    setState(prev => {
      const currentYellows = team === 'home' ? prev.homeYellowCards : prev.awayYellowCards
      if (currentYellows >= 1) playBuzzer()
      return {
        ...prev,
        homeYellowCards: team === 'home' ? prev.homeYellowCards + 1 : prev.homeYellowCards,
        awayYellowCards: team === 'away' ? prev.awayYellowCards + 1 : prev.awayYellowCards
      }
    })
  }, [playBuzzer])

  const resetYellowCards = useCallback((team: 'home' | 'away') => {
    setState(prev => ({
      ...prev,
      homeYellowCards: team === 'home' ? 0 : prev.homeYellowCards,
      awayYellowCards: team === 'away' ? 0 : prev.awayYellowCards
    }))
  }, [])

  const getPlayerCardCount = useCallback((
    cardHistory: CardHistory[], team: 'home' | 'away', playerNumber: string, cardType?: 'yellow' | 'blue' | 'red'
  ) => {
    return cardHistory.filter(c =>
      c.team === team && c.playerNumber === playerNumber && (!cardType || c.cardType === cardType)
    ).length
  }, [])

  const getPlayerBlueCount = useCallback((
    cardHistory: CardHistory[], team: 'home' | 'away', playerNumber: string
  ) => {
    return cardHistory.filter(c =>
      c.team === team && c.playerNumber === playerNumber && c.cardType === 'blue' && !c.isBench
    ).length
  }, [])

  const calculateCourtCardResult = useCallback((
    cardHistory: CardHistory[], team: 'home' | 'away', playerNumber: string,
    sentCard: 'yellow' | 'blue' | 'red'
  ): { finalCard: 'yellow' | 'blue' | 'red'; duration: number; wasEscalated: boolean; isAlreadyExpelled: boolean } => {
    const hasRed = cardHistory.some(c => c.team === team && c.playerNumber === playerNumber && c.cardType === 'red')
    if (hasRed) return { finalCard: sentCard, duration: 0, wasEscalated: false, isAlreadyExpelled: true }

    const totalYellows      = cardHistory.filter(c => c.team === team && c.playerNumber === playerNumber && c.cardType === 'yellow' && !c.isBench).length
    const totalBenchDirectYellows = cardHistory.filter(c => c.team === team && c.playerNumber === playerNumber && c.cardType === 'yellow' && c.isBench && c.sanctionType === 'direct').length
    const totalBlues        = cardHistory.filter(c => c.team === team && c.playerNumber === playerNumber && c.cardType === 'blue' && !c.isBench).length

    if (sentCard === 'red') return { finalCard: 'red', duration: RED_CARD_DURATION, wasEscalated: false, isAlreadyExpelled: false }

    if (sentCard === 'blue') {
      if (totalBlues >= 2) return { finalCard: 'red', duration: RED_CARD_DURATION, wasEscalated: true, isAlreadyExpelled: false }
      return { finalCard: 'blue', duration: BLUE_CARD_DURATION, wasEscalated: false, isAlreadyExpelled: false }
    }

    if (totalBlues >= 2) return { finalCard: 'red', duration: RED_CARD_DURATION, wasEscalated: true, isAlreadyExpelled: false }
    if (totalBenchDirectYellows >= 1) return { finalCard: 'blue', duration: BLUE_CARD_DURATION, wasEscalated: true, isAlreadyExpelled: false }
    if (totalYellows >= 1 || totalBlues >= 1) return { finalCard: 'blue', duration: BLUE_CARD_DURATION, wasEscalated: true, isAlreadyExpelled: false }

    return { finalCard: 'yellow', duration: 0, wasEscalated: false, isAlreadyExpelled: false }
  }, [])

  const addSanction = useCallback((
    team: 'home' | 'away', type: 'yellow' | 'blue' | 'red', playerNumber: string,
    isBench = false, staffId?: string, sanctionType?: 'direct' | 'collective'
  ) => {
    playBuzzer()
    setState(prev => {
      const now = new Date().toISOString()
      let finalCard = type
      let duration = 0
      let wasEscalated = false
      let isAlreadyExpelled = false
      let benchYellowTriggered = false

      if (isBench) {
        isAlreadyExpelled = prev.cardHistory.some(c => c.team === team && c.staffId === staffId && c.cardType === 'red')
        if (type === 'yellow') {
          const prevCourtYellows = prev.cardHistory.filter(c => c.team === team && c.playerNumber === playerNumber && c.cardType === 'yellow' && !c.isBench).length
          const prevBenchDirectYellows = prev.cardHistory.filter(c => c.team === team && c.playerNumber === playerNumber && c.cardType === 'yellow' && c.isBench && c.sanctionType === 'direct').length
          if (prevCourtYellows >= 1 || prevBenchDirectYellows >= 1) {
            finalCard = 'red'; wasEscalated = true; benchYellowTriggered = true
          }
        }
      } else {
        const result = calculateCourtCardResult(prev.cardHistory, team, playerNumber, type)
        finalCard = result.finalCard; duration = result.duration
        wasEscalated = result.wasEscalated; isAlreadyExpelled = result.isAlreadyExpelled
      }

      if (isAlreadyExpelled) return prev

      const newSanction: Sanction = {
        id: uid(), team, type: finalCard, playerNumber: playerNumber || '?',
        staffId, isBench, sanctionType, remainingTime: duration, startTime: duration,
        originalCard: type, wasEscalated
      }
      const newCardHistory: CardHistory = {
        id: uid(), team, playerNumber: playerNumber || '?', staffId, isBench,
        cardType: finalCard, sanctionType: sanctionType || 'direct',
        period: prev.period, gameTime: prev.mainClock, timestamp: now
      }

      const eventType = finalCard === 'yellow' ? 'tarjeta_amarilla' : finalCard === 'blue' ? 'tarjeta_azul' : 'tarjeta_roja'
      let details = ''
      if (isBench) {
        details = sanctionType === 'collective' ? 'Sancion Colectiva (Banca)' : 'Sancion Directa (Banca)'
      } else if (wasEscalated) {
        details = `Escalada de ${type.toUpperCase()} a ${finalCard.toUpperCase()} por acumulacion`
      }

      const event: MatchEvent = {
        id: uid(), timestamp: now, gameTime: prev.mainClock, period: prev.period,
        eventType, team, actor: isBench ? (staffId || 'BANCA') : playerNumber || '?',
        details: details || undefined
      }

      let finalSanctions    = [...prev.sanctions, newSanction]
      let finalCardHistory  = [...prev.cardHistory, newCardHistory]
      let finalMatchLog     = [...prev.matchLog, event]

      if ((isBench && finalCard === 'red') || benchYellowTriggered) {
        const isBancaPintada = prev.cardHistory.some(c => c.team === team && c.isBench && c.cardType === 'yellow')
        if (!isBancaPintada) {
          const teamPlayers = team === 'home' ? prev.matchConfig.homePlayers : prev.matchConfig.awayPlayers
          teamPlayers
            .filter(p => p.number !== playerNumber)
            .filter(p => !prev.cardHistory.some(c => c.team === team && c.staffId === p.id && c.cardType === 'red'))
            .forEach(target => {
              finalSanctions.push({
                id: uid(), team, type: 'yellow',
                playerNumber: target.number || target.name, staffId: target.id,
                isBench: true, sanctionType: 'collective', remainingTime: 0, startTime: 0,
                originalCard: 'yellow', wasEscalated: false
              })
              finalCardHistory.push({
                id: uid(), team, playerNumber: target.number || target.name,
                staffId: target.id, isBench: true, cardType: 'yellow',
                sanctionType: 'collective', period: prev.period, gameTime: prev.mainClock, timestamp: now
              })
              finalMatchLog.push({
                id: uid(), timestamp: now, gameTime: prev.mainClock, period: prev.period,
                eventType: 'tarjeta_amarilla', team,
                actor: target.number || target.name,
                details: 'Amarilla Colectiva Automática (Consecuencia de Roja Directa a Banca)'
              })
            })
        }
      }

      const willStopClock = !(isBench || duration === 0);

      return {
        ...prev, sanctions: finalSanctions, cardHistory: finalCardHistory, matchLog: finalMatchLog,
        isMainClockRunning: willStopClock ? false : prev.isMainClockRunning,
        isPossessionLeftRunning: willStopClock ? false : prev.isPossessionLeftRunning,
        isPossessionRightRunning: willStopClock ? false : prev.isPossessionRightRunning,
        possessionClockLeft: willStopClock ? POSSESSION_DURATION : prev.possessionClockLeft,
        possessionClockRight: willStopClock ? POSSESSION_DURATION : prev.possessionClockRight
      }
    })
  }, [playBuzzer, calculateCourtCardResult])

  const addBenchSanction = useCallback((
    team: 'home' | 'away', sentCard: 'yellow' | 'red',
    directInfractor: { id: string; name: string; role: string; number: string },
    collectiveTargets: Array<{ id: string; name: string; role: string; number: string }>
  ) => {
    playBuzzer()
    setState(prev => {
      const now = new Date().toISOString()
      const newSanctions: Sanction[]     = []
      const newCardHistory: CardHistory[] = []
      const newEvents: MatchEvent[]       = []

      const isDirectAlreadyRed = prev.cardHistory.some(c => c.team === team && c.staffId === directInfractor.id && c.cardType === 'red')
      if (isDirectAlreadyRed) return prev

      const teamHasBenchYellow = prev.cardHistory.some(c => c.team === team && c.isBench && c.cardType === 'yellow')
      let directFinalCard: 'yellow' | 'red' = sentCard
      const directPrevYellows = prev.cardHistory.filter(c =>
        c.team === team &&
        (c.staffId === directInfractor.id || c.playerNumber === directInfractor.number) &&
        c.cardType === 'yellow'
      ).length

      if (sentCard === 'yellow' && directPrevYellows >= 1) {
        directFinalCard = 'red'
      }

      newSanctions.push({
        id: uid(), team, type: directFinalCard, playerNumber: directInfractor.number,
        staffId: directInfractor.id, isBench: true, sanctionType: 'direct',
        remainingTime: 0, startTime: 0, originalCard: sentCard,
        wasEscalated: sentCard === 'yellow' && directFinalCard === 'red'
      })
      newCardHistory.push({
        id: uid(), team, playerNumber: directInfractor.number, staffId: directInfractor.id,
        isBench: true, cardType: directFinalCard, sanctionType: 'direct',
        period: prev.period, gameTime: prev.mainClock, timestamp: now
      })
      newEvents.push({
        id: uid(), timestamp: now, gameTime: prev.mainClock, period: prev.period,
        eventType: directFinalCard === 'yellow' ? 'tarjeta_amarilla' : 'tarjeta_roja', team,
        actor: directInfractor.number,
        details: `Sancion DIRECTA (Banca)${directFinalCard === 'red' && sentCard === 'yellow' ? ' - Escalada a ROJA por acumulacion' : ''}`
      })

      if (!teamHasBenchYellow) {
        collectiveTargets.forEach(target => {
          const isTargetAlreadyRed = prev.cardHistory.some(c => c.team === team && c.staffId === target.id && c.cardType === 'red')
          if (isTargetAlreadyRed) return

          const targetPrevCards = prev.cardHistory.filter(c => c.team === team && c.staffId === target.id && c.isBench)
          newSanctions.push({
            id: uid(), team, type: 'yellow', playerNumber: target.number,
            staffId: target.id, isBench: true, sanctionType: 'collective',
            remainingTime: 0, startTime: 0, originalCard: 'yellow', wasEscalated: false
          })
          newCardHistory.push({
            id: uid(), team, playerNumber: target.number, staffId: target.id,
            isBench: true, cardType: 'yellow', sanctionType: 'collective',
            period: prev.period, gameTime: prev.mainClock, timestamp: now
          })
          newEvents.push({
            id: uid(), timestamp: now, gameTime: prev.mainClock, period: prev.period,
            eventType: 'tarjeta_amarilla', team, actor: target.number,
            details: `Sancion COLECTIVA (Banca)${targetPrevCards.length > 0 ? ' - Inmunidad Parcial (no expulsa)' : ''}`
          })
        })
      }

      return {
        ...prev,
        sanctions:    [...prev.sanctions, ...newSanctions],
        cardHistory:  [...prev.cardHistory, ...newCardHistory],
        matchLog:     [...prev.matchLog, ...newEvents]
      }
    })
  }, [playBuzzer])

  // ─── Alineacion en pista (Pista Dinamica) ─────────────────────────────────
  // ─── Ajustes de partido ───────────────────────────────────────────────────
  // Ninguno toca el motor de sanciones: sólo describen quién es quién en cancha.

  const logEvent = (prev: GameState, team: 'home' | 'away', actor: string, details: string): MatchEvent => ({
    id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
    period: prev.period, eventType: 'ajuste', team, actor, details
  })

  const patchAdjustments = (
    prev: GameState, team: 'home' | 'away', patch: (t: TeamAdjustments) => TeamAdjustments
  ): MatchAdjustments => {
    const base = prev.matchAdjustments || emptyMatchAdjustments()
    return { ...base, [team]: patch(base[team]) }
  }

  /** Corrige el número de camiseta y arrastra todo el historial de esa persona. */
  const reassignPlayerNumber = useCallback((
    team: 'home' | 'away', playerId: string, oldNumber: string, newNumber: string
  ) => {
    const nuevo = newNumber.trim()
    if (!nuevo || nuevo === oldNumber) return
    setState(prev => ({
      ...prev,
      matchAdjustments: patchAdjustments(prev, team, t => ({
        ...t, players: { ...t.players, [playerId]: { ...t.players[playerId], number: nuevo } }
      })),
      cardHistory: prev.cardHistory.map(c =>
        c.team === team && c.playerNumber === oldNumber ? { ...c, playerNumber: nuevo } : c),
      sanctions: prev.sanctions.map(sn =>
        sn.team === team && sn.playerNumber === oldNumber ? { ...sn, playerNumber: nuevo } : sn),
      matchLog: [
        ...prev.matchLog.map(e =>
          e.team === team && e.actor === oldNumber ? { ...e, actor: nuevo } : e),
        logEvent(prev, team, nuevo, `Número reasignado: ${oldNumber} pasa a ${nuevo}`)
      ]
    }))
  }, [])

  /** Lesión: saca de pista, no genera sanción, es reversible. */
  const setPlayerInjured = useCallback((
    team: 'home' | 'away', playerId: string, playerNumber: string, injured: boolean
  ) => {
    setState(prev => {
      const key = team === 'home' ? 'homeCourtIds' : 'awayCourtIds'
      return {
        ...prev,
        matchAdjustments: patchAdjustments(prev, team, t => ({
          ...t, players: { ...t.players, [playerId]: { ...t.players[playerId], injured } }
        })),
        [key]: injured ? prev[key].filter(id => id !== playerId) : prev[key],
        matchLog: [...prev.matchLog, logEvent(prev, team, playerNumber,
          injured ? 'Sale lesionado' : 'Se reincorpora tras lesión')]
      }
    })
  }, [])

  const designateGoalie = useCallback((team: 'home' | 'away', playerId: string, playerNumber: string) => {
    setState(prev => ({
      ...prev,
      matchAdjustments: patchAdjustments(prev, team, t => ({ ...t, goalieId: playerId })),
      matchLog: [...prev.matchLog, logEvent(prev, team, playerNumber, 'Designado portero')]
    }))
  }, [])

  const designateCaptain = useCallback((team: 'home' | 'away', playerId: string, playerNumber: string) => {
    setState(prev => ({
      ...prev,
      matchAdjustments: patchAdjustments(prev, team, t => ({ ...t, captainId: playerId })),
      matchLog: [...prev.matchLog, logEvent(prev, team, playerNumber, 'Designado capitán')]
    }))
  }, [])

  const addRosterPlayer = useCallback((team: 'home' | 'away', number: string, name = '') => {
    const num = number.trim()
    if (!num) return
    setState(prev => ({
      ...prev,
      matchAdjustments: patchAdjustments(prev, team, t => ({
        ...t,
        extraPlayers: [...t.extraPlayers, {
          id: uid(), number: num, name, rut: '', position: '' as const, role: 'jugador_pista' as const
        }]
      })),
      matchLog: [...prev.matchLog, logEvent(prev, team, num, 'Jugador agregado al plantel')]
    }))
  }, [])

  /** Sólo para deshacer una carga errónea: nunca borra a alguien con historial. */
  const removeRosterPlayer = useCallback((team: 'home' | 'away', playerId: string, playerNumber: string) => {
    setState(prev => {
      const tieneHistorial =
        prev.cardHistory.some(c => c.team === team && c.playerNumber === playerNumber) ||
        prev.matchLog.some(e => e.team === team && e.actor === playerNumber && e.eventType !== 'ajuste')
      if (tieneHistorial) return prev
      const key = team === 'home' ? 'homeCourtIds' : 'awayCourtIds'
      return {
        ...prev,
        matchAdjustments: patchAdjustments(prev, team, t => ({
          ...t,
          removedIds: [...t.removedIds, playerId],
          extraPlayers: t.extraPlayers.filter(p => p.id !== playerId)
        })),
        [key]: prev[key].filter(id => id !== playerId),
        matchLog: [...prev.matchLog, logEvent(prev, team, playerNumber, 'Jugador eliminado del plantel')]
      }
    })
  }, [])

  /** Registra un lanzamiento de la tanda. El arbitro guia el orden; aqui solo se anota. */
  const logShootoutShot = useCallback((team: 'home' | 'away', playerNumber: string, scored: boolean) => {
    setState(prev => ({
      ...prev,
      matchLog: [...prev.matchLog, {
        id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
        period: prev.period, eventType: 'penal_ronda' as const, team,
        actor: playerNumber,
        details: scored ? 'CONVIERTE' : 'FALLA'
      }]
    }))
  }, [])

  const setCourtLineup = useCallback((
    team: 'home' | 'away',
    ids: string[],
    change?: { playerNumber: string; direction: 'in' | 'out' }
      | Array<{ playerNumber: string; direction: 'in' | 'out' }>
  ) => {
    setState(prev => {
      const key = team === 'home' ? 'homeCourtIds' : 'awayCourtIds'
      const list = change ? (Array.isArray(change) ? change : [change]) : []
      const events: MatchEvent[] = list.map(c => ({
        id: uid(),
        timestamp: new Date().toISOString(),
        gameTime: prev.mainClock,
        period: prev.period,
        eventType: 'cambio' as const,
        team,
        actor: c.playerNumber,
        details: c.direction === 'in' ? 'Ingresa a pista' : 'Sale de pista'
      }))
      return {
        ...prev,
        [key]: ids,
        matchLog: events.length ? [...prev.matchLog, ...events] : prev.matchLog
      }
    })
  }, [])

  const removeSanction  = useCallback((id: string) => setState(prev => ({ ...prev, sanctions: prev.sanctions.filter(s => s.id !== id) })), [])
  const clearSanctions  = useCallback((team?: 'home' | 'away') => setState(prev => ({ ...prev, sanctions: team ? prev.sanctions.filter(s => s.team !== team) : [] })), [])

  const requestTimeoutHome = useCallback(() => setState(prev =>
    prev.homeTimeoutsUsed >= 2 || prev.activeTimeout || prev.isIntermission ? prev : { ...prev, homeTimeoutRequested: true }
  ), [])
  const requestTimeoutAway = useCallback(() => setState(prev =>
    prev.awayTimeoutsUsed >= 2 || prev.activeTimeout || prev.isIntermission ? prev : { ...prev, awayTimeoutRequested: true }
  ), [])

  const grantTimeoutHome = useCallback(() => {
    playBuzzer()
    setState(prev => {
      if (prev.homeTimeoutsUsed >= 2 || prev.activeTimeout || prev.isMatchEnded) return prev
      const newUsed = prev.homeTimeoutsUsed + 1
      const periodName = prev.period === '1er_tiempo' ? '1er Tiempo' : prev.period === '2do_tiempo' ? '2do Tiempo' : 'Prorroga'
      const event: MatchEvent = {
        id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
        period: prev.period, eventType: 'timeout', team: 'home', actor: 'EQUIPO',
        details: `Tiempo Muerto (${newUsed}/2) solicitado por ${prev.homeTeam?.name || 'LOCAL'} en el ${periodName}`
      }
      return {
        ...prev, homeTimeoutRequested: false, activeTimeout: 'home',
        timeoutClock: TIMEOUT_DURATION, homeTimeoutsUsed: newUsed,
        isMainClockRunning: false, isPossessionLeftRunning: false, isPossessionRightRunning: false,
        possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION,
        matchLog: [...prev.matchLog, event]
      }
    })
  }, [playBuzzer])

  const grantTimeoutAway = useCallback(() => {
    playBuzzer()
    setState(prev => {
      if (prev.awayTimeoutsUsed >= 2 || prev.activeTimeout || prev.isMatchEnded) return prev
      const newUsed = prev.awayTimeoutsUsed + 1
      const periodName = prev.period === '1er_tiempo' ? '1er Tiempo' : prev.period === '2do_tiempo' ? '2do Tiempo' : 'Prorroga'
      const event: MatchEvent = {
        id: uid(), timestamp: new Date().toISOString(), gameTime: prev.mainClock,
        period: prev.period, eventType: 'timeout', team: 'away', actor: 'EQUIPO',
        details: `Tiempo Muerto (${newUsed}/2) solicitado por ${prev.awayTeam?.name || 'VISITA'} en el ${periodName}`
      }
      return {
        ...prev, awayTimeoutRequested: false, activeTimeout: 'away',
        timeoutClock: TIMEOUT_DURATION, awayTimeoutsUsed: newUsed,
        isMainClockRunning: false, isPossessionLeftRunning: false, isPossessionRightRunning: false,
        possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION,
        matchLog: [...prev.matchLog, event]
      }
    })
  }, [playBuzzer])

  const cancelTimeoutRequest = useCallback((team: 'home' | 'away') => setState(prev => ({
    ...prev,
    homeTimeoutRequested: team === 'home' ? false : prev.homeTimeoutRequested,
    awayTimeoutRequested: team === 'away' ? false : prev.awayTimeoutRequested
  })), [])

  const cancelActiveTimeout = useCallback(() => setState(prev => ({ ...prev, activeTimeout: null, timeoutClock: 0 })), [])
  const resetTimeouts        = useCallback(() => setState(prev => ({ ...prev, homeTimeoutsUsed: 0, awayTimeoutsUsed: 0, homeTimeoutRequested: false, awayTimeoutRequested: false, activeTimeout: null, timeoutClock: 0 })), [])

  const resetPossessionLeft   = useCallback(() => setState(prev => ({ 
    ...prev, possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION, 
    isPossessionLeftRunning: true, isPossessionRightRunning: false, isMainClockRunning: true 
  })), [])
  const resetPossessionRight  = useCallback(() => setState(prev => ({ 
    ...prev, possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION, 
    isPossessionLeftRunning: false, isPossessionRightRunning: true, isMainClockRunning: true 
  })), [])
  
  const togglePossessionLeft  = useCallback(() => setState(prev => prev.isPossessionLeftRunning 
    ? { ...prev, isPossessionLeftRunning: false } 
    : { ...prev, isPossessionLeftRunning: true, possessionClockRight: POSSESSION_DURATION, isPossessionRightRunning: false, isMainClockRunning: true }
  ), [])
  
  const togglePossessionRight = useCallback(() => setState(prev => prev.isPossessionRightRunning 
    ? { ...prev, isPossessionRightRunning: false } 
    : { ...prev, isPossessionRightRunning: true, possessionClockLeft: POSSESSION_DURATION, isPossessionLeftRunning: false, isMainClockRunning: true }
  ), [])
  
  const resetAndPausePossession = useCallback(() => setState(prev => ({ 
    ...prev, possessionClockLeft: POSSESSION_DURATION, possessionClockRight: POSSESSION_DURATION, 
    isPossessionLeftRunning: false, isPossessionRightRunning: false 
  })), [])

  const endMatch = useCallback(() => {
    playBuzzer()
    setState(prev => {
      const now = new Date().toISOString()
      
      let winner: 'home' | 'away' | 'draw' = 'draw'
      
      if (prev.homeScore > prev.awayScore) {
        winner = 'home'
      } else if (prev.awayScore > prev.homeScore) {
        winner = 'away'
      } else {
        if (prev.homePenalties > prev.awayPenalties) {
          winner = 'home'
        } else if (prev.awayPenalties > prev.homePenalties) {
          winner = 'away'
        }
      }

      let resultMsg = `${prev.homeScore} - ${prev.awayScore}`
      if (prev.homeScore === prev.awayScore && (prev.homePenalties > 0 || prev.awayPenalties > 0)) {
         resultMsg += ` (Penales: ${prev.homePenalties}-${prev.awayPenalties})`
      }

      const endEvent: MatchEvent = {
        id: uid(), timestamp: now, gameTime: prev.mainClock, period: prev.period,
        eventType: 'fin', team: null, actor: 'SISTEMA',
        details: `Partido finalizado. Resultado: ${prev.homeTeam?.name || 'LOCAL'} ${resultMsg} ${prev.awayTeam?.name || 'VISITA'}`
      }
      
      return {
        ...prev, isMatchEnded: true, winner,
        isMainClockRunning: false, isPossessionLeftRunning: false, isPossessionRightRunning: false,
        isIntermission: false, timestamps: { ...prev.timestamps, matchEnd: now },
        matchLog: [...prev.matchLog, endEvent]
      }
    })
  }, [playBuzzer])

  const saveTeam = useCallback((team: Team) => {
    setSavedTeams(prev => {
      const newT = [...prev.filter(t => t.id !== team.id), team]
      lsSet(TEAMS_STORAGE_KEY, newT)
      return newT
    })
  }, [])

  const deleteTeam = useCallback((id: string) => {
    setSavedTeams(prev => {
      const newT = prev.filter(t => t.id !== id)
      lsSet(TEAMS_STORAGE_KEY, newT)
      return newT
    })
  }, [])

  const saveMatchToHistory = useCallback(() => {
    const record: MatchRecord = {
      id: uid(),
      date: new Date().toISOString(),
      series: state.matchConfig.seriesName,
      gender: state.matchConfig.gender,
      homeTeam: state.homeTeam?.name || 'LOCAL',
      awayTeam: state.awayTeam?.name || 'VISITA',
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      homePenalties: state.homePenalties, 
      awayPenalties: state.awayPenalties, 
      winner: state.winner, 
      homeLogo: state.homeTeam?.logo || null,
      awayLogo: state.awayTeam?.logo || null,
      sanctions: state.sanctions.map(s => ({ team: s.team, type: s.type, playerNumber: s.playerNumber, isBench: s.isBench })),
      referees: state.matchConfig.referees,
      homePlayers: state.matchConfig.homePlayers,
      awayPlayers: state.matchConfig.awayPlayers,
      matchLog: state.matchLog
    }
    setMatchHistory(prev => {
      const newHistory = [record, ...prev].slice(0, HISTORY_MAX_RECORDS)
      lsSet(HISTORY_STORAGE_KEY, newHistory)
      return newHistory
    })
  }, [state])

  const deleteMatchFromHistory = useCallback((id: string) => {
    setMatchHistory(prev => {
      const next = prev.filter(m => m.id !== id)
      lsSet(HISTORY_STORAGE_KEY, next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setMatchHistory([])
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  }, [])

  const resetForNewMatch = useCallback(() => {
    setState(prev => ({
      ...initialState,
      matchConfig: {
        ...prev.matchConfig,
        signatures: initialSignatures,
        closingSignatures: initialClosingSignatures,
        isExpressMode: false
      },
      homeTeam: prev.homeTeam,
      awayTeam: prev.awayTeam,
      initialClockTime: prev.initialClockTime,
      mainClock: prev.initialClockTime,
      isMatchConfigured: false,
      matchPhase: 'pre-partido'
    }))
    localStorage.removeItem(LIVE_GAME_STORAGE_KEY)
  }, [])

  const resetAll = useCallback(() => {
    setState(prev => ({
      ...initialState,
      matchConfig: prev.matchConfig,
      initialClockTime: prev.initialClockTime,
      mainClock: prev.initialClockTime,
      isMatchConfigured: false
    }))
    localStorage.removeItem(LIVE_GAME_STORAGE_KEY)
  }, [])

  const closeMatchEndModal = useCallback(() => setState(prev => ({ ...prev, isMatchEnded: false })), [])

  return {
    state, savedTeams, matchHistory, playBuzzer,
    configureMatch, configureMatchWithResume, setSignature, setClosingSignature, setMatchPhase,
    toggleMainClock, pauseMainClock, resetMainClock, setMainClockTime, adjustMainClock,
    setPeriod, nextPeriod, adjustHomeScore, adjustAwayScore, adjustHomeFouls, adjustAwayFouls, resetFouls,
    adjustHomePenalties, adjustAwayPenalties, startIntermission, endIntermission,
    addYellowCard, resetYellowCards, addSanction, addBenchSanction, removeSanction, clearSanctions,
    requestTimeoutHome, requestTimeoutAway, grantTimeoutHome, grantTimeoutAway,
    cancelTimeoutRequest, cancelActiveTimeout, resetTimeouts,
    togglePossessionLeft, togglePossessionRight, resetPossessionLeft, resetPossessionRight, resetAndPausePossession,
    setCourtLineup, logShootoutShot, reassignPlayerNumber, setPlayerInjured, designateGoalie, designateCaptain,
    addRosterPlayer, removeRosterPlayer,
    endMatch, saveTeam, deleteTeam, saveMatchToHistory, deleteMatchFromHistory, clearHistory, resetForNewMatch, resetAll, closeMatchEndModal,
    buzzerSound, changeBuzzerSound
  }
}