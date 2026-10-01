// ─────────────────────────────────────────────────────────────────────────────
// IDENTIDAD DE PERSONAS — R4
//
// Regla de fondo: el documento de identidad NUNCA es la llave, en ningún país.
// El dorsal tampoco: se muestra en pantalla, cambia de temporada en temporada
// y dos personas del mismo club pueden compartirlo mientras no coincidan en
// una citación. La identidad la emite ARDI.
//
// Tres piezas, cada una con un trabajo distinto:
//
//   clubId   UUID invisible, generado una vez. Es lo que hace global la
//            solución: dos clubes de países distintos que eligieron el mismo
//            prefijo legible no colisionan si sus paquetes conviven.
//   prefijo  'ILE'. Existe sólo para que un humano lea un CSV y reconozca de
//            qué club es. Puede repetirse en el mundo; clubId desempata.
//   personId 'ILE-0007'. La identidad real, estable de por vida.
// ─────────────────────────────────────────────────────────────────────────────

import { CLUB_BRAND } from '@/lib/club-brand'

/** Un id retirado no vuelve a usarse: las tarjetas viejas del acta apuntan ahí. */
export interface IdentityState {
  clubId: string
  prefix: string
  /** Último serial entregado. Sólo sube. */
  lastSerial: number
}

export const newClubId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `club-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

/** Prefijo legible a partir de la marca del club. Sin marca, 'ARD'. */
export function derivePrefix(name = CLUB_BRAND.shortName || CLUB_BRAND.name): string {
  const limpio = (name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z\s]/g, '').trim()
  if (!limpio) return 'ARD'
  const palabras = limpio.split(/\s+/).filter(Boolean)
  const sigla = palabras.length >= 2
    ? palabras.map(p => p[0]).join('')
    : palabras[0].slice(0, 3)
  return sigla.slice(0, 4)
}

export const formatPersonId = (prefix: string, serial: number): string =>
  `${prefix}-${String(serial).padStart(4, '0')}`

/** Entrega el siguiente id y el estado avanzado. No muta el original. */
export function issuePersonId(state: IdentityState): { id: string; next: IdentityState } {
  const serial = state.lastSerial + 1
  return {
    id: formatPersonId(state.prefix, serial),
    next: { ...state, lastSerial: serial }
  }
}

/**
 * Serial de un id propio del club, o null si el id es de otro origen.
 * Sirve para que al importar un plantel ajeno el contador no se quede atrás y
 * termine repartiendo un id que ya existe.
 */
export function serialOf(id: string, prefix: string): number | null {
  const m = new RegExp(`^${prefix}-(\\d+)$`).exec(id.trim())
  return m ? parseInt(m[1], 10) : null
}

/** Adelanta el contador para que ningún id existente pueda repetirse. */
export function reserveExisting(state: IdentityState, ids: string[]): IdentityState {
  const max = ids.reduce((acc, id) => {
    const s = serialOf(id, state.prefix)
    return s !== null && s > acc ? s : acc
  }, state.lastSerial)
  return max === state.lastSerial ? state : { ...state, lastSerial: max }
}

/** Identidad de la visita: vive sólo dentro del partido, no se guarda. */
export const visitorId = (dorsal: string): string => `V-${dorsal}`
export const isVisitorId = (id: string): boolean => id.startsWith('V-')

/**
 * Normalización compartida por nombres y cabeceras de CSV.
 *
 * Quita diacríticos en vez de borrarlos, que es el bug del importador actual:
 * hoy `Número` queda como `nmero` y no se reconoce, así que sólo funciona
 * `Numero` sin tilde, y cuando falla se cae a la primera columna en silencio.
 */
export const normalize = (s: string): string =>
  (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
