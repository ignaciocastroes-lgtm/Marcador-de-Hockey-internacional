"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Goal, Trophy, BarChart3, RotateCcw, Check, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  loadOverlays, saveOverlays, DEFAULT_OVERLAYS, type OverlaysConfig
} from '@/lib/overlay-config'

interface Props { open: boolean; onClose: () => void }

const BOARDS = [
  { id: 1, label: 'P1 Global' }, { id: 2, label: 'P2 Local' }, { id: 3, label: 'P3 Visita' },
  { id: 4, label: 'P4 Tarj. L' }, { id: 5, label: 'P5 Tarj. V' }
]

type Tab = 'goal' | 'final' | 'stats'

export function OverlaysModal({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<OverlaysConfig>(DEFAULT_OVERLAYS)
  const [tab, setTab] = useState<Tab>('goal')

  useEffect(() => { if (open) setCfg(loadOverlays()) }, [open])

  const update = (next: OverlaysConfig) => { setCfg(next); saveOverlays(next) }
  const patchGoal  = (p: Partial<OverlaysConfig['goal']>)  => update({ ...cfg, goal:  { ...cfg.goal,  ...p } })
  const patchFinal = (p: Partial<OverlaysConfig['final']>) => update({ ...cfg, final: { ...cfg.final, ...p } })
  const patchStats = (p: Partial<OverlaysConfig['stats']>) => update({ ...cfg, stats: { ...cfg.stats, ...p } })

  const Toggle = ({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) => (
    <button onClick={() => onChange(!on)}
      className="w-full flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-left hover:border-zinc-600 transition-colors">
      <span className={`w-9 h-5 rounded-full shrink-0 relative transition-colors ${on ? 'bg-green-600' : 'bg-zinc-700'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-zinc-200">{label}</span>
        {hint && <span className="block text-[10px] text-zinc-500 leading-snug">{hint}</span>}
      </span>
    </button>
  )

  const BoardPicker = ({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) => (
    <div>
      <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Aparece en</Label>
      <div className="grid grid-cols-5 gap-1 mt-1.5">
        {BOARDS.map(b => {
          const on = value.includes(b.id)
          return (
            <button key={b.id}
              onClick={() => onChange(on ? value.filter(x => x !== b.id) : [...value, b.id].sort())}
              className={`h-11 rounded-lg text-[10px] font-black leading-tight transition-colors ${
                on ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
              {b.label.split(' ')[0]}<br />
              <span className="font-normal opacity-70">{b.label.split(' ').slice(1).join(' ')}</span>
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-zinc-600 mt-1">
        Un lanzador tapa el tablero completo. En P2 y P3 esconde los relojes de 45.
      </p>
    </div>
  )

  const NumberField = ({ label, value, onChange, min, max, suffix }: {
    label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string
  }) => (
    <div>
      <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</Label>
      <div className="flex items-center gap-2 mt-1.5">
        <Input type="number" min={min} max={max} value={value}
          onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
          className="h-10 bg-zinc-900 border-zinc-700 text-center font-black text-lg" />
        <span className="text-xs text-zinc-500 font-bold w-16">{suffix}</span>
      </div>
    </div>
  )

  const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
      <span className="text-sm font-bold text-zinc-300">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-10 h-8 rounded border-0 bg-transparent p-0 cursor-pointer" />
    </div>
  )

  const TabBtn = ({ id, label, icon }: { id: Tab; label: string; icon: React.ReactNode }) => (
    <button onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
        tab === id ? 'bg-zinc-800 text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
      {icon} {label}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-lg max-h-[92vh] p-0 flex flex-col overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="p-4 pb-3 border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Layers className="w-5 h-5 text-yellow-400" /> Lanzadores de proyección
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 leading-snug">
            Las pantallas que pasan por sobre el tablero. Los cambios llegan al instante a las ventanas abiertas.
          </p>
        </DialogHeader>

        <div className="flex border-b border-zinc-800 bg-zinc-950 shrink-0">
          <TabBtn id="goal"  label="Gol"          icon={<Goal className="w-3.5 h-3.5" />} />
          <TabBtn id="final" label="Fin"          icon={<Trophy className="w-3.5 h-3.5" />} />
          <TabBtn id="stats" label="Estadísticas" icon={<BarChart3 className="w-3.5 h-3.5" />} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'goal' && (
            <>
              <Toggle on={cfg.goal.enabled} onChange={v => patchGoal({ enabled: v })}
                label="Animación de gol" hint="Se dispara sólo cuando el gol se carga con goleador" />
              <BoardPicker value={cfg.goal.boards} onChange={v => patchGoal({ boards: v })} />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Duración" value={cfg.goal.duration} onChange={v => patchGoal({ duration: v })} min={2} max={12} suffix="segundos" />
                <div>
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Texto</Label>
                  <Input value={cfg.goal.text} onChange={e => patchGoal({ text: e.target.value })} maxLength={16}
                    className="h-10 mt-1.5 bg-zinc-900 border-zinc-700 text-center font-black" />
                </div>
              </div>
              <Toggle on={cfg.goal.showPlayerNumber} onChange={v => patchGoal({ showPlayerNumber: v })} label="Mostrar camiseta del goleador" />
              <Toggle on={cfg.goal.showScore} onChange={v => patchGoal({ showScore: v })} label="Mostrar marcador actualizado" />
              <Toggle on={cfg.goal.showWatermark} onChange={v => patchGoal({ showWatermark: v })} label="Escudo difuminado de fondo" />
              <Toggle on={cfg.goal.useTeamColor} onChange={v => patchGoal({ useTeamColor: v })}
                label="Resplandor con color del equipo" hint="Toma el color de camiseta configurado" />
              <ColorField label="Color del texto" value={cfg.goal.textColor} onChange={v => patchGoal({ textColor: v })} />
              <ColorField label="Color del marcador" value={cfg.goal.scoreColor} onChange={v => patchGoal({ scoreColor: v })} />
            </>
          )}

          {tab === 'final' && (
            <>
              <Toggle on={cfg.final.enabled} onChange={v => patchFinal({ enabled: v })} label="Pantalla de fin de partido" />
              <BoardPicker value={cfg.final.boards} onChange={v => patchFinal({ boards: v })} />
              <NumberField label="Letrero de ganador" value={cfg.final.winnerSeconds} onChange={v => patchFinal({ winnerSeconds: v })} min={3} max={60} suffix="segundos" />
              <Toggle on={cfg.final.showFicha} onChange={v => patchFinal({ showFicha: v })}
                label="Ficha del partido después" hint="Queda en pantalla hasta que configures el partido siguiente" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Texto ganador</Label>
                  <Input value={cfg.final.winnerText} onChange={e => patchFinal({ winnerText: e.target.value })} maxLength={20}
                    className="h-10 mt-1.5 bg-zinc-900 border-zinc-700 text-center font-black" />
                </div>
                <div>
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Texto empate</Label>
                  <Input value={cfg.final.drawText} onChange={e => patchFinal({ drawText: e.target.value })} maxLength={20}
                    className="h-10 mt-1.5 bg-zinc-900 border-zinc-700 text-center font-black" />
                </div>
              </div>
            </>
          )}

          {tab === 'stats' && (
            <>
              <Toggle on={cfg.stats.enabled} onChange={v => patchStats({ enabled: v })} label="Pantalla de estadísticas" />
              <BoardPicker value={cfg.stats.boards} onChange={v => patchStats({ boards: v })} />
              <Toggle on={cfg.stats.showInBreak} onChange={v => patchStats({ showInBreak: v })}
                label="Mostrar durante el descanso" hint="El reloj del entretiempo se mantiene visible arriba" />
              <NumberField label="Entra a los" value={cfg.stats.breakDelay} onChange={v => patchStats({ breakDelay: v })} min={0} max={60} suffix="seg. del descanso" />

              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pt-2">Qué muestra</p>
              <Toggle on={cfg.stats.showByPeriod}   onChange={v => patchStats({ showByPeriod: v })}   label="Marcador por periodo" />
              <Toggle on={cfg.stats.showScorers}    onChange={v => patchStats({ showScorers: v })}    label="Goleadores" />
              <Toggle on={cfg.stats.showGoalMinutes} onChange={v => patchStats({ showGoalMinutes: v })} label="Minuto de cada gol" />
              <Toggle on={cfg.stats.showCards}      onChange={v => patchStats({ showCards: v })}      label="Tarjetas" hint="La B marca las de banca" />
              <Toggle on={cfg.stats.showFouls}      onChange={v => patchStats({ showFouls: v })}      label="Faltas acumuladas" />
              <Toggle on={cfg.stats.showPossession} onChange={v => patchStats({ showPossession: v })} label="Posesión" hint="Porcentaje y minutos de los relojes de 45" />
            </>
          )}
        </div>

        <div className="border-t border-zinc-800 p-3 flex gap-2 shrink-0 bg-zinc-950">
          <Button onClick={() => { update(DEFAULT_OVERLAYS); toast.success('Lanzadores restaurados') }}
            variant="outline" className="h-10 text-xs font-bold border-zinc-600">
            <RotateCcw className="w-4 h-4 mr-1.5" /> POR DEFECTO
          </Button>
          <Button onClick={onClose} className="flex-1 h-10 font-black bg-green-700 hover:bg-green-600">
            <Check className="w-4 h-4 mr-2" /> LISTO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
