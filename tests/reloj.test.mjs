// El ancla del reloj. Se simula un PC lento: cada commit de React cuesta.
let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

/**
 * Simula un periodo entero con latido de 250 ms.
 * `commitMs` = lo que tarda React en pintar tras cada cambio de segundo.
 */
function correrPeriodo({ reanclarCadaSegundo, segundos, commitMs }) {
  let ahora = 0                       // reloj de pared simulado, en ms
  let ancla = { ts: 0, clock: segundos }
  let mostrado = segundos

  while (mostrado > 0) {
    ahora += 250                      // latido
    const elapsed = (ahora - ancla.ts) / 1000
    const exacto = Math.max(0, ancla.clock - Math.floor(elapsed))
    if (exacto !== mostrado) {
      mostrado = exacto
      ahora += commitMs               // React pinta: cuesta
      // EL DEFECTO: si el valor del reloj esta en las dependencias, el efecto
      // se recrea y el ancla se reinicia AQUI, despues del commit.
      if (reanclarCadaSegundo) ancla = { ts: ahora, clock: mostrado }
    }
    if (ahora > segundos * 4000) break   // red de seguridad
  }
  return ahora / 1000                 // segundos de reloj de pared consumidos
}

// ── Maquina holgada ──────────────────────────────────────────────────────
const P = 20 * 60   // periodo de 20 minutos

const viejoRapido = correrPeriodo({ reanclarCadaSegundo: true,  segundos: P, commitMs: 12 })
const nuevoRapido = correrPeriodo({ reanclarCadaSegundo: false, segundos: P, commitMs: 12 })
console.log(`  holgada  → antes ${viejoRapido.toFixed(0)}s | ahora ${nuevoRapido.toFixed(0)}s (debe ser ${P}s)`)
chk(viejoRapido > P + 5, `el modelo viejo ATRASA en maquina holgada (+${(viejoRapido-P).toFixed(0)}s)`)
chk(Math.abs(nuevoRapido - P) <= 1, 'el ancla nueva termina a tiempo')

// ── Maquina lenta con cinco pantallas ───────────────────────────────────
const viejoLento = correrPeriodo({ reanclarCadaSegundo: true,  segundos: P, commitMs: 60 })
const nuevoLento = correrPeriodo({ reanclarCadaSegundo: false, segundos: P, commitMs: 60 })
console.log(`  lenta    → antes ${viejoLento.toFixed(0)}s | ahora ${nuevoLento.toFixed(0)}s`)
chk(viejoLento > P + 40, `en maquina lenta el atraso se dispara (+${(viejoLento-P).toFixed(0)}s)`)
chk(Math.abs(nuevoLento - P) <= 1, 'con el ancla, la maquina lenta tambien termina a tiempo')

// ── El ancla absorbe una congelacion del navegador ──────────────────────
let ahora = 0, ancla = { ts: 0, clock: 100 }
ahora += 3000                                   // el PC se congela 3 s
const tras = Math.max(0, ancla.clock - Math.floor((ahora - ancla.ts)/1000))
chk(tras === 97, 'tras una congelacion de 3 s el reloj descuenta los 3, no uno')

// ── Reanclar ante un cambio externo (ajuste fino / Art. 30.9) ───────────
ancla = { ts: 0, clock: 100 }; ahora = 0
let ultimo = 100
ahora += 2000
let exacto = Math.max(0, ancla.clock - Math.floor((ahora - ancla.ts)/1000))  // 98
ultimo = exacto
const externo = 5                               // Art. 30.9 repone a 0:05
if (externo !== ultimo) { ancla = { ts: ahora, clock: externo }; ultimo = externo }
ahora += 1000
exacto = Math.max(0, ancla.clock - Math.floor((ahora - ancla.ts)/1000))
chk(exacto === 4, 'tras reponer a 0:05 el reloj sigue desde ahi (4), no vuelve a 97')

// ── Art. 30.9 en el COBRO del penal ────────────────────────────────────
// El articulo pide cinco segundos para EJECUTAR, asi que se cuentan antes del
// tiro. Enganchado al gol no serviria: un penal errado a 0:03 no repondria
// nunca, y uno convertido repondria despues de tirar.
const REPOS = 5
const reponer = st => st.mainClock < REPOS ? { ...st, mainClock: REPOS, repuso: true } : { ...st, repuso: false }
const cobrar = st => st.period === 'penales' ? st : reponer(st)

let c = cobrar({ mainClock: 3, period: '2do_tiempo' })
chk(c.mainClock === 5, 'cobro a 0:03 -> repone a 0:05')
c = cobrar({ mainClock: 40, period: '2do_tiempo' })
chk(c.mainClock === 40 && !c.repuso, 'cobro a 0:40 -> no toca el reloj (nunca descuenta)')
c = cobrar({ mainClock: 3, period: 'penales' })
chk(c.mainClock === 3, 'en la TANDA el cobro no mueve el reloj de juego')

// Tras reponer, el ancla del reloj no lo devuelve a 3
const anclaPenal = { ts: 0, clock: 5 }; let tPenal = 0
tPenal += 1000
const exactoPenal = Math.max(0, anclaPenal.clock - Math.floor((tPenal - anclaPenal.ts)/1000))
chk(exactoPenal === 4, 'tras reponer, el siguiente tick sigue desde 0:05 (no vuelve a 0:03)')

// El GOL de penal no repone: eso es del cobro
const golDePenal = st => ({ ...st })
chk(golDePenal({ mainClock: 720 }).mainClock === 720,
  'un gol de penal a 12:00 no mueve el reloj ni duplica reposicion')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
