"use client"

import { useEffect, useRef, useState } from 'react'
import { CANVAS_W, CANVAS_H } from '@/lib/overlay-layout'

/**
 * LIENZO DE 1920x1080 QUE SE MIDE SOLO
 *
 * Antes la escala se calculaba de dos maneras y las dos fallaban:
 *  - En proyeccion con CSS: `scale(min(calc(100vw/1920), ...))`. Eso devuelve una
 *    LONGITUD, no un numero, asi que scale() lo descarta y el lanzador no se veia.
 *  - En previsualizacion el modal escalaba su contenedor Y el lanzador volvia a
 *    escalar por dentro: el contenido quedaba diminuto.
 *
 * Aqui el lienzo mide su propia caja y calcula la escala una sola vez. Sirve
 * igual en el proyector y dentro del modal, y expone la escala a los hijos para
 * que el arrastre convierta bien el movimiento del puntero.
 */

interface Props {
  children: (canvasScale: number) => React.ReactNode
  className?: string
  /** Multiplicador adicional del usuario (control de Tamaño). */
  zoom?: number
  /** Posición vertical del lienzo dentro de su caja (control de Posición vertical). */
  align?: 'top' | 'center' | 'bottom'
}

export function OverlayCanvas({ children, className = '', zoom = 1, align = 'center' }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (!width || !height) return
      setScale(Math.min(width / CANVAS_W, height / CANVAS_H))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  const s = scale * zoom
  /* `items-center` vivía escrito a mano en el string base: agregar una clase
     de alineación por fuera no la podía ganar (misma especificidad, orden de
     cascada impredecible), así que "Posición vertical" no movía nada. Ahora
     la alineación se calcula una sola vez y reemplaza al valor fijo. */
  const alignClass = align === 'top' ? 'items-start' : align === 'bottom' ? 'items-end' : 'items-center'

  return (
    <div ref={box} className={`absolute inset-0 flex justify-center overflow-hidden ${alignClass} ${className}`}>
      {scale > 0 && (
        <div className="relative shrink-0"
          style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${s})` }}>
          {children(s)}
        </div>
      )}
    </div>
  )
}
