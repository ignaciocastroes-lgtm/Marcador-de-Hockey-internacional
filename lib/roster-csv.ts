// ─────────────────────────────────────────────────────────────────────────────
// CSV DE PLANTEL Y DE CITACIÓN — R4
//
// Reemplaza a `downloadRosterCSV` / `processRosterImport`, que no podían
// hacer el viaje de ida y vuelta: exportar e importar el propio archivo perdía
// el 100% de los nombres, todos los roles y el cuerpo técnico completo.
//
// Dos causas, las dos corregidas acá:
//
//  1. El exportador escribía tres filas de encabezado ANTES de la fila de
//     columnas, y el importador usaba `header: true`. Resultado: tomaba
//     "PLANILLA DE JUGADORES - Internacional" como nombre de columna. Ahora los
//     metadatos van en líneas `#`, que se saltan antes de parsear.
//  2. El normalizador de cabeceras borraba lo que no fuera a-z0-9, así que
//     `Número` quedaba en `nmero` y no coincidía con `numero`. Ahora se quitan
//     los diacríticos (NFD), no los caracteres.
//
// Y una regla nueva: si falta una columna obligatoria se DICE, con las
// cabeceras que sí se encontraron. Nunca se adivina en silencio.
// ─────────────────────────────────────────────────────────────────────────────

import Papa from 'papaparse'
import { normalize } from '@/lib/identity'

export type PersonRole =
  | 'jugador' | 'portero' | 'capitan'
  | 'dt' | 'ay1' | 'ay2' | 'ax1' | 'ax2'

/**
 * Una persona del club. SIN DORSAL, a proposito.
 *
 * El dorsal depende de la serie —la misma jugadora puede ser la 20 en Sub-15 y
 * otra cosa en Sub-17— asi que no cabe en una ficha de persona. Vive en la
 * citacion, que es de una serie y una fecha.
 */
export interface PersonRow {
  /** '' si la fila no trae id: es alta nueva o hay que emparejarla. */
  id: string
  nombre: string
  /** Nombre corto para la pantalla. El acta siempre usa `nombre`. */
  apodo: string
  rol: PersonRole
  isGoalie: boolean
  /** Fragmento de documento que pide la federación. Opcional, nunca es llave. */
  doc: string
}

export interface CallUpRow {
  id: string
  dorsal: string
  rol: PersonRole
}

export interface ParseIssue {
  fila: number
  motivo: string
}

export interface ParseResult<T> {
  rows: T[]
  issues: ParseIssue[]
  meta: Record<string, string>
}

/** Longitud máxima del apodo: el lanzador de gol dibuja a 450 px. */
export const APODO_MAX = 12

// ─── Cabeceras ───────────────────────────────────────────────────────────────

const SINONIMOS: Record<string, string[]> = {
  id:      ['id', 'ardi id', 'identificador'],
  nombre:  ['nombre', 'jugador', 'jugadora', 'nombre completo', 'apellidos'],
  apodo:   ['apodo', 'alias', 'sobrenombre', 'nick'],
  dorsal:  ['dorsal', 'numero', 'num', 'n', 'camiseta'],
  rol:     ['rol', 'role', 'cargo', 'puesto'],
  portero: ['portero', 'arquero', 'goalie', 'po'],
  doc:     ['doc', 'documento', 'rut', 'dni', 'id nacional', 'cedula'],
}

/** Mapa cabecera-del-archivo -> campo nuestro. */
export function mapHeaders(headers: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  headers.forEach(h => {
    const n = normalize(h)
    for (const [campo, alias] of Object.entries(SINONIMOS)) {
      if (alias.includes(n)) { out[campo] = h; break }
    }
  })
  return out
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

/** Separa las líneas `#` de metadatos del cuerpo tabular. */
function splitMeta(text: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {}
  const body: string[] = []
  text.split(/\r?\n/).forEach(line => {
    if (line.trimStart().startsWith('#')) {
      const m = /^#\s*([^:]+):\s*(.*)$/.exec(line.trim().slice(1).trim().startsWith(':')
        ? line.trim() : line.trim().replace(/^#\s*/, ''))
      if (m) meta[normalize(m[1]).replace(/\s+/g, '')] = m[2].trim()
    } else {
      body.push(line)
    }
  })
  return { meta, body: body.join('\n') }
}

const asRole = (raw: string, isGoalie: boolean): PersonRole => {
  const n = normalize(raw).replace(/\s+/g, '')
  const tabla: Record<string, PersonRole> = {
    portero: 'portero', arquero: 'portero', po: 'portero',
    capitan: 'capitan', c: 'capitan',
    dt: 'dt', entrenador: 'dt', ay1: 'ay1', ay2: 'ay2', ax1: 'ax1', ax2: 'ax2',
    jugador: 'jugador', jugadorpista: 'jugador', jugadora: 'jugador',
  }
  return tabla[n] || (isGoalie ? 'portero' : 'jugador')
}

const esSi = (v: string): boolean => ['si', 'sí', 'yes', 'true', '1', 'x'].includes(normalize(v))

const STAFF: PersonRole[] = ['dt', 'ay1', 'ay2', 'ax1', 'ax2']

export function parsePlantelCSV(text: string): ParseResult<PersonRow> {
  const { meta, body } = splitMeta(text)
  const parsed = Papa.parse<Record<string, string>>(body, {
    header: true, skipEmptyLines: true
  })
  const headers = parsed.meta.fields || []
  const col = mapHeaders(headers)
  const issues: ParseIssue[] = []

  if (!col.nombre) {
    issues.push({
      fila: 0,
      motivo: `No encuentro la columna de nombre. Cabeceras leídas: ${headers.join(', ') || '(ninguna)'}`
    })
    return { rows: [], issues, meta }
  }

  const rows: PersonRow[] = []
  parsed.data.forEach((raw, i) => {
    const fila = i + 2
    const get = (campo: string) => (col[campo] ? (raw[col[campo]] ?? '').trim() : '')

    const nombre = get('nombre')
    const rol = asRole(get('rol'), esSi(get('portero')))
    if (!nombre) return

    let apodo = get('apodo')
    if (apodo.length > APODO_MAX) {
      issues.push({ fila, motivo: `El apodo "${apodo}" supera ${APODO_MAX} caracteres; se recorta` })
      apodo = apodo.slice(0, APODO_MAX)
    }

    rows.push({
      id: get('id'), nombre, apodo, rol,
      isGoalie: rol === 'portero' || esSi(get('portero')),
      doc: get('doc'),
    })
  })

  if (rows.length === 0 && issues.length === 0) {
    issues.push({ fila: 0, motivo: 'El archivo no tiene ninguna fila con datos' })
  }
  return { rows, issues, meta }
}

export function parseCitacionCSV(text: string): ParseResult<CallUpRow> {
  const { meta, body } = splitMeta(text)
  const parsed = Papa.parse<Record<string, string>>(body, { header: true, skipEmptyLines: true })
  const headers = parsed.meta.fields || []
  const col = mapHeaders(headers)
  const issues: ParseIssue[] = []
  const rows: CallUpRow[] = []

  parsed.data.forEach((raw, i) => {
    const get = (campo: string) => (col[campo] ? (raw[col[campo]] ?? '').trim() : '')
    const id = get('id')
    const dorsal = get('dorsal')
    if (!id && !dorsal) return
    rows.push({ id, dorsal, rol: asRole(get('rol'), false) })
  })

  if (rows.length === 0) issues.push({ fila: 0, motivo: 'La citación no tiene filas' })
  return { rows, issues, meta }
}

// ─── Escritura ───────────────────────────────────────────────────────────────

const cell = (v: string): string =>
  /[",\n]/.test(v ?? '') ? `"${(v ?? '').replace(/"/g, '""')}"` : (v ?? '')

/**
 * `incluirDoc` va en false por defecto a propósito: el archivo que circula por
 * correo no lleva documentos de menores. Sólo la exportación explícita para la
 * federación lo pide en true.
 */
export function buildPlantelCSV(
  rows: PersonRow[],
  meta: { club: string; clubId: string; incluirDoc?: boolean }
): string {
  const cols = ['id', 'nombre', 'apodo', 'rol', 'portero']
  if (meta.incluirDoc) cols.push('doc')

  const lineas = [
    '# ardi:plantel v1',
    `# club: ${meta.club}`,
    `# clubId: ${meta.clubId}`,
    '# (las lineas con # son datos del archivo; no las edites a mano)',
    '# el dorsal NO va aqui: depende de la serie, y viaja en la citacion',
    cols.join(','),
    ...rows.map(r => {
      const base = [r.id, r.nombre, r.apodo, r.rol, r.isGoalie ? 'si' : 'no']
      if (meta.incluirDoc) base.push(r.doc || '')
      return base.map(cell).join(',')
    })
  ]
  return lineas.join('\n')
}

export function buildCitacionCSV(
  rows: CallUpRow[],
  meta: { serie: string; fecha: string }
): string {
  return [
    '# ardi:citacion v1',
    `# serie: ${meta.serie}`,
    `# fecha: ${meta.fecha}`,
    'id,dorsal,rol',
    ...rows.map(r => [r.id, r.dorsal, r.rol].map(cell).join(','))
  ].join('\n')
}
