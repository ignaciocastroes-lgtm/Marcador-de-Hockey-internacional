"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Ban, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * DECISIONES DEL ÁRBITRO que cambian el marcador.
 *
 * Las dos piden confirmación en dos pasos, a propósito: son irreversibles de
 * cara al público —el marcador ya cambió en la pantalla del estadio— y un
 * toque de más con la tablet en la mano cuesta caro. El segundo paso dice
 * exactamente qué va a pasar, y se cancela solo a los pocos segundos si nadie
 * confirma, para no dejar la mesa armada esperando.
 *
 * PENAL: en partido ES GOL y suma al marcador; en la tanda va al contador
 * aparte. Esa distinción la resuelve `scorePenalty` según el periodo.
 *
 * ANULAR GOL es del ÁRBITRO: cobró, la gente lo vio, y después lo anuló. El
 * acta lo consigna. Es distinto de corregir un gol que la mesa cargó por
 * error, que se enmienda con el botón − del marcador y se borra del acta.
 */

interface Props {
  homeTeamName: string
  awayTeamName: string
  enTanda: boolean
  disabled?: boolean
  /**
   * El juego esta detenido: descanso, tiempo muerto o partido suspendido.
   * El PENAL se bloquea —no se puede convertir uno con el juego parado— pero
   * ANULAR GOL sigue disponible, que es justo cuando el arbitro se acerca a la
   * mesa a corregir.
   */
  detenido?: boolean
  onPenal: (team: 'home' | 'away') => void
  onAnular: (team: 'home' | 'away') => void
  /** Se cierra el contenedor tras confirmar, si lo hay. */
  onDone?: () => void
}

type Pendiente = { accion: 'penal' | 'anular'; team: 'home' | 'away' } | null

export function RefereeActions({
  homeTeamName, awayTeamName, enTanda, disabled, detenido, onPenal, onAnular, onDone
}: Props) {
  const [pendiente, setPendiente] = useState<Pendiente>(null)

  const pedir = (accion: 'penal' | 'anular', team: 'home' | 'away') => {
    setPendiente({ accion, team })
    // Si nadie confirma, se desarma solo: la mesa no queda en un estado raro.
    setTimeout(() => setPendiente(p =>
      p && p.accion === accion && p.team === team ? null : p), 6000)
  }

  const confirmar = () => {
    if (!pendiente) return
    const nombre = pendiente.team === 'home' ? homeTeamName : awayTeamName
    if (pendiente.accion === 'penal') {
      onPenal(pendiente.team)
      toast.success(enTanda ? `Penal convertido — ${nombre}` : `¡GOL de penal — ${nombre}!`)
    } else {
      onAnular(pendiente.team)
      toast.warning(`Gol de ${nombre} ANULADO por el árbitro`, { duration: 5000 })
    }
    setPendiente(null)
    onDone?.()
  }

  if (pendiente) {
    const nombre = pendiente.team === 'home' ? homeTeamName : awayTeamName
    const esPenal = pendiente.accion === 'penal'
    return (
      <div className={`rounded-xl border-2 p-3 ${esPenal ? 'border-purple-500 bg-purple-950/40' : 'border-red-500 bg-red-950/40'}`}>
        <p className="flex items-center gap-2 text-sm font-black mb-1">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {esPenal
            ? (enTanda ? `Penal convertido de ${nombre}` : `Gol de penal de ${nombre}`)
            : `Anular el último gol de ${nombre}`}
        </p>
        <p className="text-[11px] text-zinc-300 leading-snug mb-2">
          {esPenal
            ? (enTanda
                ? 'Suma al contador de la tanda. No cuenta como gol del partido.'
                : 'Suma al marcador como gol y queda en el acta como gol de penal.')
            : 'Baja el marcador y el acta lo consigna como gol anulado por el árbitro. Si fue un error de carga de la mesa, usa el − del marcador.'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setPendiente(null)} variant="outline"
            className="h-11 font-bold border-zinc-500">CANCELAR</Button>
          <Button onClick={confirmar}
            className={`h-11 font-black ${esPenal ? 'bg-purple-700 hover:bg-purple-600' : 'bg-red-700 hover:bg-red-600'}`}>
            CONFIRMAR
          </Button>
        </div>
      </div>
    )
  }

  const equipos = [
    { team: 'home' as const, name: homeTeamName },
    { team: 'away' as const, name: awayTeamName },
  ]

  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
          <Target className="w-3 h-3" /> Penal {enTanda ? '(tanda)' : '— cuenta como gol'}
          {detenido && <span className="text-zinc-600 font-normal normal-case"> · juego detenido</span>}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {equipos.map(e => (
            <Button key={e.team} disabled={disabled || detenido} onClick={() => pedir('penal', e.team)}
              className="h-11 text-xs font-black bg-purple-800 hover:bg-purple-700 disabled:opacity-30">
              <span className="truncate">{e.name}</span>
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
          <Ban className="w-3 h-3" /> Anular gol (decisión del árbitro)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {equipos.map(e => (
            <Button key={e.team} disabled={disabled} onClick={() => pedir('anular', e.team)}
              variant="outline"
              className="h-10 text-[11px] font-bold border-red-900 text-red-300 hover:bg-red-950">
              <span className="truncate">{e.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
