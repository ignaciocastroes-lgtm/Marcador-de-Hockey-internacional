// Tres figuras distintas sobre el marcador, con pesos distintos en el acta.
let n=0; const uid=()=> 'e'+(++n)
let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

const gol = (st, team, actor) => ({ ...st,
  [team==='home'?'homeScore':'awayScore']: st[team==='home'?'homeScore':'awayScore']+1,
  matchLog:[...st.matchLog,{id:uid(),eventType:'gol',team,actor,details:'Gol'}] })

function annulGoal(st, team) {
  const goles = st.matchLog.filter(e=>e.eventType==='gol'&&e.team===team&&!e.anulado)
  const u = goles[goles.length-1]; if(!u) return st
  return { ...st,
    [team==='home'?'homeScore':'awayScore']: Math.max(0, st[team==='home'?'homeScore':'awayScore']-1),
    matchLog:[...st.matchLog.map(e=>e.id===u.id?{...e,anulado:true}:e),
      {id:uid(),eventType:'ajuste',team,details:`GOL ANULADO por el árbitro (#${u.actor})`}] }
}
function correctScore(st, team) {
  const actual = st[team==='home'?'homeScore':'awayScore']; if(actual<=0) return st
  const goles = st.matchLog.filter(e=>e.eventType==='gol'&&e.team===team&&!e.anulado)
  const u = goles[goles.length-1]
  return { ...st, [team==='home'?'homeScore':'awayScore']: actual-1,
    matchLog:[...st.matchLog.filter(e=>!u||e.id!==u.id),
      {id:uid(),eventType:'ajuste',team,details:'Marcador corregido por la mesa (gol cargado por error)'}] }
}
function scorePenalty(st, team, num) {
  const enTanda = st.period==='penales'
  const ev = {id:uid(),eventType:'gol',team,actor:num,details:enTanda?'Penal convertido (tanda)':'Gol de penal'}
  if (enTanda) return { ...st,
    [team==='home'?'homePenalties':'awayPenalties']: (st[team==='home'?'homePenalties':'awayPenalties']||0)+1,
    matchLog:[...st.matchLog, ev] }
  return { ...st, [team==='home'?'homeScore':'awayScore']: st[team==='home'?'homeScore':'awayScore']+1,
    matchLog:[...st.matchLog, ev] }
}
const base = ()=>({ homeScore:0, awayScore:0, homePenalties:0, awayPenalties:0, period:'1er_tiempo', matchLog:[] })
const golesVivos = st => st.matchLog.filter(e=>e.eventType==='gol'&&!e.anulado).length

// ── 1. El ÁRBITRO anula: el gol QUEDA en el acta ────────────────────────
let st = gol(base(),'home','7')
chk(st.homeScore===1, 'se cobra el gol')
st = annulGoal(st,'home')
chk(st.homeScore===0, 'anulado, el marcador baja')
chk(st.matchLog.some(e=>e.eventType==='gol'&&e.anulado), 'el gol SIGUE en el acta, marcado anulado')
chk(st.matchLog.some(e=>e.details.includes('ANULADO por el árbitro')), 'y queda consignado quién lo anuló')
chk(golesVivos(st)===0, 'pero ya no cuenta como gol válido')

// ── 2. La MESA se equivocó: el gol DESAPARECE ───────────────────────────
let m = gol(base(),'away','11')
m = correctScore(m,'away')
chk(m.awayScore===0, 'enmendado, el marcador baja igual')
chk(!m.matchLog.some(e=>e.eventType==='gol'), 'el gol NO queda en el acta: nunca existió')
chk(m.matchLog.some(e=>e.details.includes('error')), 'pero sí queda la traza de que la mesa corrigió')

// ── 3. La diferencia se ve en el papel ──────────────────────────────────
chk(st.matchLog.filter(e=>e.eventType==='gol').length === 1 &&
    m.matchLog.filter(e=>e.eventType==='gol').length === 0,
  'misma cifra en el marcador, distinto peso en el acta: 1 gol anulado vs 0')

// ── 4. Penal EN PARTIDO es gol ──────────────────────────────────────────
let p = scorePenalty(base(),'home','9')
chk(p.homeScore===1, 'penal en partido SUMA al marcador')
chk(p.homePenalties===0, 'y no toca el contador de la tanda')
chk(p.matchLog[0].details==='Gol de penal', 'el acta lo distingue de un gol de juego')

// ── 5. Penal EN LA TANDA no es gol ──────────────────────────────────────
let t = { ...base(), period:'penales' }
t = scorePenalty(t,'home','9')
chk(t.homeScore===0, 'penal en la tanda NO suma al marcador del partido')
chk(t.homePenalties===1, 'suma al contador de la tanda')

// ── 6. Anular sin goles no rompe nada ───────────────────────────────────
const vacio = annulGoal(base(),'home')
chk(vacio.homeScore===0 && vacio.matchLog.length===0, 'anular sin goles no hace nada')

// ── 7. Anular el último, no el primero ──────────────────────────────────
let dos = gol(gol(base(),'home','7'),'home','9')
dos = annulGoal(dos,'home')
const anulado = dos.matchLog.find(e=>e.anulado)
chk(anulado.actor==='9', 'se anula el ÚLTIMO gol, no el primero')
chk(dos.homeScore===1, 'y queda uno en pie')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
