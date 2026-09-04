"use client"

import { useRef } from 'react'
import { Eye, EyeOff, Minus, Plus } from 'lucide-react'
import type { ElementPos } from '@/lib/overlay-layout'

/**
 * Elemento arrastrable de un lanzador.
 *
 * Vive sobre el lienzo de 1920x1080, igual que los del tablero. La caja que lo
 * contiene puede estar escalada —la previsualizacion lo esta— asi que el
 * desplazamiento del puntero se divide por esa escala: sin eso, el elemento
 * se mueve mas rapido que el dedo dentro de una previsualizacion chica.
 *
 * EL BLINDAJE CONTRA SCROLL ES EL MISMO QUE YA USA EL EDITOR DE PANTALLAS EN
 * `scoreboard-view.tsx` (el que "funciona perfecto"), porque faltaba aquí:
 *
 *  - `touchAction: 'none'` — sin esto, el navegador interpreta el gesto de
 *    arrastre como un intento de hacer scroll (la previsualización vive
 *    dentro de un modal con `overflow-y-auto`), y la página "salta" en vez
 *    de mover el elemento.
 *  - `e.stopPropagation()` en down/move/up — sin esto, el gesto se le
 *    escapa al contenedor scrolleable del modal aunque `touchAction` ya lo
 *    frene a nivel del navegador; algunos dispositivos igual dejan pasar el
 *    evento hacia arriba.
 *  - Captura de puntero sobre `e.currentTarget` (el propio elemento
 *    arrastrable), no sobre `e.target` (que puede ser un hijo interno, como
 *    un escudo o un número): con `e.target` la captura y el arrastre podían
 *    terminar mirando cosas distintas, y ahí es donde el modo edición se
 *    sentía como una maqueta — el mouse se movía, el elemento no.
 */

interface Props {
  id: string
  pos: ElementPos
  editMode: boolean
  /** Escala a la que se dibuja el lienzo dentro de su caja. */
  canvasScale: number
  onChange: (id: string, pos: ElementPos) => void
  className?: string
  children: React.ReactNode
}

export function OverlayDraggable({
  id, pos, editMode, canvasScale, onChange, className = '', children
}: Props) {
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  if (!pos) return null
  if (!pos.v && !editMode) return null

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editMode) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editMode || !drag.current) return
    e.stopPropagation()
    const k = canvasScale || 1
    onChange(id, {
      ...pos,
      x: Math.round(drag.current.ox + (e.clientX - drag.current.px) / k),
      y: Math.round(drag.current.oy + (e.clientY - drag.current.py) / k)
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    e.stopPropagation()
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    drag.current = null
  }

  return (
    <div
      className={`absolute ${className} ${editMode ? 'cursor-move' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        transform: `translate(-50%, -50%) scale(${pos.s})`,
        opacity: pos.v ? 1 : 0.25,
        outline: editMode ? '2px dashed rgba(255,255,255,.35)' : undefined,
        outlineOffset: editMode ? '10px' : undefined,
        touchAction: 'none',
        willChange: editMode ? 'transform' : undefined
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}

      {editMode && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/90 border border-white/25 rounded-lg px-1 py-0.5 z-50"
          onPointerDown={e => e.stopPropagation()}>
          <button onClick={() => onChange(id, { ...pos, s: Math.max(0.3, +(pos.s - 0.1).toFixed(2)) })}
            className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/15 rounded" title="Reducir">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-white/70 w-9 text-center">{Math.round(pos.s * 100)}%</span>
          <button onClick={() => onChange(id, { ...pos, s: Math.min(3, +(pos.s + 0.1).toFixed(2)) })}
            className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/15 rounded" title="Agrandar">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-white/20" />
          <button onClick={() => onChange(id, { ...pos, v: !pos.v })}
            className="w-6 h-6 flex items-center justify-center text-white hover:bg-white/15 rounded"
            title={pos.v ? 'Ocultar' : 'Mostrar'}>
            {pos.v ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 opacity-50" />}
          </button>
        </div>
      )}
    </div>
  )
}
