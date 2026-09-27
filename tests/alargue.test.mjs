// El alargue son DOS periodos, con gol de oro o de plata, y dos tiempos de
// banca por equipo en cada uno de los cuatro periodos.
let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

const esAlargue = p => p === 'alargue' || p === 'alargue2'
const duracion = (cfg,p) => (esAlargue(p) ? (cfg.overtimeDuration || cfg.periodDuration) : cfg.periodDuration) * 60

function siguiente(st) {
  const iguales = st.homeScore === st.awayScore, c = st.matchConfig
  switch (st.period) {
    case '1er_tiempo': return '2do_tiempo'
    case '2do_tiempo':
      if (iguales && c.allowOvertime) return 'alargue'
      if (iguales && c.allowPenalties) return 'penales'
      return null
    case 'alargue':
      if (!iguales && c.overtimeRule === 'plata') return null
      return 'alargue2'
    case 'alargue2':
      if (iguales && c.allowPenalties) return 'penales'
      return null
    default: return null
  }
}
function golDeOro(st) {
  if (!esAlargue(st.period) || st.matchConfig.overtimeRule !== 'oro') return st
  if (st.homeScore === st.awayScore) return st
  return { ...st, isMatchEnded: true, winner: st.homeScore > st.awayScore ? 'home' : 'away' }
}
const cfg = (o={}) => ({ periodDuration: 25, allowOvertime: true, allowPenalties: true,
                         overtimeDuration: 5, overtimeRule: 'ninguna', ...o })
const st = (o={}) => ({ period:'2do_tiempo', homeScore:1, awayScore:1, matchConfig: cfg(), ...o })

// ── El alargue son dos ──────────────────────────────────────────────────
chk(siguiente(st()) === 'alargue', 'empatados al final del 2do -> primer alargue')
chk(siguiente(st({period:'alargue'})) === 'alargue2', 'empatados al final del 1er alargue -> segundo alargue')
chk(siguiente(st({period:'alargue2'})) === 'penales', 'empatados al final del 2do alargue -> penales')

// ── GOL DE PLATA: se resuelve al CERRAR el periodo ─────────────────────
const plata = o => st({ matchConfig: cfg({ overtimeRule:'plata' }), ...o })
chk(siguiente(plata({period:'alargue', homeScore:2, awayScore:1})) === null,
  'plata: con diferencia al cerrar el 1er alargue, el partido termina ahi')
chk(siguiente(plata({period:'alargue'})) === 'alargue2',
  'plata: empatados al cerrar el 1er alargue, se juega el segundo')

// Sin regla de plata, la diferencia NO corta el alargue
chk(siguiente(st({period:'alargue', homeScore:2, awayScore:1})) === 'alargue2',
  'sin plata: aunque haya diferencia, se juega el segundo alargue')

// ── GOL DE ORO: se resuelve al MARCAR ──────────────────────────────────
const oro = o => st({ matchConfig: cfg({ overtimeRule:'oro' }), ...o })
let r = golDeOro(oro({ period:'alargue', homeScore:2, awayScore:1 }))
chk(r.isMatchEnded && r.winner === 'home', 'oro: el gol en el alargue termina el partido al instante')
r = golDeOro(oro({ period:'alargue', homeScore:1, awayScore:1 }))
chk(!r.isMatchEnded, 'oro: un gol que IGUALA no resuelve nada')
r = golDeOro(oro({ period:'2do_tiempo', homeScore:2, awayScore:1 }))
chk(!r.isMatchEnded, 'oro: en tiempo reglamentario no aplica')
r = golDeOro(st({ period:'alargue', homeScore:2, awayScore:1 }))
chk(!r.isMatchEnded, 'sin regla de oro, el gol en el alargue no termina el partido')

// ── Duración propia del alargue ────────────────────────────────────────
chk(duracion(cfg(), '2do_tiempo') === 1500, 'periodo normal: 25 min')
chk(duracion(cfg(), 'alargue') === 300 && duracion(cfg(), 'alargue2') === 300,
  'los dos alargues duran lo suyo (5 min), no los 25 del periodo')
chk(duracion(cfg({ overtimeDuration: undefined }), 'alargue') === 1500,
  'sin duracion de alargue configurada, hereda la del periodo')

// ── Tiempos de banca: dos por equipo en CADA periodo ───────────────────
const entrarAPeriodo = (st, sig) => ({ ...st, period: sig ?? st.period,
  homeTimeoutsUsed: sig ? 0 : st.homeTimeoutsUsed, awayTimeoutsUsed: sig ? 0 : st.awayTimeoutsUsed })
let t = { ...st({ period:'1er_tiempo' }), homeTimeoutsUsed:2, awayTimeoutsUsed:1 }
const periodos = []
for (let i = 0; i < 4; i++) {
  const sig = siguiente(t)
  t = entrarAPeriodo(t, sig)
  if (sig) periodos.push([sig, t.homeTimeoutsUsed])
  t.homeTimeoutsUsed = 2   // el equipo los vuelve a gastar
}
console.log('   recorrido:', periodos.map(([p,n]) => `${p}:${n}`).join(' '))
chk(periodos.every(([,n]) => n === 0), 'al entrar a CADA periodo los tiempos de banca vuelven a cero')
chk(periodos.map(([p]) => p).join(',') === '2do_tiempo,alargue,alargue2,penales',
  'el recorrido completo pasa por los dos alargues')

// El partido que NO cambia de periodo conserva lo usado
const quieto = entrarAPeriodo({ ...t, homeTimeoutsUsed: 2 }, null)
chk(quieto.homeTimeoutsUsed === 2, 'sin cambio de periodo, lo usado se conserva')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
