// ─────────────────────────────────────────────────────────────────────────────
// PLANTEL DEL CLUB
//
// Modelo: el numero pertenece a la PERSONA, no a la serie. Una jugadora lleva
// su numero en su serie y lo lleva tambien cuando la citan a una serie mayor.
// Cada serie es una SELECCION del plantel del club, no una lista aparte.
//
// Consecuencia: dos jugadoras del club pueden compartir numero sin problema
// mientras no coincidan en la misma citacion. Cuando coinciden hay que
// resolverlo antes del partido; detectClashes() lo detecta.
//
// PRIVACIDAD: aqui NO van RUT ni documentos de identidad. Las citaciones los
// llevan porque son documentos internos, pero este archivo se versiona en el
// repositorio y la mayoria del plantel son menores de edad. Solo nombre y
// numero, que es lo unico que el marcador necesita.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClubPlayer {
  id: string
  number: string
  name: string
  isGoalie?: boolean
}

export interface ClubStaff { id: string; name: string; role: 'dt' | 'ay1' | 'ay2' | 'ax1' | 'ax2' }

/** Plantel de Internacional Lo Espejo, temporada 2026. */
export const CLUB_PLAYERS: ClubPlayer[] = [
  { id: 'p-keily',      number: '19', name: 'Keily Lorca',        isGoalie: true },
  { id: 'p-genesis',    number: '85', name: 'Genesis Cardenas',   isGoalie: true },
  { id: 'p-sofiav',     number: '94', name: 'Sofia Vargas',       isGoalie: true },
  { id: 'p-ayanai',     number: '15', name: 'Ayanai Jimenez' },
  { id: 'p-colomba',    number: '22', name: 'Colomba Godoy' },
  { id: 'p-pascale',    number: '7',  name: 'Pascale Celis' },
  { id: 'p-montserrat', number: '9',  name: 'Montserrat Herrera' },
  { id: 'p-rafaella',   number: '87', name: 'Rafaella Figueroa' },
  { id: 'p-matildac',   number: '24', name: 'Matilda Caceres' },
  { id: 'p-matildas',   number: '13', name: 'Matilda Salinas' },
  { id: 'p-vivian',     number: '21', name: 'Vivian Castro' },
  { id: 'p-sofiam',     number: '14', name: 'Sofia Matus' },
  { id: 'p-amira',      number: '3',  name: 'Amira Zavala' },
  { id: 'p-ariadny',    number: '20', name: 'Ariadny Olivares' },
  { id: 'p-matildar',   number: '23', name: 'Matilda Rojas' },
  { id: 'p-ignacia',    number: '12', name: 'Ignacia Gallardo' },
  { id: 'p-amancay',    number: '17', name: 'Amancay Vasquez' },
  { id: 'p-eloisa',     number: '20', name: 'Eloisa Figueroa' }   // mismo 20 que Ariadny
]

export const CLUB_STAFF: ClubStaff[] = [
  { id: 's-facundo',  name: 'Facundo Oyola',      role: 'dt' },
  { id: 's-rodolfo',  name: 'Rodolfo Oyola',      role: 'ay1' },
  { id: 's-rodrigo',  name: 'Rodrigo Quintanilla', role: 'ax1' }
]

/** Que jugadoras integran cada serie. Ids del plantel, no copias. */
export const SERIE_SQUADS: Record<string, string[]> = {
  sub13f: ['p-keily', 'p-ayanai', 'p-colomba', 'p-pascale', 'p-montserrat',
           'p-rafaella', 'p-matildac', 'p-matildas', 'p-vivian', 'p-genesis'],
  sub15f: ['p-keily', 'p-sofiam', 'p-amira', 'p-ariadny', 'p-matildar',
           'p-ignacia', 'p-ayanai', 'p-colomba', 'p-amancay', 'p-genesis'],
  sub17f: ['p-sofiav', 'p-eloisa', 'p-sofiam', 'p-ariadny', 'p-ignacia',
           'p-ayanai', 'p-vivian', 'p-pascale'],
  sub19f: [],
  adultaf: [],
  escuelita: [], sub10: [], sub11: [], sub17m: [], sub23m: []
}

export const playerById = (id: string): ClubPlayer | undefined =>
  CLUB_PLAYERS.find(p => p.id === id)

export const squadFor = (serieId: string): ClubPlayer[] =>
  (SERIE_SQUADS[serieId] || []).map(playerById).filter(Boolean) as ClubPlayer[]

export interface Clash { number: string; players: ClubPlayer[] }

/**
 * Dos citadas con el mismo numero. Hay que resolverlo ANTES del partido: si no,
 * el motor de tarjetas no puede distinguirlas y las sanciones de una se le
 * acumulan a la otra.
 */
export function detectClashes(players: ClubPlayer[]): Clash[] {
  const byNumber = new Map<string, ClubPlayer[]>()
  players.forEach(p => byNumber.set(p.number, [...(byNumber.get(p.number) || []), p]))
  return Array.from(byNumber.entries())
    .filter(([, list]) => list.length > 1)
    .map(([number, list]) => ({ number, players: list }))
}
