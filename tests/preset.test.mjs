// Montajes: guardar como quedó encuadrado y aplicarlo en otro equipo.
const store = {}
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k,v) => { store[k] = String(v) },
}
Object.defineProperty(globalThis.localStorage, 'length', { get: () => Object.keys(store).length })
globalThis.Object_keys_ls = () => Object.keys(store)

const PRESET_VERSION = 1
const CLAVES = {
  'ardi:lanzadores': { exactas:['ardi-overlays','ardi-overlay-layout'], prefijos:[] },
  'ardi:pantallas': { exactas:['ardi-live-logos','ardi-visible-screens','ardi-scales'],
    prefijos:['hockey-custom-layout-p','hockey-board-calibration-','hockey-preview-zoom-p'] },
}
const clavesDe = k => {
  const { exactas, prefijos } = CLAVES[k]
  const din = Object.keys(store).filter(x => prefijos.some(p => x.startsWith(p)))
  return [...exactas.filter(x => store[x] !== undefined), ...din]
}
const build = k => {
  const datos = {}
  clavesDe(k).forEach(x => { datos[x] = store[x] })
  return JSON.stringify({ formato:k, version:PRESET_VERSION, exportado:'x', datos })
}
function parse(kind, text) {
  let raw
  try { raw = JSON.parse(text) } catch { return { error:'El archivo no es un JSON válido' } }
  if (raw?.formato !== kind) {
    const otro = raw?.formato==='ardi:lanzadores'?'lanzadores':raw?.formato==='ardi:pantallas'?'pantallas':null
    return { error: otro ? `Ese archivo es un montaje de ${otro}. Impórtalo desde ahí.`
                         : 'Este archivo no es un montaje de ARDI' }
  }
  if (typeof raw.version!=='number' || raw.version>PRESET_VERSION)
    return { error:`El montaje es de una versión más nueva (v${raw.version}).` }
  if (!raw.datos || Object.keys(raw.datos).length===0) return { error:'El montaje está vacío' }
  const { exactas, prefijos } = CLAVES[kind]
  const ok = x => exactas.includes(x) || prefijos.some(p => x.startsWith(p))
  const intrusas = Object.keys(raw.datos).filter(x => !ok(x))
  if (intrusas.length) return { error:`El archivo trae datos que no son de este montaje (${intrusas[0]}…)` }
  return { datos: raw.datos }
}

let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

// Un equipo con todo encuadrado, mas datos que NO son del montaje
Object.assign(store, {
  'ardi-live-logos':'{"boardAccentColor":"#00ff00"}',
  'ardi-visible-screens':'["2","3"]',
  'hockey-custom-layout-p1':'{"clock":{"x":960}}',
  'hockey-custom-layout-p3':'{"clock":{"x":100}}',
  'hockey-board-calibration-2':'{"z":1.1}',
  'ardi-overlays':'{"goal":{"duration":6}}',
  'ardi-overlay-layout':'{"goal":{"text":{"x":900}}}',
  'ardi-club':'EL PLANTEL',
  'hockey-live-game-state':'EL PARTIDO',
})

// ── Cada montaje se lleva lo suyo y nada mas ────────────────────────────
const pant = JSON.parse(build('ardi:pantallas')).datos
chk(Object.keys(pant).length===5, `pantallas se lleva sus 5 ajustes (${Object.keys(pant).length})`)
chk(pant['hockey-custom-layout-p3']!==undefined, 'incluye el layout de CADA tablero, no solo P1')
chk(pant['ardi-club']===undefined && pant['hockey-live-game-state']===undefined,
  'NO se lleva el plantel ni el partido en curso')

const lanz = JSON.parse(build('ardi:lanzadores')).datos
chk(Object.keys(lanz).length===2, 'lanzadores se lleva sus 2')
chk(lanz['ardi-live-logos']===undefined, 'y no invade lo de pantallas')

// ── Ida y vuelta ────────────────────────────────────────────────────────
const r = parse('ardi:pantallas', build('ardi:pantallas'))
chk(!r.error && r.datos['ardi-live-logos'].includes('00ff00'),
  'el montaje vuelve entero: el color ajustado sigue ahi')

// ── El error mas probable del sabado: archivo cruzado ───────────────────
const cruzado = parse('ardi:pantallas', build('ardi:lanzadores'))
chk(cruzado.error?.includes('lanzadores'),
  'importar el archivo equivocado se detecta y DICE cual es: ' + cruzado.error)
chk(cruzado.datos===undefined, 'y no aplica nada')

// ── Archivo manipulado ──────────────────────────────────────────────────
const malicioso = JSON.stringify({ formato:'ardi:pantallas', version:1,
  datos:{ 'ardi-live-logos':'{}', 'ardi-club':'PLANTEL FALSO' } })
chk(parse('ardi:pantallas', malicioso).error?.includes('no son de este montaje'),
  'un archivo que intenta escribir el plantel se rechaza entero')

chk(parse('ardi:pantallas','{{{').error?.includes('JSON'), 'rechaza un archivo corrupto')
chk(parse('ardi:pantallas', JSON.stringify({formato:'ardi:pantallas',version:9,datos:{a:1}})).error?.includes('más nueva'),
  'rechaza un montaje de version futura')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
