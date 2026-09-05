"use client"

import React, { useState, useEffect } from 'react'
import { Monitor, Gamepad2, Maximize, Minimize, ExternalLink, Tv, LayoutDashboard, Settings2, X, Shield, Box, Circle, Type, Users, Layers, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGameState } from '@/hooks/use-game-state'
import { OperatorView } from '@/components/operator-view'
import { CourtOperatorView } from '@/components/court-operator-view'
import { useVenueSetup } from '@/hooks/use-venue-setup'
import { OverlaysModal } from '@/components/scoreboard/OverlaysModal'
import { ScreensPanel } from '@/components/scoreboard/ScreensPanel'
import { HotkeysModal } from '@/components/scoreboard/HotkeysModal'
import { playHorn, playBeep, armAudio, loadAudioConfig } from '@/lib/audio-engine'
import {
  loadHotkeys, actionForKey, normalizeKey, KEYS_NEEDING_PREVENT,
  DEFAULT_HOTKEYS, VIEW_ACTIONS, ALWAYS_ON, dialogIsOpen, emitHotkey,
  OPEN_HOTKEYS_EVENT, type HotkeyMap
} from '@/lib/hotkeys'
import { CLUB_BRAND, defaultHomeLogo } from '@/lib/club-brand'
import { ScoreboardView } from '@/components/scoreboard-view'
import { toast } from 'sonner'

type ViewMode = 'operator' | 'pista' | 'videowall'

// 🛡️ ESCUDOS GENÉRICOS DE PREVIEW
const GENERIC_SHIELDS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E"
]

// 🛡️ COMPONENTE MAESTRO DE PREVIEW
const PreviewTeamLogo = React.memo(({ team, url, shape, is3D, isAnim, size = 100 }: any) => {
  const fallbackUrl = team === 'home' ? GENERIC_SHIELDS[0] : GENERIC_SHIELDS[1];
  const finalUrl = url || fallbackUrl;

  const isFree = shape === 'none';
  let clipStyle: React.CSSProperties = { width: '100%', height: '100%' };
  let OverlayComponent = null;
  let baseClasses = `relative w-full h-full flex justify-center items-center overflow-hidden ${!isFree ? 'bg-zinc-900/80' : ''}`;

  if (isFree) {
    // Sin máscara ni overlay
  } else if (shape === 'circle') {
    baseClasses += " rounded-full";
    OverlayComponent = (
      <div className="absolute inset-0 rounded-full border-[4px] border-zinc-300/80 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none z-20">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/60 via-transparent to-white/30 mix-blend-overlay" />
      </div>
    );
  } else if (shape === 'square') {
    baseClasses += " rounded-[25%]";
    OverlayComponent = (
      <div className="absolute inset-0 rounded-[25%] border-[4px] border-zinc-300/80 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none z-20">
        <div className="absolute inset-0 rounded-[25%] bg-gradient-to-tr from-black/60 via-transparent to-white/30 mix-blend-overlay" />
      </div>
    );
  } else {
    let shapePath = "";
    if (shape === 'shield')  shapePath = "M 50 2 L 98 13 L 98 65 L 50 98 L 2 65 L 2 13 Z";
    else if (shape === 'iberico') shapePath = "M 10 5 L 90 5 L 90 55 A 40 40 0 0 1 10 55 Z";
    else if (shape === 'gotico')  shapePath = "M 10 5 L 90 5 A 80 80 0 0 1 50 98 A 80 80 0 0 1 10 5 Z";
    else if (shape === 'tudor')   shapePath = "M 10 20 L 50 5 L 90 20 L 90 55 C 90 85, 65 95, 50 98 C 35 95, 10 85, 10 55 Z";
    else shapePath = "M 50 2 L 98 13 L 98 65 L 50 98 L 2 65 L 2 13 Z";

    const encodedMask = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='" + encodeURIComponent(shapePath) + "' fill='black'/%3E%3C/svg%3E";
    
    clipStyle = {
      WebkitMaskImage: `url("${encodedMask}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskPosition: 'center',
      WebkitMaskRepeat: 'no-repeat',
      maskImage: `url("${encodedMask}")`,
      maskSize: 'contain',
      maskPosition: 'center',
      maskRepeat: 'no-repeat'
    };

    OverlayComponent = (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 drop-shadow-md" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <path d={shapePath} fill="none" stroke="rgba(212, 212, 216, 0.9)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <path d={shapePath} fill="none" stroke="rgba(0, 0, 0, 0.8)" strokeWidth="6" vectorEffect="non-scaling-stroke" className="mix-blend-overlay" />
        <path d={shapePath} fill="url(#preview-shield-shine)" />
        <defs>
          <linearGradient id="preview-shield-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="30%" stopColor="white" stopOpacity="0" />
            <stop offset="70%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  let wrapperClasses = "shrink-0 z-10 flex justify-center transition-all duration-500 ";
  let effectStyle: React.CSSProperties = { transition: 'transform 0.4s ease-out' };
  
  if (is3D) {
     effectStyle.transform = "rotateY(-15deg) rotateX(10deg)";
     wrapperClasses += " drop-shadow-[-8px_8px_10px_rgba(0,0,0,0.8)] "; 
     if (isAnim) wrapperClasses += " animate-sway-3d";
  } else {
     wrapperClasses += " drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)] ";
     if (isAnim) wrapperClasses += " animate-sway-2d";
  }

  return (
    <div className={wrapperClasses} style={{ perspective: '800px', width: `${size}px`, height: `${size}px` }}>
       <div className={baseClasses} style={{ ...clipStyle, ...effectStyle }}>
          {OverlayComponent}
          <img src={finalUrl} alt={`Logo Preview`} className={`absolute inset-0 w-full h-full z-10 ${!isFree ? 'object-cover scale-[1.05]' : 'object-contain'}`} />
       </div>
    </div>
  );
});
PreviewTeamLogo.displayName = 'PreviewTeamLogo';


export default function HockeyControlPanel() {
  const venue = useVenueSetup()

  // Despliegue de club: precarga su escudo como local la primera vez
  useEffect(() => {
    const logo = defaultHomeLogo()
    if (!logo) return
    try {
      const raw = localStorage.getItem('ardi-live-logos')
      const base = raw ? JSON.parse(raw) : {}
      if (!base.homeUrl) {
        localStorage.setItem('ardi-live-logos', JSON.stringify({ ...base, homeUrl: logo }))
        window.dispatchEvent(new Event('ardi-screens-updated'))
      }
    } catch { /* ignorar */ }
  }, [])
  const [showOverlays, setShowOverlays] = useState(false)
  const [showHotkeys, setShowHotkeys] = useState(false)
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(DEFAULT_HOTKEYS)

  useEffect(() => {
    armAudio()
    setHotkeys(loadHotkeys())
    const open = () => setShowHotkeys(true)
    window.addEventListener(OPEN_HOTKEYS_EVENT, open)
    return () => window.removeEventListener(OPEN_HOTKEYS_EVENT, open)
  }, [])

  const [viewMode, setViewMode] = useState<ViewMode>('pista')

  useEffect(() => {
    const saved = localStorage.getItem('ardi-view-mode') as ViewMode | null
    if (saved === 'operator' || saved === 'pista' || saved === 'videowall') setViewMode(saved)
  }, [])

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('ardi-view-mode', mode)
  }
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [visibleScreens, setVisibleScreens] = useState<string[]>(['1', '2', '3', '4', '5'])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const gameState = useGameState() as any; 

  /**
   * Teclado ÚNICO de la estación de trabajo. Antes vivía duplicado dentro de
   * cada vista —seis atajos en el clásico, catorce en la Pista— así que cambiar
   * de modo cambiaba el teclado bajo las manos del operador.
   */
  useEffect(() => {
    const g = gameState as unknown as Record<string, (n?: number) => void>
    const st = gameState.state
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.repeat) return
      const pressed = normalizeKey(e)
      const action = actionForKey(hotkeys, pressed)
      if (!action) return

      if (dialogIsOpen() && !ALWAYS_ON.includes(action)) return
      if (KEYS_NEEDING_PREVENT.includes(pressed)) e.preventDefault()

      // Las que resuelve la vista activa
      if (VIEW_ACTIONS.includes(action)) { emitHotkey(action); return }

      const stopped = st.isIntermission || !!st.activeTimeout
      const ended = st.isMatchEnded
      const cfg = loadAudioConfig()

      switch (action) {
        case 'clockSound':      if (!ended) { playHorn(500, cfg); g.toggleMainClock() } break
        case 'clockMute':       if (!ended) g.toggleMainClock(); break
        case 'buzzer':          playHorn(1200, cfg); break
        case 'possLeftToggle':  if (!ended) g.togglePossessionLeft(); break
        case 'possLeftReset':   if (!ended) g.resetPossessionLeft(); break
        case 'possRightToggle': if (!ended) g.togglePossessionRight(); break
        case 'possRightReset':  if (!ended) g.resetPossessionRight(); break
        case 'homeGoal':        if (!stopped && !ended) g.adjustHomeScore(1); break
        case 'awayGoal':        if (!stopped && !ended) g.adjustAwayScore(1); break
        case 'homeFoul':        if (!stopped && !ended) g.adjustHomeFouls(1); break
        case 'awayFoul':        if (!stopped && !ended) g.adjustAwayFouls(1); break
        case 'nextPeriod':      if (!ended) g.nextPeriod(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hotkeys, gameState])

  /**
   * "Espacio funciona como Enter" — el bug no estaba en el atajo, estaba en
   * el foco. Un botón clickeado con el mouse se queda enfocado, y
   * Espacio/Enter activan el elemento enfocado: la siguiente vez que el
   * operador apretaba Espacio para el reloj, el navegador ADEMÁS volvía a
   * pulsar ese botón. Dos acciones por una tecla, sin ninguna manera de
   * deducirlo mirando el atajo en sí.
   *
   * El preventDefault de arriba no alcanza: sólo actúa cuando la tecla
   * coincide con un atajo de `KEYS_NEEDING_PREVENT`, así que cualquier atajo
   * nuevo hereda el mismo bug a menos que alguien se acuerde de sumarlo ahí.
   *
   * La solución de raíz: quitarle el foco al botón apenas se suelta el clic,
   * en vez de parchear tecla por tecla. `event.detail === 0` es como el
   * navegador distingue un clic sintético por teclado (Enter/Espacio también
   * disparan un evento "click") de uno real de mouse o touch — así que esto
   * nunca interfiere con navegar la interfaz a propósito con Tab + Enter.
   */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.detail === 0) return
      const el = document.activeElement
      if (el instanceof HTMLElement && el.matches('button, [role="button"], a[href], input[type="submit"], input[type="button"]')) {
        el.blur()
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const [liveLogos, setLiveLogos] = useState({ 
    homeUrl: '', 
    awayUrl: '', 
    shape: 'shield', 
    effect3D: false,
    effectAnimated: false,
    displayMode: 'logoAndName',
    ledFont: 'impact', 
    fontWeight: '900', 
    letterSpacing: 'normal',
    homeJ1: '#ef4444', 
    homeJ2: '#2563eb', 
    awayJ1: '#ffffff', 
    awayJ2: '#000000',
    jerseyDesign: 'solid',
    goalDuration: '5', // 🛡️ NUEVO: DURACIÓN DE ANIMACIÓN GOL
    boardBgColor: '#050505',
    boardTextColor: '#ffffff',
    boardAccentColor: '#dc2626',
    possessionColor: '#22c55e',
    penaltiesColor: '#eab308'
  })

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const loadSettings = () => {
      const storedScreens = localStorage.getItem('ardi-visible-screens')
      if (storedScreens) setVisibleScreens(JSON.parse(storedScreens))
      const storedLogos = localStorage.getItem('ardi-live-logos')
      if (storedLogos) { try { const parsed = JSON.parse(storedLogos); setLiveLogos(prev => ({ ...prev, ...parsed })) } catch(e) {} }
    }
    loadSettings()
    window.addEventListener('storage', loadSettings)
    window.addEventListener('ardi-screens-updated', loadSettings)
    return () => { window.removeEventListener('storage', loadSettings); window.removeEventListener('ardi-screens-updated', loadSettings) }
  }, [])

  const toggleScreenVisibility = (id: string) => {
    if (id === '1') return; 
    const updated = visibleScreens.includes(id) ? visibleScreens.filter(x => x !== id) : [...visibleScreens, id];
    setVisibleScreens(updated);
    localStorage.setItem('ardi-visible-screens', JSON.stringify(updated));
    window.dispatchEvent(new Event('ardi-screens-updated'));
  }

  const updateLiveLogos = (updates: Partial<typeof liveLogos>) => {
    const nextLogos = { ...liveLogos, ...updates };
    setLiveLogos(nextLogos);
    localStorage.setItem('ardi-live-logos', JSON.stringify(nextLogos));
    window.dispatchEvent(new Event('ardi-screens-updated'));
  }

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    else await document.exitFullscreen()
  }

  const openScoreboardWindow = (boardId: number) => venue.openBoard(boardId)

  const handleSaveAndReset = () => { gameState.saveMatchToHistory(); gameState.resetForNewMatch() }

  /**
   * Al confirmar el partido (Express o completo) la estación salta sola a
   * PISTA, que es donde se juega. Antes, si el operador armaba el partido
   * parado en CONTROL, tenía que acordarse de tocar PISTA a mano; ahora el
   * mismo gesto de "Iniciar" lo deja donde tiene que estar.
   */
  const configureMatch = (...args: Parameters<typeof gameState.configureMatch>) => {
    gameState.configureMatch(...args)
    changeViewMode('pista')
  }
  const configureMatchWithResume = (...args: Parameters<typeof gameState.configureMatchWithResume>) => {
    gameState.configureMatchWithResume(...args)
    changeViewMode('pista')
  }

  const operatorProps = {
    ...gameState, configureMatch, configureMatchWithResume,
    setSignature: gameState.setSignature, setMatchPhase: gameState.setMatchPhase, onSaveAndReset: handleSaveAndReset
  }

  return (
    <div className="h-screen w-screen bg-black flex flex-col font-sans overflow-hidden">
      <OverlaysModal open={showOverlays} onClose={() => setShowOverlays(false)} />
      <HotkeysModal open={showHotkeys} onClose={() => setShowHotkeys(false)} onChange={setHotkeys} />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sway3d { 0% { transform: perspective(1000px) rotateY(-15deg) rotateX(10deg) scale(1) translateZ(0); } 33% { transform: perspective(1000px) rotateY(-5deg) rotateX(15deg) scale(1.04) translateZ(0); } 66% { transform: perspective(1000px) rotateY(-20deg) rotateX(5deg) scale(1.02) translateZ(0); } 100% { transform: perspective(1000px) rotateY(-15deg) rotateX(10deg) scale(1) translateZ(0); } }
        @keyframes sway2d { 0% { transform: scale(1) rotate(0deg) translateZ(0); } 33% { transform: scale(1.03) rotate(3deg) translateZ(0); } 66% { transform: scale(1.01) rotate(-2deg) translateZ(0); } 100% { transform: scale(1) rotate(0deg) translateZ(0); } }
        .animate-sway-3d { animation: sway3d 8s cubic-bezier(0.45, 0, 0.55, 1) infinite; will-change: transform; }
        .animate-sway-2d { animation: sway2d 7s cubic-bezier(0.45, 0, 0.55, 1) infinite; will-change: transform; }
      `}} />

      <nav className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between z-50 shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          {/* El escudo del club es el avatar: una sola marca, no dos */}
          {CLUB_BRAND.logoUrl ? (
            <img src={CLUB_BRAND.logoUrl} alt={CLUB_BRAND.name}
              className="w-9 h-9 object-contain rounded-full shrink-0 bg-black/40 border border-amber-400/40 shadow-lg" />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-lg border border-amber-400/50">
              <span className="text-amber-400 font-black text-sm">A</span>
            </div>
          )}
          <span className="text-amber-400 font-black hidden sm:inline tracking-wider">
            {CLUB_BRAND.appTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <Button variant="ghost" size="sm" onClick={() => { changeViewMode('operator'); setIsSidebarOpen(false); }} className={`px-3 sm:px-4 py-1 rounded font-bold transition-all ${viewMode === 'operator' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-zinc-400 hover:text-white'}`}><Gamepad2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">CONTROL</span></Button>
            <Button variant="ghost" size="sm" onClick={() => { changeViewMode('pista'); setIsSidebarOpen(false); }} className={`px-3 sm:px-4 py-1 rounded font-bold transition-all ${viewMode === 'pista' ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30' : 'text-zinc-400 hover:text-white'}`}><Users className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">PISTA</span></Button>
            <Button variant="ghost" size="sm" onClick={() => { changeViewMode('videowall'); setIsSidebarOpen(false); }} className={`px-3 sm:px-4 py-1 rounded font-bold transition-all ${viewMode === 'videowall' ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-zinc-400 hover:text-white'}`}><Monitor className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">PANTALLAS</span></Button>
          </div>

          <div className="hidden xl:flex items-center bg-zinc-800/80 border border-zinc-700 rounded-lg p-1 gap-1 mx-2">
            <span className="text-zinc-400 text-xs font-bold px-2 flex items-center"><Tv className="w-4 h-4 mr-1 text-amber-500" /> PROYECTAR:</span>
            {/* P1 (el marcador global) siempre está — es el tablero principal
                del partido. P2-P5 son monitores adicionales configurables, y
                este atajo ahora respeta exactamente los mismos que ya elegiste
                en GESTOR PANTALLAS: si sólo tienes P1, sólo ves P1 aquí. */}
            <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(1)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P1 (Glb)</Button>
            {visibleScreens.includes('2') && (
              <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(2)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P2 (Loc)</Button>
            )}
            {visibleScreens.includes('3') && (
              <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(3)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P3 (Vis)</Button>
            )}
            {visibleScreens.includes('4') && (
              <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(4)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P4 (T.L)</Button>
            )}
            {visibleScreens.includes('5') && (
              <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(5)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P5 (T.V)</Button>
            )}
            <Button size="sm" onClick={() => setShowHotkeys(true)}
              className="h-8 font-black text-xs px-2 bg-zinc-800 hover:bg-zinc-700 ml-1" title="Teclas rápidas y mando Bluetooth">
              <Keyboard className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => venue.launchAllBoards([1, 2, 3, 4, 5].filter(n => n === 1 || visibleScreens.includes(String(n))))} className="h-8 font-black text-xs px-2 bg-amber-600 hover:bg-amber-500 text-black ml-1" title="Reparte los tableros configurados por los monitores conectados">LANZAR TODO</Button>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 mr-2" title={venue.isOnline ? 'Con conexión' : 'Sin conexión — la app sigue funcionando'}>
            <span className={`w-2 h-2 rounded-full ${venue.offlineReady ? 'bg-green-500' : 'bg-zinc-600'}`} />
            <span className="text-[10px] font-bold text-zinc-500 uppercase">
              {venue.offlineReady ? (venue.isOnline ? 'Offline listo' : 'Sin red · OK') : 'Cacheando'}
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`h-9 w-9 p-0 flex items-center justify-center transition-colors border-zinc-600 ${isSidebarOpen ? 'bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'}`}><Settings2 className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-zinc-400 hover:text-white h-9 w-9 p-0 flex items-center justify-center ml-1">{isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}</Button>
        </div>
      </nav>

      <main className="flex-1 w-full bg-black relative flex overflow-hidden">
        {viewMode === 'operator' && (<div className="absolute inset-0 overflow-y-auto"><OperatorView {...operatorProps} /></div>)}
        {viewMode === 'pista' && (<div className="absolute inset-0 overflow-y-auto"><CourtOperatorView {...operatorProps} /></div>)}

        {viewMode === 'videowall' && (
          <div className={`flex-1 flex flex-col overflow-y-auto lg:overflow-hidden bg-zinc-950 p-2 md:p-4 gap-4 pb-4 transition-all duration-300 ${isSidebarOpen ? 'lg:mr-[500px]' : ''}`}>
            <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl shrink-0 lg:flex-[1.2] min-h-[300px] lg:min-h-0 relative">
              <div className="flex justify-between items-center px-2 mb-2 shrink-0">
                <h3 className="text-white font-bold text-sm md:text-base flex items-center tracking-wider"><Monitor className="w-5 h-5 mr-2 text-yellow-500" /> P1: MARCADOR GLOBAL</h3>
                <Button size="sm" onClick={() => openScoreboardWindow(1)} className="h-7 md:h-8 font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white">Lanzar <ExternalLink className="w-3 h-3 ml-2" /></Button>
              </div>
              <div className="w-full flex-1 relative rounded-lg overflow-hidden border border-black/50 bg-black"><ScoreboardView state={gameState.state} onSaveAndReset={handleSaveAndReset} boardId={1} isPreview={true} /></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 lg:flex-1 min-h-[600px] lg:min-h-0 pb-4 lg:pb-0 overflow-y-auto pr-2">
              {visibleScreens.includes('2') && (<div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl min-h-[300px] relative"><div className="flex justify-between items-center px-2 mb-2 shrink-0"><h3 className="text-white font-bold text-sm md:text-base flex items-center tracking-wider"><Monitor className="w-5 h-5 mr-2 text-blue-500" /> P2: 45S / FALTAS LOCAL</h3><Button size="sm" onClick={() => openScoreboardWindow(2)} className="h-7 md:h-8 font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white">Lanzar <ExternalLink className="w-3 h-3 ml-2" /></Button></div><div className="w-full h-full relative rounded-lg overflow-hidden border border-black/50 bg-black"><ScoreboardView state={gameState.state} onSaveAndReset={handleSaveAndReset} boardId={2} isPreview={true} /></div></div>)}
              {visibleScreens.includes('3') && (<div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl min-h-[300px] relative"><div className="flex justify-between items-center px-2 mb-2 shrink-0"><h3 className="text-white font-bold text-sm md:text-base flex items-center tracking-wider"><Monitor className="w-5 h-5 mr-2 text-amber-500" /> P3: 45S / FALTAS VISITA</h3><Button size="sm" onClick={() => openScoreboardWindow(3)} className="h-7 md:h-8 font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white">Lanzar <ExternalLink className="w-3 h-3 ml-2" /></Button></div><div className="w-full h-full relative rounded-lg overflow-hidden border border-black/50 bg-black"><ScoreboardView state={gameState.state} onSaveAndReset={handleSaveAndReset} boardId={3} isPreview={true} /></div></div>)}
              {visibleScreens.includes('4') && (<div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl min-h-[300px] relative"><div className="flex justify-between items-center px-2 mb-2 shrink-0"><h3 className="text-white font-bold text-sm md:text-base flex items-center tracking-wider"><Monitor className="w-5 h-5 mr-2 text-indigo-500" /> P4: TARJETAS LOCAL</h3><Button size="sm" onClick={() => openScoreboardWindow(4)} className="h-7 md:h-8 font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white">Lanzar <ExternalLink className="w-3 h-3 ml-2" /></Button></div><div className="w-full h-full relative rounded-lg overflow-hidden border border-black/50 bg-black"><ScoreboardView state={gameState.state} onSaveAndReset={handleSaveAndReset} boardId={4} isPreview={true} /></div></div>)}
              {visibleScreens.includes('5') && (<div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-2 shadow-2xl min-h-[300px] relative"><div className="flex justify-between items-center px-2 mb-2 shrink-0"><h3 className="text-white font-bold text-sm md:text-base flex items-center tracking-wider"><Monitor className="w-5 h-5 mr-2 text-pink-500" /> P5: TARJETAS VISITA</h3><Button size="sm" onClick={() => openScoreboardWindow(5)} className="h-7 md:h-8 font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white">Lanzar <ExternalLink className="w-3 h-3 ml-2" /></Button></div><div className="w-full h-full relative rounded-lg overflow-hidden border border-black/50 bg-black"><ScoreboardView state={gameState.state} onSaveAndReset={handleSaveAndReset} boardId={5} isPreview={true} /></div></div>)}
            </div>
          </div>
        )}

        {isSidebarOpen && (<div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[150] lg:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />)}

        {/* 🛡️ PANEL EXPANDIDO PARA MEJOR LECTURA EN PC */}
        <div className={`absolute top-0 right-0 h-full w-[90%] sm:w-[400px] md:w-[480px] lg:w-[500px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out z-[200] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-zinc-800 bg-zinc-900">
            <h2 className="text-yellow-500 font-black text-xl flex items-center gap-2"><Settings2 className="w-6 h-6" /> GESTOR PANTALLAS</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-2 rounded-md transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">

            <ScreensPanel
              liveLogos={liveLogos as unknown as Record<string, string>}
              updateLiveLogos={u => updateLiveLogos(u as Partial<typeof liveLogos>)}
              visibleScreens={visibleScreens}
              toggleScreenVisibility={toggleScreenVisibility}
              openScoreboardWindow={openScoreboardWindow}
              onOpenOverlays={() => setShowOverlays(true)}
            />

          </div>
        </div>
      </main>

      <footer className="bg-zinc-900 border-t border-zinc-800 px-4 py-1.5 shrink-0 z-50 relative">
        <p className="text-center text-xs text-amber-500/70 font-medium tracking-wide">Ardi Marcador Hockey Patin PRO</p>
      </footer>
    </div>
  )
}