"use client"

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Shield, Check, Trash2, Plus, X, Pencil, RotateCcw, Users, AlertTriangle } from 'lucide-react'
import { SERIES_ORDERED, serieLabel } from '@/lib/series'
import { squadFor, detectClashes, CLUB_PLAYERS } from '@/lib/club-roster'
import { CLUB_BRAND } from '@/lib/club-brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface ExpressEntry { number: string; isGoalie: boolean }

/** Plantel reglamentario de pista: 8 jugadores y 2 porteros. */
export const MAX_ENTRIES = 10
export const MAX_GOALIES = 2

export const DEFAULT_ENTRIES: ExpressEntry[] = [
  { number: '1',  isGoalie: true },
  { number: '10', isGoalie: true },
  { number: '2',  isGoalie: false },
  { number: '3',  isGoalie: false },
  { number: '4',  isGoalie: false },
  { number: '5',  isGoalie: false },
  { number: '6',  isGoalie: false },
  { number: '7',  isGoalie: false },
  { number: '8',  isGoalie: false },
  { number: '9',  isGoalie: false }
]

interface Props {
  open: boolean
  onClose: () => void
  teamName: string
  side: 'home' | 'away'
  value: ExpressEntry[]
  onSave: (entries: ExpressEntry[]) => void
}

export function ExpressRosterModal({ open, onClose, teamName, side, value, onSave }: Props) {
  const [entries, setEntries] = useState<ExpressEntry[]>([])
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Vienen predefinidas: el operador sólo cambia el número que necesite
  useEffect(() => {
    if (open) {
      setEntries(value.length > 0 ? value : DEFAULT_ENTRIES.map(e => ({ ...e })))
      setDraft('')
      setEditing(null)
    }
  }, [open, value])

  const accent = side === 'home' ? 'blue' : 'amber'

  const add = () => {
    // Acepta "7" o varios de una vez: "7 9 12" o "7,9,12"
    const nums = draft.split(/[,\s]+/).map(n => n.trim()).filter(n => /^\d{1,2}$/.test(n))
    if (nums.length === 0) { toast.warning('Escribe un número de camiseta.'); return }

    const nuevos: ExpressEntry[] = []
    const repetidos: string[] = []
    nums.forEach(n => {
      if (entries.some(e => e.number === n) || nuevos.some(e => e.number === n)) repetidos.push(n)
      else if (entries.length + nuevos.length < MAX_ENTRIES) nuevos.push({ number: n, isGoalie: false })
    })

    if (entries.length + nuevos.length >= MAX_ENTRIES && nums.length > nuevos.length + repetidos.length) {
      toast.warning(`Máximo ${MAX_ENTRIES} camisetas por equipo: 8 jugadores y 2 porteros.`)
    }
    if (repetidos.length) toast.warning(`Ya estaba cargado: ${repetidos.join(', ')}`)
    if (nuevos.length) setEntries(prev => [...prev, ...nuevos])
    setDraft('')
    inputRef.current?.focus()
  }

  const toggleGoalie = (num: string) =>
    setEntries(prev => {
      const target = prev.find(e => e.number === num)
      if (target && !target.isGoalie && prev.filter(e => e.isGoalie).length >= MAX_GOALIES) {
        toast.warning(`Máximo ${MAX_GOALIES} porteros. Quita uno antes de marcar otro.`)
        return prev
      }
      return prev.map(e => e.number === num ? { ...e, isGoalie: !e.isGoalie } : e)
    })

  /** Cambiar el número de una ficha sin perder su marca de portero. */
  const rename = (oldNum: string, newNum: string) => {
    const n = newNum.trim()
    if (!/^\d{1,2}$/.test(n)) { setEditing(null); return }
    if (entries.some(e => e.number === n && e.number !== oldNum)) {
      toast.warning(`El ${n} ya está cargado.`); setEditing(null); return
    }
    setEntries(prev => prev.map(e => e.number === oldNum ? { ...e, number: n } : e))
    setEditing(null)
  }

  const remove = (num: string) =>
    setEntries(prev => prev.filter(e => e.number !== num))

  const goalies = entries.filter(e => e.isGoalie).length

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-lg max-h-[92vh] flex flex-col overflow-hidden" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            Camisetas · <span className={accent === 'blue' ? 'text-blue-400' : 'text-amber-400'}>{teamName || (side === 'home' ? 'LOCAL' : 'VISITA')}</span>
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 leading-snug">
            Escribe el número y pulsa Enter. Toca una ficha para marcarla como portero.
          </p>
        </DialogHeader>

        {/* Cargar una serie del club: los números vienen con la persona */}
        <div className="flex gap-2 items-center bg-zinc-950 border border-zinc-800 rounded-lg p-2">
          <Users className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-[10px] font-black text-zinc-500 uppercase shrink-0">{CLUB_BRAND.shortName}</span>
          <select
            onChange={e => {
              const squad = squadFor(e.target.value)
              if (squad.length === 0) { toast.info('Esa serie todavía no tiene plantel cargado.'); return }
              const next = squad.slice(0, MAX_ENTRIES).map(p => ({ number: p.number, isGoalie: !!p.isGoalie }))
              setEntries(next)
              const clashes = detectClashes(squad)
              clashes.forEach(c => {
                toast.warning(`El número ${c.number} lo comparten ${c.players.map(p => p.name).join(' y ')}. Hay que cambiar uno antes del partido.`, { duration: 8000 })
              })
              if (clashes.length === 0) toast.success(`${squad.length} camisetas cargadas`)
              e.target.value = ''
            }}
            defaultValue=""
            className="flex-1 h-8 bg-zinc-800 border border-zinc-600 rounded text-xs font-bold px-2">
            <option value="" disabled>Cargar serie…</option>
            {SERIES_ORDERED.map(se => (
              <option key={se.id} value={se.id}>
                {serieLabel(se)}{squadFor(se.id).length ? ` (${squadFor(se.id).length})` : ' — vacía'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder="Ej: 7   ·   o varios: 7 9 12"
            inputMode="numeric"
            autoFocus
            className="h-12 bg-zinc-800 border-zinc-600 text-center text-xl font-black"
          />
          <Button onClick={add} className="h-12 px-4 font-black bg-green-700 hover:bg-green-600">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[140px] py-1">
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-10">
              Sin camisetas cargadas.<br />
              <span className="text-xs">Si lo dejas vacío se genera el plantel genérico.</span>
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {entries.map(e => (
                <div key={e.number} className="relative">
                  {editing === e.number ? (
                    <input
                      autoFocus
                      defaultValue={e.number}
                      onBlur={ev => rename(e.number, ev.target.value)}
                      onKeyDown={ev => {
                        if (ev.key === 'Enter') rename(e.number, (ev.target as HTMLInputElement).value)
                        if (ev.key === 'Escape') setEditing(null)
                      }}
                      inputMode="numeric"
                      className="w-full h-16 rounded-xl bg-zinc-800 border-2 border-white text-center text-xl font-black outline-none"
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => toggleGoalie(e.number)}
                        onDoubleClick={() => setEditing(e.number)}
                        className={`w-full h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${
                          e.isGoalie
                            ? 'border-green-400 bg-green-950/50 ring-2 ring-green-500/40'
                            : accent === 'blue'
                              ? 'border-blue-700 bg-blue-950/40 hover:border-blue-400'
                              : 'border-amber-700 bg-amber-950/40 hover:border-amber-400'
                        }`}
                        title="Tocar: portero · Doble toque o lápiz: cambiar número"
                      >
                        <span className="font-black text-xl leading-none">{e.number}</span>
                        {e.isGoalie && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black text-green-400 mt-0.5">
                            <Shield className="w-2.5 h-2.5" /> PO
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(e.number)}
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-zinc-700 hover:bg-zinc-600 border border-zinc-400 flex items-center justify-center"
                        title="Cambiar número">
                        <Pencil className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button
                        onClick={() => remove(e.number)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-700 hover:bg-red-600 border border-red-400 flex items-center justify-center"
                        title="Quitar">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {(() => {
          const dup = entries.filter((e, i) => entries.findIndex(x => x.number === e.number) !== i)
          if (dup.length === 0) return null
          return (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg p-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200 leading-snug">
                Hay camisetas repetidas ({dup.map(d => d.number).join(', ')}). El motor de tarjetas no
                puede distinguirlas: las sanciones de una se le acumularían a la otra.
              </p>
            </div>
          )
        })()}

        <div className="text-[11px] text-center font-bold">
          {entries.length === 0 ? (
            <span className="text-zinc-600">Plantel genérico</span>
          ) : goalies === 0 ? (
            <span className="text-amber-400">
              Sin portero marcado — se tomará el primero ({entries[0].number})
            </span>
          ) : (
            <span className="text-zinc-400">
              {entries.length}/{MAX_ENTRIES} camisetas · {goalies}/{MAX_GOALIES} porteros
              {entries.length === MAX_ENTRIES && goalies === MAX_GOALIES && ' · plantel completo'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => { setEntries(DEFAULT_ENTRIES.map(e => ({ ...e }))); toast.success('Camisetas por defecto') }}
            variant="outline" className="h-11 font-bold border-zinc-600 text-xs">
            <RotateCcw className="w-4 h-4 mr-1.5" /> DEFECTO
          </Button>
          <Button onClick={() => setEntries([])} variant="outline"
            disabled={entries.length === 0}
            className="h-11 font-bold border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-30 text-xs">
            <Trash2 className="w-4 h-4 mr-1.5" /> VACIAR
          </Button>
          <Button onClick={() => { onSave(entries); onClose() }}
            className="h-11 font-black bg-green-700 hover:bg-green-600 text-xs">
            <Check className="w-4 h-4 mr-1.5" /> GUARDAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
