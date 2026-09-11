// ─────────────────────────────────────────────────────────────────────────────
// MONTAJES EXPORTABLES — lanzadores y pantallas
//
// El problema que resuelve: "es un tema tener que encuadrar todo para
// empezar". Posiciones de los elementos en cada uno de los cinco tableros,
// calibracion, colores, tipografia, tamano y lugar de los tres lanzadores.
// Se ajusta con cuidado una vez y despues hay que repetirlo en cada equipo
// nuevo, o rehacerlo si alguien borro los datos del navegador.
//
// Con esto se guarda en un archivo y se aplica de una vez.
//
// Deliberadamente NO lleva nada del partido ni del plantel: eso viaja en el
// paquete de club. Un montaje es como se VE la cancha, no quien juega.
// ─────────────────────────────────────────────────────────────────────────────

export type PresetKind = 'ardi:lanzadores' | 'ardi:pantallas'

export const PRESET_VERSION = 1

/** Claves exactas y prefijos que componen cada montaje. */
const CLAVES: Record<PresetKind, { exactas: string[]; prefijos: string[] }> = {
  'ardi:lanzadores': {
    exactas: ['ardi-overlays', 'ardi-overlay-layout'],
    prefijos: []
  },
  'ardi:pantallas': {
    exactas: ['ardi-live-logos', 'ardi-visible-screens', 'ardi-scales'],
    // Uno por tablero: posiciones, calibracion y zoom de P1 a P5.
    prefijos: ['hockey-custom-layout-p', 'hockey-board-calibration-', 'hockey-preview-zoom-p']
  }
}

export interface Preset {
  formato: PresetKind
  version: number
  exportado: string
  datos: Record<string, string>
}

const clavesDe = (kind: PresetKind): string[] => {
  const { exactas, prefijos } = CLAVES[kind]
  const dinamicas = Object.keys(localStorage).filter(k => prefijos.some(p => k.startsWith(p)))
  return [...exactas.filter(k => localStorage.getItem(k) !== null), ...dinamicas]
}

/** Cuántos ajustes hay guardados hoy de ese montaje. Para decirlo antes de exportar. */
export const contarPreset = (kind: PresetKind): number =>
  typeof window === 'undefined' ? 0 : clavesDe(kind).length

export function buildPreset(kind: PresetKind): string {
  const datos: Record<string, string> = {}
  clavesDe(kind).forEach(k => {
    const v = localStorage.getItem(k)
    if (v !== null) datos[k] = v
  })
  const preset: Preset = {
    formato: kind, version: PRESET_VERSION,
    exportado: new Date().toISOString(), datos
  }
  return JSON.stringify(preset, null, 2)
}

export interface PresetResult { datos?: Record<string, string>; error?: string }

/**
 * Lee con desconfianza. Un montaje equivocado —el de lanzadores importado en
 * pantallas— dejaria la proyeccion en un estado incoherente sin decir por que,
 * asi que el tipo se comprueba antes que nada.
 */
export function parsePreset(kind: PresetKind, text: string): PresetResult {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { error: 'El archivo no es un JSON válido' } }

  const p = raw as Partial<Preset>
  if (p?.formato !== kind) {
    const otro = p?.formato === 'ardi:lanzadores' ? 'lanzadores'
               : p?.formato === 'ardi:pantallas'  ? 'pantallas' : null
    return {
      error: otro
        ? `Ese archivo es un montaje de ${otro}. Impórtalo desde ahí.`
        : 'Este archivo no es un montaje de ARDI'
    }
  }
  if (typeof p.version !== 'number' || p.version > PRESET_VERSION) {
    return { error: `El montaje es de una versión más nueva (v${p.version}). Actualiza ARDI.` }
  }
  if (!p.datos || typeof p.datos !== 'object' || Object.keys(p.datos).length === 0) {
    return { error: 'El montaje está vacío' }
  }
  // Sólo se aceptan claves del propio montaje: un archivo manipulado no puede
  // escribir el plantel ni el partido en curso.
  const { exactas, prefijos } = CLAVES[kind]
  const permitida = (k: string) => exactas.includes(k) || prefijos.some(pr => k.startsWith(pr))
  const intrusas = Object.keys(p.datos).filter(k => !permitida(k))
  if (intrusas.length) {
    return { error: `El archivo trae datos que no son de este montaje (${intrusas[0]}…)` }
  }
  return { datos: p.datos as Record<string, string> }
}

/** Escribe el montaje y avisa a las ventanas abiertas. Devuelve cuántas claves. */
export function applyPreset(kind: PresetKind, datos: Record<string, string>): number {
  let n = 0
  Object.entries(datos).forEach(([k, v]) => {
    try { localStorage.setItem(k, v); n++ } catch { /* cuota: se sigue con el resto */ }
  })
  // Los mismos avisos que usa cada panel al cambiar algo a mano.
  window.dispatchEvent(new Event(kind === 'ardi:pantallas' ? 'ardi-screens-updated' : 'ardi-overlays-updated'))
  return n
}

export function downloadPreset(kind: PresetKind): void {
  const nombre = kind === 'ardi:pantallas' ? 'pantallas' : 'lanzadores'
  const blob = new Blob([buildPreset(kind)], { type: 'application/json;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `ardi-montaje-${nombre}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
