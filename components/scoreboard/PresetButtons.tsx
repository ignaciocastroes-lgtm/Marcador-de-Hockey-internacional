"use client"

import { useRef } from 'react'
import { toast } from 'sonner'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  downloadPreset, parsePreset, applyPreset, contarPreset, type PresetKind
} from '@/lib/preset-pack'

/**
 * Guardar y recuperar un montaje. Mismo par de botones para los dos paneles:
 * una sola implementacion, porque el mecanismo es identico y lo unico que
 * cambia es que claves componen cada montaje.
 *
 * Importar RECARGA. Las posiciones de los tableros y la apariencia las leen
 * media docena de componentes al montarse, y varios viven en ventanas
 * distintas; intentar refrescarlos en caliente deja la mitad vieja y la mitad
 * nueva. Recargar es honesto y tarda un segundo.
 */
export function PresetButtons({ kind }: { kind: PresetKind }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const guardados = contarPreset(kind)

  const importar = (file: File) => {
    const lector = new FileReader()
    lector.onload = () => {
      const { datos, error } = parsePreset(kind, String(lector.result || ''))
      if (error || !datos) { toast.error(error || 'No se pudo leer el montaje'); return }
      const n = applyPreset(kind, datos)
      toast.success(`Montaje aplicado (${n} ajustes). Recargando…`)
      setTimeout(() => window.location.reload(), 900)
    }
    lector.readAsText(file)
  }

  return (
    <div className="border-t border-zinc-800 pt-3 mt-1">
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
        Montaje
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            if (guardados === 0) { toast.info('Todavía no hay nada ajustado que guardar'); return }
            downloadPreset(kind)
            toast.success('Montaje guardado')
          }}
          variant="outline" className="h-10 text-[10px] font-bold border-zinc-600">
          <Download className="w-4 h-4 mr-1" /> GUARDAR
        </Button>
        <Button onClick={() => fileRef.current?.click()}
          variant="outline" className="h-10 text-[10px] font-bold border-zinc-600">
          <Upload className="w-4 h-4 mr-1" /> CARGAR
        </Button>
      </div>
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
      <p className="text-[10px] text-zinc-600 leading-snug mt-1.5">
        Guarda cómo quedó todo ajustado y aplícalo en otro equipo sin volver a
        encuadrarlo. No incluye el plantel ni el partido.
      </p>
    </div>
  )
}
