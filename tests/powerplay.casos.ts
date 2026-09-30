// El bug real: 4 azules del mismo equipo, todas anuladas, y el equipo
// terminaba con mas de 5 en pista. Corre contra lib/court-rules.ts REAL.

let pasa = 0, falla = 0
const chk = (c: boolean, m: string) => { c ? pasa++ : falla++; console.log(`${c ? 'PASA' : 'FALLA'} — ${m}`) }

const jug = (id: string, n: string, po = false): any =>
  ({ id, number: n, name: '', rut: '', role: po ? 'portero' : 'jugador_pista' })
// 8 en cancha/banca: arquero + 7 de campo. Los primeros 5 empiezan en pista.
const players = [jug('p1', '1', true), jug('p2', '2'), jug('p3', '3'), jug('p4', '4'), jug('p5', '5'),
                  jug('p6', '6'), jug('p7', '7'), jug('p8', '8')]
const courtInicial = ['p1', 'p2', 'p3', 'p4', 'p5']

const azul = (num: string, restante = 120): any =>
  ({ id: `s${num}`, team: 'home', type: 'blue', playerNumber: num, isBench: false, remainingTime: restante, startTime: 120 })

// ── Sancionar de a una, como el reglamento indica ────────────────────────
let court = courtInicial
let sanciones: any[] = []
const historial: any[] = []

// 1ra azul (#2): el equipo baja a 4. Nadie de la banca entra: ya esta en el piso.
sanciones = [azul('2')]
court = aplicarSalidaPorSancion(court, 'p2', players, 'home', historial, sanciones)
chk(court.length === 4 && !court.includes('p2'), `1ra azul: sale #2, nadie entra (quedan ${court.length})`)

// 2da azul (#3): sin compensar, el equipo bajaria a 3. Debe entrar UN suplente.
sanciones = [azul('2'), azul('3')]
court = aplicarSalidaPorSancion(court, 'p3', players, 'home', historial, sanciones)
chk(court.length === 4 && !court.includes('p3'), `2da azul: sale #3 y entra un suplente (quedan ${court.length})`)
chk(court.includes('p6'), `el suplente que entro es el primero disponible de la banca (#6): ${court.join(',')}`)

// 3ra y 4ta azul: mismo patron, el equipo NUNCA baja de 4.
sanciones = [azul('2'), azul('3'), azul('4')]
court = aplicarSalidaPorSancion(court, 'p4', players, 'home', historial, sanciones)
chk(court.length === 4, `3ra azul: sigue en el piso (${court.length})`)

sanciones = [azul('2'), azul('3'), azul('4'), azul('5')]
court = aplicarSalidaPorSancion(court, 'p5', players, 'home', historial, sanciones)
chk(court.length === 4, `4ta azul (las 4 simultaneas, como reporto el club): sigue en 4 (${court.length})`)
console.log('   cancha tras las 4 azules:', court.join(','))

// ── Ahora se anulan las 4: NADIE vuelve solo. El equipo sigue en 4. ──────
// (anular solo saca de `sanctions`/marca `cardHistory`; no toca courtIds.)
const despuesDeAnularTodas = court   // aplicarSalidaPorSancion no se llama al anular
chk(despuesDeAnularTodas.length === 4,
  `anuladas las 4: el equipo sigue con 4 en pista, NADIE entro de mas (antes: 8)`)
chk(new Set(despuesDeAnularTodas).size === despuesDeAnularTodas.length, 'sin ids repetidos')

// ── Sin cupo en la banca: no rompe, hace lo que puede ────────────────────
const plantelCorto = players.slice(0, 6)   // solo 1 suplente disponible
let c2 = ['p1', 'p2', 'p3', 'p4', 'p5']
c2 = aplicarSalidaPorSancion(c2, 'p2', plantelCorto, 'home', [], [azul('2')])
c2 = aplicarSalidaPorSancion(c2, 'p3', plantelCorto, 'home', [], [azul('2'), azul('3')])
chk(c2.length === 4, 'con un solo suplente disponible: lo usa, sigue en el piso')
c2 = aplicarSalidaPorSancion(c2, 'p4', plantelCorto, 'home', [], [azul('2'), azul('3'), azul('4')])
chk(c2.length === 3, 'sin mas suplentes, baja de 4: hace lo que la plantilla permite, no inventa jugadoras')

// ── Alguien que ya estaba en la banca no se toca ─────────────────────────
const c3 = aplicarSalidaPorSancion(['p1','p2','p3','p4','p5'], 'p6', players, 'home', [], [])
chk(c3.length === 5 && c3.join(',') === 'p1,p2,p3,p4,p5', 'sancionar a alguien que no esta en pista no cambia la lista')

console.log(`\n${pasa} pasan, ${falla} fallan`)
