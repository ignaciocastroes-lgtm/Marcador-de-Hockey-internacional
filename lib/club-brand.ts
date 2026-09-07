// ─────────────────────────────────────────────────────────────────────────────
// IDENTIDAD DEL CLUB
//
// Este es el ÚNICO archivo que se edita para personalizar un despliegue.
// Modelo "una URL por club": se clona el proyecto, se cambian estos valores,
// se despliega en su propio dominio. Nada más hay que tocar.
//
// EL ESCUDO VA EN /public/escudos/, NO EN UN HOST EXTERNO.
// Un escudo servido desde ImgBB (o cualquier CDN de terceros) necesita
// internet la primera vez que se abre cada ventana, y este producto se usa en
// gimnasios sin señal. Además lo cachea el service worker sólo si viene del
// mismo origen. `logoUrlFallback` existe para no romper despliegues que
// todavía apuntan afuera: si el archivo local no está, se usa el remoto y se
// sigue viendo igual. En cuanto el .webp esté en su carpeta, la red deja de
// hacer falta.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClubBrand {
  /** Nombre del club dueño de este despliegue. '' = despliegue genérico. */
  name: string
  /** Nombre corto para espacios angostos. */
  shortName: string
  /** Escudo del club. Preferir una ruta local tipo '/escudos/mi-club.webp'. */
  logoUrl: string
  /**
   * Respaldo si `logoUrl` no carga (típicamente, la URL externa que se usaba
   * antes de mover el archivo a /public/escudos/). Dejar '' cuando el archivo
   * local ya esté en su lugar.
   */
  logoUrlFallback: string
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
  logoUrl: '/escudos/internacional-lo-espejo.webp',
  logoUrlFallback: 'https://i.ibb.co/0jx754rd/Internacional-Lo-Espejo-N.webp',
  appTitle: 'ARDI Marcador Hockey Patín PRO',
  isDefaultHome: true
}

/** Nombre a mostrar cuando todavía no hay equipo local configurado. */
export const defaultHomeName = (): string =>
  CLUB_BRAND.isDefaultHome && CLUB_BRAND.shortName ? CLUB_BRAND.shortName : 'LOCAL'

/** Escudo local por defecto, si el club es el dueño del despliegue. */
export const defaultHomeLogo = (): string | null =>
  CLUB_BRAND.isDefaultHome && CLUB_BRAND.logoUrl ? CLUB_BRAND.logoUrl : null

/**
 * Handler de `onError` para cualquier <img> que muestre el escudo del club:
 * cae al respaldo una sola vez y no vuelve a intentar, así una ruta rota no
 * genera un bucle de peticiones fallidas.
 */
export const clubLogoFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget
  if (!CLUB_BRAND.logoUrlFallback || img.dataset.fellBack === '1') return
  img.dataset.fellBack = '1'
  img.src = CLUB_BRAND.logoUrlFallback
}
