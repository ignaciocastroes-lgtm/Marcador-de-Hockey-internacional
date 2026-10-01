"use client"

import { useRef } from 'react'
import type { GameState } from '@/hooks/use-game-state'
import { calcularFigura, type Figura } from '@/lib/figura'
import { Slot, type SlotCtx } from '@/components/scoreboard/OverlaySlot'
import { OverlayCanvas } from '@/components/scoreboard/OverlayCanvas'
import { DEFAULT_LAYOUT, type LayoutMap, type ElementPos } from '@/lib/overlay-layout'

/**
 * FIGURA DEL PARTIDO
 *
 * Aparece sola, seis segundos después del ganador. La mesa no elige: la calcula
 * `lib/figura.ts` con el registro del partido. Una sola, de cualquiera de los
 * dos equipos.
 *
 * Sólo DORSAL, nunca el nombre: esta pantalla puede terminar en una
 * transmisión o en la web del club, y el dorsal ya identifica en la cancha sin
 * exponer a una niña con nombre y apellido.
 *
 * Las medidas van en PÍXELES DEL LIENZO de 1920x1080, no en `vh`: `vh` depende
 * de la ventana del navegador, así que la previsualización y el proyector
 * mostraban tamaños distintos.
 */

interface Props {
  state: GameState
  homeTeamName: string
  awayTeamName: string
  homeLogo?: string | null
  awayLogo?: string | null
  accent: string
  textColor: string
  numberStyle?: React.CSSProperties
  numberClass?: string
  /** Si se pasa, se muestra esta en vez de calcularla (la previsualización). */
  figura?: Figura | null
  titulo?: string
  marcaUrl?: string
  scale?: number
  align?: 'top' | 'center' | 'bottom'
  embedded?: boolean
  layout?: LayoutMap
  editMode?: boolean
  onLayoutChange?: (id: string, pos: ElementPos) => void
}

export function FiguraOverlay({
  state, homeTeamName, awayTeamName, homeLogo, awayLogo,
  accent, textColor, numberStyle = {}, numberClass = '',
  figura: figuraDada, titulo = 'FIGURA DEL PARTIDO', marcaUrl = '',
  scale = 1, align = 'center', embedded = false,
  layout = DEFAULT_LAYOUT.figura, editMode = false, onLayoutChange
}: Props) {
  const scaleRef = useRef(1)
  const slotCtx: SlotCtx = { layout, editMode, scaleRef, onLayoutChange }

  const f = figuraDada !== undefined ? figuraDada : calcularFigura(state)
  if (!f) return null

  const esLocal = f.team === 'home'
  const equipo = esLocal ? homeTeamName : awayTeamName
  const escudo = esLocal ? homeLogo : awayLogo

  return (
    <div className={`${embedded ? 'absolute inset-0' : 'overlay-fullscreen'} z-[2950] bc-in bg-black overflow-hidden`}>
      <OverlayCanvas zoom={scale} align={align}>{(k) => { scaleRef.current = k; return (<>

        {/* Resplandor de fondo, con el color de acento del tablero. */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 42%, ${accent}40 0%, transparent 62%)` }} />

        <Slot ctx={slotCtx} id="titulo" className="flex flex-col items-center gap-[10px] bc-content-in">
          <span className="font-black tracking-[0.42em] leading-none whitespace-nowrap"
            style={{ color: accent, fontSize: '46px' }}>
            {titulo}
          </span>
          <span className="font-bold tracking-[0.18em] leading-none whitespace-nowrap"
            style={{ color: textColor, opacity: 0.55, fontSize: '26px' }}>
            {equipo.toUpperCase()}
          </span>
        </Slot>

        {escudo && (
          <Slot ctx={slotCtx} id="escudo" className="bc-content-in">
            <img src={escudo} alt="" draggable={false}
              className="w-[260px] h-[260px] object-contain pointer-events-none"
              style={{ filter: `drop-shadow(0 0 40px ${accent}66)` }}
              onError={e => { e.currentTarget.style.display = 'none' }} />
          </Slot>
        )}

        {/* El dorsal es el protagonista: se lee desde la última fila. */}
        <Slot ctx={slotCtx} id="dorsal" className="flex flex-col items-center bc-content-in">
          <span className={`font-black leading-none tabular-nums ${numberClass}`}
            style={{ ...numberStyle, color: textColor, fontSize: '340px',
              textShadow: `0 0 60px ${accent}88`, border: 'none', background: 'transparent' }}>
            #{f.dorsal}
          </span>
          {f.esPortera && (
            <span className="font-black tracking-[0.3em] leading-none mt-[12px]"
              style={{ color: accent, fontSize: '30px' }}>
              PORTERA
            </span>
          )}
        </Slot>

        <Slot ctx={slotCtx} id="motivo" className="flex items-center justify-center bc-content-in">
          <span className="font-bold tracking-[0.12em] leading-none whitespace-nowrap"
            style={{ color: textColor, opacity: 0.8, fontSize: '42px' }}>
            {f.motivo}
          </span>
        </Slot>

        {/* MARCA — logo propio de este lanzador, por enlace externo. */}
        {marcaUrl && (
          <Slot ctx={slotCtx} id="marca">
            <img src={marcaUrl} alt="" draggable={false}
              className="max-w-[420px] max-h-[240px] object-contain pointer-events-none select-none"
              onError={e => { e.currentTarget.style.display = 'none' }} />
          </Slot>
        )}
      </>) }}</OverlayCanvas>
    </div>
  )
}
