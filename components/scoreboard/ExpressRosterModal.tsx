"use client"

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Shield, Check, Trash2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface ExpressEntry { number: string; isGoalie: boolean }

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setEntries(value); setDraft('') } }, [open, value])

  const accent = side === 'home' ? 'blue' : 'amber'

  const add = () => {
    // Acepta "7" o varios de una vez: "7 9 12" o "7,9,12"
    const nums = draft.split(/[,\s]+/).map(n => n.trim()).filter(n => /^\d{1,2}$/.test(n))
    if (nums.length === 0) { toast.warning('Escribe un número de camiseta.'); return }

    const nuevos: ExpressEntry[] = []
    const repetidos: string[] = []
    nums.forEach(n => {
      if (entries.some(e => e.number === n) || nuevos.some(e => e.number === n)) repetidos.push(n)
      else nuevos.push({ number: n, isGoalie: false })
    })

    if (repetidos.length) toast.warning(`Ya estaba cargado: ${repetidos.join(', ')}`)
    if (nuevos.length) setEntries(prev => [...prev, ...nuevos])
    setDraft('')
    inputRef.current?.focus()
  }

  const toggleGoalie = (num: string) =>
    setEntries(prev => prev.map(e => e.number === num ? { ...e, isGoalie: !e.isGoalie } : e))

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
                  <button
                    onClick={() => toggleGoalie(e.number)}
                    className={`w-full h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${
                      e.isGoalie
                        ? 'border-green-400 bg-green-950/50 ring-2 ring-green-500/40'
                        : accent === 'blue'
                          ? 'border-blue-700 bg-blue-950/40 hover:border-blue-400'
                          : 'border-amber-700 bg-amber-950/40 hover:border-amber-400'
                    }`}
                    title={e.isGoalie ? 'Portero — tocar para quitar' : 'Tocar para marcar como portero'}
                  >
                    <span className="font-black text-xl leading-none">{e.number}</span>
                    {e.isGoalie && (
                      <span className="flex items-center gap-0.5 text-[8px] font-black text-green-400 mt-0.5">
                        <Shield className="w-2.5 h-2.5" /> PO
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => remove(e.number)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-700 hover:bg-red-600 border border-red-400 flex items-center justify-center"
                    title="Quitar">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[11px] text-center font-bold">
          {entries.length === 0 ? (
            <span className="text-zinc-600">Plantel genérico</span>
          ) : goalies === 0 ? (
            <span className="text-amber-400">
              Sin portero marcado — se tomará el primero ({entries[0].number})
            </span>
          ) : (
            <span className="text-zinc-400">
              {entries.length} camisetas · {goalies} portero{goalies > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setEntries([])} variant="outline"
            disabled={entries.length === 0}
            className="h-11 font-bold border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-30">
            <Trash2 className="w-4 h-4 mr-1.5" /> VACIAR
          </Button>
          <Button onClick={() => { onSave(entries); onClose() }}
            className="flex-1 h-11 font-black bg-green-700 hover:bg-green-600">
            <Check className="w-4 h-4 mr-2" /> LISTO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
