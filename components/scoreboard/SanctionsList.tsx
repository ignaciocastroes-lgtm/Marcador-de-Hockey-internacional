"use client"

import { X } from 'lucide-react'
import type { Sanction } from '@/hooks/use-game-state'

// Helpers
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// ===== LISTA DE SANCIONES =====
export interface SanctionsListProps {
  sanctions: Sanction[]
  onRemove: (id: string) => void
}

export function SanctionsList({ sanctions, onRemove }: SanctionsListProps) {
  if (sanctions.length === 0) return (
    <div className="mt-2 p-2 bg-zinc-800/50 rounded text-center shrink-0">
      <p className="text-zinc-600 text-xs">Sin penalizaciones activas</p>
    </div>
  )
  return (
    <div className="space-y-1 mt-4 flex flex-col shrink-0">
      <p className="text-zinc-500 text-xs font-bold mb-2">PENALIZACIONES ACTIVAS:</p>
      <div className="flex flex-col gap-1.5">
        {sanctions.map(s => {
          const cardColorClass = s.type === 'yellow' ? 'bg-yellow-500' : s.type === 'blue' ? 'bg-blue-500' : 'bg-red-500'
          const bgClass = s.type === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' : s.type === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-red-500/10 border-red-500/30'
          const textClass = s.type === 'yellow' ? 'text-yellow-400' : s.type === 'blue' ? 'text-blue-400' : 'text-red-400'

          // Formateo visual unificado (Ej: "#1 (Banca)" o "DT/BANCA")
          const displayName = s.isBench
            ? (['DT', 'AY', 'AX'].includes(s.playerNumber) ? `${s.playerNumber}/BANCA` : `#${s.playerNumber} (Banca)`)
            : `#${s.playerNumber}`

          return (
            <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded border ${bgClass}`}>
              <span className={`font-black text-sm ${textClass}`}>{displayName}</span>
              <span className="text-zinc-500">-</span>
              <div className={`w-4 h-5 rounded-sm ${cardColorClass}`} title={s.type === 'yellow' ? 'Amarilla' : s.type === 'blue' ? 'Azul (2min)' : 'Roja (4min)'} />
              <span className="text-zinc-500">-</span>
              {s.remainingTime > 0 ? (
                <span className={`font-mono font-black text-sm ${textClass} tabular-nums`}>{formatTime(s.remainingTime)}</span>
              ) : (
                <span className="text-zinc-500 text-xs">{s.type === 'yellow' ? 'Advertencia' : 'Cumplida'}</span>
              )}
              <button onClick={() => onRemove(s.id)} className="ml-auto text-zinc-500 hover:text-white p-1"><X className="w-3 h-3" /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
