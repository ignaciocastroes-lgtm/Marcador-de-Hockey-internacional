"use client"

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Volume2, Upload, Trash2, Play, Check, Bell, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  loadAudioConfig, saveAudioConfig, clearCustomSound, fileToDataUrl,
  playHorn, playBeep, stopHorn, MAX_CUSTOM_BYTES,
  DEFAULT_AUDIO, type AudioConfig
} from '@/lib/audio-engine'

interface Props { open: boolean; onClose: () => void; onChange?: (c: AudioConfig) => void }

export function AudioModal({ open, onClose, onChange }: Props) {
  const [cfg, setCfg] = useState<AudioConfig>(DEFAULT_AUDIO)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) setCfg(loadAudioConfig()) }, [open])

  const apply = (next: AudioConfig) => {
    try {
      saveAudioConfig(next)
      setCfg(next)
      onChange?.(next)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const onFile = async (file?: File) => {
    if (!file) return
    try {
      const data = await fileToDataUrl(file)
      apply({ ...cfg, hornMode: 'custom', customName: file.name, customData: data })
      toast.success(`"${file.name}" cargado como chicharra`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cargar el archivo')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const Slider = ({ label, value, onChange: set }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-zinc-300">{label}</span>
        <span className="text-[10px] font-mono text-zinc-500">{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={5} max={100} value={Math.round(value * 100)}
        onChange={e => set(parseInt(e.target.value) / 100)}
        className="w-full accent-blue-500" />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { stopHorn(); onClose() } }}>
      <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-md max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Volume2 className="w-5 h-5 text-blue-400" /> Sonido
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── BOCINA ─────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Bocina</p>
            <p className="text-[11px] text-zinc-500 leading-snug">
              Fin de periodo, fin de posesión y fin de partido.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => apply({ ...cfg, hornMode: 'synth' })}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  cfg.hornMode === 'synth' ? 'border-blue-500 bg-blue-950/40' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}>
                <span className="block text-sm font-black">Sintetizada</span>
                <span className="block text-[10px] text-zinc-500 leading-snug">Sin archivos ni internet</span>
              </button>
              <button onClick={() => cfg.customData ? apply({ ...cfg, hornMode: 'custom' }) : fileRef.current?.click()}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  cfg.hornMode === 'custom' ? 'border-blue-500 bg-blue-950/40' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'}`}>
                <span className="block text-sm font-black">Archivo propio</span>
                <span className="block text-[10px] text-zinc-500 truncate leading-snug">
                  {cfg.customName || 'Sin archivo'}
                </span>
              </button>
            </div>

            <input ref={fileRef} type="file" accept="audio/*" className="hidden"
              onChange={e => onFile(e.target.files?.[0])} />

            <div className="flex gap-2">
              <Button onClick={() => fileRef.current?.click()} variant="outline"
                className="flex-1 h-9 text-xs font-bold border-zinc-600">
                <Upload className="w-3.5 h-3.5 mr-1.5" /> CARGAR MP3
              </Button>
              <Button
                onClick={() => { setCfg(clearCustomSound()); toast.success('Sonido borrado, vuelve la sintetizada') }}
                disabled={!cfg.customData}
                variant="outline"
                className="h-9 text-xs font-bold border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-30">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> VACIAR
              </Button>
            </div>

            <p className="text-[10px] text-zinc-600 leading-snug">
              Máximo {Math.round(MAX_CUSTOM_BYTES / 1024)} KB. Si el archivo falla o suena mal, VACIAR
              devuelve la bocina sintetizada al instante.
            </p>

            <Slider label="Volumen de la bocina" value={cfg.hornVolume}
              onChange={v => apply({ ...cfg, hornVolume: v })} />

            <Button onClick={() => playHorn(900, cfg)} className="w-full h-10 font-bold bg-red-700 hover:bg-red-600 text-xs">
              <Bell className="w-4 h-4 mr-2" /> PROBAR BOCINA
            </Button>
          </div>

          {/* ── PULSOS ─────────────────────────────────────────────────────── */}
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pulsos</p>
            <p className="text-[11px] text-zinc-500 leading-snug">
              La cuenta atrás de los últimos segundos. Van en un registro mucho más agudo
              que la bocina, para que no se confundan en un pabellón ruidoso.
            </p>

            <button onClick={() => apply({ ...cfg, beepsEnabled: !cfg.beepsEnabled })}
              className="w-full flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-left hover:border-zinc-600">
              <span className={`w-9 h-5 rounded-full shrink-0 relative transition-colors ${cfg.beepsEnabled ? 'bg-green-600' : 'bg-zinc-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${cfg.beepsEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
              <span className="text-sm font-bold text-zinc-200">Pulsos de cuenta atrás</span>
            </button>

            <Slider label="Volumen de los pulsos" value={cfg.beepVolume}
              onChange={v => apply({ ...cfg, beepVolume: v })} />

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => playBeep('tick', cfg)} className="h-9 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700">
                <Zap className="w-3 h-3 mr-1" /> PULSO
              </Button>
              <Button onClick={() => playBeep('last', cfg)} className="h-9 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700">
                <Zap className="w-3 h-3 mr-1" /> ÚLTIMO
              </Button>
              <Button onClick={() => playBeep('alert', cfg)} className="h-9 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700">
                <AlertTriangle className="w-3 h-3 mr-1" /> AVISO
              </Button>
            </div>
          </div>

          <Button onClick={() => { stopHorn(); onClose() }} className="w-full h-11 font-black bg-green-700 hover:bg-green-600">
            <Check className="w-4 h-4 mr-2" /> LISTO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
