// Historial y archivo del día contra el código REAL de lib/history.ts (igual
// que `figura`): se lee el fuente, se le quitan los imports y se ejecuta.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const leer = f => fs.readFileSync(new URL(f, import.meta.url), 'utf8')
  .replace(/^import[^\n]*\n/gm, '').replace(/export /g, '')
const src = leer('../lib/cronica-doc.ts') + '\n' + leer('../lib/history.ts')
const casos = String.raw`
let pasa = 0, falla = 0
const chk = (c: boolean, m: string) => { c ? pasa++ : falla++; console.log((c ? 'PASA' : 'FALLA') + ' — ' + m) }
const lado = (nombre: string, escudo = '') => ({ nombre, escudo, goles: 0, penales: 0, faltas: 0, posesionSeg: 0, posesionPct: 50, goleadores: [], tarjetas: [] })
// (fixtures de partidos)
const web_ = (id: string, fecha: string, hora: string, el = '', ev = '') => ({ formato: 'ardi:partido', version: 1, id, fecha, hora, estadio: '', campeonato: '', serie: '', rama: '', local: lado('A', el), visita: lado('B', ev), ganador: 'empate', hubopenales: false, parciales: [], duracionRealSeg: null, cronologia: [] }) as any
const rec = (id: string, extra: any = {}) => ({ id, date: '2026-09-19T20:00:00Z', series: '', gender: '', homeTeam: 'A', awayTeam: 'B', homeScore: 0, awayScore: 0, homeLogo: null, awayLogo: null, sanctions: [], ...extra }) as any

// ── upsert ──
const viejo = rec('v')
let h: any[] = [viejo]
h = upsertHistory(h, rec('a1', { matchStart: 'T1' }), 60)
h = upsertHistory(h, rec('a2', { matchStart: 'T1', homeScore: 2 }), 60)
chk(h.filter(r => r.matchStart === 'T1').length === 1, 'el mismo partido queda UNA vez')
chk(h[0].id === 'a1' && h[0].homeScore === 2, 'conserva el id y guarda lo más nuevo, arriba')
chk(h.includes(viejo), 'los registros sin matchStart no se tocan')
h = upsertHistory(h, rec('s1'), 60); h = upsertHistory(h, rec('s2'), 60)
chk(h.length === 4, 'sin inicio se agrega como siempre')
chk(upsertHistory(Array.from({ length: 60 }, (_, i) => rec('x' + i)), rec('n'), 60).length === 60, 'respeta el máximo')
const base = [rec('x', { matchStart: 'T9' })]
chk(JSON.stringify(upsertHistory(base, rec('y', { matchStart: 'T9' }), 60)) === JSON.stringify(upsertHistory(base, rec('y', { matchStart: 'T9' }), 60)) && base[0].id === 'x', 'puro: dos pasadas dan lo mismo y no tocan prev')

// ── escudos ──
const club = 'data:image/png;base64,' + 'Q'.repeat(5000)
const rival = 'data:image/png;base64,' + 'R'.repeat(3000)
const x1 = aliviarEscudos({ homeTeamName: 'A', awayTeamName: 'B', homeLogo: club, awayLogo: rival })
chk(x1.opts.homeLogo!.startsWith(ESCUDO_REF) && x1.opts.homeLogo!.length < 40, 'el escudo pegado se cambia por una referencia corta')
chk(Object.keys(x1.escudos).length === 2, 'y va al mapa')
const x2 = aliviarEscudos({ homeTeamName: 'A', awayTeamName: 'C', homeLogo: club, awayLogo: '/escudos/otro.png' })
chk(x2.opts.homeLogo === x1.opts.homeLogo, 'el mismo escudo da la misma referencia (se guarda una vez)')
chk(x2.opts.awayLogo === '/escudos/otro.png', 'una ruta o URL normal no se toca')
const mapa = { ...x1.escudos, ...x2.escudos }
const art = (o: any, goles: string) => '<article class="ardi-rep"><img src="' + o.homeLogo + '"><img src="' + o.awayLogo + '"><b>' + goles + '</b></article>'
chk(resolverEscudos(art(x1.opts, '1-0'), mapa).includes('src="' + club + '"'), 'al exportar vuelve el escudo entero')
chk(resolverEscudos(art(x1.opts, '1-0'), {}).includes('src=""'), 'una referencia perdida queda vacía, no rota')
// Un partido guardado: sus datos web (canónicos) y su crónica (para ver)
const W = (id: string, fecha: string, hora: string, o: any, serie: string, goles = 0) => ({
  formato: 'ardi:partido', version: 1, id, fecha, hora, estadio: '', campeonato: 'Liga', serie, rama: '',
  local: { ...lado('A', o.homeLogo), goles }, visita: lado('B', o.awayLogo), ganador: 'local', hubopenales: false,
  parciales: [], duracionRealSeg: null, cronologia: [] }) as any
const P = (rid: string, fecha: string, hora: string, id: string, o: any, serie: string, goles = 0) =>
  rec(rid, { web: W(id, fecha, hora, o, serie, goles), cronica: { titulo: serie, html: art(o, serie + '-' + goles) } })
chk(Object.keys(podarEscudos([P('r2', '2026-09-19', '12:00', 'k2', x2.opts, 'X')], mapa)).join() === escudoKey(club), 'podar deja sólo los escudos que se usan')

// ── fecha local, no UTC ──
chk(fechaLocal(new Date(2026, 8, 19, 23, 30)) === '2026-09-19', 'un partido a las 23:30 es de ESE día (antes salía el siguiente, en UTC)')

// ── un día de 10 partidos ──
const series = ['Sub-9','Sub-11','Sub-13','Sub-15','Sub-17','Sub-20','Adulta','Femenina','Master','Mixta']
const dia = series.map((s, i) => P('d' + i, '2026-09-19', String(8 + i).padStart(2, '0') + ':00', 'k' + i, i % 2 ? x1.opts : x2.opts, s, i))
const H = [...dia].reverse().concat([
  P('otro', '2026-09-20', '10:00', 'kx', x1.opts, 'OTRODIA'),
  rec('antiguo', { date: '2026-09-19T15:00:00' }),     // antes de la 3.55: sin datos
])
const { jornada, sinDatos } = buildJornadaJSON(H, '2026-09-19', mapa)
chk(jornada.formato === 'ardi:jornada' && jornada.version === 1 && jornada.fecha === '2026-09-19', 'JSON oficial: formato, versión y fecha')
chk(jornada.partidos.length === 10 && sinDatos === 1, 'los 10 partidos del día; avisa el viejo sin datos')
chk(jornada.partidos.map(p => p.serie).join() === series.join(), 'en orden de juego, cada uno con su serie para repartir en la web')
chk(jornada.partidos.every(p => p.formato === 'ardi:partido'), 'cada partido igual a su Datos web')
chk(jornada.partidos.every(p => !p.local.escudo.startsWith(ESCUDO_REF) && !p.visita.escudo.startsWith(ESCUDO_REF)), 'sin referencias internas: escudos enteros')
chk(jornada.partidos[1].local.escudo === club && jornada.partidos[0].visita.escudo === '/escudos/otro.png', 'escudo pegado entero; ruta normal intacta')
chk(!JSON.stringify(jornada).includes('OTRODIA'), 'sólo ese día')
chk(JSON.parse(JSON.stringify(jornada)).partidos.length === 10, 'el archivo es JSON válido')

const html = buildJornadaHTML(H, '2026-09-19', mapa)
chk(html.startsWith('<!doctype html>') && html.includes('<title>Jornada del 19/09/2026</title>'), 'la vista del día es una página completa')
chk(series.every((s, i) => i === 0 || html.indexOf('<b>' + series[i - 1] + '-') < html.indexOf('<b>' + s + '-')), 'la vista trae los mismos 10, en el mismo orden')
chk(html.includes('src="' + club + '"') && html.includes('Copiar el código para la web'), 'la vista con escudos y la barra de siempre')

// ── agrupado por día ──
const g = agruparPorFecha(H)
chk(g.map(x => x.fecha).join() === '2026-09-20,2026-09-19' && g[1].registros.length === 11, 'historial agrupado por día, el más reciente primero')

chk(cronicaDeRegistro(dia[3], mapa)!.includes('Sub-15') && cronicaDeRegistro(H[H.length - 1], mapa) === null, 'la crónica de un partido guardado se reabre; la vieja no se inventa')
// suspendido y retomado: dos registros, mismo id web; gana el más nuevo
const S = buildJornadaJSON([P('n', '2026-09-21', '18:00', 'kS', x2.opts, 'FINAL', 4), P('v', '2026-09-21', '18:00', 'kS', x2.opts, 'IBA', 1)], '2026-09-21', mapa).jornada
chk(S.partidos.length === 1 && S.partidos[0].local.goles === 4, 'un suspendido retomado sale una vez, con el resultado final')
console.log('\n' + pasa + ' pasan, ' + falla + ' fallan')
`
const tmp = '/tmp/ardi-historial-prueba.ts'
fs.writeFileSync(tmp, src + '\n' + casos)
const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', tmp], { encoding: 'utf8' })
process.stdout.write(out)
process.exit(/, 0 fallan/.test(out) ? 0 : 1)
