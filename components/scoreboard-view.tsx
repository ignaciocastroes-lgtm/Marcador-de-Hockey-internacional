"use client"

import { GoalOverlay } from '@/components/scoreboard/GoalOverlay'
import { loadLayouts, OVERLAY_LAYOUT_EVENT, type AllLayouts } from '@/lib/overlay-layout'

import { WinnerOverlay } from '@/components/scoreboard/WinnerOverlay'

import { finishClass, finishStyle, resolveFinish, type Finish } from '@/lib/finishes'
import { resolveLedFont } from '@/lib/board-look'

import { defaultHomeName, defaultHomeLogo, CLUB_BRAND } from '@/lib/club-brand'

import { SummaryOverlay } from '@/components/scoreboard/SummaryOverlay'
import { loadOverlays, showsOn, OVERLAYS_EVENT, DEFAULT_OVERLAYS, type OverlaysConfig } from '@/lib/overlay-config'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Settings, X, Save, RotateCcw, Move, ZoomIn, ZoomOut, Plus, Minus, Trash2, Eye, FlipHorizontal } from 'lucide-react'
import type { GameState } from '@/hooks/use-game-state'

interface ScoreboardViewProps {
  state: GameState
  onSaveAndReset?: () => void
  boardId?: number
  isPreview?: boolean
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Elementos que son el reflejo del otro respecto del centro del tablero.
 * En modo espejo, mover uno mueve al otro a la posicion simetrica: es la unica
 * forma practica de dejarlos alineados de verdad. La ESCALA no se refleja, para
 * poder agrandar un escudo sin tocar el del rival.
 */
const MIRROR_PAIRS: Record<string, string> = {
  homeLogo: 'awayLogo', awayLogo: 'homeLogo',
  homeName: 'awayName', awayName: 'homeName',
  homeScore: 'awayScore', awayScore: 'homeScore',
  homePossession: 'awayPossession', awayPossession: 'homePossession',
  homeLights: 'awayLights', awayLights: 'homeLights',
  homePenalties: 'awayPenalties', awayPenalties: 'homePenalties',
  homeFouls: 'awayFouls', awayFouls: 'homeFouls',
  homeSanctions: 'awaySanctions', awaySanctions: 'homeSanctions'
}
const MIRROR_AXIS = 960

const GENERIC_SHIELDS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E"
]

const DEFAULTS_P1 = {
  clock: { x: 960, y: 170, s: 1, v: true },
  homeLogo: { x: 310, y: 220, s: 1, v: true },
  homeName: { x: 310, y: 380, s: 1, v: true },
  homeScore: { x: 310, y: 640, s: 1, v: true },
  period: { x: 960, y: 550, s: 1, v: true },
  awayLogo: { x: 1610, y: 220, s: 1, v: true },
  awayName: { x: 1610, y: 380, s: 1, v: true },
  awayScore: { x: 1610, y: 640, s: 1, v: true },
  homePossession: { x: 200, y: 920, s: 0.9, v: true },
  homeLights: { x: 200, y: 740, s: 0.9, v: true },
  homePenalties: { x: 500, y: 920, s: 0.9, v: true },
  homeFouls: { x: 800, y: 920, s: 0.9, v: true },
  awayPossession: { x: 1720, y: 920, s: 0.9, v: true },
  awayLights: { x: 1720, y: 740, s: 0.9, v: true },
  awayPenalties: { x: 1420, y: 920, s: 0.9, v: true },
  awayFouls: { x: 1120, y: 920, s: 0.9, v: true },
  homeSanctions: { x: 750, y: 700, s: 1, v: true },
  awaySanctions: { x: 1170, y: 700, s: 1, v: true },
  skaters: { x: 960, y: 880, s: 1, v: true },
}

const DEFAULTS_P2 = {
  ...DEFAULTS_P1,
  clock: { ...DEFAULTS_P1.clock, v: false },
  homeLogo: { x: 960, y: 240, s: 2.2, v: true },
  homeName: { x: 960, y: 460, s: 1.5, v: true },
  homeScore: { ...DEFAULTS_P1.homeScore, v: false },
  period: { ...DEFAULTS_P1.period, v: false },
  awayLogo: { ...DEFAULTS_P1.awayLogo, v: false },
  awayName: { ...DEFAULTS_P1.awayName, v: false },
  awayScore: { ...DEFAULTS_P1.awayScore, v: false },
  homePossession: { x: 960, y: 850, s: 1.8, v: true },
  homeLights: { x: 960, y: 620, s: 1.5, v: true },
  homeFouls: { x: 710, y: 920, s: 1, v: false },
  awayFouls: { x: 1210, y: 920, s: 1, v: false },
  awayPossession: { x: 1650, y: 920, s: 1, v: false },
  awayLights: { ...DEFAULTS_P1.awayLights, v: false },
  homePenalties: { x: 310, y: 880, s: 0.8, v: false },
  awayPenalties: { x: 1610, y: 880, s: 0.8, v: false },
  homeSanctions: { x: 300, y: 850, s: 1, v: false },
  awaySanctions: { x: 1620, y: 850, s: 1, v: false },
  skaters: { ...DEFAULTS_P1.skaters, v: false },
}

const DEFAULTS_P3 = {
  ...DEFAULTS_P1,
  clock: { ...DEFAULTS_P1.clock, v: false },
  homeLogo: { ...DEFAULTS_P1.homeLogo, v: false },
  homeName: { ...DEFAULTS_P1.homeName, v: false },
  homeScore: { ...DEFAULTS_P1.homeScore, v: false },
  period: { ...DEFAULTS_P1.period, v: false },
  awayLogo: { x: 960, y: 240, s: 2.2, v: true },
  awayName: { x: 960, y: 460, s: 1.5, v: true },
  awayScore: { ...DEFAULTS_P1.awayScore, v: false },
  homePossession: { x: 270, y: 920, s: 1, v: false },
  homeLights: { ...DEFAULTS_P1.homeLights, v: false },
  homeFouls: { x: 710, y: 920, s: 1, v: false },
  awayFouls: { x: 1210, y: 920, s: 1, v: false },
  awayPossession: { x: 960, y: 850, s: 1.8, v: true },
  awayLights: { x: 960, y: 620, s: 1.5, v: true },
  homePenalties: { x: 310, y: 880, s: 0.8, v: false },
  awayPenalties: { x: 1610, y: 880, s: 0.8, v: false },
  homeSanctions: { x: 300, y: 850, s: 1, v: false },
  awaySanctions: { x: 1620, y: 850, s: 1, v: false },
  skaters: { ...DEFAULTS_P1.skaters, v: false },
}

const DEFAULTS_P4 = {
  ...DEFAULTS_P1,
  clock: { ...DEFAULTS_P1.clock, v: false },
  homeLogo: { ...DEFAULTS_P1.homeLogo, v: false },
  homeName: { ...DEFAULTS_P1.homeName, v: false },
  homeScore: { ...DEFAULTS_P1.homeScore, v: false },
  period: { ...DEFAULTS_P1.period, v: false },
  awayLogo: { ...DEFAULTS_P1.awayLogo, v: false },
  awayName: { ...DEFAULTS_P1.awayName, v: false },
  awayScore: { ...DEFAULTS_P1.awayScore, v: false },
  homePossession: { ...DEFAULTS_P1.homePossession, v: false },
  homeLights: { ...DEFAULTS_P1.homeLights, v: false },
  homePenalties: { ...DEFAULTS_P1.homePenalties, v: false },
  homeFouls: { ...DEFAULTS_P1.homeFouls, v: false },
  awayPossession: { ...DEFAULTS_P1.awayPossession, v: false },
  awayLights: { ...DEFAULTS_P1.awayLights, v: false },
  awayPenalties: { ...DEFAULTS_P1.awayPenalties, v: false },
  awayFouls: { ...DEFAULTS_P1.awayFouls, v: false },
  homeSanctions: { x: 960, y: 540, s: 2.5, v: true }, 
  awaySanctions: { ...DEFAULTS_P1.awaySanctions, v: false },
  skaters: { ...DEFAULTS_P1.skaters, v: false },
}

const DEFAULTS_P5 = {
  ...DEFAULTS_P1,
  clock: { ...DEFAULTS_P1.clock, v: false },
  homeLogo: { ...DEFAULTS_P1.homeLogo, v: false },
  homeName: { ...DEFAULTS_P1.homeName, v: false },
  homeScore: { ...DEFAULTS_P1.homeScore, v: false },
  period: { ...DEFAULTS_P1.period, v: false },
  awayLogo: { ...DEFAULTS_P1.awayLogo, v: false },
  awayName: { ...DEFAULTS_P1.awayName, v: false },
  awayScore: { ...DEFAULTS_P1.awayScore, v: false },
  homePossession: { ...DEFAULTS_P1.homePossession, v: false },
  homeLights: { ...DEFAULTS_P1.homeLights, v: false },
  homePenalties: { ...DEFAULTS_P1.homePenalties, v: false },
  homeFouls: { ...DEFAULTS_P1.homeFouls, v: false },
  awayPossession: { ...DEFAULTS_P1.awayPossession, v: false },
  awayLights: { ...DEFAULTS_P1.awayLights, v: false },
  awayPenalties: { ...DEFAULTS_P1.awayPenalties, v: false },
  awayFouls: { ...DEFAULTS_P1.awayFouls, v: false },
  homeSanctions: { ...DEFAULTS_P1.homeSanctions, v: false },
  awaySanctions: { x: 960, y: 540, s: 2.5, v: true }, 
  skaters: { ...DEFAULTS_P1.skaters, v: false },
}

const getInitialBoardId = (propId?: number) => {
  if (propId) return propId;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('board') || '1');
  }
  return 1;
};

const getDefaultsForBoard = (id: number) => {
  if (id === 2) return DEFAULTS_P2;
  if (id === 3) return DEFAULTS_P3;
  if (id === 4) return DEFAULTS_P4;
  if (id === 5) return DEFAULTS_P5;
  return DEFAULTS_P1;
};

// -----------------------------------------------------------------------------
// 🚀 COMPONENTES AISLADOS PARA RENDIMIENTO FLUIDO
// -----------------------------------------------------------------------------

const Draggable = React.memo(({ id, pos, editMode, onPointerDown, onPointerMove, onPointerUp, onToggleVisibility, onScale, children, className = '' }: any) => {
  if (!pos) return null; 
  if (!pos.v && !editMode) return null

  return (
    <div
      onPointerDown={(e) => onPointerDown(e, id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`absolute flex flex-col items-center transition-colors ${editMode ? 'cursor-move ring-[12px] ring-yellow-500 ring-dashed bg-white/5 rounded-3xl z-50 hover:bg-white/10' : ''} ${className}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: `translate(-50%, -50%) scale(${pos.s}) translateZ(0)`,
        touchAction: 'none',
        opacity: (!pos.v && editMode) ? 0.3 : 1,
        filter: (!pos.v && editMode) ? 'grayscale(100%)' : 'none',
        willChange: 'transform',
        backfaceVisibility: 'hidden'
      }}
    >
      {editMode && (
        <div className="absolute -top-32 right-0 flex gap-4 z-[400] bg-black p-3 rounded-2xl border-4 border-yellow-500 shadow-2xl pointer-events-auto items-center scale-75 md:scale-100 origin-bottom-right">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(id); }}
            className={`${pos.v ? 'bg-red-900/80 hover:bg-red-800 text-red-200' : 'bg-green-600 hover:bg-green-500 text-white'} p-4 rounded-xl flex items-center justify-center transition-colors`}
            title={pos.v ? "Ocultar en transmisión" : "Mostrar en transmisión"}
          >
            {pos.v ? <Trash2 className="w-10 h-10" /> : <Eye className="w-10 h-10" />}
          </button>
          <div className="w-[4px] h-[50px] bg-zinc-700 mx-2" />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onScale(id, -0.1); }}
            className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-xl flex items-center justify-center"
          >
            <ZoomOut className="w-10 h-10" />
          </button>
          <span className="text-yellow-500 font-bold px-4 flex items-center text-4xl">{Math.round(pos.s * 100)}%</span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onScale(id, 0.1); }}
            className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-xl flex items-center justify-center"
          >
            <ZoomIn className="w-10 h-10" />
          </button>
        </div>
      )}
      {children}
    </div>
  )
});
Draggable.displayName = 'Draggable';

const DummySanction = React.memo(({ type, isWaiting = false, customStyle }: { type: 'blue' | 'red', isWaiting?: boolean, customStyle: React.CSSProperties }) => (
  <div className={`flex flex-col items-center p-[15px] rounded-[20px] border-[4px] shadow-2xl w-[260px] transition-all ${!isWaiting ? (type === 'blue' ? 'bg-blue-950/80 border-blue-600' : 'bg-red-950/80 border-red-600') : 'bg-zinc-900/80 border-zinc-600 opacity-60 grayscale'}`}>
    <span className="text-white font-black text-[25px]">#00</span>
    <div className={`font-black ${!isWaiting ? (type === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-zinc-500'}`} style={{ ...customStyle, fontSize: '70px', lineHeight: '1', textShadow: !isWaiting ? (type === 'blue' ? '0 0 20px #3b82f6' : '0 0 20px #ef4444') : 'none', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
      {type === 'blue' ? '2:00' : '4:00'}
    </div>
    <span className={`font-bold text-[16px] tracking-widest ${!isWaiting ? (type === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-zinc-500'}`}>
      {!isWaiting ? (type === 'blue' ? 'AZUL' : 'ROJA') : 'ESPERA'}
    </span>
  </div>
));
DummySanction.displayName = 'DummySanction';

const TeamLogo = React.memo(({ team, size = 180, liveUrl, stateUrl, shape, is3D, isAnim }: any) => {
  const fallbackUrl = team === 'home' ? GENERIC_SHIELDS[0] : GENERIC_SHIELDS[1];
  const url = liveUrl || stateUrl || fallbackUrl;

  const isFree = shape === 'none'; 
  let clipStyle: React.CSSProperties = { width: '100%', height: '100%' };
  let OverlayComponent = null;

  if (isFree) {
    // Sin máscara ni overlay
  } else if (shape === 'circle') {
    const roundedClass = 'rounded-full';
    OverlayComponent = (
      <div className={`absolute inset-0 ${roundedClass} border-[6px] border-zinc-300/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none z-20`}>
        <div className={`absolute inset-0 ${roundedClass} bg-gradient-to-tr from-black/60 via-transparent to-white/30 mix-blend-overlay`} />
      </div>
    );
    clipStyle = { borderRadius: '50%' };
  } else if (shape === 'square') {
    const roundedClass = 'rounded-[25%]';
    OverlayComponent = (
      <div className={`absolute inset-0 ${roundedClass} border-[6px] border-zinc-300/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none z-20`}>
        <div className={`absolute inset-0 ${roundedClass} bg-gradient-to-tr from-black/60 via-transparent to-white/30 mix-blend-overlay`} />
      </div>
    );
    clipStyle = { borderRadius: '25%' };
  } else {
    let shapePath = "";
    if (shape === 'iberico') shapePath = "M 10 5 L 90 5 L 90 55 A 40 40 0 0 1 10 55 Z";
    else if (shape === 'gotico')  shapePath = "M 10 5 L 90 5 A 80 80 0 0 1 50 98 A 80 80 0 0 1 10 5 Z";
    else if (shape === 'tudor')   shapePath = "M 10 20 L 50 5 L 90 20 L 90 55 C 90 85, 65 95, 50 98 C 35 95, 10 85, 10 55 Z";
    else shapePath = "M 50 2 L 98 13 L 98 65 L 50 98 L 2 65 L 2 13 Z"; 

    const encodedMask = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='" + encodeURIComponent(shapePath) + "' fill='black'/%3E%3C/svg%3E";
    
    clipStyle = {
      WebkitMaskImage: `url("${encodedMask}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskPosition: 'center',
      WebkitMaskRepeat: 'no-repeat',
      maskImage: `url("${encodedMask}")`,
      maskSize: 'contain',
      maskPosition: 'center',
      maskRepeat: 'no-repeat'
    };

    OverlayComponent = (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 drop-shadow-md" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path d={shapePath} fill="none" stroke="rgba(212, 212, 216, 0.9)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <path d={shapePath} fill="none" stroke="rgba(0, 0, 0, 0.8)" strokeWidth="6" vectorEffect="non-scaling-stroke" className="mix-blend-overlay" />
        <path d={shapePath} fill="url(#shield-shine)" />
        <defs>
          <linearGradient id="shield-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="30%" stopColor="white" stopOpacity="0" />
            <stop offset="70%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  let wrapperClasses = "shrink-0 z-10 flex justify-center transition-all duration-500 ";
  let effectStyle: React.CSSProperties = { transition: 'transform 0.4s ease-out', position: 'relative', width: '100%', height: '100%' };
  
  if (is3D) {
     wrapperClasses += " drop-shadow-[-15px_15px_15px_rgba(0,0,0,0.7)] "; 
     if (isAnim) {
        wrapperClasses += " animate-sway-3d";
     } else {
        effectStyle.transform = "rotateY(-15deg) rotateX(10deg) translateZ(0)";
     }
  } else {
     wrapperClasses += " drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ";
     if (isAnim) {
        wrapperClasses += " animate-sway-2d";
     } else {
        effectStyle.transform = "translateZ(0)"; 
     }
  }

  return (
    <div className={wrapperClasses} style={{ perspective: '1000px', width: `${size}px`, height: `${size}px` }}>
       <div style={effectStyle}>
          {OverlayComponent}
          <div className={`absolute inset-0 overflow-hidden ${!isFree ? 'bg-zinc-900/80' : ''}`} style={clipStyle}>
             <img src={url} alt={`${team} Logo`} className={`absolute inset-0 w-full h-full z-10 ${!isFree ? 'object-cover scale-[1.05]' : 'object-contain drop-shadow-2xl'}`} />
          </div>
       </div>
    </div>
  );
});
TeamLogo.displayName = 'TeamLogo';

// -----------------------------------------------------------------------------
// PANTALLA PRINCIPAL
// -----------------------------------------------------------------------------

export function ScoreboardView({ state, onSaveAndReset, boardId, isPreview = false }: ScoreboardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [bId] = useState<number>(getInitialBoardId(boardId))
  const [defaultPositions] = useState(getDefaultsForBoard(getInitialBoardId(boardId)))

  const layoutChannelRef = useRef<BroadcastChannel | null>(null)

  const [lensScale, setLensScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [autoScale, setAutoScale] = useState(true)

  const [containerBaseScale, setContainerBaseScale] = useState(1)
  const [previewZoom, setPreviewZoom] = useState(0.35) 

  const [editMode, setEditMode] = useState(false)
  const [mirrorMode, setMirrorMode] = useState(true)
  const [positions, setPositions] = useState(getDefaultsForBoard(getInitialBoardId(boardId)))
  const [draggingId, setDraggingId] = useState<keyof typeof DEFAULTS_P1 | null>(null)

  const [liveLogos, setLiveLogos] = useState({ 
    homeUrl: '', 
    awayUrl: '', 
    shape: 'shield', 
    effect3D: false, 
    effectAnimated: false,
    displayMode: 'logoAndName',
    ledFont: 'impact', 
    fontWeight: '900', 
    letterSpacing: 'normal',
    homeJ1: '#ef4444', 
    homeJ2: '#2563eb', 
    awayJ1: '#ffffff', 
    awayJ2: '#000000',
    jerseyDesign: 'solid',
    goalDuration: '5',
    boardBgColor: '#050505',
    boardTextColor: '#ffffff',
    boardAccentColor: '#dc2626',
    possessionColor: '#22c55e',
    penaltiesColor: '#eab308',
    finishDigits: 'solid',
    finishNames: 'solid'
  })

  // 🛡️ REGLA: CACHÉ LOCAL (useRef) + SELLO DE TIEMPO PARA BLOQUEAR GOLES FANTASMA
  const [goalEvent, setGoalEvent] = useState<{ id: string; team: 'home' | 'away'; playerNumber: string } | undefined>(undefined);
  const [ov, setOv] = useState<OverlaysConfig>(DEFAULT_OVERLAYS)
  const [ovLayout, setOvLayout] = useState<AllLayouts>(() => loadLayouts())
  useEffect(() => {
    const load = () => setOvLayout(loadLayouts())
    load()
    window.addEventListener('storage', load)
    window.addEventListener(OVERLAY_LAYOUT_EVENT, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener(OVERLAY_LAYOUT_EVENT, load)
    }
  }, [])
  useEffect(() => {
    const load = () => setOv(loadOverlays())
    load()
    window.addEventListener('storage', load)
    window.addEventListener(OVERLAYS_EVENT, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener(OVERLAYS_EVENT, load)
    }
  }, [])

  const handledGoalId = useRef<string | undefined>(undefined);
  const goalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [goalPhase, setGoalPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const currentAnimation = state.goalAnimation;
    
    if (currentAnimation && currentAnimation.id !== handledGoalId.current) {
       handledGoalId.current = currentAnimation.id; // Marca este gol como visto solo para ESTE componente
       
       // Validación cronológica: ¿El gol ocurrió hace más de 5 segundos?
       const isStale = (Date.now() - currentAnimation.timestamp) > 5000;
       
       if (!isStale) {
         setGoalEvent(currentAnimation);
         setGoalPhase('in');
         const duration = (ov.goal.duration || 5) * 1000;
         const OUT = 520;
         goalOutTimer.current = setTimeout(() => setGoalPhase('out'), Math.max(300, duration - OUT));
         goalTimer.current = setTimeout(() => setGoalEvent(undefined), duration);
       }
    }
  }, [state.goalAnimation?.id, ov.goal.duration]);

  useEffect(() => () => {
    if (goalTimer.current) clearTimeout(goalTimer.current)
    if (goalOutTimer.current) clearTimeout(goalOutTimer.current)
  }, []);

  const dragStart = useRef({ x: 0, y: 0 })
  const elemStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (isPreview && mounted) {
      const savedZoom = localStorage.getItem(`hockey-preview-zoom-p${bId}`)
      if (savedZoom) setPreviewZoom(parseFloat(savedZoom))
    }
  }, [bId, isPreview, mounted])

  const updatePreviewZoom = (updater: number | ((prev: number) => number)) => {
    setPreviewZoom(prev => {
      const newZoom = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem(`hockey-preview-zoom-p${bId}`, newZoom.toString())
      return newZoom
    })
  }

  useEffect(() => {
    if (!mounted) setMounted(true)

    const loadLogos = () => {
      const storedLogos = localStorage.getItem('ardi-live-logos')
      if (storedLogos) {
        try {
          const parsed = JSON.parse(storedLogos)
          setLiveLogos(prev => ({ ...prev, ...parsed }))
        } catch (e) {
          console.warn("Logos corruptos en localstorage, ignorando.");
        }
      }
    }
    loadLogos()
    window.addEventListener('storage', loadLogos)
    window.addEventListener('ardi-screens-updated', loadLogos)

    const lensKey = `hockey-board-calibration-${bId}`
    const layoutKey = `hockey-custom-layout-p${bId}`

    const savedLens = localStorage.getItem(lensKey)
    if (savedLens) {
      try {
        const parsed = JSON.parse(savedLens)
        setAutoScale(parsed.autoScale ?? true)
        if (!parsed.autoScale) {
          setLensScale(parsed.scale || 1)
          setOffsetX(parsed.offsetX || 0)
          setOffsetY(parsed.offsetY || 0)
        }
      } catch (e) { }
    }

    const savedLayout = localStorage.getItem(layoutKey)
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout)
        const sanitized = { ...defaultPositions }
        for (let key in defaultPositions) {
          const k = key as keyof typeof defaultPositions
          if (parsed[k]) {
            sanitized[k] = {
              x: parsed[k].x ?? defaultPositions[k].x,
              y: parsed[k].y ?? defaultPositions[k].y,
              s: parsed[k].s ?? defaultPositions[k].s,
              v: parsed[k].v ?? defaultPositions[k].v
            }
          }
        }
        setPositions(sanitized)
      } catch (e) { }
    } else {
      setPositions(defaultPositions)
    }

    const channel = new BroadcastChannel(`hockey-layout-sync-p${bId}`)
    layoutChannelRef.current = channel

    channel.onmessage = (event) => {
      if (event.data.type === 'LAYOUT_UPDATE') {
        setPositions(event.data.positions)
      } else if (event.data.type === 'LENS_UPDATE') {
        setLensScale(event.data.lens.scale)
        setOffsetX(event.data.lens.offsetX)
        setOffsetY(event.data.lens.offsetY)
        setAutoScale(event.data.lens.autoScale)
      } else if (event.data.type === 'LAYOUT_RESET') {
        setPositions(defaultPositions)
      }
    }

    return () => {
      channel.close()
      window.removeEventListener('storage', loadLogos)
      window.removeEventListener('ardi-screens-updated', loadLogos)
    }
  }, [bId, defaultPositions, mounted])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect
        const sx = width / 1920
        const sy = height / 1080
        setContainerBaseScale(Math.min(sx, sy))
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  const saveLensCalibration = (newScale: number, newX: number, newY: number, newAuto: boolean) => {
    setLensScale(newScale)
    setOffsetX(newX)
    setOffsetY(newY)
    setAutoScale(newAuto)
    localStorage.setItem(`hockey-board-calibration-${bId}`, JSON.stringify({ scale: newScale, offsetX: newX, offsetY: newY, autoScale: newAuto }))
    layoutChannelRef.current?.postMessage({
      type: 'LENS_UPDATE',
      lens: { scale: newScale, offsetX: newX, offsetY: newY, autoScale: newAuto }
    })
  }

  let finalScale = 1
  let finalOffsetX = 0
  let finalOffsetY = 0

  if (isPreview) {
    finalScale = containerBaseScale * 0.95 * previewZoom
    finalOffsetX = 0
    finalOffsetY = 0
  } else {
    if (autoScale) {
      finalScale = containerBaseScale * 0.98
      finalOffsetX = 0
      finalOffsetY = 0
    } else {
      finalScale = lensScale
      finalOffsetX = offsetX
      finalOffsetY = offsetY
    }
  }

  const handlePointerDown = (e: React.PointerEvent, id: keyof typeof DEFAULTS_P1) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraggingId(id)
    dragStart.current = { x: e.clientX, y: e.clientY }
    elemStart.current = { x: positions[id]?.x || 0, y: positions[id]?.y || 0 }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!editMode || !draggingId) return
    e.stopPropagation()
    const dx = (e.clientX - dragStart.current.x) / finalScale
    const dy = (e.clientY - dragStart.current.y) / finalScale

    setPositions(prev => {
      const nx = elemStart.current.x + dx
      const ny = elemStart.current.y + dy
      const next = { ...prev, [draggingId]: { ...prev[draggingId], x: nx, y: ny } }

      // Modo espejo: el elemento gemelo va a la posicion simetrica respecto del
      // centro. Solo la posicion: la escala queda libre para cada uno.
      const twin = mirrorMode ? MIRROR_PAIRS[draggingId] : undefined
      const p = prev as Record<string, { x: number; y: number; s: number; v: boolean }>
      const n = next as Record<string, { x: number; y: number; s: number; v: boolean }>
      if (twin && p[twin]) {
        n[twin] = { ...p[twin], x: 2 * MIRROR_AXIS - nx, y: ny }
      }

      layoutChannelRef.current?.postMessage({ type: 'LAYOUT_UPDATE', positions: next })
      return next
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!editMode || !draggingId) return
    e.stopPropagation()
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDraggingId(null)
  }

  const handleScaleElement = (id: keyof typeof DEFAULTS_P1, delta: number) => {
    setPositions(prev => {
      const next = {
        ...prev,
        [id]: { ...prev[id], s: Math.max(0.3, Math.min(6, (prev[id]?.s || 1) + delta)) }
      }
      layoutChannelRef.current?.postMessage({ type: 'LAYOUT_UPDATE', positions: next })
      return next
    })
  }

  const toggleVisibility = (id: keyof typeof DEFAULTS_P1) => {
    setPositions(prev => {
      const next = {
        ...prev,
        [id]: { ...prev[id], v: !(prev[id]?.v ?? true) }
      }
      layoutChannelRef.current?.postMessage({ type: 'LAYOUT_UPDATE', positions: next })
      return next
    })
  }

  const saveCustomLayout = () => {
    localStorage.setItem(`hockey-custom-layout-p${bId}`, JSON.stringify(positions))
    setEditMode(false)
  }

  const resetCustomLayout = () => {
    setPositions(defaultPositions)
    localStorage.removeItem(`hockey-custom-layout-p${bId}`)
    setEditMode(false)
    updatePreviewZoom(0.35)
    layoutChannelRef.current?.postMessage({ type: 'LAYOUT_RESET' })
  }


  // ─── Pantallas de resumen ──────────────────────────────────────────────────
  // Descanso: entra a los 5 s de iniciado y se va cuando termina el entretiempo.
  // Fin: el letrero de ganador manda 10 s y después queda la ficha hasta que el
  // operador configure un partido nuevo.
  const [showBreakSummary, setShowBreakSummary] = useState(false)
  const [showFinalSummary, setShowFinalSummary] = useState(false)

  // La ficha final puede quedar proyectada un buen rato: la hora tiene que
  // seguir siendo la de ahora, no la del instante en que se dibujo.
  const [wallClock, setWallClock] = useState('')
  useEffect(() => {
    if (!showFinalSummary) return
    const tick = () => setWallClock(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const i = setInterval(tick, 20000)
    return () => clearInterval(i)
  }, [showFinalSummary])

  const statsOn = ov.stats.enabled && showsOn(ov.stats.boards, bId)
  const finalOn = ov.final.enabled && showsOn(ov.final.boards, bId)

  useEffect(() => {
    if (!state.isIntermission || !statsOn || !ov.stats.showInBreak) { setShowBreakSummary(false); return }
    const t = setTimeout(() => setShowBreakSummary(true), ov.stats.breakDelay * 1000)
    return () => clearTimeout(t)
  }, [state.isIntermission, statsOn, ov.stats.showInBreak, ov.stats.breakDelay]);

  useEffect(() => {
    if (!state.isMatchEnded || !finalOn || !ov.final.showFicha) { setShowFinalSummary(false); return }
    const t = setTimeout(() => setShowFinalSummary(true), ov.final.winnerSeconds * 1000)
    return () => clearTimeout(t)
  }, [state.isMatchEnded, finalOn, ov.final.showFicha, ov.final.winnerSeconds]);

  // A partir de aqui ya no puede declararse ningun hook: hay salida temprana.
  if (!mounted) return <div className="absolute inset-0 bg-black" />

  const isHomeGreenOn = state.homeTimeoutRequested || state.activeTimeout === 'home'
  const isAwayGreenOn = state.awayTimeoutRequested || state.activeTimeout === 'away'
  const isHomeRedOn = state.isHomeFoul10Active
  const isAwayRedOn = state.isAwayFoul10Active
  
  const homeSanctions = state.sanctions?.filter(s => s.team === 'home' && s.remainingTime > 0 && !s.isBench && s.type !== 'yellow') || []
  const awaySanctions = state.sanctions?.filter(s => s.team === 'away' && s.remainingTime > 0 && !s.isBench && s.type !== 'yellow') || []
  
  const formatSanctionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }



  const homeSkaters = (state.homeCourtIds || []).length
  const awaySkaters = (state.awayCourtIds || []).length
  const showSkaters = homeSkaters > 0 || awaySkaters > 0

  const homeTeamName = state.homeTeam?.name || defaultHomeName()
  const awayTeamName = state.awayTeam?.name || 'VISITA'
  const homeTimeoutCount = state.homeTimeoutsUsed + (state.homeTimeoutRequested ? 1 : 0)
  const awayTimeoutCount = state.awayTimeoutsUsed + (state.awayTimeoutRequested ? 1 : 0)

  const clockTitle = state.activeTimeout === 'home' ? 'TIEMPO BANCA LOCAL' : state.activeTimeout === 'away' ? 'TIEMPO BANCA VISITA' : state.isIntermission ? 'ENTRETIEMPO' : 'CRONOMETRO'
  const clockColor = state.activeTimeout ? 'text-green-500' : state.isIntermission ? 'text-blue-400' : 'text-red-600'
  const clockBorder = state.activeTimeout ? 'border-green-900/60 shadow-[0_0_80px_rgba(34,197,94,0.4)]' : state.isIntermission ? 'border-blue-900/60 shadow-[0_0_80px_rgba(96,165,250,0.4)]' : 'border-red-900/40 shadow-[0_0_60px_rgba(220,38,38,0.2)]'

  const currentFontFamily = resolveLedFont(liveLogos.ledFont)

  const digitFinish = resolveFinish((liveLogos.finishDigits || 'solid') as Finish, true)
  const nameFinish = (liveLogos.finishNames || 'solid') as Finish
  const digitFxClass = finishClass(digitFinish)
  const nameFxClass = finishClass(nameFinish)
  const digitFxOn = digitFinish !== 'solid'
  const nameFxOn = nameFinish !== 'solid'

  /**
   * Color de un elemento bajo el acabado activo.
   *
   * Con acabado NO se puede pintar el color inline: la clase `fx-*` es la que
   * dibuja (blanco con halo en neon, degradado recortado en metal) y un `color`
   * en el atributo style le gana por especificidad. Ese era exactamente el
   * motivo de que el previsualizador mostrara el efecto y el tablero no.
   * Con acabado el color viaja como variable; sin acabado, como color normal.
   */
  const numFx = (color: string, glow?: string): React.CSSProperties =>
    digitFxOn
      ? ({ ['--fx-color' as string]: color } as React.CSSProperties)
      : { color, ...(glow ? { textShadow: glow } : {}) }

  const nameFx = (color: string): React.CSSProperties =>
    nameFxOn
      ? ({ ['--fx-color' as string]: color } as React.CSSProperties)
      : { color }

  const customNumberStyle: React.CSSProperties = {
    fontFamily: currentFontFamily,
    fontWeight: liveLogos.fontWeight || '900',
    letterSpacing: liveLogos.letterSpacing || 'normal',
    ...finishStyle(liveLogos.boardAccentColor || '#dc2626', digitFinish)
  };

  const getJerseyFill = (team: 'home' | 'away', design: string) => {
    if (design === 'striped') return `url(#striped-${team})`;
    if (design === 'halved') return `url(#halved-${team})`;
    return team === 'home' ? ov.goal.homeJ1 : ov.goal.awayJ1;
  };

  return (
    <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden select-none font-sans">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sway3d {
          0% { transform: perspective(1000px) rotateY(-15deg) rotateX(10deg) scale(1) translateZ(0); }
          33% { transform: perspective(1000px) rotateY(-5deg) rotateX(15deg) scale(1.04) translateZ(0); }
          66% { transform: perspective(1000px) rotateY(-20deg) rotateX(5deg) scale(1.02) translateZ(0); }
          100% { transform: perspective(1000px) rotateY(-15deg) rotateX(10deg) scale(1) translateZ(0); }
        }
        @keyframes sway2d {
          0% { transform: scale(1) rotate(0deg) translateZ(0); }
          33% { transform: scale(1.03) rotate(3deg) translateZ(0); }
          66% { transform: scale(1.01) rotate(-2deg) translateZ(0); }
          100% { transform: scale(1) rotate(0deg) translateZ(0); }
        }
        @keyframes parallaxPan {
          0% { transform: scale(1.5) translate(-2%, -2%); }
          50% { transform: scale(1.6) translate(2%, 2%); }
          100% { transform: scale(1.5) translate(-2%, -2%); }
        }
        @keyframes goalFlash {
          0%, 100% { opacity: 1; transform: scale(1) translateY(-20px); text-shadow: 0 0 40px rgba(255,255,255,1); }
          50% { opacity: 0.9; transform: scale(1.05) translateY(-20px); text-shadow: 0 0 80px rgba(255,255,255,1); }
        }
        .animate-goal-flash { animation: goalFlash 0.6s ease-in-out infinite; }
        .animate-sway-3d { animation: sway3d 8s cubic-bezier(0.45, 0, 0.55, 1) infinite; will-change: transform; }
        .animate-sway-2d { animation: sway2d 7s cubic-bezier(0.45, 0, 0.55, 1) infinite; will-change: transform; }
        .animate-parallax-pan { animation: parallaxPan 15s ease-in-out infinite; }
      `}} />

      {isPreview && (
        <div className="absolute bottom-4 left-4 z-[200] flex bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-lg overflow-hidden shadow-2xl">
          <div className="bg-zinc-800 px-3 py-2 flex items-center border-r border-zinc-700 text-zinc-400 text-xs font-bold uppercase tracking-wider">
            LUPA VIDEOWALL P{bId}
          </div>
          <button onClick={() => updatePreviewZoom(p => Math.max(0.1, p - 0.05))} className="p-2 md:p-3 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"><Minus className="w-4 h-4 md:w-5 md:h-5" /></button>
          <div className="px-2 py-2 md:px-4 text-xs md:text-sm font-bold text-yellow-500 flex items-center bg-black min-w-[3.5rem] justify-center">
            {Math.round(previewZoom * 100)}%
          </div>
          <button onClick={() => updatePreviewZoom(p => Math.min(3, p + 0.05))} className="p-2 md:p-3 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"><Plus className="w-4 h-4 md:w-5 md:h-5" /></button>
          <button onClick={() => updatePreviewZoom(0.35)} className="p-2 md:p-3 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 border-l border-zinc-700 transition-colors" title="Restaurar a 35%"><RotateCcw className="w-4 h-4 md:w-5 md:h-5" /></button>
        </div>
      )}

      {!editMode && !state.isMatchEnded && (
        <button
          onClick={() => setShowSettings(true)}
          className={`absolute top-4 right-4 z-[100] p-3 text-zinc-400 hover:text-white bg-black/50 hover:bg-zinc-800 rounded-full transition-all border border-zinc-800 shadow-xl ${isPreview ? 'scale-75 md:scale-100 origin-top-right' : ''}`}
        >
          <Settings className="w-8 h-8" />
        </button>
      )}

      {showSettings && (
        <div className={`absolute z-[200] bg-zinc-900 border border-zinc-700 p-4 md:p-6 rounded-2xl shadow-2xl flex flex-col ${isPreview ? 'inset-2 md:inset-8' : 'top-20 right-4 w-[400px] max-h-[80vh] overflow-y-auto'}`}>
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-yellow-400 font-bold text-lg md:text-xl lg:text-2xl">Ajustes Proyección {bId}</h3>
            <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-2 rounded-full"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-800">
              <h4 className="text-white font-bold mb-2 flex items-center gap-2 md:text-lg"><Move className="w-5 h-5 md:w-6 md:h-6" /> Modo Diseño Libre</h4>
              <p className="text-zinc-400 text-xs md:text-sm mb-4">Ajusta esta proyección. Los cambios no afectarán a los otros tableros.</p>
              <button
                onClick={() => { setEditMode(true); setShowSettings(false); }}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-3 md:py-4 rounded-xl flex justify-center items-center gap-2 md:text-lg"
              >
                ACTIVAR MODO DISEÑO
              </button>
            </div>

            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-800 space-y-4">
              <h4 className="text-white font-bold flex items-center gap-2 md:text-lg">Calibrar Proyector Real</h4>
              <label className="flex items-center gap-3 cursor-pointer bg-zinc-800 p-3 rounded-lg text-white">
                <input type="checkbox" checked={autoScale} onChange={(e) => saveLensCalibration(lensScale, offsetX, offsetY, e.target.checked)} className="w-5 h-5 accent-yellow-500" />
                <span className="text-sm">Auto-Centrar en Pantalla</span>
              </label>

              {!autoScale && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <span className="text-zinc-400 font-bold block text-xs md:text-sm">Zoom</span>
                    <div className="flex gap-2">
                      <button onClick={() => saveLensCalibration(lensScale - 0.05, offsetX, offsetY, false)} className="bg-zinc-800 hover:bg-zinc-700 p-2 md:p-3 rounded-lg flex-1 flex justify-center text-white"><Minus className="w-4 h-4 md:w-5 md:h-5" /></button>
                      <span className="bg-black w-20 md:w-24 text-center py-2 md:py-3 rounded-lg border border-zinc-700 text-white font-bold md:text-lg">{lensScale.toFixed(2)}</span>
                      <button onClick={() => saveLensCalibration(lensScale + 0.05, offsetX, offsetY, false)} className="bg-zinc-800 hover:bg-zinc-700 p-2 md:p-3 rounded-lg flex-1 flex justify-center text-white"><Plus className="w-4 h-4 md:w-5 md:h-5" /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-zinc-400 font-bold block text-xs md:text-sm">Posición X/Y</span>
                    <div className="grid grid-cols-2 gap-2 md:gap-3 text-white">
                      <div className="flex bg-black rounded-lg border border-zinc-700 overflow-hidden">
                        <button onClick={() => saveLensCalibration(lensScale, offsetX - 20, offsetY, false)} className="px-2 md:px-3 bg-zinc-800 hover:bg-zinc-700">-</button>
                        <span className="flex-1 text-center py-2 text-xs md:text-sm font-bold">X: {offsetX}</span>
                        <button onClick={() => saveLensCalibration(lensScale, offsetX + 20, offsetY, false)} className="px-2 md:px-3 bg-zinc-800 hover:bg-zinc-700">+</button>
                      </div>
                      <div className="flex bg-black rounded-lg border border-zinc-700 overflow-hidden">
                        <button onClick={() => saveLensCalibration(lensScale, offsetX, offsetY - 20, false)} className="px-2 md:px-3 bg-zinc-800 hover:bg-zinc-700">-</button>
                        <span className="flex-1 text-center py-2 text-xs md:text-sm font-bold">Y: {offsetY}</span>
                        <button onClick={() => saveLensCalibration(lensScale, offsetX, offsetY + 20, false)} className="px-2 md:px-3 bg-zinc-800 hover:bg-zinc-700">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={resetCustomLayout} className="w-full bg-zinc-800 hover:bg-red-900/50 text-red-400 py-3 md:py-4 rounded-xl flex justify-center items-center gap-2 font-bold mt-2 text-sm md:text-base">
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> Restaurar Diseño P{bId}
            </button>
          </div>
        </div>
      )}

      <div
        className="shadow-[0_0_100px_rgba(0,0,0,0.8)] absolute top-1/2 left-1/2"
        style={{
          backgroundColor: liveLogos.boardBgColor || '#050505',
          width: '1920px',
          height: '1080px',
          border: '8px solid #18181b',
          borderRadius: '40px',
          transform: `translate(calc(-50% + ${finalOffsetX}px), calc(-50% + ${finalOffsetY}px)) scale(${finalScale})`,
          transformOrigin: 'center center',
          willChange: 'transform'
        }}
      >

        {/* Guias de alineacion: el eje de simetria y la linea media. Sin una
            referencia visible, "centrado" es a ojo. */}
        {editMode && (
          <>
            <div className="absolute top-0 bottom-0 z-[450] pointer-events-none"
              style={{ left: MIRROR_AXIS, width: 2, background: 'rgba(250,204,21,.55)' }} />
            <div className="absolute left-0 right-0 z-[450] pointer-events-none"
              style={{ top: 540, height: 2, background: 'rgba(250,204,21,.25)' }} />
          </>
        )}

        {editMode && (
          <div className="absolute top-[30px] left-1/2 -translate-x-1/2 z-[500] bg-yellow-500 text-black px-[40px] py-[20px] rounded-full font-black text-[35px] flex items-center gap-[40px] shadow-2xl border-4 border-yellow-300">
            <span className="flex items-center gap-4"><Move className="w-10 h-10" /> P{bId}: MODO DISEÑO</span>
            <button onClick={() => setMirrorMode(v => !v)}
              title="Mover el elemento gemelo a la posición simétrica. El tamaño queda libre."
              className={`px-[30px] py-[15px] rounded-full text-[25px] flex items-center gap-2 ${
                mirrorMode ? 'bg-black text-yellow-400' : 'bg-black/30 text-black/60'}`}>
              <FlipHorizontal className="w-8 h-8" /> ESPEJO {mirrorMode ? 'ON' : 'OFF'}
            </button>
            <button onClick={saveCustomLayout} className="bg-black text-white px-[30px] py-[15px] rounded-full hover:bg-zinc-800 text-[25px] flex items-center gap-2">
              <Save className="w-8 h-8" /> GUARDAR
            </button>
          </div>
        )}

        <Draggable 
          id="clock" 
          pos={positions['clock']} 
          editMode={editMode} 
          onPointerDown={handlePointerDown} 
          onPointerMove={handlePointerMove} 
          onPointerUp={handlePointerUp} 
          onToggleVisibility={toggleVisibility} 
          onScale={handleScaleElement} 
          className="w-[900px] p-4"
        >
          <span className={`font-bold tracking-[0.4em] mb-[15px] text-[40px] transition-colors ${state.activeTimeout ? 'text-green-500 animate-pulse' : state.isIntermission ? 'text-blue-400' : ''}`} style={{ color: (!state.activeTimeout && !state.isIntermission) ? (liveLogos.boardTextColor || '#a1a1aa') : undefined }}>
            {clockTitle}
          </span>
          <div
            className={`leading-none bg-black w-full text-center flex items-center justify-center transition-colors duration-300 ${clockBorder} ${digitFxClass}`}
            style={{ ...customNumberStyle, ...numFx(state.activeTimeout ? '#22c55e' : state.isIntermission ? '#60a5fa' : (liveLogos.boardAccentColor || '#dc2626')), fontSize: '260px', height: '280px', borderRadius: '30px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
          >
            {formatTime(state.activeTimeout ? state.timeoutClock : state.mainClock)}
          </div>
        </Draggable>

        <Draggable id="homeLogo" pos={positions['homeLogo']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[400px] p-4">
          <TeamLogo team="home" size={180} liveUrl={liveLogos.homeUrl || defaultHomeLogo() || ''} stateUrl={state.homeTeam?.logo} shape={liveLogos.shape} is3D={liveLogos.effect3D} isAnim={liveLogos.effectAnimated} />
        </Draggable>

        {liveLogos.displayMode !== 'logoOnly' && (
          <Draggable id="homeName" pos={positions['homeName']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[800px] p-4">
            <span className={`font-bold tracking-widest text-center ${nameFxClass}`} style={{ ...nameFx(liveLogos.boardTextColor || '#ffffff'), fontSize: '60px', lineHeight: '1.1', wordWrap: 'break-word', width: '100%' }}>
              {homeTeamName}
            </span>
          </Draggable>
        )}

        <Draggable id="homeScore" pos={positions['homeScore']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[450px] p-4">
          <div className={`leading-none bg-black w-full flex items-center justify-center ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.boardAccentColor || '#dc2626'), borderColor: `${liveLogos.boardAccentColor || '#dc2626'}66`, boxShadow: `0 0 60px ${liveLogos.boardAccentColor || '#dc2626'}4d`, fontSize: '320px', height: '340px', borderRadius: '40px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
            {(state.homeScore || 0).toString().padStart(2, '0')}
          </div>
        </Draggable>

        <Draggable id="period" pos={positions['period']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[300px] p-4">
          <span className="font-bold tracking-[0.2em] mb-[15px] text-[35px]" style={{ color: liveLogos.boardTextColor || '#a1a1aa' }}>PERIODO</span>
          <div className={`leading-none bg-black shadow-inner flex items-center justify-center ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.boardAccentColor || '#dc2626'), borderColor: `${liveLogos.boardAccentColor || '#dc2626'}66`, fontSize: '180px', width: '240px', height: '220px', borderRadius: '30px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
            {state.period === '1er_tiempo' ? '1' : state.period === '2do_tiempo' ? '2' : state.period === 'alargue' ? 'E' : 'P'}
          </div>
        </Draggable>

        <Draggable id="awayLogo" pos={positions['awayLogo']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[400px] p-4">
          <TeamLogo team="away" size={180} liveUrl={liveLogos.awayUrl} stateUrl={state.awayTeam?.logo} shape={liveLogos.shape} is3D={liveLogos.effect3D} isAnim={liveLogos.effectAnimated} />
        </Draggable>

        {liveLogos.displayMode !== 'logoOnly' && (
          <Draggable id="awayName" pos={positions['awayName']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[800px] p-4">
            <span className={`font-bold tracking-widest text-center ${nameFxClass}`} style={{ ...nameFx(liveLogos.boardTextColor || '#ffffff'), fontSize: '60px', lineHeight: '1.1', wordWrap: 'break-word', width: '100%' }}>
              {awayTeamName}
            </span>
          </Draggable>
        )}

        <Draggable id="awayScore" pos={positions['awayScore']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[450px] p-4">
          <div className={`leading-none bg-black w-full flex items-center justify-center ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.boardAccentColor || '#dc2626'), borderColor: `${liveLogos.boardAccentColor || '#dc2626'}66`, boxShadow: `0 0 60px ${liveLogos.boardAccentColor || '#dc2626'}4d`, fontSize: '320px', height: '340px', borderRadius: '40px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
            {(state.awayScore || 0).toString().padStart(2, '0')}
          </div>
        </Draggable>

        <Draggable id="homePossession" pos={positions['homePossession']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[350px] p-4">
          <div className="w-full bg-[#0a0a0a] border-[6px] border-zinc-900 rounded-[30px] p-[20px] shadow-2xl flex flex-col items-center pointer-events-none">
            <span className="font-bold tracking-widest mb-[5px] text-[30px]" style={{ color: liveLogos.boardTextColor || '#a1a1aa' }}>POSESION</span>
            <div className={`leading-none bg-black flex items-center justify-center w-full h-[110px] ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.possessionColor || '#22c55e', `0 0 30px ${liveLogos.possessionColor || '#22c55e'}`), borderColor: `${liveLogos.possessionColor || '#22c55e'}4d`, fontSize: '130px', borderRadius: '20px', borderWidth: '4px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
              {(state.possessionClockLeft || 0).toString().padStart(2, '0')}
            </div>
          </div>
        </Draggable>

        <Draggable id="homeLights" pos={positions['homeLights']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[300px] p-4">
          <div className="w-full bg-[#0a0a0a] border-[6px] border-zinc-900 rounded-[30px] p-[15px] shadow-2xl flex justify-around items-center pointer-events-none">
            <div className="flex flex-col items-center w-1/2">
              <div className={`rounded-full border-[6px] border-zinc-800 transition-all duration-300 w-[60px] h-[60px] ${isHomeRedOn ? 'bg-red-600 shadow-[0_0_40px_#ef4444] animate-pulse' : 'bg-red-950/40'}`} />
              <span className={`font-bold mt-[5px] text-center leading-tight text-[18px] h-[25px] ${isHomeRedOn ? 'text-red-500 animate-pulse' : 'text-transparent'}`}>10ma FALTA</span>
            </div>
            <div className="flex flex-col items-center w-1/2">
              <div className={`rounded-full border-[6px] border-zinc-800 transition-all duration-300 w-[60px] h-[60px] ${isHomeGreenOn ? 'bg-green-500 shadow-[0_0_40px_#22c55e]' : 'bg-green-950/40'}`} />
              <span className={`font-bold mt-[5px] text-center leading-tight text-[18px] h-[25px] ${isHomeGreenOn ? 'text-green-400' : 'text-zinc-600'}`}>
                {isHomeGreenOn ? `TIEMPO (${homeTimeoutCount}/2)` : 'TIEMPO'}
              </span>
            </div>
          </div>
        </Draggable>

        <Draggable id="homeFouls" pos={positions['homeFouls']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[350px] p-4">
          <span className="font-bold tracking-[0.2em] mb-[15px] text-[35px]" style={{ color: liveLogos.boardTextColor || '#a1a1aa' }}>FALTA LOCAL</span>
          <div className={`leading-none bg-black shadow-xl flex items-center justify-center w-full h-[220px] ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.boardAccentColor || '#dc2626'), borderColor: `${liveLogos.boardAccentColor || '#dc2626'}66`, fontSize: '180px', borderRadius: '30px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
            {(state.homeFouls || 0).toString().padStart(2, '0')}
          </div>
        </Draggable>

        <Draggable id="awayFouls" pos={positions['awayFouls']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[350px] p-4">
          <span className="font-bold tracking-[0.2em] mb-[15px] text-[35px]" style={{ color: liveLogos.boardTextColor || '#a1a1aa' }}>FALTA VISITA</span>
          <div className={`leading-none bg-black shadow-xl flex items-center justify-center w-full h-[220px] ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.boardAccentColor || '#dc2626'), borderColor: `${liveLogos.boardAccentColor || '#dc2626'}66`, fontSize: '180px', borderRadius: '30px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
            {(state.awayFouls || 0).toString().padStart(2, '0')}
          </div>
        </Draggable>

        <Draggable id="awayPossession" pos={positions['awayPossession']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[350px] p-4">
          <div className="w-full bg-[#0a0a0a] border-[6px] border-zinc-900 rounded-[30px] p-[20px] shadow-2xl flex flex-col items-center pointer-events-none">
            <span className="font-bold tracking-widest mb-[5px] text-[30px]" style={{ color: liveLogos.boardTextColor || '#a1a1aa' }}>POSESION</span>
            <div className={`leading-none bg-black flex items-center justify-center w-full h-[110px] ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.possessionColor || '#22c55e', `0 0 30px ${liveLogos.possessionColor || '#22c55e'}`), borderColor: `${liveLogos.possessionColor || '#22c55e'}4d`, fontSize: '130px', borderRadius: '20px', borderWidth: '4px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
              {(state.possessionClockRight || 0).toString().padStart(2, '0')}
            </div>
          </div>
        </Draggable>

        <Draggable id="awayLights" pos={positions['awayLights']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[300px] p-4">
          <div className="w-full bg-[#0a0a0a] border-[6px] border-zinc-900 rounded-[30px] p-[15px] shadow-2xl flex justify-around items-center pointer-events-none">
            <div className="flex flex-col items-center w-1/2">
              <div className={`rounded-full border-[6px] border-zinc-800 transition-all duration-300 w-[60px] h-[60px] ${isAwayRedOn ? 'bg-red-600 shadow-[0_0_40px_#ef4444] animate-pulse' : 'bg-red-950/40'}`} />
              <span className={`font-bold mt-[5px] text-center leading-tight text-[18px] h-[25px] ${isAwayRedOn ? 'text-red-500 animate-pulse' : 'text-transparent'}`}>10ma FALTA</span>
            </div>
            <div className="flex flex-col items-center w-1/2">
              <div className={`rounded-full border-[6px] border-zinc-800 transition-all duration-300 w-[60px] h-[60px] ${isAwayGreenOn ? 'bg-green-500 shadow-[0_0_40px_#22c55e]' : 'bg-green-950/40'}`} />
              <span className={`font-bold mt-[5px] text-center leading-tight text-[18px] h-[25px] ${isAwayGreenOn ? 'text-green-400' : 'text-zinc-600'}`}>
                {isAwayGreenOn ? `TIEMPO (${awayTimeoutCount}/2)` : 'TIEMPO'}
              </span>
            </div>
          </div>
        </Draggable>

        <Draggable id="homePenalties" pos={positions['homePenalties']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[350px] p-4">
          <span className="font-bold tracking-[0.2em] mb-[15px] text-[35px]" style={{ color: liveLogos.penaltiesColor || '#eab308' }}>PENALES</span>
          <div className={`leading-none bg-black flex items-center justify-center w-full h-[220px] ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.penaltiesColor || '#eab308'), borderColor: `${liveLogos.penaltiesColor || '#eab308'}66`, boxShadow: `0 0 40px ${liveLogos.penaltiesColor || '#eab308'}33`, fontSize: '180px', borderRadius: '30px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
            {(state.homePenalties || 0).toString().padStart(2, '0')}
          </div>
        </Draggable>

        <Draggable id="awayPenalties" pos={positions['awayPenalties']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[350px] p-4">
          <span className="font-bold tracking-[0.2em] mb-[15px] text-[35px]" style={{ color: liveLogos.penaltiesColor || '#eab308' }}>PENALES</span>
          <div className={`leading-none bg-black flex items-center justify-center w-full h-[220px] ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(liveLogos.penaltiesColor || '#eab308'), borderColor: `${liveLogos.penaltiesColor || '#eab308'}66`, boxShadow: `0 0 40px ${liveLogos.penaltiesColor || '#eab308'}33`, fontSize: '180px', borderRadius: '30px', borderWidth: '6px', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
            {(state.awayPenalties || 0).toString().padStart(2, '0')}
          </div>
        </Draggable>

        {/* 🛡️ REGLA WORLD SKATE: Columna Vertical (Capa Activa + Capa en Espera) LOCAL */}
        <Draggable id="homeSanctions" pos={positions['homeSanctions']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[300px] p-4">
          <div className="flex flex-col gap-[20px] items-center w-full">
            {homeSanctions.length > 0 ? (
              homeSanctions.slice(0, 2).map((s, index) => {
                const isActive = index === 0;
                return (
                  <div key={s.id} className={`flex flex-col items-center p-[15px] rounded-[20px] border-[4px] shadow-2xl w-[260px] ${isActive ? (s.type === 'blue' ? 'bg-blue-950/80 border-blue-600' : 'bg-red-950/80 border-red-600') : 'bg-zinc-900/80 border-zinc-600 opacity-60 grayscale'}`}>
                    <span className="text-white font-black text-[25px]">#{s.playerNumber}</span>
                    <div className={`${isActive ? (s.type === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-zinc-500'} ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(isActive ? (s.type === 'blue' ? '#60a5fa' : '#f87171') : '#71717a', isActive ? (s.type === 'blue' ? '0 0 20px #3b82f6' : '0 0 20px #ef4444') : 'none'), fontSize: '70px', lineHeight: '1', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
                      {formatSanctionTime(s.remainingTime)}
                    </div>
                    <span className={`font-bold text-[16px] tracking-widest ${isActive ? (s.type === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-zinc-500'}`}>
                      {isActive ? (s.type === 'blue' ? 'AZUL' : 'ROJA') : 'ESPERA'}
                    </span>
                  </div>
                )
              })
            ) : (
              editMode ? (
                <>
                  <DummySanction type="blue" customStyle={customNumberStyle} />
                  <DummySanction type="red" isWaiting={true} customStyle={customNumberStyle} />
                </>
              ) : null
            )}
          </div>
        </Draggable>

        {/* 🛡️ REGLA WORLD SKATE: Columna Vertical (Capa Activa + Capa en Espera) VISITA */}
        <Draggable id="awaySanctions" pos={positions['awaySanctions']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[300px] p-4">
          <div className="flex flex-col gap-[20px] items-center w-full">
            {awaySanctions.length > 0 ? (
              awaySanctions.slice(0, 2).map((s, index) => {
                const isActive = index === 0;
                return (
                  <div key={s.id} className={`flex flex-col items-center p-[15px] rounded-[20px] border-[4px] shadow-2xl w-[260px] ${isActive ? (s.type === 'blue' ? 'bg-blue-950/80 border-blue-600' : 'bg-red-950/80 border-red-600') : 'bg-zinc-900/80 border-zinc-600 opacity-60 grayscale'}`}>
                    <span className="text-white font-black text-[25px]">#{s.playerNumber}</span>
                    <div className={`${isActive ? (s.type === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-zinc-500'} ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(isActive ? (s.type === 'blue' ? '#60a5fa' : '#f87171') : '#71717a', isActive ? (s.type === 'blue' ? '0 0 20px #3b82f6' : '0 0 20px #ef4444') : 'none'), fontSize: '70px', lineHeight: '1', transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>
                      {formatSanctionTime(s.remainingTime)}
                    </div>
                    <span className={`font-bold text-[16px] tracking-widest ${isActive ? (s.type === 'blue' ? 'text-blue-400' : 'text-red-400') : 'text-zinc-500'}`}>
                      {isActive ? (s.type === 'blue' ? 'AZUL' : 'ROJA') : 'ESPERA'}
                    </span>
                  </div>
                )
              })
            ) : (
              editMode ? (
                <>
                  <DummySanction type="red" customStyle={customNumberStyle} />
                  <DummySanction type="blue" isWaiting={true} customStyle={customNumberStyle} />
                </>
              ) : null
            )}
          </div>
        </Draggable>

        <Draggable id="skaters" pos={positions['skaters']} editMode={editMode} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onToggleVisibility={toggleVisibility} onScale={handleScaleElement} className="w-[520px] p-4">
          {(showSkaters || editMode) && (
            <>
              <span className="font-bold tracking-[0.2em] mb-[10px] text-[30px]" style={{ color: liveLogos.boardTextColor || '#a1a1aa' }}>PATINADORES</span>
              <div className="flex items-center justify-center gap-[30px] bg-black border-[5px] rounded-[25px] px-[40px] py-[10px]" style={{ borderColor: `${liveLogos.boardAccentColor || '#dc2626'}55` }}>
                <span className={`leading-none ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(homeSkaters > awaySkaters ? '#22c55e' : (liveLogos.boardTextColor || '#ffffff')), fontSize: '110px' }}>
                  {homeSkaters}
                </span>
                <span className="text-zinc-600 font-black text-[50px]">vs</span>
                <span className={`leading-none ${digitFxClass}`} style={{ ...customNumberStyle, ...numFx(awaySkaters > homeSkaters ? '#22c55e' : (liveLogos.boardTextColor || '#ffffff')), fontSize: '110px' }}>
                  {awaySkaters}
                </span>
              </div>
            </>
          )}
        </Draggable>

      </div>

      {/*
        LOS TRES LANZADORES VIVEN FUERA DE LA CAJA DEL TABLERO, A PROPÓSITO.
        =====================================================================
        El div del tablero de arriba tiene su propio `transform: translate()
        scale()` para encajar el lienzo de 1920x1080 en la ventana real. Un
        `transform` en un ancestro crea, para cualquier descendiente
        `position:fixed`, un nuevo "containing block" — deja de anclarse
        contra el viewport real y pasa a anclarse (y a escalarse visualmente)
        contra ESE ancestro transformado.

        `overlay-fullscreen` (la clase que usan estos tres cuando NO están
        embebidos en una previsualización) es `position:fixed`. Mientras
        vivieron DENTRO del div del tablero, quedaban atrapados por ese
        containing block: en vez de cubrir la pantalla completa, se
        encogían con el mismo factor de escala que reduce el tablero para
        caber en la ventana — por eso se veían como una isla chica flotando
        en medio de una pantalla negra, con el fondo de lo que hubiera debajo
        asomando por los bordes.

        Al vivir aquí, como hermanos del div del tablero (ambos dentro del
        mismo contenedor exterior, que no tiene transform), su `position:
        fixed` encuentra el viewport real y punto: cubren la pantalla
        completa como corresponde.
      */}

      {/* 🛡️ CAPA MAGICA DE ANIMACIÓN DE GOL (PANTALLA COMPLETA 100%) */}
      {/* Solo se proyecta en el marcador Global (P1), dejando los cronómetros P2 y P3 limpios */}
      {goalEvent && !editMode && ov.goal.enabled && showsOn(ov.goal.boards, bId) && (
        <GoalOverlay
          embedded={isPreview}
          goal={goalEvent}
          layout={ovLayout.goal}
          cfg={ov.goal}
          phase={goalPhase}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homeScore={state.homeScore}
          awayScore={state.awayScore}
          homeLogo={liveLogos.homeUrl || state.homeTeam?.logo || ''}
          awayLogo={liveLogos.awayUrl || state.awayTeam?.logo || ''}
          fontFamily={currentFontFamily}
        />
      )}

      {!editMode && (showBreakSummary || showFinalSummary) && (
        <SummaryOverlay
          embedded={isPreview}
          state={state}
          scope={showFinalSummary ? 'completo' : 'primer_tiempo'}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homeLogo={liveLogos.homeUrl || state.homeTeam?.logo}
          awayLogo={liveLogos.awayUrl || state.awayTeam?.logo}
          accent={liveLogos.boardAccentColor || '#dc2626'}
          textColor={liveLogos.boardTextColor || '#ffffff'}
          numberStyle={{ ...customNumberStyle, border: 'none', background: 'transparent', boxShadow: 'none' }}
          numberClass={digitFxClass}
          nameClass={nameFxClass}
          clockLabel={showFinalSummary ? 'HORA' : 'DESCANSO'}
          clockValue={showFinalSummary ? wallClock : formatTime(state.mainClock)}
          sections={ov.stats}
          layout={ovLayout.stats}
          scale={ov.stats.scale}
          align={ov.stats.align}
        />
      )}

      {state.isMatchEnded && !editMode && !showFinalSummary && finalOn && (
        <WinnerOverlay
          embedded={isPreview}
          state={state}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          homeLogo={liveLogos.homeUrl || defaultHomeLogo() || state.homeTeam?.logo}
          awayLogo={liveLogos.awayUrl || state.awayTeam?.logo}
          accent={liveLogos.boardAccentColor || '#dc2626'}
          textColor={liveLogos.boardTextColor || '#ffffff'}
          winColor={liveLogos.possessionColor || '#22c55e'}
          numberStyle={{ ...customNumberStyle, border: 'none', background: 'transparent', boxShadow: 'none' }}
          numberClass={digitFxClass}
          nameClass={nameFxClass}
          winnerText={ov.final.winnerText}
          drawText={ov.final.drawText}
          layout={ovLayout.final}
          scale={ov.final.scale}
          align={ov.final.align}
          onSaveAndReset={!isPreview ? onSaveAndReset : undefined}
        />
      )}
    </div>
  )
}