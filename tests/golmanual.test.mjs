// GOL MANUAL en PISTA: marca el gol a cualquier numero del plantel, este en
// pista o en banca, sin tocar la lista de cancha. Fija el contrato minimo.
let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

// El mismo contrato que usa CONTROL (handlePosSelectPlayer, caso 'gol'):
// solo pide el numero, nunca mira si esta en `courtIds`.
const marcarGolManual = (homeCourtIds, numero) => {
  // No debe filtrar por onCourt: a diferencia del boton GOL de la ficha de
  // PISTA (que exige `selected.onCourt`), este NO tiene esa condicion.
  return { gol: true, tocaCourtIds: false }
}

chk(marcarGolManual(['h1','h3','h4','h5','h6'], '8').gol === true,
  'marca el gol aunque el #8 no este en homeCourtIds (banca)')
chk(marcarGolManual(['h1','h3','h4','h5','h6'], '8').tocaCourtIds === false,
  'no modifica la lista de cancha: eso se resuelve despues, con el cambio normal')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
