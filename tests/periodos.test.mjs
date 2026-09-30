// GUARDA CONTRA EL "SE ME OLVIDO EL OTRO SITIO".
//
// En la 3.56 se agrego el segundo alargue al motor y nadie miro quien mas leia
// el periodo: ocho ternarios a mano lo trataban como penales. Esta prueba no
// verifica el reglamento (eso lo hace alargue.test.mjs): verifica que NADIE
// vuelva a escribir a mano lo que ya vive en lib/periodos.ts.
import fs from 'node:fs'
import path from 'node:path'

let pasa = 0, falla = 0
const chk = (c, m) => { c ? pasa++ : falla++; console.log(`${c ? 'PASA' : 'FALLA'} — ${m}`) }
const raiz = new URL('..', import.meta.url).pathname

const archivos = []
const recorrer = d => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name)
    if (f.isDirectory()) { if (!['node_modules', '.next', 'ui'].includes(f.name)) recorrer(p) }
    else if (/\.(ts|tsx)$/.test(f.name) && !/\.d\.ts$/.test(f.name)) archivos.push(p)
  }
}
for (const d of ['app', 'components', 'hooks', 'lib']) recorrer(path.join(raiz, d))
const rel = p => path.relative(raiz, p)
const fuera = archivos.filter(p => rel(p) !== 'lib/periodos.ts')

// 1) El tipo Period y PERIODOS_ORDEN dicen lo mismo.
const hook = fs.readFileSync(path.join(raiz, 'hooks/use-game-state.ts'), 'utf8')
const tipo = [...hook.match(/export type Period = ([^\n]+)/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
const modulo = fs.readFileSync(path.join(raiz, 'lib/periodos.ts'), 'utf8')
const orden = [...modulo.match(/PERIODOS_ORDEN: Period\[\] = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
chk(tipo.length === orden.length && tipo.every(p => orden.includes(p)),
  `el tipo Period (${tipo.length}) y PERIODOS_ORDEN (${orden.length}) declaran los mismos periodos`)

// 2) Nadie reescribe los rotulos a mano.
const ternarios = fuera.filter(p => /'alargue2?'\s*\?\s*'/.test(fs.readFileSync(p, 'utf8')))
chk(ternarios.length === 0, `ningun ternario de rotulos de periodo escrito a mano ${ternarios.map(rel).join(', ')}`)

const rotulosSueltos = fuera.filter(p => /'(ET|ET1|ET2|PEN)'/.test(fs.readFileSync(p, 'utf8')))
chk(rotulosSueltos.length === 0, `ningun rotulo 'ET'/'PEN' suelto fuera de lib/periodos.ts ${rotulosSueltos.map(rel).join(', ')}`)

// 3) Cada `Record<Period, ...>` se completa con los cinco (el compilador ya lo
//    exige, pero esto falla con un mensaje que dice a donde ir).
const mapasSinAlargue2 = fuera.filter(p => {
  const t = fs.readFileSync(p, 'utf8')
  return /Record<Period,/.test(t) && !/alargue2/.test(t)
})
chk(mapasSinAlargue2.length === 0, `todo Record<Period,...> conoce el 2do alargue ${mapasSinAlargue2.map(rel).join(', ')}`)

// 4) El boton ">" y el fin del descanso comparten la misma logica de "que sigue".
const iniNext = hook.indexOf('const nextPeriod = useCallback')
const cuerpoNext = hook.slice(iniNext, hook.indexOf('\n  }, [])', iniNext))
chk(cuerpoNext.includes('siguientePeriodo(prev)'), 'nextPeriod (boton ">") delega en siguientePeriodo: no tiene su propia cadena')
chk(!/prev\.period === 'alargue'/.test(cuerpoNext), 'nextPeriod ya no compara periodos a mano')

// 5) Los selectores de periodo ofrecen el 2do alargue.
for (const f of ['components/operator-view.tsx', 'components/court-operator-view.tsx']) {
  const ruta = path.join(raiz, f)
  if (!fs.existsSync(ruta)) continue
  chk(/SelectItem value="alargue2"/.test(fs.readFileSync(ruta, 'utf8')), `${f}: el selector de periodo ofrece el 2do alargue`)
}

// 6) El gol de oro lo decide UN solo lugar: no vuelve el interruptor local de CONTROL.
const control = fs.readFileSync(path.join(raiz, 'components/operator-view.tsx'), 'utf8')
chk(!/ardi-golden-goal|goldenGoal/.test(control), 'CONTROL no tiene un gol de oro propio que contradiga al prepartido')

console.log(`\n${pasa} pasan, ${falla} fallan`)
process.exit(falla ? 1 : 0)
