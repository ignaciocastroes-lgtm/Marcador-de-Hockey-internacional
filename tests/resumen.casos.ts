// La cronica y las estadisticas tienen que cuadrar con el marcador cuando hay
// alargue. Corre contra lib/match-summary.ts y lib/periodos.ts REALES.

let pasa = 0, falla = 0
const chk = (c: boolean, m: string) => { c ? pasa++ : falla++; console.log(`${c ? 'PASA' : 'FALLA'} — ${m}`) }

const g = (team: string, period: string, gameTime: number, actor = '9', anulado = false): any =>
  ({ id: `${team}${period}${gameTime}`, eventType: 'gol', team, actor, period, gameTime, details: 'Gol', anulado })

// Local 3 - 2 Visita, definido por gol de oro en el 2do alargue.
const state: any = {
  homeScore: 3, awayScore: 2, homePenalties: 0, awayPenalties: 0, homeFouls: 4, awayFouls: 5,
  period: 'alargue2', initialClockTime: 1500, mainClock: 100,
  homePossessionTime: 0, awayPossessionTime: 0, cardHistory: [],
  matchConfig: { periodDuration: 25, overtimeDuration: 5, allowOvertime: true, allowPenalties: true, overtimeRule: 'oro' },
  matchLog: [
    g('home', '1er_tiempo', 900),          // 1T   1-0
    g('away', '2do_tiempo', 600),          // 2T   1-1
    g('home', '2do_tiempo', 300, '7'),     // 2T   2-1
    g('away', '2do_tiempo', 60, '3'),      // 2T   2-2
    g('home', 'alargue2', 100, '9'),       // ET2  3-2  (gol de oro)
  ],
}
const r = buildSummary(state, 'completo')

const sumaLocal = r.byPeriod.reduce((a: number, p: any) => a + p.home, 0)
const sumaVisita = r.byPeriod.reduce((a: number, p: any) => a + p.away, 0)
console.log('   parciales:', r.byPeriod.map((p: any) => `${p.label} ${p.home}-${p.away}`).join(' | '))
chk(sumaLocal === state.homeScore && sumaVisita === state.awayScore,
  `los parciales suman el marcador: ${sumaLocal}-${sumaVisita} = ${state.homeScore}-${state.awayScore}`)
chk(r.byPeriod.some((p: any) => p.label === 'ET2' && p.home === 1), 'el gol del 2do alargue aparece como ET2')
chk(!r.byPeriod.some((p: any) => p.label === 'ET1'), 'un alargue sin goles no ensucia la tabla')

// El minuto del gol de oro: quedaban 100 s en un periodo de 300 -> se jugaron 200 s = 3'20
const golOro = r.home.goals.find((x: any) => x.number === '9' && x.minute !== undefined && x.minute.startsWith('3'))
chk(!!golOro && golOro.minute === "3'20", `gol de oro con 1:40 por jugar de 5:00 -> minuto ${golOro?.minute} (antes decia 23'20)`)
const golT2 = r.home.goals.find((x: any) => x.number === '7')
chk(golT2?.minute === "20'00", `gol del 2T con 5:00 por jugar de 25:00 -> ${golT2?.minute}`)

// playedMinute directo, sin periodo: conserva el comportamiento de siempre.
chk(playedMinute(state, 600) === "15'00", 'sin indicar periodo, se usa el reloj inicial como siempre')
chk(playedMinute(state, 240, 'alargue') === "1'00", "1er alargue, 4:00 por jugar de 5:00 -> 1'00")

console.log(`\n${pasa} pasan, ${falla} fallan`)
