// Retomar un suspendido desde archivo, contra el código REAL de lib/resume-import.ts.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

// resume-import.ts usa el orden de periodos de lib/periodos.ts: se ejecutan juntos.
const quitar = t => t.replace(/^import[^\n]*\n/gm, '').replace(/export /g, '')
const src = quitar(fs.readFileSync(new URL('../lib/periodos.ts', import.meta.url), 'utf8')) + '\n' +
  quitar(fs.readFileSync(new URL('../lib/resume-import.ts', import.meta.url), 'utf8'))
const casos = String.raw`
let pasa = 0, falla = 0
const chk = (c: boolean, m: string) => { c ? pasa++ : falla++; console.log((c ? 'PASA' : 'FALLA') + ' — ' + m) }
const json = (extra: any) => JSON.stringify({ formato: 'ardi:partido', version: 1, local: { goles: 3, faltas: 7 }, visita: { goles: 2, faltas: 9 }, ...extra })

const a: any = leerReanudacion(json({ reanudacion: { periodo: '2do_tiempo', relojSeg: 754 } }))
chk(a.ok && a.datos.periodo === '2do_tiempo' && a.datos.minutos === 12 && a.datos.segundos === 34, 'Datos web 3.55: periodo y reloj')
chk(a.ok && a.datos.golesLocal === 3 && a.datos.golesVisita === 2 && a.datos.faltasLocal === 7 && a.datos.faltasVisita === 9, 'Datos web 3.55: marcador y faltas')
chk(leerReanudacion('\uFEFF' + json({ reanudacion: { periodo: 'alargue', relojSeg: 60 } })).ok, 'tolera la marca BOM')
const b: any = leerReanudacion(json({}))
chk(!b.ok && /anterior a la 3.55/.test(b.error), 'Datos web viejo sin reanudación: lo dice, no inventa el reloj')
const c: any = leerReanudacion(JSON.stringify({ formato: 'ardi:jornada', partidos: [] }))
chk(!c.ok && /archivo del día/.test(c.error), 'el archivo del día no se confunde con un partido')
chk(!(leerReanudacion('{roto') as any).ok, 'JSON dañado: error claro')
chk(!(leerReanudacion(JSON.stringify({ hola: 1 })) as any).ok, 'JSON ajeno: rechazado')
const d: any = leerReanudacion(json({ reanudacion: { periodo: 'cualquiera', relojSeg: -5 } }))
chk(d.ok && d.datos.periodo === '1er_tiempo' && d.datos.minutos === 0 && d.datos.segundos === 0, 'valores raros no rompen: caen a lo seguro')

const csv = ['ENCABEZADO', 'REANUDACION (LECTURA AUTOMATICA)', 'Periodo Reanudacion,2do_tiempo', 'Minuto Reanudacion,18:05',
  'Resultado Local,1', 'Resultado Visita,4', 'Faltas Local,2', 'Faltas Visita,6'].join('\r\n')
const e: any = leerReanudacion(csv)
chk(e.ok && e.datos.minutos === 18 && e.datos.segundos === 5 && e.datos.golesVisita === 4 && e.datos.faltasVisita === 6, 'un CSV de antes (con CRLF) se sigue leyendo')
chk(!(leerReanudacion('Nombre,Dorsal\nJuan,4') as any).ok, 'un CSV sin bloque de reanudación: rechazado')
console.log('\n' + pasa + ' pasan, ' + falla + ' fallan')
`
const tmp = '/tmp/ardi-reanudar-prueba.ts'
fs.writeFileSync(tmp, src + '\n' + casos)
const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', tmp], { encoding: 'utf8' })
process.stdout.write(out)
process.exit(/, 0 fallan/.test(out) ? 0 : 1)
