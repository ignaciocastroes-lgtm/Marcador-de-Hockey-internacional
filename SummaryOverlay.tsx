"use client"

import type { GameState } from '@/hooks/use-game-state'
import { buildSummary, fmtDuration } from '@/lib/match-summary'
import type { StatsOverlayConfig } from '@/lib/overlay-config'
import { DEFAULT_OVERLAYS } from '@/lib/overlay-config'

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
  /** Reloj del entretiempo, se mantiene visible durante el resumen. */
  clockLabel?: string
  clockValue?: string
  sections?: StatsOverlayConfig
}

const CARD_COLOR = { yellow: '#facc15', blue: '#3b82f6', red: '#dc2626' } as const

export function SummaryOverlay({
  state, scope, homeTeamName, awayTeamName, homeLogo, awayLogo,
  accent, textColor, numberStyle, clockLabel, clockValue, sections = DEFAULT_OVERLAYS.stats
}: Props) {
  const s = buildSummary(state, scope)
  const titulo = scope === 'primer_tiempo' ? 'RESUMEN 1ER TIEMPO' : 'FICHA DEL PARTIDO'

  const Side = ({
    name, logo, data, align
  }: { name: string; logo?: string | null; data: typeof s.home; align: 'left' | 'right' }) => (
    <div className={`flex-1 flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'} gap-[18px]`}>
      <div className={`flex items-center gap-[20px] ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {logo && <img src={logo} alt="" className="h-[90px] w-[90px] object-contain" />}
        <span className="font-black text-[46px] leading-none truncate max-w-[520px]" style={{ color: textColor }}>
          {name}
        </span>
      </div>

      <span className="leading-none" style={{ ...numberStyle, fontSize: '150px' }}>{data.score}</span>

      {sections.showScorers && data.scorers.length > 0 && (
        <div className="flex flex-col gap-[4px]">
          {data.scorers.slice(0, 6).map(sc => (
            <span key={sc.number} className="font-bold text-[30px]" style={{ color: textColor, opacity: 0.9 }}>
              #{sc.number}{sc.goals > 1 ? ` ×${sc.goals}` : ''}
            </span>
          ))}
        </div>
      )}

      {sections.showGoalMinutes && data.goals.length > 0 && (
        <div className={`flex flex-wrap gap-x-[16px] gap-y-[4px] max-w-[560px] ${align === 'right' ? 'justify-end' : ''}`}>
          {data.goals.slice(0, 12).map((g, i) => (
            <span key={i} className="font-mono text-[24px]" style={{ color: textColor, opacity: 0.55 }}>
              {g.minute} #{g.number}
            </span>
          ))}
        </div>
      )}

      {sections.showCards && data.cards.length > 0 && (
        <div className={`flex flex-wrap gap-[8px] max-w-[560px] ${align === 'right' ? 'justify-end' : ''}`}>
          {data.cards.slice(0, 14).map((c, i) => (
            <span key={i}
              className="flex items-center justify-center font-black text-[20px] rounded-[4px] px-[8px] py-[2px]"
              style={{ background: CARD_COLOR[c.type], color: c.type === 'yellow' ? '#000' : '#fff' }}>
              {c.number}{c.isBench ? 'B' : ''}
            </span>
          ))}
        </div>
      )}

      <div className={`flex gap-[28px] ${align === 'right' ? 'justify-end' : ''}`}>
        {sections.showFouls && <div className={align === 'right' ? 'text-right' : ''}>
          <span className="block font-bold text-[20px] tracking-widest" style={{ color: textColor, opacity: 0.5 }}>FALTAS</span>
          <span className="font-black text-[44px]" style={{ color: textColor }}>{data.fouls}</span>
        </div>}
        {sections.showPossession && <div className={align === 'right' ? 'text-right' : ''}>
          <span className="block font-bold text-[20px] tracking-widest" style={{ color: textColor, opacity: 0.5 }}>POSESIÓN</span>
          <span className="font-black text-[44px]" style={{ color: textColor }}>{data.possessionPct}%</span>
          <span className="block font-mono text-[22px]" style={{ color: textColor, opacity: 0.5 }}>{fmtDuration(data.possession)}</span>
        </div>}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[2800] flex flex-col items-center justify-center bg-black px-[70px] py-[50px] bc-in">
      <div className="flex items-center gap-[40px] mb-[30px] bc-content-in">
        <span className="font-black tracking-[0.3em] text-[38px]" style={{ color: accent }}>{titulo}</span>
        {clockValue && (
          <div className="flex items-center gap-[16px] border-[4px] rounded-[18px] px-[28px] py-[6px]" style={{ borderColor: `${accent}66` }}>
            <span className="font-bold text-[22px] tracking-widest" style={{ color: textColor, opacity: 0.6 }}>{clockLabel}</span>
            <span className="leading-none" style={{ ...numberStyle, fontSize: '64px' }}>{clockValue}</span>
          </div>
        )}
      </div>

      <div className="flex w-full items-start gap-[50px] bc-content-in">
        <Side name={homeTeamName} logo={homeLogo} data={s.home} align="left" />
        <div className="flex flex-col items-center gap-[14px] pt-[110px]">
          {sections.showByPeriod && s.byPeriod.map(p => (
            <div key={p.label} className="flex items-center gap-[14px]">
              <span className="font-bold text-[26px] w-[54px] text-right" style={{ color: textColor, opacity: 0.45 }}>{p.label}</span>
              <span className="font-black text-[34px]" style={{ color: textColor }}>{p.home} – {p.away}</span>
            </div>
          ))}
          {s.hasPenalties && (
            <div className="flex items-center gap-[14px]">
              <span className="font-bold text-[26px] w-[54px] text-right" style={{ color: textColor, opacity: 0.45 }}>PEN</span>
              <span className="font-black text-[34px]" style={{ color: accent }}>{s.homePenalties} – {s.awayPenalties}</span>
            </div>
          )}
        </div>
        <Side name={awayTeamName} logo={awayLogo} data={s.away} align="right" />
      </div>
    </div>
  )
}
