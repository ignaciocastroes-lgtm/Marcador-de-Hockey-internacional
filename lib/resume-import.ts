// ─────────────────────────────────────────────────────────────────────────────
// RETOMAR UN PARTIDO SUSPENDIDO DESDE UN ARCHIVO
//
// Desde la 3.55 el archivo es el de "Datos web" (JSON `ardi:partido`), que trae
// marcador, faltas y el bloque `reanudacion` (periodo y reloj). El CSV de
// estadísticas se retiró; pero un club puede tener guardado el CSV de un
// suspendido de antes, así que se sigue leyendo.
//
// Puro: recibe el texto del archivo y devuelve los valores. Probado contra
// este mismo archivo en `tests/reanudar.test.mjs`.
// ─────────────────────────────────────────────────────────────────────────────

import type { Period } from '@/hooks/use-game-state'

export interface Reanudacion {
  periodo: Period
  minutos: number
  segundos: number
  golesLocal: number
  golesVisita: number
  faltasLocal: number
  faltasVisita: number
}

const PERIODOS: Period[] = ['1er_tiempo', '2do_tiempo', 'alargue', 'penales']
const aPeriodo = (v: unknown): Period =>
  (PERIODOS.includes(String(v).trim() as Period) ? String(v).trim() : '1er_tiempo') as Period
const aNum = (v: unknown): number => { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) && n >= 0 ? n : 0 }

export function leerReanudacion(texto: string): { ok: true; datos: Reanudacion } | { ok: false; error: string } {
  const t = texto.replace(/^\uFEFF/, '').trim()

  if (t.startsWith('{')) {
    let j: any
    try { j = JSON.parse(t) } catch { return { ok: false, error: 'El archivo JSON está dañado.' } }
    if (j?.formato === 'ardi:jornada') {
      return { ok: false, error: 'Es el archivo del día. Para retomar, usa los Datos web de ESE partido.' }
    }
    if (j?.formato !== 'ardi:partido') return { ok: false, error: 'No es un archivo de Datos web de ARDI.' }
    if (!j.reanudacion) {
      return { ok: false, error: 'Este archivo es anterior a la 3.55 y no dice dónde quedó el reloj. Completa periodo y minuto a mano.' }
    }
    const rel = aNum(j.reanudacion.relojSeg)
    return { ok: true, datos: {
      periodo: aPeriodo(j.reanudacion.periodo),
      minutos: Math.floor(rel / 60), segundos: rel % 60,
      golesLocal: aNum(j.local?.goles), golesVisita: aNum(j.visita?.goles),
      faltasLocal: aNum(j.local?.faltas), faltasVisita: aNum(j.visita?.faltas),
    } }
  }

  // CSV de estadísticas / planilla (hasta la 3.54): bloque REANUDACION.
  const lineas = t.split('\n').map(l => l.trim())
  const valor = (k: string) => { const l = lineas.find(x => x.startsWith(k + ',')); return l ? l.split(',')[1] : null }
  if (!valor('Periodo Reanudacion')) {
    return { ok: false, error: 'El archivo no trae dónde quedó el partido. Usa los Datos web (JSON) del partido suspendido.' }
  }
  const [m, s] = (valor('Minuto Reanudacion') || '00:00').trim().split(':')
  return { ok: true, datos: {
    periodo: aPeriodo(valor('Periodo Reanudacion')),
    minutos: aNum(m), segundos: aNum(s),
    golesLocal: aNum(valor('Resultado Local')), golesVisita: aNum(valor('Resultado Visita')),
    faltasLocal: aNum(valor('Faltas Local')), faltasVisita: aNum(valor('Faltas Visita')),
  } }
}
