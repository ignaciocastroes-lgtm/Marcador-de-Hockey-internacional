"use client"

import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CardHistory } from '@/hooks/use-game-state'

// ─── Tipo compartido ──────────────────────────────────────────────────────────
export interface BenchStaffUI {
  id: string
  name: string
  role: string
  number: string
  selected: boolean
  isDirectInfractor: boolean
}

export interface BenchModalProps {
  open: boolean
  onClose: () => void
  team: 'home' | 'away'
  cardType: 'yellow' | 'red'
  homeTeamName: string
  awayTeamName: string
  staffList: BenchStaffUI[]
  onStaffListChange: (list: BenchStaffUI[]) => void
  cardHistory: CardHistory[]
  onApply: (
    team: 'home' | 'away',
    cardType: 'yellow' | 'red',
    direct: BenchStaffUI,
    collective: BenchStaffUI[]
  ) => void
}

export function BenchModal({
  open, onClose, team, cardType,
  homeTeamName, awayTeamName,
  staffList, onStaffListChange,
  cardHistory, onApply
}: BenchModalProps) {
  const teamName = team === 'home' ? homeTeamName : awayTeamName
  const teamHasBenchYellow = cardHistory?.some(
    c => c.team === team && c.isBench && c.cardType === 'yellow'
  )

  const handleApply = () => {
    const directInfractor = staffList.find(s => s.isDirectInfractor)
    if (!directInfractor) {
      // Toast en vez de alert() — no bloquea el hilo
      toast.warning('Debe seleccionar a UN integrante como infractor DIRECTO.')
      return
    }
    const collectiveTargets = teamHasBenchYellow
      ? []
      : staffList.filter(s => s.selected && !s.isDirectInfractor)
    onApply(team, cardType, directInfractor, collectiveTargets)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-2 border-purple-700 text-white max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-purple-400 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            SANCIÓN A LA BANCA — {teamName}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Indicador de tarjeta */}
          <div className={`p-3 rounded-lg border-2 ${cardType === 'yellow' ? 'bg-yellow-900/30 border-yellow-600' : 'bg-red-900/30 border-red-600'}`}>
            <h3 className={`font-bold text-lg ${cardType === 'yellow' ? 'text-yellow-400' : 'text-red-500'}`}>
              APLICANDO TARJETA {cardType === 'yellow' ? 'AMARILLA' : 'ROJA'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Seleccione quién recibe la sanción directa. El resto recibirá sanción colectiva.
            </p>
          </div>

          {/* Lista de staff */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {/* Encabezado de columnas */}
            <div className="flex items-center justify-between px-3 py-1 bg-zinc-800 rounded text-xs font-bold text-zinc-500">
              <span className="w-10 text-center">Incluir</span>
              <span className="flex-1">Nombre / Rol</span>
              <span className="w-16 text-center text-red-400">DIRECTO</span>
            </div>

            {staffList.map((staff, idx) => {
              const isAlreadyExpelled = cardHistory?.some(c =>
                c.team === team && c.cardType === 'red' &&
                (c.staffId === staff.id || c.playerNumber === staff.number)
              )

              return (
                <div
                  key={staff.id}
                  className={`flex items-center justify-between p-2 rounded border ${
                    isAlreadyExpelled
                      ? 'bg-zinc-950 border-red-900/30 opacity-40'
                      : staff.selected
                      ? 'bg-zinc-800 border-zinc-600'
                      : 'bg-zinc-900 border-zinc-800 opacity-50'
                  }`}
                >
                  {/* Checkbox colectivo */}
                  <div className="w-10 flex justify-center">
                    <input
                      type="checkbox"
                      checked={isAlreadyExpelled ? false : (teamHasBenchYellow ? false : staff.selected)}
                      disabled={teamHasBenchYellow || isAlreadyExpelled}
                      onChange={e => {
                        const newList = [...staffList]
                        newList[idx] = { ...newList[idx], selected: e.target.checked }
                        if (!e.target.checked && newList[idx].isDirectInfractor) {
                          newList[idx] = { ...newList[idx], isDirectInfractor: false }
                        }
                        onStaffListChange(newList)
                      }}
                      className="w-5 h-5 accent-purple-600 disabled:opacity-50"
                    />
                  </div>

                  {/* Info del integrante */}
                  <div className="flex-1 ml-2">
                    <span className={`font-bold block ${isAlreadyExpelled ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {staff.role}: {staff.name || 'Sin Nombre'}
                    </span>
                    <span className={`text-xs ${isAlreadyExpelled ? 'text-red-500 font-bold uppercase tracking-widest' : 'text-zinc-500'}`}>
                      {isAlreadyExpelled
                        ? 'EXPULSADO'
                        : teamHasBenchYellow && !staff.isDirectInfractor
                        ? 'Inmune (Solo Tarjeta Directa)'
                        : staff.selected
                        ? staff.isDirectInfractor ? 'Recibe Tarjeta Directa' : 'Recibe Amarilla Colectiva'
                        : 'No recibe sanción'}
                    </span>
                  </div>

                  {/* Radio de infractor directo */}
                  <div className="w-16 flex justify-center border-l border-zinc-700 pl-2">
                    <input
                      type="radio"
                      name="directInfractor"
                      checked={isAlreadyExpelled ? false : staff.isDirectInfractor}
                      disabled={isAlreadyExpelled || (!teamHasBenchYellow && !staff.selected)}
                      onChange={() => {
                        const newList = staffList.map((s, i) => ({
                          ...s, isDirectInfractor: i === idx
                        }))
                        onStaffListChange(newList)
                      }}
                      className="w-5 h-5 accent-red-600 disabled:opacity-50"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {teamHasBenchYellow && (
            <div className="bg-orange-900/30 border border-orange-600 rounded p-2 text-center text-orange-400 text-xs font-bold">
              El equipo ya registra Amarilla en Banca. Sanciones colectivas deshabilitadas (Solo Directa).
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-4 border-t border-zinc-700">
            <Button onClick={onClose} variant="outline" className="flex-1 h-12 border-zinc-600">
              CANCELAR
            </Button>
            <Button onClick={handleApply} className="flex-1 h-12 font-black bg-purple-600 hover:bg-purple-500">
              APLICAR SANCIÓN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
