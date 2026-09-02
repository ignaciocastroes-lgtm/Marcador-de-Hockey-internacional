"use client"

import { useState } from 'react'
import { Shield, Type, Circle, LayoutDashboard, ExternalLink, Layers, X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FINISHES, METAL_PRESETS, FLUOR_PRESETS, finishClass, finishStyle, type Finish } from '@/lib/finishes'

// ─────────────────────────────────────────────────────────────────────────────
// GESTOR PANTALLAS
//
// Antes eran ~90 controles en un solo scroll, con el escudo arriba y su forma de
// recorte doscientos pixeles mas abajo. Ahora es un menu de cinco tarjetas y cada
// grupo abre en su propio modal: lo que se configura junto, esta junto.
// Ningun control se perdio; el inventario esta en PANEL_INVENTORY mas abajo.
// ─────────────────────────────────────────────────────────────────────────────

export type PanelId = 'identidad' | 'tipografia' | 'vistas' | null

export interface ScreensPanelProps {
  liveLogos: Record<string, string>
  updateLiveLogos: (u: Record<string, string>) => void
  visibleScreens: string[]
  toggleScreenVisibility: (id: string) => void
  openScoreboardWindow: (id: number) => void
  onOpenOverlays: () => void
}

const SCREENS = [
  { id: '1', label: 'P1: Marcador Global',   fixed: true },
  { id: '2', label: 'P2: 45s / Faltas Local', fixed: false },
  { id: '3', label: 'P3: 45s / Faltas Visita', fixed: false },
  { id: '4', label: 'P4: Tarjetas Local',    fixed: false },
  { id: '5', label: 'P5: Tarjetas Visita',   fixed: false }
]

/** Toda propiedad configurable, para poder verificar que no se pierda ninguna. */
export const PANEL_INVENTORY = [
  'homeUrl', 'awayUrl', 'shape', 'displayMode', 'effect3D', 'effectAnimated',
  'ledFont', 'fontWeight', 'letterSpacing',
  'boardBgColor', 'boardTextColor', 'boardAccentColor', 'possessionColor', 'penaltiesColor',
  'finishDigits', 'finishNames'
] as const

export function ScreensPanel(props: ScreensPanelProps) {
  const { liveLogos: L, updateLiveLogos: up } = props
  const [panel, setPanel] = useState<PanelId>(null)

  const Color = ({ k, label }: { k: string; label: string }) => (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</Label>
      <input type="color" value={L[k] || '#000000'} onChange={e => up({ [k]: e.target.value })}
        className="w-full h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer p-0" />
    </div>
  )

  const Toggle = ({ k, label, hint, color }: { k: string; label: string; hint?: string; color: string }) => {
    const on = !!L[k]
    return (
      <button onClick={() => up({ [k]: on ? '' : '1' })}
        className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 text-left transition-colors">
        <span className={`w-12 h-6 rounded-full shrink-0 relative transition-colors ${on ? color : 'bg-zinc-700'}`}>
          <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${on ? 'left-[28px]' : 'left-[4px]'}`} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm font-bold ${on ? 'text-white' : 'text-zinc-400'}`}>{label}</span>
          {hint && <span className="block text-[10px] text-zinc-500 leading-snug">{hint}</span>}
        </span>
      </button>
    )
  }

  const Picker = ({ k, label, options }: { k: string; label: string; options: Array<[string, string]> }) => (
    <div>
      <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</Label>
      <Select value={L[k] || options[0][0]} onValueChange={v => up({ [k]: v })}>
        <SelectTrigger className="h-10 mt-1 bg-zinc-900 border-zinc-700 font-bold text-sm"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  const Panel = ({ id, title, icon, children }: { id: PanelId; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <Dialog open={panel === id} onOpenChange={o => { if (!o) setPanel(null) }}>
      <DialogContent className="bg-zinc-950 border-2 border-zinc-700 text-white max-w-xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg font-black flex items-center gap-2">{icon} {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <Button onClick={() => setPanel(null)} className="w-full h-11 font-black bg-green-700 hover:bg-green-600">LISTO</Button>
      </DialogContent>
    </Dialog>
  )

  const Card = ({ id, title, desc, icon, tone }: {
    id: Exclude<PanelId, null>; title: string; desc: string; icon: React.ReactNode; tone: string
  }) => (
    <button onClick={() => setPanel(id)}
      className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-colors bg-zinc-900/60 hover:bg-zinc-900 border ${tone}`}>
      {icon}
      <span className="flex-1 min-w-0">
        <span className="block font-black text-base">{title}</span>
        <span className="block text-zinc-500 text-xs leading-snug">{desc}</span>
      </span>
      <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0" />
    </button>
  )

  return (
    <div className="space-y-3">

      {/* ── MENÚ ────────────────────────────────────────────────────────── */}
      <button onClick={props.onOpenOverlays}
        className="w-full flex items-center gap-3 bg-gradient-to-r from-yellow-950/40 to-zinc-900 border border-yellow-800/60 hover:border-yellow-600 rounded-2xl p-4 text-left transition-colors">
        <Layers className="w-6 h-6 text-yellow-400 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-yellow-400 font-black text-base">Lanzadores de proyección</span>
          <span className="block text-zinc-500 text-xs leading-snug">Animación de gol, fin de partido y estadísticas</span>
        </span>
        <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0" />
      </button>

      <Card id="identidad" title="Escudos e identidad" desc="Escudos, forma de recorte y perspectiva"
        tone="border-yellow-800/60 hover:border-yellow-600"
        icon={<Shield className="w-6 h-6 text-yellow-400 shrink-0" />} />

      <Card id="tipografia" title="Tipografía y colores" desc="Fuente, grosor, separación y paleta del tablero"
        tone="border-sky-800/60 hover:border-sky-600"
        icon={<Type className="w-6 h-6 text-sky-400 shrink-0" />} />

      <Card id="vistas" title="Vistas y proyectores" desc="Qué panel se ve y lanzar cada pantalla"
        tone="border-blue-800/60 hover:border-blue-600"
        icon={<LayoutDashboard className="w-6 h-6 text-blue-400 shrink-0" />} />

      {/* ── 1. ESCUDOS E IDENTIDAD ──────────────────────────────────────── */}
      <Panel id="identidad" title="Escudos e identidad" icon={<Shield className="w-5 h-5 text-yellow-400" />}>
        <div className="flex items-center justify-center gap-6 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          {[L.homeUrl, L.awayUrl].map((u, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              {u ? <img src={u} alt="" className="h-20 w-20 object-contain" />
                 : <div className="h-20 w-20 rounded-lg border-2 border-dashed border-zinc-700" />}
              <span className="text-[9px] font-black text-zinc-500 uppercase">{i === 0 ? 'Local' : 'Visita'}</span>
            </div>
          ))}
        </div>

        <div>
          <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">URL escudo local</Label>
          <Input value={L.homeUrl || ''} onChange={e => up({ homeUrl: e.target.value })}
            placeholder="https://…" className="h-10 mt-1 bg-zinc-900 border-zinc-700 text-xs" />
        </div>
        <div>
          <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">URL escudo visita</Label>
          <Input value={L.awayUrl || ''} onChange={e => up({ awayUrl: e.target.value })}
            placeholder="https://ejemplo.com/logo2.png" className="h-10 mt-1 bg-zinc-900 border-zinc-700 text-xs" />
        </div>

        {/* La forma y la perspectiva van CON el escudo, no doscientos píxeles abajo */}
        <div className="grid grid-cols-2 gap-3">
          <Picker k="shape" label="Forma (máscara)" options={[
            ['shield', 'Escudo clásico'], ['circle', 'Círculo'], ['square', 'Cuadrado'],
            ['gotico', 'Gótico'], ['iberico', 'Ibérico'], ['tudor', 'Tudor'], ['none', 'Sin recorte']
          ]} />
          <Picker k="displayMode" label="Presentación" options={[
            ['shield', 'Escudo + nombre'], ['none', 'Sólo escudo'], ['square', 'Sólo nombre']
          ]} />
        </div>

        <Toggle k="effect3D" label="Perspectiva 3D" hint="Inclina el escudo en el tablero" color="bg-yellow-500" />
        <Toggle k="effectAnimated" label="Animación flotante" hint="El escudo respira suavemente" color="bg-blue-500" />
      </Panel>

      {/* ── 2. TIPOGRAFÍA Y COLORES ─────────────────────────────────────── */}
      <Panel id="tipografia" title="Tipografía y colores" icon={<Type className="w-5 h-5 text-sky-400" />}>
        <Picker k="ledFont" label="Tipografía de números" options={[
          ['dseg7', 'DSEG7 — siete segmentos'],
          ['dseg14', 'DSEG14 — catorce segmentos'],
          ['led-classic', 'LED clásico (Orbitron)'],
          ['jetbrains', 'JetBrains Mono'],
          ['fira', 'Fira Code'],
          ['chivo', 'Chivo Mono'],
          ['impact', 'Impact (gruesa)'], ['arial-black', 'Arial Black'],
          ['system', 'Del sistema'], ['consolas', 'Consolas'], ['trebuchet', 'Trebuchet']
        ]} />
        <p className="text-[10px] text-zinc-600 leading-snug -mt-2">
          DSEG es la tipografía de display de siete segmentos, la de los marcadores
          físicos. Viaja dentro del despliegue: no depende de internet.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Picker k="fontWeight" label="Grosor" options={[
            ['900', 'Máximo (Black)'], ['700', 'Fuerte (Bold)'], ['400', 'Normal']
          ]} />
          <Picker k="letterSpacing" label="Separación" options={[
            ['normal', 'Normal'], ['5', 'Amplia'], ['8', 'Muy amplia']
          ]} />
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 block">
            Colores del marcador público
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <Color k="boardBgColor" label="Fondo" />
            <Color k="boardTextColor" label="Textos" />
            <Color k="boardAccentColor" label="Dígitos" />
            <Color k="possessionColor" label="Posesión" />
            <Color k="penaltiesColor" label="Penales" />
          </div>
          <p className="text-[10px] text-zinc-600 leading-snug mt-2">
            El tablero se lee a treinta metros: conviene máximo contraste entre fondo y dígitos.
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 block">
            Acabado
          </Label>
          <p className="text-[10px] text-zinc-600 leading-snug mb-2">
            No es un color: es cómo se comporta la luz sobre el color elegido.
          </p>

          {([
            { k: 'finishDigits', label: 'Dígitos del reloj y marcador', critical: true },
            { k: 'finishNames',  label: 'Nombres y letreros',           critical: false }
          ]).map(row => {
            const current = (L[row.k] || 'solid') as Finish
            return (
              <div key={row.k} className="mb-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">{row.label}</span>
                <div className="grid grid-cols-4 gap-1">
                  {FINISHES.map(f => {
                    const blocked = row.critical && !f.safeForClock
                    return (
                      <button key={f.id}
                        onClick={() => blocked ? undefined : up({ [row.k]: f.id })}
                        disabled={blocked}
                        title={blocked ? 'El degradado parte el dígito: ilegible a distancia' : f.hint}
                        className={`h-9 rounded-lg text-[10px] font-black transition-colors ${
                          blocked ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                          : current === f.id ? 'bg-sky-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Vista previa sobre el color real del tablero */}
          <div className="rounded-xl border border-zinc-800 p-4 flex items-center justify-center gap-6"
            style={{ background: L.boardBgColor || '#050505' }}>
            <span className={`text-5xl font-black tabular-nums ${finishClass((L.finishDigits || 'solid') as Finish)}`}
              style={finishStyle(L.boardAccentColor || '#dc2626', (L.finishDigits || 'solid') as Finish)}>
              12:34
            </span>
            <span className={`text-2xl font-black ${finishClass((L.finishNames || 'solid') as Finish)}`}
              style={finishStyle(L.boardTextColor || '#ffffff', (L.finishNames || 'solid') as Finish)}>
              LOCAL
            </span>
          </div>

          {(L.finishNames === 'metal') && (
            <div className="flex gap-1 mt-2">
              {METAL_PRESETS.map(m => (
                <button key={m.label} onClick={() => up({ boardTextColor: m.color })}
                  className="flex-1 h-8 rounded-lg text-[10px] font-black text-black" style={{ background: m.color }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {(L.finishDigits === 'fluor' || L.finishNames === 'fluor') && (
            <div className="flex gap-1 mt-2">
              {FLUOR_PRESETS.map(m => (
                <button key={m.label} onClick={() => up({ boardAccentColor: m.color })}
                  className="flex-1 h-8 rounded-lg text-[9px] font-black text-black" style={{ background: m.color }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

      </Panel>

      {/* ── 4. VISTAS Y PROYECTORES ─────────────────────────────────────── */}
      <Panel id="vistas" title="Vistas y proyectores" icon={<LayoutDashboard className="w-5 h-5 text-blue-400" />}>
        <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Qué se ve en el videowall</Label>
        <div className="space-y-2">
          {SCREENS.map(sc => {
            const on = props.visibleScreens.includes(sc.id)
            return (
              <div key={sc.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <span className={`text-sm font-bold ${on ? 'text-white' : 'text-zinc-500'}`}>{sc.label}</span>
                <button disabled={sc.fixed} onClick={() => props.toggleScreenVisibility(sc.id)}
                  title={sc.fixed ? 'El marcador global siempre está visible' : ''}
                  className={`w-12 h-6 rounded-full transition-colors relative shadow-inner shrink-0 ${
                    on ? 'bg-green-600' : 'bg-zinc-700'} ${sc.fixed ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${on ? 'left-[28px]' : 'left-[4px]'}`} />
                </button>
              </div>
            )
          })}
        </div>

        <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest border-t border-zinc-800 pt-3 block">
          Lanzar a proyector
        </Label>
        <div className="space-y-2">
          {SCREENS.map(sc => (
            <Button key={sc.id} onClick={() => props.openScoreboardWindow(Number(sc.id))}
              className="w-full h-11 justify-start font-bold text-xs bg-zinc-900 hover:bg-zinc-800 border border-blue-900/60">
              <ExternalLink className="w-4 h-4 mr-2 text-blue-400" /> Lanzar {sc.label}
            </Button>
          ))}
        </div>
      </Panel>
    </div>
  )
}
