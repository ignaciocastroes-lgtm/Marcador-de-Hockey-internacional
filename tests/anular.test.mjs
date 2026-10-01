// Anular una tarjeta cargada por error: sale de las sanciones activas, queda
// marcada en el historial (el acta conserva la traza) y DEJA de acumular.
const uid = (n => () => 'id' + (++n))(0)

const contarAmarillas = (h, team, num) =>
  h.filter(c => !c.anulada && c.team===team && c.playerNumber===num && c.cardType==='yellow' && !c.isBench).length
const contarAzules = (h, team, num) =>
  h.filter(c => !c.anulada && c.team===team && c.playerNumber===num && c.cardType==='blue' && !c.isBench).length
const expulsado = (h, team, num) =>
  h.some(c => !c.anulada && c.team===team && c.playerNumber===num && c.cardType==='red')

// Escalada, igual que calculateCourtCardResult
function escalar(h, team, num, enviada) {
  if (expulsado(h, team, num)) return 'bloqueado'
  const am = contarAmarillas(h, team, num), az = contarAzules(h, team, num)
  if (enviada === 'red') return 'red'
  if (enviada === 'blue') return az >= 2 ? 'red' : 'blue'
  if (az >= 2) return 'red'
  if (am >= 1 || az >= 1) return 'blue'
  return 'yellow'
}

function sancionar(st, team, num, enviada) {
  const final = escalar(st.cardHistory, team, num, enviada)
  if (final === 'bloqueado') return st
  const cardId = uid()
  return {
    sanctions: [...st.sanctions, { id: uid(), team, type: final, playerNumber: num, isBench: false, cardId,
      remainingTime: final==='yellow'?0:final==='blue'?120:240 }],
    cardHistory: [...st.cardHistory, { id: cardId, team, playerNumber: num, cardType: final, isBench: false }],
  }
}

function anular(st, sancionId) {
  const s = st.sanctions.find(x => x.id === sancionId)
  if (!s) return st
  return {
    sanctions: st.sanctions.filter(x => x.id !== sancionId),
    cardHistory: st.cardHistory.map(c => c.id === s.cardId ? { ...c, anulada: true } : c),
  }
}

let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

let st = { sanctions: [], cardHistory: [] }

// 1. Amarilla por error al #7
st = sancionar(st, 'home', '7', 'yellow')
chk(st.sanctions.length===1 && st.sanctions[0].type==='yellow', 'la amarilla se carga')
chk(contarAmarillas(st.cardHistory,'home','7')===1, 'y cuenta para la acumulación')

// 2. Sin anular, la siguiente amarilla ESCALA a azul
chk(escalar(st.cardHistory,'home','7','yellow')==='blue',
  'sin anular, la siguiente amarilla escalaría a azul')

// 3. La mesa la anula
st = anular(st, st.sanctions[0].id)
chk(st.sanctions.length===0, 'sale de penalizaciones activas')
chk(st.cardHistory.length===1 && st.cardHistory[0].anulada===true,
  'NO se borra del historial: queda marcada (el acta conserva la traza)')
chk(contarAmarillas(st.cardHistory,'home','7')===0, 'DEJA de contar para la acumulación')

// 4. EL BUG QUE SE ARREGLA: la siguiente amarilla vuelve a ser amarilla
chk(escalar(st.cardHistory,'home','7','yellow')==='yellow',
  'tras anular, la siguiente amarilla NO escala (antes salía azul)')

// 5. Anular una roja devuelve al jugador a la pista
let r = { sanctions: [], cardHistory: [] }
r = sancionar(r, 'away', '3', 'red')
chk(expulsado(r.cardHistory,'away','3'), 'la roja expulsa')
r = anular(r, r.sanctions[0].id)
chk(!expulsado(r.cardHistory,'away','3'), 'anulada la roja, deja de estar expulsado')

// 6. Anular una de dos no borra la otra
let d = { sanctions: [], cardHistory: [] }
d = sancionar(d, 'home', '9', 'blue')
d = sancionar(d, 'home', '9', 'blue')
chk(contarAzules(d.cardHistory,'home','9')===2, 'dos azules acumuladas')
d = anular(d, d.sanctions[0].id)
chk(contarAzules(d.cardHistory,'home','9')===1, 'anular una deja la otra en pie')
chk(d.cardHistory.filter(c=>c.anulada).length===1, 'y sólo una queda marcada')

// 7. Anular dos veces no rompe nada
const antes = JSON.stringify(d)
d = anular(d, 'no-existe')
chk(JSON.stringify(d)===antes, 'anular un id inexistente no cambia nada')

// ── Lo que se PINTA tampoco cuenta una tarjeta anulada ──────────────────
// Reproduce los cuatro conteos visuales que la ignoraban: la ficha de
// castigo de PISTA, las amarillas y el "ya expulsado" de CONTROL, y las dos
// lecturas de PosModal (amarilla de banca y roja).
const tally      = (h,t,n) => h.filter(c => !c.anulada && c.team===t && c.playerNumber===n).length
const expulsado2 = (h,t,n) => h.some(c => !c.anulada && c.team===t && c.playerNumber===n && c.cardType==='red')
const bancaAm    = (h,t)   => h.some(c => !c.anulada && c.team===t && c.isBench && c.cardType==='yellow')

let v = { sanctions:[], cardHistory:[] }
v = sancionar(v,'home','7','yellow')
chk(tally(v.cardHistory,'home','7')===1, 'la ficha pinta la amarilla')
v = anular(v, v.sanctions[0].id)
chk(tally(v.cardHistory,'home','7')===0, 'anulada, la ficha queda limpia al toque')

let r2 = sancionar({sanctions:[],cardHistory:[]},'away','3','red')
chk(expulsado2(r2.cardHistory,'away','3'), 'CONTROL lo marca expulsado')
r2 = anular(r2, r2.sanctions[0].id)
chk(!expulsado2(r2.cardHistory,'away','3'), 'anulada la roja, deja de estar deshabilitado en la grilla')

const banca = { cardHistory:[{ team:'home', isBench:true, cardType:'yellow', anulada:true }] }
chk(!bancaAm(banca.cardHistory,'home'), 'una amarilla de banca anulada no hace creer que ya se pinto')

// ── El acta tampoco: grilla posicional y goles ─────────────────────────
const grilla = (h,t,n,tipo) => h.filter(c => !c.anulada && c.team===t && c.playerNumber===n && c.cardType===tipo).length
const hist = [
  { team:'home', playerNumber:'7', cardType:'yellow' },
  { team:'home', playerNumber:'7', cardType:'yellow', anulada:true },
]
chk(grilla(hist,'home','7','yellow')===1,
  'la grilla del acta no reserva casillero para una tarjeta anulada')

const log = [
  { eventType:'gol', team:'home', period:'1er_tiempo' },
  { eventType:'gol', team:'home', period:'1er_tiempo', anulado:true },
]
const golesPeriodo = (l,t,p) => l.filter(e => !e.anulado && e.team===t && e.eventType==='gol' && e.period===p).length
chk(golesPeriodo(log,'home','1er_tiempo')===1,
  'el desglose por periodo del acta cuadra con el marcador')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
