// Prueba la figura contra el codigo REAL de lib/figura.ts, no contra una copia:
// cada vez se lee el archivo fuente, se le quitan los imports y se ejecuta junto
// a los casos. Si alguien cambia la formula, esta prueba lo ve.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const src = fs.readFileSync(new URL('../lib/figura.ts', import.meta.url), 'utf8')
  .replace(/^import[^\n]*\n/gm, '').replace(/export /g, '')
const casos = fs.readFileSync(new URL('./figura.casos.ts', import.meta.url), 'utf8')
const tmp = '/tmp/ardi-figura-prueba.ts'
fs.writeFileSync(tmp, src + '\n' + casos)
const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', tmp], { encoding: 'utf8' })
process.stdout.write(out)
process.exit(/, 0 fallan/.test(out) ? 0 : 1)
