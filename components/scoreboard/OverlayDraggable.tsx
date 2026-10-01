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

  /**
   * LA CAUSA POR LA QUE EL ZOOM DE LAS CAPAS NO HACIA NADA.
   * ======================================================
   * Los lanzadores marcan sus capas con `bc-content-in` (o `bc-content-out`),
   * la animacion de entrada. Esa animacion declara `animation-fill-mode: both`
   * y anima `transform`.
   *
   * Y en CSS **una animacion pisa el estilo en linea**. Asi que el
   * `transform: translate(-50%,-50%) scale(s)` que este componente escribia
   * aqui no llegaba a aplicarse nunca: el navegador dejaba la matriz de la
   * animacion. Comprobado en el navegador — el atributo decia `scale(1.1)` y
   * el transform calculado era `matrix(1, 0, 0, 1, 0, 0)`, la identidad.
   *
   * Por eso se pulsaba + y el numero subia a 110% pero el elemento no crecia
   * ni un pixel: el valor se guardaba bien y el dibujo lo ignoraba. De paso se
   * perdia tambien el centrado del `translate(-50%,-50%)`.
   *
   * La animacion se muda a un envoltorio interior: sigue entrando igual en la
   * proyeccion, y la capa exterior recupera el mando sobre posicion y escala.
   */
  const clasesAnim = (className.match(/bc-content-(in|out)/g) || []).join(' ')
  const clasesResto = className.replace(/bc-content-(in|out)/g, '').trim()

  return (
    <div
      className={`absolute group ${clasesResto} ${editMode ? 'cursor-move' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        transform: `translate(-50%, -50%) scale(${pos.s})`,
        // Apagada se ve APAGADA. Antes quedaba al 25%, que sobre un lienzo
        // oscuro y reducido casi no se distingue del 100%: se pulsaba el ojo y
        // parecia no pasar nada. Ahora baja mas y se marca en rojo punteado.
        opacity: pos.v ? 1 : (editMode ? 0.12 : 0),
        outline: editMode
          ? (pos.v ? '2px dashed rgba(255,255,255,.35)' : '2px dashed rgba(239,68,68,.9)')
          : undefined,
        outlineOffset: editMode ? '10px' : undefined,
        touchAction: 'none',
        willChange: editMode ? 'transform' : undefined
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {clasesAnim ? <div className={clasesAnim}>{children}</div> : children}

      {editMode && (
        /*
          EL LIENZO ES PARA ARRASTRAR. LOS AJUSTES VIVEN EN "CAPAS".
          =========================================================
          Aqui habia una barra flotante con -, %, + y el ojo sobre cada capa.
          No funcionaba, y no por un descuido sino por el diseño mismo de los
          lanzadores: en GOL las capas se superponen a proposito —el escudo de
          fondo ocupa el lienzo entero, la camiseta y el escudo van pegados— asi
          que las barras se tapaban unas a otras y el clic se lo llevaba la
          vecina. Comprobado en el navegador: en GOL respondia UNA de cinco; en
          FIN y ESTADISTICAS, donde las capas no se pisan, respondian las cuatro.
          Tambien quedaban fuera del lienzo las de la franja alta, debajo del
          rotulo "Previsualizacion", que se comia el puntero.

          Intentar arreglarla —moverla arriba, abajo, mostrarla solo al pasar
          por encima— tapaba un caso y abria otro, porque la superposicion es
          intencional y no va a desaparecer.

          Asi que hay UN solo lugar para ajustar tamaño y visibilidad: la lista
          CAPAS, que funciona en las tres pestañas. El lienzo se arrastra, que
          es lo que se hace mirando. Mismo criterio que con los atajos y los
          editores de plantel: una sola via para cada cosa.

          Queda el rotulo con el nombre de la capa al pasar por encima, para
          saber que se esta arrastrando cuando se superponen.
        */
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded
          bg-black/85 border border-white/20 text-[9px] font-bold text-white/80 whitespace-nowrap
          opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 z-50">
          {id}{!pos.v && ' · oculta'}
        </span>
      )}
    </div>
  )
}
