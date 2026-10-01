// Corre los casos contra lib/periodos.ts REAL: lee el archivo, le quita los
// imports de tipos y lo ejecuta junto a los casos. Si cambia la regla, se ve.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const src = fs.readFileSync(new URL('../lib/periodos.ts', import.meta.url), 'utf8')
  .replace(/^import[^\n]*\n/gm, '').replace(/^export /gm, '')
const casos = fs.readFileSync(new URL('./alargue.casos.ts', import.meta.url), 'utf8')
const tmp = '/tmp/ardi-alargue-prueba.ts'
fs.writeFileSync(tmp, src + '\n' + casos)
let out
try {
  out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', tmp], { encoding: 'utf8' })
} catch (e) { process.stdout.write(String(e.stdout || '') + String(e.stderr || '')); process.exit(1) }
process.stdout.write(out)
process.exit(/, 0 fallan/.test(out) ? 0 : 1)
