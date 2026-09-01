"use client"

import { useState } from 'react'
import { X, CircleSlash, AlertTriangle } from 'lucide-react'
import { Users } from 'lucide-react'
import { Goal, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Player, CardHistory } from '@/hooks/use-game-state'
import type { BenchStaffUI } from './BenchModal'

// ===== PROPS =====
export interface PosModalProps {
  open: boolean
  onClose: () => void
  team: 'home' | 'away'
  action: 'gol' | 'penal' | 'yellow' | 'blue' | 'red'
  homeTeamName: string
  awayTeamName: string
  roster: string[]
  cardHistory: CardHistory[]
  onSelectPlayer: (num: string) => void
  getPlayerYellowCount: (team: 'home' | 'away', num: string) => number
  getCurrentPlayers: (team: 'home' | 'away') => Player[]
  onOpenBenchModal: (
    team: 'home' | 'away',
    cardType: 'yellow' | 'red',
    staffList: BenchStaffUI[]
  ) => void
}

// ===== MODAL POS FULLSCREEN =====
export function PosModal({
  open, onClose, team, action,
  homeTeamName, awayTeamName,
  roster, cardHistory,
  onSelectPlayer, getPlayerYellowCount,
  getCurrentPlayers, onOpenBenchModal
}: PosModalProps) {
  const [manualNumber, setManualNumber] = useState('')

  const teamName = team === 'home' ? homeTeamName : awayTeamName

  const headerBorder =
    action === 'gol'    ? 'border-green-500 bg-green-950/50' :
    action === 'penal'  ? 'border-purple-500 bg-purple-950/50' :
    action === 'yellow' ? 'border-yellow-500 bg-yellow-950/50' :
    action === 'blue'   ? 'border-blue-500 bg-blue-950/50' :
                          'border-red-500 bg-red-950/50'

  const actionLabel =
    action === 'gol'    ? 'GOL' :
    action === 'penal'  ? 'PENAL' :
    action === 'yellow' ? 'T. AMARILLA' :
    action === 'blue'   ? 'T. AZUL (2min)' :
                          'T. ROJA (4min)'

  const btnColor =
    action === 'gol'    ? 'bg-green-700 hover:bg-green-600' :
    action === 'penal'  ? 'bg-purple-700 hover:bg-purple-600' :
    action === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-500 text-black' :
    action === 'blue'   ? 'bg-blue-700 hover:bg-blue-600' :
                          'bg-red-700 hover:bg-red-600'

  const confirmBtnColor =
    action === 'gol'    ? 'bg-green-600 hover:bg-green-500' :
    action === 'penal'  ? 'bg-purple-600 hover:bg-purple-500' :
    action === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-500 text-black' :
    action === 'blue'   ? 'bg-blue-600 hover:bg-blue-500' :
                          'bg-red-600 hover:bg-red-500'

  const handleConfirmManual = () => {
    if (manualNumber) {
      onSelectPlayer(manualNumber)
      setManualNumber('')
    }
  }

  const handleOpenBench = () => {
    const teamPlayers = getCurrentPlayers(team)
    const benchRoles = ['dt', 'ay1', 'ay2', 'ax1', 'ax2', 'suplente']

    const benchMembers = teamPlayers.filter(p =>
      benchRoles.includes((p.role as string) || '') ||
      p.role === 'jugador_pista' || p.role === 'portero'
    )

    const teamHasBenchYellow = cardHistory?.some(
      c => c.team === team && c.isBench && c.cardType === 'yellow'
    )

    const uiList: BenchStaffUI[] = benchMembers.map(p => {
      const isStaff = ['dt', 'ay1', 'ay2', 'ax1', 'ax2'].includes((p.role as string) || '')
      const displayName = isStaff
        ? (p.role === 'dt' ? 'Director Tecnico' : p.role === 'ay1' ? 'Ayudante 1' : p.role === 'ay2' ? 'Ayudante 2' : p.role === 'ax1' ? 'Auxiliar 1' : 'Auxiliar 2')
        : `#${p.number}`
      const displayNumber = p.role === 'dt' ? 'DT' : p.role === 'ay1' ? 'AY1' : p.role === 'ay2' ? 'AY2' : p.role === 'ax1' ? 'AX1' : p.role === 'ax2' ? 'AX2' : (p.number || 'SUP')

      return {
        id: p.id,
        name: displayName,
        role: p.role === 'dt' ? 'DT' : p.role === 'ay1' ? 'AY1' : p.role === 'ay2' ? 'AY2' : p.role === 'ax1' ? 'AX1' : p.role === 'ax2' ? 'AX2' : 'Suplente',
        number: displayNumber,
        selected: teamHasBenchYellow ? false : isStaff,
        isDirectInfractor: false
      }
    })

    onOpenBenchModal(team, action === 'yellow' ? 'yellow' : 'red', uiList)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-black border-2 border-zinc-700 text-white w-[98vw] max-w-3xl h-[85vh] flex flex-col p-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="sr-only"><DialogTitle>Seleccionar Jugador</DialogTitle></DialogHeader>

        {/* Header con color por acción */}
        <div className={`p-4 flex items-center justify-between border-b-4 ${headerBorder}`}>
          <div className="flex items-center gap-3">
            {action === 'gol'    && <Goal className="w-8 h-8 text-green-400" />}
            {action === 'penal'  && <Square className="w-8 h-8 text-purple-400" />}
            {action === 'yellow' && <AlertTriangle className="w-8 h-8 text-yellow-400" />}
            {action === 'blue'   && <div className="w-8 h-8 bg-blue-500 rounded" />}
            {action === 'red'    && <div className="w-8 h-8 bg-red-500 rounded" />}
            <div>
              <h2 className="text-2xl font-black uppercase">{actionLabel}</h2>
              <p className={`text-lg font-bold ${team === 'home' ? 'text-blue-400' : 'text-amber-400'}`}>
                {teamName}
              </p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" className="text-zinc-400 hover:text-white">
            <X className="w-8 h-8" />
          </Button>
        </div>

        {/* Grilla de jugadores */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-zinc-400 text-center mb-4 font-bold">SELECCIONAR JUGADOR</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mb-6">
            {roster
              .filter(num => !['DT', 'AY1', 'AY2', 'AX1', 'AX2', 'AY', 'AX'].includes(num.toUpperCase()))
              .map(num => {
                const yellowCount = getPlayerYellowCount(team, num)
                const isAlreadyExpelled = cardHistory?.some(
                  c => c.team === team && c.playerNumber === num && c.cardType === 'red'
                )
                return (
                  <Button
                    key={num}
                    onClick={() => onSelectPlayer(num)}
                    disabled={isAlreadyExpelled}
                    className={`h-16 sm:h-20 text-2xl sm:text-3xl font-black relative ${
                      isAlreadyExpelled
                        ? 'bg-zinc-800 text-zinc-600 line-through cursor-not-allowed border border-red-900/30'
                        : btnColor
                    }`}
                  >
                    {num}
                    {yellowCount > 0 && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-black text-xs font-black">
                        {yellowCount}
                      </div>
                    )}
                    {isAlreadyExpelled && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-red-500 font-bold uppercase tracking-widest">
                        EXPULSADO
                      </div>
                    )}
                  </Button>
                )
              })}
          </div>

          {/* Input manual */}
          <div className="text-center mb-6 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
            <p className="text-zinc-500 mb-3 font-bold">
              {roster.length === 0 ? 'Sin planilla. Ingresa numero:' : 'O ingresa numero manualmente:'}
            </p>
            <div className="flex items-center justify-center gap-2 max-w-[300px] mx-auto">
              <Input
                type="text"
                placeholder="#"
                value={manualNumber}
                onChange={e => setManualNumber(e.target.value)}
                className="bg-zinc-800 border-zinc-600 text-center text-3xl font-black h-16 flex-1"
                maxLength={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && manualNumber) {
                    handleConfirmManual()
                  }
                }}
              />
              <Button
                onClick={handleConfirmManual}
                disabled={!manualNumber}
                className={`h-16 px-6 font-black text-xl ${confirmBtnColor}`}
              >
                OK
              </Button>
            </div>
          </div>
        </div>

        {/* Footer: Botón de Banca (solo tarjetas, no gol/penal) */}
        {(action === 'yellow' || action === 'blue' || action === 'red') && (
          <div className="p-4 border-t-2 border-zinc-700 bg-zinc-900">
            {action === 'blue' ? (
              <Button disabled className="w-full h-16 text-xl font-black bg-zinc-800 text-zinc-500 cursor-not-allowed">
                <CircleSlash className="w-6 h-6 mr-2" /> AZUL NO APLICA A BANCA
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleOpenBench}
                  className="w-full h-16 text-xl font-black bg-purple-700 hover:bg-purple-600"
                >
                  <Users className="w-6 h-6 mr-2" /> BANCA / DT
                </Button>
                {action === 'red' && (
                  <p className="text-purple-400 text-xs text-center mt-2 font-bold">
                    La Tarjeta Roja a Banca NO activa Power Play
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
