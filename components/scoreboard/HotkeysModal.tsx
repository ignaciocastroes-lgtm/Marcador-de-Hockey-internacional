"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Keyboard, RotateCcw, Gamepad2, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  HOTKEY_DEFS, DEFAULT_HOTKEYS, CLICKER_HOTKEYS, normalizeKey, findConflicts,
  loadHotkeys, saveHotkeys, type HotkeyMap, type HotkeyAction
} from '@/lib/hotkeys'

interface Props {
  open: boolean
  onClose: () => void
  onChange: (map: HotkeyMap) => void
}

const GROUPS = ['Reloj', 'Posesión', 'Marcador', 'Partido'] as const

const prettyKey = (k: string) =>
  k === 'Space' ? 'Espacio' : k === 'Escape' ? 'Esc' : k.length === 1 ? k.toUpperCase() : k

export function HotkeysModal({ open, onClose, onChange }: Props) {
  const [map, setMap] = useState<HotkeyMap>(DEFAULT_HOTKEYS)
  const [listening, setListening] = useState<HotkeyAction | null>(null)

  useEffect(() => { if (open) setMap(loadHotkeys()) }, [open])

  // Captura global: así funciona con cualquier mando, sin importar dónde esté el foco
  useEffect(() => {
    if (!listening) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.repeat) return
      const key = normalizeKey(e)
      setMap(prev => {
        const next = { ...prev, [listening]: key }
        saveHotkeys(next)
        onChange(next)
        return next
      })
      setListening(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [listening, onChange])

  const conflicts = findConflicts(map)
  const conflictingActions = new Set(Object.values(conflicts).flat())

  const apply = (next: HotkeyMap, msg: string) => {
    setMap(next); saveHotkeys(next); onChange(next); toast.success(msg)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setListening(null); onClose() } }}>
      <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-2xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Keyboard className="w-5 h-5 text-blue-400" /> Teclas rápidas y mando
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Un mando Bluetooth de presentación se empareja como teclado: pulsa su botón al asignar
            y queda configurado. Funciona sin red y sin latencia.
          </p>

          <div className="flex gap-2">
            <Button onClick={() => apply({ ...map, ...CLICKER_HOTKEYS } as HotkeyMap, 'Perfil de mando aplicado')}
              className="flex-1 h-10 text-xs font-bold bg-blue-700 hover:bg-blue-600">
              <Gamepad2 className="w-4 h-4 mr-1.5" /> PERFIL MANDO BLUETOOTH
            </Button>
            <Button onClick={() => apply(DEFAULT_HOTKEYS, 'Valores por defecto restaurados')}
              variant="outline" className="h-10 text-xs font-bold border-zinc-600">
              <RotateCcw className="w-4 h-4 mr-1.5" /> POR DEFECTO
            </Button>
          </div>

          {Object.keys(conflicts).length > 0 && (
            <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-800 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-snug">
                Hay teclas repetidas. Cuando dos acciones comparten tecla, sólo se ejecuta la primera de la lista.
              </p>
            </div>
          )}

          {GROUPS.map(group => (
            <div key={group}>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{group}</p>
              <div className="space-y-1">
                {HOTKEY_DEFS.filter(d => d.group === group).map(def => {
                  const isListening = listening === def.action
                  const hasConflict = conflictingActions.has(def.action)
                  return (
                    <div key={def.action} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-zinc-200">{def.label}</span>
                        {def.hint && <span className="text-[10px] text-zinc-600 ml-2">{def.hint}</span>}
                      </div>
                      {def.priority === 1 && (
                        <span className="text-[9px] font-black text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded shrink-0" title="Se usa en cada jugada: candidata para el mando">MESA</span>
                      )}
                      <Button
                        onClick={() => setListening(isListening ? null : def.action)}
                        className={`h-9 min-w-[110px] font-mono font-bold text-xs shrink-0 ${
                          isListening ? 'bg-blue-600 hover:bg-blue-500 animate-pulse'
                          : hasConflict ? 'bg-amber-800 hover:bg-amber-700'
                          : 'bg-zinc-800 hover:bg-zinc-700'}`}
                      >
                        {isListening ? 'Pulsa…' : prettyKey(map[def.action] || '—')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <Button onClick={() => { setListening(null); onClose() }} className="w-full h-11 font-black bg-green-700 hover:bg-green-600">
            <Check className="w-4 h-4 mr-2" /> LISTO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
