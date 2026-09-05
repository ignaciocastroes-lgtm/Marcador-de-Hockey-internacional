"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Goal, Trophy, BarChart3, RotateCcw, Check, Layers, Eye,
  Move, Save, RotateCw, EyeOff
} from 'lucide-react'
import { GoalOverlay } from '@/components/scoreboard/GoalOverlay'
import { SummaryOverlay } from '@/components/scoreboard/SummaryOverlay'
import { WinnerOverlay } from '@/components/scoreboard/WinnerOverlay'
import { DEMO_STATE, DEMO_HOME, DEMO_AWAY } from '@/lib/overlay-demo'
import {
  loadLayouts, saveLayouts, resetLauncher,
  type AllLayouts, type LauncherId, type ElementPos
} from '@/lib/overlay-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  loadOverlays, saveOverlays, DEFAULT_OVERLAYS, type OverlaysConfig
} from '@/lib/overlay-config'
import { loadBoardLook, resolveLedFont, DEFAULT_LOOK, type BoardLook } from '@/lib/board-look'
import { finishClass, resolveFinish, finishStyle, type Finish } from '@/lib/finishes'

/** Nombres legibles de cada capa, para no mostrar identificadores tecnicos. */
const CAPA_NOMBRE: Record<string, string> = {
  watermark: 'Escudo de fondo', text: 'Texto del gol', jersey: 'Camiseta',
  shield: 'Escudo', score: 'Marcador',
  header: 'Cabecera', teams: 'Equipos y resultado', periods: 'Parciales',
  scorers: 'Goleadores', compare: 'Comparativas'
}

interface Props { open: boolean; onClose: () => void }

const BOARDS = [
  { id: 1, label: 'P1 Global' }, { id: 2, label: 'P2 Local' }, { id: 3, label: 'P3 Visita' },
  { id: 4, label: 'P4 Tarj. L' }, { id: 5, label: 'P5 Tarj. V' }
]

type Tab = 'goal' | 'final' | 'stats'

/**
 * TODO LO QUE SIGUE VIVÍA DECLARADO DENTRO DEL CUERPO DE `OverlaysModal`.
 *
 * Eso convertía a cada uno en un TIPO DE COMPONENTE NUEVO en cada render del
 * modal — exactamente el mismo bug que ya se había corregido una vez para las
 * capas internas de los lanzadores (ver `OverlaySlot.tsx`), pero sin corregir
 * aquí, un nivel más arriba.
 *
 * `Layout` era el que más dolía: envuelve el lienzo completo (GoalOverlay /
 * SummaryOverlay / WinnerOverlay). Arrastrar un elemento llama a `onChange`
 * en cada `pointermove`, que actualiza el estado `layouts` del modal — y con
 * `Layout` redefinida en cada render, React desmontaba y volvía a montar el
 * lienzo completo en el primerísimo píxel de movimiento. Eso perdía la
 * captura del puntero y la referencia de arrastre al instante: el modo editar
 * "no destrababa nada" porque, literalmente, el lienzo se recreaba antes de
 * que el arrastre pudiera completar un solo frame. Remontar un árbol tan
 * grande en cada movimiento también es lo que producía el salto de scroll.
 *
 * Ahora viven todos afuera, como componentes de verdad: se definen una sola
 * vez, y sólo se vuelven a renderizar — nunca a remontar — cuando cambian sus
 * props.
 */

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
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
}

function BoardPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
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
}

function NumberField({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string
}) {
  return (
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
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
      <span className="text-sm font-bold text-zinc-300">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-10 h-8 rounded border-0 bg-transparent p-0 cursor-pointer" />
    </div>
  )
}

function TabBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
        active ? 'bg-zinc-800 text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
      {icon} {label}
    </button>
  )
}

interface LayoutProps {
  tab: Tab
  cfg: OverlaysConfig
  layouts: AllLayouts
  editMode: boolean
  setEditMode: (v: boolean | ((p: boolean) => boolean)) => void
  setLayouts: (v: AllLayouts | ((p: AllLayouts) => AllLayouts)) => void
  update: (next: OverlaysConfig) => void
  look: BoardLook
  previewFont: string
  previewNumberStyle: React.CSSProperties
  digitFxClass: string
  nameFxClass: string
  prevTeam: 'home' | 'away'
  setPrevTeam: (v: 'home' | 'away') => void
}

/** Tamaño y posición, iguales para los tres lanzadores. */
function Layout({
  tab: t, cfg, layouts, editMode, setEditMode, setLayouts, update,
  look, previewFont, previewNumberStyle, digitFxClass, nameFxClass, prevTeam, setPrevTeam
}: LayoutProps) {
  const c = cfg[t] as { scale: number; align: 'top' | 'center' | 'bottom' }
  const patch = (v: Partial<{ scale: number; align: 'top' | 'center' | 'bottom' }>) =>
    update({ ...cfg, [t]: { ...cfg[t], ...v } } as OverlaysConfig)
  const setPos = (launcher: LauncherId, id: string, pos: ElementPos) =>
    setLayouts(prev => ({ ...prev, [launcher]: { ...prev[launcher], [id]: pos } }))

  return (
    <div className="border-t border-zinc-800 pt-3 space-y-3">
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tamaño y posición</p>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-zinc-300">Tamaño</span>
          <span className="text-[10px] font-mono text-zinc-500">{Math.round((c.scale || 1) * 100)}%</span>
        </div>
        <input type="range" min={60} max={140} step={5}
          value={Math.round((c.scale || 1) * 100)}
          onChange={e => patch({ scale: parseInt(e.target.value) / 100 })}
          className="w-full accent-blue-500" />
      </div>

      <div>
        <span className="text-xs font-bold text-zinc-300 block mb-1">Posición vertical</span>
        <div className="grid grid-cols-3 gap-1">
          {(['top', 'center', 'bottom'] as const).map(a => (
            <button key={a} onClick={() => patch({ align: a })}
              className={`h-9 rounded-lg text-[10px] font-black transition-colors ${
                (c.align || 'center') === a ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {a === 'top' ? 'ARRIBA' : a === 'center' ? 'CENTRO' : 'ABAJO'}
            </button>
          ))}
        </div>
      </div>

      {/* Previsualización: proporción real del tablero, 16:9 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            <Eye className="w-3 h-3" /> Previsualización
          </span>
          {t === 'goal' && (
            /* Las camisetas son distintas por equipo: hay que poder ver las dos */
            <div className="flex gap-1">
              {(['home', 'away'] as const).map(side => (
                <button key={side} onClick={() => setPrevTeam(side)}
                  className={`px-2 h-6 rounded text-[9px] font-black transition-colors ${
                    prevTeam === side
                      ? (side === 'home' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-black')
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  {side === 'home' ? 'GOL LOCAL' : 'GOL VISITA'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div
          className={`w-full aspect-video bg-black rounded-lg relative overflow-hidden border-2 ${
            editMode ? 'border-blue-500' : 'border-zinc-700'}`}>
          {/* Los componentes REALES a escala, no una maqueta: lo que se ve
              aquí es literalmente lo que sale por el proyector. */}
          <div className={`absolute inset-0 ${editMode ? '' : 'pointer-events-none'}`}>
            {t === 'goal' && (
              <GoalOverlay embedded goal={{ id: 'demo', team: prevTeam, playerNumber: prevTeam === 'home' ? '7' : '11' }}
                layout={layouts.goal} editMode={editMode} onLayoutChange={(id, pos) => setPos('goal', id, pos)}
                cfg={cfg.goal} phase="in"
                homeTeamName={DEMO_HOME} awayTeamName={DEMO_AWAY}
                homeScore={2} awayScore={1}
                homeLogo={look.homeUrl} awayLogo={look.awayUrl} fontFamily={previewFont} />
            )}
            {t === 'final' && (
              <WinnerOverlay embedded state={DEMO_STATE}
                layout={layouts.final} editMode={editMode} onLayoutChange={(id, pos) => setPos('final', id, pos)}
                homeTeamName={DEMO_HOME} awayTeamName={DEMO_AWAY}
                homeLogo={look.homeUrl} awayLogo={look.awayUrl}
                accent={look.boardAccentColor} textColor={look.boardTextColor} winColor={look.possessionColor}
                numberStyle={previewNumberStyle} numberClass={digitFxClass} nameClass={nameFxClass}
                winnerText={cfg.final.winnerText} drawText={cfg.final.drawText}
                scale={cfg.final.scale} align={cfg.final.align} />
            )}
            {t === 'stats' && (
              <SummaryOverlay embedded state={DEMO_STATE} scope="primer_tiempo"
                layout={layouts.stats} editMode={editMode} onLayoutChange={(id, pos) => setPos('stats', id, pos)}
                homeTeamName={DEMO_HOME} awayTeamName={DEMO_AWAY}
                homeLogo={look.homeUrl} awayLogo={look.awayUrl}
                accent={look.boardAccentColor} textColor={look.boardTextColor}
                numberStyle={previewNumberStyle} numberClass={digitFxClass} nameClass={nameFxClass}
                clockLabel="DESCANSO" clockValue="04:32"
                sections={cfg.stats} scale={cfg.stats.scale} align={cfg.stats.align} />
            )}
          </div>
        </div>

        {/* Edicion de posiciones: mismo mecanismo que el modo edicion de los
            tableros, sobre el lienzo de 1920x1080. */}
        <div className="grid grid-cols-3 gap-1 mt-2">
          <Button onClick={() => setEditMode(v => !v)}
            className={`h-9 text-[10px] font-black ${editMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
            <Move className="w-3.5 h-3.5 mr-1" /> {editMode ? 'EDITANDO' : 'MOVER'}
          </Button>
          <Button onClick={() => { saveLayouts(layouts); setEditMode(false); toast.success('Posiciones guardadas') }}
            disabled={!editMode}
            className="h-9 text-[10px] font-black bg-green-700 hover:bg-green-600 disabled:opacity-30">
            <Save className="w-3.5 h-3.5 mr-1" /> GUARDAR
          </Button>
          <Button onClick={() => { const l = resetLauncher(layouts, t as LauncherId); setLayouts(l); saveLayouts(l); toast.info('Posiciones por defecto') }}
            variant="outline" className="h-9 text-[10px] font-bold border-zinc-600">
            <RotateCw className="w-3.5 h-3.5 mr-1" /> LIMPIAR
          </Button>
        </div>

        {editMode && (
          <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">
              Capas
            </span>
            <div className="space-y-1">
              {Object.keys(layouts[t as LauncherId]).map(id => {
                const pos = layouts[t as LauncherId][id]
                return (
                  <div key={id} className="flex items-center gap-2 bg-zinc-900 rounded px-2 py-1">
                    <span className="flex-1 text-[11px] font-bold text-zinc-300 capitalize">{CAPA_NOMBRE[id] || id}</span>
                    <button onClick={() => setPos(t as LauncherId, id, { ...pos, s: Math.max(0.3, +(pos.s - 0.1).toFixed(2)) })}
                      className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white">−</button>
                    <span className="text-[10px] font-mono text-zinc-500 w-9 text-center">{Math.round(pos.s * 100)}%</span>
                    <button onClick={() => setPos(t as LauncherId, id, { ...pos, s: Math.min(3, +(pos.s + 0.1).toFixed(2)) })}
                      className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white">+</button>
                    <button onClick={() => setPos(t as LauncherId, id, { ...pos, v: !pos.v })}
                      title={pos.v ? 'Ocultar' : 'Mostrar'}
                      className={`w-6 h-6 rounded flex items-center justify-center ${pos.v ? 'bg-green-700' : 'bg-zinc-800 text-zinc-600'}`}>
                      {pos.v ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {editMode && (
          <p className="text-[10px] text-zinc-500 leading-snug mt-1">
            Arrastra cada elemento. Los botones sobre él ajustan tamaño y visibilidad.
            Las posiciones son las mismas que usa el proyector.
          </p>
        )}
      </div>
    </div>
  )
}

export function OverlaysModal({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<OverlaysConfig>(DEFAULT_OVERLAYS)
  const [tab, setTab] = useState<Tab>('goal')
  const [layouts, setLayouts] = useState<AllLayouts>(loadLayouts())
  const [editMode, setEditMode] = useState(false)
  const [prevTeam, setPrevTeam] = useState<'home' | 'away'>('home')

  /**
   * La apariencia REAL del tablero: escudos, colores, tipografía y acabado.
   *
   * Antes aquí sólo se leían los escudos y el resto iba escrito a mano
   * (`#dc2626`, `var(--font-led)`). Si el operador dejaba el tablero en verde,
   * la previsualización seguía mostrándolo rojo: los componentes eran reales
   * pero les llegaban datos falsos. Ahora leen de la misma fuente que el
   * proyector, así que lo que se ve aquí es lo que sale allá.
   */
  const [look, setLook] = useState<BoardLook>(DEFAULT_LOOK)
  useEffect(() => {
    if (!open) return
    setLook(loadBoardLook())
    const refresh = () => setLook(loadBoardLook())
    window.addEventListener('storage', refresh)
    window.addEventListener('ardi-screens-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('ardi-screens-updated', refresh)
    }
  }, [open])

  /* Mismo criterio que el tablero: metal degrada a sólido en cifras críticas. */
  const digitFinish = resolveFinish(look.finishDigits as Finish, true)
  const nameFinish = look.finishNames as Finish
  const digitFxClass = finishClass(digitFinish)
  const nameFxClass = finishClass(nameFinish)
  const previewFont = resolveLedFont(look.ledFont)
  const previewNumberStyle: React.CSSProperties = {
    fontFamily: previewFont,
    fontWeight: (look.fontWeight || '900') as React.CSSProperties['fontWeight'],
    letterSpacing: look.letterSpacing || 'normal',
    ...finishStyle(look.boardAccentColor, digitFinish)
  }

  useEffect(() => { if (open) { setLayouts(loadLayouts()); setEditMode(false) } }, [open])

  useEffect(() => { if (open) setCfg(loadOverlays()) }, [open])

  const update = (next: OverlaysConfig) => { setCfg(next); saveOverlays(next) }
  const patchGoal  = (p: Partial<OverlaysConfig['goal']>)  => update({ ...cfg, goal:  { ...cfg.goal,  ...p } })
  const patchFinal = (p: Partial<OverlaysConfig['final']>) => update({ ...cfg, final: { ...cfg.final, ...p } })
  const patchStats = (p: Partial<OverlaysConfig['stats']>) => update({ ...cfg, stats: { ...cfg.stats, ...p } })

  const layoutProps = {
    cfg, layouts, editMode, setEditMode, setLayouts, update,
    look, previewFont, previewNumberStyle, digitFxClass, nameFxClass, prevTeam, setPrevTeam
  }

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
          <TabBtn label="Gol"          icon={<Goal className="w-3.5 h-3.5" />}      active={tab === 'goal'}  onClick={() => setTab('goal')} />
          <TabBtn label="Fin"          icon={<Trophy className="w-3.5 h-3.5" />}    active={tab === 'final'} onClick={() => setTab('final')} />
          <TabBtn label="Estadísticas" icon={<BarChart3 className="w-3.5 h-3.5" />} active={tab === 'stats'} onClick={() => setTab('stats')} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'goal' && (
            <>
              <Toggle on={cfg.goal.enabled} onChange={v => patchGoal({ enabled: v })}
                label="Animación de gol" hint="Se dispara sólo cuando el gol se carga con goleador" />

              {/* La previsualización va primero, justo debajo del interruptor —
                  antes quedaba al final de una lista larga de ajustes, y había
                  que bajar bastante para verla siquiera una vez. */}
              <Layout tab="goal" {...layoutProps} />

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

              {/* La camiseta se editaba en dos modales distintos que escribían en
                  llaves distintas. Ahora vive sólo aquí. */}
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Camiseta de la animación</p>
                <div>
                  <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Diseño</Label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {([['solid', 'Sólido'], ['striped', 'Rayada'], ['halved', 'Mitad']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => patchGoal({ jerseyDesign: v })}
                        className={`h-9 rounded-lg text-[10px] font-black ${
                          cfg.goal.jerseyDesign === v ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="Local fondo"   value={cfg.goal.homeJ1} onChange={v => patchGoal({ homeJ1: v })} />
                  <ColorField label="Local número"  value={cfg.goal.homeJ2} onChange={v => patchGoal({ homeJ2: v })} />
                  <ColorField label="Visita fondo"  value={cfg.goal.awayJ1} onChange={v => patchGoal({ awayJ1: v })} />
                  <ColorField label="Visita número" value={cfg.goal.awayJ2} onChange={v => patchGoal({ awayJ2: v })} />
                </div>
              </div>

            </>
          )}

          {tab === 'final' && (
            <>
              <Toggle on={cfg.final.enabled} onChange={v => patchFinal({ enabled: v })} label="Pantalla de fin de partido" />

              <Layout tab="final" {...layoutProps} />

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

              <Layout tab="stats" {...layoutProps} />

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
