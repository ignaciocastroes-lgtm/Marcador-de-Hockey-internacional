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
import { SERIES, type Serie } from '@/lib/series'

export const CLUB_STORE_KEY = 'ardi-club'
export const CLUB_STORE_EVENT = 'ardi-club-updated'

export interface ClubPerson {
  id: string
  nombre: string
  /** Nombre de pantalla. El acta usa siempre `nombre`. */
  apodo: string
  rol: PersonRole
  isGoalie: boolean
  /** Fragmento de documento para el acta. Opcional, nunca llave. */
  doc: string
  /** Baja: deja de ofrecerse, pero su id no se reasigna jamás. */
  retirado?: boolean
}

/**
 * EL DORSAL PERTENECE A LA PERSONA **EN UNA SERIE**, no a la persona.
 *
 * Ariadny es la 20 en Sub-15. Si sube a Sub-17, donde el 20 ya es de Eloisa,
 * tiene que usar otro número — y jugar con el mismo dorsal que otra companera
 * es infraccion sancionable. El modelo anterior guardaba UN dorsal por
 * persona, asi que no podia representar eso: por construccion terminaba con
 * las dos en 20 y el sistema no tenia forma de avisarlo.
 *
 * Con el dorsal aqui, dentro de la serie, "repetido" es una condicion que se
 * puede comprobar y bloquear.
 */
export interface SerieMember {
  personId: string
  /** Vacio = todavia sin numero en esta serie. No se puede citar asi. */
  dorsal: string
}

export interface ClubStore {
  version: 2
  identity: IdentityState
  nombre: string
  personas: ClubPerson[]
  /** Integrantes de cada serie, con su dorsal EN esa serie. */
  series: Record<string, SerieMember[]>
  /**
   * QUE SERIES EXISTEN en esta liga.
   *
   * Estaban escritas en `lib/series.ts`, y ese archivo dice de si mismo que es
   * "la estructura real de la competencia chilena": Escuelita, Sub-10,
   * Sub-13 Fem... Un club espanol tiene Benjamin, Alevin e Infantil, y no
   * habia manera de cambiarlo sin recompilar el proyecto. Es la misma leccion
   * que el plantel compilado, un nivel mas arriba.
   *
   * Ausente = se usa la lista chilena de fabrica, para no romper lo que ya
   * corre. En cuanto se edita una serie, la liga pasa a mandar sobre el codigo.
   */
  serieDefs?: Serie[]
}

/** Las series de esta liga: las suyas si las definio, las de fabrica si no. */
export const seriesOf = (c: ClubStore | null | undefined): Serie[] =>
  [...((c?.serieDefs?.length ? c.serieDefs : SERIES))].sort((a, b) => a.order - b.order)

/** Una serie por id, buscando primero en las de la liga. */
export const serieById = (c: ClubStore | null | undefined, id: string): Serie | undefined =>
  seriesOf(c).find(s => s.id === id)

export interface SerieSaveResult { ok: boolean; club?: ClubStore; error?: string }

/** Crea o actualiza una serie de la liga. El id no se puede repetir. */
export function saveSerie(c: ClubStore, serie: Serie, idPrevio?: string): SerieSaveResult {
  const id = serie.id.trim()
  const label = serie.label.trim()
  if (!id) return { ok: false, error: 'La serie necesita un identificador' }
  if (!label) return { ok: false, error: 'La serie necesita un nombre' }

  const actuales = seriesOf(c)
  if (actuales.some(s => s.id === id && s.id !== idPrevio)) {
    return { ok: false, error: `Ya existe una serie con el identificador "${id}"` }
  }

  const defs = idPrevio
    ? actuales.map(s => s.id === idPrevio ? { ...serie, id, label } : s)
    : [...actuales, { ...serie, id, label }]

  // Si cambio el id, los integrantes se mudan con el: no pueden quedar
  // colgando de una serie que ya no existe.
  const series = { ...c.series }
  if (idPrevio && idPrevio !== id && series[idPrevio]) {
    series[id] = series[idPrevio]
    delete series[idPrevio]
  }
  return { ok: true, club: { ...c, serieDefs: defs, series } }
}

/** Borra una serie. Se niega si todavia tiene gente adentro. */
export function deleteSerie(c: ClubStore, id: string): SerieSaveResult {
  const dentro = (c.series[id] || []).length
  if (dentro > 0) {
    return { ok: false, error: `Esa serie tiene ${dentro} integrantes. Sácalos antes de borrarla.` }
  }
  const series = { ...c.series }
  delete series[id]
  return { ok: true, club: { ...c, serieDefs: seriesOf(c).filter(s => s.id !== id), series } }
}

export function emptyClub(nombre = CLUB_BRAND.name || 'Mi Club'): ClubStore {
  return {
    version: 2,
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
    if (!parsed || !Array.isArray(parsed.personas)) return null
    return parsed.version === 2 ? parsed : migrateToV2(parsed)
  } catch { return null }
}

/**
 * v1 -> v2: el dorsal baja de la persona a la serie.
 *
 * Lo que en v1 era `series: { sub15f: ['ILE-0001', ...] }` mas un `dorsal` por
 * persona, pasa a llevar el dorsal adentro. Se conserva el numero que tenia
 * cada una: es el unico dato disponible, y si dos quedan repetidas en la misma
 * serie la validacion lo va a marcar como incompleto en vez de inventar uno.
 */
function migrateToV2(viejo: ClubStore & { series?: Record<string, unknown> }): ClubStore {
  const dorsalDe = new Map<string, string>()
  ;(viejo.personas as (ClubPerson & { dorsal?: string })[]).forEach(p => {
    if (p.dorsal) dorsalDe.set(p.id, p.dorsal)
  })

  const series: Record<string, SerieMember[]> = {}
  Object.entries(viejo.series || {}).forEach(([serieId, miembros]) => {
    series[serieId] = (miembros as unknown[]).map(m =>
      typeof m === 'string'
        ? { personId: m, dorsal: dorsalDe.get(m) || '' }
        : (m as SerieMember)
    )
  })

  const personas = (viejo.personas as (ClubPerson & { dorsal?: string })[])
    .map(({ dorsal, ...resto }) => resto as ClubPerson)

  return { ...viejo, version: 2, personas, series }
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

/** Una persona vista DENTRO de una serie: sus datos mas su dorsal ahi. */
export type SquadPlayer = ClubPerson & { dorsal: string }

/** Quiénes integran una serie, con el dorsal que usan en ella. */
export const squadOf = (c: ClubStore, serieId: string): SquadPlayer[] =>
  (c.series[serieId] || [])
    .map(m => {
      const p = personById(c, m.personId)
      return p && !p.retirado ? { ...p, dorsal: m.dorsal } : null
    })
    .filter((p): p is SquadPlayer => !!p)

// ─── El dorsal, dentro de la serie ───────────────────────────────────────────

/** Quién tiene ese dorsal en esa serie, si alguien lo tiene. */
export function dorsalOwner(
  c: ClubStore, serieId: string, dorsal: string, exceptoId?: string
): ClubPerson | undefined {
  const d = (dorsal || '').trim()
  if (!d) return undefined
  const m = (c.series[serieId] || [])
    .find(x => x.dorsal === d && x.personId !== exceptoId)
  return m ? personById(c, m.personId) : undefined
}

export interface AssignResult { ok: boolean; club?: ClubStore; error?: string }

/**
 * Asigna el dorsal de una persona en una serie. Se RECHAZA si ya está tomado.
 *
 * No es un aviso: es un bloqueo. Dos companeras con el mismo numero en cancha
 * es infraccion, y el software esta para que no llegue a ocurrir.
 */
export function assignDorsal(
  c: ClubStore, serieId: string, personId: string, dorsal: string
): AssignResult {
  const d = (dorsal || '').trim()
  const duenio = dorsalOwner(c, serieId, d, personId)
  if (duenio) {
    return { ok: false, error: `El ${d} en esta serie ya es de ${duenio.nombre}` }
  }
  const actuales = c.series[serieId] || []
  const existe = actuales.some(m => m.personId === personId)
  const series = {
    ...c.series,
    [serieId]: existe
      ? actuales.map(m => m.personId === personId ? { ...m, dorsal: d } : m)
      : [...actuales, { personId, dorsal: d }]
  }
  return { ok: true, club: { ...c, series } }
}

/** Integrantes sin dorsal en esa serie: no se pueden citar hasta resolverlo. */
export const missingDorsal = (c: ClubStore, serieId: string): ClubPerson[] =>
  (c.series[serieId] || [])
    .filter(m => !m.dorsal.trim())
    .map(m => personById(c, m.personId))
    .filter((p): p is ClubPerson => !!p)

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
      // Sin dorsal: el CSV de plantel ya no lo trae, porque depende de la
      // serie. Se asigna en la citacion, con `assignDorsal`.
      nombre: row.nombre, apodo: row.apodo,
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
