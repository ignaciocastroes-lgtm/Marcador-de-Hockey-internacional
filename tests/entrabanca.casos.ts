// "Entra por banca": tocar a alguien de la banca es el gesto principal para
// hacerlo entrar, tanto portero como jugador de campo. Corre contra
// lib/court-rules.ts REAL — isGoalie, getLineup, resolveSubstitution.

let pasa = 0, falla = 0
const chk = (c: boolean, m: string) => { c ? pasa++ : falla++; console.log(`${c ? 'PASA' : 'FALLA'} — ${m}`) }

const jug = (id: string, n: string, po = false): any =>
  ({ id, number: n, name: '', rut: '', role: po ? 'portero' : 'jugador_pista' })
const players = [jug('h1', '1', true), jug('h2', '2', true), jug('h3', '3'), jug('h4', '4'),
                  jug('h5', '5'), jug('h6', '6'), jug('h7', '7'), jug('h8', '8')]
const courtCompleto = ['h1', 'h3', 'h4', 'h5', 'h6']   // portero #1 + 4 de campo = 5, al tope

// ── Portero suplente entra: el cambio con el portero actual es el UNICO
//    valido, se resuelve directo sin preguntar nada. ────────────────────
const porteroEntrante = players.find(p => p.id === 'h2')!
const lineup = getLineup(players, courtCompleto, 'home', [], [])
chk(!!lineup.goalie && lineup.goalie.id === 'h1', 'el portero actual en cancha es #1')
const swapPortero = resolveSubstitution(porteroEntrante, lineup.goalie!, 'home', courtCompleto, players, [], [])
chk(swapPortero.ok, 'el cambio de portero por portero es valido')
if (swapPortero.ok) {
  chk(swapPortero.ids.includes('h2') && !swapPortero.ids.includes('h1'),
    `entra #2, sale #1 — cancha: ${swapPortero.ids.join(',')}`)
  chk(swapPortero.ids.length === 5, 'la cancha sigue en 5 (ni mas ni menos)')
}

// ── Jugador de campo entra sin cupo: se filtra a candidatos de CAMPO,
//    el portero actual NUNCA aparece como opcion para salir. ────────────
const campoEntrante = players.find(p => p.id === 'h7')!
const enCancha = players.filter(p => courtCompleto.includes(p.id) && !isGoalie(p))
const opciones = enCancha.filter(p =>
  resolveSubstitution(campoEntrante, p, 'home', courtCompleto, players, [], []).ok
)
chk(opciones.length === 4 && opciones.every(p => !isGoalie(p)),
  `las opciones para salir son solo de campo (${opciones.map(p => p.number).join(',')})`)
chk(!opciones.some(p => p.id === 'h1'), 'el portero NUNCA aparece como opcion para salir en este camino')

const swapCampo = resolveSubstitution(campoEntrante, players.find(p => p.id === 'h3')!, 'home', courtCompleto, players, [], [])
chk(swapCampo.ok && swapCampo.ids.includes('h7') && !swapCampo.ids.includes('h3') && swapCampo.ids.length === 5,
  `entra #7, sale #3 — cancha: ${swapCampo.ok ? swapCampo.ids.join(',') : swapCampo.reason}`)

// ── Un expulsado no puede entrar por ningun camino, ni portero ni campo ──
const historialRoja: any[] = [{ team: 'home', playerNumber: '2', cardType: 'red', isBench: false }]
const expulsadoEntra = resolveSubstitution(porteroEntrante, lineup.goalie!, 'home', courtCompleto, players, historialRoja, [])
chk(!expulsadoEntra.ok, 'un portero suplente expulsado no puede entrar ni con el cambio directo')

console.log(`\n${pasa} pasan, ${falla} fallan`)
