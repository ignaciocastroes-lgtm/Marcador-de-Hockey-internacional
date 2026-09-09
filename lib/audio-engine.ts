// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE AUDIO
//
// Tres voces DISTINTAS, para que el oído las separe sin pensar:
//
//   BOCINA  — grave y áspera. Fin de periodo, fin de posesión, fin de partido.
//             Dos sierras a 110 y 114 Hz: los 4 Hz de diferencia producen el
//             batido que le da carácter de bocina de estadio en vez de pitido.
//
//   PULSO   — agudo y corto. La cuenta atrás de los últimos segundos.
//             Onda cuadrada dos octavas y media más arriba: registro y timbre
//             completamente distintos de la bocina, imposible de confundir
//             aunque el gimnasio esté ruidoso.
//
//   AVISO   — tres pulsos descendentes. Tiro libre directo, límite de faltas.
//
// Todo sintetizado: sin archivos, sin red, sin política de autoreproducción.
// El MP3 propio es opcional y sólo reemplaza a la BOCINA.
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIO_STORAGE_KEY = 'ardi-audio-config'
export const AUDIO_EVENT = 'ardi-audio-updated'

/** Tope del MP3 propio. localStorage es finito y lo comparte con el partido. */
export const MAX_CUSTOM_BYTES = 400_000

export type HornMode = 'synth' | 'estadio' | 'custom'

export interface AudioConfig {
  /**
   * `synth`   dos sierras limpias: la de siempre, sobria y clara.
   * `estadio` el zumbador metalico de pabellon (ver `playEstadio`).
   * `custom`  un archivo del club.
   */
  hornMode: HornMode
  customName: string
  customData: string          // data URL; '' = no hay
  hornVolume: number          // 0-1
  beepVolume: number          // 0-1
  beepsEnabled: boolean
}

export const DEFAULT_AUDIO: AudioConfig = {
  hornMode: 'synth', customName: '', customData: '',
  hornVolume: 0.55, beepVolume: 0.45, beepsEnabled: true
}

export function loadAudioConfig(): AudioConfig {
  if (typeof window === 'undefined') return DEFAULT_AUDIO
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY)
    return raw ? { ...DEFAULT_AUDIO, ...JSON.parse(raw) } : DEFAULT_AUDIO
  } catch { return DEFAULT_AUDIO }
}

export function saveAudioConfig(cfg: AudioConfig): void {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(cfg))
    window.dispatchEvent(new Event(AUDIO_EVENT))
  } catch {
    // Cuota llena: casi siempre por un MP3 grande
    throw new Error('No se pudo guardar: el archivo es demasiado grande para la memoria del navegador.')
  }
}

/** Borra el MP3 y vuelve al sintetizador. Salida de emergencia si el archivo quedó corrupto. */
export function clearCustomSound(): AudioConfig {
  const cfg = { ...loadAudioConfig(), hornMode: 'synth' as const, customName: '', customData: '' }
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(cfg))
    window.dispatchEvent(new Event(AUDIO_EVENT))
  } catch { /* ignorar */ }
  return cfg
}

// ─────────────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null
let liveNodes: AudioScheduledSourceNode[] = []
let customBuffer: AudioBuffer | null = null
let customSource: AudioBufferSourceNode | null = null
let decodedFrom = ''

/**
 * Desbloqueo por gesto. El navegador crea el AudioContext suspendido si no
 * viene de una interaccion del usuario, y los sonidos disparados por un
 * temporizador —la cuenta atras, la bocina al llegar a cero— no son un gesto.
 * Resultado: silencio absoluto hasta que alguien pulsa algo que suene.
 * Esto engancha el primer toque de la pagina y reanuda el contexto.
 */
let unlocked = false

export function armAudio(): void {
  if (typeof window === 'undefined' || unlocked) return
  const unlock = () => {
    unlocked = true
    try {
      if (!ctx && window.AudioContext) ctx = new AudioContext()
      void ctx?.resume()
      // Un tick mudo termina de habilitar el contexto en iOS y Android
      if (ctx) {
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, ctx.currentTime)
        g.connect(ctx.destination)
        const o = ctx.createOscillator()
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.01)
      }
    } catch { /* noop */ }
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: false })
  window.addEventListener('keydown', unlock, { once: false })
}

function getCtx(): AudioContext | null {
  try {
    if (typeof window === 'undefined' || !window.AudioContext) return null
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

function stopSynth(): void {
  liveNodes.forEach(n => { try { n.stop(); n.disconnect() } catch { /* noop */ } })
  liveNodes = []
}

/**
 * Envolvente. Sin esto, arrancar y cortar una sierra a mitad de ciclo produce
 * una discontinuidad, y una discontinuidad en audio es un chasquido — inaudible
 * en audífonos, muy audible en el amplificador de un pabellón.
 */
function envelope(gain: GainNode, now: number, peak: number, durMs: number): void {
  const attack = 0.008
  const release = 0.04
  const end = now + durMs / 1000
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), now + attack)
  gain.gain.setValueAtTime(Math.max(peak, 0.0002), Math.max(now + attack, end - release))
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
}

// ─── BOCINA ──────────────────────────────────────────────────────────────────

export function playHorn(durMs = 800, cfg: AudioConfig = loadAudioConfig()): void {
  const c = getCtx()
  if (!c) return

  if (cfg.hornMode === 'custom' && cfg.customData) {
    void playCustom(cfg, durMs)
    return
  }
  if (cfg.hornMode === 'estadio') {
    playEstadio(durMs, cfg)
    return
  }

  stopSynth()
  const master = c.createGain()
  master.connect(c.destination)

  // Dos sierras sumadas llegan al doble de amplitud: 0.5 por voz tocaría el
  // techo y recortaría cada vez que el batido las alinea. Con headroom queda
  // limpio y con la misma presencia.
  const peak = Math.min(0.98, Math.max(0.05, cfg.hornVolume)) * 0.45
  envelope(master, c.currentTime, peak, durMs)

  ;[110, 114].forEach(f => {
    const osc = c.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(f, c.currentTime)
    osc.connect(master)
    osc.start()
    osc.stop(c.currentTime + durMs / 1000 + 0.05)
    liveNodes.push(osc)
  })
}

/**
 * CHICHARRA DE ESTADIO
 *
 * La bocina `synth` son dos sierras a 110 Hz: limpia y correcta, pero suena a
 * sintetizador. Una chicharra real es un diafragma metalico vibrando a la
 * fuerza, y lo que la hace reconocible es el DESORDEN armonico, no la nota.
 *
 * La receta, y el porque de cada pieza:
 *
 *  · Sierra + pulso desafinado ~12 cents. La sierra trae todos los armonicos;
 *    el pulso al 40% suma los impares huecos. Desafinados baten entre si, y
 *    ese batido es lo que se oye como "temblor industrial".
 *  · Ruido blanco al 18%. Es el aire a presion y el roce del diafragma. Sin
 *    el, el sonido es afinado y por tanto musical, que es justo lo contrario.
 *  · Envolvente de tono: entra un 12% mas agudo y cae en 35 ms. Imita el
 *    golpe de corriente del arranque.
 *  · LFO a 12 Hz sobre la afinacion, muy leve. Inestabilidad mecanica.
 *  · Paso bajo 24 dB (dos de 12 en cascada) abierto al 88% con resonancia:
 *    deja pasar el brillo y marca un pico estridente en medios-altos.
 *  · Saturacion con `WaveShaper`. Sin ella los armonicos no se rompen y el
 *    resultado sigue siendo demasiado limpio para un pabellon.
 *  · Ataque y corte secos: una chicharra es electrica, se enciende y se apaga.
 */
function curvaSaturacion(cantidad = 55): Float32Array {
  const n = 1024
  const curva = new Float32Array(n)
  const k = cantidad
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curva[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x))
  }
  return curva
}

function playEstadio(durMs: number, cfg: AudioConfig): void {
  const c = getCtx()
  if (!c) return
  stopSynth()

  const now = c.currentTime
  const dur = durMs / 1000
  const fin = now + dur

  const master = c.createGain()
  const shaper = c.createWaveShaper()
  shaper.curve = curvaSaturacion(55)
  shaper.oversample = '4x'

  // Dos filtros de 12 dB en cascada = los 24 dB/octava de la receta.
  const lp1 = c.createBiquadFilter()
  const lp2 = c.createBiquadFilter()
  lp1.type = lp2.type = 'lowpass'
  lp1.frequency.setValueAtTime(5200, now)
  lp2.frequency.setValueAtTime(5200, now)
  lp1.Q.setValueAtTime(4.5, now)   // el pico estridente
  lp2.Q.setValueAtTime(1.2, now)

  master.connect(shaper); shaper.connect(lp1); lp1.connect(lp2); lp2.connect(c.destination)

  // La saturacion sube el nivel percibido: se compensa para que cambiar de
  // voz no dispare el volumen en el amplificador del pabellon.
  const peak = Math.min(0.98, Math.max(0.05, cfg.hornVolume)) * 0.30
  const g = c.createGain()
  g.connect(master)
  master.gain.setValueAtTime(1, now)

  // ADSR duro: golpe instantaneo, sostenido plano, corte en 40 ms.
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(peak, now + 0.004)
  g.gain.setValueAtTime(peak, Math.max(now + 0.004, fin - 0.04))
  g.gain.exponentialRampToValueAtTime(0.0001, fin)

  const BASE = 138
  const detune = [0, 12]   // cents

  ;(['sawtooth', 'square'] as OscillatorType[]).forEach((tipo, i) => {
    const osc = c.createOscillator()
    osc.type = tipo
    osc.detune.setValueAtTime(detune[i], now)
    // Envolvente de tono: arranca agudo y cae. El golpe de corriente.
    osc.frequency.setValueAtTime(BASE * 1.12, now)
    osc.frequency.exponentialRampToValueAtTime(BASE, now + 0.035)
    osc.connect(g)
    osc.start(now)
    osc.stop(fin + 0.05)
    liveNodes.push(osc)

    // Temblor mecanico: LFO lento en amplitud de modulacion, rapido en Hz.
    const lfo = c.createOscillator()
    const lfoGain = c.createGain()
    lfo.type = 'triangle'
    lfo.frequency.setValueAtTime(12, now)
    lfoGain.gain.setValueAtTime(7, now)      // +-7 cents
    lfo.connect(lfoGain); lfoGain.connect(osc.detune)
    lfo.start(now); lfo.stop(fin + 0.05)
    liveNodes.push(lfo)
  })

  // Ruido: el aire y el roce del diafragma.
  const largo = Math.ceil(c.sampleRate * (dur + 0.1))
  const buffer = c.createBuffer(1, largo, c.sampleRate)
  const datos = buffer.getChannelData(0)
  for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1
  const ruido = c.createBufferSource()
  const ruidoGain = c.createGain()
  ruido.buffer = buffer
  ruidoGain.gain.setValueAtTime(0.18, now)
  ruido.connect(ruidoGain); ruidoGain.connect(g)
  ruido.start(now); ruido.stop(fin + 0.05)
  liveNodes.push(ruido)
}

export function stopHorn(): void {
  stopSynth()
  try { customSource?.stop(); customSource?.disconnect() } catch { /* noop */ }
  customSource = null
}

// ─── PULSO ───────────────────────────────────────────────────────────────────

export type BeepKind = 'tick' | 'last' | 'alert'

/**
 * Registro agudo y onda cuadrada: dos parámetros que separan el pulso de la
 * bocina de forma inequívoca. Aunque suenen seguidos, no se confunden.
 */
export function playBeep(kind: BeepKind = 'tick', cfg: AudioConfig = loadAudioConfig()): void {
  if (!cfg.beepsEnabled) return
  const c = getCtx()
  if (!c) return

  const vol = Math.min(0.9, Math.max(0.05, cfg.beepVolume)) * 0.35

  if (kind === 'alert') {
    // Tres pulsos descendentes: tiro libre directo, límite de faltas
    ;[1568, 1319, 1047].forEach((f, i) => pip(c, f, 90, vol, i * 0.13))
    return
  }

  // 'last' es el pulso del último segundo: más agudo y más largo, para que se
  // note que viene el cero sin llegar a ser la bocina
  if (kind === 'last') pip(c, 1976, 140, vol * 1.15, 0)
  else pip(c, 1568, 70, vol, 0)
}

function pip(c: AudioContext, freq: number, durMs: number, vol: number, delay: number): void {
  const t = c.currentTime + delay
  const g = c.createGain()
  g.connect(c.destination)
  envelope(g, t, vol, durMs)

  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, t)
  osc.connect(g)
  osc.start(t)
  osc.stop(t + durMs / 1000 + 0.05)
}

// ─── MP3 propio ──────────────────────────────────────────────────────────────

async function playCustom(cfg: AudioConfig, durMs: number): Promise<void> {
  const c = getCtx()
  if (!c) return
  try {
    if (!customBuffer || decodedFrom !== cfg.customData) {
      const res = await fetch(cfg.customData)
      const arr = await res.arrayBuffer()
      customBuffer = await c.decodeAudioData(arr)
      decodedFrom = cfg.customData
    }
    const src = c.createBufferSource()
    src.buffer = customBuffer
    const g = c.createGain()
    g.gain.setValueAtTime(Math.min(1, Math.max(0.05, cfg.hornVolume)), c.currentTime)
    src.connect(g); g.connect(c.destination)
    src.start()
    src.stop(c.currentTime + durMs / 1000)
    customSource = src
  } catch {
    // Archivo corrupto o formato no soportado: no dejar la mesa en silencio
    playHorn(durMs, { ...cfg, hornMode: 'synth' })
  }
}

/** Valida y convierte un archivo a data URL. Rechaza lo que no sirva. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('audio/')) {
      reject(new Error('El archivo no es de audio.')); return
    }
    if (file.size > MAX_CUSTOM_BYTES) {
      reject(new Error(`El archivo pesa ${Math.round(file.size / 1024)} KB. El máximo es ${Math.round(MAX_CUSTOM_BYTES / 1024)} KB.`))
      return
    }
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    r.readAsDataURL(file)
  })
}

export function releaseAudio(): void {
  stopHorn()
  try { if (ctx && ctx.state !== 'closed') void ctx.close() } catch { /* noop */ }
  ctx = null
  customBuffer = null
  decodedFrom = ''
}
