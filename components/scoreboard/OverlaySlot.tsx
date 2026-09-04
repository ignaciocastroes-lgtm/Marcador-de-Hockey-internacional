"use client"

import { OverlayDraggable } from '@/components/scoreboard/OverlayDraggable'
import type { LayoutMap, ElementPos } from '@/lib/overlay-layout'

/**
 * CAPA ARRASTRABLE DE UN LANZADOR — DEFINIDA UNA SOLA VEZ
 *
 * Los tres lanzadores declaraban su propio ayudante `D` DENTRO del cuerpo del
 * componente. Eso crea un tipo de componente nuevo en cada render, y React no
 * puede saber que es el mismo: desmonta todo y lo vuelve a montar.
 *
 * En el resumen del descanso el reloj cambia cada segundo, así que el resumen
 * se remontaba una vez por segundo y volvía a reproducir su animación de
 * entrada. Eso es lo que se veía como "se corta y vuelve".
 *
 * Al vivir en el ámbito del módulo, el tipo es estable: el contenido se
 * actualiza y la animación se reproduce una sola vez, al entrar.
 */

export interface SlotCtx {
  layout: LayoutMap
  editMode: boolean
  /** Escala del lienzo, leída en el render del canvas. */
  scaleRef: { current: number }
  onLayoutChange?: (id: string, pos: ElementPos) => void
}

export function Slot({ ctx, id, className, children }: {
  ctx: SlotCtx
  id: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <OverlayDraggable
      id={id}
      pos={ctx.layout[id]}
      editMode={ctx.editMode}
      canvasScale={ctx.scaleRef.current}
      onChange={(k, v) => ctx.onLayoutChange?.(k, v)}
      className={className}
    >
      {children}
    </OverlayDraggable>
  )
}
