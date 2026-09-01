import Papa from 'papaparse'
import { Player } from '@/hooks/use-game-state'

// ─── Generador único de IDs ─────────────────────────────────────────────────
const uid = () => crypto.randomUUID()

// ─── 1. Generador de Roster para Modo Express ────────────────────────────────
export interface ExpressEntry { number: string; isGoalie: boolean }

export const generateExpressRoster = (entries?: ExpressEntry[]): Player[] => {
  const players: Player[] = []

  // Fichas cargadas por el operador. Si no marcó ningún portero, se toma el
  // primero — el portero se puede reasignar en partido desde la ficha.
  if (entries && entries.length > 0) {
    const hayPortero = entries.some(e => e.isGoalie)
    entries.forEach((e, i) => {
      const esPortero = e.isGoalie || (!hayPortero && i === 0)
      players.push({
        id: uid(), number: e.number, name: '', rut: '',
        position: esPortero ? 'PO' : '',
        role: esPortero ? 'portero' : 'jugador_pista'
      })
    })
  } else {
    players.push({ id: uid(), number: '1',  name: 'Portero 1',        rut: '', position: 'PO', role: 'portero' })
    players.push({ id: uid(), number: '10', name: 'Portero 2',        rut: '', position: 'PO', role: 'portero' })
    for (let i = 2; i <= 9; i++) {
      players.push({ id: uid(), number: i.toString(), name: `Jugador ${i}`, rut: '', position: '', role: 'jugador_pista' })
    }
  }

  players.push({ id: uid(), number: 'DT',  name: 'Director Tecnico', rut: '', position: '', role: 'dt' })
  players.push({ id: uid(), number: 'AY1', name: 'Ayudante 1',       rut: '', position: '', role: 'ay1' })
  players.push({ id: uid(), number: 'AY2', name: 'Ayudante 2',       rut: '', position: '', role: 'ay2' })
  players.push({ id: uid(), number: 'AX1', name: 'Auxiliar 1',       rut: '', position: '', role: 'ax1' })
  players.push({ id: uid(), number: 'AX2', name: 'Auxiliar 2',       rut: '', position: '', role: 'ax2' })

  return players
}

// ─── 2. Exportar Roster a CSV ────────────────────────────────────────────────
export const downloadRosterCSV = (
  players: Player[],
  teamName: string,
  seriesName: string,
  gender: string
) => {
  const rows: string[][] = [
    [`PLANILLA DE JUGADORES - ${teamName}`],
    ['Serie', seriesName],
    ['Rama', gender],
    [],
    ['Numero', 'Nombre', 'Rol', 'RUT'],
  ]

  players.forEach(p => {
    rows.push([
      p.number,
      p.name,
      (p.role ?? '').replace('_', ' '),
      p.rut ?? '',
    ])
  })

  const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `roster_${teamName.replace(/\s+/g, '_')}_${seriesName}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ─── 3. Procesar importación de CSV con papaparse ────────────────────────────
// Acepta cualquier CSV con columnas Numero/# y opcionalmente Nombre, Rol, RUT.
// Tolerante a: BOM UTF-8, separadores coma/punto-y-coma, celdas con comas.
export const processRosterImport = (file: File): Promise<Player[]> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
      complete: (results) => {
        try {
          // Detectar la columna de número de camiseta
          const sample = results.data[0] ?? {}
          const numKey =
            Object.keys(sample).find(k => ['numero', 'number', 'num', ''].includes(k)) ??
            Object.keys(sample)[0]

          const players: Player[] = []

          results.data.forEach((row, i) => {
            const rawNum = (row[numKey] ?? '').trim()
            // Sólo filas con número numérico válido
            if (!rawNum || isNaN(parseInt(rawNum))) return

            const rawRole = (row['rol'] ?? row['role'] ?? '').trim().toLowerCase().replace(/\s+/g, '_')

            players.push({
              id: uid(),
              number: rawNum,
              name: (row['nombre'] ?? row['name'] ?? '').trim(),
              rut: (row['rut'] ?? row['rut_'] ?? '').trim(),
              position: '',
              role: (rawRole as Player['role']) || 'jugador_pista',
            })
          })

          if (players.length === 0) {
            reject(new Error('No se encontraron jugadores válidos en el archivo'))
          } else {
            resolve(players)
          }
        } catch {
          reject(new Error('Error al procesar el archivo CSV'))
        }
      },
      error: () => reject(new Error('Error de lectura de archivo')),
    })
  })
