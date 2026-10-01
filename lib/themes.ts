"use client"

// ─────────────────────────────────────────────────────────────────────────────
// TEMAS VISUALES — compartidos por las dos vistas
//
// Vivian dentro de `operator-view.tsx`, asi que PISTA no podia usarlos: el
// operador elegia un tema, cambiaba CONTROL y la vista que usa cada sabado se
// quedaba igual. Es el mismo patron que ya mordio con los atajos y con los
// editores de plantel: algo compartido declarado dentro de una sola vista.
//
// Aqui viven una vez y lo consumen las dos.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

export const THEME_KEY = 'ardi-theme'
/** Se emite al cambiar de tema: las dos vistas se enteran sin recargar. */
export const THEME_EVENT = 'ardi-theme-changed'

export type SkinKey = 'neon-original' | 'stadium-led' | 'fiba-fifa' | 'cyber-ambar' | 'broadcast-pro' | 'alto-contraste' | 'retro-arcade';

export interface ThemeConfig {
  id: SkinKey; label: string; globalBg: string; panelBase: string; teamHomeBase: string; teamAwayBase: string;
  clock: { containerMain: string; textMain: string; textPos: string; font: React.CSSProperties; label: string; };
  btn: { shape: string; primary: string; secondary: string; danger: string; foul: string; penal: string; timeout: string; cardY: string; cardB: string; cardR: string; };
}

export const GLOBAL_THEMES: Record<SkinKey, ThemeConfig> = {
  'neon-original': {
    id: 'neon-original', label: '🔴 Neón Original', globalBg: 'bg-zinc-950', panelBase: 'bg-black border-2 border-zinc-800 rounded-xl', teamHomeBase: 'bg-gradient-to-b from-blue-950/50 to-zinc-900 border-2 border-blue-800 rounded-xl', teamAwayBase: 'bg-gradient-to-b from-amber-950/50 to-zinc-900 border-2 border-amber-800 rounded-xl',
    clock: { containerMain: 'bg-black border-4 border-zinc-700 rounded-xl', textMain: 'text-red-500', textPos: 'text-green-400', font: { fontFamily: 'var(--font-led)', letterSpacing: '0.05em', textShadow: '0 0 20px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.4)' }, label: 'text-zinc-500' },
    btn: { shape: 'rounded-md', primary: 'bg-green-700 hover:bg-green-600 text-white', secondary: 'bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white', danger: 'bg-red-600 hover:bg-red-500 text-white', foul: 'bg-orange-700 hover:bg-orange-600 text-white', penal: 'bg-purple-700 hover:bg-purple-600 text-white', timeout: 'bg-cyan-700 hover:bg-cyan-600 text-white', cardY: 'bg-yellow-500 hover:bg-yellow-400 text-black', cardB: 'bg-blue-600 hover:bg-blue-500 text-white', cardR: 'bg-red-600 hover:bg-red-500 text-white' }
  },
  'stadium-led': {
    id: 'stadium-led', label: '🟢 Stadium LED', globalBg: 'bg-[#050505]', panelBase: 'bg-[#0a0a0a] border-4 border-[#111] rounded-sm', teamHomeBase: 'bg-[#0a0a0a] border-4 border-[#064e3b] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] rounded-sm', teamAwayBase: 'bg-[#0a0a0a] border-4 border-[#78350f] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] rounded-sm',
    clock: { containerMain: 'bg-[#050505] border-4 border-[#222] rounded-sm', textMain: 'text-[#22c55e]', textPos: 'text-[#eab308]', font: { fontFamily: 'var(--font-led)', letterSpacing: '0.08em', textShadow: '0 0 10px rgba(34,197,94,0.6)' }, label: 'text-[#22c55e] opacity-70' },
    btn: { shape: 'rounded-sm uppercase tracking-wider', primary: 'bg-[#166534] hover:bg-[#15803d] text-white border-2 border-[#14532d]', secondary: 'bg-[#111] border-2 border-[#333] hover:bg-[#222] text-zinc-300', danger: 'bg-[#991b1b] hover:bg-[#b91c1c] text-white border-2 border-[#7f1d1d]', foul: 'bg-[#9a3412] hover:bg-[#b45309] text-white border-2 border-[#78350f]', penal: 'bg-[#6b21a8] hover:bg-[#7e22ce] text-white border-2 border-[#581c87]', timeout: 'bg-[#0e7490] hover:bg-[#0369a1] text-white', cardY: 'bg-[#eab308] hover:bg-[#facc15] text-black border-2 border-[#ca8a04]', cardB: 'bg-[#2563eb] hover:bg-[#3b82f6] text-white border-2 border-[#1d4ed8]', cardR: 'bg-[#dc2626] hover:bg-[#ef4444] text-white border-2 border-[#b91c1c]' }
  },
  'fiba-fifa': {
    id: 'fiba-fifa', label: '⚪ Clásico FIBA/FIFA', globalBg: 'bg-[#e2e8f0]', panelBase: 'bg-white border border-gray-300 shadow-md rounded-lg', teamHomeBase: 'bg-white border-t-8 border-t-blue-600 shadow-md rounded-lg', teamAwayBase: 'bg-white border-t-8 border-t-amber-500 shadow-md rounded-lg',
    clock: { containerMain: 'bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-inner', textMain: 'text-white', textPos: 'text-slate-200', font: { fontFamily: 'system-ui, sans-serif', fontWeight: 800, letterSpacing: '0', textShadow: 'none' }, label: 'text-slate-400' },
    btn: { shape: 'rounded-md font-semibold', primary: 'bg-slate-800 hover:bg-slate-700 text-white shadow-sm', secondary: 'bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700', danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm', foul: 'bg-orange-600 hover:bg-orange-500 text-white shadow-sm', penal: 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm', timeout: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm', cardY: 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-sm', cardB: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm', cardR: 'bg-red-600 hover:bg-red-500 text-white shadow-sm' }
  },
  'cyber-ambar': {
    id: 'cyber-ambar', label: '🟠 Cyber-Ámbar', globalBg: 'bg-[#0f0904]', panelBase: 'bg-[#1a0f00] border-2 border-[#78350f] rounded-none', teamHomeBase: 'bg-[#1a0f00] border-l-4 border-l-[#d97706] border-y border-r border-[#78350f] rounded-none', teamAwayBase: 'bg-[#1a0f00] border-r-4 border-r-[#d97706] border-y border-l border-[#78350f] rounded-none',
    clock: { containerMain: 'bg-[#0a0500] border-4 border-[#92400e] shadow-[0_0_15px_rgba(217,119,6,0.3)] rounded-none', textMain: 'text-[#f59e0b]', textPos: 'text-[#fbbf24]', font: { fontFamily: 'var(--font-led)', letterSpacing: '0.05em', textShadow: '0 0 15px rgba(245,158,11,0.8)' }, label: 'text-[#b45309]' },
    btn: { shape: 'rounded-none border border-[#92400e]', primary: 'bg-[#b45309] hover:bg-[#d97706] text-[#fffbeb]', secondary: 'bg-[#2a1300] hover:bg-[#451a03] text-[#fde68a]', danger: 'bg-[#7f1d1d] hover:bg-[#991b1b] text-white', foul: 'bg-[#9a3412] hover:bg-[#c2410c] text-white', penal: 'bg-[#4c1d95] hover:bg-[#581c87] text-white', timeout: 'bg-[#164e63] hover:bg-[#083344] text-white', cardY: 'bg-[#ca8a04] hover:bg-[#eab308] text-black', cardB: 'bg-[#1e3a8a] hover:bg-[#1e40af] text-white', cardR: 'bg-[#991b1b] hover:bg-[#b91c1c] text-white' }
  },
  'broadcast-pro': {
    id: 'broadcast-pro', label: '📺 Broadcast Pro', globalBg: 'bg-gradient-to-br from-slate-900 to-black', panelBase: 'bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600 shadow-xl rounded-lg', teamHomeBase: 'bg-gradient-to-br from-blue-900 to-slate-900 border border-blue-800 shadow-xl rounded-lg relative overflow-hidden', teamAwayBase: 'bg-gradient-to-br from-red-900 to-slate-900 border border-red-800 shadow-xl rounded-lg relative overflow-hidden',
    clock: { containerMain: 'bg-gradient-to-b from-slate-700 to-black border-2 border-slate-500 shadow-2xl rounded-md', textMain: 'text-white', textPos: 'text-white', font: { fontFamily: 'Impact, "Bebas Neue", sans-serif', fontWeight: 900, WebkitTextStroke: '1px rgba(0,0,0,0.5)', textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }, label: 'text-slate-300 uppercase tracking-widest' },
    btn: { shape: 'rounded-md shadow-lg border border-white/10 backdrop-blur-sm', primary: 'bg-gradient-to-b from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white', secondary: 'bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white', danger: 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white', foul: 'bg-gradient-to-b from-orange-600 to-orange-800 hover:from-orange-500 hover:to-orange-700 text-white', penal: 'bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white', timeout: 'bg-gradient-to-b from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 text-white', cardY: 'bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black', cardB: 'bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white', cardR: 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white' }
  },
  'alto-contraste': {
    id: 'alto-contraste', label: '☀️ Alto Contraste (Día)', globalBg: 'bg-black', panelBase: 'bg-black border-4 border-white rounded-none', teamHomeBase: 'bg-black border-4 border-blue-400 rounded-none', teamAwayBase: 'bg-black border-4 border-amber-400 rounded-none',
    clock: { containerMain: 'bg-black border-8 border-white rounded-none', textMain: 'text-[#FFFF00]', textPos: 'text-white', font: { fontFamily: 'Arial, sans-serif', fontWeight: 900, letterSpacing: '0', textShadow: 'none' }, label: 'text-white text-lg' },
    btn: { shape: 'rounded-none border-2 border-white font-black uppercase text-lg', primary: 'bg-black hover:bg-white hover:text-black text-[#00FF00]', secondary: 'bg-black hover:bg-white hover:text-black text-white', danger: 'bg-black hover:bg-white hover:text-black text-[#FF0000]', foul: 'bg-black hover:bg-white hover:text-black text-[#FF9900]', penal: 'bg-black hover:bg-white hover:text-black text-[#FF00FF]', timeout: 'bg-black hover:bg-white hover:text-black text-[#00FFFF]', cardY: 'bg-[#FFFF00] hover:bg-white hover:text-black text-black border-black', cardB: 'bg-[#0000FF] hover:bg-white hover:text-black text-white border-black', cardR: 'bg-[#FF0000] hover:bg-white hover:text-black text-white border-black' }
  },
  'retro-arcade': {
    id: 'retro-arcade', label: '🕹️ Retro Arcade', globalBg: 'bg-[#090229]', panelBase: 'bg-[#120458] border-4 border-[#00FFFF] shadow-[4px_4px_0px_#FF00FF] rounded-none', teamHomeBase: 'bg-[#120458] border-4 border-[#00FFFF] shadow-[4px_4px_0px_#FF00FF] rounded-none relative overflow-hidden', teamAwayBase: 'bg-[#120458] border-4 border-[#FF00FF] shadow-[4px_4px_0px_#00FFFF] rounded-none relative overflow-hidden',
    clock: { containerMain: 'bg-[#050117] border-4 border-[#FF00FF] rounded-none', textMain: 'text-[#00FFFF]', textPos: 'text-[#FF00FF]', font: { fontFamily: '"Courier New", Courier, monospace', fontWeight: 900, letterSpacing: '0', textShadow: '3px 3px 0px #FF00FF' }, label: 'text-white uppercase tracking-widest' },
    btn: { shape: 'rounded-none border-2 border-[#00FFFF] font-bold uppercase shadow-[2px_2px_0px_#FF00FF] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all', primary: 'bg-[#FF00FF] text-white border-[#00FFFF]', secondary: 'bg-[#120458] hover:bg-[#2a0885] text-[#00FFFF]', danger: 'bg-[#FF0000] text-white border-white', foul: 'bg-[#FF9900] text-white border-white', penal: 'bg-[#8A2BE2] text-white border-white', timeout: 'bg-[#00FFFF] text-[#120458] border-[#FF00FF]', cardY: 'bg-[#FFFF00] text-black border-black', cardB: 'bg-[#0000FF] text-white border-white', cardR: 'bg-[#FF0000] text-white border-white' }
  }
}

export const DEFAULT_SKIN: SkinKey = 'neon-original'

export function loadTheme(): ThemeConfig {
  if (typeof window === 'undefined') return GLOBAL_THEMES[DEFAULT_SKIN]
  try {
    const k = localStorage.getItem(THEME_KEY) as SkinKey | null
    return (k && GLOBAL_THEMES[k]) || GLOBAL_THEMES[DEFAULT_SKIN]
  } catch { return GLOBAL_THEMES[DEFAULT_SKIN] }
}

export function saveTheme(k: SkinKey): void {
  try {
    localStorage.setItem(THEME_KEY, k)
    window.dispatchEvent(new Event(THEME_EVENT))
  } catch { /* ignorar */ }
}

/** El tema activo, al dia. Sirve igual en CONTROL y en PISTA. */
export function useTheme(): ThemeConfig {
  const [tema, setTema] = useState<ThemeConfig>(GLOBAL_THEMES[DEFAULT_SKIN])
  useEffect(() => {
    const leer = () => setTema(loadTheme())
    leer()
    window.addEventListener(THEME_EVENT, leer)
    window.addEventListener('storage', leer)
    return () => {
      window.removeEventListener(THEME_EVENT, leer)
      window.removeEventListener('storage', leer)
    }
  }, [])
  return tema
}
