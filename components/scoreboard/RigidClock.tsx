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
  /**
   * Ancho de cada dígito en `em`. Omitido = se usa `1ch`, que es el ancho real
   * del dígito en la tipografía activa.
   *
   * El valor fijo de 0.62em era el bug del reloj "colapsado": si la fuente
   * elegida en el gestor de pantallas es más ancha que eso —una LED de trazo
   * grueso, por ejemplo— los glifos se desbordan de su caja y se pisan entre
   * sí. Con `ch` la caja mide exactamente lo que mide un dígito, sea cual sea
   * la fuente, y con `tabular-nums` todos miden igual. Se adapta solo.
   */
  digitEm?: number
}

export function RigidClock({
  seconds, tenthsUnder = 10, className = '', style, digitEm
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

  const anchoDigito = digitEm ? `${digitEm}em` : '1ch'
  const anchoSeparador = digitEm ? `${digitEm * 0.45}em` : '0.55ch'

  return (
    <span className={`inline-flex items-baseline leading-none tabular-nums ${className}`}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {chars.map((c, i) => {
        const separator = c === ':' || c === '.'
        return (
          <span key={i}
            className="inline-flex justify-center shrink-0"
            style={{ width: separator ? anchoSeparador : anchoDigito }}>
            {c}
          </span>
        )
      })}
    </span>
  )
}
