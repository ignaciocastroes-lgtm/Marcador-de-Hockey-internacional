"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ExpressRosterModal, type ExpressEntry } from '@/components/scoreboard/ExpressRosterModal'
import { serieLabel, findSerie } from '@/lib/series'
 '@/lib/club-roster'
import { SavedTeamsModal } from '@/components/scoreboard/SavedTeamsModal'
import { HomeScreen } from '@/components/scoreboard/HomeScreen'
import { bootClub } from '@/lib/club-boot'
import { seriesOf, CLUB_STORE_EVENT } from '@/lib/club-store'
import { RosterLabModal } from '@/components/scoreboard/RosterLabModal'
import { SeriesEditorModal } from '@/components/scoreboard/SeriesEditorModal'
import { Play, Settings, X, Users, Upload, Trash2, Save, Shield, User, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { GameState, Period, Team, MatchConfig, Player, RefereeData, SignatureData } from '@/hooks/use-game-state'
import { TacticalBoard } from '@/components/scoreboard/TacticalBoard'
import { generateExpressRoster, downloadRosterCSV } from '@/lib/roster-utils'

interface ResumeParams {
  period: Period
  clockTime: number
  homeScore: number
  awayScore: number
  homeFouls: number
  awayFouls: number
}

export interface SavedRoster {
  id: string
  club: string
  serie: string
  rama: 'MASCULINA' | 'FEMENINA' | 'MIXTA'
  players: Player[]
  createdAt: string
  updatedAt: string
}

interface PreMatchSetupProps {
  state: GameState
  savedTeams: Team[]
  configureMatch: (config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null) => void
  configureMatchWithResume?: (config: MatchConfig, homeTeam: Team | null, awayTeam: Team | null, resume: ResumeParams) => void
  setSignature: (role: keyof SignatureData, signatureData: string) => void
  saveTeam: (team: Team) => void
  deleteTeam: (teamId: string) => void
}

const ROSTERS_STORAGE_KEY = 'hockey-saved-rosters'

const parseRoster = (input: string): string[] =>
input.split(/[,\s]+/).map(n => n.trim()).filter(n => n && /^\d+$/.test(n))

export function PreMatchSetup(props: PreMatchSetupProps) {
  const { state, savedTeams, configureMatch, configureMatchWithResume, setSignature, saveTeam, deleteTeam } = props

  /**
   * La puerta: tres tarjetas. El detalle de jugadores y planteles queda detras
   * de una de ellas, no delante de todo.
   */
  const [puerta, setPuerta] = useState(true)

  /**
   * Las series de la liga, no la lista compilada.
   *
   * Cuatro pantallas leian `SERIES_ORDERED` —el arreglo escrito en
   * `lib/series.ts`— mientras el editor guardaba en el almacen. Una serie
   * creada por el operador se guardaba bien y no aparecia en ningun
   * desplegable: ni para elegirla en un partido, ni para cargarle camisetas.
   * Es el mismo patron de dos fuentes que ya mordio con los atajos de teclado
   * y con los editores de plantel.
   *
   * Se refresca con el evento del almacen, asi que una serie nueva aparece sin
   * recargar.
   */
  const [seriesLiga, setSeriesLiga] = useState(() => seriesOf(null))
  useEffect(() => {
    const refrescar = () => setSeriesLiga(seriesOf(bootClub()))
    refrescar()
    window.addEventListener(CLUB_STORE_EVENT, refrescar)
    window.addEventListener('storage', refrescar)
    return () => {
      window.removeEventListener(CLUB_STORE_EVENT, refrescar)
      window.removeEventListener('storage', refrescar)
    }
  }, [])
  const [showPlanteles, setShowPlanteles] = useState(false)
  const [showLigas, setShowLigas] = useState(false)
  /** La tarjeta ofrece las dos cosas que promete: equipos y series. */
  const [showEquipos, setShowEquipos] = useState(false)
  const [showSeries, setShowSeries] = useState(false)

  // ─── Configuración del partido ────────────────────────────────────────────
  const [configSeriesName, setConfigSeriesName]     = useState(state.matchConfig.seriesName)
  const [configGender, setConfigGender]             = useState(state.matchConfig.gender)
  const [configPeriods, setConfigPeriods]           = useState(state.matchConfig.periodsCount.toString())
  const [configDuration, setConfigDuration]         = useState(state.matchConfig.periodDuration.toString())
  const [configFecha, setConfigFecha] = useState('')
  const [configHora, setConfigHora] = useState('')
  const [configEstadio, setConfigEstadio] = useState('')
  /** Canchas ya usadas. Se escriben una vez y despues se eligen. */
  const [estadios, setEstadios] = useState<string[]>([])
  useEffect(() => {
    try { setEstadios(JSON.parse(localStorage.getItem('ardi-estadios') || '[]')) } catch { /* ignorar */ }
  }, [])
  const recordarEstadio = (nombre: string) => {
    const v = nombre.trim()
    if (!v) return
    setEstadios(prev => {
      const next = [v, ...prev.filter(e => e !== v)].slice(0, 20)
      try { localStorage.setItem('ardi-estadios', JSON.stringify(next)) } catch { /* ignorar */ }
      return next
    })
  }
  const [configCampeonato, setConfigCampeonato]     = useState(state.matchConfig.campeonato || 'Liga Regular')
  const [configPartidoNumero, setConfigPartidoNumero] = useState(state.matchConfig.partidoNumero || '1')
  const [selectedHomeTeam, setSelectedHomeTeam]     = useState<string>('')
  const [selectedAwayTeam, setSelectedAwayTeam]     = useState<string>('')
  const [configHomeRoster, setConfigHomeRoster]     = useState('')
  const [configAwayRoster, setConfigAwayRoster]     = useState('')

  const homeTeamNameStr = savedTeams.find(t => t.id === selectedHomeTeam)?.name || 'LOCAL'
  const awayTeamNameStr = savedTeams.find(t => t.id === selectedAwayTeam)?.name || 'VISITA'

  // ─── Equipos guardados ────────────────────────────────────────────────────
  const [newTeamName, setNewTeamName]   = useState('')
  const [newTeamLogo, setNewTeamLogo]   = useState<string | null>(null)
  const [editingTeam, setEditingTeam]   = useState<Team | null>(null)
  
  const [saveRosterClubName, setSaveRosterClubName]       = useState('')
  const [showSaveRosterDialog, setShowSaveRosterDialog]   = useState<'home' | 'away' | null>(null)

  // ─── Planilla de jugadores ────────────────────────────────────────────────
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [referees, setReferees]       = useState<RefereeData>({ principal: '', segundo: '', auxiliar: '', cronometrista: '', encargadoPista: '' })
  const [newPlayerNumber, setNewPlayerNumber]   = useState('')
  const [newPlayerRut, setNewPlayerRut]         = useState('')
  const [newPlayerName, setNewPlayerName]       = useState('')
  const [newPlayerPosition, setNewPlayerPosition] = useState<Player['position']>('')
  const [newPlayerRole, setNewPlayerRole]       = useState<string>('')
  const [editingPlayerTeam, setEditingPlayerTeam] = useState<'home' | 'away'>('home')

  // ─── Firmas ───────────────────────────────────────────────────────────────

  // ─── Rosters guardados ────────────────────────────────────────────────────
  const [savedRosters, setSavedRosters] = useState<SavedRoster[]>([])

  // ─── Modo Express Mejorado ───────────────────────────────────────────────
  const [showExpressDialog, setShowExpressDialog] = useState(false)
  const [expressHomeEntries, setExpressHomeEntries] = useState<ExpressEntry[]>([])
  const [expressAwayEntries, setExpressAwayEntries] = useState<ExpressEntry[]>([])
  const [expressRosterFor, setExpressRosterFor] = useState<'home' | 'away' | null>(null)
  const [teamsModalFor, setTeamsModalFor] = useState<'home' | 'away' | null>(null)
  const [expressHomeName, setExpressHomeName]     = useState('')
  const [expressHomeLogo, setExpressHomeLogo]     = useState<string | null>(null)
  const [expressAwayName, setExpressAwayName]     = useState('')
  const [expressAwayLogo, setExpressAwayLogo]     = useState<string | null>(null)
  
  const [expressDuration, setExpressDuration]     = useState('25')
  const [expressCustomDuration, setExpressCustomDuration] = useState('')
  
  // 🛡️ NUEVO: Selección de Categoría y Rama para Express
  const [expressSerieId, setExpressSerieId]       = useState('')
  const [expressSeries, setExpressSeries]         = useState('Amistoso')
  const [expressGender, setExpressGender]         = useState('MASCULINA')

  const [expressOvertime, setExpressOvertime]     = useState(false)
  const [expressPenalties, setExpressPenalties]   = useState(false)

  // ─── Flujo de partido ─────────────────────────────────────────────────────
  const [configAllowOvertime, setConfigAllowOvertime]   = useState(false)
  const [configAllowPenalties, setConfigAllowPenalties] = useState(false)
  const [configResumeMode, setConfigResumeMode]         = useState(false)
  const [resumePeriod, setResumePeriod]     = useState<Period>('1er_tiempo')
  const [resumeMinutes, setResumeMinutes]   = useState('')
  const [resumeSeconds, setResumeSeconds]   = useState('')
  const [resumeHomeScore, setResumeHomeScore] = useState('0')
  const [resumeAwayScore, setResumeAwayScore] = useState('0')
  const [resumeHomeFouls, setResumeHomeFouls] = useState('0')
  const [resumeAwayFouls, setResumeAwayFouls] = useState('0')

  useEffect(() => {
    const stored = localStorage.getItem(ROSTERS_STORAGE_KEY)
    if (stored) {
      try { setSavedRosters(JSON.parse(stored)) } catch { /* ignorar estado corrupto */ }
    }
  }, [])

  // ─── Guardar roster ───────────────────────────────────────────────────────
  const saveCurrentRoster = (team: 'home' | 'away', clubName: string) => {
    const players = team === 'home' ? homePlayers : awayPlayers
    if (players.length === 0) {
      toast.warning('No hay jugadores para guardar')
      return
    }
    const existing = savedRosters.find(r =>
      r.club.toLowerCase() === clubName.toLowerCase() &&
      r.serie === configSeriesName &&
      r.rama === (configGender as SavedRoster['rama'])
    )
    const newRoster: SavedRoster = {
      id: existing?.id || crypto.randomUUID(),
      club: clubName,
      serie: configSeriesName,
      rama: configGender as 'MASCULINA' | 'FEMENINA' | 'MIXTA',
      players,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const updated = existing
      ? savedRosters.map(r => r.id === existing.id ? newRoster : r)
      : [...savedRosters, newRoster]

    setSavedRosters(updated)
    localStorage.setItem(ROSTERS_STORAGE_KEY, JSON.stringify(updated))
    toast.success(`Roster guardado: ${clubName} - ${configSeriesName} (${configGender})`)
  }

  const loadSavedRoster = (team: 'home' | 'away', rosterId: string) => {
    const roster = savedRosters.find(r => r.id === rosterId)
    if (!roster) return
    if (team === 'home') setHomePlayers(roster.players)
    else setAwayPlayers(roster.players)
  }

  const handleExportRoster = (team: 'home' | 'away') => {
    const players = team === 'home' ? homePlayers : awayPlayers
    const teamName = team === 'home' ? homeTeamNameStr : awayTeamNameStr
    downloadRosterCSV(players, teamName, configSeriesName, configGender)
  }

  // `handleRosterImport` y `addPlayerToRoster` se eliminaron: los dos creaban
  // personas con `crypto.randomUUID()`, sin identidad estable. Quedarse con
  // las funciones sin usar invitaba a volver a cablearlas por error.

  const handleResumeStateImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text   = event.target?.result as string
        const lines  = text.split('\n').map(l => l.trim())
        const findValue = (key: string) => {
          const line = lines.find(l => l.startsWith(key))
          return line ? line.split(',')[1] : null
        }
        // Lee el bloque REANUDACION (LECTURA AUTOMATICA) que emite exportCSV
        const VALID_PERIODS: Period[] = ['1er_tiempo', '2do_tiempo', 'alargue', 'penales']
        const rawPeriodo   = (findValue('Periodo Reanudacion') || '1er_tiempo').trim()
        const resPeriodo   = (VALID_PERIODS.includes(rawPeriodo as Period) ? rawPeriodo : '1er_tiempo') as Period
        const resMinutos   = (findValue('Minuto Reanudacion') || '00:00').trim()
        const resHomeScore = findValue('Resultado Local')  || '0'
        const resAwayScore = findValue('Resultado Visita') || '0'
        const resHomeFouls = findValue('Faltas Local')  || '0'
        const resAwayFouls = findValue('Faltas Visita') || '0'
        const [rawMin, rawSec] = resMinutos.split(':')

        if (!findValue('Periodo Reanudacion')) {
          toast.error('El archivo no tiene el bloque de reanudacion. Exporta la planilla desde ARDI para reanudar.')
          return
        }

        setResumePeriod(resPeriodo)
        setResumeMinutes((parseInt(rawMin) || 0).toString())
        setResumeSeconds((parseInt(rawSec) || 0).toString())
        setResumeHomeScore(resHomeScore)
        setResumeAwayScore(resAwayScore)
        setResumeHomeFouls(resHomeFouls)
        setResumeAwayFouls(resAwayFouls)
        toast.success('Planilla de partido suspendido cargada con éxito en el sistema pre-partido.')
      } catch {
        toast.error('Error al parsear el archivo CSV de reanudación.')
      }
    }
    reader.readAsText(file)
  }

  // ─── Confirmación Express ─────────────────────────────────────────────────
  /**
   * Equipos de la serie elegida. Los guardados ANTES de la 3.24 no traen serie:
   * se muestran siempre, para no hacerlos desaparecer del selector de nadie.
   */
  const teamsForSerie = savedTeams.filter(t =>
    !t.serie || !expressSerieId || expressSerieId === 'amistoso' || t.serie === expressSerieId
  )

  /** Guarda el equipo CON su serie y sus camisetas: son de esa categoria. */
  const saveExpressTeam = (side: 'home' | 'away') => {
    const name = (side === 'home' ? expressHomeName : expressAwayName).trim().toUpperCase()
    if (!name) { toast.warning('Escribe el nombre del equipo primero.'); return }
    const entries = side === 'home' ? expressHomeEntries : expressAwayEntries
    const logo = side === 'home' ? expressHomeLogo : expressAwayLogo
    const serie = expressSerieId && expressSerieId !== 'amistoso' ? expressSerieId : undefined
    const previo = savedTeams.find(t => t.name === name && t.serie === serie)
    saveTeam({
      id: previo?.id || `team-${Date.now()}`,
      name, logo: logo || null, serie,
      roster: entries.length ? entries : undefined
    })
    toast.success(previo ? `${name} actualizado` : `${name} guardado`)
  }

  const handleExpressConfirm = () => {
    if (!expressHomeName.trim() || !expressAwayName.trim()) {
      toast.warning('Debes ingresar el nombre de ambos equipos.')
      return
    }
    const hName = expressHomeName.trim().toUpperCase()
    const aName = expressAwayName.trim().toUpperCase()

    // Si el operador cargó números reales, se usan; si no, plantel genérico como antes
    const expressHomePlayers = generateExpressRoster(expressHomeEntries)
    const expressAwayPlayers = generateExpressRoster(expressAwayEntries)
    
    const finalDuration = expressDuration === 'custom' 
      ? (parseInt(expressCustomDuration) || 25) 
      : parseInt(expressDuration);

    configureMatch(
      {
        ...state.matchConfig,
        seriesName: expressSeries, // 🛡️ AHORA TOMA LA SERIE DEL SELECTOR
        gender: expressGender,     // 🛡️ AHORA TOMA LA RAMA DEL SELECTOR
        isExpressMode: true,
        periodDuration: finalDuration,
        homePlayers: expressHomePlayers,
        awayPlayers: expressAwayPlayers,
        homeRoster: expressHomePlayers.map(p => p.number),
        awayRoster: expressAwayPlayers.map(p => p.number),
        allowOvertime: expressOvertime,
        allowPenalties: expressPenalties
      },
      { id: expressHomeLogo ? `express-home-saved` : 'express-home', name: hName, logo: expressHomeLogo },
      { id: expressAwayLogo ? `express-away-saved` : 'express-away', name: aName, logo: expressAwayLogo }
    )
    setShowExpressDialog(false)
  }

  const handleSaveNewTeam = () => {
    if (newTeamName.trim()) {
      saveTeam({ id: crypto.randomUUID(), name: newTeamName.trim().toUpperCase(), logo: newTeamLogo })
      setNewTeamName('')
      setNewTeamLogo(null)
    }
  }

  const removePlayer = (team: 'home' | 'away', playerId: string) => {
    if (team === 'home') setHomePlayers(prev => prev.filter(p => p.id !== playerId))
    else setAwayPlayers(prev => prev.filter(p => p.id !== playerId))
  }

  const handleStartMatch = () => {

    const homeRosterNumbers = [...parseRoster(configHomeRoster), ...homePlayers.map(p => p.number)]
      .filter((v, i, a) => a.indexOf(v) === i)
    const awayRosterNumbers = [...parseRoster(configAwayRoster), ...awayPlayers.map(p => p.number)]
      .filter((v, i, a) => a.indexOf(v) === i)

    recordarEstadio(configEstadio)

    const config: MatchConfig = {
      seriesName: configSeriesName, gender: configGender,
      periodsCount: parseInt(configPeriods) || 2,
      periodDuration: parseInt(configDuration) || 25,
      campeonato: configCampeonato, partidoNumero: configPartidoNumero,
      // Si no se escribieron, se toman del reloj del equipo: el partido se
      // esta jugando ahora. Nadie deberia teclear la fecha de hoy un sabado
      // por la manana. Lo escrito a mano manda, que es lo que hace falta al
      // reanudar un suspendido de otra fecha.
      fecha: configFecha || new Date().toISOString().slice(0, 10),
      hora: configHora || new Date().toTimeString().slice(0, 5),
      estadio: configEstadio,
      homeRoster: homeRosterNumbers, awayRoster: awayRosterNumbers,
      homePlayers, awayPlayers, referees,
      signatures: state.matchConfig.signatures,
      closingSignatures: state.matchConfig.closingSignatures,
      isExpressMode: state.matchConfig.isExpressMode,
      allowOvertime: configAllowOvertime, allowPenalties: configAllowPenalties,
    }

    const homeTeamObj = savedTeams.find(t => t.id === selectedHomeTeam) || null
    const awayTeamObj = savedTeams.find(t => t.id === selectedAwayTeam) || null

    if (configResumeMode) {
      const resumeParams: ResumeParams = {
        period: resumePeriod,
        clockTime: (parseInt(resumeMinutes) || 0) * 60 + (parseInt(resumeSeconds) || 0),
        homeScore: parseInt(resumeHomeScore) || 0,
        awayScore: parseInt(resumeAwayScore) || 0,
        homeFouls: parseInt(resumeHomeFouls) || 0,
        awayFouls: parseInt(resumeAwayFouls) || 0
      }
      configureMatchWithResume?.(config, homeTeamObj, awayTeamObj, resumeParams)
    } else {
      configureMatch(config, homeTeamObj, awayTeamObj)
    }
  }

  return (
    // Sin relleno cuando se muestra la puerta: HomeScreen trae el suyo y si no
    // el escudo queda flotando con doble margen.
    <div className={`h-full bg-zinc-950 overflow-y-auto ${puerta ? '' : 'p-4'}`}>
      {puerta && (
        <HomeScreen
          onExpress={() => setShowExpressDialog(true)}
          onEquipos={() => setShowEquipos(true)}
          onJugadores={() => setShowPlanteles(true)}
          onLigas={() => setShowLigas(true)}
        />
      )}

      <RosterLabModal open={showPlanteles} onClose={() => setShowPlanteles(false)} />
      <SeriesEditorModal open={showSeries} onClose={() => setShowSeries(false)} />

      {/* La tarjeta decia "Equipos y series" y solo abria equipos. Se pregunta
          cual de las dos, en vez de elegir por el operador. */}
      <Dialog open={showEquipos} onOpenChange={setShowEquipos}>
        <DialogContent className="bg-zinc-900 border-2 border-blue-800 text-white max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Equipos y series</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <button onClick={() => { setShowEquipos(false); setTeamsModalFor('home') }}
              className="w-full text-left rounded-xl border-2 border-zinc-800 hover:border-blue-600 p-3 transition-colors touch-manipulation active:scale-[0.98]">
              <span className="block font-black text-sm">Equipos</span>
              <span className="block text-[11px] text-zinc-500 leading-snug">
                Los clubes con los que juegas, con su escudo y sus planteles.
              </span>
            </button>
            <button onClick={() => { setShowEquipos(false); setShowSeries(true) }}
              className="w-full text-left rounded-xl border-2 border-zinc-800 hover:border-blue-600 p-3 transition-colors touch-manipulation active:scale-[0.98]">
              <span className="block font-black text-sm">Series</span>
              <span className="block text-[11px] text-zinc-500 leading-snug">
                Las categorías de tu liga: Sub-13, Infantil, Adulta…
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLigas} onOpenChange={setShowLigas}>
        <DialogContent className="bg-zinc-900 border-2 border-purple-800 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Ligas y campeonatos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Esta herramienta dirige los partidos de <b>un club</b>: planteles,
            marcador, proyección y acta.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Llevar la liga completa —fixture, tablas de todas las series, actas
            de todos los clubes— es un módulo aparte, y todavía no está
            construido. Cuando exista, los jugadores que cargues hoy se enlazan
            con la base de la liga: sus identificadores no cambian nunca.
          </p>
          <a href="https://www.ardisport.cl" target="_blank" rel="noopener noreferrer"
            className="block w-full h-11 rounded-md bg-purple-700 hover:bg-purple-600 font-black text-sm flex items-center justify-center">
            ardisport.cl
          </a>
        </DialogContent>
      </Dialog>

      <div className={`max-w-4xl mx-auto space-y-6 ${puerta ? 'hidden' : ''}`}>

        <Button onClick={() => setPuerta(true)} variant="outline"
          className="border-zinc-700 text-zinc-300 font-bold">
          ← Volver al inicio
        </Button>

        <div className="text-center py-6">
          <h1 className="text-3xl font-black text-yellow-400 mb-2">JUGADORES Y PLANTELES</h1>
          <p className="text-zinc-400">Datos del partido, equipos y planteles</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <h3 className="text-yellow-400 font-bold mb-4 flex items-center"><Settings className="w-5 h-5 mr-2" /> Datos del Partido</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-zinc-700">
            <div className="md:col-span-2">
              <Label className="text-zinc-400 text-xs">Campeonato / Liga</Label>
              <Input value={configCampeonato} onChange={e => setConfigCampeonato(e.target.value)} placeholder="Liga Regular" className="bg-zinc-800 border-zinc-600 mt-1" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Partido N</Label>
              <Input value={configPartidoNumero} onChange={e => setConfigPartidoNumero(e.target.value)} placeholder="1" className="bg-zinc-800 border-zinc-600 mt-1" />
            </div>
          </div>

          {/* Fecha, hora y sede. Vacias = las del equipo al iniciar. Se
              escriben solo cuando NO son las de ahora, que es el caso de un
              partido suspendido que se reanuda otro dia. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs">Fecha</Label>
              <Input type="date" value={configFecha} onChange={e => setConfigFecha(e.target.value)}
                className="bg-zinc-800 border-zinc-600 mt-1" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Hora</Label>
              <Input type="time" value={configHora} onChange={e => setConfigHora(e.target.value)}
                className="bg-zinc-800 border-zinc-600 mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-zinc-400 text-xs">Estadio / Cancha</Label>
              <Input value={configEstadio} onChange={e => setConfigEstadio(e.target.value)}
                list="ardi-estadios" placeholder="Gimnasio…"
                className="bg-zinc-800 border-zinc-600 mt-1" />
              {/* Las canchas de una liga son siempre las mismas: se recuerdan
                  al iniciar y despues se eligen, como los escudos. */}
              <datalist id="ardi-estadios">
                {estadios.map(e => <option key={e} value={e} />)}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-zinc-400 text-xs">Serie / Categoria</Label>
              <Select value={configSeriesName} onValueChange={setConfigSeriesName}>
                <SelectTrigger className="bg-zinc-800 border-zinc-600 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-600 max-h-60">
                  {/* Mismas series que el modo Express: una sola fuente */}
                  {seriesLiga.map(se => (
                    <SelectItem key={se.id} value={serieLabel(se).toUpperCase()}>{serieLabel(se)}</SelectItem>
                  ))}
                  <SelectItem value="AMISTOSO">Amistoso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Rama</Label>
              <Select value={configGender} onValueChange={setConfigGender}>
                <SelectTrigger className="bg-zinc-800 border-zinc-600 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-600">
                  <SelectItem value="MASCULINA">Masculina</SelectItem>
                  <SelectItem value="FEMENINA">Femenina</SelectItem>
                  <SelectItem value="MIXTA">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Periodos</Label>
              <Select value={configPeriods} onValueChange={setConfigPeriods}>
                <SelectTrigger className="bg-zinc-800 border-zinc-600 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-600">
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Min/Periodo</Label>
              <Input type="number" value={configDuration} onChange={e => setConfigDuration(e.target.value)} className="bg-zinc-800 border-zinc-600 mt-1" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700">
            <h4 className="text-zinc-400 text-sm font-bold mb-3">Pacto Inicial (en caso de empate)</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={configAllowOvertime} onChange={e => setConfigAllowOvertime(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                <span className="text-white text-sm">Habrá Alargue (Tiempo Extra)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={configAllowPenalties} onChange={e => setConfigAllowPenalties(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                <span className="text-white text-sm">Habrá Penales</span>
              </label>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={configResumeMode} onChange={e => setConfigResumeMode(e.target.checked)} className="w-4 h-4 accent-amber-500" />
              <span className="text-amber-400 text-sm font-bold">Reanudar Partido Suspendido</span>
            </label>
            {configResumeMode && (
              <div className="bg-amber-950/20 border border-amber-700/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-800 pb-2">
                  <p className="text-amber-300 text-xs font-bold">Importación Rápida por Planilla de Cierre (CSV):</p>
                  <input type="file" accept=".csv" className="hidden" id="resume-state-import" onChange={handleResumeStateImport} />
                  <Button size="sm" variant="outline" className="border-amber-600 text-amber-400 h-7 text-xs bg-transparent" onClick={() => document.getElementById('resume-state-import')?.click()}>
                    <Upload className="w-3 h-3 mr-1" /> Cargar Planilla Suspendida
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-zinc-400 text-xs">Periodo</Label>
                    <Select value={resumePeriod} onValueChange={v => setResumePeriod(v as Period)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-600 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-600">
                        <SelectItem value="1er_tiempo">1er Tiempo</SelectItem>
                        <SelectItem value="2do_tiempo">2do Tiempo</SelectItem>
                        <SelectItem value="alargue">Prorroga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-zinc-400 text-xs">Minutos</Label><Input type="number" value={resumeMinutes} onChange={e => setResumeMinutes(e.target.value)} placeholder="20" className="bg-zinc-800 border-zinc-600 mt-1" /></div>
                  <div><Label className="text-zinc-400 text-xs">Segundos</Label><Input type="number" value={resumeSeconds} onChange={e => setResumeSeconds(e.target.value)} placeholder="30" className="bg-zinc-800 border-zinc-600 mt-1" /></div>
                  <div><Label className="text-zinc-400 text-xs">Goles Local</Label><Input type="number" value={resumeHomeScore} onChange={e => setResumeHomeScore(e.target.value)} className="bg-zinc-800 border-zinc-600 mt-1" /></div>
                  <div><Label className="text-zinc-400 text-xs">Goles Visita</Label><Input type="number" value={resumeAwayScore} onChange={e => setResumeAwayScore(e.target.value)} className="bg-zinc-800 border-zinc-600 mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-zinc-400 text-xs">Faltas Acumuladas Local</Label><Input type="number" value={resumeHomeFouls} onChange={e => setResumeHomeFouls(e.target.value)} className="bg-zinc-800 border-zinc-600 mt-1" /></div>
                  <div><Label className="text-zinc-400 text-xs">Faltas Acumuladas Visita</Label><Input type="number" value={resumeAwayFouls} onChange={e => setResumeAwayFouls(e.target.value)} className="bg-zinc-800 border-zinc-600 mt-1" /></div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {(['home', 'away'] as const).map(side => {
            const isHome = side === 'home'
            const color  = isHome ? 'blue' : 'amber'
            return (
              <div key={side} className={`bg-${color}-950/30 border border-${color}-800 rounded-xl p-4`}>
                <h3 className={`text-${color}-400 font-bold mb-3 flex items-center`}><Shield className="w-5 h-5 mr-2" /> Equipo {isHome ? 'Local' : 'Visita'}</h3>
                <Select value={isHome ? selectedHomeTeam : selectedAwayTeam} onValueChange={isHome ? setSelectedHomeTeam : setSelectedAwayTeam}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-600">
                    {savedTeams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="mt-3">
                  <Label className="text-zinc-400 text-xs">Números rápidos (separados por coma)</Label>
                  <Input
                    value={isHome ? configHomeRoster : configAwayRoster}
                    onChange={e => isHome ? setConfigHomeRoster(e.target.value) : setConfigAwayRoster(e.target.value)}
                    placeholder="1, 5, 7, 10, 11"
                    className="bg-zinc-800 border-zinc-600 mt-1"
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <h3 className="text-yellow-400 font-bold mb-4 flex items-center"><Users className="w-5 h-5 mr-2" /> Planilla Oficial de Jugadores</h3>
          <Tabs defaultValue="home">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-800 mb-4">
              <TabsTrigger value="home" onClick={() => setEditingPlayerTeam('home')} className="data-[state=active]:bg-blue-600">Local</TabsTrigger>
              <TabsTrigger value="away" onClick={() => setEditingPlayerTeam('away')} className="data-[state=active]:bg-amber-600">Visita</TabsTrigger>
            </TabsList>

            {(['home', 'away'] as const).map(side => {
              const isHome = side === 'home'
              const players = isHome ? homePlayers : awayPlayers
              const color   = isHome ? 'blue' : 'amber'
              const inputId = `roster-import-${side}-setup`
              return (
                <TabsContent key={side} value={side}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {savedRosters.length > 0 && (
                        <Select onValueChange={id => loadSavedRoster(side, id)}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-600 flex-1 min-w-[150px]"><SelectValue placeholder="Cargar Equipo Guardado..." /></SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-600 max-h-60">
                            {savedRosters.map(r => <SelectItem key={r.id} value={r.id}>{r.club} - {r.serie} ({r.rama})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {/* El importador propio de esta pantalla se retiro.
                          Creaba a cada persona con un uuid nuevo
                          (`processRosterImport`), asi que sus goles y tarjetas
                          no se acumulaban de una fecha a otra. Habia DOS
                          puertas al mismo dato con resultados distintos y sin
                          manera de que el operador lo notara. La base de
                          jugadores se construye en Planteles, que si emite
                          identidad estable. */}
                      <Button onClick={() => handleExportRoster(side)} variant="outline" size="sm" className="border-zinc-600" disabled={players.length === 0}><Download className="w-4 h-4 mr-1" /> Exportar</Button>
                      <Button onClick={() => setShowSaveRosterDialog(side)} variant="outline" size="sm" className="border-green-700 text-green-400" disabled={players.length === 0}><Save className="w-4 h-4 mr-1" /> Guardar</Button>
                    </div>

                    {/* El alta manual con RUT vivia aqui. Se retiro por lo
                        mismo, y ademas porque escribia el documento de un
                        menor en una ficha que despues viaja en el CSV. */}
                    <button
                      onClick={() => setShowPlanteles(true)}
                      className="w-full flex items-center gap-2 bg-zinc-950 border border-dashed border-zinc-700 hover:border-amber-600 rounded-lg px-3 py-2.5 text-left transition-colors touch-manipulation">
                      <Plus className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] font-bold text-zinc-200">¿Falta alguien?</span>
                        <span className="block text-[10px] text-zinc-500 leading-snug">
                          Los jugadores se crean en Planteles, donde reciben su identidad.
                        </span>
                      </span>
                    </button>

                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {players.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-zinc-800 px-3 py-2 rounded">
                          <span className="font-bold text-yellow-400 w-8">#{p.number}</span>
                          <span className="text-zinc-400 font-mono text-xs w-24 truncate">{p.rut || 'Sin RUT'}</span>
                          <span className="flex-1 ml-3 truncate">{p.name || '-'}</span>
                          <span className="text-zinc-500 text-xs mr-2">{(p.role as string)?.replace('_', ' ')}</span>
                          <button onClick={() => removePlayer(side, p.id)} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <h3 className="text-yellow-400 font-bold mb-4 flex items-center"><User className="w-5 h-5 mr-2" /> Cuerpo Arbitral</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {([['principal','Árbitro Principal'],['segundo','Segundo Árbitro'],['auxiliar','Árbitro Auxiliar'],['cronometrista','Cronometrista'],['encargadoPista','Encargado Pista']] as const).map(([key, label]) => (
              <div key={key}>
                <Label className="text-zinc-400 text-xs">{label}</Label>
                <Input value={referees[key]} onChange={e => setReferees(r => ({ ...r, [key]: e.target.value }))} className="bg-zinc-800 border-zinc-600 mt-1" />
              </div>
            ))}
          </div>
        </div>

        {(homePlayers.length >= 2 || awayPlayers.length >= 2) && (
          <TacticalBoard homePlayers={homePlayers} awayPlayers={awayPlayers} homeTeamName={homeTeamNameStr} awayTeamName={awayTeamNameStr} />
        )}

        {/*
          LAS 3 FIRMAS DE APERTURA SE ELIMINARON.
          Bloqueaban el boton de iniciar con "COMPLETE LAS 3 FIRMAS PARA
          CONTINUAR" en un flujo donde nadie las usaba. Verificado antes de
          sacarlas: `delegadoLocal`, `delegadoVisita` y `arbitroAuxiliarMesa`
          no los leia nada mas que esta pantalla. El acta usa las OCHO firmas
          de cierre, que son otras y viven en la planilla; no pierde ningun
          campo.
        */}
        <div className="space-y-3">
          <Button onClick={handleStartMatch}
            className="w-full h-16 text-xl font-black bg-green-600 hover:bg-green-500">
            <Play className="w-6 h-6 mr-3" /> INICIAR PARTIDO
          </Button>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full border-zinc-700">
              <Settings className="w-4 h-4 mr-2" /> Gestionar Equipos Guardados
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Gestión de Equipos</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Nombre del equipo" className="bg-zinc-800 border-zinc-600" />
                <Button onClick={handleSaveNewTeam} className="bg-green-600 hover:bg-green-500"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {savedTeams.map(team => (
                  <div key={team.id} className="flex items-center justify-between bg-zinc-800 p-3 rounded">
                    <span className="font-bold">{team.name}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingTeam(team)}><Settings className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTeam(team.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!showSaveRosterDialog} onOpenChange={() => setShowSaveRosterDialog(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="text-green-400">Guardar Planilla</DialogTitle></DialogHeader>
          <div className="space-y-4 p-2">
            <div>
              <Label className="text-zinc-400 text-xs">Nombre del Club</Label>
              <Input
                value={saveRosterClubName}
                onChange={e => setSaveRosterClubName(e.target.value)}
                placeholder="Ej: Club Deportivo Las Águilas"
                className="bg-zinc-800 border-zinc-600 mt-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && saveRosterClubName.trim() && showSaveRosterDialog) {
                    saveCurrentRoster(showSaveRosterDialog, saveRosterClubName.trim())
                    setSaveRosterClubName('')
                    setShowSaveRosterDialog(null)
                  }
                }}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setSaveRosterClubName(''); setShowSaveRosterDialog(null) }} variant="outline" className="flex-1 border-zinc-600">Cancelar</Button>
              <Button
                onClick={() => {
                  if (!saveRosterClubName.trim()) { toast.warning('Ingresa el nombre del club'); return }
                  saveCurrentRoster(showSaveRosterDialog!, saveRosterClubName.trim())
                  setSaveRosterClubName('')
                  setShowSaveRosterDialog(null)
                }}
                className="flex-1 bg-green-600 hover:bg-green-500 font-bold"
                disabled={!saveRosterClubName.trim()}
              >
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Inicio Express ──────── */}
      <Dialog open={showExpressDialog} onOpenChange={setShowExpressDialog}>
        <DialogContent className="bg-zinc-900 border-2 border-amber-600 text-white max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="text-amber-400 font-black text-xl">INICIO EXPRESS — Partido Amistoso</DialogTitle></DialogHeader>
          <div className="space-y-4 p-2">
            
            {/* ── SERIE: define la rama y filtra los equipos guardados ────── */}
            <div className="pt-1">
              <Label className="text-zinc-400 text-xs font-bold">Serie</Label>
              <Select value={expressSerieId} onValueChange={id => {
                setExpressSerieId(id)
                if (id === 'amistoso') { setExpressSeries('Amistoso'); setExpressGender('MIXTA'); return }
                const se = findSerie(id)
                if (se) {
                  setExpressSeries(serieLabel(se).toUpperCase())
                  setExpressGender(se.gender === 'femenino' ? 'FEMENINA' : se.gender === 'masculino' ? 'MASCULINA' : 'MIXTA')
                }
              }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-600 mt-1 h-10 font-bold"><SelectValue placeholder="Elige la serie..." /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-600 max-h-72">
                  <SelectItem value="amistoso">Amistoso (sin serie)</SelectItem>
                  {seriesLiga.map(se => (
                    <SelectItem key={se.id} value={se.id}>{serieLabel(se)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500 leading-snug mt-1">
                La rama va dentro de la serie. Elegirla filtra los equipos guardados
                y carga las camisetas de esa categoria.
              </p>
            </div>

            <div>
              <Label className="text-zinc-400 text-xs">Equipo LOCAL</Label>
              <button onClick={() => setTeamsModalFor('home')}
                className="w-full mt-1 flex items-center gap-3 bg-zinc-800 border border-zinc-600 hover:border-blue-500 rounded-lg p-3 text-left transition-colors">
                <Users className="w-5 h-5 text-zinc-500 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold truncate">{expressHomeName || 'Elegir o crear equipo'}</span>
                  <span className="block text-[10px] text-zinc-500">
                    {expressHomeEntries.length ? `${expressHomeEntries.length} camisetas` : 'sin camisetas'}
                    {expressSerieId && expressSerieId !== 'amistoso' ? ` · ${serieLabel(findSerie(expressSerieId)!)}` : ''}
                  </span>
                </span>
              </button>
            </div>

            <div>
              <Label className="text-zinc-400 text-xs">Equipo VISITA</Label>
              <button onClick={() => setTeamsModalFor('away')}
                className="w-full mt-1 flex items-center gap-3 bg-zinc-800 border border-zinc-600 hover:border-blue-500 rounded-lg p-3 text-left transition-colors">
                <Users className="w-5 h-5 text-zinc-500 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-bold truncate">{expressAwayName || 'Elegir o crear equipo'}</span>
                  <span className="block text-[10px] text-zinc-500">
                    {expressAwayEntries.length ? `${expressAwayEntries.length} camisetas` : 'sin camisetas'}
                    {expressSerieId && expressSerieId !== 'amistoso' ? ` · ${serieLabel(findSerie(expressSerieId)!)}` : ''}
                  </span>
                </span>
              </button>
            </div>

            <div className="border-t border-zinc-700 pt-3">
              <Label className="text-zinc-400 text-xs font-bold">Duración por Periodo</Label>
              <div className="flex gap-2 mt-1">
                <Select value={expressDuration} onValueChange={setExpressDuration}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-600 flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-600">
                    {['15', '17', '18', '20', '23', '25'].map(m => (
                      <SelectItem key={m} value={m}>{m} Minutos</SelectItem>
                    ))}
                    <SelectItem value="custom">Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
                {expressDuration === 'custom' && (
                  <Input type="number" min="1" max="60" value={expressCustomDuration} onChange={e => setExpressCustomDuration(e.target.value)} placeholder="Min" className="w-20 bg-zinc-800 border-zinc-600 text-center" />
                )}
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-3 space-y-2">
              <h4 className="text-zinc-400 text-sm font-bold">Pacto Inicial (en caso de empate)</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={expressOvertime} onChange={e => setExpressOvertime(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                <span className="text-white text-sm">Habrá Alargue (Tiempo Extra)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={expressPenalties} onChange={e => setExpressPenalties(e.target.checked)} className="w-4 h-4 accent-amber-500" />
                <span className="text-white text-sm">Habrá Penales</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-700">
              {([
                { side: 'home' as const, label: 'Camisetas local', entries: expressHomeEntries, color: 'border-blue-700 text-blue-300' },
                { side: 'away' as const, label: 'Camisetas visita', entries: expressAwayEntries, color: 'border-amber-700 text-amber-300' }
              ]).map(b => (
                <button key={b.side} onClick={() => setExpressRosterFor(b.side)}
                  className={`h-16 rounded-lg border-2 bg-zinc-800/60 hover:bg-zinc-800 px-3 text-left transition-colors ${b.color}`}>
                  <span className="block text-[10px] font-black uppercase tracking-widest">{b.label}</span>
                  <span className="block text-sm font-bold text-white truncate">
                    {b.entries.length === 0
                      ? 'Tocar para cargar'
                      : `${b.entries.length} camisetas · ${b.entries.filter(e => e.isGoalie).length || 1} portero`}
                  </span>
                  {expressSerieId && expressSerieId !== 'amistoso' && (
                    <span className="block text-[9px] text-zinc-600 uppercase font-bold">
                      {serieLabel(findSerie(expressSerieId)!)}
                    </span>
                  )}
                </button>
              ))}
              <p className="col-span-2 text-[10px] text-zinc-500 leading-snug">
                Escribe el número y pulsa Enter; toca la ficha para marcarla como portero.
                Vacío = plantel genérico (1 y 10 porteros, 2 al 9 de pista).
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setShowExpressDialog(false)} variant="outline" className="flex-1 border-zinc-600">Cancelar</Button>
              <Button onClick={handleExpressConfirm} className="flex-1 h-12 font-black bg-amber-600 hover:bg-amber-500" disabled={!expressHomeName.trim() || !expressAwayName.trim() || (expressDuration === 'custom' && !expressCustomDuration)}>
                <Play className="w-5 h-5 mr-2" /> INICIAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SavedTeamsModal
        open={teamsModalFor !== null}
        onClose={() => setTeamsModalFor(null)}
        side={teamsModalFor || 'home'}
        savedTeams={savedTeams}
        saveTeam={saveTeam}
        deleteTeam={deleteTeam}
        serieId={expressSerieId}
        onPick={(name, entries) => {
          // El escudo no viene de aqui: se configura en el gestor de pantallas
          if (teamsModalFor === 'away') { setExpressAwayName(name); setExpressAwayEntries(entries) }
          else { setExpressHomeName(name); setExpressHomeEntries(entries) }
        }}
      />

      <ExpressRosterModal
        open={expressRosterFor !== null}
        onClose={() => setExpressRosterFor(null)}
        side={expressRosterFor || 'home'}
        teamName={expressRosterFor === 'away' ? expressAwayName : expressHomeName}
        value={expressRosterFor === 'away' ? expressAwayEntries : expressHomeEntries}
        onSave={entries => {
          if (expressRosterFor === 'away') setExpressAwayEntries(entries)
          else setExpressHomeEntries(entries)
        }}
      />
    </div>
  )
}