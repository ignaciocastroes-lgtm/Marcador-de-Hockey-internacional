"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Layers, Plus, Trash2, ChevronUp, ChevronDown, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { bootClub } from '@/lib/club-boot'
import { saveClub, seriesOf, saveSerie, deleteSerie, squadOf, type ClubStore } from '@/lib/club-store'
import { normalize } from '@/lib/identity'
import type { Serie } from '@/lib/series'

/**
 * LAS CATEGORIAS DE LA LIGA
 *
 * Estaban escritas en `lib/series.ts`, un archivo que decia de si mismo que era
 * "la estructura real de la competencia chilena". Un club espanol tiene
 * Benjamin, Alevin e Infantil, y no habia forma de cambiarlo sin recompilar.
 *
 * La pantalla es deliberadamente corta: una serie son tres datos —nombre, rama
 * y en que orden aparece— y todo lo demas es consecuencia. No hay guardar: lo
 * que se escribe queda al salir del campo, como en el resto de la app.
 */

interface Props { open: boolean; onClose: () => void }

const RAMAS: { id: Serie['gender']; label: string }[] = [
  { id: 'femenino', label: 'Fem' },
  { id: 'masculino', label: 'Masc' },
  { id: 'mixto', label: 'Mixta' },
]

/** Identificador a partir del nombre: el operador no deberia inventarlo. */
const idDesde = (label: string) =>
  normalize(label).replace(/\s+/g, '').slice(0, 16) || 'serie'

export function SeriesEditorModal({ open, onClose }: Props) {
  const [club, setClub] = useState<ClubStore | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [rama, setRama] = useState<Serie['gender']>('femenino')

  useEffect(() => { if (open) setClub(bootClub()) }, [open])
  if (!club) return null

  const series = seriesOf(club)
  const guardar = (c: ClubStore) => { setClub(c); saveClub(c) }

  const aplicar = (r: { ok: boolean; club?: ClubStore; error?: string }) => {
    if (!r.ok) { toast.warning(r.error!); return false }
    guardar(r.club!)
    return true
  }

  const agregar = () => {
    const label = nuevo.trim()
    if (!label) { toast.warning('Escribe el nombre de la serie'); return }
    let id = idDesde(label)
    // Si el nombre ya genera un id existente, se numera en vez de rechazar:
    // "Sub-15" y "Sub-15 B" son series distintas y el operador no tiene por
    // que pelear con un identificador que ni siquiera ve.
    if (series.some(s => s.id === id)) {
      let i = 2
      while (series.some(s => s.id === `${id}${i}`)) i++
      id = `${id}${i}`
    }
    const order = (series[series.length - 1]?.order ?? 0) + 1
    if (aplicar(saveSerie(club, { id, label, gender: rama, order }))) {
      setNuevo('')
      toast.success(`${label} agregada`)
    }
  }

  /** Sube o baja una serie intercambiando el orden con su vecina. */
  const mover = (id: string, dir: -1 | 1) => {
    const i = series.findIndex(s => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= series.length) return
    const a = series[i], b = series[j]
    const paso1 = saveSerie(club, { ...a, order: b.order }, a.id)
    if (!paso1.ok) { toast.warning(paso1.error!); return }
    const paso2 = saveSerie(paso1.club!, { ...b, order: a.order }, b.id)
    if (!paso2.ok) { toast.warning(paso2.error!); return }
    guardar(paso2.club!)
  }

  const borrar = (s: Serie) => {
    const r = deleteSerie(club, s.id)
    if (!r.ok) { toast.warning(r.error!, { duration: 7000 }); return }
    guardar(r.club!)
    toast.success(`${s.label} eliminada`)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-zinc-900 border-2 border-blue-800 text-white max-w-lg max-h-[92vh] p-0 flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="p-4 pb-3 border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Layers className="w-5 h-5 text-blue-400" /> Series de la liga
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 leading-snug">
            Las categorías en las que se juega. Son las mismas para todos los
            clubes y aparecen al armar un partido y al cargar planteles.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Alta: nombre y rama. El identificador se deduce solo. */}
          <div className="flex gap-2">
            <Input value={nuevo} onChange={e => setNuevo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') agregar() }}
              placeholder="Nombre de la serie"
              className="flex-1 h-10 bg-zinc-950 border-zinc-700 text-sm" />
            <div className="flex rounded-md overflow-hidden border border-zinc-700">
              {RAMAS.map(r => (
                <button key={r.id} onClick={() => setRama(r.id)}
                  className={`px-2.5 text-[10px] font-black transition-colors ${
                    rama === r.id ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <Button onClick={agregar} className="h-10 px-3 font-black bg-blue-700 hover:bg-blue-600">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {series.map((s, i) => {
              const dentro = squadOf(club, s.id).length
              return (
                <div key={s.id} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5">
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => mover(s.id, -1)} disabled={i === 0}
                      className="text-zinc-600 hover:text-white disabled:opacity-20 leading-none" title="Subir">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => mover(s.id, 1)} disabled={i === series.length - 1}
                      className="text-zinc-600 hover:text-white disabled:opacity-20 leading-none" title="Bajar">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Input
                    defaultValue={s.label}
                    onBlur={e => {
                      const label = e.target.value.trim()
                      if (!label || label === s.label) { e.target.value = s.label; return }
                      // Se renombra conservando el id: los integrantes no se
                      // enteran de que la serie cambio de nombre.
                      aplicar(saveSerie(club, { ...s, label }, s.id))
                    }}
                    className="flex-1 h-8 bg-zinc-900 border-zinc-700 text-sm font-bold" />

                  <div className="flex rounded overflow-hidden border border-zinc-700 shrink-0">
                    {RAMAS.map(r => (
                      <button key={r.id}
                        onClick={() => aplicar(saveSerie(club, { ...s, gender: r.id }, s.id))}
                        className={`px-2 py-1 text-[9px] font-black transition-colors ${
                          s.gender === r.id ? 'bg-blue-700 text-white' : 'bg-zinc-900 text-zinc-600 hover:text-zinc-300'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 w-10 justify-end shrink-0"
                    title={`${dentro} en el plantel`}>
                    <Users className="w-3 h-3" /> {dentro}
                  </span>

                  <button onClick={() => borrar(s)}
                    title={dentro > 0 ? 'Tiene integrantes: sácalos antes' : 'Eliminar serie'}
                    className={`shrink-0 ${dentro > 0 ? 'text-zinc-700' : 'text-zinc-600 hover:text-red-400'}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-zinc-600 leading-snug">
            Renombrar una serie no afecta a sus jugadores. Una serie con gente
            adentro no se puede eliminar.
          </p>
        </div>

        <div className="border-t border-zinc-800 p-3 bg-zinc-950">
          <Button onClick={onClose} className="w-full h-11 font-black bg-green-700 hover:bg-green-600">
            LISTO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
