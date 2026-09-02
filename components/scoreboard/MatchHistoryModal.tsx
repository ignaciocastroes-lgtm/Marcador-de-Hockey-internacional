"use client"

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  History, X, Download, Trash2, Search, Trophy, Target,
  AlertTriangle, ChevronDown, ChevronRight, ShieldAlert
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MatchRecord, MatchEvent } from '@/hooks/use-game-state'

export interface MatchHistoryModalProps {
  open: boolean
  onClose: () => void
  matchHistory: MatchRecord[]
  deleteMatchFromHistory: (id: string) => void
  clearHistory: () => void
}

// Escapa comas, comillas y saltos de linea
const q = (v: unknown) => {
  const t = (v ?? '').toString()
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

const download = (name: string, content: string) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return iso }
}

const periodLabel = (p: string) =>
  p === '1er_tiempo' ? '1T' : p === '2do_tiempo' ? '2T' : p === 'alargue' ? 'ET' : 'PEN'

const fmtGameTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

// ─── Agregados de temporada ──────────────────────────────────────────────────

interface TeamRow {
  team: string
  pj: number; pg: number; pe: number; pp: number
  gf: number; gc: number; pts: number
  amarillas: number; azules: number; rojas: number
}

function buildStandings(records: MatchRecord[]): TeamRow[] {
  const table = new Map<string, TeamRow>()

  const row = (name: string): TeamRow => {
    if (!table.has(name)) {
      table.set(name, { team: name, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, amarillas: 0, azules: 0, rojas: 0 })
    }
    return table.get(name)!
  }

  records.forEach(m => {
    const h = row(m.homeTeam)
    const a = row(m.awayTeam)
    h.pj++; a.pj++
    h.gf += m.homeScore; h.gc += m.awayScore
    a.gf += m.awayScore; a.gc += m.homeScore

    // El ganador guardado ya contempla la definicion por penales
    // Si el partido quedo sin definir, no reparte puntos: no es un empate.
    const winner = m.winner === undefined
      ? (m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw')
      : m.winner
    if (winner === 'home') { h.pg++; h.pts += 3; a.pp++ }
    else if (winner === 'away') { a.pg++; a.pts += 3; h.pp++ }
    else if (winner === 'draw') { h.pe++; a.pe++; h.pts++; a.pts++ }
    // winner === null: partido sin definir, no suma puntos a nadie

    ;(m.sanctions || []).forEach(s => {
      const target = s.team === 'home' ? h : a
      if (s.type === 'yellow') target.amarillas++
      else if (s.type === 'blue') target.azules++
      else target.rojas++
    })
  })

  return Array.from(table.values()).sort((x, y) =>
    y.pts - x.pts || (y.gf - y.gc) - (x.gf - x.gc) || y.gf - x.gf || x.team.localeCompare(y.team)
  )
}

interface ScorerRow { number: string; team: string; name: string; goles: number }

function buildScorers(records: MatchRecord[]): ScorerRow[] {
  const map = new Map<string, ScorerRow>()

  records.forEach(m => {
    const goals = (m.matchLog || []).filter((e: MatchEvent) => e.eventType === 'gol')
    goals.forEach(g => {
      if (!g.team) return
      const teamName = g.team === 'home' ? m.homeTeam : m.awayTeam
      const roster = g.team === 'home' ? (m.homePlayers || []) : (m.awayPlayers || [])
      const player = roster.find(p => p.number === g.actor)
      const key = `${teamName}#${g.actor}`
      if (!map.has(key)) {
        map.set(key, { number: g.actor, team: teamName, name: player?.name || '', goles: 0 })
      }
      map.get(key)!.goles++
    })
  })

  return Array.from(map.values()).sort((a, b) => b.goles - a.goles || a.team.localeCompare(b.team))
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function MatchHistoryModal({
  open, onClose, matchHistory, deleteMatchFromHistory, clearHistory
}: MatchHistoryModalProps) {

  const [tab, setTab] = useState<'partidos' | 'posiciones' | 'goleadores'>('partidos')
  const [search, setSearch] = useState('')
  const [serieFilter, setSerieFilter] = useState('TODAS')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const series = useMemo(() => {
    const set = new Set(matchHistory.map(m => m.series).filter(Boolean))
    return ['TODAS', ...Array.from(set)]
  }, [matchHistory])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return matchHistory.filter(m => {
      if (serieFilter !== 'TODAS' && m.series !== serieFilter) return false
      if (!term) return true
      return (
        m.homeTeam.toLowerCase().includes(term) ||
        m.awayTeam.toLowerCase().includes(term) ||
        (m.series || '').toLowerCase().includes(term)
      )
    })
  }, [matchHistory, search, serieFilter])

  const standings = useMemo(() => buildStandings(filtered), [filtered])
  const scorers = useMemo(() => buildScorers(filtered), [filtered])

  // ─── Exportaciones ─────────────────────────────────────────────────────────

  const exportResumen = () => {
    if (filtered.length === 0) { toast.warning('No hay partidos que exportar con este filtro.'); return }
    let csv = 'HISTORIAL DE PARTIDOS\n'
    csv += `Filtro,${q(serieFilter)}\n`
    csv += `Partidos,${filtered.length}\n\n`
    csv += 'Fecha,Serie,Rama,Local,Goles Local,Goles Visita,Visita,Penales,Ganador\n'
    filtered.forEach(m => {
      const tie = m.homeScore === m.awayScore && ((m.homePenalties || 0) > 0 || (m.awayPenalties || 0) > 0)
      // null significa que fue a desempate y quedo igualado: no es empate.
      const winnerName = m.winner === 'draw' ? 'EMPATE'
        : m.winner === 'home' ? m.homeTeam
        : m.winner === 'away' ? m.awayTeam
        : 'NO DEFINIDO'
      csv += [
        fmtDate(m.date), q(m.series), q(m.gender), q(m.homeTeam),
        m.homeScore, m.awayScore, q(m.awayTeam),
        tie ? `${m.homePenalties}-${m.awayPenalties}` : '',
        q(winnerName)
      ].join(',') + '\n'
    })
    download(`historial_${serieFilter.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, csv)
    toast.success('Historial exportado')
  }

  const exportPosiciones = () => {
    if (standings.length === 0) { toast.warning('No hay datos para la tabla.'); return }
    let csv = 'TABLA DE POSICIONES\n'
    csv += `Serie,${q(serieFilter)}\n\n`
    csv += 'Pos,Equipo,PJ,PG,PE,PP,GF,GC,DIF,PTS,Amarillas,Azules,Rojas\n'
    standings.forEach((r, i) => {
      csv += [
        i + 1, q(r.team), r.pj, r.pg, r.pe, r.pp, r.gf, r.gc, r.gf - r.gc, r.pts,
        r.amarillas, r.azules, r.rojas
      ].join(',') + '\n'
    })
    csv += '\nGOLEADORES\nPos,Camiseta,Nombre,Equipo,Goles\n'
    scorers.forEach((s, i) => {
      csv += [i + 1, q(s.number), q(s.name), q(s.team), s.goles].join(',') + '\n'
    })
    download(`posiciones_${serieFilter.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`, csv)
    toast.success('Tabla y goleadores exportados')
  }

  const exportMatch = (m: MatchRecord) => {
    let csv = 'PARTIDO\n'
    csv += `Fecha,${fmtDate(m.date)}\n`
    csv += `Serie,${q(m.series)}\nRama,${q(m.gender)}\n`
    csv += `${q(m.homeTeam)},${m.homeScore}\n${q(m.awayTeam)},${m.awayScore}\n`
    if (m.homeScore === m.awayScore && ((m.homePenalties || 0) > 0 || (m.awayPenalties || 0) > 0)) {
      csv += `Definicion por penales,${m.homePenalties} - ${m.awayPenalties}\n`
    }
    csv += '\nCUERPO ARBITRAL\n'
    csv += `Arbitro Principal,${q(m.referees?.principal || '')}\n`
    csv += `Segundo Arbitro,${q(m.referees?.segundo || '')}\n`
    csv += `Cronometrista,${q(m.referees?.cronometrista || '')}\n`
    csv += '\nREGISTRO CRONOLOGICO\nPeriodo,Minuto,Equipo,Evento,Actor,Detalles\n'
    ;(m.matchLog || []).forEach(e => {
      const teamN = e.team === 'home' ? m.homeTeam : e.team === 'away' ? m.awayTeam : 'SISTEMA'
      csv += [
        periodLabel(e.period), fmtGameTime(e.gameTime), q(teamN),
        e.eventType.toUpperCase(), q(e.actor), q(e.details || '')
      ].join(',') + '\n'
    })
    download(`partido_${m.homeTeam}_vs_${m.awayTeam}_${fmtDate(m.date).replace(/\//g, '-')}.csv`, csv)
    toast.success('Partido exportado')
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const TabBtn = ({ id, label, icon }: { id: typeof tab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider rounded-t-lg transition-colors ${
        tab === id ? 'bg-zinc-800 text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon} {label}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white w-[98vw] max-w-6xl h-[92vh] p-0 flex flex-col overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="sr-only"><DialogTitle>Historial de partidos</DialogTitle></DialogHeader>

        <div className="bg-black p-3 border-b-2 border-yellow-600 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-5 h-5 text-yellow-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-black text-yellow-400 leading-tight truncate">HISTORIAL DE PARTIDOS</h2>
              <p className="text-zinc-500 text-[10px]">{matchHistory.length} guardados · se conservan los 60 más recientes</p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" className="text-zinc-400 hover:text-white shrink-0"><X className="w-6 h-6" /></Button>
        </div>

        <div className="bg-zinc-950 px-3 pt-2 border-b border-zinc-800 flex flex-wrap items-end gap-2 shrink-0">
          <TabBtn id="partidos" label="Partidos" icon={<History className="w-3.5 h-3.5" />} />
          <TabBtn id="posiciones" label="Posiciones" icon={<Trophy className="w-3.5 h-3.5" />} />
          <TabBtn id="goleadores" label="Goleadores" icon={<Target className="w-3.5 h-3.5" />} />
          <div className="flex-1" />
          <div className="flex items-center gap-2 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar equipo o serie"
                className="h-8 w-40 sm:w-52 pl-7 text-xs bg-zinc-900 border-zinc-700" />
            </div>
            <Select value={serieFilter} onValueChange={setSerieFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-zinc-900 border-zinc-700 font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                {series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {matchHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-zinc-600">
              <ShieldAlert className="w-12 h-12" />
              <p className="font-bold">Todavía no hay partidos guardados.</p>
              <p className="text-xs">Al finalizar un partido, usa el botón Historial de la planilla oficial.</p>
            </div>
          ) : tab === 'partidos' ? (
            <div className="space-y-2">
              {filtered.length === 0 && <p className="text-zinc-600 text-sm text-center py-8">Ningún partido coincide con el filtro.</p>}
              {filtered.map(m => {
                const tie = m.homeScore === m.awayScore && ((m.homePenalties || 0) > 0 || (m.awayPenalties || 0) > 0)
                const isOpen = expanded === m.id
                const cards = m.sanctions || []
                return (
                  <div key={m.id} className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 p-2.5">
                      <button onClick={() => setExpanded(isOpen ? null : m.id)} className="text-zinc-500 hover:text-white shrink-0">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{fmtDate(m.date)}</span>
                          <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase">{m.series || 'Sin serie'}</span>
                          <span className="text-[10px] font-bold text-zinc-600 uppercase">{m.gender}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`font-bold truncate ${m.winner === 'home' ? 'text-green-400' : 'text-white'}`}>{m.homeTeam}</span>
                          <span className="font-black text-lg tabular-nums text-yellow-400 shrink-0">{m.homeScore} - {m.awayScore}</span>
                          <span className={`font-bold truncate ${m.winner === 'away' ? 'text-green-400' : 'text-white'}`}>{m.awayTeam}</span>
                          {tie && <span className="text-[10px] font-bold text-purple-400 shrink-0">(pen {m.homePenalties}-{m.awayPenalties})</span>}
                        </div>
                      </div>
                      <Button onClick={() => exportMatch(m)} size="sm" variant="outline" className="h-8 border-zinc-700 text-xs shrink-0" title="Exportar este partido">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button onClick={() => { deleteMatchFromHistory(m.id); toast.success('Partido eliminado del historial') }}
                        size="sm" variant="outline" className="h-8 border-red-900 text-red-400 hover:bg-red-950 text-xs shrink-0" title="Eliminar del historial">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {isOpen && (
                      <div className="border-t border-zinc-800 p-3 bg-black/40 space-y-3">
                        <div className="flex flex-wrap gap-3 text-[11px]">
                          <span className="text-zinc-500">Árbitro: <span className="text-zinc-300 font-bold">{m.referees?.principal || '—'}</span></span>
                          <span className="text-zinc-500">Cronometrista: <span className="text-zinc-300 font-bold">{m.referees?.cronometrista || '—'}</span></span>
                          <span className="text-zinc-500">Eventos: <span className="text-zinc-300 font-bold">{(m.matchLog || []).length}</span></span>
                        </div>

                        {cards.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {cards.map((s, i) => (
                              <span key={i} className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                                s.type === 'yellow' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-700'
                                : s.type === 'blue' ? 'bg-blue-500/15 text-blue-400 border-blue-700'
                                : 'bg-red-500/15 text-red-400 border-red-700'}`}>
                                {s.team === 'home' ? 'L' : 'V'} #{s.playerNumber}{s.isBench ? ' (banca)' : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-[11px]">
                            <thead className="sticky top-0 bg-zinc-900">
                              <tr className="text-zinc-500 text-left">
                                <th className="py-1 px-1 font-bold">Per</th>
                                <th className="py-1 px-1 font-bold">Min</th>
                                <th className="py-1 px-1 font-bold">Equipo</th>
                                <th className="py-1 px-1 font-bold">Evento</th>
                                <th className="py-1 px-1 font-bold">#</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(m.matchLog || []).map(e => (
                                <tr key={e.id} className="border-t border-zinc-900">
                                  <td className="py-1 px-1 text-zinc-500 font-mono">{periodLabel(e.period)}</td>
                                  <td className="py-1 px-1 text-zinc-400 font-mono tabular-nums">{fmtGameTime(e.gameTime)}</td>
                                  <td className="py-1 px-1 text-zinc-400 truncate max-w-[120px]">{e.team === 'home' ? m.homeTeam : e.team === 'away' ? m.awayTeam : '—'}</td>
                                  <td className="py-1 px-1 text-zinc-300 font-bold uppercase">{e.eventType.replace(/_/g, ' ')}</td>
                                  <td className="py-1 px-1 text-zinc-400 font-mono">{e.actor}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : tab === 'posiciones' ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 px-1 text-left font-bold">#</th>
                  <th className="py-2 px-1 text-left font-bold">Equipo</th>
                  {['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DIF', 'PTS'].map(h => (
                    <th key={h} className="py-2 px-1 text-center font-bold">{h}</th>
                  ))}
                  <th className="py-2 px-1 text-center font-bold text-yellow-500">AM</th>
                  <th className="py-2 px-1 text-center font-bold text-blue-500">AZ</th>
                  <th className="py-2 px-1 text-center font-bold text-red-500">RJ</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((r, i) => (
                  <tr key={r.team} className="border-b border-zinc-900 hover:bg-zinc-800/40">
                    <td className="py-2 px-1 text-zinc-500 font-bold tabular-nums">{i + 1}</td>
                    <td className="py-2 px-1 font-bold text-white truncate max-w-[180px]">{r.team}</td>
                    <td className="py-2 px-1 text-center text-zinc-400 tabular-nums">{r.pj}</td>
                    <td className="py-2 px-1 text-center text-green-400 tabular-nums">{r.pg}</td>
                    <td className="py-2 px-1 text-center text-zinc-400 tabular-nums">{r.pe}</td>
                    <td className="py-2 px-1 text-center text-red-400 tabular-nums">{r.pp}</td>
                    <td className="py-2 px-1 text-center text-zinc-400 tabular-nums">{r.gf}</td>
                    <td className="py-2 px-1 text-center text-zinc-400 tabular-nums">{r.gc}</td>
                    <td className="py-2 px-1 text-center text-zinc-300 font-bold tabular-nums">{r.gf - r.gc > 0 ? '+' : ''}{r.gf - r.gc}</td>
                    <td className="py-2 px-1 text-center text-yellow-400 font-black tabular-nums">{r.pts}</td>
                    <td className="py-2 px-1 text-center text-zinc-500 tabular-nums">{r.amarillas}</td>
                    <td className="py-2 px-1 text-center text-zinc-500 tabular-nums">{r.azules}</td>
                    <td className="py-2 px-1 text-center text-zinc-500 tabular-nums">{r.rojas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 px-1 text-left font-bold">#</th>
                  <th className="py-2 px-1 text-left font-bold">Camiseta</th>
                  <th className="py-2 px-1 text-left font-bold">Jugador</th>
                  <th className="py-2 px-1 text-left font-bold">Equipo</th>
                  <th className="py-2 px-1 text-center font-bold">Goles</th>
                </tr>
              </thead>
              <tbody>
                {scorers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-zinc-600 py-8">Sin goles registrados en este filtro.</td></tr>
                )}
                {scorers.map((s, i) => (
                  <tr key={`${s.team}-${s.number}`} className="border-b border-zinc-900 hover:bg-zinc-800/40">
                    <td className="py-2 px-1 text-zinc-500 font-bold tabular-nums">{i + 1}</td>
                    <td className="py-2 px-1 font-black text-white tabular-nums">#{s.number}</td>
                    <td className="py-2 px-1 text-zinc-300 truncate max-w-[200px]">{s.name || <span className="text-zinc-600 italic">sin nombre en planilla</span>}</td>
                    <td className="py-2 px-1 text-zinc-400 truncate max-w-[160px]">{s.team}</td>
                    <td className="py-2 px-1 text-center font-black text-yellow-400 tabular-nums">{s.goles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-zinc-800 p-3 flex flex-wrap gap-2 shrink-0 bg-zinc-950">
          <Button onClick={exportResumen} className="flex-1 min-w-[140px] h-10 bg-green-600 hover:bg-green-500 font-bold text-xs">
            <Download className="w-4 h-4 mr-2" /> EXPORTAR HISTORIAL
          </Button>
          <Button onClick={exportPosiciones} className="flex-1 min-w-[140px] h-10 bg-blue-600 hover:bg-blue-500 font-bold text-xs">
            <Trophy className="w-4 h-4 mr-2" /> TABLA Y GOLEADORES
          </Button>
          <Button onClick={() => setConfirmClear(true)} variant="outline" className="h-10 border-red-900 text-red-400 hover:bg-red-950 font-bold text-xs">
            <Trash2 className="w-4 h-4 mr-2" /> BORRAR TODO
          </Button>
        </div>

        <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
          <DialogContent className="bg-zinc-900 border-2 border-red-700 text-white max-w-md" aria-describedby={undefined}>
            <DialogHeader className="sr-only"><DialogTitle>Confirmar borrado</DialogTitle></DialogHeader>
            <div className="text-center p-4">
              <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-black text-red-500 mb-2">BORRAR TODO EL HISTORIAL</h2>
              <p className="text-zinc-400 mb-2 text-sm">Se eliminarán los {matchHistory.length} partidos guardados. Esto no se puede deshacer.</p>
              <p className="text-zinc-500 mb-5 text-xs">Exporta el historial antes si necesitas conservarlo.</p>
              <div className="flex gap-3">
                <Button onClick={() => setConfirmClear(false)} variant="outline" className="flex-1 h-11 font-bold border-zinc-600">CANCELAR</Button>
                <Button onClick={() => { clearHistory(); setConfirmClear(false); toast.success('Historial borrado') }} className="flex-1 h-11 font-black bg-red-600 hover:bg-red-500">SÍ, BORRAR</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
