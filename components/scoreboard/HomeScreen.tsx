"use client"

import { Play, Users, ClipboardList, ChevronRight, Trophy, Lock } from 'lucide-react'
import { CLUB_BRAND, clubLogoFallback } from '@/lib/club-brand'

/**
 * LO PRIMERO QUE VE EL OPERADOR.
 *
 * Antes se aterrizaba en "CERTIFICACION PRE-PARTIDO", con el subtitulo
 * "Complete la planilla y obtenga las firmas antes de iniciar", el boton
 * principal deshabilitado diciendo "COMPLETE LAS 3 FIRMAS PARA CONTINUAR", y
 * el INICIO EXPRESS escondido al fondo, debajo del scroll.
 *
 * Es decir: quien usa Express el 100% de las veces caia en el asistente que
 * nunca usa, tenia que bajar hasta el final, y de paso leia que le faltaban
 * unas firmas obligatorias que en su flujo no aplican. Un apoderado un sabado
 * a las nueve concluye que hay algo que no hizo.
 *
 * Ahora son tres puertas, en el orden en que se usan de verdad: se juega cada
 * sabado, se tocan los equipos de vez en cuando, y los jugadores casi nunca.
 */

interface Props {
  onExpress: () => void
  onEquipos: () => void
  onJugadores: () => void
  onLigas: () => void
}

interface CardProps {
  title: string
  desc: string
  icon: React.ReactNode
  accent: string
  primary?: boolean
  onClick: () => void
}

function Card({ title, desc, icon, accent, primary, onClick }: CardProps) {
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-2xl border-2 transition-all touch-manipulation select-none
        active:scale-[0.98] ${accent} ${
        primary
          ? 'p-6 sm:p-8 shadow-2xl'
          : 'p-5 bg-zinc-900/70 hover:bg-zinc-900'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`shrink-0 rounded-xl flex items-center justify-center ${
          primary ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12'
        } bg-black/30`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`font-black uppercase tracking-wide ${
            primary ? 'text-2xl sm:text-3xl' : 'text-lg'
          }`}>{title}</h2>
          <p className={`text-zinc-400 leading-snug ${primary ? 'text-sm mt-1' : 'text-xs mt-0.5'}`}>
            {desc}
          </p>
        </div>
        <ChevronRight className={`shrink-0 text-zinc-600 group-hover:text-white transition-colors ${
          primary ? 'w-8 h-8' : 'w-5 h-5'
        }`} />
      </div>
    </button>
  )
}

export function HomeScreen({ onExpress, onEquipos, onJugadores, onLigas }: Props) {
  return (
    <div className="h-full bg-zinc-950 overflow-y-auto p-4">
      <div className="max-w-2xl mx-auto py-6 space-y-4">

        <div className="flex flex-col items-center text-center pb-2">
          {CLUB_BRAND.logoUrl && (
            <img src={CLUB_BRAND.logoUrl} alt={CLUB_BRAND.name} onError={clubLogoFallback}
              className="w-20 h-20 object-contain mb-3" />
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-white">{CLUB_BRAND.name}</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Mesa de control
          </p>
        </div>

        {/* Lo que se hace cada sábado va primero y grande. */}
        <Card
          primary
          title="Iniciar partido"
          desc="Dos equipos, la serie y a jugar. Es lo que se usa en cada fecha."
          icon={<Play className="w-8 h-8 sm:w-10 sm:h-10 text-white" />}
          accent="bg-emerald-800 border-emerald-500 hover:bg-emerald-700 text-white"
          onClick={onExpress}
        />

        <Card
          title="Equipos y series"
          desc="Los clubes con los que juegas y las categorías de tu liga."
          icon={<Users className="w-6 h-6 text-blue-400" />}
          accent="border-blue-900 hover:border-blue-600"
          onClick={onEquipos}
        />

        <Card
          title="Jugadores"
          desc="El plantel del club: altas, dorsales por serie y apodos."
          icon={<ClipboardList className="w-6 h-6 text-amber-400" />}
          accent="border-amber-900 hover:border-amber-600"
          onClick={onJugadores}
        />

        {/* Tunel: lo que viene despues de la herramienta de club. No promete
            una fecha ni finge estar a medio construir. */}
        <button onClick={onLigas}
          className="w-full text-left rounded-2xl border-2 border-dashed border-zinc-800 hover:border-purple-700 p-4 transition-colors touch-manipulation active:scale-[0.98] group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black uppercase tracking-wide text-sm text-zinc-300 flex items-center gap-2">
                Ligas y campeonatos
                <Lock className="w-3 h-3 text-zinc-600" />
              </h2>
              <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                Fixture, tablas y actas de toda una liga. Módulo aparte.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-purple-400 transition-colors shrink-0" />
          </div>
        </button>

        <p className="text-center text-[11px] text-zinc-600 pt-4">
          ardisport.cl
        </p>
      </div>
    </div>
  )
}
