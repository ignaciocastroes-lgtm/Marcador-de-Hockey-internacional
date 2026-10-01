"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────────────────────
// Montaje en cancha: un PC, varias salidas HDMI.
//  1. Service worker  → la app abre sin internet tras la primera visita
//  2. Wake Lock       → Windows no apaga los televisores a mitad del 2do tiempo
//  3. Window Mgmt API → cada tablero se abre en su monitor, en pantalla completa
// ─────────────────────────────────────────────────────────────────────────────

interface ScreenInfo {
  left: number; top: number; width: number; height: number
  label: string; isPrimary: boolean
}

export function useVenueSetup() {
  const [offlineReady, setOfflineReady] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [screens, setScreens] = useState<ScreenInfo[]>([])
  const [wakeLockOn, setWakeLockOn] = useState(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  // ─── 1. Service worker ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js')
      .then(reg => { if (reg.active) setOfflineReady(true) })
      .catch(() => setOfflineReady(false))
    navigator.serviceWorker.ready.then(() => setOfflineReady(true)).catch(() => undefined)
  }, [])

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  // ─── 2. Wake Lock ──────────────────────────────────────────────────────────
  const requestWakeLock = useCallback(async () => {
    try {
      if (!('wakeLock' in navigator)) return
      wakeLock.current = await navigator.wakeLock.request('screen')
      setWakeLockOn(true)
      wakeLock.current.addEventListener('release', () => setWakeLockOn(false))
    } catch { setWakeLockOn(false) }
  }, [])

  useEffect(() => {
    requestWakeLock()
    // Windows lo suelta al minimizar: hay que repedirlo al volver
    const onVisible = () => { if (document.visibilityState === 'visible') requestWakeLock() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      wakeLock.current?.release().catch(() => undefined)
    }
  }, [requestWakeLock])

  // ─── 3. Monitores ──────────────────────────────────────────────────────────
  const detectScreens = useCallback(async (): Promise<ScreenInfo[]> => {
    try {
      const w = window as unknown as { getScreenDetails?: () => Promise<{ screens: ScreenInfo[] }> }
      if (!w.getScreenDetails) return []
      const details = await w.getScreenDetails()
      const list = details.screens.map((s, i) => ({
        left: s.left, top: s.top, width: s.width, height: s.height,
        label: s.label || `Monitor ${i + 1}`, isPrimary: s.isPrimary
      }))
      setScreens(list)
      return list
    } catch {
      setScreens([])
      return []
    }
  }, [])

  /** Abre un tablero. Si hay monitor asignado, lo posiciona ahí a pantalla completa. */
  const openBoard = useCallback((boardId: number, screen?: ScreenInfo) => {
    const target = screen
      ? `left=${screen.left},top=${screen.top},width=${screen.width},height=${screen.height}`
      : `width=${window.screen.width},height=${window.screen.height}`
    window.open(
      `/scoreboard?board=${boardId}`,
      `Tablero_P${boardId}`,
      `${target},menubar=no,toolbar=no,location=no,status=no`
    )
  }, [])

  /**
   * Reparte los tableros por los monitores disponibles.
   * El monitor principal se reserva para la mesa de control.
   */
  const launchAllBoards = useCallback(async (boardIds: number[]) => {
    const list = await detectScreens()
    const externals = list.filter(s => !s.isPrimary)

    if (externals.length === 0) {
      boardIds.forEach(id => openBoard(id))
      toast.info(
        list.length === 0
          ? 'No pude leer los monitores. Los tableros se abrieron en ventanas normales: arrástralos a cada pantalla.'
          : 'Sólo detecté un monitor. Los tableros se abrieron en ventanas normales.',
        { duration: 6000 }
      )
      return
    }

    boardIds.forEach((id, i) => openBoard(id, externals[i % externals.length]))
    toast.success(`${boardIds.length} tableros repartidos en ${externals.length} pantalla(s).`, { duration: 4000 })
  }, [detectScreens, openBoard])

  return { offlineReady, isOnline, screens, wakeLockOn, detectScreens, openBoard, launchAllBoards }
}
