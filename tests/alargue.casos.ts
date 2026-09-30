// Casos del modelo de periodos. Los ejecuta tests/alargue.test.mjs contra
// lib/periodos.ts REAL (no una copia): si alguien cambia la regla, se nota.

let pasa = 0, falla = 0
const chk = (c: boolean, m: string) => { c ? pasa++ : falla++; console.log(`${c ? 'PASA' : 'FALLA'} — ${m}`) }

const cfg = (o: any = {}): any => ({ periodDuration: 25, allowOvertime: true, allowPenalties: true,
                                     overtimeDuration: 5, overtimeRule: 'ninguna', ...o })
const st = (o: any = {}): any => ({ period: '2do_tiempo', homeScore: 1, awayScore: 1, mainClock: 100,
  matchConfig: cfg(), matchLog: [], timestamps: {}, isMatchEnded: false, ...o })
const conRegla = (regla: string, o: any = {}) => st({ matchConfig: cfg({ overtimeRule: regla }), ...o })

// ── El alargue son DOS periodos ─────────────────────────────────────────
chk(siguientePeriodo(st()) === 'alargue', 'empatados al final del 2do -> primer alargue')
chk(siguientePeriodo(st({ period: 'alargue' })) === 'alargue2', 'empatados al final del 1er alargue -> segundo alargue')
chk(siguientePeriodo(st({ period: 'alargue2' })) === 'penales', 'empatados al final del 2do alargue -> penales')
chk(siguientePeriodo(st({ period: 'alargue2', homeScore: 2 })) === null, 'con diferencia al final del 2do alargue -> termina')
chk(siguientePeriodo(st({ period: 'penales' })) === null, 'despues de penales no hay nada')
chk(siguientePeriodo(st({ matchConfig: cfg({ allowOvertime: false }) })) === 'penales', 'sin alargue, empate -> directo a penales')
chk(siguientePeriodo(st({ matchConfig: cfg({ allowOvertime: false, allowPenalties: false }) })) === null, 'sin alargue ni penales, empate -> termina')

// ── Recorrido completo: el orden y la numeracion ───────────────────────
let cur: any = st({ period: '1er_tiempo', homeScore: 0, awayScore: 0 })
const visto: string[] = ['1er_tiempo']
for (let i = 0; i < 6; i++) {
  const sig = siguientePeriodo(cur); if (!sig) break
  visto.push(sig); cur = { ...cur, period: sig }
}
chk(visto.join(',') === '1er_tiempo,2do_tiempo,alargue,alargue2,penales', `recorrido completo: ${visto.join(' > ')}`)
chk(visto.map(p => numeroDePeriodo(p as any)).join(',') === '1,2,3,4,5', 'numerados del 1 al 5, en orden')
chk(PERIODOS_ORDEN.join(',') === visto.join(','), 'el orden declarado es el orden en que se juega')

// ── GOL DE PLATA: se resuelve al CERRAR el periodo ─────────────────────
chk(siguientePeriodo(conRegla('plata', { period: 'alargue', homeScore: 2, awayScore: 1 })) === null,
  'plata: con diferencia al cerrar el 1er alargue, el partido termina ahi')
chk(siguientePeriodo(conRegla('plata', { period: 'alargue' })) === 'alargue2',
  'plata: empatados al cerrar el 1er alargue, se juega el segundo')
chk(siguientePeriodo(st({ period: 'alargue', homeScore: 2, awayScore: 1 })) === 'alargue2',
  'sin plata, la diferencia NO corta el alargue')

// ── GOL DE ORO: se resuelve al MARCAR ──────────────────────────────────
let r = aplicarGolDeOro(conRegla('oro', { period: 'alargue', homeScore: 2, awayScore: 1 }))
chk(r.isMatchEnded && r.winner === 'home', 'oro: el gol en el 1er alargue termina el partido al instante')
chk(r.matchPhase === 'post-partido', `oro: la fase queda en 'post-partido' (${r.matchPhase})`)
chk(r.isMainClockRunning === false && r.isIntermission === false, 'oro: el reloj queda detenido')
chk(!!r.timestamps.matchEnd, 'oro: queda la hora de termino')
chk(r.matchLog.length === 1 && r.matchLog[0].eventType === 'fin' && r.matchLog[0].details.startsWith('GOL DE ORO'),
  'oro: queda la linea "GOL DE ORO" en el registro')
r = aplicarGolDeOro(conRegla('oro', { period: 'alargue2', homeScore: 1, awayScore: 2 }))
chk(r.isMatchEnded && r.winner === 'away', 'oro: tambien en el 2do alargue (y gana la visita)')
chk(!aplicarGolDeOro(conRegla('oro', { period: 'alargue' })).isMatchEnded, 'oro: un gol que IGUALA no resuelve nada')
chk(!aplicarGolDeOro(conRegla('oro', { period: '2do_tiempo', homeScore: 2, awayScore: 1 })).isMatchEnded, 'oro: en tiempo reglamentario no aplica')
chk(!aplicarGolDeOro(st({ period: 'alargue', homeScore: 2, awayScore: 1 })).isMatchEnded, 'sin regla de oro, el gol en el alargue no termina el partido')
chk(!aplicarGolDeOro(conRegla('plata', { period: 'alargue', homeScore: 2, awayScore: 1 })).isMatchEnded, 'con regla de plata, el gol NO termina el partido en el acto')

// ── Duracion propia del alargue ────────────────────────────────────────
chk(duracionPeriodo(cfg(), '2do_tiempo') === 1500, 'periodo normal: 25 min')
chk(duracionPeriodo(cfg(), 'alargue') === 300 && duracionPeriodo(cfg(), 'alargue2') === 300, 'los dos alargues duran lo suyo (5 min)')
chk(duracionPeriodo(cfg({ overtimeDuration: undefined }), 'alargue') === 1500, 'sin duracion de alargue, hereda la del periodo')

// ── Todo periodo tiene rotulo en cada mapa ─────────────────────────────
for (const [nombre, mapa] of [['corto', PERIODO_CORTO], ['largo', PERIODO_LARGO], ['nombre', PERIODO_NOMBRE], ['marcador', PERIODO_MARCADOR]] as const) {
  chk(PERIODOS_ORDEN.every(p => !!(mapa as any)[p]), `rotulo ${nombre}: los cinco periodos tienen`)
}
chk(PERIODO_MARCADOR['alargue'] !== PERIODO_MARCADOR['alargue2'], 'el marcador distingue el 1er alargue del 2do')
chk(PERIODO_MARCADOR['alargue2'] !== PERIODO_MARCADOR['penales'], 'el 2do alargue NO se rotula como penales (el bug de la 3.56)')

console.log(`\n${pasa} pasan, ${falla} fallan`)
