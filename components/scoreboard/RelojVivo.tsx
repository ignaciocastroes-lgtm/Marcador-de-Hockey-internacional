"use client"

import { useEffect, useRef, useState } from 'react'
import { RigidClock } from '@/components/scoreboard/RigidClock'

/**
 * RELOJ PRINCIPAL CON DÉCIMAS DE VERDAD
 *
 * El estado del partido guarda SEGUNDOS ENTEROS. Con eso, la cuenta de las
 * décimas —`(s - entero) * 10`— daba siempre 0: al pasar a décimas el reloj
 * mostraba `04.0`, `03.0`, `02.0` y la décima nunca se movía.
 *
 * Bajar el estado a décimas sería peor: el acta entera viajaría diez veces por
 * segundo a cada proyector, que es exactamente lo que se frenó en la 3.5. Así
 * que las décimas se calculan SOLO EN PANTALLA: cada ventana toma el último
 * segundo que recibió y descuenta el tiempo transcurrido desde entonces, a
 * 10 Hz y únicamente en los últimos diez segundos.
 *
 * Por qué funciona: el estado guarda el TECHO del tiempo real (`clock -
 * floor(elapsed)`). Cuando el entero pasa a N, el tiempo real acaba de cruzar
 * N y va camino a N-1. Descontar desde ese instante reconstruye la décima.
 *
 * Y vive en su propio componente a propósito: a 10 Hz sólo se vuelve a pintar
 * el reloj, no la pista entera ni el tablero.
 */

interface Props {
  segundos: number
  corriendo: boolean
  /** Bajo cuántos segundos se pasa a décimas. */
  tenthsUnder?: number
  /** Bajo cuántos segundos el reloj avisa que se acaba el tiempo. */
  alertaBajo?: number
  /** Desactiva el aviso (descanso, tiempo muerto: no es el fin del periodo). */
  sinAlerta?: boolean
  className?: string
  style?: React.CSSProperties
  digitEm?: number
}

export const COLOR_ALERTA = '#ef4444'

export function RelojVivo({
  segundos, corriendo, tenthsUnder = 10, alertaBajo = 10, sinAlerta = false,
  className = '', style, digitEm
}: Props) {
  const marca = useRef<{ valor: number; ts: number } | null>(null)
  const [, latido] = useState(0)

  // Cuando llega un segundo nuevo, desde ahí se descuenta.
  if (!marca.current || marca.current.valor !== segundos) {
    marca.current = { valor: segundos, ts: typeof performance !== 'undefined' ? performance.now() : 0 }
  }

  const enDecimas = corriendo && segundos > 0 && segundos < tenthsUnder
  useEffect(() => {
    if (!enDecimas) return
    const id = setInterval(() => latido(n => n + 1), 100)
    return () => clearInterval(id)
  }, [enDecimas])

  let visible = segundos
  if (enDecimas && marca.current) {
    const pasado = (performance.now() - marca.current.ts) / 1000
    // Nunca por debajo del segundo siguiente: si la actualización se atrasa,
    // el reloj se queda en .0 en vez de adelantarse a un número que no llegó.
    visible = Math.max(segundos - 0.999, segundos - pasado)
  }

  const alerta = !sinAlerta && segundos > 0 && segundos <= alertaBajo
  return (
    <RigidClock
      seconds={visible}
      tenthsUnder={corriendo ? tenthsUnder : 0}
      digitEm={digitEm}
      className={`${className} ${alerta ? 'ardi-alerta-reloj' : ''}`}
      style={alerta ? { ...style, color: COLOR_ALERTA, textShadow: `0 0 24px ${COLOR_ALERTA}aa` } : style}
    />
  )
}
