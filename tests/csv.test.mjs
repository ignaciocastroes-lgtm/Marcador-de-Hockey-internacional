// Pruebas del CSV. Se ejecutan con: node tests/csv.test.mjs
// Sin framework a proposito: no hay runner instalado todavia (eso es R5).
import Papa from 'papaparse'

const normalize = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()

const SINONIMOS = {
  id:['id','ardi id','identificador'],
  nombre:['nombre','jugador','jugadora','nombre completo','apellidos'],
  apodo:['apodo','alias','sobrenombre','nick'],
  dorsal:['dorsal','numero','num','n','camiseta'],
  rol:['rol','role','cargo','puesto'],
  portero:['portero','arquero','goalie','po'],
  doc:['doc','documento','rut','dni','id nacional','cedula'],
}
const mapHeaders = hs => { const o={}; hs.forEach(h=>{const n=normalize(h)
  for (const [c,a] of Object.entries(SINONIMOS)) if (a.includes(n)) { o[c]=h; break } }); return o }
const splitMeta = t => { const meta={}, body=[]
  t.split(/\r?\n/).forEach(l=>{ if(l.trimStart().startsWith('#')){
    const m=/^([^:]+):\s*(.*)$/.exec(l.trim().replace(/^#\s*/,''))
    if(m) meta[normalize(m[1]).replace(/\s+/g,'')]=m[2].trim()
  } else body.push(l) }); return {meta, body:body.join('\n')} }
const esSi = v => ['si','sí','yes','true','1','x'].includes(normalize(v))
const asRole = (raw,g) => { const n=normalize(raw).replace(/\s+/g,'')
  const t={portero:'portero',arquero:'portero',po:'portero',capitan:'capitan',
    dt:'dt',ay1:'ay1',ay2:'ay2',ax1:'ax1',ax2:'ax2',
    jugador:'jugador',jugadorpista:'jugador',jugadora:'jugador'}
  return t[n]||(g?'portero':'jugador') }
const STAFF=['dt','ay1','ay2','ax1','ax2']

function parsePlantel(text){
  const {meta,body}=splitMeta(text)
  const p=Papa.parse(body,{header:true,skipEmptyLines:true})
  const col=mapHeaders(p.meta.fields||[]); const rows=[]; const issues=[]
  p.data.forEach(raw=>{
    const g=c=>col[c]?(raw[col[c]]??'').trim():''
    const nombre=g('nombre'), rol=asRole(g('rol'),esSi(g('portero')))
    if(!nombre) return
    rows.push({id:g('id'),nombre,apodo:g('apodo'),rol,
      isGoalie:rol==='portero'||esSi(g('portero')),doc:g('doc')})
  })
  return {rows,issues,meta}
}
const cell=v=>/[",\n]/.test(v??'')?`"${(v??'').replace(/"/g,'""')}"`:(v??'')
function buildPlantel(rows,meta){
  const cols=['id','nombre','apodo','rol','portero']
  if(meta.incluirDoc)cols.push('doc')
  return ['# ardi:plantel v1',`# club: ${meta.club}`,`# clubId: ${meta.clubId}`,
    '# (las lineas con # son datos del archivo; no las edites a mano)',cols.join(','),
    ...rows.map(r=>{const b=[r.id,r.nombre,r.apodo,r.rol,r.isGoalie?'si':'no']
      if(meta.incluirDoc)b.push(r.doc||''); return b.map(cell).join(',')})].join('\n')
}

let pasa=0, falla=0
const check=(ok,msg,extra='')=>{ ok?pasa++:falla++
  console.log(`${ok?'PASA':'FALLA'} — ${msg}${extra&&!ok?`  [${extra}]`:''}`) }

// ── 1. VIAJE DE IDA Y VUELTA (lo que hoy falla) ─────────────────────────────
const original=[
  {id:'ILE-0001',nombre:'Keily Lorca',      apodo:'Keily', rol:'portero',isGoalie:true, doc:''},
  {id:'ILE-0007',nombre:'Pascale Celis',    apodo:'Pascu', rol:'jugador',isGoalie:false,doc:''},
  {id:'ILE-0020',nombre:'Génesis Cárdenas', apodo:'',      rol:'jugador',isGoalie:false,doc:''},
  {id:'ILE-0031',nombre:'Facundo Oyola',    apodo:'',      rol:'dt',     isGoalie:false,doc:''},
]
const ida=buildPlantel(original,{club:'Internacional Lo Espejo',clubId:'7c1f-uuid'})
const vuelta=parsePlantel(ida).rows

check(vuelta.length===original.length,`vuelven las ${original.length} personas`,`volvieron ${vuelta.length}`)
check(vuelta.filter(p=>p.nombre).length===4,'vuelven los 4 nombres',`${vuelta.filter(p=>p.nombre).length}`)
check(vuelta.find(p=>p.id==='ILE-0031')?.rol==='dt','el DT sobrevive (antes se perdia)')
check(vuelta.find(p=>p.id==='ILE-0001')?.rol==='portero','la portera sigue siendo portera')
check(vuelta.find(p=>p.id==='ILE-0007')?.apodo==='Pascu','el apodo viaja')
check(vuelta.every((p,i)=>p.id===original[i].id),'los ids se conservan (identidad intacta)')
check(vuelta.find(p=>p.nombre==='Génesis Cárdenas')!==undefined,'las tildes sobreviven')

// ── 2. CABECERAS DE UNA LIGA REAL ──────────────────────────────────────────
const liga=`Nombre completo,Rol
Keily Lorca,Portero
Pascale Celis,Jugador`
const r2=parsePlantel(liga).rows
check(r2.length===2,'lee un archivo de liga con cabeceras acentuadas',`${r2.length}`)
check(r2[0].nombre==='Keily Lorca','reconoce "Nombre completo"')

const alt=`Jugadora;Alias
Keily Lorca;Keily`
const r3=parsePlantel(alt).rows
check(r3.length===1&&r3[0].apodo==='Keily','acepta punto y coma y sinonimos (Dorsal/Jugadora/Alias)')

// ── 3. EL DOCUMENTO NO SALE POR DEFECTO ────────────────────────────────────
const conDoc=[{...original[0],doc:'222-3'}]
check(!buildPlantel(conDoc,{club:'x',clubId:'y'}).includes('222-3'),
  'el documento NO viaja en el CSV normal')
check(buildPlantel(conDoc,{club:'x',clubId:'y',incluirDoc:true}).includes('222-3'),
  'el documento sale solo en el export para la federacion')

// ── 4. ALTAS SIN ID Y METADATOS ────────────────────────────────────────────
const nueva=parsePlantel(`# ardi:plantel v1\n# clubId: abc-123\nid,nombre\n,Jugadora Nueva`)
check(nueva.rows[0].id==='','una alta sin id se lee como alta, no se inventa uno')
check(nueva.meta.clubid==='abc-123','los metadatos se leen de las lineas #')
check(nueva.rows.length===1,'las lineas # no entran como filas de datos')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla ? 1 : 0)
