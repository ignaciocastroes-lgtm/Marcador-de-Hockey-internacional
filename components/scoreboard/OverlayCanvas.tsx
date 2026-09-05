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
 *
 * POSICIÓN VERTICAL — POR QUÉ "ARRIBA"/"ABAJO" HACÍAN DESAPARECER TODO:
 * el lienzo mide 1920x1080 completos (su tamaño de LAYOUT no cambia, sólo se
 * lo escala visualmente con `transform: scale()`), y `transform-origin` por
 * defecto es el CENTRO del elemento. Alinearlo arriba con flexbox posiciona
 * su borde superior en y=0 del contenedor, pero la escala sigue pivotando
 * desde su propio centro — que en coordenadas sin escalar está en y=540,
 * muy por debajo de una caja de previsualización típica de ~200px de alto.
 * El contenido, ya reducido, terminaba empujado fuera del área visible y
 * recortado por completo por el `overflow-hidden`. Con CENTRO coincidía por
 * casualidad el pivote de la escala con el centrado de flexbox, por eso era
 * la única opción que se veía.
 *
 * La solución es no depender de flexbox para esto: se posiciona con
 * coordenadas absolutas y el `transform-origin` se ancla al MISMO borde que
 * la alineación, así la escala siempre reduce hacia el lado correcto.
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

  const posStyle: React.CSSProperties =
    align === 'top'
      ? { top: 0, left: '50%', transform: `translateX(-50%) scale(${s})`, transformOrigin: 'top center' }
      : align === 'bottom'
      ? { bottom: 0, left: '50%', transform: `translateX(-50%) scale(${s})`, transformOrigin: 'bottom center' }
      : { top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${s})`, transformOrigin: 'center center' }

  return (
    <div ref={box} className={`absolute inset-0 overflow-hidden ${className}`}>
      {scale > 0 && (
        <div className="absolute shrink-0"
          style={{ width: CANVAS_W, height: CANVAS_H, ...posStyle }}>
          {children(s)}
        </div>
      )}
    </div>
  )
}
