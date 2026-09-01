// ─────────────────────────────────────────────────────────────────────────────
// TECLAS RÁPIDAS
// Un mando Bluetooth de presentación se empareja como teclado HID: para el
// navegador son pulsaciones normales. Así que este archivo es, además, la API
// de control remoto — sin red, sin latencia y sin costo mensual.
// ─────────────────────────────────────────────────────────────────────────────

export const HOTKEYS_STORAGE_KEY = 'ardi-hotkeys-v2'

export type HotkeyAction =
  | 'clockSound' | 'clockMute' | 'buzzer'
  | 'possLeftToggle' | 'possLeftReset'
  | 'possRightToggle' | 'possRightReset'
  | 'nextPeriod' | 'intermission'
  | 'homeGoal' | 'awayGoal'
  | 'homeFoul' | 'awayFoul'
  | 'undo'

export interface HotkeyDef {
  action: HotkeyAction
  label: string
  group: 'Reloj' | 'Posesión' | 'Marcador' | 'Partido'
  /** Frecuencia de uso en una mesa: guía para asignar los pocos botones de un clicker. */
  priority: 1 | 2 | 3
  hint?: string
}

export const HOTKEY_DEFS: HotkeyDef[] = [
  { action: 'clockSound',      label: 'Reloj con chicharra',   group: 'Reloj',     priority: 1 },
  { action: 'clockMute',       label: 'Reloj sin chicharra',   group: 'Reloj',     priority: 1 },
  { action: 'buzzer',          label: 'Chicharra manual',      group: 'Reloj',     priority: 1 },
  { action: 'possLeftToggle',  label: 'Posesión local',        group: 'Posesión',  priority: 1 },
  { action: 'possLeftReset',   label: 'Reset 45 local',        group: 'Posesión',  priority: 1 },
  { action: 'possRightToggle', label: 'Posesión visita',       group: 'Posesión',  priority: 1 },
  { action: 'possRightReset',  label: 'Reset 45 visita',       group: 'Posesión',  priority: 1 },
  { action: 'homeGoal',        label: 'Gol local',             group: 'Marcador',  priority: 2, hint: 'Sin goleador' },
  { action: 'awayGoal',        label: 'Gol visita',            group: 'Marcador',  priority: 2, hint: 'Sin goleador' },
  { action: 'homeFoul',        label: 'Falta local',           group: 'Marcador',  priority: 2 },
  { action: 'awayFoul',        label: 'Falta visita',          group: 'Marcador',  priority: 2 },
  { action: 'nextPeriod',      label: 'Siguiente periodo',     group: 'Partido',   priority: 3 },
  { action: 'intermission',    label: 'Descanso',              group: 'Partido',   priority: 3 },
  { action: 'undo',            label: 'Cerrar / cancelar',     group: 'Partido',   priority: 3, hint: 'Cierra el diálogo abierto' },
]

export type HotkeyMap = Record<HotkeyAction, string>

export const DEFAULT_HOTKEYS: HotkeyMap = {
  clockSound: 'Space',
  clockMute: 'm',
  buzzer: 'b',
  possLeftToggle: 'a',
  possLeftReset: 's',
  possRightToggle: 'l',
  possRightReset: 'k',
  homeGoal: 'q',
  awayGoal: 'p',
  homeFoul: 'w',
  awayFoul: 'o',
  nextPeriod: 'n',
  intermission: 'd',
  undo: 'Escape',
}

/**
 * Perfil para mando de presentación Bluetooth. Estos aparatos mandan
 * PageUp / PageDown / Escape / F5 / b y nada más, así que sólo se pueden
 * cubrir las cuatro acciones de prioridad 1 que más se pulsan en una mesa.
 */
export const CLICKER_HOTKEYS: Partial<HotkeyMap> = {
  clockSound: 'PageDown',
  buzzer: 'PageUp',
  possLeftReset: 'F5',
  possRightReset: 'Escape',
}

/** Normaliza un evento de teclado a la forma en que guardamos las teclas. */
export function normalizeKey(e: KeyboardEvent | React.KeyboardEvent): string {
  if (e.key === ' ') return 'Space'
  if (e.key.length === 1) return e.key.toLowerCase()
  return e.key   // Escape, PageUp, PageDown, F5, ArrowLeft...
}

/** Compara sin que las mayúsculas rompan la coincidencia (el bug de 'Space'). */
export function keyMatches(pressed: string, configured: string): boolean {
  if (!configured) return false
  return pressed === configured || pressed.toLowerCase() === configured.toLowerCase()
}

/** Teclas que el navegador usa para otra cosa y hay que interceptar. */
export const KEYS_NEEDING_PREVENT = ['Space', 'PageUp', 'PageDown', 'F5', 'ArrowUp', 'ArrowDown']

export function loadHotkeys(): HotkeyMap {
  if (typeof window === 'undefined') return DEFAULT_HOTKEYS
  try {
    const raw = localStorage.getItem(HOTKEYS_STORAGE_KEY)
    if (!raw) return DEFAULT_HOTKEYS
    return { ...DEFAULT_HOTKEYS, ...JSON.parse(raw) }
  } catch { return DEFAULT_HOTKEYS }
}

export function saveHotkeys(map: HotkeyMap): void {
  try { localStorage.setItem(HOTKEYS_STORAGE_KEY, JSON.stringify(map)) } catch { /* ignorar */ }
}

/** Devuelve las acciones que comparten una misma tecla. */
export function findConflicts(map: HotkeyMap): Record<string, HotkeyAction[]> {
  const byKey: Record<string, HotkeyAction[]> = {}
  ;(Object.entries(map) as Array<[HotkeyAction, string]>).forEach(([action, key]) => {
    if (!key) return
    const k = key.toLowerCase()
    byKey[k] = [...(byKey[k] || []), action]
  })
  return Object.fromEntries(Object.entries(byKey).filter(([, list]) => list.length > 1))
}

export function actionForKey(map: HotkeyMap, pressed: string): HotkeyAction | null {
  const entry = (Object.entries(map) as Array<[HotkeyAction, string]>)
    .find(([, key]) => keyMatches(pressed, key))
  return entry ? entry[0] : null
}


// ─────────────────────────────────────────────────────────────────────────────
// PUENTE HACIA LA VISTA ACTIVA
//
// Los atajos viven en la estacion de trabajo (app/page), no en cada vista: si
// vivieran en la vista, cambiar de modo cambiaria el teclado bajo las manos del
// operador. Pero un par de acciones son de la vista —cerrar el dialogo abierto,
// abrir el selector de descanso— y para esas el page emite un evento que la
// vista activa escucha.
// ─────────────────────────────────────────────────────────────────────────────

export const HOTKEY_EVENT = 'ardi-hotkey'
export const OPEN_HOTKEYS_EVENT = 'ardi-open-hotkeys'

/** Acciones que resuelve la vista, no el estado global. */
export const VIEW_ACTIONS: HotkeyAction[] = ['undo', 'intermission']

export const emitHotkey = (action: HotkeyAction): void => {
  window.dispatchEvent(new CustomEvent(HOTKEY_EVENT, { detail: action }))
}

/**
 * Con un dialogo abierto el teclado se apaga, salvo reloj y chicharra: con un
 * mando en la mano, que un modal deje la mesa muda es inaceptable.
 */
export const dialogIsOpen = (): boolean =>
  typeof document !== 'undefined' && !!document.querySelector('[role="dialog"][data-state="open"]')

export const ALWAYS_ON: HotkeyAction[] = ['clockSound', 'clockMute', 'buzzer', 'undo']
