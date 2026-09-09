// Auditoria del recorrido: crear serie -> aparece al armar el partido ->
// cargarle jugadores -> renombrarla sin perderlos.
const FABRICA = [
  { id:'sub13f', label:'Sub-13 Fem', gender:'femenino', order:3 },
  { id:'sub15f', label:'Sub-15 Fem', gender:'femenino', order:4 },
]
const norm = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
const seriesOf = c => [...((c?.serieDefs?.length ? c.serieDefs : FABRICA))].sort((a,b)=>a.order-b.order)
const idDesde = l => norm(l).replace(/\s+/g,'').slice(0,16) || 'serie'

function saveSerie(c, serie, idPrevio) {
  const id=serie.id.trim(), label=serie.label.trim()
  if(!id||!label) return {ok:false,error:'faltan datos'}
  const act=seriesOf(c)
  if(act.some(s=>s.id===id&&s.id!==idPrevio)) return {ok:false,error:'id repetido'}
  const defs=idPrevio?act.map(s=>s.id===idPrevio?{...serie,id,label}:s):[...act,{...serie,id,label}]
  const series={...c.series}
  if(idPrevio&&idPrevio!==id&&series[idPrevio]){series[id]=series[idPrevio];delete series[idPrevio]}
  return {ok:true,club:{...c,serieDefs:defs,series}}
}
const squadOf=(c,id)=>(c.series[id]||[])
const deleteSerie=(c,id)=>squadOf(c,id).length
  ? {ok:false,error:`Esa serie tiene ${squadOf(c,id).length} integrantes.`}
  : {ok:true,club:{...c,serieDefs:seriesOf(c).filter(s=>s.id!==id),series:(()=>{const x={...c.series};delete x[id];return x})()}}

let pasa=0,falla=0
const chk=(c,m)=>{c?pasa++:falla++;console.log(`${c?'PASA':'FALLA'} — ${m}`)}

let club={serieDefs:undefined,series:{},personas:[{id:'ILE-0001',nombre:'Ariadny'}]}

// 1. El operador crea "Infantil Femenino" escribiendo solo el nombre
const id1=idDesde('Infantil Femenino')
club=saveSerie(club,{id:id1,label:'Infantil Femenino',gender:'femenino',order:9}).club
chk(seriesOf(club).some(s=>s.label==='Infantil Femenino'),'crea la serie escribiendo solo el nombre')
chk(id1==='infantilfemenino'&&id1.length<=16,'el identificador se deduce solo, sin pedirlo: '+id1)

// 2. LO QUE ESTABA ROTO: aparece en el selector del partido
chk(seriesOf(club).some(s=>s.id===id1),
  'la serie nueva APARECE en la lista que usan los selectores del partido')

// 3. Nombres que chocan: "Sub-15" y "Sub-15 B"
let c2=saveSerie(club,{id:idDesde('Sub 15'),label:'Sub 15',gender:'femenino',order:10}).club
const idB=idDesde('Sub 15 B')
c2=saveSerie(c2,{id:idB,label:'Sub 15 B',gender:'femenino',order:11}).club
chk(seriesOf(c2).filter(s=>s.label.startsWith('Sub 15')).length===2,
  'dos series de nombre parecido conviven sin pelear por el identificador')

// 4. Se le cargan jugadores
club={...club,series:{...club.series,[id1]:[{personId:'ILE-0001',dorsal:'20'}]}}
chk(squadOf(club,id1).length===1,'se le carga una jugadora')

// 5. Renombrar no pierde a nadie (el caso que mas asusta)
const r=saveSerie(club,{id:id1,label:'Infantil A',gender:'femenino',order:9},id1)
chk(r.ok&&squadOf(r.club,id1).length===1,'renombrarla NO pierde a la jugadora')
chk(seriesOf(r.club).find(s=>s.id===id1).label==='Infantil A','y el nombre nuevo queda')

// 6. Borrarla con gente adentro: bloqueado
const d=deleteSerie(club,id1)
chk(!d.ok,'NO se puede borrar una serie con gente adentro: '+d.error)

// 7. Vaciarla y borrarla
const vacio={...club,series:{...club.series,[id1]:[]}}
chk(deleteSerie(vacio,id1).ok,'vaciada, si se puede borrar')

// 8. Reordenar intercambiando ordenes
const a=seriesOf(club)[0], b=seriesOf(club)[1]
let m=saveSerie(club,{...a,order:b.order},a.id)
m=saveSerie(m.club,{...b,order:a.order},b.id)
chk(seriesOf(m.club)[0].id===b.id,'subir una serie la deja primera')
chk(seriesOf(m.club).length===seriesOf(club).length,'y no se pierde ni se duplica ninguna')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
