"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Users, Trash2, Check, Search, Shield, Plus, X, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Team } from '@/hooks/use-game-state'
import { SERIES_ORDERED, serieLabel, findSerie } from '@/lib/series'
import { squadFor } from '@/lib/club-roster'
import { DEFAULT_ENTRIES, MAX_ENTRIES, MAX_GOALIES, type ExpressEntry } from '@/components/scoreboard/ExpressRosterModal'

/**
 * EQUIPOS GUARDADOS
 *
 * Un club tiene UN plantel por serie. Antes se guardaba un registro por
 * combinacion club+serie, lo que obligaba a repetir el escudo en cada uno y a
 * elegir la serie dos veces: una en el partido y otra aqui.
 *
 * Ahora el club se guarda una vez, con las diez series creadas por defecto, y
 * aqui solo se edita el plantel de la serie que ya se eligio para el partido.
 * El escudo se configura en el gestor de pantallas, que es donde vive la
 * identidad visual.
 */

interface Props {
  open: boolean
  onClose: () => void
  side: 'home' | 'away'
  savedTeams: Team[]
  saveTeam: (t: Team) => void
  deleteTeam: (id: string) => void
  /** Serie del partido en curso. Es la que se edita: no se vuelve a preguntar. */
  serieId: string
  onPick: (name: string, entries: ExpressEntry[]) => void
}

/** Plantel inicial de cada serie al crear un club. */
const rostersPorDefecto = (): Record<string, ExpressEntry[]> => {
  const out: Record<string, ExpressEntry[]> = {}
  SERIES_ORDERED.forEach(se => {
    const club = squadFor(se.id)
    out[se.id] = club.length
      ? club.map(p => ({ number: p.number, isGoalie: !!p.isGoalie }))
      : DEFAULT_ENTRIES.map(e => ({ ...e }))
  })
  return out
}

export function SavedTeamsModal({
  open, onClose, side, savedTeams, saveTeam, deleteTeam, serieId, onPick
}: Props) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [entries, setEntries] = useState<ExpressEntry[]>([])
  const [draft, setDraft] = useState('')

  const serie = serieId && serieId !== 'amistoso' ? serieId : ''
  const serieName = serie ? serieLabel(findSerie(serie)!) : 'Amistoso'

  useEffect(() => { if (open) { setSearch(''); startNew() } }, [open]) // eslint-disable-line

  const startNew = () => {
    setEditing(null); setName('')
    setEntries(serie ? (rostersPorDefecto()[serie] || []) : DEFAULT_ENTRIES.map(e => ({ ...e })))
    setDraft('')
  }

  /** Al abrir un club se muestra su plantel DE ESTA SERIE. */
  const load = (t: Team) => {
    setEditing(t); setName(t.name)
    const r = serie ? t.rosters?.[serie] : undefined
    setEntries(r?.length ? r : (t.roster?.length ? t.roster : DEFAULT_ENTRIES.map(e => ({ ...e }))))
    setDraft('')
  }

  const listed = savedTeams.filter(t => {
    const q = search.trim().toLowerCase()
    return !q || t.name.toLowerCase().includes(q)
  })

  const addNumbers = () => {
    const nums = draft.split(/[,\s]+/).map(n => n.trim()).filter(n => /^\d{1,2}$/.test(n))
    if (!nums.length) return
    const next = [...entries]
    nums.forEach(n => {
      if (next.length < MAX_ENTRIES && !next.some(e => e.number === n)) next.push({ number: n, isGoalie: false })
    })
    setEntries(next); setDraft('')
  }

  const toggleGoalie = (num: string) =>
    setEntries(prev => {
      const t = prev.find(e => e.number === num)
      if (t && !t.isGoalie && prev.filter(e => e.isGoalie).length >= MAX_GOALIES) {
        toast.warning(`Máximo ${MAX_GOALIES} porteros.`); return prev
      }
      return prev.map(e => e.number === num ? { ...e, isGoalie: !e.isGoalie } : e)
    })

  /** Guarda el club entero; sólo cambia el plantel de la serie en curso. */
  const persist = () => {
    const n = name.trim().toUpperCase()
    if (!n) { toast.warning('Escribe el nombre del club.'); return }
    const base = editing?.rosters || rostersPorDefecto()
    const t: Team = {
      id: editing?.id || `team-${Date.now()}`,
      name: n,
      logo: editing?.logo ?? null,
      rosters: serie ? { ...base, [serie]: entries } : base
    }
    saveTeam(t)
    toast.success(editing ? `${n} actualizado` : `${n} creado con las ${SERIES_ORDERED.length} series`)
    setEditing(t)
  }

  const use = () => {
    const n = name.trim().toUpperCase()
    if (!n) { toast.warning('Escribe o elige un club.'); return }
    onPick(n, entries)
    onClose()
  }

  const accent = side === 'home' ? 'text-blue-400' : 'text-amber-400'

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-2xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Users className="w-5 h-5 text-blue-400" />
            Clubes · <span className={accent}>{side === 'home' ? 'LOCAL' : 'VISITA'}</span>
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 leading-snug flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            Editando el plantel de <b className="text-zinc-300">{serieName}</b>. Cada club guarda
            un plantel por serie; el escudo se configura en el gestor de pantallas.
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">

          {/* ── Clubes ────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar club"
                className="h-9 pl-7 text-xs bg-zinc-950 border-zinc-700" />
            </div>

            <div className="max-h-[320px] overflow-y-auto space-y-1.5">
              {listed.map(t => {
                const enSerie = serie ? t.rosters?.[serie]?.length : undefined
                const total = t.rosters ? Object.values(t.rosters).filter(r => r.length).length : 0
                return (
                  <div key={t.id}
                    className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                      editing?.id === t.id ? 'border-blue-500 bg-blue-950/30' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}
                    onClick={() => load(t)}>
                    {t.logo
                      ? <img src={t.logo} alt="" className="w-8 h-8 object-contain shrink-0" />
                      : <div className="w-8 h-8 rounded bg-zinc-800 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-bold truncate">{t.name}</span>
                      <span className="block text-[10px] text-zinc-500">
                        {total} series
                        {enSerie ? ` · ${enSerie} camisetas en ${serieName}` : ''}
                      </span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteTeam(t.id); toast.success('Club eliminado') }}
                      className="text-red-500 hover:text-red-400 shrink-0" title="Eliminar club">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
              {listed.length === 0 && (
                <p className="text-[11px] text-zinc-600 text-center py-8 leading-snug">
                  {savedTeams.length === 0
                    ? 'Todavía no hay clubes. Escribe el nombre al lado y guarda: se crean las diez series con su plantel por defecto.'
                    : 'Ninguno coincide con la búsqueda.'}
                </p>
              )}
            </div>

            <Button onClick={startNew} variant="outline" className="w-full h-9 text-xs font-bold border-zinc-600">
              <Plus className="w-4 h-4 mr-1.5" /> CLUB NUEVO
            </Button>
          </div>

          {/* ── Plantel de la serie en curso ──────────────────────────────── */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nombre del club</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: DEPORTES TEMUCO"
                className="h-10 mt-1 bg-zinc-950 border-zinc-700 font-bold" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Camisetas · {serieName} · {entries.length}/{MAX_ENTRIES}
                </label>
                <button onClick={() => setEntries(DEFAULT_ENTRIES.map(e => ({ ...e })))}
                  className="text-[9px] font-black text-zinc-500 hover:text-zinc-300">POR DEFECTO</button>
              </div>

              <div className="flex gap-1">
                <Input value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNumbers() } }}
                  placeholder="7  ·  o varios: 7 9 12" inputMode="numeric"
                  className="h-9 bg-zinc-950 border-zinc-700 text-center font-bold text-sm" />
                <Button onClick={addNumbers} className="h-9 px-3 bg-green-700 hover:bg-green-600"><Plus className="w-4 h-4" /></Button>
              </div>

              <div className="grid grid-cols-5 gap-1.5 mt-2 max-h-[150px] overflow-y-auto">
                {entries.map(e => (
                  <div key={e.number} className="relative">
                    <button onClick={() => toggleGoalie(e.number)} title="Tocar para marcar portero"
                      className={`w-full h-11 rounded-lg border-2 flex flex-col items-center justify-center ${
                        e.isGoalie ? 'border-green-400 bg-green-950/50' : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500'}`}>
                      <span className="font-black text-sm leading-none">{e.number}</span>
                      {e.isGoalie && <span className="flex items-center gap-0.5 text-[7px] font-black text-green-400"><Shield className="w-2 h-2" />PO</span>}
                    </button>
                    <button onClick={() => setEntries(prev => prev.filter(x => x.number !== e.number))}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-700 border border-red-400 flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button onClick={persist} variant="outline" className="h-11 font-bold border-zinc-600 text-xs">GUARDAR</Button>
              <Button onClick={use} className="h-11 font-black bg-green-700 hover:bg-green-600 text-xs">
                <Check className="w-4 h-4 mr-1.5" /> USAR
              </Button>
            </div>
            <p className="text-[10px] text-zinc-600 leading-snug">
              GUARDAR deja el club para las próximas fechas, con esta serie actualizada.
              USAR lo carga en este partido.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
