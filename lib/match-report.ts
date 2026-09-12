// ─────────────────────────────────────────────────────────────────────────────
// CRÓNICA DEL PARTIDO EN HTML
//
// Reemplaza a la impresión del acta como formato de salida. El acta en papel
// sirve para la federación; esto sirve para el club: se pega como noticia en
// la web y queda el registro de la temporada.
//
// Decisiones que vale la pena conocer:
//
//  · TODO viaja en un solo archivo. Sin hojas de estilo externas, sin fuentes
//    remotas, sin scripts. Un archivo que se abre en cualquier parte dentro de
//    diez años y se ve igual. Los escudos son la única excepción y se degradan
//    solos si la URL muere.
//  · Los estilos van con prefijo `ardi-` y dentro de un `<article>`. Al pegarlo
//    en un CMS no pelea con el diseño de la página ni se lo lleva por delante.
//  · Se escribe DOS veces: el documento completo para abrir o archivar, y el
//    fragmento para pegar. Es el mismo contenido.
//  · Un gol anulado por el árbitro APARECE, tachado. Es parte de la crónica.
//    Un gol borrado por error de la mesa no está: nunca existió.
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState, MatchEvent } from '@/hooks/use-game-state'
import { buildSummary, playedMinute, fmtDuration } from '@/lib/match-summary'

export interface ReportOpts {
  homeTeamName: string
  awayTeamName: string
  homeLogo?: string
  awayLogo?: string
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const PERIODO: Record<string, string> = {
  '1er_tiempo': '1er tiempo', '2do_tiempo': '2do tiempo',
  'alargue': 'Alargue', 'penales': 'Penales'
}

const TARJETA: Record<string, { nombre: string; color: string }> = {
  yellow: { nombre: 'Amarilla', color: '#eab308' },
  blue:   { nombre: 'Azul',     color: '#3b82f6' },
  red:    { nombre: 'Roja',     color: '#dc2626' },
}

/** Los estilos, con prefijo propio para no chocar con la web del club. */
const ESTILOS = `
.ardi-rep{--ardi-bg:#0f1115;--ardi-card:#171a21;--ardi-line:#272c36;--ardi-txt:#e8eaed;--ardi-dim:#9aa1ad;--ardi-acc:#d4a437;
background:var(--ardi-bg);color:var(--ardi-txt);border-radius:16px;padding:24px;max-width:860px;margin:0 auto;
font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5;box-sizing:border-box}
.ardi-rep *{box-sizing:border-box}
.ardi-rep h1,.ardi-rep h2,.ardi-rep h3{margin:0;font-weight:800;line-height:1.2}
.ardi-rep .ardi-meta{color:var(--ardi-dim);font-size:12px;text-transform:uppercase;letter-spacing:.08em;text-align:center}
.ardi-rep .ardi-camp{color:var(--ardi-acc);font-size:14px;font-weight:800;text-align:center;margin-bottom:2px}
.ardi-rep .ardi-marcador{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:18px 0}
.ardi-rep .ardi-eq{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}
.ardi-rep .ardi-eq img{width:64px;height:64px;object-fit:contain}
.ardi-rep .ardi-eq span{font-weight:800;font-size:15px;text-align:center;overflow-wrap:anywhere}
.ardi-rep .ardi-cifras{font-size:46px;font-weight:900;letter-spacing:.04em;white-space:nowrap}
.ardi-rep .ardi-pen{display:block;font-size:12px;color:var(--ardi-dim);font-weight:700;text-align:center;letter-spacing:.05em}
.ardi-rep .ardi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:16px}
.ardi-rep .ardi-box{background:var(--ardi-card);border:1px solid var(--ardi-line);border-radius:12px;padding:14px}
.ardi-rep .ardi-box h3{font-size:11px;color:var(--ardi-acc);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;overflow-wrap:anywhere}
.ardi-rep ul{list-style:none;margin:0;padding:0}
.ardi-rep li{display:flex;gap:8px;align-items:baseline;padding:3px 0;font-size:14px}
.ardi-rep .ardi-min{color:var(--ardi-dim);font-variant-numeric:tabular-nums;font-size:12px;min-width:46px}
.ardi-rep .ardi-nada{color:var(--ardi-dim);font-size:13px;font-style:italic}
.ardi-rep .ardi-barra{display:flex;height:22px;border-radius:6px;overflow:hidden;border:1px solid var(--ardi-line)}
.ardi-rep .ardi-barra div{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff}
.ardi-rep table{width:100%;border-collapse:collapse;font-size:13px}
.ardi-rep th,.ardi-rep td{padding:6px 8px;text-align:left;border-bottom:1px solid var(--ardi-line)}
.ardi-rep th{color:var(--ardi-dim);font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.ardi-rep tr:last-child td{border-bottom:none}
.ardi-rep .ardi-anulado{text-decoration:line-through;opacity:.55}
.ardi-rep .ardi-chip{display:inline-block;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:800;color:#fff}
.ardi-rep .ardi-pie{margin-top:18px;padding-top:12px;border-top:1px solid var(--ardi-line);
color:var(--ardi-dim);font-size:11px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:560px){.ardi-rep{padding:16px}.ardi-rep .ardi-cifras{font-size:34px}}
`.trim()

/** El `<article>` autocontenido. Esto es lo que se pega en la web. */
export function buildMatchArticle(state: GameState, o: ReportOpts): string {
  const r = buildSummary(state, 'completo')
  const cfg = state.matchConfig
  const log: MatchEvent[] = state.matchLog || []

  const inicio = state.timestamps?.matchStart ? new Date(state.timestamps.matchStart) : null
  const fin = state.timestamps?.matchEnd ? new Date(state.timestamps.matchEnd) : null
  const fecha = cfg.fecha
    ? new Date(`${cfg.fecha}T00:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    : (inicio ? inicio.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
  const hora = cfg.hora || (inicio ? inicio.toTimeString().slice(0, 5) : '')
  const duracion = inicio && fin ? Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 1000)) : null

  const escudo = (url: string | undefined, nombre: string) =>
    url ? `<img src="${esc(url)}" alt="${esc(nombre)}" loading="lazy"
      onerror="this.style.display='none'">` : ''

  const goleadores = (lado: 'home' | 'away') => {
    const g = r[lado].goals
    return g.length
      ? `<ul>${g.map(x => `<li><span class="ardi-min">${esc(x.minute)}</span><span>#${esc(x.number)}</span></li>`).join('')}</ul>`
      : `<p class="ardi-nada">Sin goles</p>`
  }

  const tarjetas = (lado: 'home' | 'away') => {
    const c = r[lado].cards
    return c.length
      ? `<ul>${c.map(x => {
          const t = TARJETA[x.type]
          return `<li><span class="ardi-chip" style="background:${t.color}">${esc(t.nombre)}</span>
            <span>#${esc(x.number)}${x.isBench ? ' <small style="opacity:.6">(banca)</small>' : ''}</span></li>`
        }).join('')}</ul>`
      : `<p class="ardi-nada">Sin tarjetas</p>`
  }

  // Crónica: sólo lo que le interesa a un lector, en orden.
  const relevantes = log.filter(e =>
    e.eventType === 'gol' ||
    e.eventType.startsWith('tarjeta') ||
    (e.eventType === 'ajuste' && /ANULAD|SUSPENDIDO|REANUDADO/.test(e.details || '')))

  const cronica = relevantes.length ? `
    <div class="ardi-box" style="margin-top:12px">
      <h3>Cómo se jugó</h3>
      <table>
        <thead><tr><th style="width:66px">Minuto</th><th style="width:104px">Periodo</th><th>Qué pasó</th></tr></thead>
        <tbody>${relevantes.map(e => `
          <tr class="${e.anulado ? 'ardi-anulado' : ''}">
            <td style="font-variant-numeric:tabular-nums">${esc(playedMinute(state, e.gameTime))}</td>
            <td style="color:var(--ardi-dim);white-space:nowrap">${esc(PERIODO[e.period] || e.period)}</td>
            <td>${e.team ? `<b>${esc(e.team === 'home' ? o.homeTeamName : o.awayTeamName)}</b> · ` : ''}${esc(e.details || e.eventType)}${e.actor && e.actor !== 'SISTEMA' && e.actor !== '?' && !(e.details || '').includes(`#${e.actor}`)
              ? ` <span style="color:var(--ardi-dim)">#${esc(e.actor)}</span>` : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''

  const parciales = r.byPeriod.length ? `
    <div class="ardi-box">
      <h3>Por periodo</h3>
      <table><tbody>${r.byPeriod.map(p => `
        <tr><td style="color:var(--ardi-dim)">${esc(p.label)}</td>
        <td style="text-align:right;font-weight:800">${p.home} — ${p.away}</td></tr>`).join('')}
      </tbody></table>
    </div>` : ''

  const hayPos = r.home.possession + r.away.possession > 0
  const posesion = `
    <div class="ardi-box">
      <h3>Posesión</h3>
      ${hayPos ? `
        <div class="ardi-barra">
          <div style="width:${r.home.possessionPct}%;background:#2563eb">${r.home.possessionPct >= 12 ? r.home.possessionPct + '%' : ''}</div>
          <div style="width:${r.away.possessionPct}%;background:#dc2626">${r.away.possessionPct >= 12 ? r.away.possessionPct + '%' : ''}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ardi-dim);margin-top:5px">
          <span>${esc(fmtDuration(r.home.possession))}</span><span>${esc(fmtDuration(r.away.possession))}</span>
        </div>`
        : `<p class="ardi-nada">No se registró posesión en este partido.</p>`}
      <table style="margin-top:10px"><tbody>
        <tr><td style="color:var(--ardi-dim)">Faltas</td>
            <td style="text-align:right;font-weight:800">${r.home.fouls} — ${r.away.fouls}</td></tr>
        ${hora ? `<tr><td style="color:var(--ardi-dim)">Hora</td><td style="text-align:right">${esc(hora)}</td></tr>` : ''}
        ${duracion !== null ? `<tr><td style="color:var(--ardi-dim)">Duración real</td>
            <td style="text-align:right">${esc(fmtDuration(duracion))}</td></tr>` : ''}
      </tbody></table>
    </div>`

  return `<article class="ardi-rep">
  <style>${ESTILOS}</style>
  ${cfg.campeonato ? `<p class="ardi-camp">${esc(cfg.campeonato)}</p>` : ''}
  <p class="ardi-meta">${[cfg.seriesName, cfg.gender, fecha, cfg.estadio].filter(Boolean).map(esc).join(' · ')}</p>

  <div class="ardi-marcador">
    <div class="ardi-eq">${escudo(o.homeLogo, o.homeTeamName)}<span>${esc(o.homeTeamName)}</span></div>
    <div style="text-align:center">
      <div class="ardi-cifras">${r.home.score} — ${r.away.score}</div>
      ${r.hasPenalties ? `<span class="ardi-pen">Penales ${r.homePenalties} — ${r.awayPenalties}</span>` : ''}
    </div>
    <div class="ardi-eq">${escudo(o.awayLogo, o.awayTeamName)}<span>${esc(o.awayTeamName)}</span></div>
  </div>

  <div class="ardi-grid">
    <div class="ardi-box"><h3>Goles · ${esc(o.homeTeamName)}</h3>${goleadores('home')}</div>
    <div class="ardi-box"><h3>Goles · ${esc(o.awayTeamName)}</h3>${goleadores('away')}</div>
    <div class="ardi-box"><h3>Tarjetas · ${esc(o.homeTeamName)}</h3>${tarjetas('home')}</div>
    <div class="ardi-box"><h3>Tarjetas · ${esc(o.awayTeamName)}</h3>${tarjetas('away')}</div>
    ${posesion}
    ${parciales}
  </div>

  ${cronica}

  <div class="ardi-pie">
    <span>${esc(state.matchConfig.partidoNumero ? `Partido N° ${state.matchConfig.partidoNumero}` : '')}</span>
    <span>Registrado con ARDI · ardisport.cl</span>
  </div>
</article>`
}

/** Documento completo, para abrir o archivar. Contiene el mismo artículo. */
export function buildMatchReportHTML(state: GameState, o: ReportOpts): string {
  const r = buildSummary(state, 'completo')
  const titulo = `${o.homeTeamName} ${r.home.score} - ${r.away.score} ${o.awayTeamName}`
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(`${titulo} · ${state.matchConfig.campeonato || ''} ${state.matchConfig.seriesName || ''}`.trim())}">
<style>body{margin:0;padding:20px;background:#0b0d11}</style>
</head>
<body>
${buildMatchArticle(state, o)}
</body>
</html>`
}

const bajar = (texto: string, nombre: string, tipo: string) => {
  const blob = new Blob([texto], { type: `${tipo};charset=utf-8;` })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  URL.revokeObjectURL(a.href)
}

const nombreArchivo = (state: GameState, o: ReportOpts) => {
  const limpio = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'equipo'
  const f = state.matchConfig.fecha || new Date().toISOString().slice(0, 10)
  return `${f}-${limpio(o.homeTeamName)}-vs-${limpio(o.awayTeamName)}`
}

export function downloadMatchReport(state: GameState, o: ReportOpts): void {
  bajar(buildMatchReportHTML(state, o), `${nombreArchivo(state, o)}.html`, 'text/html')
}

/** Sólo el `<article>`: lo que se pega en el gestor de la web. */
export async function copyMatchArticle(state: GameState, o: ReportOpts): Promise<boolean> {
  const html = buildMatchArticle(state, o)
  try {
    await navigator.clipboard.writeText(html)
    return true
  } catch {
    bajar(html, `${nombreArchivo(state, o)}-fragmento.html`, 'text/html')
    return false
  }
}
