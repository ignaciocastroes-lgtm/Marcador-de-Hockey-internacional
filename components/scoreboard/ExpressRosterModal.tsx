"use client"

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Shield, Check, Trash2, Plus, X, Pencil, RotateCcw, Users, AlertTriangle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { serieLabel } from '@/lib/series'
import { CLUB_BRAND } from '@/lib/club-brand'
import { bootClub,  } from '@/lib/club-boot'
import { squadOf, saveClub, assignDorsal, dorsalOwner, seriesOf, type SquadPlayer, type ClubStore } from '@/lib/club-store'
import { APODO_MAX } from '@/lib/roster-csv'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// El tipo vive en roster-utils: estaba declarado TAMBIEN aqui, y las dos
// copias ya habian empezado a divergir (esta no conocia apodo ni identidad).
export type { ExpressEntry } from '@/lib/roster-utils'
import type { ExpressEntry } from '@/lib/roster-utils'

/** Plantel reglamentario de pista: 8 jugadores y 2 porteros. */
/**
 * Tope de fichas de la citacion.
 *
 * Estaba en 10 —8 de pista + 2 porteros, el plantel reglamentario EN PISTA—,
 * pero la citacion incluye la banca. Una serie de 12 se cortaba en 10 y nadie
 * se enteraba. Se sube a 16 y, si aun asi sobra gente, se dice.
 */
export const MAX_ENTRIES = 16
export const MAX_GOALIES = 2

export const DEFAULT_ENTRIES: ExpressEntry[] = [
  { number: '1',  isGoalie: true },
  { number: '10', isGoalie: true },
  { number: '2',  isGoalie: false },
  { number: '3',  isGoalie: false },
  { number: '4',  isGoalie: false },
  { number: '5',  isGoalie: false },
  { number: '6',  isGoalie: false },
  { number: '7',  isGoalie: false },
  { number: '8',  isGoalie: false },
  { number: '9',  isGoalie: false }
]

interface Props {
  open: boolean
  onClose: () => void
  teamName: string
  side: 'home' | 'away'
  value: ExpressEntry[]
  onSave: (entries: ExpressEntry[]) => void
}

/**
 * Dos citadas con el mismo dorsal. Con el dorsal guardado POR SERIE esto ya no
 * deberia poder ocurrir desde el plantel, pero se sigue comprobando aqui
 * porque el operador puede editar numeros a mano en este mismo modal.
 */
const detectarChoques = (entries: { number: string }[]) => {
  const cuenta = new Map<string, number>()
  entries.forEach(e => { if (e.number) cuenta.set(e.number, (cuenta.get(e.number) || 0) + 1) })
  return [...cuenta.entries()].filter(([, n]) => n > 1).map(([number]) => number)
}

const STAFF = ['dt', 'ay1', 'ay2', 'ax1', 'ax2']

export function ExpressRosterModal({ open, onClose, teamName, side, value, onSave }: Props) {
  const [club, setClub] = useState<ClubStore>(() => bootClub())
  const [entries, setEntries] = useState<ExpressEntry[]>([])
  const [apodoDe, setApodoDe] = useState<string | null>(null)
  /** Serie desde la que se cargaron las fichas, si vinieron del plantel. */
  const [serieCargada, setSerieCargada] = useState<string | null>(null)
  /** Del plantel pero sin numero en esa serie: se muestran para poder sumarlas. */
  const [pendientes, setPendientes] = useState<SquadPlayer[]>([])
  /** Cuerpo tecnico del club: viaja aparte de las fichas de pista. */
  const [staffCitado, setStaffCitado] = useState<ExpressEntry[]>([])
  /**
   * Escribir en el plantel los numeros de ESTE partido: apagado por defecto.
   *
   * En un amistoso entre series los numeros son de la ocasion, y guardarlos
   * solos ensuciaba la ficha de la persona. El apodo si se guarda solo, porque
   * es de la persona y no del partido.
   */
  const [guardarNumeros, setGuardarNumeros] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Vienen predefinidas: el operador sólo cambia el número que necesite
  useEffect(() => {
    if (open) {
      setEntries(value.length > 0 ? value : DEFAULT_ENTRIES.map(e => ({ ...e })))
      setDraft('')
      setEditing(null)
    }
  }, [open, value])

  const accent = side === 'home' ? 'blue' : 'amber'

  const add = () => {
    // Acepta "7" o varios de una vez: "7 9 12" o "7,9,12"
    const nums = draft.split(/[,\s]+/).map(n => n.trim()).filter(n => /^\d{1,2}$/.test(n))
    if (nums.length === 0) { toast.warning('Escribe un número de camiseta.'); return }

    const nuevos: ExpressEntry[] = []
    const repetidos: string[] = []
    nums.forEach(n => {
      if (entries.some(e => e.number === n) || nuevos.some(e => e.number === n)) repetidos.push(n)
      else if (entries.length + nuevos.length < MAX_ENTRIES) nuevos.push({ number: n, isGoalie: false })
    })

    if (entries.length + nuevos.length >= MAX_ENTRIES && nums.length > nuevos.length + repetidos.length) {
      toast.warning(`Máximo ${MAX_ENTRIES} camisetas por equipo: 8 jugadores y 2 porteros.`)
    }
    if (repetidos.length) toast.warning(`Ya estaba cargado: ${repetidos.join(', ')}`)
    if (nuevos.length) setEntries(prev => [...prev, ...nuevos])
    setDraft('')
    inputRef.current?.focus()
  }

  const toggleGoalie = (num: string) =>
    setEntries(prev => {
      const target = prev.find(e => e.number === num)
      if (target && !target.isGoalie && prev.filter(e => e.isGoalie).length >= MAX_GOALIES) {
        toast.warning(`Máximo ${MAX_GOALIES} porteros. Quita uno antes de marcar otro.`)
        return prev
      }
      return prev.map(e => e.number === num ? { ...e, isGoalie: !e.isGoalie } : e)
    })

  /** Cambiar el número de una ficha sin perder su marca de portero. */
  const rename = (oldNum: string, newNum: string) => {
    const n = newNum.trim()
    if (!/^\d{1,2}$/.test(n)) { setEditing(null); return }
    if (entries.some(e => e.number === n && e.number !== oldNum)) {
      toast.warning(`El ${n} ya está cargado.`); setEditing(null); return
    }
    // La infraccion real no es "repetir dentro de la serie": es que dos
    // jugadoras salgan a la pista con el mismo numero EN ESTE PARTIDO. Eso ya
    // lo cubre la comprobacion de arriba, sobre las fichas citadas. Si el
    // numero lo usa alguien de la serie que hoy no juega, se avisa sin
    // bloquear: puede ser exactamente lo que el operador quiere.
    if (serieCargada) {
      const ficha = entries.find(e => e.number === oldNum)
      const duenio = dorsalOwner(club, serieCargada, n, ficha?.personId)
      if (duenio) {
        toast.info(`Ojo: en esta serie el ${n} es de ${duenio.nombre}, que hoy no está citada.`, { duration: 6000 })
      }
    }
    setEntries(prev => prev.map(e => e.number === oldNum ? { ...e, number: n } : e))
    setEditing(null)
  }

  const remove = (num: string) =>
    setEntries(prev => prev.filter(e => e.number !== num))

  /**
   * El apodo se pide una vez en la vida, no cada fecha: lo que se escriba aca
   * vuelve al plantel del club. Solo aplica a fichas que tienen identidad
   * permanente (las de casa); la visita es de la jornada y no deja rastro.
   */
  /**
   * Lo corregido aca vuelve al plantel: el apodo y, si las fichas vinieron de
   * una serie, tambien el dorsal en ESA serie. Se pide una vez, no cada fecha.
   *
   * El dorsal pasa por `assignDorsal`, que rechaza el numero ya tomado en la
   * serie. Si alguno se rechaza se avisa y NO se guarda ese: mejor quedarse
   * sin el cambio que dejar dos jugadoras con el mismo numero.
   */
  const persistirCambios = () => {
    const conId = entries.filter(e => e.personId)
    if (conId.length === 0) return

    let actual = club
    let toco = false

    const cambios = new Map(conId.map(e => [e.personId!, e.apodo || '']))
    const personas = actual.personas.map(p => {
      if (!cambios.has(p.id)) return p
      const nuevo = cambios.get(p.id)!
      const ficha = conId.find(e => e.personId === p.id)!
      const nombre = (ficha.nombre || '').trim() || p.nombre
      if ((p.apodo || '') === nuevo && p.nombre === nombre) return p
      toco = true
      return { ...p, apodo: nuevo, nombre }
    })
    if (toco) actual = { ...actual, personas }

    if (serieCargada && guardarNumeros) {
      const previos = new Map(squadOf(actual, serieCargada).map(p => [p.id, p.dorsal]))
      conId.forEach(e => {
        if (previos.get(e.personId!) === e.number) return
        const r = assignDorsal(actual, serieCargada, e.personId!, e.number)
        if (r.ok && r.club) { actual = r.club; toco = true }
        else if (r.error) toast.warning(r.error, { duration: 7000 })
      })
    }

    if (!toco) return
    setClub(actual)
    saveClub(actual)
  }

  const goalies = entries.filter(e => e.isGoalie).length

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-zinc-900 border-2 border-zinc-700 text-white max-w-lg max-h-[92vh] flex flex-col overflow-hidden" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg font-black">
            Camisetas · <span className={accent === 'blue' ? 'text-blue-400' : 'text-amber-400'}>{teamName || (side === 'home' ? 'LOCAL' : 'VISITA')}</span>
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 leading-snug">
            Escribe el número y pulsa Enter. Toca una ficha para marcarla como portero.
          </p>
        </DialogHeader>

        {/* Cargar una serie del club. Las fichas traen la IDENTIDAD de la
            persona (ILE-0007), no solo su numero: por eso el motor puede
            acumular tarjetas sobre la misma persona de una fecha a otra.
            Solo tiene sentido para el equipo de casa; la visita se carga a
            mano y su identidad es de la jornada. */}
        {side === 'home' && (
        <div className="flex gap-2 items-center bg-zinc-950 border border-zinc-800 rounded-lg p-2">
          <Users className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-[10px] font-black text-zinc-500 uppercase shrink-0">{CLUB_BRAND.shortName}</span>
          <select
            onChange={e => {
              const serieId = e.target.value
              const squad = squadOf(club, serieId)
              e.target.value = ''
              setSerieCargada(serieId)
              if (squad.length === 0) { toast.info('Esa serie todavía no tiene plantel cargado.'); return }

              // Cargar una serie es un PUNTO DE PARTIDA, no una reja. Quien no
              // tiene numero en esta serie no se descarta: queda a la vista,
              // abajo, para sumarla con un numero de este partido. En un
              // amistoso entre series eso es lo normal, y la herramienta no
              // puede impedirlo mientras no sea federativa.
              const conNumero = squad.filter(p => p.dorsal.trim())
              setEntries(conNumero.slice(0, MAX_ENTRIES).map((p: SquadPlayer) => ({
                number: p.dorsal, isGoalie: !!p.isGoalie,
                personId: p.id, nombre: p.nombre, apodo: p.apodo || ''
              })))
              setPendientes(squad.filter(p => !p.dorsal.trim()))

              // El cuerpo tecnico no pertenece a una serie: es del club. Se
              // suma aparte para que sus NOMBRES lleguen a la banca y al acta,
              // en vez del generico "Director Tecnico".
              const staff = club.personas.filter(p => !p.retirado && STAFF.includes(p.rol))
              setStaffCitado(staff.map(p => ({
                number: p.rol.toUpperCase(), isGoalie: false, rol: p.rol,
                personId: p.id, nombre: p.nombre, apodo: p.apodo || ''
              })))
              const cargadas = Math.min(conNumero.length, MAX_ENTRIES)
              if (conNumero.length > MAX_ENTRIES) {
                toast.warning(
                  `La serie tiene ${conNumero.length} con número y el tope es ${MAX_ENTRIES}: ` +
                  `quedaron fuera ${conNumero.length - MAX_ENTRIES}.`, { duration: 9000 })
              }
              toast.success(`${cargadas} camisetas cargadas`)
            }}
            defaultValue=""
            className="flex-1 h-8 bg-zinc-800 border border-zinc-600 rounded text-xs font-bold px-2">
            <option value="" disabled>Cargar serie…</option>
            {seriesOf(club).map(se => {
              const n = squadOf(club, se.id).length
              return <option key={se.id} value={se.id}>{serieLabel(se)}{n ? ` (${n})` : ' — vacía'}</option>
            })}
          </select>
        </div>
        )}

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder="Ej: 7   ·   o varios: 7 9 12"
            inputMode="numeric"
            autoFocus
            className="h-12 bg-zinc-800 border-zinc-600 text-center text-xl font-black"
          />
          <Button onClick={add} className="h-12 px-4 font-black bg-green-700 hover:bg-green-600">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[140px] py-1">
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-10">
              Sin camisetas cargadas.<br />
              <span className="text-xs">Si lo dejas vacío se genera el plantel genérico.</span>
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {entries.map(e => (
                <div key={e.number} className="relative">
                  {editing === e.number ? (
                    <input
                      autoFocus
                      defaultValue={e.number}
                      onBlur={ev => rename(e.number, ev.target.value)}
                      onKeyDown={ev => {
                        if (ev.key === 'Enter') rename(e.number, (ev.target as HTMLInputElement).value)
                        if (ev.key === 'Escape') setEditing(null)
                      }}
                      inputMode="numeric"
                      className="w-full h-16 rounded-xl bg-zinc-800 border-2 border-white text-center text-xl font-black outline-none"
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => toggleGoalie(e.number)}
                        onDoubleClick={() => setEditing(e.number)}
                        className={`w-full h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${
                          e.isGoalie
                            ? 'border-green-400 bg-green-950/50 ring-2 ring-green-500/40'
                            : accent === 'blue'
                              ? 'border-blue-700 bg-blue-950/40 hover:border-blue-400'
                              : 'border-amber-700 bg-amber-950/40 hover:border-amber-400'
                        }`}
                        title="Tocar: portero · Doble toque o lápiz: cambiar número"
                      >
                        <span className="font-black text-xl leading-none">{e.number}</span>
                        {/* El apodo es lo que va a ver el jugador en la pantalla
                            cuando marque. Se muestra chico aca solo para saber
                            quien lo tiene y quien no. */}
                        {e.apodo && (
                          <span className="text-[8px] font-bold text-zinc-300 truncate max-w-full px-1 mt-0.5">
                            {e.apodo}
                          </span>
                        )}
                        {e.isGoalie && !e.apodo && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black text-green-400 mt-0.5">
                            <Shield className="w-2.5 h-2.5" /> PO
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(e.number)}
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-zinc-700 hover:bg-zinc-600 border border-zinc-400 flex items-center justify-center"
                        title="Cambiar número">
                        <Pencil className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button
                        onClick={() => setApodoDe(e.number)}
                        className={`absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-black ${
                          e.apodo ? 'bg-emerald-700 border-emerald-400 text-white'
                                  : 'bg-zinc-800 border-zinc-500 text-zinc-400 hover:bg-zinc-700'}`}
                        title={e.apodo ? `Apodo: ${e.apodo}` : 'Poner apodo para la pantalla'}>
                        A
                      </button>
                      <button
                        onClick={() => remove(e.number)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-700 hover:bg-red-600 border border-red-400 flex items-center justify-center"
                        title="Quitar">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {(() => {
          const dup = entries.filter((e, i) => entries.findIndex(x => x.number === e.number) !== i)
          if (dup.length === 0) return null
          return (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg p-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-200 leading-snug">
                Hay camisetas repetidas ({dup.map(d => d.number).join(', ')}). El motor de tarjetas no
                puede distinguirlas: las sanciones de una se le acumularían a la otra.
              </p>
            </div>
          )
        })()}

        <div className="text-[11px] text-center font-bold">
          {entries.length === 0 ? (
            <span className="text-zinc-600">Plantel genérico</span>
          ) : goalies === 0 ? (
            <span className="text-amber-400">
              Sin portero marcado — se tomará el primero ({entries[0].number})
            </span>
          ) : (
            <span className="text-zinc-400">
              {entries.length}/{MAX_ENTRIES} camisetas · {goalies}/{MAX_GOALIES} porteros
              {entries.length === MAX_ENTRIES && goalies === MAX_GOALIES && ' · plantel completo'}
            </span>
          )}
        </div>

        {/* ── DEL PLANTEL, SIN NUMERO EN ESTA SERIE ──────────────────────────
            No se descartan: se muestran para poder sumarlas con un numero de
            este partido. Es el caso de una jugadora que sube de categoria. */}
        {pendientes.length > 0 && (
          <div className="bg-zinc-950 border border-amber-900/60 rounded-lg p-2">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5">
              Sin número en esta serie
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pendientes.map(p => (
                <button key={p.id}
                  onClick={() => {
                    if (entries.length >= MAX_ENTRIES) { toast.warning(`Tope de ${MAX_ENTRIES} fichas`); return }
                    const libre = String(
                      Array.from({ length: 99 }, (_, i) => i + 1)
                        .find(n => !entries.some(e => e.number === String(n))) ?? ''
                    )
                    setEntries(prev => [...prev, {
                      number: libre, isGoalie: !!p.isGoalie,
                      personId: p.id, nombre: p.nombre, apodo: p.apodo || ''
                    }])
                    setPendientes(prev => prev.filter(x => x.id !== p.id))
                    toast.success(`${p.nombre} entra con el ${libre}. Puedes cambiarlo.`)
                  }}
                  className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 hover:border-amber-500 active:scale-95 transition-transform touch-manipulation rounded px-2 py-1">
                  <Plus className="w-3 h-3 text-amber-500" />
                  <span className="text-[11px] font-bold text-zinc-200">{p.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* El numero de este partido no toca la ficha salvo que se pida. */}
        {serieCargada && (
          <button onClick={() => setGuardarNumeros(v => !v)}
            className="w-full flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-left touch-manipulation">
            <span className={`w-9 h-5 rounded-full shrink-0 relative transition-colors ${guardarNumeros ? 'bg-green-600' : 'bg-zinc-700'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${guardarNumeros ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-zinc-200">Guardar estos números en el plantel</span>
              <span className="block text-[10px] text-zinc-500 leading-snug">
                Déjalo apagado para un amistoso: los números quedan sólo en este partido.
              </span>
            </span>
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => { setEntries(DEFAULT_ENTRIES.map(e => ({ ...e }))); toast.success('Camisetas por defecto') }}
            variant="outline" className="h-11 font-bold border-zinc-600 text-xs">
            <RotateCcw className="w-4 h-4 mr-1.5" /> DEFECTO
          </Button>
          <Button onClick={() => setEntries([])} variant="outline"
            disabled={entries.length === 0}
            className="h-11 font-bold border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-30 text-xs">
            <Trash2 className="w-4 h-4 mr-1.5" /> VACIAR
          </Button>
          <Button onClick={() => { persistirCambios(); onSave([...entries, ...staffCitado]); onClose() }}
            className="h-11 font-black bg-green-700 hover:bg-green-600 text-xs">
            <Check className="w-4 h-4 mr-1.5" /> GUARDAR
          </Button>
        </div>
        {/* ── APODO ────────────────────────────────────────────────────────
            Se escribe una vez y queda. Es editable hasta el pitazo inicial;
            despues del play queda congelado para ese partido. */}
        <Dialog open={!!apodoDe} onOpenChange={o => { if (!o) setApodoDe(null) }}>
          <DialogContent className="bg-zinc-900 border-2 border-emerald-800 text-white max-w-sm" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-base font-black">
                Ficha del <span className="text-emerald-400">#{apodoDe}</span>
              </DialogTitle>
              <p className="text-[11px] text-zinc-500 leading-snug">
                El nombre va al acta; el apodo, a la pantalla cuando marca. Si
                dejas el apodo vacío, la animación muestra sólo el dorsal.
              </p>
            </DialogHeader>

            <div className="space-y-2">
              <div>
                <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nombre</Label>
                <Input
                  autoFocus
                  defaultValue={entries.find(e => e.number === apodoDe)?.nombre || ''}
                  placeholder="Nombre y apellido"
                  onKeyDown={ev => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
                  onBlur={ev => {
                    const v = ev.target.value.trim()
                    setEntries(prev => prev.map(e => e.number === apodoDe ? { ...e, nombre: v } : e))
                  }}
                  className="h-11 mt-1 bg-zinc-800 border-zinc-600 text-sm font-bold"
                />
              </div>
              <div>
                <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Apodo <span className="text-zinc-600 font-normal">· máx. {APODO_MAX}</span>
                </Label>
                <Input
                  maxLength={APODO_MAX}
                  defaultValue={entries.find(e => e.number === apodoDe)?.apodo || ''}
                  placeholder="Ej: Pascu"
                  onKeyDown={ev => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
                  onBlur={ev => {
                    const v = ev.target.value.trim().slice(0, APODO_MAX)
                    setEntries(prev => prev.map(e => e.number === apodoDe ? { ...e, apodo: v } : e))
                  }}
                  className="h-12 mt-1 bg-zinc-800 border-zinc-600 text-center text-lg font-black"
                />
              </div>
              <Button onClick={() => setApodoDe(null)}
                className="w-full h-10 font-black bg-emerald-700 hover:bg-emerald-600">LISTO</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
