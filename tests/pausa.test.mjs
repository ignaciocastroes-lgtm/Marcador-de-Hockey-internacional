// Descanso y suspension no son lo mismo. Esta prueba fija la diferencia.
let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }
const SIG = { '1er_tiempo':'2do_tiempo', '2do_tiempo':null }

const startIntermission = (st, min) => ({ ...st,
  isIntermission:true, pauseKind:'descanso', clockBeforePause:st.mainClock,
  mainClock:min*60, isMainClockRunning:false })

const suspendMatch = st => ({ ...st,
  isIntermission:true, pauseKind:'suspension', clockBeforePause:st.mainClock,
  isMainClockRunning:false,
  matchLog:[...st.matchLog,{details:'PARTIDO SUSPENDIDO'}] })

function endIntermission(st) {
  if (st.pauseKind === 'suspension') {
    return { ...st, isIntermission:false, pauseKind:undefined,
      mainClock: st.clockBeforePause ?? st.mainClock,
      matchLog:[...st.matchLog,{details:'Partido REANUDADO'}] }
  }
  return { ...st, isIntermission:false, pauseKind:undefined,
    mainClock: st.initialClockTime, period: SIG[st.period] ?? st.period }
}

const base = () => ({ period:'2do_tiempo', mainClock:14*60+22, initialClockTime:25*60,
  isIntermission:false, matchLog:[] })

// ── SUSPENSION en el segundo tiempo: el caso que fallaba ────────────────
let st = base()
const minuto = st.mainClock
st = suspendMatch(st)
chk(st.pauseKind==='suspension', 'queda marcado como suspension, no como descanso')
chk(st.matchLog.some(e=>e.details==='PARTIDO SUSPENDIDO'), 'y queda en el acta')
st = endIntermission(st)
chk(st.period==='2do_tiempo', 'al reanudar NO avanza de periodo (antes saltaba)')
chk(st.mainClock===minuto, `vuelve al MISMO minuto: ${Math.floor(minuto/60)}:${String(minuto%60).padStart(2,'0')}`)
chk(st.matchLog.some(e=>e.details==='Partido REANUDADO'), 'la reanudacion tambien queda escrita')

// ── DESCANSO: sigue avanzando, que es lo correcto ───────────────────────
let d = { ...base(), period:'1er_tiempo', mainClock:0 }
d = startIntermission(d, 10)
chk(d.mainClock===600 && d.pauseKind==='descanso', 'el descanso pone su cuenta atras')
d = endIntermission(d)
chk(d.period==='2do_tiempo', 'al terminar el descanso SI avanza de periodo')
chk(d.mainClock===25*60, 'y repone el reloj de juego entero')

// ── Suspender durante un descanso no lo convierte en periodo nuevo ──────
let x = { ...base(), period:'1er_tiempo', mainClock:3*60 }
x = suspendMatch(x)
x = endIntermission(x)
chk(x.period==='1er_tiempo' && x.mainClock===3*60,
  'suspender en el primer tiempo tambien vuelve donde estaba')


// ── EL BUG: tocar un lado de la pista arrancaba el reloj con el partido
// suspendido. `darPosesion` ya estaba guardada; el gesto de PISTA llamaba a
// una copia sin guarda (resetPossessionLeft/Right). Ahora delegan en la misma.
const darPosesion = (st, lado) => {
  if (st.isIntermission || st.activeTimeout || st.isMatchEnded) return st
  return { ...st, isMainClockRunning: true,
    isPossessionLeftRunning: lado === 'left', isPossessionRightRunning: lado === 'right' }
}
let sus = { isIntermission: true, pauseKind: 'suspension', isMainClockRunning: false, activeTimeout: null, isMatchEnded: false, isPossessionLeftRunning: false }
sus = darPosesion(sus, 'left')
chk(sus.isMainClockRunning === false, 'partido suspendido: tocar un lado de la pista NO arranca el reloj')
chk(sus.isPossessionLeftRunning === false, 'tampoco enciende el 45 de ese lado')

let libre = { isIntermission: false, activeTimeout: null, isMainClockRunning: false, isMatchEnded: false }
libre = darPosesion(libre, 'left')
chk(libre.isMainClockRunning === true, 'partido en juego: tocar un lado SI arranca el reloj, como siempre')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
