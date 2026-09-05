"use client"

import { useEffect, useState } from 'react'
import { useGameState } from '@/hooks/use-game-state'
import { ScoreboardView } from '@/components/scoreboard-view'

export default function ScoreboardPage() {
  // 1. EL CEREBRO ESCLAVO:
  // Al invocar esto, el hook detecta que está en la ruta /scoreboard y automáticamente 
  // enciende la "Antena de Radio" y el "Lector de Disco Duro" para sincronizarse con el control.
  const { state } = useGameState()

  /**
   * 2. PANTALLA COMPLETA
   *
   * El navegador exige un gesto genuino del usuario DENTRO de esta ventana
   * para conceder pantalla completa — abrirla con `window.open` desde la
   * mesa de control no cuenta como gesto aquí, así que el intento automático
   * (500ms después de montar) casi siempre es rechazado en silencio. Hasta
   * ahora el único indicio de que hacía falta un clic era un `title` que sólo
   * se ve al pasar el mouse por encima: en la práctica, la ventana se quedaba
   * como "una ventana que cubre la pantalla" en vez de pantalla completa de
   * verdad, y nada avisaba que faltaba un clic para lograrlo.
   *
   * El aviso de abajo es visible y desaparece solo apenas se logra.
   */
  const [needsClick, setNeedsClick] = useState(false)

  useEffect(() => {
    const goFullscreen = async () => {
      if (document.fullscreenElement) { setNeedsClick(false); return }
      try {
        await document.documentElement.requestFullscreen()
        setNeedsClick(false)
      } catch {
        // Bloqueado sin gesto: se lo pedimos visiblemente al operador.
        setNeedsClick(true)
      }
    }

    const timer = setTimeout(goFullscreen, 500)
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) setNeedsClick(false)
    })
    return () => clearTimeout(timer)
  }, [])

  const handleClick = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
        setNeedsClick(false)
      } catch { /* el operador puede reintentar */ }
    }
  }

  return (
    <div
      onClick={handleClick}
      /*
       * `fixed inset-0` en vez de `w-full h-full relative`: ancla directo al
       * viewport, sin depender de que el padre (el layout de /scoreboard,
       * que usa `min-h-screen` — un MÍNIMO, no una altura fija) tenga una
       * altura definida contra la cual resolver un `h-full` en porcentaje.
       *
       * Sin esto, con el padre en `min-h-screen` y el único hijo real
       * (`ScoreboardView`) siendo `position:absolute` —que no aporta altura
       * a un contenedor en flujo normal—, este contenedor colapsaba a
       * prácticamente cero de alto. El tablero, anclado con `inset-0` ADENTRO
       * de esa caja colapsada, quedaba con tamaño cero: no se veía nada, y el
       * aviso de pantalla completa (también `absolute inset-0`) se
       * desarmaba contra el mismo colapso. `fixed inset-0` no depende de
       * ningún ancestro para tener tamaño: siempre es el viewport completo.
       */
      className="fixed inset-0 cursor-pointer"
      title="Haz clic en cualquier parte para Pantalla Completa"
    >
      {/* No necesitamos pasarle el boardId manualmente aquí, porque el componente 
        ScoreboardView es tan inteligente que leerá el ?board=1, 2 o 3 de la URL automáticamente 
      */}
      <ScoreboardView state={state} />

      {needsClick && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/70 animate-pulse">
          <span className="bg-black border-2 border-yellow-500 text-yellow-400 font-black text-2xl px-8 py-4 rounded-xl">
            Toca la pantalla para pantalla completa
          </span>
        </div>
      )}
    </div>
  )
}
