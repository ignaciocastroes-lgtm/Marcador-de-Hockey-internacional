"use client"

/**
 * Reloj rígido.
 *
 * Un reloj con dígitos proporcionales "baila": el 1 es más angosto que el 8, así
 * que al cambiar de número toda la cifra se desplaza. `tabular-nums` ayuda pero
 * no basta cuando cambia la cantidad de caracteres —al entrar las décimas—.
 * Aquí cada carácter vive en su propia caja de ancho fijo: nada se mueve nunca.
 *
 * Bajo el umbral (10 s por defecto) aparecen las décimas, como en la mesa de
 * cronometraje: los últimos segundos son los que se miran de verdad.
 */

interface Props {
  /** Segundos restantes. Puede traer decimales. */
  seconds: number
  /** Debajo de este valor se muestran décimas. 0 lo desactiva. */
  tenthsUnder?: number
  className?: string
  style?: React.CSSProperties
  /** Ancho de cada dígito, relativo al tamaño de fuente. */
  digitEm?: number
}

export function RigidClock({
  seconds, tenthsUnder = 10, className = '', style, digitEm = 0.62
}: Props) {
  const s = Math.max(0, seconds)
  const showTenths = tenthsUnder > 0 && s < tenthsUnder

  let chars: string[]
  if (showTenths) {
    const whole = Math.floor(s)
    const tenth = Math.floor((s - whole) * 10)
    chars = [...whole.toString().padStart(2, '0'), '.', tenth.toString()]
  } else {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    chars = [...m.toString().padStart(2, '0'), ':', ...sec.toString().padStart(2, '0')]
  }

  return (
    <span className={`inline-flex items-baseline leading-none ${className}`} style={style}>
      {chars.map((c, i) => {
        const separator = c === ':' || c === '.'
        return (
          <span key={i}
            className="inline-flex justify-center shrink-0"
            style={{ width: separator ? `${digitEm * 0.45}em` : `${digitEm}em` }}>
            {c}
          </span>
        )
      })}
    </span>
  )
}
