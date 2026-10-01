// ─────────────────────────────────────────────────────────────────────────────
// HISTORIAL Y ARCHIVO DEL DÍA
//
// Todo lo de aquí es PURO: recibe datos y devuelve datos. No lee ni escribe el
// almacenamiento; eso lo hace el hook. La prueba (`tests/historial`) corre
// contra este mismo archivo, no contra una copia.
//
// EL ARCHIVO DEL DÍA ES UN JSON (`ardi:jornada`): el archivo oficial que se
// sube a la web del club. Trae los partidos de una fecha, cada uno igual a su
// "Datos web" (`ardi:partido`). La web lo muestra como HTML y reparte los
// resultados por serie. Ver `ARCHIVO-DEL-DIA.md`.
//
// Para VER ese día en ARDI se abren las crónicas guardadas: el mismo HTML de
// "Ver crónica" de cada partido, una detrás de otra.
// ─────────────────────────────────────────────────────────────────────────────

import type { MatchRecord } from '@/hooks/use-game-state'
import type { ReportOpts, MatchJSON } from '@/lib/match-report'
import { documentoCronica, conBarraCronica } from '@/lib/cronica-doc'

/** La crónica de un partido, guardada sólo para VERLA. Los datos van en `web`. */
export interface CronicaGuardada {
  /** Rótulo corto: "INTERNACIONAL 3 - 2 RIVAL". */
  titulo: string
  /** El `<article>` tal cual, con los escudos pegados por referencia. */
  html: string
}

/**
 * Guarda un partido en el historial. El MISMO partido (mismo inicio) guardado
 * otra vez reemplaza al anterior y conserva su id: "Guardar en historial" y
 * luego "Guardar y nuevo" ya no dejan dos registros. Sin inicio no hay con qué
 * compararlo y se agrega.
 */
export function upsertHistory(prev: MatchRecord[], record: MatchRecord, max: number): MatchRecord[] {
  const previo = record.matchStart ? prev.find(r => r.matchStart === record.matchStart) : undefined
  const resto = previo ? prev.filter(r => r !== previo) : prev
  const nuevo = previo ? { ...record, id: previo.id } : record
  return [nuevo, ...resto].slice(0, max)
}

// ─── Escudos ─────────────────────────────────────────────────────────────────
// Un escudo pegado como imagen es un `data:` de decenas de KB. Dentro de cada
// partido guardado, el escudo del club se repetiría diez veces por jornada y
// llenaría el almacenamiento del navegador. Se guarda UNA vez en un mapa
// aparte y el partido lleva una referencia; al exportar vuelve entero.

export const ESCUDO_REF = 'ardi-escudo:'
/** Clave del mapa en el almacenamiento. Prefijo `hockey-`: la borra el "borrar todo". */
export const HISTORY_ESCUDOS_KEY = 'hockey-match-history-escudos'

/** Hash corto y estable (djb2). No es seguridad: es un nombre para el mapa. */
export function escudoKey(dataUrl: string): string {
  let h = 5381
  for (let i = 0; i < dataUrl.length; i++) h = ((h << 5) + h + dataUrl.charCodeAt(i)) | 0
  return (h >>> 0).toString(36) + '-' + dataUrl.length.toString(36)
}

/** Cambia los escudos `data:` por referencias. Devuelve las opciones livianas y lo que hay que guardar. */
export function aliviarEscudos(o: ReportOpts): { opts: ReportOpts; escudos: Record<string, string> } {
  const escudos: Record<string, string> = {}
  const uno = (url?: string) => {
    if (!url || !url.startsWith('data:')) return url
    const k = escudoKey(url)
    escudos[k] = url
    return ESCUDO_REF + k
  }
  return { opts: { ...o, homeLogo: uno(o.homeLogo), awayLogo: uno(o.awayLogo) }, escudos }
}

const REF_RE = /ardi-escudo:([a-z0-9]+-[a-z0-9]+)/g

/** Vuelve a poner los escudos en un texto. Una referencia perdida queda vacía. */
export function resolverEscudos(texto: string, mapa: Record<string, string>): string {
  return texto.replace(REF_RE, (_, k: string) => mapa[k] || '')
}

/** El partido con sus escudos enteros, listo para la web. */
export function resolverEscudosWeb(web: MatchJSON, mapa: Record<string, string>): MatchJSON {
  return {
    ...web,
    local:  { ...web.local,  escudo: resolverEscudos(web.local.escudo || '', mapa) },
    visita: { ...web.visita, escudo: resolverEscudos(web.visita.escudo || '', mapa) },
  }
}

/** Deja en el mapa sólo los escudos que algún partido del historial todavía usa. */
export function podarEscudos(historial: MatchRecord[], mapa: Record<string, string>): Record<string, string> {
  const usados = new Set<string>()
  for (const r of historial) {
    const texto = (r.cronica?.html || '') + (r.web ? r.web.local.escudo + ' ' + r.web.visita.escudo : '')
    for (const m of texto.matchAll(REF_RE)) usados.add(m[1])
  }
  const out: Record<string, string> = {}
  for (const k of Object.keys(mapa)) if (usados.has(k)) out[k] = mapa[k]
  return out
}

// ─── Días ────────────────────────────────────────────────────────────────────

/**
 * 'AAAA-MM-DD' en la hora LOCAL del equipo.
 *
 * Se usaba `toISOString().slice(0, 10)`, que es la fecha en UTC: en Chile
 * (UTC-3) un partido configurado desde las 21:00 quedaba fechado al día
 * siguiente — en la crónica, en la clave de la web y en el archivo del día.
 */
export function fechaLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Fecha del partido: la de sus datos; si no tiene, el día en que se guardó. */
export function fechaDe(r: MatchRecord): string {
  return r.web?.fecha || fechaLocal(new Date(r.date))
}

/** El historial agrupado por día, el más reciente primero. Dentro, como venía. */
export function agruparPorFecha(historial: MatchRecord[]): { fecha: string; registros: MatchRecord[] }[] {
  const grupos = new Map<string, MatchRecord[]>()
  for (const r of historial) {
    const f = fechaDe(r)
    grupos.set(f, [...(grupos.get(f) || []), r])
  }
  return Array.from(grupos.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([fecha, registros]) => ({ fecha, registros }))
}

export const fechaCorta = (f: string) => f.split('-').reverse().join('/')

/** La crónica de UN partido del historial, lista para abrir. Null si es anterior a la 3.55. */
export function cronicaDeRegistro(r: MatchRecord, mapa: Record<string, string>): string | null {
  if (!r.cronica) return null
  const art = resolverEscudos(r.cronica.html, mapa)
  return conBarraCronica(documentoCronica(r.cronica.titulo, r.cronica.titulo, [art]), art)
}

/**
 * Los partidos de un día que van a la web, en orden de juego.
 *
 * Un suspendido que se retomó queda guardado dos veces (lo que iba y el
 * final) con el mismo id web; el historial va del más nuevo al más viejo, así
 * que gana el primero: el resultado final.
 *
 * `sinDatos` cuenta los partidos de ese día guardados antes de la 3.55: no
 * traen los datos y no se inventan.
 *
 * El JSON y la vista del día salen de AQUÍ: no pueden traer partidos distintos.
 */
export function partidosDelDia(historial: MatchRecord[], fecha: string): { registros: MatchRecord[]; sinDatos: number } {
  const delDia = historial.filter(r => fechaDe(r) === fecha)
  const conDatos = delDia.filter(r => r.web)
  const vistos = new Set<string>()
  const registros = conDatos
    .filter(r => { const id = (r.web as MatchJSON).id; if (vistos.has(id)) return false; vistos.add(id); return true })
    .sort((a, b) => ((a.web as MatchJSON).hora || '').localeCompare((b.web as MatchJSON).hora || '')
      || (a.web as MatchJSON).id.localeCompare((b.web as MatchJSON).id))
  return { registros, sinDatos: delDia.length - conDatos.length }
}

export const JORNADA_JSON_FORMAT = 'ardi:jornada'
export const JORNADA_JSON_VERSION = 1

/** El archivo oficial del día. */
export interface JornadaJSON {
  formato: typeof JORNADA_JSON_FORMAT
  version: number
  /** 'AAAA-MM-DD' */
  fecha: string
  /** En orden de juego. Cada uno exactamente igual a su "Datos web" (`ardi:partido`). */
  partidos: MatchJSON[]
}

export function buildJornadaJSON(
  historial: MatchRecord[], fecha: string, mapa: Record<string, string>
): { jornada: JornadaJSON; sinDatos: number } {
  const { registros, sinDatos } = partidosDelDia(historial, fecha)
  return {
    jornada: {
      formato: JORNADA_JSON_FORMAT, version: JORNADA_JSON_VERSION, fecha,
      partidos: registros.map(r => resolverEscudosWeb(r.web as MatchJSON, mapa)),
    },
    sinDatos,
  }
}

/** Para VER el día en ARDI: las crónicas guardadas de esos mismos partidos. */
export function buildJornadaHTML(historial: MatchRecord[], fecha: string, mapa: Record<string, string>): string {
  const { registros } = partidosDelDia(historial, fecha)
  const guardadas = registros.filter(r => r.cronica).map(r => r.cronica as CronicaGuardada)
  const articulos = guardadas.map(c => resolverEscudos(c.html, mapa))
  const titulo = `Jornada del ${fechaCorta(fecha)}`
  return conBarraCronica(
    documentoCronica(titulo, `${titulo} · ${guardadas.map(c => c.titulo).join(' · ')}`, articulos),
    articulos.join('\n'))
}
