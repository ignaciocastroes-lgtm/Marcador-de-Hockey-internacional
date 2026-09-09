// El club entero en un archivo: exportar, importar, y negarse a lo que no es.
const PACK_FORMAT='ardi:club', PACK_VERSION=1

const build = club => JSON.stringify({ formato:PACK_FORMAT, version:PACK_VERSION,
  exportado:new Date().toISOString(), club }, null, 2)

function parse(text){
  let raw
  try { raw = JSON.parse(text) } catch { return { error:'El archivo no es un JSON válido' } }
  if (raw?.formato !== PACK_FORMAT) return { error:'Este archivo no es un paquete de club de ARDI' }
  if (typeof raw.version !== 'number' || raw.version > PACK_VERSION)
    return { error:`El paquete es de una versión más nueva (v${raw.version}). Actualiza ARDI.` }
  const c = raw.club
  if (!c || !Array.isArray(c.personas) || !c.identity?.clubId || !c.identity?.prefix)
    return { error:'El paquete está incompleto: falta la identidad o el plantel' }
  return { club:{ ...c, version:2, series:c.series||{} } }
}

const CLUB = {
  version:2,
  identity:{ clubId:'uuid-abc', prefix:'ILE', lastSerial:21 },
  nombre:'INTERNACIONAL LO ESPEJO',
  personas:[
    { id:'ILE-0001', nombre:'Keily Lorca', apodo:'Keily', rol:'portero', isGoalie:true, doc:'' },
    { id:'ILE-0007', nombre:'Pascale Celis', apodo:'Pascu', rol:'jugador', isGoalie:false, doc:'' },
  ],
  series:{ sub15f:[{personId:'ILE-0001',dorsal:'19'},{personId:'ILE-0007',dorsal:'7'}] },
}

let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

// ── Ida y vuelta ─────────────────────────────────────────────────────────
const r = parse(build(CLUB))
chk(!r.error, 'un paquete propio se lee sin error')
chk(r.club.identity.clubId==='uuid-abc',
  'el clubId sobrevive: al importarlo sigue siendo EL MISMO club')
chk(r.club.personas.length===2 && r.club.personas[0].id==='ILE-0001',
  'las identidades de las personas se conservan')
chk(r.club.series.sub15f.find(m=>m.personId==='ILE-0007').dorsal==='7',
  'y el dorsal de cada una EN SU SERIE')
chk(r.club.identity.lastSerial===21,
  'el contador de seriales viaja: la proxima alta no repite un id')

// ── Se niega a lo que no es ──────────────────────────────────────────────
chk(parse('{{{roto').error?.includes('JSON'), 'rechaza un archivo corrupto')
chk(parse('{"hola":1}').error?.includes('no es un paquete'), 'rechaza un JSON ajeno')
chk(parse(JSON.stringify({formato:PACK_FORMAT,version:99,club:CLUB})).error?.includes('más nueva'),
  'rechaza un paquete de una version futura, en vez de leerlo a medias')
chk(parse(JSON.stringify({formato:PACK_FORMAT,version:1,club:{nombre:'X'}})).error?.includes('incompleto'),
  'rechaza un paquete sin identidad ni plantel')

// Ninguno de los rechazos devuelve club: nada se escribe a medias.
for (const malo of ['{{{roto','{"hola":1}']) {
  chk(parse(malo).club===undefined, 'un archivo invalido NO devuelve club: nada se escribe')
  break
}

// ── Un club de otro pais ─────────────────────────────────────────────────
const ESP = { ...CLUB, identity:{ clubId:'uuid-esp', prefix:'CPB', lastSerial:3 },
  nombre:'CP BARCELONA',
  personas:[{ id:'CPB-0001', nombre:'Marta Roca', apodo:'', rol:'jugador', isGoalie:false, doc:'' }],
  series:{ infantil:[{personId:'CPB-0001',dorsal:'4'}] } }
const e = parse(build(ESP))
chk(e.club.identity.prefix==='CPB' && e.club.series.infantil[0].dorsal==='4',
  'un club de otro pais viaja entero, con sus propias series y prefijo')
chk(e.club.identity.clubId!==CLUB.identity.clubId,
  'y no colisiona con el club de casa aunque convivan')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
