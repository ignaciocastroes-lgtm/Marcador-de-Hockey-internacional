// ─────────────────────────────────────────────────────────────────────────────
// SERIES DE HOCKEY PATIN — estructura real de la competencia chilena.
// La rama es parte de la identidad de la serie, no un campo aparte: no existe
// "Sub-13 masculino", existe Sub-13 femenina. Por eso van juntas.
// ─────────────────────────────────────────────────────────────────────────────

export type Gender = 'mixto' | 'femenino' | 'masculino'

export interface Serie {
  id: string
  label: string
  gender: Gender
  /** Orden de menor a mayor edad, para los selectores. */
  order: number
}

export const SERIES: Serie[] = [
  { id: 'escuelita',   label: 'Escuelita',        gender: 'mixto',     order: 1 },
  { id: 'sub10',       label: 'Sub-10',           gender: 'mixto',     order: 2 },
  { id: 'sub11',       label: 'Sub-11',           gender: 'mixto',     order: 3 },
  { id: 'sub13f',      label: 'Sub-13',           gender: 'femenino',  order: 4 },
  { id: 'sub15f',      label: 'Sub-15',           gender: 'femenino',  order: 5 },
  { id: 'sub17f',      label: 'Sub-17',           gender: 'femenino',  order: 6 },
  { id: 'sub19f',      label: 'Sub-19',           gender: 'femenino',  order: 7 },
  { id: 'adultaf',     label: 'Adulta',           gender: 'femenino',  order: 8 },
  { id: 'sub17m',      label: 'Sub-17',           gender: 'masculino', order: 9 },
  { id: 'sub23m',      label: 'Sub-23',           gender: 'masculino', order: 10 }
]

const GENDER_SHORT: Record<Gender, string> = {
  mixto: 'Mixto', femenino: 'Fem', masculino: 'Masc'
}

/** "Sub-13 Fem" — lo que ve el operador en el selector. */
export const serieLabel = (s: Serie): string =>
  s.gender === 'mixto' && s.label === 'Escuelita' ? s.label : `${s.label} ${GENDER_SHORT[s.gender]}`

export const findSerie = (id: string): Serie | undefined => SERIES.find(s => s.id === id)

export const SERIES_ORDERED = [...SERIES].sort((a, b) => a.order - b.order)
