"use client"

import { useRef } from 'react'

import type { GoalOverlayConfig, LayoutConfig } from '@/lib/overlay-config'
import { Slot, type SlotCtx } from '@/components/scoreboard/OverlaySlot'
import { OverlayCanvas } from '@/components/scoreboard/OverlayCanvas'
import { CANVAS_W, CANVAS_H, DEFAULT_LAYOUT, type LayoutMap, type ElementPos } from '@/lib/overlay-layout'

/**
 * ANIMACION DE GOL
 *
 * Vivia como 84 lineas dentro de scoreboard-view, tomando una decena de valores
 * del ambito del archivo. Extraerla no cambia nada de lo que se ve: es el paso
 * previo para poder previsualizarla dentro de un modal y, mas adelante, editar
 * la posicion de sus elementos.
 *
 * `embedded` es la clave de ese paso: en proyeccion el overlay se ancla al
 * viewport (position fixed); dentro de una previsualizacion tiene que quedarse
 * DENTRO de su caja, o se escapa y cubre la pantalla completa.
 */

/** Escudos genericos, identicos a los del tablero. */
const GENERIC_SHIELDS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E"
]

export interface GoalEvent { id: string; team: 'home' | 'away'; playerNumber: string }

interface Props {
  goal: GoalEvent
  cfg: GoalOverlayConfig & LayoutConfig
  phase: 'in' | 'out'
  homeTeamName: string
  awayTeamName: string
  homeScore: number
  awayScore: number
  homeLogo: string
  awayLogo: string
  fontFamily: string
  /** true = vive dentro de una caja (previsualizacion) en vez del viewport. */
  embedded?: boolean
  /** Posiciones de los elementos sobre el lienzo de 1920x1080. */
  layout?: LayoutMap
  editMode?: boolean
  canvasScale?: number
  onLayoutChange?: (id: string, pos: ElementPos) => void
}

export function GoalOverlay({
  goal, cfg, phase, homeTeamName, awayTeamName,
  homeScore, awayScore, homeLogo, awayLogo, fontFamily, embedded = false,
  layout = DEFAULT_LAYOUT.goal, editMode = false, canvasScale = 1, onLayoutChange
}: Props) {
  const scaleRef = useRef(1)
  /* El contexto es un dato, no un tipo de componente: cambiar de contexto
     re-renderiza, pero no desmonta ni reinicia la animacion de entrada. */
  const slotCtx: SlotCtx = { layout, editMode, scaleRef, onLayoutChange }
  const getJerseyFill = (team: 'home' | 'away', design: string) => {
    if (design === 'striped') return `url(#striped-${team})`
    if (design === 'halved') return `url(#halved-${team})`
    return team === 'home' ? cfg.homeJ1 : cfg.awayJ1
  }

  return (
    <div
      style={{
        alignItems: 'center',
        justifyContent: cfg.align === 'top' ? 'flex-start' : cfg.align === 'bottom' ? 'flex-end' : 'center'
      }}
      className={`${embedded ? 'absolute inset-0' : 'overlay-fullscreen'} z-[3000] flex flex-col items-center bg-black overflow-hidden ${phase === 'out' ? 'bc-out' : 'bc-in'}`}>
      <OverlayCanvas>{(k) => { scaleRef.current = k; return (<>
             
             {/* BACKGROUND PARALLAX SHIELD WATERMARK */}
             {cfg.showWatermark && <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20 animate-parallax-pan pointer-events-none mix-blend-screen">
                <img src={goal.team === 'home' ? (homeLogo || '' || GENERIC_SHIELDS[0]) : (awayLogo || '' || GENERIC_SHIELDS[1])} className="w-[120%] h-[120%] object-contain blur-[8px]" alt="Watermark" />
             </div>}

             {/* Glow Radial del Equipo */}
             {cfg.useTeamColor && <div className="absolute inset-0 z-0 opacity-60" style={{ background: `radial-gradient(circle at center, ${goal.team === 'home' ? cfg.homeJ1 : cfg.awayJ1} 0%, transparent 80%)` }} />}
             
             {/* Texto GOL */}
             <Slot ctx={slotCtx} id="text">
             <div className={`text-[300px] font-black tracking-widest z-10 animate-goal-flash drop-shadow-[0_0_80px_rgba(255,255,255,0.6)] leading-none mt-[-40px] ${phase === 'out' ? 'bc-content-out' : 'bc-content-in'}`} style={{ fontFamily: fontFamily, color: cfg.textColor }}>
               {cfg.text}
             </div>
             </Slot>
             
             {/* MARCADOR ACTUAL (Píldora Flotante) */}
             <Slot ctx={slotCtx} id="score">
             <div className="flex items-center gap-[40px] z-10 bg-black/60 px-[60px] py-[20px] rounded-full border-4 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
                <span className="text-[70px] font-bold text-white uppercase tracking-widest" style={{ fontFamily: fontFamily }}>{homeTeamName}</span>
                <div className="text-[100px] font-black text-yellow-400" style={{ fontFamily: fontFamily }}>{homeScore}</div>
                <span className="text-[60px] font-black text-zinc-500">-</span>
                <div className="text-[100px] font-black text-yellow-400" style={{ fontFamily: fontFamily }}>{awayScore}</div>
                <span className="text-[70px] font-bold text-white uppercase tracking-widest" style={{ fontFamily: fontFamily }}>{awayTeamName}</span>
             </div>
             </Slot>

             <div className="flex flex-row items-center justify-center gap-[200px] w-full z-10">
                {/* ESCUDO DEL EQUIPO GIGANTE (LIMPIO, SIN FONDO NEGRO) */}
                <div className="animate-in slide-in-from-left-[100px] duration-700 w-[450px] h-[450px] flex items-center justify-center">
                   <img src={goal.team === 'home' ? (homeLogo || '' || GENERIC_SHIELDS[0]) : (awayLogo || '' || GENERIC_SHIELDS[1])} alt="Crest" className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" />
                </div>

                {/* CAMISETA DEPORTIVA SVG REALISTA */}
                <div className="relative w-[450px] h-[450px] flex items-center justify-center animate-sway-3d animate-in slide-in-from-right-[100px] duration-700">
                  <svg viewBox="0 0 512 512" className="absolute inset-0 w-full h-full drop-shadow-[0_40px_50px_rgba(0,0,0,0.9)]">
                    <defs>
                      <pattern id="striped-home" width="60" height="60" patternUnits="userSpaceOnUse">
                        <rect width="30" height="60" fill={cfg.homeJ1} />
                        <rect x="30" width="30" height="60" fill={cfg.homeJ2} />
                      </pattern>
                      <linearGradient id="halved-home" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="50%" stopColor={cfg.homeJ1} />
                        <stop offset="50%" stopColor={cfg.homeJ2} />
                      </linearGradient>
                      
                      <pattern id="striped-away" width="60" height="60" patternUnits="userSpaceOnUse">
                        <rect width="30" height="60" fill={cfg.awayJ1} />
                        <rect x="30" width="30" height="60" fill={cfg.awayJ2} />
                      </pattern>
                      <linearGradient id="halved-away" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="50%" stopColor={cfg.awayJ1} />
                        <stop offset="50%" stopColor={cfg.awayJ2} />
                      </linearGradient>
                    </defs>

                    {/* Cuerpo y Mangas */}
                    <path 
                      d="M375,76.5c-20-13-50-20-80-20c-13,0-26,5-39,15c-13-10-26-15-39-15c-30,0-60,7-80,20c-40,26-80,86-105,124 c-7,10,0,25,12,30l45,18c12,5,25-2,30-14l12-32v240c0,15,15,25,30,20c30-10,70-15,105-15s75,5,105,15c15,5,30-5,30-20v-240l12,32 c5,12,18,19,30,14l45-18c12-5,19-20,12-30C455,162.5,415,102.5,375,76.5z" 
                      fill={getJerseyFill(goal.team, cfg.jerseyDesign || 'solid')}
                    />
                    {/* Borde exterior */}
                    <path 
                      d="M375,76.5c-20-13-50-20-80-20c-13,0-26,5-39,15c-13-10-26-15-39-15c-30,0-60,7-80,20c-40,26-80,86-105,124 c-7,10,0,25,12,30l45,18c12,5,25-2,30-14l12-32v240c0,15,15,25,30,20c30-10,70-15,105-15s75,5,105,15c15,5,30-5,30-20v-240l12,32 c5,12,18,19,30,14l45-18c12-5,19-20,12-30C455,162.5,415,102.5,375,76.5z" 
                      stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none"
                    />
                    {/* Pliegues (Sombras) */}
                    <path d="M165,115c0,0,20,150-10,320" stroke="rgba(0,0,0,0.25)" strokeWidth="15" fill="none" strokeLinecap="round" />
                    <path d="M347,115c0,0-20,150,10,320" stroke="rgba(0,0,0,0.25)" strokeWidth="15" fill="none" strokeLinecap="round" />
                    {/* Brillos */}
                    <path d="M256,120c0,0,10,120,0,320" stroke="rgba(255,255,255,0.15)" strokeWidth="20" fill="none" strokeLinecap="round" />
                    <path d="M110,140c10,40,15,80,0,120" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" strokeLinecap="round" />
                    <path d="M402,140c-10,40-15,80,0,120" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" strokeLinecap="round" />
                    {/* Cuello en V */}
                    <path d="M217,71.5 l39,60 l39,-60 c-15,10 -30,15 -39,15 c-9,0 -24,-5 -39,-15 z" fill={goal.team === 'home' ? cfg.homeJ2 : cfg.awayJ2} />
                    {/* Puños */}
                    <path d="M35,218.5 l45,18 l10,-26 l-45,-18 z" fill={goal.team === 'home' ? cfg.homeJ2 : cfg.awayJ2} />
                    <path d="M477,218.5 l-45,18 l-10,-26 l45,-18 z" fill={goal.team === 'home' ? cfg.homeJ2 : cfg.awayJ2} />
                  </svg>

                  {/* NÚMERO DEL JUGADOR */}
                  <span className="relative z-10 font-black pt-[60px] tracking-tighter" style={{ fontSize: goal.playerNumber.length > 3 ? '100px' : '180px', color: goal.team === 'home' ? cfg.homeJ2 : cfg.awayJ2, fontFamily: fontFamily, WebkitTextStroke: '6px rgba(255,255,255,0.9)', textShadow: '0 15px 30px rgba(0,0,0,0.6)' }}>
                    {goal.playerNumber && goal.playerNumber !== 'EQUIPO' ? goal.playerNumber : ''}
                  </span>
                </div>
             </div>
      </>) }}</OverlayCanvas>
    </div>
  )
}
