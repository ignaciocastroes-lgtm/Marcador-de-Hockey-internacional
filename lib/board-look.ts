// ─────────────────────────────────────────────────────────────────────────────
// APARIENCIA DEL TABLERO — FUENTE ÚNICA
//
// La cadena de tipografías vivía escrita a mano dentro de `scoreboard-view`, y
// la previsualización de los lanzadores pasaba `var(--font-led)` fijo. Dos
// lugares, dos respuestas distintas para la misma pregunta: por eso el modal
// prometía una fuente y el proyector mostraba otra.
//
// Aquí se resuelve una sola vez. Quien necesite saber cómo se ve el tablero
// —el tablero, el modal de lanzadores, el gestor de pantallas— lee de acá.
// ─────────────────────────────────────────────────────────────────────────────

import type { Finish } from '@/lib/finishes'

/** Pilas de fuentes por identificador del gestor de pantallas. */
export const LED_FONT_STACKS: Record<string, string> = {
  'impact':       '"Impact", "Arial Black", sans-serif',
  'arial-black':  '"Arial Black", "Arial Bold", sans-serif',
  'consolas':     '"Consolas", "Courier New", monospace',
  'trebuchet':    '"Trebuchet MS", "Lucida Grande", sans-serif',
  'dseg7':        '"DSEG7 Classic", monospace',
  'dseg14':       '"DSEG14 Classic", monospace',
  'jetbrains':    '"JetBrains Mono", monospace',
  'fira':         '"Fira Code", monospace',
  'chivo':        '"Chivo Mono", monospace',
  'orbitron':     '"Orbitron", sans-serif',
  'system':       'system-ui, -apple-system, sans-serif'
}

/** Identificador → pila de fuentes. Lo desconocido cae en la fuente del tema. */
export const resolveLedFont = (id?: string): string =>
  (id && LED_FONT_STACKS[id]) || 'var(--font-led)'

export interface BoardLook {
  homeUrl: string
  awayUrl: string
  ledFont: string
  fontWeight: string
  letterSpacing: string
  boardBgColor: string
  boardTextColor: string
  boardAccentColor: string
  possessionColor: string
  penaltiesColor: string
  finishDigits: Finish
  finishNames: Finish
}

export const DEFAULT_LOOK: BoardLook = {
  homeUrl: '',
  awayUrl: '',
  ledFont: 'impact',
  fontWeight: '900',
  letterSpacing: 'normal',
  boardBgColor: '#050505',
  boardTextColor: '#ffffff',
  boardAccentColor: '#dc2626',
  possessionColor: '#22c55e',
  penaltiesColor: '#eab308',
  finishDigits: 'solid',
  finishNames: 'solid'
}

/**
 * Lee la apariencia guardada por el gestor de pantallas. Tolera la ausencia de
 * claves y el JSON corrupto: el tablero nunca puede quedarse sin colores.
 */
export function loadBoardLook(): BoardLook {
  if (typeof window === 'undefined') return DEFAULT_LOOK
  try {
    const raw = localStorage.getItem('ardi-live-logos')
    if (!raw) return DEFAULT_LOOK
    return { ...DEFAULT_LOOK, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_LOOK
  }
}
