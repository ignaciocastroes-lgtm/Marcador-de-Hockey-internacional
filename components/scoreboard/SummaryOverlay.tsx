"use client"

import type { GameState } from '@/hooks/use-game-state'
import { buildSummary, fmtDuration } from '@/lib/match-summary'
import type { StatsOverlayConfig } from '@/lib/overlay-config'
import { DEFAULT_OVERLAYS } from '@/lib/overlay-config'
import { OverlayDraggable } from '@/components/scoreboard/OverlayDraggable'
import { CANVAS_W, CANVAS_H, DEFAULT_LAYOUT, type LayoutMap, type ElementPos } from '@/lib/overlay-layout'

interface Props {
  state: GameState
  scope: 'primer_tiempo' | 'completo'
  homeTeamName: string
  awayTeamName: string
  homeLogo?: string | null
  awayLogo?: string | null
  accent: string
  textColor: string
  numberStyle: React.CSSProperties
  clockLabel?: string
  clockValue?: string
  sections?: StatsOverlayConfig
  scale?: number
  align?: 'top' | 'center' | 'bottom'
  /** true = vive dentro de una caja (previsualización) en vez del viewport. */
  embedded?: boolean
  layout?: LayoutMap
  editMode?: boolean
  canvasScale?: number
  onLayoutChange?: (id: string, pos: ElementPos) => void
}

const CARD_COLOR = { yellow: '#facc15', blue: '#3b82f6', red: '#dc2626' } as const

export function SummaryOverlay({
  state, scope, homeTeamName, awayTeamName, homeLogo, awayLogo,
  accent, textColor, numberStyle, clockLabel, clockValue, sections = DEFAULT_OVERLAYS.stats, scale = 1, align = 'center', embedded = false,
  layout = DEFAULT_LAYOUT.stats, editMode = false, canvasScale = 1, onLayoutChange
}: Props) {
  const D = ({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) => (
    <OverlayDraggable id={id} pos={layout[id]} editMode={editMode} canvasScale={canvasScale}
      onChange={(k, v) => onLayoutChange?.(k, v)} className={className}>
      {children}
    </OverlayDraggable>
  )
  const s = buildSummary(state, scope)
  const titulo = scope === 'primer_tiempo' ? 'RESUMEN 1ER TIEMPO' : 'FICHA DEL PARTIDO'
  const dim = (o: number) => ({ color: textColor, opacity: o })

  /**
   * Fila comparativa: etiqueta al centro y los dos valores enfrentados.
   * Es la estructura estandar de las estadisticas de television, y funciona
   * porque el ojo compara en horizontal sin buscar donde esta cada dato.
   */
  const StatRow = ({
    label, home, away, homeBar, awayBar
  }: { label: string; home: string; away: string; homeBar?: number; awayBar?: number }) => (
    <div className="flex items-center w-full gap-[24px]">
      <span className="flex-1 text-right font-black text-[62px] leading-none tabular-nums" style={{ color: textColor }}>
        {home}
      </span>

      <div className="w-[520px] shrink-0">
        <div className="text-center font-bold tracking-[0.28em] text-[24px] mb-[10px]" style={dim(0.5)}>
          {label}
        </div>
        {homeBar !== undefined && awayBar !== undefined && (
          <div className="flex h-[14px] w-full rounded-full overflow-hidden" style={{ background: '#ffffff14' }}>
            <div style={{ width: `${homeBar}%`, background: accent }} />
            <div style={{ width: `${awayBar}%`, background: `${textColor}55` }} />
          </div>
        )}
      </div>

      <span className="flex-1 text-left font-black text-[62px] leading-none tabular-nums" style={{ color: textColor }}>
        {away}
      </span>
    </div>
  )

  const Cards = ({ data, align }: { data: typeof s.home; align: 'left' | 'right' }) => (
    <div className={`flex flex-wrap gap-[8px] ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      {data.cards.slice(0, 12).map((c, i) => (
        <span key={i}
          className="flex items-center justify-center font-black text-[26px] rounded-[6px] px-[12px] py-[2px]"
          style={{ background: CARD_COLOR[c.type], color: c.type === 'yellow' ? '#000' : '#fff' }}>
          {c.number}{c.isBench ? 'B' : ''}
        </span>
      ))}
    </div>
  )

  const Scorers = ({ data, align }: { data: typeof s.home; align: 'left' | 'right' }) => (
    <div className={`flex flex-col gap-[6px] ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      {data.goals.slice(0, 8).map((g, i) => (
        <div key={i} className={`flex items-baseline gap-[12px] ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          <span className="font-black text-[34px] tabular-nums" style={{ color: textColor }}>#{g.number}</span>
          <span className="font-mono text-[26px]" style={dim(0.55)}>{g.minute}</span>
        </div>
      ))}
      {data.goals.length === 0 && (
        <span className="font-bold text-[26px]" style={dim(0.35)}>Sin goles</span>
      )}
    </div>
  )

  return (
    <div className={`${embedded ? 'absolute inset-0' : 'overlay-fullscreen'} z-[2800] bg-black bc-in overflow-hidden`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{
          width: CANVAS_W, height: CANVAS_H,
          transform: embedded
            ? `scale(${canvasScale * scale})`
            : `scale(calc(min(calc(100vw / 1920), calc(100dvh / 1080)) * ${scale}))`
        }}>

      {/* ── CABECERA ─────────────────────────────────────────────────────── */}
      <D id="header" className="w-[1400px] flex items-center justify-center gap-[36px] bc-content-in">
        <span className="font-black tracking-[0.32em] text-[40px]" style={{ color: accent }}>{titulo}</span>
        {clockValue && (
          <div className="flex items-center gap-[18px] border-[4px] rounded-[16px] px-[28px] py-[4px]"
            style={{ borderColor: `${accent}66` }}>
            <span className="font-bold text-[22px] tracking-[0.2em]" style={dim(0.55)}>{clockLabel}</span>
            <span className="leading-none tabular-nums" style={{ ...numberStyle, fontSize: '60px' }}>{clockValue}</span>
          </div>
        )}
      </D>

      {/* ── MARCADOR: escudo, nombre y goles en una sola linea base ──────── */}
      <D id="score" className="w-[1700px] flex items-center justify-between gap-[40px] bc-content-in">
        <div className="flex items-center gap-[26px] flex-1 min-w-0">
          {homeLogo && <img src={homeLogo} alt="" className="h-[128px] w-[128px] object-contain shrink-0" />}
          <span className="font-black text-[58px] leading-none truncate" style={{ color: textColor }}>{homeTeamName}</span>
        </div>

        <div className="flex items-center gap-[34px] shrink-0">
          <span className="leading-none tabular-nums" style={{ ...numberStyle, fontSize: '170px' }}>{s.home.score}</span>
          <span className="font-black text-[80px] leading-none" style={dim(0.3)}>–</span>
          <span className="leading-none tabular-nums" style={{ ...numberStyle, fontSize: '170px' }}>{s.away.score}</span>
        </div>

        <div className="flex items-center gap-[26px] flex-1 min-w-0 justify-end">
          <span className="font-black text-[58px] leading-none truncate text-right" style={{ color: textColor }}>{awayTeamName}</span>
          {awayLogo && <img src={awayLogo} alt="" className="h-[128px] w-[128px] object-contain shrink-0" />}
        </div>
      </D>

      {/* Parciales por periodo y definicion por penales */}
      {(sections.showByPeriod || s.hasPenalties) && (
        <div className="flex items-center justify-center gap-[30px] mt-[16px] shrink-0 bc-content-in">
          {sections.showByPeriod && s.byPeriod.map(p => (
            <span key={p.label} className="font-bold text-[28px] tabular-nums" style={dim(0.5)}>
              {p.label} {p.home}–{p.away}
            </span>
          ))}
          {s.hasPenalties && (
            <span className="font-black text-[28px] tabular-nums" style={{ color: accent }}>
              PENALES {s.homePenalties}–{s.awayPenalties}
            </span>
          )}
        </div>
      )}

      {/* ── COMPARATIVAS: etiqueta al centro, valores enfrentados ─────────── */}
      <D id="compare" className="w-[1700px] flex flex-col justify-center gap-[42px] bc-content-in">
        {sections.showPossession && (
          <StatRow
            label="POSESIÓN"
            home={`${s.home.possessionPct}%`}
            away={`${s.away.possessionPct}%`}
            homeBar={s.home.possessionPct}
            awayBar={s.away.possessionPct}
          />
        )}
        {sections.showFouls && (
          <StatRow label="FALTAS" home={String(s.home.fouls)} away={String(s.away.fouls)} />
        )}
        {sections.showPossession && (
          <div className="flex items-center w-full gap-[24px] -mt-[26px]">
            <span className="flex-1 text-right font-mono text-[24px]" style={dim(0.4)}>{fmtDuration(s.home.possession)}</span>
            <span className="w-[520px] shrink-0" />
            <span className="flex-1 text-left font-mono text-[24px]" style={dim(0.4)}>{fmtDuration(s.away.possession)}</span>
          </div>
        )}
      </D>

      {/* ── PIE: goleadores y tarjetas, alineados a la misma base ─────────── */}
      <D id="scorers" className="w-[1700px] flex items-start justify-between gap-[60px] pt-[34px] bc-content-in">
        <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
          {sections.showGoalMinutes && (
            <>
              <span className="font-bold tracking-[0.26em] text-[22px]" style={dim(0.45)}>GOLES</span>
              <Scorers data={s.home} align="left" />
            </>
          )}
          {sections.showCards && s.home.cards.length > 0 && <Cards data={s.home} align="left" />}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-[16px] items-end">
          {sections.showGoalMinutes && (
            <>
              <span className="font-bold tracking-[0.26em] text-[22px]" style={dim(0.45)}>GOLES</span>
              <Scorers data={s.away} align="right" />
            </>
          )}
          {sections.showCards && s.away.cards.length > 0 && <Cards data={s.away} align="right" />}
        </div>
      </D>
        </div>
      </div>
    </div>
  )
}
