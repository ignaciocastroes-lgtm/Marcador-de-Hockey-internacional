"use client"

import React, { useState, useEffect } from 'react'
import { Monitor, Gamepad2, Maximize, Minimize, ExternalLink, Tv, LayoutDashboard, Settings2, X, Shield, Box, Circle, Type, Users, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGameState } from '@/hooks/use-game-state'
import { OperatorView } from '@/components/operator-view'
import { CourtOperatorView } from '@/components/court-operator-view'
import { useVenueSetup } from '@/hooks/use-venue-setup'
import { OverlaysModal } from '@/components/scoreboard/OverlaysModal'
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

  const operatorProps = { ...gameState, setSignature: gameState.setSignature, setMatchPhase: gameState.setMatchPhase, onSaveAndReset: handleSaveAndReset }

  return (
    <div className="h-screen w-screen bg-black flex flex-col font-sans overflow-hidden">
      <OverlaysModal open={showOverlays} onClose={() => setShowOverlays(false)} />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sway3d { 0% { transform: perspective(1000px) rotateY(-15deg) rotateX(10deg) scale(1) translateZ(0); } 33% { transform: perspective(1000px) rotateY(-5deg) rotateX(15deg) scale(1.04) translateZ(0); } 66% { transform: perspective(1000px) rotateY(-20deg) rotateX(5deg) scale(1.02) translateZ(0); } 100% { transform: perspective(1000px) rotateY(-15deg) rotateX(10deg) scale(1) translateZ(0); } }
        @keyframes sway2d { 0% { transform: scale(1) rotate(0deg) translateZ(0); } 33% { transform: scale(1.03) rotate(3deg) translateZ(0); } 66% { transform: scale(1.01) rotate(-2deg) translateZ(0); } 100% { transform: scale(1) rotate(0deg) translateZ(0); } }
        .animate-sway-3d { animation: sway3d 8s cubic-bezier(0.45, 0, 0.55, 1) infinite; will-change: transform; }
        .animate-sway-2d { animation: sway2d 7s cubic-bezier(0.45, 0, 0.55, 1) infinite; will-change: transform; }
      `}} />

      <nav className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between z-50 shrink-0 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border border-amber-400/50">
            <span className="text-amber-400 font-black text-sm">A</span>
          </div>
          <span className="text-amber-400 font-black hidden sm:inline tracking-wider">
            {CLUB_BRAND.logoUrl && (
              <img src={CLUB_BRAND.logoUrl} alt={CLUB_BRAND.name} className="h-7 w-7 object-contain rounded-full shrink-0" />
            )}
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
            <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(1)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P1 (Glb)</Button>
            <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(2)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P2 (Loc)</Button>
            <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(3)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P3 (Vis)</Button>
            <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(4)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P4 (T.L)</Button>
            <Button variant="ghost" size="sm" onClick={() => openScoreboardWindow(5)} className="hover:bg-zinc-700 text-zinc-300 h-8 font-bold text-xs px-2">P5 (T.V)</Button>
            <Button size="sm" onClick={() => venue.launchAllBoards([1, 2, 3, 4, 5])} className="h-8 font-black text-xs px-2 bg-amber-600 hover:bg-amber-500 text-black ml-1" title="Reparte los tableros por los monitores conectados">LANZAR TODO</Button>
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

            <button onClick={() => setShowOverlays(true)}
              className="w-full flex items-center gap-3 bg-gradient-to-r from-yellow-950/40 to-zinc-900 border border-yellow-800/60 hover:border-yellow-600 rounded-2xl p-4 text-left transition-colors">
              <Layers className="w-6 h-6 text-yellow-400 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-yellow-400 font-black text-base">Lanzadores de proyección</span>
                <span className="block text-zinc-500 text-xs leading-snug">Animación de gol, fin de partido y estadísticas</span>
              </span>
            </button>

            
            {/* SECCIÓN 1: DISEÑO Y ESCUDOS */}
            <div className="space-y-4 border border-yellow-900/50 bg-yellow-950/10 p-4 md:p-5 rounded-2xl shadow-inner">
              <h3 className="text-yellow-400 font-bold text-base flex items-center gap-2 mb-3"><Shield className="w-5 h-5" /> Escudos y Tipografías</h3>
              
              <div className="flex justify-around items-center py-6 bg-zinc-900/80 rounded-xl border border-zinc-800 mb-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                 <PreviewTeamLogo team="home" url={liveLogos.homeUrl} shape={liveLogos.shape} is3D={liveLogos.effect3D} isAnim={liveLogos.effectAnimated} size={90} />
                 <span className="text-zinc-600 font-black text-sm px-3">VS</span>
                 <PreviewTeamLogo team="away" url={liveLogos.awayUrl} shape={liveLogos.shape} is3D={liveLogos.effect3D} isAnim={liveLogos.effectAnimated} size={90} />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-zinc-300 text-sm font-semibold">URL Escudo Local</Label>
                  <Input value={liveLogos.homeUrl || ''} onChange={e => updateLiveLogos({ homeUrl: e.target.value })} placeholder="https://ejemplo.com/logo.png" className="bg-zinc-900 border-zinc-700 h-10 text-sm mt-1.5 text-white rounded-md" />
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm font-semibold">URL Escudo Visita</Label>
                  <Input value={liveLogos.awayUrl || ''} onChange={e => updateLiveLogos({ awayUrl: e.target.value })} placeholder="https://ejemplo.com/logo2.png" className="bg-zinc-900 border-zinc-700 h-10 text-sm mt-1.5 text-white rounded-md" />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/80 mt-4">
                <Label className="text-zinc-300 text-sm font-semibold mb-2 block">Tipografía de Números</Label>
                <Select value={liveLogos.ledFont || 'led-classic'} onValueChange={(val: any) => updateLiveLogos({ ledFont: val })}>
                  <SelectTrigger className="h-10 text-sm bg-zinc-900 border-zinc-700 font-bold text-white mb-4 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value="led-classic">LED Clásico (Original con corte)</SelectItem>
                    <SelectItem value="impact">Impact (Gruesa y compacta)</SelectItem>
                    <SelectItem value="arial-black">Arial Black (Muy gruesa y redonda)</SelectItem>
                    <SelectItem value="consolas">Consolas (Digital / Consola)</SelectItem>
                    <SelectItem value="trebuchet">Trebuchet MS (Deportiva y limpia)</SelectItem>
                    <SelectItem value="system">Sistema (Máxima compatibilidad)</SelectItem>
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-zinc-300 text-sm font-semibold mb-2 block">Grosor</Label>
                    <Select value={liveLogos.fontWeight || '900'} onValueChange={(val: any) => updateLiveLogos({ fontWeight: val })}>
                      <SelectTrigger className="h-10 text-sm bg-zinc-900 border-zinc-700 font-bold text-white rounded-md"><SelectValue /></SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="400">Fino (Regular)</SelectItem>
                        <SelectItem value="700">Negrita (Bold)</SelectItem>
                        <SelectItem value="900">Máximo (Black)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-300 text-sm font-semibold mb-2 block">Separación</Label>
                    <Select value={liveLogos.letterSpacing || 'normal'} onValueChange={(val: any) => updateLiveLogos({ letterSpacing: val })}>
                      <SelectTrigger className="h-10 text-sm bg-zinc-900 border-zinc-700 font-bold text-white rounded-md"><SelectValue /></SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="0.05em">Separado</SelectItem>
                        <SelectItem value="0.1em">Muy Separado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 🛡️ COLORES GENERALES DEL MARCADOR */}
                <Label className="text-zinc-300 text-sm font-semibold mb-2 block mt-6 border-t border-zinc-800 pt-4">Colores del Marcador Público</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 p-4 bg-black/40 rounded-xl border border-zinc-700 mb-4 shadow-inner">
                   <div>
                     <Label className="text-zinc-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Fondo</Label>
                     <input type="color" value={liveLogos.boardBgColor || '#050505'} onChange={e => updateLiveLogos({boardBgColor: e.target.value})} className="w-full h-10 md:h-12 p-0 border border-zinc-600 rounded-md cursor-pointer shadow-sm hover:border-zinc-400 transition-colors" title="Fondo del marcador" />
                   </div>
                   <div>
                     <Label className="text-zinc-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Textos</Label>
                     <input type="color" value={liveLogos.boardTextColor || '#ffffff'} onChange={e => updateLiveLogos({boardTextColor: e.target.value})} className="w-full h-10 md:h-12 p-0 border border-zinc-600 rounded-md cursor-pointer shadow-sm hover:border-zinc-400 transition-colors" title="Nombres de equipos y títulos" />
                   </div>
                   <div>
                     <Label className="text-zinc-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Dígitos</Label>
                     <input type="color" value={liveLogos.boardAccentColor || '#dc2626'} onChange={e => updateLiveLogos({boardAccentColor: e.target.value})} className="w-full h-10 md:h-12 p-0 border border-zinc-600 rounded-md cursor-pointer shadow-sm hover:border-zinc-400 transition-colors" title="Color de números principales" />
                   </div>
                   <div>
                     <Label className="text-zinc-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Posesión</Label>
                     <input type="color" value={liveLogos.possessionColor || '#22c55e'} onChange={e => updateLiveLogos({possessionColor: e.target.value})} className="w-full h-10 md:h-12 p-0 border border-zinc-600 rounded-md cursor-pointer shadow-sm hover:border-zinc-400 transition-colors" title="Color del reloj de posesión" />
                   </div>
                   <div>
                     <Label className="text-zinc-400 text-xs font-semibold mb-1.5 block uppercase tracking-wider">Penales</Label>
                     <input type="color" value={liveLogos.penaltiesColor || '#eab308'} onChange={e => updateLiveLogos({penaltiesColor: e.target.value})} className="w-full h-10 md:h-12 p-0 border border-zinc-600 rounded-md cursor-pointer shadow-sm hover:border-zinc-400 transition-colors" title="Color de los penales" />
                   </div>
                </div>

                {/* 🛡️ DISEÑO DE CAMISETA Y DURACIÓN */}
                <Label className="text-zinc-300 text-sm font-semibold mb-2 block mt-6 border-t border-zinc-800 pt-4">Animación de Gol (Pantalla Completa)</Label>
                
                <div className="grid grid-cols-2 gap-4 mb-4 mt-2">
                  <div>
                    <Label className="text-zinc-400 text-xs font-semibold mb-2 block">Diseño de Camiseta</Label>
                    <Select value={liveLogos.jerseyDesign || 'solid'} onValueChange={(val: any) => updateLiveLogos({ jerseyDesign: val })}>
                      <SelectTrigger className="h-10 text-sm bg-zinc-900 border-zinc-700 font-bold text-white rounded-md"><SelectValue placeholder="Selecciona Diseño" /></SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="solid">Color Sólido</SelectItem>
                        <SelectItem value="striped">Rayada (Bastones)</SelectItem>
                        <SelectItem value="halved">Mitades (Arlequín)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs font-semibold mb-2 block">Duración en Pantalla</Label>
                    <Select value={liveLogos.goalDuration || '5'} onValueChange={(val: any) => updateLiveLogos({ goalDuration: val })}>
                      <SelectTrigger className="h-10 text-sm bg-zinc-900 border-zinc-700 font-bold text-white rounded-md"><SelectValue /></SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="5">5 Segundos</SelectItem>
                        <SelectItem value="8">8 Segundos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-black/40 rounded-xl border border-zinc-700 mb-4 shadow-inner">
                   <div>
                     <Label className="text-zinc-400 text-xs font-semibold mb-2 block">Local (Fondo/Nº)</Label>
                     <div className="flex gap-2">
                        <input type="color" value={liveLogos.homeJ1} onChange={e => updateLiveLogos({homeJ1: e.target.value})} className="w-full h-10 p-0 border border-zinc-600 rounded-md cursor-pointer hover:border-zinc-400 transition-colors" title="Color Base (o Rayas 1)" />
                        <input type="color" value={liveLogos.homeJ2} onChange={e => updateLiveLogos({homeJ2: e.target.value})} className="w-full h-10 p-0 border border-zinc-600 rounded-md cursor-pointer hover:border-zinc-400 transition-colors" title="Número (y Rayas 2 si aplica)" />
                     </div>
                   </div>
                   <div>
                     <Label className="text-zinc-400 text-xs font-semibold mb-2 block">Visita (Fondo/Nº)</Label>
                     <div className="flex gap-2">
                        <input type="color" value={liveLogos.awayJ1} onChange={e => updateLiveLogos({awayJ1: e.target.value})} className="w-full h-10 p-0 border border-zinc-600 rounded-md cursor-pointer hover:border-zinc-400 transition-colors" title="Color Base (o Rayas 1)" />
                        <input type="color" value={liveLogos.awayJ2} onChange={e => updateLiveLogos({awayJ2: e.target.value})} className="w-full h-10 p-0 border border-zinc-600 rounded-md cursor-pointer hover:border-zinc-400 transition-colors" title="Número (y Rayas 2 si aplica)" />
                     </div>
                   </div>
                </div>

                <Label className="text-zinc-300 text-sm font-semibold mb-2 block mt-6 border-t border-zinc-800 pt-4">Modo de Presentación (Escudo)</Label>
                <Select value={liveLogos.displayMode || 'logoAndName'} onValueChange={(val: any) => updateLiveLogos({ displayMode: val })}>
                  <SelectTrigger className="h-10 text-sm bg-zinc-900 border-zinc-700 font-bold text-white mb-4 rounded-md"><SelectValue placeholder="Selecciona Presentación" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value="logoOnly">Solo Escudo 3D</SelectItem>
                    <SelectItem value="logoAndName">Escudo + Nombre (Separados)</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="text-zinc-300 text-sm font-semibold mb-2 block mt-4">Forma (Máscara de Recorte)</Label>
                <Select value={liveLogos.shape || 'shield'} onValueChange={(val: any) => updateLiveLogos({ shape: val })}>
                  <SelectTrigger className="h-10 text-sm bg-zinc-900 border-zinc-700 font-bold text-white rounded-md"><SelectValue placeholder="Selecciona Forma" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[9999] bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value="none">Sin Marco (Original)</SelectItem>
                    <SelectItem value="circle">Círculo</SelectItem>
                    <SelectItem value="square">Cuadrado Redondeado</SelectItem>
                    <SelectItem value="shield">Escudo Clásico</SelectItem>
                    <SelectItem value="iberico">Escudo Ibérico</SelectItem>
                    <SelectItem value="gotico">Escudo Gótico</SelectItem>
                    <SelectItem value="tudor">Escudo Tudor (Inglés)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between bg-zinc-900 p-3 md:p-4 rounded-xl border border-yellow-900/50 mt-6 shadow-sm">
                <span className={`text-sm font-bold ${liveLogos.effect3D ? 'text-yellow-400' : 'text-zinc-400'}`}>Perspectiva 3D Premium</span>
                <button onClick={() => updateLiveLogos({ effect3D: !liveLogos.effect3D })} className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${liveLogos.effect3D ? 'bg-yellow-500' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${liveLogos.effect3D ? 'left-[28px]' : 'left-[4px]'}`} /></button>
              </div>
              <div className="flex items-center justify-between bg-zinc-900 p-3 md:p-4 rounded-xl border border-blue-900/50 mt-3 shadow-sm">
                <span className={`text-sm font-bold ${liveLogos.effectAnimated ? 'text-blue-400' : 'text-zinc-400'}`}>Animación Flotante</span>
                <button onClick={() => updateLiveLogos({ effectAnimated: !liveLogos.effectAnimated })} className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${liveLogos.effectAnimated ? 'bg-blue-500' : 'bg-zinc-700'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${liveLogos.effectAnimated ? 'left-[28px]' : 'left-[4px]'}`} /></button>
              </div>
            </div>

            <div className="h-px bg-zinc-800 w-full" />

            {/* SECCIÓN 2: VISTAS DEL DASHBOARD */}
            <div className="space-y-4">
              <h3 className="text-white font-bold text-base flex items-center gap-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800"><LayoutDashboard className="w-5 h-5 text-amber-500" /> Vistas del Dashboard</h3>
              <div className="space-y-3">
                {[{ id: '1', label: 'P1: Marcador Global', fixed: true }, { id: '2', label: 'P2: 45s / Faltas Local', fixed: false }, { id: '3', label: 'P3: 45s / Faltas Visita', fixed: false }, { id: '4', label: 'P4: Tarjetas Local', fixed: false }, { id: '5', label: 'P5: Tarjetas Visita', fixed: false }].map(screen => (
                  <div key={screen.id} className="flex items-center justify-between bg-zinc-900/50 p-3.5 rounded-xl border border-zinc-800">
                    <span className={`text-sm md:text-base font-bold ${screen.fixed ? 'text-zinc-500' : 'text-zinc-300'}`}>{screen.label}</span>
                    <button disabled={screen.fixed} onClick={() => toggleScreenVisibility(screen.id)} className={`w-12 h-6 rounded-full transition-colors relative shadow-inner ${visibleScreens.includes(screen.id) ? 'bg-green-600' : 'bg-zinc-700'} ${screen.fixed ? 'opacity-50 cursor-not-allowed' : ''}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${visibleScreens.includes(screen.id) ? 'left-[28px]' : 'left-[4px]'}`} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-zinc-800 w-full" />

            {/* SECCIÓN 3: PROYECTORES EXTERNOS */}
            <div className="space-y-4 pb-10">
              <h3 className="text-white font-bold text-base flex items-center gap-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800"><ExternalLink className="w-5 h-5 text-blue-500" /> Proyectores Externos</h3>
              <div className="space-y-3">
                {[{ id: 1, name: 'P1: Marcador Global' }, { id: 2, name: 'P2: 45s / Faltas Local' }, { id: 3, name: 'P3: 45s / Faltas Visita' }, { id: 4, name: 'P4: Tarjetas Local' }, { id: 5, name: 'P5: Tarjetas Visita' }].map(p => (
                  <Button key={p.id} onClick={() => openScoreboardWindow(p.id)} className="w-full bg-blue-900/20 hover:bg-blue-600 justify-start text-sm md:text-base h-12 md:h-14 font-bold border border-blue-900/50 text-blue-100 transition-all shadow-sm"><Tv className="w-5 h-5 mr-3" /> Lanzar {p.name}</Button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="bg-zinc-900 border-t border-zinc-800 px-4 py-1.5 shrink-0 z-50 relative">
        <p className="text-center text-xs text-amber-500/70 font-medium tracking-wide">Ardi Marcador Hockey Patin PRO</p>
      </footer>
    </div>
  )
}