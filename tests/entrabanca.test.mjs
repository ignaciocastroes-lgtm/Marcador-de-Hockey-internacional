import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const quitar = t => t.replace(/^import[^\n]*\n/gm, '').replace(/^export /gm, '')
const leer = f => fs.readFileSync(new URL(f, import.meta.url), 'utf8')
const tmp = '/tmp/ardi-entrabanca-prueba.ts'
fs.writeFileSync(tmp, quitar(leer('../lib/court-rules.ts')) + '\n' + leer('./entrabanca.casos.ts'))
let out
try { out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', tmp], { encoding: 'utf8' }) }
catch (e) { process.stdout.write(String(e.stdout || '') + String(e.stderr || '')); process.exit(1) }
process.stdout.write(out)
process.exit(/, 0 fallan/.test(out) ? 0 : 1)
