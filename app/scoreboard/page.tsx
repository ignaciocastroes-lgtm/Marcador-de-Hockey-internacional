"use client"

import { useEffect } from 'react'
import { useGameState } from '@/hooks/use-game-state'
import { ScoreboardView } from '@/components/scoreboard-view'

export default function ScoreboardPage() {
  // 1. EL CEREBRO ESCLAVO:
  // Al invocar esto, el hook detecta que está en la ruta /scoreboard y automáticamente 
  // enciende la "Antena de Radio" y el "Lector de Disco Duro" para sincronizarse con el control.
  const { state } = useGameState()

  // 2. FUNCIÓN DE PANTALLA COMPLETA AUTOMÁTICA
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen()
        }
      } catch {
        // Los navegadores a veces bloquean el fullscreen si el usuario no ha interactuado (hecho clic)
      }
    }

    const timer = setTimeout(enterFullscreen, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleClick = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    }
  }

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer w-full h-full"
      title="Haz clic en cualquier parte para Pantalla Completa"
    >
      {/* No necesitamos pasarle el boardId manualmente aquí, porque el componente 
        ScoreboardView es tan inteligente que leerá el ?board=1, 2 o 3 de la URL automáticamente 
      */}
      <ScoreboardView state={state} />
    </div>
  )
}