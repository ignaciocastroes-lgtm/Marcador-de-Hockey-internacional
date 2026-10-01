// ─────────────────────────────────────────────────────────────────────────────
// LIGA CENTRAL DE CHILE — catálogo de clubes
//
// Los clubes con los que se juega cada fecha, con su escudo. Sirve para dar de
// alta un rival de un toque en vez de escribir el nombre y buscar la imagen.
//
// Los escudos están alojados fuera (ImgBB). No es un descuido: el service
// worker los guarda en caché la primera vez que se ven —regla de "caché
// primero" para imágenes de otro dominio— así que a partir de ahí el marcador
// los muestra sin red. La primera carga sí necesita conexión.
//
// Dar de alta un club desde aquí NO crea planteles: crea el club con su escudo
// y sus series vacías. Las camisetas se cargan por serie, como siempre.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClubCatalogo {
  nombre: string
  escudo: string
}

export const LIGA = 'Liga Central de Chile'

export const CLUBES_LIGA_CENTRAL: ClubCatalogo[] = [
  { nombre: 'BATA',                    escudo: 'https://i.ibb.co/ksDsKL0y/Bata-N.webp' },
  { nombre: 'ESTUDIANTIL SAN MIGUEL',  escudo: 'https://i.ibb.co/JWkJqFsq/Estudiantil-San-Miguel-N.webp' },
  { nombre: 'EVERTON',                 escudo: 'https://i.ibb.co/jkP46QMg/Everton-N.webp' },
  { nombre: 'HUACHIPATO',              escudo: 'https://i.ibb.co/zV0MwMhn/Huachipato.webp' },
  { nombre: 'HUECHURABA',              escudo: 'https://i.ibb.co/NfYxP7g/Huechuraba-N.webp' },
  { nombre: 'IDF',                     escudo: 'https://i.ibb.co/ZRRz4Chx/IDF-N.webp' },
  { nombre: 'INTERNACIONAL LO ESPEJO', escudo: 'https://i.ibb.co/0jx754rd/Internacional-Lo-Espejo-N.webp' },
  { nombre: 'KELLUN',                  escudo: 'https://i.ibb.co/7dgfw1kd/kellun-N.webp' },
  { nombre: 'LEÓN PRADO',              escudo: 'https://i.ibb.co/5hdchdsC/Le-n-Prado-N.webp' },
  { nombre: 'MARRUECOS',               escudo: 'https://i.ibb.co/4nRPgJJx/Marruecos-N.webp' },
  { nombre: 'PALESTINO',               escudo: 'https://i.ibb.co/YBmC74mv/Palestino-N.webp' },
  { nombre: 'RED STAR',                escudo: 'https://i.ibb.co/0RXsgkDj/Red-Star-N.webp' },
  { nombre: 'RHINOS',                  escudo: 'https://i.ibb.co/wZZHgVLV/Rhinos-N.webp' },
  { nombre: 'SAGU',                    escudo: 'https://i.ibb.co/kbjRzNR/sagu-N.webp' },
  { nombre: 'SAN JORGE',               escudo: 'https://i.ibb.co/4Z2PYzrL/San-Jorge-N.webp' },
  { nombre: 'VILANOVA',                escudo: 'https://i.ibb.co/QFDz7jPM/Vilanova.webp' },
]

/** El escudo de un club del catálogo, por nombre. Vacío si no está. */
export function escudoDe(nombre: string): string {
  const n = nombre.trim().toUpperCase()
  return CLUBES_LIGA_CENTRAL.find(c => c.nombre.toUpperCase() === n)?.escudo || ''
}
