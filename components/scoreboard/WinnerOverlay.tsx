"use client"

import type { GameState } from '@/hooks/use-game-state'
import { buildSummary } from '@/lib/match-summary'

/**
 * PANTALLA DE FIN DE PARTIDO
 *
 * La anterior mostraba el escudo y el nombre del ganador, y nada más: faltaba
 * el resultado, que es lo primero que busca cualquiera que mire. También usaba
 * tamaños en píxeles fijos pensados para el lienzo de 1920, y desde que los
 * lanzadores cubren el viewport esos números ya no escalan: en una ventana
 * chica el texto de 140 px se desbordaba.
 *
 * Aquí todo va en unidades relativas al alto de la pantalla (vh), así que se
 * ve igual en el proyector, en el televisor y en la previsualización.
 */

interface Props {
  state: GameState
  homeTeamName: string
  awayTeamName: string
  homeLogo?: string | null
  awayLogo?: string | null
  accent: string
  textColor: string
  winColor: string
  numberStyle: React.CSSProperties
  winnerText: string
  drawText: string
  scale?: number
  align?: 'top' | 'center' | 'bottom'
  /** true = vive dentro de una caja (previsualizacion) en vez del viewport. */
  embedded?: boolean
  onSaveAndReset?: () => void
}

export function WinnerOverlay({
  state, homeTeamName, awayTeamName, homeLogo, awayLogo,
  accent, textColor, winColor, numberStyle, winnerText, drawText,
  scale = 1, align = 'center', embedded = false, onSaveAndReset
}: Props) {
  const s = buildSummary(state, 'completo')

  /**
   * El empate sólo existe en tiempo reglamentario. Si el partido fue a alargue
   * o a penales, tiene que salir con ganador. Con `winner === null` el motor
   * indica que fue a desempate y sigue igualado: no está definido.
   */
  const undecided = state.winner === null
  const isDraw = state.winner === 'draw'
  const homeWon = state.winner === 'home'

  const dim = (o: number) => ({ color: textColor, opacity: o })
  const tieBreak = s.hasPenalties && state.homeScore === state.awayScore

  /** Bloque de equipo. El ganador va grande; el perdedor, presente pero atenuado. */
  const Side = ({
    name, logo, score, won, align: a
  }: { name: string; logo?: string | null; score: number; won: boolean; align: 'left' | 'right' }) => (
    <div className={`flex-1 min-w-0 flex flex-col items-center gap-[1.4vh] ${won || isDraw || undecided ? '' : 'opacity-45'}`}>
      {logo && (
        <img src={logo} alt=""
          className="object-contain"
          style={{
            height: won && !isDraw ? '26vh' : '15vh',
            width: won && !isDraw ? '26vh' : '15vh',
            filter: won && !isDraw ? `drop-shadow(0 0 3vh ${winColor}66)` : 'none'
          }} />
      )}
      <span className="font-black leading-none text-center truncate max-w-full px-[1vh]"
        style={{ color: won && !isDraw ? winColor : textColor, fontSize: won && !isDraw ? '6vh' : '3.6vh' }}>
        {name}
      </span>
      {won && !isDraw && (
        <span className="font-black tracking-[0.3em] leading-none" style={{ color: winColor, fontSize: '2.4vh' }}>
          {winnerText}
        </span>
      )}
    </div>
  )

  return (
    <div className={`${embedded ? 'absolute inset-0' : 'overlay-fullscreen'} z-[2900] bc-in flex flex-col items-center bg-black px-[4vh] py-[3vh]`}
      style={{
        justifyContent: align === 'top' ? 'flex-start' : align === 'bottom' ? 'flex-end' : 'center',
        transform: `scale(${scale})`,
        transformOrigin: align === 'top' ? 'top center' : align === 'bottom' ? 'bottom center' : 'center'
      }}>

      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-[0.6vh] shrink-0 bc-content-in">
        <span className="font-black tracking-[0.34em] leading-none" style={{ color: accent, fontSize: '3vh' }}>
          {undecided ? 'PARTIDO EN DEFINICIÓN' : 'FIN DEL PARTIDO'}
        </span>
        <span className="font-bold tracking-[0.24em] leading-none" style={{ ...dim(0.45), fontSize: '1.7vh' }}>
          {state.matchConfig.seriesName}
          {state.matchConfig.gender ? ` · ${state.matchConfig.gender}` : ''}
        </span>
      </div>

      {/* ── Escudos y RESULTADO, que era lo que faltaba ──────────────────── */}
      <div className="flex items-center justify-center w-full gap-[3vh] mt-[3.5vh] shrink-0 bc-content-in">
        <Side name={homeTeamName} logo={homeLogo} score={state.homeScore} won={homeWon && !undecided} align="left" />

        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-center gap-[2.2vh] leading-none">
            <span style={{ ...numberStyle, fontSize: '17vh', opacity: isDraw || undecided || homeWon ? 1 : 0.5 }} className="tabular-nums">
              {state.homeScore}
            </span>
            <span className="font-black" style={{ ...dim(0.25), fontSize: '8vh' }}>–</span>
            <span style={{ ...numberStyle, fontSize: '17vh', opacity: isDraw || undecided || !homeWon ? 1 : 0.5 }} className="tabular-nums">
              {state.awayScore}
            </span>
          </div>

          {tieBreak && (
            <span className="font-black tracking-[0.2em] leading-none mt-[0.8vh]"
              style={{ color: accent, fontSize: '2.4vh' }}>
              PENALES {s.homePenalties} – {s.awayPenalties}
            </span>
          )}

          {isDraw && (
            <span className="font-black tracking-[0.3em] leading-none mt-[1.2vh]"
              style={{ ...dim(0.6), fontSize: '3.4vh' }}>
              {drawText}
            </span>
          )}

          {undecided && (
            <span className="font-black tracking-[0.2em] leading-none mt-[1.2vh] text-center"
              style={{ color: accent, fontSize: '2.6vh' }}>
              PARTIDO NO DEFINIDO
            </span>
          )}
        </div>

        <Side name={awayTeamName} logo={awayLogo} score={state.awayScore} won={!homeWon && !isDraw && !undecided} align="right" />
      </div>

      {/* ── Parciales por periodo ────────────────────────────────────────── */}
      {s.byPeriod.length > 0 && (
        <div className="flex items-center justify-center gap-[3vh] mt-[2.6vh] shrink-0 bc-content-in">
          {s.byPeriod.map(p => (
            <span key={p.label} className="font-bold tabular-nums leading-none"
              style={{ ...dim(0.45), fontSize: '2vh' }}>
              {p.label} {p.home}–{p.away}
            </span>
          ))}
        </div>
      )}

      {/* ── Goleadores, para que el acta quede a la vista ────────────────── */}
      {(s.home.scorers.length > 0 || s.away.scorers.length > 0) && (
        <div className="flex items-start justify-center w-full gap-[6vh] mt-[3vh] pt-[2vh] shrink-0 bc-content-in"
          style={{ borderTop: `2px solid ${textColor}1f` }}>
          {[s.home, s.away].map((d, i) => (
            <div key={i} className={`flex-1 min-w-0 flex flex-col gap-[0.5vh] ${i === 0 ? 'items-start' : 'items-end'}`}>
              <span className="font-bold tracking-[0.26em] leading-none" style={{ ...dim(0.4), fontSize: '1.5vh' }}>
                GOLES
              </span>
              <div className={`flex flex-wrap gap-x-[1.6vh] gap-y-[0.4vh] ${i === 0 ? 'justify-start' : 'justify-end'}`}>
                {d.scorers.slice(0, 8).map(sc => (
                  <span key={sc.number} className="font-black tabular-nums leading-none"
                    style={{ color: textColor, fontSize: '2.4vh' }}>
                    #{sc.number}{sc.goals > 1 ? `×${sc.goals}` : ''}
                  </span>
                ))}
                {d.scorers.length === 0 && (
                  <span className="font-bold leading-none" style={{ ...dim(0.3), fontSize: '2vh' }}>Sin goles</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {onSaveAndReset && (
        <button onClick={onSaveAndReset}
          className="mt-[3.5vh] rounded-[1.6vh] font-black shrink-0 transition-shadow"
          style={{
            background: accent, color: '#fff',
            padding: '1.6vh 5vh', fontSize: '2.2vh',
            boxShadow: `0 0 4vh ${accent}66`
          }}>
          GUARDAR RESULTADO Y REINICIAR
        </button>
      )}
    </div>
  )
}
