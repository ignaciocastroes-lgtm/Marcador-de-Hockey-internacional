// Casos de la figura. Los ejecuta tests/figura.test.mjs contra lib/figura.ts.

let pasa=0, falla=0
const chk=(c: boolean,m: string)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

const jug = (id: string, n: string, po=false): any => ({ id, number: n, name: '', rut:'',
  position: po ? 'PO' : '', role: po ? 'portero' : 'jugador_pista' })
const base = (o: any = {}): any => ({
  period: '2do_tiempo', mainClock: 0, initialClockTime: 1500,
  homeScore: 0, awayScore: 0, homePossessionTime: 0, awayPossessionTime: 0,
  homeCourtIds: ['h1','h7','h9','h4','h5'], awayCourtIds: ['a1','a2','a3','a4','a5'],
  matchConfig: {
    homePlayers: [jug('h1','1',true), jug('h7','7'), jug('h9','9'), jug('h4','4'), jug('h5','5'), jug('h11','11')],
    awayPlayers: [jug('a1','1',true), jug('a2','2'), jug('a3','3'), jug('a4','4'), jug('a5','5')],
  },
  matchLog: [], cardHistory: [], ...o })
const gol = (team: string, n: string, anulado=false) =>
  ({ eventType:'gol', team, actor:n, period:'2do_tiempo', gameTime:600, details:'Gol', anulado })

// 1. Cinco goles en un equipo que PERDIO: es figura igual
let s = base({ homeScore: 5, awayScore: 7,
  matchLog: [...Array(5)].map(()=>gol('home','9')).concat([...Array(7)].map((_,i)=>gol('away', String((i%4)+2)))) })
let f = calcularFigura(s)
chk(f?.team==='home' && f?.dorsal==='9', `5 goles en un equipo que perdio 5-7 -> figura igual (#${f?.dorsal} ${f?.team})`)

// 2. Un expulsado no puede ser figura
s = base({ homeScore: 3, matchLog: [gol('home','7'),gol('home','7'),gol('home','7')],
  cardHistory: [{ team:'home', playerNumber:'7', cardType:'red', isBench:false }] })
f = calcularFigura(s)
chk(f?.dorsal !== '7', `tres goles pero roja -> NO es figura (quedo #${f?.dorsal})`)

// 3. Una roja ANULADA no la descalifica
s = base({ homeScore: 3, matchLog: [gol('home','7'),gol('home','7'),gol('home','7')],
  cardHistory: [{ team:'home', playerNumber:'7', cardType:'red', isBench:false, anulada:true }] })
chk(calcularFigura(s)?.dorsal === '7', 'si la roja fue anulada, vuelve a ser elegible')

// 4. Un gol anulado no suma
s = base({ homeScore: 1, matchLog: [gol('home','7',true), gol('home','9')] })
chk(calcularFigura(s)?.dorsal === '9', 'el gol anulado no cuenta para la figura')

// 5. REGLA DE LA PORTERA: empate y el rival tuvo mas la pelota
s = base({ homeScore: 1, awayScore: 1, homePossessionTime: 400, awayPossessionTime: 900,
  matchLog: [gol('home','7'), gol('away','3')] })
f = calcularFigura(s)
chk(f?.esPortera && f?.team==='home' && f?.via==='portera',
  `empate con menos pelota -> la portera del que aguanto (#${f?.dorsal}, "${f?.motivo}")`)

// 6. Ganar con menos posesion tambien la nomina
s = base({ homeScore: 1, awayScore: 0, homePossessionTime: 300, awayPossessionTime: 800,
  matchLog: [gol('home','7')] })
f = calcularFigura(s)
chk(f?.esPortera && f?.team==='home', `ganar 1-0 con menos pelota -> portera ("${f?.motivo}")`)

// 7. Pero un hat-trick le gana a la portera
s = base({ homeScore: 3, awayScore: 3, homePossessionTime: 400, awayPossessionTime: 900,
  matchLog: [gol('home','9'),gol('home','9'),gol('home','9'), gol('away','2'),gol('away','3'),gol('away','4')] })
f = calcularFigura(s)
chk(f?.dorsal==='9' && !f?.esPortera, 'tres goles siguen siendo el hecho del partido aunque se aguantara')

// 8. Desempate: mismos goles, menos tarjetas
s = base({ homeScore: 2, matchLog: [gol('home','7'), gol('home','9')],
  cardHistory: [{ team:'home', playerNumber:'7', cardType:'yellow', isBench:false }] })
chk(calcularFigura(s)?.dorsal === '9', 'mismos goles -> gana la que tiene menos tarjetas')

// 9. MINUTOS: la titular que jugo todo sin salir se cuenta
// Un solo periodo jugado
const m1 = minutosPorDorsal(base({ period: '1er_tiempo', mainClock: 0 }), 'home')
chk(m1['7'] === 25, `titular sin cambios, un periodo de 25 -> ${m1['7']} min (no cero)`)
// Partido completo: cuenta los DOS tiempos aunque el primero no tenga eventos
const m = minutosPorDorsal(base(), 'home')
chk(m['7'] === 50, `titular todo el partido (2x25) -> ${m['7']} min`)

// 10. Cambio a mitad: la que entro suma solo desde que entro
s = base({ homeCourtIds: ['h1','h11','h9','h4','h5'],
  matchLog: [
    { eventType:'cambio', team:'home', actor:'7',  period:'2do_tiempo', gameTime:900, details:'Sale de pista' },
    { eventType:'cambio', team:'home', actor:'11', period:'2do_tiempo', gameTime:900, details:'Ingresa a pista' },
  ] })
const m2 = minutosPorDorsal(s, 'home')
chk(m2['7'] === 35 && m2['11'] === 15,
  `cambio al 15:00 del 2do -> #7 jugo 25+10=${m2['7']} min, #11 entro y jugo ${m2['11']} min`)

// 11. Partido sin nada registrado: no inventa una figura
chk(calcularFigura(base({ homeCourtIds: [], awayCourtIds: [] })) === null,
  'sin goles, sin minutos ni nada -> no inventa figura')

console.log(`\n${pasa} pasan, ${falla} fallan`)
