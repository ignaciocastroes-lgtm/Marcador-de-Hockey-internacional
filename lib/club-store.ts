// ─────────────────────────────────────────────────────────────────────────────
// ALMACÉN DEL CLUB — R4
//
// Reemplaza a los tres almacenes que convivían:
//   · CLUB_PLAYERS   compilado en git (el único con identidad real)
//   · hockey-teams   sólo dorsales por serie, sin nombres ni ids
//   · hockey-saved-rosters  jugadores completos, clave club+serie+género
//
// No eran tres copias de lo mismo: eran tres niveles de fidelidad distintos.
// Este almacén se queda con el más rico y lo saca del código fuente, que es lo
// que permite montar un club de otro país sin recompilar nada.
//
// LAS CLAVES VIEJAS NO SE BORRAN. Se dejan de leer. Cuesta cero y deja salida
// si algo no cuadra el sábado.
// ─────────────────────────────────────────────────────────────────────────────

import {
  type IdentityState, newClubId, derivePrefix, issuePersonId,
  reserveExisting, normalize
} from '@/lib/identity'
import type { PersonRow, PersonRole } from '@/lib/roster-csv'
import { CLUB_BRAND } from '@/lib/club-brand'

export const CLUB_STORE_KEY = 'ardi-club'
export const CLUB_STORE_EVENT = 'ardi-club-updated'

export interface ClubPerson {
  id: string
  nombre: string
  /** Nombre de pantalla. El acta usa siempre `nombre`. */
  apodo: string
  /** Dorsal habitual. Se muestra; NUNCA es la llave. */
  dorsal: string
  rol: PersonRole
  isGoalie: boolean
  /** Fragmento de documento para el acta. Opcional, nunca llave. */
  doc: string
  /** Baja: deja de ofrecerse, pero su id no se reasigna jamás. */
  retirado?: boolean
}

export interface ClubStore {
  version: 1
  identity: IdentityState
  nombre: string
  personas: ClubPerson[]
  /** Qué personas integran cada serie. Ids, no copias. */
  series: Record<string, string[]>
}

export function emptyClub(nombre = CLUB_BRAND.name || 'Mi Club'): ClubStore {
  return {
    version: 1,
    identity: { clubId: newClubId(), prefix: derivePrefix(nombre), lastSerial: 0 },
    nombre,
    personas: [],
    series: {}
  }
}

export function loadClub(): ClubStore | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CLUB_STORE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ClubStore
    return parsed?.version === 1 && Array.isArray(parsed.personas) ? parsed : null
  } catch { return null }
}

export function saveClub(club: ClubStore): void {
  try {
    localStorage.setItem(CLUB_STORE_KEY, JSON.stringify(club))
    window.dispatchEvent(new Event(CLUB_STORE_EVENT))
  } catch { /* la cuota llena nunca puede voltear un partido */ }
}

export const activePeople = (c: ClubStore): ClubPerson[] =>
  c.personas.filter(p => !p.retirado)

export const personById = (c: ClubStore, id: string): ClubPerson | undefined =>
  c.personas.find(p => p.id === id)

/** Quiénes integran una serie, en orden de plantel. */
export const squadOf = (c: ClubStore, serieId: string): ClubPerson[] =>
  (c.series[serieId] || [])
    .map(id => personById(c, id))
    .filter((p): p is ClubPerson => !!p && !p.retirado)

// ─── Emparejamiento al importar ──────────────────────────────────────────────

export type MatchKind = 'porId' | 'porNombre' | 'nueva' | 'ambigua'

export interface RowMatch {
  row: PersonRow
  kind: MatchKind
  /** Coincidencia única, si la hay. */
  target?: ClubPerson
  /** Candidatas cuando el nombre da más de una. Requiere decisión humana. */
  candidatas?: ClubPerson[]
}

/**
 * Resuelve cada fila del CSV contra el plantel, en el orden del contrato:
 *   1. id conocido            -> esa persona
 *   2. id desconocido         -> alta CONSERVANDO ese id (viene de otro despliegue)
 *   3. sin id, nombre único   -> esa persona
 *   4. ambiguo o sin coincidencia -> decide el operador
 *
 * No escribe nada. Devuelve el diagnóstico para que la pantalla de
 * reconciliación lo muestre ANTES de aceptar el archivo: un choque de
 * identidad que se descubre cuando la tarjeta ya se acumuló en la persona
 * equivocada es el modo de falla que hay que hacer imposible.
 */
export function matchRows(club: ClubStore, rows: PersonRow[]): RowMatch[] {
  const porNombre = new Map<string, ClubPerson[]>()
  club.personas.forEach(p => {
    const k = normalize(p.nombre)
    if (!k) return
    porNombre.set(k, [...(porNombre.get(k) || []), p])
  })

  return rows.map(row => {
    if (row.id) {
      const exacto = personById(club, row.id)
      return exacto
        ? { row, kind: 'porId' as const, target: exacto }
        : { row, kind: 'nueva' as const }
    }
    const cands = porNombre.get(normalize(row.nombre)) || []
    if (cands.length === 1) return { row, kind: 'porNombre' as const, target: cands[0] }
    if (cands.length > 1)  return { row, kind: 'ambigua' as const, candidatas: cands }
    return { row, kind: 'nueva' as const }
  })
}

/** ¿Hay algo que el operador deba resolver antes de aceptar el archivo? */
export const needsReview = (ms: RowMatch[]): boolean => ms.some(m => m.kind === 'ambigua')

/**
 * Aplica las filas ya resueltas. Las altas reciben id nuevo, salvo que traigan
 * uno propio de otro despliegue, en cuyo caso se respeta y el contador se
 * adelanta para no repartirlo dos veces.
 */
export function applyRows(club: ClubStore, decisions: RowMatch[]): ClubStore {
  let identity = reserveExisting(
    club.identity,
    decisions.map(d => d.row.id).filter(Boolean)
  )
  const personas = [...club.personas]

  decisions.forEach(({ row, kind, target }) => {
    const datos = {
      nombre: row.nombre, apodo: row.apodo, dorsal: row.dorsal,
      rol: row.rol, isGoalie: row.isGoalie, doc: row.doc,
    }
    if (kind === 'ambigua') return          // sin decidir, no se toca

    if (target) {
      const i = personas.findIndex(p => p.id === target.id)
      // El doc vacío del archivo no borra el que ya estaba guardado.
      personas[i] = { ...personas[i], ...datos, doc: row.doc || personas[i].doc }
      return
    }
    let id = row.id
    if (!id) {
      const issued = issuePersonId(identity)
      id = issued.id
      identity = issued.next
    }
    personas.push({ id, ...datos })
  })

  return { ...club, identity, personas }
}
