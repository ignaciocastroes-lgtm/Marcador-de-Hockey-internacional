"use client"

import { defaultHomeName, defaultHomeLogo, CLUB_BRAND } from '@/lib/club-brand'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Play, Pause, RotateCcw, Plus, Minus, Bell, Timer, Clock, Settings, X, Users, Upload, Trash2, Save, Hand, Square, Coffee, AlertTriangle, CircleSlash, Goal, AlertCircle, History, Download, FileText, Clipboard, ChevronRight, CheckCircle2, PenTool, Shield, User, Move, LayoutGrid, LayoutDashboard, ZoomIn, ZoomOut, ArrowRightLeft, Palette, Volume2, Lock, Unlock, VolumeX, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BUZZER_OPTIONS, INTERMISSION_DURATION } from '@/hooks/use-game-state'
import type { GameState, Period, Team, MatchRecord, MatchConfig, Sanction, Player, RefereeData, MatchEvent, SignatureData, ClosingSignatureData, MatchPhase, CardHistory } from '@/hooks/use-game-state'

import { SignatureCanvas } from '@/components/scoreboard/SignatureCanvas'
import { TacticalBoard } from '@/components/scoreboard/TacticalBoard'
import { SanctionsList } from '@/components/scoreboard/SanctionsList'
import { LiveCourtViewer } from '@/components/scoreboard/LiveCourtViewer'
import { BenchModal, type BenchStaffUI } from '@/components/scoreboard/BenchModal'
import { PosModal } from '@/components/scoreboard/PosModal'
import { OfficialSheetModal } from '@/components/scoreboard/OfficialSheetModal'
import { PreMatchSetup } from '@/components/scoreboard/PreMatchSetup'
import { MatchHistoryModal } from '@/components/scoreboard/MatchHistoryModal'

// ─── MOTOR DE TEMAS GLOBALES (SKIN ENGINE) ─────────────────────────────────
type SkinKey = 'neon-original' | 'stadium-led' | 'fiba-fifa' | 'cyber-ambar' | 'broadcast-pro' | 'alto-contraste' | 'retro-arcade';

interface ThemeConfig {
  id: SkinKey; label: string; globalBg: string; panelBase: string; teamHomeBase: string; teamAwayBase: string;
  clock: { containerMain: string; textMain: string; textPos: string; font: React.CSSProperties; label: string; };
  btn: { shape: string; primary: string; secondary: string; danger: string; foul: string; penal: string; timeout: string; cardY: string; cardB: string; cardR: string; };
}

const GLOBAL_THEMES: Record<SkinKey, ThemeConfig> = {
  'neon-original': {
    id: 'neon-original', label: '🔴 Neón Original', globalBg: 'bg-zinc-950', panelBase: 'bg-black border-2 border-zinc-800 rounded-xl', teamHomeBase: 'bg-gradient-to-b from-blue-950/50 to-zinc-900 border-2 border-blue-800 rounded-xl', teamAwayBase: 'bg-gradient-to-b from-amber-950/50 to-zinc-900 border-2 border-amber-800 rounded-xl',
    clock: { containerMain: 'bg-black border-4 border-zinc-700 rounded-xl', textMain: 'text-red-500', textPos: 'text-green-400', font: { fontFamily: 'var(--font-led)', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.4)' }, label: 'text-zinc-500' },
    btn: { shape: 'rounded-md', primary: 'bg-green-700 hover:bg-green-600 text-white', secondary: 'bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white', danger: 'bg-red-600 hover:bg-red-500 text-white', foul: 'bg-orange-700 hover:bg-orange-600 text-white', penal: 'bg-purple-700 hover:bg-purple-600 text-white', timeout: 'bg-cyan-700 hover:bg-cyan-600 text-white', cardY: 'bg-yellow-500 hover:bg-yellow-400 text-black', cardB: 'bg-blue-600 hover:bg-blue-500 text-white', cardR: 'bg-red-600 hover:bg-red-500 text-white' }
  },
  'stadium-led': {
    id: 'stadium-led', label: '🟢 Stadium LED', globalBg: 'bg-[#050505]', panelBase: 'bg-[#0a0a0a] border-4 border-[#111] rounded-sm', teamHomeBase: 'bg-[#0a0a0a] border-4 border-[#064e3b] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] rounded-sm', teamAwayBase: 'bg-[#0a0a0a] border-4 border-[#78350f] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] rounded-sm',
    clock: { containerMain: 'bg-[#050505] border-4 border-[#222] rounded-sm', textMain: 'text-[#22c55e]', textPos: 'text-[#eab308]', font: { fontFamily: 'var(--font-led)', letterSpacing: '0.08em', textShadow: '0 0 10px rgba(34,197,94,0.6)' }, label: 'text-[#22c55e] opacity-70' },
    btn: { shape: 'rounded-sm uppercase tracking-wider', primary: 'bg-[#166534] hover:bg-[#15803d] text-white border-2 border-[#14532d]', secondary: 'bg-[#111] border-2 border-[#333] hover:bg-[#222] text-zinc-300', danger: 'bg-[#991b1b] hover:bg-[#b91c1c] text-white border-2 border-[#7f1d1d]', foul: 'bg-[#9a3412] hover:bg-[#b45309] text-white border-2 border-[#78350f]', penal: 'bg-[#6b21a8] hover:bg-[#7e22ce] text-white border-2 border-[#581c87]', timeout: 'bg-[#0e7490] hover:bg-[#0369a1] text-white', cardY: 'bg-[#eab308] hover:bg-[#facc15] text-black border-2 border-[#ca8a04]', cardB: 'bg-[#2563eb] hover:bg-[#3b82f6] text-white border-2 border-[#1d4ed8]', cardR: 'bg-[#dc2626] hover:bg-[#ef4444] text-white border-2 border-[#b91c1c]' }
  },
  'fiba-fifa': {
    id: 'fiba-fifa', label: '⚪ Clásico FIBA/FIFA', globalBg: 'bg-[#e2e8f0]', panelBase: 'bg-white border border-gray-300 shadow-md rounded-lg', teamHomeBase: 'bg-white border-t-8 border-t-blue-600 shadow-md rounded-lg', teamAwayBase: 'bg-white border-t-8 border-t-amber-500 shadow-md rounded-lg',
    clock: { containerMain: 'bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-inner', textMain: 'text-white', textPos: 'text-slate-200', font: { fontFamily: 'system-ui, sans-serif', fontWeight: 800, letterSpacing: '0', textShadow: 'none' }, label: 'text-slate-400' },
    btn: { shape: 'rounded-md font-semibold', primary: 'bg-slate-800 hover:bg-slate-700 text-white shadow-sm', secondary: 'bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700', danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm', foul: 'bg-orange-600 hover:bg-orange-500 text-white shadow-sm', penal: 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm', timeout: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm', cardY: 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-sm', cardB: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm', cardR: 'bg-red-600 hover:bg-red-500 text-white shadow-sm' }
  },
  'cyber-ambar': {
    id: 'cyber-ambar', label: '🟠 Cyber-Ámbar', globalBg: 'bg-[#0f0904]', panelBase: 'bg-[#1a0f00] border-2 border-[#78350f] rounded-none', teamHomeBase: 'bg-[#1a0f00] border-l-4 border-l-[#d97706] border-y border-r border-[#78350f] rounded-none', teamAwayBase: 'bg-[#1a0f00] border-r-4 border-r-[#d97706] border-y border-l border-[#78350f] rounded-none',
    clock: { containerMain: 'bg-[#0a0500] border-4 border-[#92400e] shadow-[0_0_15px_rgba(217,119,6,0.3)] rounded-none', textMain: 'text-[#f59e0b]', textPos: 'text-[#fbbf24]', font: { fontFamily: 'var(--font-led)', letterSpacing: '0.05em', textShadow: '0 0 15px rgba(245,158,11,0.8)' }, label: 'text-[#b45309]' },
    btn: { shape: 'rounded-none border border-[#92400e]', primary: 'bg-[#b45309] hover:bg-[#d97706] text-[#fffbeb]', secondary: 'bg-[#2a1300] hover:bg-[#451a03] text-[#fde68a]', danger: 'bg-[#7f1d1d] hover:bg-[#991b1b] text-white', foul: 'bg-[#9a3412] hover:bg-[#c2410c] text-white', penal: 'bg-[#4c1d95] hover:bg-[#581c87] text-white', timeout: 'bg-[#164e63] hover:bg-[#083344] text-white', cardY: 'bg-[#ca8a04] hover:bg-[#eab308] text-black', cardB: 'bg-[#1e3a8a] hover:bg-[#1e40af] text-white', cardR: 'bg-[#991b1b] hover:bg-[#b91c1c] text-white' }
  },
  'broadcast-pro': {
    id: 'broadcast-pro', label: '📺 Broadcast Pro', globalBg: 'bg-gradient-to-br from-slate-900 to-black', panelBase: 'bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 shadow-xl rounded-lg', teamHomeBase: 'bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-800 shadow-xl rounded-lg relative overflow-hidden', teamAwayBase: 'bg-gradient-to-br from-red-900 to-slate-900 border border-red-800 shadow-xl rounded-lg relative overflow-hidden',
    clock: { containerMain: 'bg-gradient-to-b from-slate-700 to-black border-2 border-slate-500 shadow-2xl rounded-md', textMain: 'text-white', textPos: 'text-white', font: { fontFamily: 'Impact, "Bebas Neue", sans-serif', fontWeight: 900, WebkitTextStroke: '1px rgba(0,0,0,0.5)', textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }, label: 'text-slate-300 uppercase tracking-widest' },
    btn: { shape: 'rounded-md shadow-lg border border-white/10 backdrop-blur-sm', primary: 'bg-gradient-to-b from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white', secondary: 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white', danger: 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white', foul: 'bg-gradient-to-b from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white', penal: 'bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white', timeout: 'bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white', cardY: 'bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black', cardB: 'bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white', cardR: 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white' }
  },
  'alto-contraste': {
    id: 'alto-contraste', label: '☀️ Alto Contraste (Día)', globalBg: 'bg-black', panelBase: 'bg-black border-4 border-white rounded-none', teamHomeBase: 'bg-black border-4 border-blue-400 rounded-none', teamAwayBase: 'bg-black border-4 border-amber-400 rounded-none',
    clock: { containerMain: 'bg-black border-8 border-white rounded-none', textMain: 'text-[#FFFF00]', textPos: 'text-white', font: { fontFamily: 'Arial, sans-serif', fontWeight: 900, letterSpacing: '0', textShadow: 'none' }, label: 'text-white text-lg' },
    btn: { shape: 'rounded-none border-2 border-white font-black uppercase text-lg', primary: 'bg-black hover:bg-white hover:text-black text-[#00FF00]', secondary: 'bg-black hover:bg-white hover:text-black text-white', danger: 'bg-black hover:bg-white hover:text-black text-[#FF0000]', foul: 'bg-black hover:bg-white hover:text-black text-[#FF9900]', penal: 'bg-black hover:bg-white hover:text-black text-[#FF00FF]', timeout: 'bg-black hover:bg-white hover:text-black text-[#00FFFF]', cardY: 'bg-[#FFFF00] hover:bg-white hover:text-black text-black border-black', cardB: 'bg-[#0000FF] hover:bg-white hover:text-black text-white border-black', cardR: 'bg-[#FF0000] hover:bg-white hover:text-black text-white border-black' }
  },
  'retro-arcade': {
    id: 'retro-arcade', label: '🕹️ Retro Arcade', globalBg: 'bg-[#090229]', panelBase: 'bg-[#120458] border-4 border-[#00FFFF] shadow-[4px_4px_0px_#FF00FF] rounded-none', teamHomeBase: 'bg-[#120458] border-4 border-[#00FFFF] shadow-[4px_4px_0px_#FF00FF] rounded-none relative overflow-hidden', teamAwayBase: 'bg-[#120458] border-4 border-[#FF00FF] shadow-[4px_4px_0px_#00FFFF] rounded-none relative overflow-hidden',
    clock: { containerMain: 'bg-[#050117] border-4 border-[#FF00FF] rounded-none', textMain: 'text-[#00FFFF]', textPos: 'text-[#FF00FF]', font: { fontFamily: '"Courier New", Courier, monospace', fontWeight: 900, letterSpacing: '0', textShadow: '3px 3px 0px #FF00FF' }, label: 'text-white uppercase tracking-widest' },
    btn: { shape: 'rounded-none border-2 border-[#00FFFF] font-bold uppercase shadow-[2px_2px_0px_#FF00FF] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all', primary: 'bg-[#FF00FF] text-white border-[#00FFFF]', secondary: 'bg-[#120458] hover:bg-[#2a0885] text-[#00FFFF]', danger: 'bg-[#FF0000] text-white border-white', foul: 'bg-[#FF9900] text-white border-white', penal: 'bg-[#8A2BE2] text-white border-white', timeout: 'bg-[#00FFFF] text-[#120458] border-[#FF00FF]', cardY: 'bg-[#FFFF00] text-black border-black', cardB: 'bg-[#0000FF] text-white border-white', cardR: 'bg-[#FF0000] text-white border-white' }
  }
};

const DEFAULT_HOTKEYS = {
  mainSound: 'Space',
  mainMute: 'm',
  homePosToggle: 'a',
  homePosReset: 's',
  awayPosToggle: 'l',
  awayPosReset: 'k'
};

interface ResumeParams { period: Period; clockTime: number; homeScore: number; awayScore: number; homeFouls: number; awayFouls: number; }

interface OperatorViewProps {
  state: GameState; savedTeams: Team[]; matchHistory: MatchRecord[]; playBuzzer: () => void;
  configureMatch: (config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null) => void;
  configureMatchWithResume?: (config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null, resume: ResumeParams) => void;
  setSignature: (role: keyof SignatureData, signatureData: string) => void;
  setClosingSignature: (role: keyof ClosingSignatureData, signatureData: string) => void;
  setMatchPhase: (phase: MatchPhase) => void;
  toggleMainClock: () => void; resetMainClock: () => void; setMainClockTime: (minutes: number) => void;
  adjustMainClock: (seconds: number) => void; setPeriod: (period: Period) => void; nextPeriod: () => void;
  adjustHomeScore: (delta: number, playerNumber?: string) => void; adjustAwayScore: (delta: number, playerNumber?: string) => void;
  adjustHomeFouls: (delta: number) => void; adjustAwayFouls: (delta: number) => void; resetFouls: () => void;
  adjustHomePenalties: (delta: number) => void; adjustAwayPenalties: (delta: number) => void;
  startIntermission: (durationMinutes?: number) => void; endIntermission: () => void;
  addYellowCard: (team: 'home' | 'away') => void; resetYellowCards: (team: 'home' | 'away') => void;
  addSanction: (team: 'home' | 'away', type: 'yellow' | 'blue' | 'red', playerNumber: string, isBench?: boolean, staffId?: string, sanctionType?: 'direct' | 'collective') => void;
  addBenchSanction: (team: 'home' | 'away', sentCard: 'yellow' | 'red', directInfractor: { id: string, name: string, role: string, number: string }, collectiveTargets: Array<{ id: string, name: string, role: string, number: string }>) => void;
  removeSanction: (sanctionId: string) => void; clearSanctions: (team?: 'home' | 'away') => void;
  requestTimeoutHome: () => void; requestTimeoutAway: () => void; grantTimeoutHome: () => void;
  grantTimeoutAway: () => void; cancelTimeoutRequest: (team: 'home' | 'away') => void;
  cancelActiveTimeout: () => void; resetTimeouts: () => void; togglePossessionLeft: () => void;
  togglePossessionRight: () => void; resetPossessionLeft: () => void; resetPossessionRight: () => void;
  resetAndPausePossession: () => void; endMatch: () => void;
  saveTeam: (team: Team) => void; deleteTeam: (teamId: string) => void; saveMatchToHistory: () => void;
  clearHistory: () => void; deleteMatchFromHistory: (id: string) => void; resetForNewMatch: () => void; resetAll: () => void; closeMatchEndModal: () => void;
  buzzerSound: string; changeBuzzerSound: (src: string) => void;
  onSaveAndReset?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60); const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ─── COMPONENTE DE ATAJO DE TECLADO ─────────────────────────
const HotkeyInput = ({ label, actionKey, hotkeys, saveHotkeys }: { label: string, actionKey: keyof typeof DEFAULT_HOTKEYS, hotkeys: typeof DEFAULT_HOTKEYS, saveHotkeys: (h: any) => void }) => {
  const [listening, setListening] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!listening) return;
    e.preventDefault();
    e.stopPropagation(); // 🛡️ Evita que se active la acción global mientras configuras el teclado
    const key = e.key === ' ' ? 'Space' : e.key.toLowerCase();
    saveHotkeys({ ...hotkeys, [actionKey]: key });
    setListening(false);
  };

  return (
    <div className="flex items-center justify-between bg-zinc-800 p-2 rounded border border-zinc-700">
       <span className="text-zinc-300 text-xs font-bold">{label}</span>
       <Button
         variant={listening ? 'default' : 'outline'}
         className={`h-7 w-20 text-xs font-bold ${listening ? 'bg-yellow-500 text-black' : 'bg-zinc-900 border-zinc-600 text-yellow-400'}`}
         onClick={() => setListening(true)}
         onKeyDown={handleKeyDown}
         onBlur={() => setListening(false)}
       >
         {listening ? 'Pulsa...' : hotkeys[actionKey].toUpperCase()}
       </Button>
    </div>
  )
}

export function OperatorView(props: OperatorViewProps) {
  const { state } = props
  const homeTeamName = state.homeTeam?.name || defaultHomeName()
  const awayTeamName = state.awayTeam?.name || 'VISITA'
  const homeSanctions = state.sanctions?.filter(s => s.team === 'home') || []
  const awaySanctions = state.sanctions?.filter(s => s.team === 'away') || []

  const [posModalOpen, setPosModalOpen]     = useState(false)
  const [posModalTeam, setPosModalTeam]     = useState<'home' | 'away'>('home')
  const [posModalAction, setPosModalAction] = useState<'gol' | 'penal' | 'yellow' | 'blue' | 'red'>('gol')
  const [benchModalOpen, setBenchModalOpen] = useState(false)
  const [benchModalTeam, setBenchModalTeam] = useState<'home' | 'away'>('home')
  const [benchModalCard, setBenchModalCard] = useState<'yellow' | 'red'>('yellow')
  const [benchStaffList, setBenchStaffList] = useState<BenchStaffUI[]>([])
  const [showOfficialSheet, setShowOfficialSheet] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showEndConfirm, setShowEndConfirm]       = useState(false)
  const [matchEnded, setMatchEnded]               = useState(false)

  const [signingClosingRole, setSigningClosingRole] = useState<keyof ClosingSignatureData | null>(null)
  const [extraSignatures, setExtraSignatures]       = useState<{ arbitroPrincipal: string | null; arbitroAuxiliar: string | null }>({ arbitroPrincipal: null, arbitroAuxiliar: null })
  const [signingExtraRole, setSigningExtraRole]     = useState<'arbitroPrincipal' | 'arbitroAuxiliar' | null>(null)
  const [planillaLocked, setPlanillaLocked]         = useState(false)

  const [showIntermissionSelector, setShowIntermissionSelector] = useState(false)
  const [customIntermissionMinutes, setCustomIntermissionMinutes] = useState('')

  const [isEditMode, setIsEditMode] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)

  // ─── MEMORIA DE TEMA Y ESCALAS ──────────────────────────────────
  const [currentSkinKey, setCurrentSkinKey] = useState<SkinKey>('neon-original')
  const [panelScales, setPanelScales] = useState({ clock: 100, possession: 100, teamHome: 100, teamAway: 100, events: 100 })
  
  // 🏆 GOL DE ORO Y ALARGUE
  const [goldenGoal, setGoldenGoal] = useState(false)
  const [overtimeMinutes, setOvertimeMinutes] = useState(5)

  // 🛡️ SEGURO DEL RELOJ (Modo Edición de Tiempo)
  const [isTimeEditMode, setIsTimeEditMode] = useState(false)
  const [isTimeResetAllowed, setIsTimeResetAllowed] = useState(false)

  // ⌨️ ATAJOS DE TECLADO (HOTKEYS)
  const [hotkeys, setHotkeys] = useState(DEFAULT_HOTKEYS)

  // 🤖 CONTROL DE SILENCIO (Bypass Chicharra)
  const skipNextClockStartBuzzer = useRef(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('ardi-theme') as SkinKey
    if (savedTheme && GLOBAL_THEMES[savedTheme]) setCurrentSkinKey(savedTheme)

    const savedScales = localStorage.getItem('ardi-scales')
    if (savedScales) {
      try { setPanelScales(JSON.parse(savedScales)) } catch(e){}
    }

    const savedGG = localStorage.getItem('ardi-golden-goal')
    if (savedGG) setGoldenGoal(savedGG === 'true')
    const savedOT = localStorage.getItem('ardi-overtime-mins')
    if (savedOT) setOvertimeMinutes(parseInt(savedOT))
    
    const savedTimeEdit = localStorage.getItem('ardi-time-edit')
    if (savedTimeEdit) setIsTimeEditMode(savedTimeEdit === 'true')
    
    const savedTimeReset = localStorage.getItem('ardi-time-reset')
    if (savedTimeReset) setIsTimeResetAllowed(savedTimeReset === 'true')

    const savedHotkeys = localStorage.getItem('ardi-hotkeys')
    if (savedHotkeys) {
      try { setHotkeys(JSON.parse(savedHotkeys)) } catch(e){}
    }
  }, [])

  const handleThemeChange = (val: SkinKey) => {
    setCurrentSkinKey(val)
    localStorage.setItem('ardi-theme', val)
  }

  const handleScaleChange = (panel: keyof typeof panelScales, delta: number) => {
    setPanelScales(prev => {
      const next = { ...prev, [panel]: Math.max(80, Math.min(120, prev[panel] + delta)) }
      localStorage.setItem('ardi-scales', JSON.stringify(next))
      return next
    })
  }

  const handleGoldenGoalChange = (val: boolean) => {
    setGoldenGoal(val)
    localStorage.setItem('ardi-golden-goal', String(val))
  }

  const handleOvertimeChange = (val: string) => {
    const parsed = parseInt(val) || 5;
    setOvertimeMinutes(parsed)
    localStorage.setItem('ardi-overtime-mins', String(parsed))
  }

  const handleTimeEditChange = (val: boolean) => {
    setIsTimeEditMode(val)
    localStorage.setItem('ardi-time-edit', String(val))
  }

  const handleTimeResetChange = (val: boolean) => {
    setIsTimeResetAllowed(val)
    localStorage.setItem('ardi-time-reset', String(val))
  }

  const saveHotkeys = (newH: typeof DEFAULT_HOTKEYS) => {
    setHotkeys(newH)
    localStorage.setItem('ardi-hotkeys', JSON.stringify(newH))
  }

  // ─── LISTENER GLOBAL DE TECLADO (HOTKEYS) ─────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (matchEnded || state.isIntermission) return; 

      const normalizedKey = e.key === ' ' ? 'Space' : e.key.toLowerCase();
      
      const isMatch = (targetHotkey: string) => {
          if (targetHotkey === 'Space' && normalizedKey === 'Space') return true;
          return normalizedKey === targetHotkey.toLowerCase();
      };

      if (isMatch(hotkeys.mainSound)) {
        e.preventDefault();
        skipNextClockStartBuzzer.current = false; props.toggleMainClock();
      } else if (isMatch(hotkeys.mainMute)) {
        e.preventDefault();
        skipNextClockStartBuzzer.current = true; props.toggleMainClock();
      } else if (isMatch(hotkeys.homePosToggle)) {
        e.preventDefault();
        props.togglePossessionLeft();
      } else if (isMatch(hotkeys.homePosReset)) {
        e.preventDefault();
        props.resetPossessionLeft();
      } else if (isMatch(hotkeys.awayPosToggle)) {
        e.preventDefault();
        props.togglePossessionRight();
      } else if (isMatch(hotkeys.awayPosReset)) {
        e.preventDefault();
        props.resetPossessionRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys, matchEnded, state.isIntermission, props]);

  const theme = GLOBAL_THEMES[currentSkinKey] 

  // ─── AUDIO ENGINE NATIVO ──────────────────────────────────
  const [buzzerType, setBuzzerType] = useState<string>('native-synth') 
  const [buzzerMode, setBuzzerMode] = useState<'click' | 'hold'>('click')
  const [customBuzzerFile, setCustomBuzzerFile] = useState<string | null>(null)
  
  const buzzerFileInputRef = useRef<HTMLInputElement>(null)
  const stopSynthTimeout = useRef<NodeJS.Timeout | null>(null)
  const buzzerInterval = useRef<NodeJS.Timeout | null>(null) 

  const nativeAudioCtx = useRef<AudioContext | null>(null)
  const activeOscillators = useRef<OscillatorNode[]>([])

  useEffect(() => {
    if (buzzerType === 'native-synth') {
      props.changeBuzzerSound('') 
    }
  }, [])

  const startNativeSynth = useCallback(() => {
    try {
      if (!window || !window.AudioContext) return; 
      
      if (!nativeAudioCtx.current) {
        nativeAudioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (nativeAudioCtx.current.state === 'suspended') {
        nativeAudioCtx.current.resume();
      }

      activeOscillators.current.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch (e) {} });
      activeOscillators.current = [];

      const ctx = nativeAudioCtx.current;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.5, ctx.currentTime);

      const freqs = [110, 114]; 
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(masterGain);
        osc.start();
        activeOscillators.current.push(osc);
      });
    } catch (e) {
      console.warn("Chicharra nativa falló", e);
    }
  }, []);

  const stopNativeSynth = useCallback(() => {
    activeOscillators.current.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch (e) {}
    });
    activeOscillators.current = [];
  }, []);

  const triggerAutoBuzzer = useCallback((durationMs = 800) => {
    if (stopSynthTimeout.current) clearTimeout(stopSynthTimeout.current);

    if (buzzerType === 'native-synth') {
      startNativeSynth();
      stopSynthTimeout.current = setTimeout(stopNativeSynth, durationMs);
    } else if (buzzerType === 'custom' && customBuzzerFile) {
      props.playBuzzer();
    }
  }, [buzzerType, customBuzzerFile, startNativeSynth, stopNativeSynth, props]);

  const handleBuzzerPress = () => {
    if (stopSynthTimeout.current) clearTimeout(stopSynthTimeout.current);

    if (buzzerType === 'native-synth') {
      startNativeSynth();
      if (buzzerMode === 'click') {
         stopSynthTimeout.current = setTimeout(stopNativeSynth, 800);
      }
    } else if (buzzerType === 'custom' && customBuzzerFile) {
      props.playBuzzer();
      if (buzzerMode === 'hold') {
         buzzerInterval.current = setInterval(() => props.playBuzzer(), 150);
      }
    }
  };

  const handleBuzzerRelease = () => {
    if (buzzerType === 'native-synth') {
      if (buzzerMode === 'hold') stopNativeSynth();
    } else {
      if (buzzerMode === 'hold' && buzzerInterval.current) {
        clearInterval(buzzerInterval.current);
        buzzerInterval.current = null;
      }
    }
  };

  // 🤖 AUTOMATIZACIÓN DE LA CHICHARRA Y BEEPS INTELIGENTES 🤖
  const prevPossLeft = useRef(state.possessionClockLeft);
  const prevPossRight = useRef(state.possessionClockRight);
  const prevTimeoutClock = useRef(state.timeoutClock);
  const prevActiveTimeout = useRef(state.activeTimeout);
  const prevIntermission = useRef(state.isIntermission);
  const prevClockRunning = useRef(state.isMainClockRunning);
  const prevMainClock = useRef(state.mainClock);
  const prevHomeFouls = useRef(state.homeFouls);
  const prevAwayFouls = useRef(state.awayFouls);
  const prevPeriodRef = useRef(state.period);

  useEffect(() => {
    // 🔴 Resetear timeouts al cambiar periodo
    if (prevPeriodRef.current !== state.period) {
      props.resetTimeouts();
      prevPeriodRef.current = state.period;
    }

    // 🚨 PITAZO FINAL LLEGAR A CERO (Cualquier reloj)
    if ((prevPossLeft.current > 0 && state.possessionClockLeft === 0) || 
        (prevPossRight.current > 0 && state.possessionClockRight === 0)) {
        triggerAutoBuzzer(800);
    }
    
    if (!prevActiveTimeout.current && state.activeTimeout) triggerAutoBuzzer(500); 
    if (prevActiveTimeout.current && !state.activeTimeout) triggerAutoBuzzer(1500); 
    if (prevIntermission.current && !state.isIntermission) triggerAutoBuzzer(1500); 

    // Inicio / Fin de Reloj Principal
    if (!prevClockRunning.current && state.isMainClockRunning) {
        if (skipNextClockStartBuzzer.current) skipNextClockStartBuzzer.current = false; 
        else triggerAutoBuzzer(500); 
    }
    if (prevMainClock.current > 0 && state.mainClock === 0) {
        triggerAutoBuzzer(2000); 
    }

    // Faltas (10ma Directa)
    const checkFoulLimit = (prev: number, curr: number) => curr > prev && curr >= 10 && curr % 5 === 0;
    if (checkFoulLimit(prevHomeFouls.current, state.homeFouls) || checkFoulLimit(prevAwayFouls.current, state.awayFouls)) {
      if (state.isMainClockRunning) props.toggleMainClock(); 
      triggerAutoBuzzer(1500); 
      toast.error("¡Límite de Faltas Alcanzado! (Tiro Libre Directo)", { duration: 5000, position: 'top-center' });
    }

    // ⏰ BEEPS INTELIGENTES RELOJ PRINCIPAL (10 segundos a 1 segundo)
    if (state.isMainClockRunning && state.mainClock <= 10 && state.mainClock > 0 && prevMainClock.current !== state.mainClock) {
        triggerAutoBuzzer(200); // Beep corto
    }

    // ⏰ BEEPS INTELIGENTES POSESIÓN (10, 8, 6, 4, 3, 2, 1)
    const checkPossessionBeep = (curr: number, prev: number) => {
        if (curr === 0 || curr >= prev) return;
        if (curr <= 10 && curr > 3 && curr % 2 === 0) {
            triggerAutoBuzzer(200);
        } else if (curr <= 3 && curr > 0) {
            triggerAutoBuzzer(200);
        }
    };

    if (state.isPossessionLeftRunning) checkPossessionBeep(state.possessionClockLeft, prevPossLeft.current);
    if (state.isPossessionRightRunning) checkPossessionBeep(state.possessionClockRight, prevPossRight.current);

    // Actualizar Refs
    prevPossLeft.current = state.possessionClockLeft;
    prevPossRight.current = state.possessionClockRight;
    prevTimeoutClock.current = state.timeoutClock;
    prevActiveTimeout.current = state.activeTimeout;
    prevIntermission.current = state.isIntermission;
    prevClockRunning.current = state.isMainClockRunning;
    prevMainClock.current = state.mainClock;
    prevHomeFouls.current = state.homeFouls;
    prevAwayFouls.current = state.awayFouls;

  }, [
    state.possessionClockLeft, state.possessionClockRight, 
    state.activeTimeout, state.timeoutClock, 
    state.isIntermission, state.isMainClockRunning, state.mainClock,
    state.homeFouls, state.awayFouls, state.period,
    triggerAutoBuzzer, props
  ]);

  useEffect(() => {
    return () => {
      stopNativeSynth();
      if (buzzerInterval.current) clearInterval(buzzerInterval.current);
      if (stopSynthTimeout.current) clearTimeout(stopSynthTimeout.current);
      if (nativeAudioCtx.current && nativeAudioCtx.current.state !== 'closed') {
        nativeAudioCtx.current.close().catch(()=> { /* ignore */ });
      }
    }
  }, [stopNativeSynth]);

  const handleBuzzerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCustomBuzzerFile(url)
      props.changeBuzzerSound(url)
      setBuzzerType('custom')
    }
  }

  const handleBuzzerChange = (value: string) => {
    setBuzzerType(value)
    if (value === 'native-synth') {
      props.changeBuzzerSound('') 
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getPlayerYellowCount = (team: 'home' | 'away', playerNumber: string) =>
    (state.cardHistory || []).filter(c => c.team === team && c.cardType === 'yellow' && c.playerNumber === playerNumber).length

  const getCurrentRoster  = (team: 'home' | 'away') => team === 'home' ? (state.matchConfig.homeRoster || []) : (state.matchConfig.awayRoster || [])
  const getCurrentPlayers = (team: 'home' | 'away') => team === 'home' ? (state.matchConfig.homePlayers || []) : (state.matchConfig.awayPlayers || [])

  const openPosModal = (team: 'home' | 'away', action: 'gol' | 'penal' | 'yellow' | 'blue' | 'red') => {
    if (matchEnded) {
      toast.error("El partido finalizó. Presiona 'REANUDAR' para hacer cambios.");
      return;
    }

    if (state.isMainClockRunning) props.toggleMainClock()
    setPosModalTeam(team)
    setPosModalAction(action)
    setPosModalOpen(true)
    handleBuzzerPress()
    setTimeout(handleBuzzerRelease, 300) 
  }

  const handlePosSelectPlayer = (playerNumber: string, isBench = false) => {
    const team   = posModalTeam
    const action = posModalAction

    if (!isBench && ['DT', 'AY1', 'AY2', 'AX1', 'AX2'].includes(playerNumber.toUpperCase())) {
      toast.warning("Para sancionar al Cuerpo Técnico, utiliza el botón morado 'BANCA / DT' ubicado en la parte inferior.")
      return
    }

    const isAlreadyExpelled = state.cardHistory?.some(c => c.team === team && c.playerNumber === playerNumber && c.cardType === 'red')
    if (isAlreadyExpelled) {
      toast.error(`El jugador #${playerNumber} ya se encuentra EXPULSADO. No puede realizar acciones en cancha ni recibir más tarjetas.`)
      return
    }

    switch (action) {
      case 'gol':
        // 🛡️ REGLA: Dispara la animación pasando el número del jugador
        if (team === 'home') props.adjustHomeScore(1, playerNumber)
        else props.adjustAwayScore(1, playerNumber)

        if (state.period === 'alargue' && goldenGoal) {
          setTimeout(() => {
            toast.success("🏆 ¡GOL DE ORO! El partido ha finalizado por Muerte Súbita.", { duration: 5000 });
            triggerAutoBuzzer(3000); 
            props.setMatchPhase('finalizado' as MatchPhase);
            props.endMatch();
            setMatchEnded(true);
            setShowOfficialSheet(true);
          }, 800);
        }
        break
      case 'penal':
        if (team === 'home') props.adjustHomePenalties(1)
        else props.adjustAwayPenalties(1)
        break
      case 'yellow': case 'blue': case 'red':
        props.addSanction(team, action, playerNumber, false)
        props.resetAndPausePossession()
        break
    }
    setPosModalOpen(false)
  }

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
    setPlanillaLocked(false)
    setExtraSignatures({ arbitroPrincipal: null, arbitroAuxiliar: null })
    setShowOfficialSheet(false)
    setShowAdminMenu(false) // Cerrar menú al reiniciar
  }

  const homeTimeoutsUsed = state.homeTimeoutsUsed || 0
  const awayTimeoutsUsed = state.awayTimeoutsUsed || 0

  // 🛡️ REGLA: El Reloj principal NUNCA debe mostrar el tiempo muerto en la vista Operador.
  const clockTextColor = state.isIntermission ? (theme.id === 'alto-contraste' ? 'text-white' : 'text-amber-400') : theme.clock.textMain
  const clockTextStyle = theme.clock.font
  const clockContainerClass = state.isMainClockRunning 
    ? `${theme.clock.containerMain} ${theme.id === 'alto-contraste' ? 'border-white' : 'border-red-700 shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`
    : theme.clock.containerMain

  if (signingClosingRole) {
    const titles: Record<keyof ClosingSignatureData, string> = { capitanLocal: `Firma Capitan ${homeTeamName}`, capitanVisita: `Firma Capitan ${awayTeamName}`, dtLocal: `Firma DT ${homeTeamName}`, dtVisita: `Firma DT ${awayTeamName}`, encargadoCancha: 'Firma Encargado de Cancha', arbitroCronometrista: 'Firma Árbitro Cronometrista', arbitroPrincipal: 'Firma Árbitro Principal', arbitroAuxiliar: 'Firma Árbitro Auxiliar (Sistema)' }
    return <SignatureCanvas title={titles[signingClosingRole]} onSave={sig => { props.setClosingSignature(signingClosingRole, sig); setSigningClosingRole(null) }} onCancel={() => setSigningClosingRole(null)} />
  }

  if (signingExtraRole) {
    const titles = { arbitroPrincipal: 'Firma Árbitro Principal', arbitroAuxiliar: 'Firma Árbitro Auxiliar (Sistema)' }
    return <SignatureCanvas title={titles[signingExtraRole]} onSave={sig => { setExtraSignatures(prev => ({ ...prev, [signingExtraRole]: sig })); setSigningExtraRole(null) }} onCancel={() => setSigningExtraRole(null)} />
  }

  if (state.matchPhase === 'pre-partido' && !state.isMatchConfigured) {
    return <PreMatchSetup state={state} savedTeams={props.savedTeams} configureMatch={props.configureMatch} configureMatchWithResume={props.configureMatchWithResume} setSignature={props.setSignature} saveTeam={props.saveTeam} deleteTeam={props.deleteTeam} />
  }

  return (
    <div className={`h-full ${theme.globalBg} p-2 sm:p-4 overflow-y-auto flex flex-col transition-colors duration-500`}>

      <BenchModal 
        open={benchModalOpen} 
        onClose={() => setBenchModalOpen(false)} 
        team={benchModalTeam} 
        cardType={benchModalCard} 
        homeTeamName={homeTeamName} 
        awayTeamName={awayTeamName} 
        staffList={benchStaffList} 
        onStaffListChange={setBenchStaffList} 
        cardHistory={state.cardHistory || []} 
        onApply={(team, card, direct, collective) => { 
          if(!matchEnded) {
            props.addBenchSanction(team, card, direct, collective);
            props.resetAndPausePossession();
          } 
        }} 
      />
      <PosModal open={posModalOpen} onClose={() => setPosModalOpen(false)} team={posModalTeam} action={posModalAction} homeTeamName={homeTeamName} awayTeamName={awayTeamName} roster={getCurrentRoster(posModalTeam)} cardHistory={state.cardHistory || []} onSelectPlayer={handlePosSelectPlayer} getPlayerYellowCount={getPlayerYellowCount} getCurrentPlayers={getCurrentPlayers} onOpenBenchModal={(team, card, list) => { if(!matchEnded) { setBenchStaffList(list); setBenchModalCard(card); setBenchModalTeam(team); setBenchModalOpen(true) } }} />
      <MatchHistoryModal open={showHistory} onClose={() => setShowHistory(false)} matchHistory={props.matchHistory || []} deleteMatchFromHistory={props.deleteMatchFromHistory} clearHistory={props.clearHistory} />

      <OfficialSheetModal open={showOfficialSheet} onClose={() => setShowOfficialSheet(false)} state={state} homeTeamName={homeTeamName} awayTeamName={awayTeamName} matchEnded={matchEnded} setSigningClosingRole={setSigningClosingRole} onSaveMatchToHistory={props.saveMatchToHistory} onSaveAndReset={props.onSaveAndReset} planillaLocked={planillaLocked} onLockPlanilla={() => setPlanillaLocked(true)} />

      {/* ── PANEL RELOJ PRINCIPAL Y CONTROLES MAESTROS ─────────────────────────── */}
      <div
        className={`${theme.panelBase} p-3 sm:p-4 mb-3 shrink-0 transition-all ${isEditMode ? 'border-dashed border-yellow-500' : ''}`}
        style={{ transform: `scale(${panelScales.clock / 100})`, transformOrigin: 'top center' }}
      >
        {/* BARRA DE HERRAMIENTAS MODO DISEÑO */}
        {isEditMode && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 p-3 bg-zinc-900 border border-yellow-500/50 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-xs font-black uppercase tracking-widest flex items-center"><Palette className="w-4 h-4 mr-1"/> Panel de Diseño / Escala</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-md border border-zinc-700">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">TEMA VISUAL:</span>
                <Select value={currentSkinKey} onValueChange={(val: SkinKey) => handleThemeChange(val)}>
                  <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-600 text-white w-[180px] font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {Object.values(GLOBAL_THEMES).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-md border border-zinc-700">
                <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">TAMAÑO (RELOJ):</span>
                <Button onClick={() => handleScaleChange('clock', -5)} size="sm" variant="ghost" className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-zinc-800"><ZoomOut className="w-4 h-4" /></Button>
                <span className="text-white text-xs font-mono w-8 text-center">{panelScales.clock}%</span>
                <Button onClick={() => handleScaleChange('clock', 5)} size="sm" variant="ghost" className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-zinc-800"><ZoomIn className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch justify-center w-full max-w-[1400px] mx-auto">
          
          {/* LADO IZQUIERDO: PLAY MUDO y Ajustes de Tiempo */}
          <div className="order-2 lg:order-1 flex-1 flex flex-col gap-2 justify-center lg:max-w-sm">
            <div className="flex gap-2 h-14 sm:h-16">
              <Button 
                onClick={() => { skipNextClockStartBuzzer.current = true; props.toggleMainClock(); }} 
                disabled={matchEnded} 
                className={`flex-1 text-2xl sm:text-3xl font-black ${theme.btn.shape} ${state.isMainClockRunning ? theme.btn.danger : 'bg-green-700 hover:bg-green-600 text-white shadow-md'}`}
                title={`Iniciar/Pausar (SIN Chicharra) [Atajo: ${hotkeys.mainMute.toUpperCase()}]`}
              >
                {state.isMainClockRunning ? <Pause className="w-6 h-6 sm:w-10 sm:h-10" /> : <div className="flex items-center"><Play className="w-6 h-6 sm:w-8 sm:h-8" /><VolumeX className="w-4 h-4 ml-2 opacity-60"/></div>}
              </Button>
              {/* 🛡️ EL BOTÓN DE RESET ESTÁ AISLADO AQUÍ */}
              {isTimeResetAllowed && (
                <Button onClick={props.resetMainClock} disabled={matchEnded} className={`w-16 sm:w-20 shrink-0 ${theme.btn.shape} ${theme.btn.secondary} border-red-900/50 text-red-400 hover:bg-red-900/30`} title="Resetear Tiempo Actual"><RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" /></Button>
              )}
            </div>
            
            {isTimeEditMode && (
              <div className="grid grid-cols-4 gap-1 sm:gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {[{ val: -60, label: '-1m' }, { val: -10, label: '-10s' }, { val: 10, label: '+10s' }, { val: 60, label: '+1m' }].map(btn => (
                  <Button key={btn.val} onClick={() => props.adjustMainClock(btn.val)} disabled={matchEnded} className={`h-10 sm:h-12 font-bold text-[10px] sm:text-sm ${theme.btn.shape} ${theme.btn.secondary}`}>{btn.label}</Button>
                ))}
              </div>
            )}

            {state.period === 'alargue' && isTimeResetAllowed && (
              <Button onClick={() => props.setMainClockTime(overtimeMinutes)} disabled={matchEnded} className={`mt-2 w-full h-8 font-bold text-xs animate-in slide-in-from-top-2 ${theme.btn.shape} bg-purple-700 hover:bg-purple-600 text-white shadow-lg`}>
                <Clock className="w-3 h-3 mr-2 inline-block"/> REINICIAR RELOJ A {overtimeMinutes}:00
              </Button>
            )}
          </div>

          <div className="order-1 lg:order-2 flex-[1.5] flex flex-col items-center justify-center">
            <div className={`relative px-4 sm:px-8 py-6 sm:py-8 w-full max-w-2xl flex flex-col items-center justify-center transition-all duration-300 ${clockContainerClass}`}>
              <span className={`text-xs sm:text-sm font-black tracking-widest block text-center mb-1 sm:mb-2 transition-colors ${state.isIntermission ? (theme.id === 'alto-contraste' ? 'text-white' : 'text-amber-400') : theme.clock.label}`}>
                {state.isIntermission ? 'DESCANSO' : 'TIEMPO DE JUEGO'}
              </span>
              <div className={`w-[220px] sm:w-[320px] lg:w-[420px] mx-auto flex justify-center text-6xl sm:text-8xl lg:text-[7rem] leading-none tabular-nums transition-colors duration-300 ${clockTextColor}`} style={{...clockTextStyle, fontVariantNumeric: 'tabular-nums'}}>
                {formatTime(state.mainClock)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 sm:mt-4">
                <span className={`text-xs sm:text-sm font-bold transition-colors ${theme.clock.label}`}>
                  {state.period === '1er_tiempo' ? '1T' : state.period === '2do_tiempo' ? '2T' : state.period === 'alargue' ? 'ET' : 'PEN'}
                </span>
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${state.isMainClockRunning ? 'bg-green-500 animate-pulse' : (theme.id === 'alto-contraste' ? 'bg-white' : 'bg-red-500')}`} />
              </div>
            </div>
          </div>

          {/* LADO DERECHO: PLAY SONORO, Periodo, Controles Maestros */}
          <div className="order-3 lg:order-3 flex-1 flex flex-col gap-2 justify-center lg:max-w-sm">
            <div className="flex gap-2 h-14 sm:h-16">
              <Button 
                onClick={() => { skipNextClockStartBuzzer.current = false; props.toggleMainClock(); }} 
                disabled={matchEnded} 
                className={`flex-1 text-2xl sm:text-3xl font-black ${theme.btn.shape} ${state.isMainClockRunning ? theme.btn.danger : theme.btn.primary}`}
                title={`Iniciar/Pausar (CON Chicharra) [Atajo: ${hotkeys.mainSound.toUpperCase()}]`}
              >
                {state.isMainClockRunning ? <Pause className="w-6 h-6 sm:w-10 sm:h-10" /> : <div className="flex items-center"><Play className="w-6 h-6 sm:w-8 sm:h-8" /><Bell className="w-5 h-5 ml-2 opacity-90"/></div>}
              </Button>
            </div>

            <div className="flex gap-2 h-12 sm:h-14">
              <div className="flex flex-1 gap-1">
                <Select value={state.period} onValueChange={v => props.setPeriod(v as Period)} disabled={matchEnded}>
                  <SelectTrigger className={`w-full h-full text-xs sm:text-sm font-bold ${theme.btn.shape} ${theme.btn.secondary}`}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="1er_tiempo">1er Tiempo</SelectItem>
                    <SelectItem value="2do_tiempo">2do Tiempo</SelectItem>
                    {state.matchConfig.allowOvertime  && <SelectItem value="alargue">Alargue (P1 / P2)</SelectItem>}
                    {state.matchConfig.allowPenalties && <SelectItem value="penales">Penales</SelectItem>}
                  </SelectContent>
                </Select>
                <Button onClick={props.nextPeriod} disabled={matchEnded} className={`h-full w-10 sm:w-12 p-0 ${theme.btn.shape} ${theme.btn.secondary}`}><ChevronRight className="w-5 h-5" /></Button>
              </div>
              
              <Button 
                onPointerDown={handleBuzzerPress}
                onPointerUp={handleBuzzerRelease}
                onPointerLeave={handleBuzzerRelease}
                className={`flex-[1.5] h-full px-2 font-black select-none ${theme.btn.shape} ${theme.btn.danger}`}
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 mr-1" /> CHICHARRA
              </Button>
            </div>

            {/* 🛡️ MENÚ ADMINISTRATIVO (ACORDEÓN) */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              <div className="flex gap-2 h-10 sm:h-12">
                <Button 
                  onClick={() => setShowAdminMenu(!showAdminMenu)} 
                  className={`flex-1 h-full font-bold ${theme.btn.shape} ${showAdminMenu ? 'bg-zinc-700 text-white border-zinc-600' : theme.btn.secondary}`}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" /> {showAdminMenu ? 'OCULTAR MENÚ' : 'MENÚ DE PARTIDO'}
                </Button>
                <Dialog>
                  <DialogTrigger asChild><Button className={`h-full w-12 sm:w-14 p-0 ${theme.btn.shape} ${theme.btn.secondary}`}><Settings className="w-4 h-4" /></Button></DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md p-0 overflow-hidden" aria-describedby={undefined}>
                    <DialogHeader className="p-4 bg-black border-b border-zinc-800"><DialogTitle className="text-amber-400 font-black flex items-center"><Settings className="w-5 h-5 mr-2"/> Ajustes de Partido y Audio</DialogTitle></DialogHeader>
                    
                    <div className="p-4 space-y-5 max-h-[75vh] overflow-y-auto">
                      
                      {/* 🛡️ PANEL DE SEGURIDAD DE CONTROLES */}
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-3">
                        <Label className="text-amber-400 text-xs font-black uppercase tracking-widest flex items-center"><Shield className="w-4 h-4 mr-2"/> Seguridad de Reloj</Label>
                        
                        <div className="flex items-center justify-between bg-zinc-800 p-2 rounded border border-zinc-700">
                          <div className="flex flex-col">
                            <span className="text-zinc-300 text-xs font-bold">Modo Edición de Tiempo</span>
                            <span className="text-zinc-500 text-[10px]">(Muestra botones manuales de ± Segundos)</span>
                          </div>
                          <button onClick={() => handleTimeEditChange(!isTimeEditMode)} className={`w-12 h-6 rounded-full transition-colors ${isTimeEditMode ? 'bg-green-500' : 'bg-zinc-600'} relative shadow-inner`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all flex items-center justify-center ${isTimeEditMode ? 'left-7' : 'left-1'} shadow`}>
                              {isTimeEditMode ? <Unlock className="w-2.5 h-2.5 text-green-600" /> : <Lock className="w-2.5 h-2.5 text-zinc-600" />}
                            </div>
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-zinc-800 p-2 rounded border border-red-900/30">
                          <div className="flex flex-col">
                            <span className="text-red-400 text-xs font-bold">Botón de Reinicio (Peligro)</span>
                            <span className="text-zinc-500 text-[10px]">(Muestra el botón para resetear el reloj actual)</span>
                          </div>
                          <button onClick={() => handleTimeResetChange(!isTimeResetAllowed)} className={`w-12 h-6 rounded-full transition-colors ${isTimeResetAllowed ? 'bg-red-500' : 'bg-zinc-600'} relative shadow-inner`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all flex items-center justify-center ${isTimeResetAllowed ? 'left-7' : 'left-1'} shadow`}>
                              {isTimeResetAllowed ? <Unlock className="w-2.5 h-2.5 text-red-600" /> : <Lock className="w-2.5 h-2.5 text-zinc-600" />}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* ⌨️ ATAJOS DE TECLADO */}
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-3">
                        <Label className="text-amber-400 text-xs font-black uppercase tracking-widest flex items-center"><Keyboard className="w-4 h-4 mr-2"/> Atajos de Teclado</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           <HotkeyInput label="Play/Pausa (Sonido)" actionKey="mainSound" hotkeys={hotkeys} saveHotkeys={saveHotkeys} />
                           <HotkeyInput label="Play/Pausa (Mudo)" actionKey="mainMute" hotkeys={hotkeys} saveHotkeys={saveHotkeys} />
                           <HotkeyInput label="Play/Pausa 45s Local" actionKey="homePosToggle" hotkeys={hotkeys} saveHotkeys={saveHotkeys} />
                           <HotkeyInput label="Reset 45s Local" actionKey="homePosReset" hotkeys={hotkeys} saveHotkeys={saveHotkeys} />
                           <HotkeyInput label="Play/Pausa 45s Visita" actionKey="awayPosToggle" hotkeys={hotkeys} saveHotkeys={saveHotkeys} />
                           <HotkeyInput label="Reset 45s Visita" actionKey="awayPosReset" hotkeys={hotkeys} saveHotkeys={saveHotkeys} />
                        </div>
                      </div>

                      {/* REGLAS DE PARTIDO */}
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-3">
                        <Label className="text-amber-400 text-xs font-black uppercase tracking-widest flex items-center"><Goal className="w-4 h-4 mr-2"/> Reglas de Alargue</Label>
                        
                        <div className="flex items-center justify-between bg-zinc-800 p-2 rounded border border-zinc-700">
                          <span className="text-zinc-300 text-xs font-bold">Gol de Oro (Muerte Súbita)</span>
                          <button onClick={() => handleGoldenGoalChange(!goldenGoal)} className={`w-12 h-6 rounded-full transition-colors ${goldenGoal ? 'bg-green-500' : 'bg-zinc-600'} relative shadow-inner`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${goldenGoal ? 'left-7' : 'left-1'} shadow`} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between bg-zinc-800 p-2 rounded border border-zinc-700">
                          <span className="text-zinc-300 text-xs font-bold">Minutos por tiempo (Alargue)</span>
                          <Input type="number" min="1" max="20" value={overtimeMinutes} onChange={e => handleOvertimeChange(e.target.value)} className="w-16 h-7 text-xs bg-zinc-900 border-zinc-600 text-center font-bold" />
                        </div>
                      </div>

                      {/* AUDIO ENGINE */}
                      <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-4">
                        <Label className="text-amber-400 text-xs font-black uppercase tracking-widest flex items-center"><Volume2 className="w-4 h-4 mr-2"/> Motor de Sonido</Label>
                        
                        <div>
                          <Label className="text-zinc-400 text-xs">Modo de Activación del Botón</Label>
                          <Select value={buzzerMode} onValueChange={(val: 'click'|'hold') => setBuzzerMode(val)}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-600 mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-600">
                              <SelectItem value="click">👆 Toque Único (Recomendado)</SelectItem>
                              <SelectItem value="hold">⏱️ Pulso Mantenido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-zinc-400 text-xs">Tipo de Sonido</Label>
                          <Select value={buzzerType} onValueChange={handleBuzzerChange}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-600 mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-600">
                              <SelectItem value="native-synth">⚠️ Sintetizador de Mesa (0 Latencia)</SelectItem>
                              <SelectItem value="custom">📂 Cargar MP3 Personalizado...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="pt-2 border-t border-zinc-800">
                          <input ref={buzzerFileInputRef} type="file" accept="audio/*" onChange={handleBuzzerFileUpload} className="hidden" />
                          <Button onClick={() => buzzerFileInputRef.current?.click()} variant="outline" size="sm" className="w-full border-zinc-600 text-xs h-8"><Upload className="w-3 h-3 mr-2" /> Seleccionar MP3 Manual</Button>
                          {customBuzzerFile && <p className="text-green-400 text-[10px] mt-1 text-center font-bold">Audio cargado exitosamente</p>}
                        </div>

                        <Button 
                          onPointerDown={() => { handleBuzzerPress(); if(buzzerMode==='click') setTimeout(handleBuzzerRelease, 800); }} 
                          onPointerUp={handleBuzzerRelease}
                          onPointerLeave={handleBuzzerRelease}
                          className="w-full h-10 bg-amber-600 hover:bg-amber-500 font-black text-sm select-none"
                        >
                          <Bell className="w-4 h-4 mr-2" /> PROBAR SONIDO
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* CONTENIDO DEL ACORDEÓN (MENÚ ADMINISTRATIVO OCULTO) */}
              {showAdminMenu && (
                <div className="grid grid-cols-2 gap-1 sm:gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Button onClick={() => setIsEditMode(!isEditMode)} className={`h-10 sm:h-12 font-bold text-[10px] sm:text-xs ${theme.btn.shape} ${isEditMode ? 'bg-yellow-500 text-black border-none' : theme.btn.secondary}`}>
                    <LayoutGrid className="w-3 h-3 sm:mr-1" /> {isEditMode ? 'SALIR DISEÑO' : 'DISEÑO'}
                  </Button>
                  
                  {matchEnded ? (
                    <Button onClick={() => {
                      setMatchEnded(false);
                      props.closeMatchEndModal(); // 🛡️ REPARADO: Ahora limpia el letrero gigante de FIN DEL PARTIDO
                      props.setMatchPhase('en-curso' as MatchPhase);
                      toast.info("Partido reanudado. Controles desbloqueados.", { position: 'top-center' });
                    }} disabled={planillaLocked} className={`h-10 sm:h-12 px-1 font-bold text-[10px] sm:text-xs bg-green-600 hover:bg-green-500 text-white rounded-md`}>
                      <Play className="w-3 h-3 sm:mr-1" /> REANUDAR
                    </Button>
                  ) : (
                    <Button onClick={() => setShowEndConfirm(true)} disabled={planillaLocked} className={`h-10 sm:h-12 px-1 font-bold text-[10px] sm:text-xs ${theme.btn.shape} ${theme.btn.timeout}`}>
                      <Square className="w-3 h-3 sm:mr-1" /> FIN
                    </Button>
                  )}
                  
                  <Button onClick={() => setShowOfficialSheet(true)} className={`h-10 sm:h-12 px-1 font-bold text-[10px] sm:text-xs ${theme.btn.shape} ${theme.btn.penal}`}>
                    <FileText className="w-3 h-3 sm:mr-1" /> PLANILLA
                  </Button>

                  <Button onClick={() => setShowHistory(true)} className={`h-10 sm:h-12 px-1 font-bold text-[10px] sm:text-xs ${theme.btn.shape} ${theme.btn.secondary}`}>
                    <History className="w-3 h-3 sm:mr-1" /> HISTORIAL
                  </Button>
                  
                  <Button onClick={() => setShowResetConfirm(true)} className={`h-10 sm:h-12 px-1 font-bold text-[10px] sm:text-xs ${theme.btn.shape} ${theme.btn.danger}`}>
                    <RotateCcw className="w-3 h-3 sm:mr-1" /> NUEVO
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="bg-zinc-900 border-2 border-red-700 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader className="sr-only"><DialogTitle>Confirmar Reset</DialogTitle></DialogHeader>
          <div className="text-center p-4">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-red-500 mb-2">NUEVO PARTIDO / RESETEAR</h2>
            <p className="text-zinc-400 mb-6">Esta acción borrará todos los datos actuales y NO se guardarán en el historial.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowResetConfirm(false)} variant="outline" className="flex-1 h-14 font-bold border-zinc-600">CANCELAR</Button>
              <Button onClick={handleFullReset} className="flex-1 h-14 font-black bg-red-600 hover:bg-red-500 text-lg">SÍ, RESETEAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent className="bg-zinc-900 border-2 border-red-700 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader className="sr-only"><DialogTitle>Confirmar Fin</DialogTitle></DialogHeader>
          <div className="text-center p-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-red-500 mb-2">FINALIZAR PARTIDO</h2>
            <p className="text-zinc-400 mb-6">Bloqueará controles y generará planilla oficial.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowEndConfirm(false)} variant="outline" className="flex-1 h-14 font-bold border-zinc-600">CANCELAR</Button>
              <Button onClick={confirmEndMatch} className="flex-1 h-14 font-black bg-red-600 hover:bg-red-500 text-lg">SÍ, FINALIZAR</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntermissionSelector} onOpenChange={setShowIntermissionSelector}>
        <DialogContent className="bg-zinc-900 border-2 border-amber-600 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="text-amber-400 text-xl font-black text-center">TIEMPO DE DESCANSO</DialogTitle></DialogHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => { props.startIntermission(2); setShowIntermissionSelector(false) }} className="h-16 text-lg sm:text-xl font-black bg-amber-800 hover:bg-amber-700">2 MIN</Button>
              <Button onClick={() => { props.startIntermission(5); setShowIntermissionSelector(false) }} className="h-16 text-lg sm:text-xl font-black bg-amber-700 hover:bg-amber-600">5 MIN</Button>
              <Button onClick={() => { props.startIntermission(10); setShowIntermissionSelector(false) }} className="h-16 text-lg sm:text-xl font-black bg-amber-600 hover:bg-amber-500 border-2 border-amber-400">10 MIN</Button>
            </div>
            <div className="border-t border-zinc-700 pt-4">
              <Label className="text-zinc-400 text-xs">Personalizado (minutos):</Label>
              <div className="flex gap-2 mt-2">
                <Input type="number" min="1" max="30" value={customIntermissionMinutes} onChange={e => setCustomIntermissionMinutes(e.target.value)} placeholder="Ej: 15" className="bg-zinc-800 border-zinc-600 flex-1 font-bold text-center" />
                <Button onClick={() => { props.startIntermission(parseInt(customIntermissionMinutes) || 10); setShowIntermissionSelector(false); setCustomIntermissionMinutes('') }} disabled={!customIntermissionMinutes} className="bg-amber-700 hover:bg-amber-600 font-bold px-6">INICIAR</Button>
              </div>
            </div>
            <Button onClick={() => setShowIntermissionSelector(false)} variant="outline" className="w-full border-zinc-600">CANCELAR</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Panel de Posesión + Timeouts (REDISEÑADO RESPONSIVE Y CENTRADO) ──────────────────── */}
      <div
        className={`${theme.panelBase} p-2 sm:p-3 md:p-4 mb-3 shrink-0 transition-all ${isEditMode ? 'border-dashed border-yellow-500' : ''}`}
        style={{ transform: `scale(${panelScales.possession / 100})`, transformOrigin: 'top center' }}
      >
        {isEditMode && (
          <div className="flex items-center justify-center gap-2 mb-2 pb-2 border-b border-yellow-500/30">
            <span className="text-yellow-400 text-xs font-bold">PANEL POSESIÓN Y BANCA</span>
            <Button onClick={() => handleScaleChange('possession', -5)} size="sm" variant="outline" className="h-6 w-6 p-0 border-yellow-500 text-yellow-400"><ZoomOut className="w-3 h-3" /></Button>
            <span className="text-yellow-400 text-xs">{panelScales.possession}%</span>
            <Button onClick={() => handleScaleChange('possession', 5)} size="sm" variant="outline" className="h-6 w-6 p-0 border-yellow-500 text-yellow-400"><ZoomIn className="w-3 h-3" /></Button>
          </div>
        )}

        {/* COMPONENTE CENTRAL EXTRAÍDO PARA RESPONSIVIDAD */}
        {(() => {
          const CenterBlock = () => (
            <div className="flex flex-col items-center justify-center w-[120px] sm:w-[140px] shrink-0">
              {state.activeTimeout ? (
                <div className={`bg-green-900/60 border-2 border-green-500 rounded-xl p-2 sm:p-3 text-center shadow-[0_0_20px_#22c55e] w-full`}>
                  <span className="text-[10px] sm:text-xs text-green-400 font-black block leading-none mb-1">T. MUERTO</span>
                  <div className={`w-full flex justify-center text-2xl sm:text-3xl font-black leading-none tabular-nums tracking-tight ${state.timeoutClock <= 15 ? 'text-red-400 animate-pulse' : 'text-green-400'}`} style={{...theme.clock.font, fontVariantNumeric: 'tabular-nums'}}>{formatTime(state.timeoutClock)}</div>
                  <Button onClick={props.cancelActiveTimeout} disabled={matchEnded} size="sm" className={`mt-2 h-6 text-[10px] w-full font-bold ${theme.btn.shape} ${theme.btn.danger}`}>FIN</Button>
                </div>
              ) : state.isIntermission ? (
                <div className={`bg-amber-900/60 border-2 border-amber-500 rounded-xl p-2 sm:p-3 text-center shadow-[0_0_20px_#f59e0b] w-full`}>
                  <span className="text-[10px] sm:text-xs text-amber-400 font-black block leading-none mb-1">DESCANSO</span>
                  <div className="flex gap-1 mt-2 w-full">
                    <Button onClick={props.endIntermission} disabled={matchEnded} size="sm" className={`h-6 px-0 text-[10px] flex-1 font-bold ${theme.btn.shape} ${theme.btn.danger}`}>FIN</Button>
                    <Button onClick={() => setShowIntermissionSelector(true)} disabled={matchEnded} size="sm" className={`h-6 px-0 text-[10px] flex-1 font-bold ${theme.btn.shape} ${theme.btn.secondary}`}>+ MIN</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowIntermissionSelector(true)} disabled={state.isIntermission || matchEnded} className={`font-bold w-full text-[10px] sm:text-xs h-10 sm:h-12 px-2 sm:px-4 ${theme.btn.shape} ${theme.btn.foul}`}>
                  <Timer className="w-4 h-4 sm:mb-1 sm:mr-1" /> <span className="hidden sm:inline">DESCANSO</span>
                </Button>
              )}
            </div>
          );

          return (
            <div className="w-full flex flex-col gap-3 sm:gap-4">
              {/* BLOQUE CENTRAL MÓVIL (Arriba) */}
              <div className="flex justify-center lg:hidden">
                <CenterBlock />
              </div>

              {/* GRID PRINCIPAL PERFECTAMENTE CENTRADO */}
              <div className="grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 lg:gap-8 w-full max-w-[1400px] mx-auto items-center">

                {/* LOCAL (Izquierda Móvil / Izquierda PC) */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end w-full">
                  {/* BOTONES */}
                  <div className="w-full lg:w-40 xl:w-48 space-y-1 lg:mt-0 order-2 lg:order-1">
                    <Button onClick={() => state.homeTimeoutRequested ? props.cancelTimeoutRequest('home') : props.requestTimeoutHome()} disabled={matchEnded || state.period === 'penales' || homeTimeoutsUsed >= 2 || !!state.activeTimeout} className={`w-full h-8 sm:h-9 font-bold text-[9px] sm:text-xs disabled:opacity-50 px-1 ${theme.btn.shape} ${state.homeTimeoutRequested ? theme.btn.danger : theme.btn.secondary}`}>
                      {state.homeTimeoutRequested ? 'CANCELAR SOLICITUD' : 'SOLICITAR T.B.'}
                    </Button>
                    <Button onClick={props.grantTimeoutHome} disabled={matchEnded || state.period === 'penales' || !state.homeTimeoutRequested || homeTimeoutsUsed >= 2 || !!state.activeTimeout} className={`w-full h-8 sm:h-9 font-bold text-[9px] sm:text-xs disabled:opacity-50 px-1 ${theme.btn.shape} ${theme.btn.timeout}`}>
                      <Coffee className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> CONCEDER ({homeTimeoutsUsed}/2)
                    </Button>
                  </div>

                  {/* SEMÁFOROS */}
                  <div className="flex flex-row lg:flex-col justify-center gap-3 sm:gap-4 w-full lg:w-auto bg-black/20 lg:bg-transparent p-2 rounded-lg order-1 lg:order-2 shrink-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 sm:border-4 transition-all ${state.homeTimeoutRequested ? 'bg-green-500 border-white shadow-[0_0_20px_#22c55e]' : 'bg-transparent border-green-900/50'}`} />
                      <span className={`text-[8px] sm:text-[9px] mt-1 font-bold ${theme.clock.label} text-center leading-tight`}>TIEMPO<br/>BANCA</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 sm:border-4 transition-all ${state.isHomeFoul10Active ? 'bg-red-500 border-white shadow-[0_0_20px_#ef4444] animate-pulse' : 'bg-transparent border-red-900/50'}`} />
                      <span className={`text-[8px] sm:text-[9px] mt-1 font-bold ${theme.clock.label} text-center leading-tight`}>FALTA<br/>T. LIBRE</span>
                    </div>
                  </div>

                  {/* 45s LOCAL */}
                  <div className="flex flex-col items-center gap-1 sm:gap-2 w-full lg:w-[130px] shrink-0 order-3 lg:order-3">
                    <span className={`text-[10px] sm:text-xs font-bold ${theme.clock.label} w-full text-center truncate`}>{homeTeamName.substring(0, 8)} — POS</span>
                    {/* FIJAMOS EL ANCHO AQUÍ PARA EVITAR EL BAILE */}
                    <div className={`w-[100px] sm:w-[130px] flex justify-center text-3xl sm:text-5xl font-black tabular-nums tracking-tight transition-colors ${state.possessionClockLeft <= 10 && state.isPossessionLeftRunning ? (theme.id === 'alto-contraste' ? 'text-white' : 'text-red-500 animate-pulse') : theme.clock.textPos}`} style={{...theme.clock.font, fontVariantNumeric: 'tabular-nums'}}>
                      {formatTime(state.possessionClockLeft)}
                    </div>
                    <div className="flex gap-1 sm:gap-2 w-full mt-1">
                      <Button onClick={props.togglePossessionLeft} disabled={matchEnded} size="sm" className={`flex-1 h-8 sm:h-10 lg:h-12 ${theme.btn.shape} ${state.isPossessionLeftRunning ? theme.btn.danger : theme.btn.primary}`} title={`Atajo: ${hotkeys.homePosToggle.toUpperCase()}`}>
                        {state.isPossessionLeftRunning ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </Button>
                      <Button onClick={props.resetPossessionLeft} disabled={matchEnded} size="sm" className={`flex-1 h-8 sm:h-10 lg:h-12 ${theme.btn.shape} ${theme.btn.secondary}`} title={`Atajo: ${hotkeys.homePosReset.toUpperCase()}`}>
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* BLOQUE CENTRAL PC (Oculto en Móvil) */}
                <div className="hidden lg:flex justify-center shrink-0">
                  <CenterBlock />
                </div>

                {/* VISITA (Derecha Móvil / Derecha PC) */}
                <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-center lg:justify-end w-full">
                  
                  {/* BOTONES */}
                  <div className="w-full lg:w-40 xl:w-48 space-y-1 lg:mt-0 order-2 lg:order-1">
                    <Button onClick={() => state.awayTimeoutRequested ? props.cancelTimeoutRequest('away') : props.requestTimeoutAway()} disabled={matchEnded || state.period === 'penales' || awayTimeoutsUsed >= 2 || !!state.activeTimeout} className={`w-full h-8 sm:h-9 font-bold text-[9px] sm:text-xs disabled:opacity-50 px-1 ${theme.btn.shape} ${state.awayTimeoutRequested ? theme.btn.danger : theme.btn.secondary}`}>
                      {state.awayTimeoutRequested ? 'CANCELAR SOLICITUD' : 'SOLICITAR T.B.'}
                    </Button>
                    <Button onClick={props.grantTimeoutAway} disabled={matchEnded || state.period === 'penales' || !state.awayTimeoutRequested || awayTimeoutsUsed >= 2 || !!state.activeTimeout} className={`w-full h-8 sm:h-9 font-bold text-[9px] sm:text-xs disabled:opacity-50 px-1 ${theme.btn.shape} ${theme.btn.timeout}`}>
                      <Coffee className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> CONCEDER ({awayTimeoutsUsed}/2)
                    </Button>
                  </div>

                  {/* SEMÁFOROS */}
                  <div className="flex flex-row lg:flex-col justify-center gap-3 sm:gap-4 w-full lg:w-auto bg-black/20 lg:bg-transparent p-2 rounded-lg order-1 lg:order-2 shrink-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 sm:border-4 transition-all ${state.awayTimeoutRequested ? 'bg-green-500 border-white shadow-[0_0_20px_#22c55e]' : 'bg-transparent border-green-900/50'}`} />
                      <span className={`text-[8px] sm:text-[9px] mt-1 font-bold ${theme.clock.label} text-center leading-tight`}>TIEMPO<br/>BANCA</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 sm:border-4 transition-all ${state.isAwayFoul10Active ? 'bg-red-500 border-white shadow-[0_0_20px_#ef4444] animate-pulse' : 'bg-transparent border-red-900/50'}`} />
                      <span className={`text-[8px] sm:text-[9px] mt-1 font-bold ${theme.clock.label} text-center leading-tight`}>FALTA<br/>T. LIBRE</span>
                    </div>
                  </div>

                  {/* 45s VISITA */}
                  <div className="flex flex-col items-center gap-1 sm:gap-2 w-full lg:w-[130px] shrink-0 order-3 lg:order-3">
                    <span className={`text-[10px] sm:text-xs font-bold ${theme.clock.label} w-full text-center truncate`}>{awayTeamName.substring(0, 8)} — POS</span>
                    {/* FIJAMOS EL ANCHO AQUÍ PARA EVITAR EL BAILE */}
                    <div className={`w-[100px] sm:w-[130px] flex justify-center text-3xl sm:text-5xl font-black tabular-nums tracking-tight transition-colors ${state.possessionClockRight <= 10 && state.isPossessionRightRunning ? (theme.id === 'alto-contraste' ? 'text-white' : 'text-red-500 animate-pulse') : theme.clock.textPos}`} style={{...theme.clock.font, fontVariantNumeric: 'tabular-nums'}}>
                      {formatTime(state.possessionClockRight)}
                    </div>
                    <div className="flex gap-1 sm:gap-2 w-full mt-1">
                      <Button onClick={props.togglePossessionRight} disabled={matchEnded} size="sm" className={`flex-1 h-8 sm:h-10 lg:h-12 ${theme.btn.shape} ${state.isPossessionRightRunning ? theme.btn.danger : theme.btn.primary}`} title={`Atajo: ${hotkeys.awayPosToggle.toUpperCase()}`}>
                        {state.isPossessionRightRunning ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </Button>
                      <Button onClick={props.resetPossessionRight} disabled={matchEnded} size="sm" className={`flex-1 h-8 sm:h-10 lg:h-12 ${theme.btn.shape} ${theme.btn.secondary}`} title={`Atajo: ${hotkeys.awayPosReset.toUpperCase()}`}>
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Tarjetas de Equipos ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {(['home', 'away'] as const).map(side => {
          const isHome     = side === 'home'
          const teamName   = isHome ? homeTeamName : awayTeamName
          const score      = isHome ? state.homeScore : state.awayScore
          const fouls      = isHome ? state.homeFouls : state.awayFouls
          const penalties  = isHome ? state.homePenalties : state.awayPenalties
          const foulActive = isHome ? state.isHomeFoul10Active : state.isAwayFoul10Active
          const sanctions  = isHome ? homeSanctions : awaySanctions
          
          const teamPanelBase = isHome ? theme.teamHomeBase : theme.teamAwayBase
          const textColor     = isHome ? 'text-blue-400' : 'text-amber-400'
          const panelKey      = isHome ? 'teamHome' : 'teamAway'
          const panelScale    = isHome ? panelScales.teamHome : panelScales.teamAway

          const finalTextColor = theme.id === 'alto-contraste' ? 'text-white' : textColor;

          return (
            <div key={side}
              className={`${teamPanelBase} p-3 sm:p-4 flex flex-col transition-all ${isEditMode ? 'border-dashed border-yellow-500' : ''}`}
              style={{ transform: `scale(${panelScale / 100})`, transformOrigin: 'top center' }}
            >
              {isEditMode && (
                <div className="flex items-center justify-center gap-2 mb-2 pb-2 border-b border-yellow-500/30">
                  <span className="text-yellow-400 text-xs font-bold">{isHome ? 'EQUIPO LOCAL' : 'EQUIPO VISITA'}</span>
                  <Button onClick={() => handleScaleChange(panelKey, -5)} size="sm" variant="outline" className="h-6 w-6 p-0 border-yellow-500 text-yellow-400"><ZoomOut className="w-3 h-3" /></Button>
                  <span className="text-yellow-400 text-xs">{panelScale}%</span>
                  <Button onClick={() => handleScaleChange(panelKey, 5)} size="sm" variant="outline" className="h-6 w-6 p-0 border-yellow-500 text-yellow-400"><ZoomIn className="w-3 h-3" /></Button>
                </div>
              )}
              <h2 className={`${finalTextColor} font-black text-lg sm:text-2xl text-center mb-3 sm:mb-4 shrink-0 uppercase`}>{teamName}</h2>

              <div className={`grid ${state.matchConfig.allowPenalties ? 'grid-cols-3' : 'grid-cols-2'} gap-2 sm:gap-3 mb-3 sm:mb-4 shrink-0`}>
                <div className="bg-black/50 rounded-lg p-2 sm:p-3 text-center">
                  <span className={`text-[10px] sm:text-xs font-bold block ${theme.clock.label}`}>GOLES</span>
                  <span className={`text-4xl sm:text-5xl font-black tabular-nums block min-w-[60px] mx-auto ${theme.id === 'alto-contraste' ? 'text-white' : 'text-red-500'}`} style={{...theme.clock.font, fontVariantNumeric: 'tabular-nums'}}>{score}</span>
                  <div className="flex justify-center gap-1 mt-2">
                    <Button size="sm" onClick={() => isHome ? props.adjustHomeScore(-1) : props.adjustAwayScore(-1)} disabled={matchEnded || state.isIntermission} className={`h-8 w-8 p-0 ${theme.btn.shape} ${theme.btn.secondary}`}><Minus className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={() => isHome ? props.adjustHomeScore(1) : props.adjustAwayScore(1)} disabled={matchEnded || state.isIntermission} className={`h-8 w-8 p-0 ${theme.btn.shape} ${theme.btn.secondary}`}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className={`rounded-lg p-3 text-center transition-colors ${foulActive ? (theme.id === 'alto-contraste' ? 'border-4 border-white' : 'bg-red-900/50 border-2 border-red-500 animate-pulse') : 'bg-black/50 border-2 border-transparent'}`}>
                  <span className={`text-[10px] sm:text-xs font-bold block ${theme.clock.label}`}>FALTAS</span>
                  <span className={`text-4xl sm:text-5xl font-black tabular-nums block min-w-[60px] mx-auto ${foulActive ? (theme.id==='alto-contraste'?'text-white':'text-red-500') : (theme.id==='alto-contraste'?'text-[#FFFF00]':'text-amber-400')}`} style={{...theme.clock.font, fontVariantNumeric: 'tabular-nums'}}>{fouls}</span>
                  <div className="flex justify-center gap-1 mt-2">
                    <Button size="sm" onClick={() => isHome ? props.adjustHomeFouls(-1) : props.adjustAwayFouls(-1)} disabled={matchEnded || state.isIntermission} className={`h-8 w-8 p-0 ${theme.btn.shape} ${theme.btn.secondary}`}><Minus className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={() => isHome ? props.adjustHomeFouls(1) : props.adjustAwayFouls(1)} disabled={matchEnded || state.isIntermission} className={`h-8 w-8 p-0 ${theme.btn.shape} ${theme.btn.secondary}`}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
                {state.matchConfig.allowPenalties && (
                  <div className="bg-black/50 rounded-lg p-3 text-center">
                    <span className={`text-[10px] sm:text-xs font-bold block ${theme.clock.label}`}>PENALES</span>
                    <span className={`text-4xl sm:text-5xl font-black tabular-nums block min-w-[60px] mx-auto ${theme.id === 'alto-contraste' ? 'text-white' : 'text-purple-400'}`} style={{...theme.clock.font, fontVariantNumeric: 'tabular-nums'}}>{penalties}</span>
                    <div className="flex justify-center gap-1 mt-2">
                      <Button size="sm" onClick={() => isHome ? props.adjustHomePenalties(-1) : props.adjustAwayPenalties(-1)} disabled={state.period !== 'penales' || matchEnded || state.isIntermission} className={`h-8 w-8 p-0 disabled:opacity-50 ${theme.btn.shape} ${theme.btn.secondary}`}><Minus className="w-4 h-4" /></Button>
                      <Button size="sm" onClick={() => isHome ? props.adjustHomePenalties(1) : props.adjustAwayPenalties(1)} disabled={state.period !== 'penales' || matchEnded || state.isIntermission} className={`h-8 w-8 p-0 disabled:opacity-50 ${theme.btn.shape} ${theme.btn.secondary}`}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
              </div>

              <div className={`grid ${state.matchConfig.allowPenalties ? 'grid-cols-2' : 'grid-cols-1'} gap-2 sm:gap-3 mb-3 shrink-0`}>
                <Button onClick={() => openPosModal(side, 'gol')} disabled={matchEnded || state.isIntermission} className={`h-14 sm:h-16 text-xl font-black ${theme.btn.shape} ${theme.btn.primary}`}>
                  <Goal className="w-6 h-6 mr-2" /> + GOL
                </Button>
                {state.matchConfig.allowPenalties && (
                  <Button onClick={() => openPosModal(side, 'penal')} disabled={state.period !== 'penales' || matchEnded || state.isIntermission} className={`h-14 sm:h-16 text-lg font-black disabled:opacity-30 ${theme.btn.shape} ${state.period === 'penales' ? theme.btn.penal : theme.btn.secondary}`}>
                    <Square className="w-5 h-5 mr-2" /> + PENAL
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 shrink-0">
                <Button onClick={() => openPosModal(side, 'yellow')} disabled={matchEnded} className={`h-12 font-black ${theme.btn.shape} ${theme.btn.cardY}`}>AMARILLA</Button>
                <Button onClick={() => openPosModal(side, 'blue')}   disabled={matchEnded} className={`h-12 font-black ${theme.btn.shape} ${theme.btn.cardB}`}>AZUL</Button>
                <Button onClick={() => openPosModal(side, 'red')}    disabled={matchEnded} className={`h-12 font-black ${theme.btn.shape} ${theme.btn.cardR}`}>ROJA</Button>
              </div>

              <SanctionsList sanctions={sanctions} onRemove={(id) => { if(!matchEnded) props.removeSanction(id) }} />
            </div>
          )
        })}
      </div>

      {/* ── Últimos eventos ───────────────────────────────────────────────── */}
      {(state.matchLog || []).length > 0 && (
        <div className={`${theme.panelBase} p-3 shrink-0 mb-4`}>
          <h3 className={`text-xs font-bold mb-3 flex items-center ${theme.clock.label}`}><History className="w-4 h-4 mr-1" /> ÚLTIMOS EVENTOS</h3>
          <div className="flex flex-wrap gap-2">
            {(state.matchLog || []).slice(-10).reverse().map(e => {
              const period = e.period === '1er_tiempo' ? '1T' : e.period === '2do_tiempo' ? '2T' : e.period === 'alargue' ? 'ET' : 'PEN'
              const mins   = Math.floor(e.gameTime / 60).toString().padStart(2, '0')
              const team   = e.team === 'home' ? 'L' : 'V'
              
              const eventStyles: Record<string, string> = {
                gol:              'bg-green-900/40 text-green-400 border-green-700',
                falta:            'bg-orange-900/40 text-orange-400 border-orange-700',
                tarjeta_amarilla: 'bg-yellow-900/40 text-yellow-400 border-yellow-700',
                tarjeta_azul:     'bg-blue-900/40 text-blue-400 border-blue-700',
                tarjeta_roja:     'bg-red-900/40 text-red-400 border-red-700',
                timeout:          'bg-purple-900/40 text-purple-400 border-purple-700',
                penal:            'bg-indigo-900/40 text-indigo-400 border-indigo-700',
                penal_ronda:      'bg-indigo-900/40 text-indigo-400 border-indigo-700',
                inicio:           'bg-blue-900/40 text-blue-400 border-blue-700',
                fin:              'bg-red-900/40 text-red-400 border-red-700',
                periodo:          'bg-zinc-800 text-zinc-300 border-zinc-600'
              };
              
              const evLabels: Record<string, string> = {
                gol: 'GOL', falta: 'FALTA', tarjeta_amarilla: 'AMARILLA', tarjeta_azul: 'AZUL', 
                tarjeta_roja: 'ROJA', timeout: 'T.M', penal: 'PENAL', penal_ronda: 'TANDA',
                inicio: 'INICIO', fin: 'FIN', periodo: 'PERIODO'
              };

              const pillClass = eventStyles[e.eventType] || 'bg-zinc-800 text-zinc-300 border-zinc-600';
              const evLabel = evLabels[e.eventType] || e.eventType.toUpperCase();

              return (
                <div key={e.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border font-bold text-[10px] uppercase shadow-sm ${pillClass} max-w-[140px] truncate cursor-help`} title={`${evLabel} - ${e.details || ''}`}>
                  <span>{period} {mins}'</span>
                  <span>{team}</span>
                  <span>#{e.actor}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Pista Dinámica ────────────────────────────────────────────────── */}
      <LiveCourtViewer
        homePlayers={state.matchConfig.homePlayers || []}
        awayPlayers={state.matchConfig.awayPlayers || []}
        homeRoster={state.matchConfig.homeRoster || []}
        awayRoster={state.matchConfig.awayRoster || []}
        homeTeamName={homeTeamName}
        awayTeamName={awayTeamName}
        sanctions={state.sanctions}
        period={state.period}
        cardHistory={state.cardHistory}
      />
    </div>
  )
}