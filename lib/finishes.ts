// ─────────────────────────────────────────────────────────────────────────────
// ACABADOS DEL MARCADOR
//
// Un acabado NO es un color: es cómo se comporta la luz sobre el color que el
// operador ya eligió. Por eso se aplican encima de la paleta, no la reemplazan.
//
// La restricción por elemento es deliberada y no es un capricho estético: el
// degradado metálico parte la masa del dígito y a treinta metros eso cuesta
// legibilidad. Reloj, marcador y posesión se leen bajo presión y desde lejos,
// así que no admiten metal. Nombres y letreros sí.
// ─────────────────────────────────────────────────────────────────────────────

export type Finish = 'solid' | 'neon' | 'fluor' | 'metal'

export interface FinishDef {
  id: Finish
  label: string
  hint: string
  /** false = no disponible para elementos de lectura crítica. */
  safeForClock: boolean
}

export const FINISHES: FinishDef[] = [
  { id: 'solid', label: 'Sólido',  hint: 'El color plano, máxima legibilidad',      safeForClock: true },
  { id: 'neon',  label: 'Neón',    hint: 'Núcleo claro con halo, como un letrero',  safeForClock: true },
  { id: 'fluor', label: 'Flúor',   hint: 'Saturación extrema, salta a la vista',    safeForClock: true },
  { id: 'metal', label: 'Metal',   hint: 'Dorado o plata; sólo nombres y letreros', safeForClock: false }
]

/** Elementos que se leen de lejos y bajo presión: no admiten metal. */
export const CRITICAL_ELEMENTS = ['mainClock', 'homeScore', 'awayScore', 'possession'] as const

export const finishClass = (f: Finish): string =>
  f === 'neon' ? 'fx-neon' : f === 'fluor' ? 'fx-fluor' : f === 'metal' ? 'fx-metal' : 'fx-solid'

/**
 * Estilo listo para aplicar. El color viaja como variable CSS porque las capas
 * de sombra y el degradado lo consultan varias veces.
 */
export function finishStyle(color: string, f: Finish): React.CSSProperties {
  const base = { ['--fx-color' as string]: color } as React.CSSProperties
  return f === 'solid' ? { ...base, color } : base
}

/** Metal se degrada a sólido en los elementos críticos, sin avisar al público. */
export const resolveFinish = (f: Finish, critical: boolean): Finish =>
  critical && f === 'metal' ? 'solid' : f

/** Presets de metal: el color base que mejor lee como oro o plata. */
export const METAL_PRESETS = [
  { label: 'Oro',    color: '#d4a017' },
  { label: 'Plata',  color: '#b8bcc4' },
  { label: 'Bronce', color: '#a86a32' }
]

/** Colores que mejor aguantan el acabado flúor en proyector. */
export const FLUOR_PRESETS = [
  { label: 'Verde lima', color: '#c6ff00' },
  { label: 'Cian',       color: '#00e5ff' },
  { label: 'Naranja',    color: '#ff7a00' },
  { label: 'Magenta',    color: '#ff2d95' }
]
