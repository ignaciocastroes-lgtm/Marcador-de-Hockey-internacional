// ─────────────────────────────────────────────────────────────────────────────
// ARRANQUE Y BORRADO — R5a
//
// Dos cosas que hasta ahora no tenían dueño: de dónde sale el plantel la
// primera vez que se abre un despliegue, y cómo se deja el equipo realmente
// en cero.
//
// SOBRE "EMPEZAR DE CERO": Ctrl+F5 NO BORRA ESTO. Una recarga forzada se salta
// la caché HTTP, pero localStorage sobrevive intacto — y ahí viven los
// planteles, los equipos, los atajos, los layouts y el partido en curso. Quien
// recargue esperando empezar limpio se encuentra todo igual. Por eso el
// borrado tiene que ser una acción explícita de la app, que además diga qué se
// va a llevar antes de llevárselo.
// ─────────────────────────────────────────────────────────────────────────────

import { CLUB_BRAND } from '@/lib/club-brand'
import { CLUB_SEED } from '@/lib/club-seed'
import { type ClubStore, loadClub, saveClub, emptyClub, CLUB_STORE_KEY } from '@/lib/club-store'

/** Todo lo que ARDI guarda usa uno de estos dos prefijos. */
const PREFIJOS = ['ardi-', 'hockey-']

export interface StoredGroup {
  titulo: string
  claves: string[]
}

/** Qué hay guardado ahora, agrupado para poder mostrarlo antes de borrar. */
export function summarizeStored(): StoredGroup[] {
  if (typeof window === 'undefined') return []
  const todas = Object.keys(localStorage).filter(k => PREFIJOS.some(p => k.startsWith(p)))
  const en = (pred: (k: string) => boolean) => todas.filter(pred)

  const grupos: StoredGroup[] = [
    { titulo: 'Plantel y equipos', claves: en(k => k === CLUB_STORE_KEY || k === 'hockey-teams' || k === 'hockey-saved-rosters') },
    { titulo: 'Historial de partidos', claves: en(k => k === 'hockey-match-history') },
    { titulo: 'Partido en curso', claves: en(k => k.startsWith('hockey-live-game') || k.startsWith('hockey-buzzer')) },
    { titulo: 'Apariencia y pantallas', claves: en(k => k === 'ardi-live-logos' || k === 'ardi-appearance' || k === 'ardi-overlays' || k === 'ardi-overlay-layout' || k === 'ardi-shield-gallery' || k.startsWith('hockey-custom-layout') || k.startsWith('hockey-board-calibration') || k.startsWith('hockey-preview-zoom') || k === 'ardi-visible-screens') },
    { titulo: 'Preferencias de la mesa', claves: en(k => k.startsWith('ardi-hotkeys') || k === 'ardi-audio-config' || k === 'ardi-theme' || k === 'ardi-scales' || k === 'ardi-view-mode') },
  ]
  const cubiertas = new Set(grupos.flatMap(g => g.claves))
  const resto = todas.filter(k => !cubiertas.has(k))
  if (resto.length) grupos.push({ titulo: 'Otros ajustes', claves: resto })

  return grupos.filter(g => g.claves.length > 0)
}

/**
 * Deja el equipo como recién instalado. Devuelve las claves borradas para
 * poder decir exactamente qué se hizo — un borrado que no rinde cuentas es
 * indistinguible de uno que falló a medias.
 */
export function wipeAll(): string[] {
  if (typeof window === 'undefined') return []
  const claves = Object.keys(localStorage).filter(k => PREFIJOS.some(p => k.startsWith(p)))
  claves.forEach(k => { try { localStorage.removeItem(k) } catch { /* seguir */ } })
  return claves
}

/**
 * El plantel de la primera vez.
 *
 * La semilla se aplica SÓLO si este despliegue es el del club dueño
 * (`CLUB_BRAND.isDefaultHome`). Sin esa condición, el primer cliente de otro
 * país abriría ARDI con el plantel de Internacional Lo Espejo adentro — que es
 * exactamente el tipo de dato compilado que R4 vino a sacar del código.
 *
 * En un despliegue ajeno arranca vacío y se llena importando un paquete de
 * club o cargando el plantel a mano.
 */
export function bootClub(): ClubStore {
  const guardado = loadClub()
  if (guardado) return guardado

  const inicial = CLUB_BRAND.isDefaultHome
    ? CLUB_SEED
    : emptyClub(CLUB_BRAND.name || 'Mi Club')

  saveClub(inicial)
  return inicial
}
