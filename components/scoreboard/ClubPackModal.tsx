"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Download, ShieldCheck, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bootClub } from '@/lib/club-boot'
import { seriesOf, type ClubStore } from '@/lib/club-store'
import { downloadClubPack } from '@/lib/club-pack'

/**
 * "SÉ EL MARCADOR PARA TU CLUB"
 *
 * Esta pantalla es una INVITACION, no una herramienta de configuracion.
 *
 * Montar ARDI para un club —su plantel, sus series, su escudo, su dominio— es
 * trabajo nuestro: se prepara el paquete, se sube al hosting y el club recibe
 * su propia web ya armada. Por eso aqui NO hay un boton de importar: darle a
 * un operador la posibilidad de reemplazar el plantel entero un sabado por la
 * manana es un riesgo sin ninguna contrapartida, y ademas no es asi como se
 * entrega.
 *
 * Lo unico que se ofrece es DESCARGAR UN RESPALDO del club propio, que es
 * informacion suya y no puede romper nada.
 */

interface Props { open: boolean; onClose: () => void }

export function ClubPackModal({ open, onClose }: Props) {
  const [club, setClub] = useState<ClubStore | null>(null)
  useEffect(() => { if (open) setClub(bootClub()) }, [open])
  if (!club) return null

  const personas = club.personas.filter(p => !p.retirado).length

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-zinc-900 border-2 border-emerald-800 text-white max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Sé el marcador para tu club
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-zinc-300 leading-relaxed">
          Esta mesa de control puede ser la de tu club: con tu escudo, tus
          series, tu plantel y tu propia dirección web.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Lo dejamos montado y listo para el primer partido. Tú abres la página
          un sábado por la mañana y ya está todo cargado.
        </p>

        <a href="https://www.ardisport.cl" target="_blank" rel="noopener noreferrer"
          className="w-full h-12 rounded-md bg-emerald-700 hover:bg-emerald-600 font-black text-sm flex items-center justify-center gap-2">
          <ExternalLink className="w-4 h-4" /> ardisport.cl
        </a>

        {/* Respaldo: son sus propios datos y no puede romper nada. */}
        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[12px] font-black text-zinc-200 truncate">{club.nombre}</p>
              <p className="text-[10px] text-zinc-500">
                {personas} personas · {seriesOf(club).length} series
              </p>
            </div>
            <Button onClick={() => { downloadClubPack(club); toast.success('Respaldo descargado') }}
              variant="outline" className="h-9 text-[10px] font-bold border-zinc-600 shrink-0">
              <Download className="w-3.5 h-3.5 mr-1" /> RESPALDO
            </Button>
          </div>
          <p className="text-[10px] text-zinc-600 leading-snug">
            Guarda una copia de tu plantel por si cambias de computador.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
