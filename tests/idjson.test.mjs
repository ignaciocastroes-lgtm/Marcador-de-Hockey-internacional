// La clave del JSON incluye la SERIE.
let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }
const limpio = t => (t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'equipo'
const id = (fecha, serie, hora, local, visita) =>
  [fecha, limpio(serie || hora || 'amistoso'), `${limpio(local)}-vs-${limpio(visita)}`].join('-')

const a = id('2026-09-12','Sub-15 Fem','10:00','Internacional Lo Espejo','CP Bata')
const b = id('2026-09-12','Sub-17 Fem','12:00','Internacional Lo Espejo','CP Bata')
console.log('  ', a); console.log('  ', b)
chk(a !== b, 'mismo dia y mismos clubes, series distintas -> DOS claves')
chk(a.includes('sub-15-fem'), 'la serie viaja en la clave')

const x = id('2026-09-12','','11:30','Internacional','Bata')
const y = id('2026-09-12','','13:00','Internacional','Bata')
chk(x !== y, 'sin serie, la hora desempata (una cadena vacia no desempataria)')

chk(id('2026-09-12','Sub-15 Fem','10:00','Internacional Lo Espejo','CP Bata') === a,
  'la misma citacion da siempre la misma clave (la web hace upsert, no duplica)')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
