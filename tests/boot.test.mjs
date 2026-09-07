// Prueba del arranque y el borrado, con un localStorage simulado.
const store = {}
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k,v) => { store[k] = String(v) },
  removeItem: k => { delete store[k] },
  get length(){ return Object.keys(store).length },
}
Object.defineProperty(globalThis.localStorage, 'keys', { value: () => Object.keys(store) })
const PREFIJOS = ['ardi-','hockey-']
const wipeAll = () => { const ks = Object.keys(store).filter(k=>PREFIJOS.some(p=>k.startsWith(p)))
  ks.forEach(k=>delete store[k]); return ks }

let pasa=0, falla=0
const chk=(c,m)=>{ c?pasa++:falla++; console.log(`${c?'PASA':'FALLA'} — ${m}`) }

// Estado tipico de un club que lleva meses usando ARDI
Object.assign(store, {
  'ardi-club':'{...}', 'hockey-teams':'[]', 'hockey-match-history':'[]',
  'ardi-hotkeys-v2':'{}', 'ardi-live-logos':'{}', 'hockey-custom-layout-p1':'{}',
  'hockey-board-calibration-2':'{}', 'ardi-shield-gallery':'[]',
  'otra-app-cualquiera':'no tocar',           // de otro sitio en el mismo dominio
})

const antes = Object.keys(store).length
const borradas = wipeAll()
chk(borradas.length === 8, `borra las 8 claves de ARDI (borro ${borradas.length})`)
chk(store['otra-app-cualquiera'] === 'no tocar', 'NO toca datos de otras apps del mismo dominio')
chk(Object.keys(store).length === antes - 8, 'no borra de mas')
chk(borradas.includes('hockey-board-calibration-2'), 'alcanza las claves con sufijo dinamico')

// Segundo borrado sobre un equipo ya limpio
chk(wipeAll().length === 0, 'borrar dos veces no falla ni borra de mas')

// Siembra condicional
const bootClub = (isDefaultHome, seed, vacio) => store['ardi-club']
  ? JSON.parse(store['ardi-club'])
  : (store['ardi-club'] = JSON.stringify(isDefaultHome ? seed : vacio),
     isDefaultHome ? seed : vacio)

const SEED = { nombre:'INTERNACIONAL LO ESPEJO', personas:new Array(21) }
const VACIO = { nombre:'Mi Club', personas:[] }

delete store['ardi-club']
chk(bootClub(true, SEED, VACIO).personas.length === 21,
  'despliegue de Internacional: siembra las 21 personas')

delete store['ardi-club']
chk(bootClub(false, SEED, VACIO).personas.length === 0,
  'despliegue de OTRO club: arranca vacio, sin el plantel ajeno adentro')

chk(bootClub(false, SEED, VACIO).nombre === 'Mi Club',
  'una vez sembrado, no se vuelve a sembrar encima')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla?1:0)
