// Motor de series de la liga. Reproduce saveSerie/deleteSerie de club-store.
const FABRICA = [
  { id:'escuelita', label:'Escuelita', gender:'mixto',  order:1 },
  { id:'sub13f',    label:'Sub-13 Fem', gender:'femenino', order:3 },
  { id:'sub15f',    label:'Sub-15 Fem', gender:'femenino', order:4 },
]
const seriesOf = c => [...((c?.serieDefs?.length ? c.serieDefs : FABRICA))].sort((a,b)=>a.order-b.order)

function saveSerie(c, serie, idPrevio) {
  const id = serie.id.trim(), label = serie.label.trim()
  if (!id)    return { ok:false, error:'La serie necesita un identificador' }
  if (!label) return { ok:false, error:'La serie necesita un nombre' }
  const actuales = seriesOf(c)
  if (actuales.some(s => s.id === id && s.id !== idPrevio))
    return { ok:false, error:`Ya existe una serie con el identificador "${id}"` }
  const defs = idPrevio
    ? actuales.map(s => s.id === idPrevio ? { ...serie, id, label } : s)
    : [...actuales, { ...serie, id, label }]
  const series = { ...c.series }
  if (idPrevio && idPrevio !== id && series[idPrevio]) {
    series[id] = series[idPrevio]; delete series[idPrevio]
  }
  return { ok:true, club:{ ...c, serieDefs:defs, series } }
}
function deleteSerie(c, id) {
  const dentro = (c.series[id] || []).length
  if (dentro > 0) return { ok:false, error:`Esa serie tiene ${dentro} integrantes. Sácalos antes de borrarla.` }
  const series = { ...c.series }; delete series[id]
  return { ok:true, club:{ ...c, serieDefs: seriesOf(c).filter(s=>s.id!==id), series } }
}

let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

const base = { serieDefs: undefined, series: { sub15f:[{personId:'ILE-0001',dorsal:'20'}] } }

// ── De fabrica ────────────────────────────────────────────────────────────
chk(seriesOf(base).length === 3, 'sin series propias usa la lista de fabrica')
chk(seriesOf(base)[0].id === 'escuelita', 'y respeta el orden declarado')

// ── Alta ──────────────────────────────────────────────────────────────────
let r = saveSerie(base, { id:'infantil', label:'Infantil', gender:'mixto', order:9 })
chk(r.ok && seriesOf(r.club).some(s=>s.id==='infantil'), 'crea una serie nueva')
chk(seriesOf(r.club).length === 4, 'y las de fabrica se conservan junto a la nueva')

// ── Guardas ───────────────────────────────────────────────────────────────
chk(!saveSerie(base, { id:'sub15f', label:'Otra', gender:'femenino', order:9 }).ok,
  'RECHAZA un identificador repetido')
chk(!saveSerie(base, { id:'', label:'Sin id', gender:'mixto', order:1 }).ok,
  'RECHAZA una serie sin identificador')
chk(!saveSerie(base, { id:'x', label:'   ', gender:'mixto', order:1 }).ok,
  'RECHAZA una serie sin nombre')

// ── Renombrar no es cambiar de id ────────────────────────────────────────
r = saveSerie(base, { id:'sub15f', label:'Infantil Femenino', gender:'femenino', order:4 }, 'sub15f')
chk(r.ok && seriesOf(r.club).find(s=>s.id==='sub15f').label === 'Infantil Femenino',
  'renombrar mantiene el id y no toca a los integrantes')
chk(r.club.series.sub15f.length === 1, 'la jugadora sigue en la serie tras renombrarla')

// ── Cambiar el id: los integrantes se mudan ──────────────────────────────
r = saveSerie(base, { id:'infantilf', label:'Infantil Fem', gender:'femenino', order:4 }, 'sub15f')
chk(r.ok, 'permite cambiar el identificador de una serie')
chk(r.club.series.infantilf?.length === 1, 'los integrantes se mudan al id nuevo')
chk(r.club.series.sub15f === undefined, 'y no quedan colgando del id viejo')

// ── Borrado ───────────────────────────────────────────────────────────────
const d = deleteSerie(base, 'sub15f')
chk(!d.ok && d.error.includes('1 integrantes'), 'NO borra una serie con gente adentro: ' + d.error)

const vacia = saveSerie(base, { id:'sub19f', label:'Sub-19 Fem', gender:'femenino', order:6 }).club
const d2 = deleteSerie(vacia, 'sub19f')
chk(d2.ok && !seriesOf(d2.club).some(s=>s.id==='sub19f'), 'borra una serie vacia')
chk(d2.club.series.sub15f.length === 1, 'y no toca a las demas series')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
