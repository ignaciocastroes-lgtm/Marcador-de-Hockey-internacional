// ─────────────────────────────────────────────────────────────────────────────
// PAQUETE DE CLUB — R4
//
// Un archivo con el club entero: identidad, personas y series. Es lo que
// permite montar un despliegue en otro país sin tocar código — hasta ahora el
// plantel vivía compilado en `lib/club-roster.ts`, así que "instalar ARDI en
// otro club" significaba editar y recompilar el proyecto.
//
// Lleva el `clubId`, así que un paquete importado en otra máquina sigue siendo
// el MISMO club y los ids de sus personas siguen valiendo.
// ─────────────────────────────────────────────────────────────────────────────

import { type ClubStore, emptyClub } from '@/lib/club-store'

export const PACK_FORMAT = 'ardi:club'
export const PACK_VERSION = 1

export interface ClubPack {
  formato: typeof PACK_FORMAT
  version: number
  exportado: string
  club: ClubStore
}

export function buildClubPack(club: ClubStore): string {
  const pack: ClubPack = {
    formato: PACK_FORMAT,
    version: PACK_VERSION,
    exportado: new Date().toISOString(),
    club
  }
  return JSON.stringify(pack, null, 2)
}

export interface PackResult {
  club?: ClubStore
  error?: string
}

/**
 * Lee un paquete con desconfianza: un archivo que no es lo que dice ser tiene
 * que fallar acá con un motivo legible, no dejar el almacén a medio escribir.
 */
export function parseClubPack(text: string): PackResult {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { error: 'El archivo no es un JSON válido' } }

  const pack = raw as Partial<ClubPack>
  if (pack?.formato !== PACK_FORMAT) {
    return { error: 'Este archivo no es un paquete de club de ARDI' }
  }
  if (typeof pack.version !== 'number' || pack.version > PACK_VERSION) {
    return { error: `El paquete es de una versión más nueva (v${pack.version}). Actualiza ARDI.` }
  }
  const club = pack.club
  if (!club || !Array.isArray(club.personas) || !club.identity?.clubId || !club.identity?.prefix) {
    return { error: 'El paquete está incompleto: falta la identidad o el plantel' }
  }
  return {
    club: {
      ...emptyClub(club.nombre),
      ...club,
      version: 2,
      series: club.series || {}
    }
  }
}

export function downloadClubPack(club: ClubStore): void {
  const blob = new Blob([buildClubPack(club)], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `ardi-club-${club.identity.prefix.toLowerCase()}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}
