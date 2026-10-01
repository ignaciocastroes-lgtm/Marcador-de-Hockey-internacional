// El bug: con el marcador en 0, "Anular gol" abria la confirmacion igual y al
// confirmar la mesa veia "Gol ANULADO" en un aviso de EXITO sin que nada
// cambiara. Se resuelve deshabilitando el boton cuando no hay un gol vigente.
let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

const puedeAnular = (matchLog, team) => matchLog.some(e => e.eventType==='gol' && e.team===team && !e.anulado)

chk(puedeAnular([], 'home') === false, '0-0 sin goles en el registro: no se puede anular (el boton debe estar deshabilitado)')
chk(puedeAnular([{eventType:'gol', team:'home', anulado:false}], 'home') === true, 'con un gol vigente: si se puede anular')
chk(puedeAnular([{eventType:'gol', team:'home', anulado:true}], 'home') === false, 'un gol YA anulado antes no habilita anular "otra vez"')
chk(puedeAnular([{eventType:'gol', team:'away', anulado:false}], 'home') === false, 'un gol de la VISITA no habilita anular el del LOCAL')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
