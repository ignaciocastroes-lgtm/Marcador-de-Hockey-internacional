// El dorsal pertenece a la persona EN UNA SERIE. Estas pruebas fijan esa regla.
import fs from 'fs'

const src = fs.readFileSync('lib/club-seed.ts','utf8')
const SEED = JSON.parse(src.slice(
  src.indexOf('CLUB_SEED: ClubStore = ') + 'CLUB_SEED: ClubStore = '.length,
  src.lastIndexOf('} as ClubStore') + 1))

const nombreDe = Object.fromEntries(SEED.personas.map(p => [p.id, p.nombre]))
const idDe = n => SEED.personas.find(p => p.nombre === n)?.id

const dorsalOwner = (c, serie, d, excepto) => {
  if (!d) return undefined
  const m = (c.series[serie]||[]).find(x => x.dorsal === d && x.personId !== excepto)
  return m ? c.personas.find(p => p.id === m.personId) : undefined
}
const assignDorsal = (c, serie, personId, dorsal) => {
  const d = (dorsal||'').trim()
  const duenio = dorsalOwner(c, serie, d, personId)
  if (duenio) return { ok:false, error:`El ${d} en esta serie ya es de ${duenio.nombre}` }
  const act = c.series[serie]||[]
  const existe = act.some(m => m.personId === personId)
  return { ok:true, club:{ ...c, series:{ ...c.series,
    [serie]: existe ? act.map(m => m.personId===personId?{...m,dorsal:d}:m)
                    : [...act,{personId,dorsal:d}] }}}
}
const missingDorsal = (c, serie) => (c.series[serie]||[])
  .filter(m => !m.dorsal.trim()).map(m => c.personas.find(p=>p.id===m.personId))

let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

// ── La persona ya no tiene dorsal propio ───────────────────────────────────
chk(SEED.version === 2, 'la semilla es v2')
chk(SEED.personas.every(p => p.dorsal === undefined),
  'ninguna persona guarda un dorsal suelto: el dorsal vive en la serie')

// ── Ningun dorsal repetido en ninguna serie ───────────────────────────────
let repetidos = []
for (const [serie, miembros] of Object.entries(SEED.series)) {
  const m = {}
  miembros.filter(x=>x.dorsal).forEach(x => (m[x.dorsal]=m[x.dorsal]||[]).push(nombreDe[x.personId]))
  Object.entries(m).filter(([,v])=>v.length>1).forEach(([d,v]) => repetidos.push(`${serie}:${d} ${v.join('/')}`))
}
chk(repetidos.length === 0, `ninguna serie repite dorsal (${repetidos.join(' · ')||'ok'})`)

// ── El caso real que motivo todo ──────────────────────────────────────────
const ari = idDe('Ariadny Olivares'), elo = idDe('Eloisa Figueroa')
const dorsalEn = (serie,id) => (SEED.series[serie]||[]).find(m=>m.personId===id)?.dorsal
chk(dorsalEn('sub15f', ari) === '20', 'Ariadny conserva el 20 en Sub-15')
chk(dorsalEn('sub17f', elo) === '20', 'en Sub-17 el 20 es de Eloisa')
chk(dorsalEn('sub17f', ari) === '', 'Ariadny queda SIN dorsal en Sub-17 (no se inventa uno)')
chk(missingDorsal(SEED,'sub17f').some(p=>p.nombre==='Ariadny Olivares'),
  'y aparece en la lista de las que no se pueden citar')

// ── La misma persona, numeros distintos segun la serie ────────────────────
let c = assignDorsal(SEED, 'sub17f', ari, '33').club
chk(dorsalEn('sub15f', ari) === '20' && c.series.sub17f.find(m=>m.personId===ari).dorsal === '33',
  'Ariadny puede ser 20 en Sub-15 y 33 en Sub-17 a la vez')

// ── El bloqueo ────────────────────────────────────────────────────────────
const r = assignDorsal(SEED, 'sub17f', ari, '20')
chk(!r.ok, 'RECHAZA darle a Ariadny el 20 en Sub-17')
chk((r.error||'').includes('Eloisa'), 'y dice de quien es: ' + r.error)

const libre = assignDorsal(SEED, 'sub17f', ari, '77')
chk(libre.ok, 'acepta un numero libre')

// Encontrado al escribir esta prueba: el 7 en Sub-17 es de Pascale Celis.
const r7 = assignDorsal(SEED, 'sub17f', ari, '7')
chk(!r7.ok && (r7.error||'').includes('Pascale'), 'tambien bloquea el 7, que es de Pascale')

// Cambiarse a si misma el numero que ya tiene no es un choque
const mismo = assignDorsal(SEED, 'sub15f', ari, '20')
chk(mismo.ok, 'reasignarse el numero propio no se rechaza a si mismo')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
