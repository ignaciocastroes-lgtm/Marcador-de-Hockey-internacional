"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Move } from 'lucide-react'
import type { Player } from '@/hooks/use-game-state'

// ===== COMPONENTE PIZARRA TACTICA =====
export interface TacticalBoardProps {
  homePlayers: Player[]
  awayPlayers: Player[]
  homeTeamName: string
  awayTeamName: string
}

export function TacticalBoard({ homePlayers, awayPlayers, homeTeamName, awayTeamName }: TacticalBoardProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const boardRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  // Inicializar posiciones por defecto
  useEffect(() => {
    const initPositions: Record<string, { x: number; y: number }> = {}
    const homeTitulares = homePlayers.filter(p => p.role === 'capitan' || p.role === 'portero' || p.role === 'jugador_pista').slice(0, 5)
    const awayTitulares = awayPlayers.filter(p => p.role === 'capitan' || p.role === 'portero' || p.role === 'jugador_pista').slice(0, 5)

    homeTitulares.forEach((p, i) => {
      initPositions[`home-${p.id}`] = { x: 20 + (i % 3) * 15, y: 30 + Math.floor(i / 3) * 25 }
    })
    awayTitulares.forEach((p, i) => {
      initPositions[`away-${p.id}`] = { x: 55 + (i % 3) * 15, y: 30 + Math.floor(i / 3) * 25 }
    })
    setPositions(initPositions)
  }, [homePlayers, awayPlayers])

  const handleDragStart = (id: string) => setDragging(id)

  const handleDrag = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging || !boardRef.current) return
    e.preventDefault()
    const rect = boardRef.current.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    setPositions(prev => ({ ...prev, [dragging]: { x: Math.max(2, Math.min(95, x)), y: Math.max(5, Math.min(90, y)) } }))
  }, [dragging])

  const handleDragEnd = () => setDragging(null)

  const homeTitulares = homePlayers.filter(p => p.role === 'capitan' || p.role === 'portero' || p.role === 'jugador_pista').slice(0, 5)
  const awayTitulares = awayPlayers.filter(p => p.role === 'capitan' || p.role === 'portero' || p.role === 'jugador_pista').slice(0, 5)

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      <h3 className="text-yellow-400 font-bold mb-3 flex items-center"><Move className="w-5 h-5 mr-2" /> Pizarra Tactica (Arrastre los jugadores)</h3>
      <div
        ref={boardRef}
        className="relative w-full aspect-[2/1] bg-slate-900/50 border-4 border-white/30 rounded-[2rem] overflow-hidden touch-none"
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleDrag}
        onTouchEnd={handleDragEnd}
      >
        {/* === MARCAS OFICIALES DE HOCKEY PATIN === */}
        {/* Linea Central */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />
        {/* Circulo Central */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[15%] aspect-square border-2 border-white/20 rounded-full" />
        {/* Punto Central */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />

        {/* AREA IZQUIERDA */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[13.5%] h-[45%] border-2 border-l-0 border-white/20" />
        <div className="absolute left-[13.5%] top-1/2 -translate-y-1/2 w-[10%] h-[25%] border-2 border-l-0 border-white/20 rounded-r-full" />
        <div className="absolute left-[13.5%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full -translate-x-1/2" />
        <div className="absolute left-[18.5%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-[8%] bg-white/30 border-r-2 border-white/50" />

        {/* AREA DERECHA */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[13.5%] h-[45%] border-2 border-r-0 border-white/20" />
        <div className="absolute right-[13.5%] top-1/2 -translate-y-1/2 w-[10%] h-[25%] border-2 border-r-0 border-white/20 rounded-l-full" />
        <div className="absolute right-[13.5%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full translate-x-1/2" />
        <div className="absolute right-[18.5%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full translate-x-1/2" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-[8%] bg-white/30 border-l-2 border-white/50" />

        {/* Jugadores Local */}
        {homeTitulares.map(p => {
          const pos = positions[`home-${p.id}`] || { x: 20, y: 50 }
          return (
            <div
              key={`home-${p.id}`}
              className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onMouseDown={() => handleDragStart(`home-${p.id}`)}
              onTouchStart={() => handleDragStart(`home-${p.id}`)}
            >
              <div className="w-full h-full rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white font-black text-sm shadow-lg">
                {p.number}
              </div>
              {p.role === 'capitan' && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-xs font-bold">C</div>}
            </div>
          )
        })}

        {/* Jugadores Visita */}
        {awayTitulares.map(p => {
          const pos = positions[`away-${p.id}`] || { x: 70, y: 50 }
          return (
            <div
              key={`away-${p.id}`}
              className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onMouseDown={() => handleDragStart(`away-${p.id}`)}
              onTouchStart={() => handleDragStart(`away-${p.id}`)}
            >
              <div className="w-full h-full rounded-full bg-amber-600 border-2 border-white flex items-center justify-center text-white font-black text-sm shadow-lg">
                {p.number}
              </div>
              {p.role === 'capitan' && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-xs font-bold">C</div>}
            </div>
          )
        })}

        {/* Leyenda */}
        <div className="absolute bottom-2 left-4 flex gap-4 text-xs bg-black/50 p-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-600 border border-white" /><span className="text-white font-bold">{homeTeamName}</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-amber-600 border border-white" /><span className="text-white font-bold">{awayTeamName}</span></div>
        </div>
      </div>
    </div>
  )
}
