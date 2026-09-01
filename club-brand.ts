// ─────────────────────────────────────────────────────────────────────────────
// IDENTIDAD DEL CLUB
//
// Este es el ÚNICO archivo que se edita para personalizar un despliegue.
// Modelo "una URL por club": se clona el proyecto, se cambian estos valores,
// se despliega en su propio dominio. Nada más hay que tocar.
//
// El escudo puede venir de dos lados:
//   1. URL externa (ImgBB, etc.) — cómodo, pero necesita red la primera vez.
//   2. Archivo en /public/escudos/ — mismo origen, lo cachea el service worker
//      y funciona sin internet incluso en una ventana recién abierta.
// Para un despliegue de cliente conviene la segunda: es la que sobrevive a un
// gimnasio sin señal.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClubBrand {
  /** Nombre del club dueño de este despliegue. '' = despliegue genérico. */
  name: string
  /** Nombre corto para espacios angostos. */
  shortName: string
  /** Escudo del club: URL externa o ruta local tipo '/escudos/mi-club.webp'. */
  logoUrl: string
  /** Rótulo de la barra superior de la mesa de control. */
  appTitle: string
  /**
   * Si es true, el club es el equipo LOCAL por defecto en cada partido nuevo:
   * su nombre y su escudo aparecen precargados. El operador puede cambiarlo.
   */
  isDefaultHome: boolean
}

export const CLUB_BRAND: ClubBrand = {
  name: 'INTERNACIONAL LO ESPEJO',
  shortName: 'INTERNACIONAL',
  logoUrl: 'https://i.ibb.co/0jx754rd/Internacional-Lo-Espejo-N.webp',
  appTitle: 'ARDI Marcador Hockey Patín PRO',
  isDefaultHome: true
}

/** Nombre a mostrar cuando todavía no hay equipo local configurado. */
export const defaultHomeName = (): string =>
  CLUB_BRAND.isDefaultHome && CLUB_BRAND.shortName ? CLUB_BRAND.shortName : 'LOCAL'

/** Escudo local por defecto, si el club es el dueño del despliegue. */
export const defaultHomeLogo = (): string | null =>
  CLUB_BRAND.isDefaultHome && CLUB_BRAND.logoUrl ? CLUB_BRAND.logoUrl : null
