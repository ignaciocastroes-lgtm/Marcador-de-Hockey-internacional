"use client"

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Users, Download, Upload, Plus, Trash2, Check, FileText, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { bootClub } from '@/lib/club-boot'
import {
  saveClub, seriesOf, squadOf, assignDorsal, matchRows, applyRows,
  type ClubStore, type SquadPlayer, type RowMatch
} from '@/lib/club-store'
import {
  parsePlantelCSV, buildPlantelCSV, APODO_MAX,
  type PersonRow
} from '@/lib/roster-csv'
import { issuePersonId } from '@/lib/identity'

/**
 * DESARROLLO DE PLANTELES
 *
 * El ambiente donde se construye la base de jugadores, semana a semana. No
 * pretende abarcar una liga: es la herramienta de UN club. El dia que la liga
 * traiga su propia base, enlazar sera mapear sus identificadores contra los
 * `personId`, que son estables y no se reasignan nunca — por eso se decidieron
 * asi desde el principio.
 *
 * Tres caminos hacia el mismo lugar, y el operador elige segun lo que tenga a
 * mano: escribir a mano, importar un CSV, o bajar la plantilla y llenarla.
 */

interface Props {
  open: boolean
  onClose: () => void
}

const descargar = (texto: string, nombre: string) => {
  const blob = new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  URL.revokeObjectURL(a.href)
}

export function RosterLabModal({ open, onClose }: Props) {
  const [club, setClub] = useState<ClubStore | null>(null)
  const [serieId, setSerieId] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoDorsal, setNuevoDorsal] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<RowMatch[] | null>(null)

  useEffect(() => {
    if (!open) return
    const c = bootClub()
    setClub(c)
    setSerieId(prev => prev || seriesOf(c)[0]?.id || '')
  }, [open])

  if (!club) return null

  const series = seriesOf(club)
  const squad: SquadPlayer[] = serieId ? squadOf(club, serieId) : []

  const guardar = (c: ClubStore) => { setClub(c); saveClub(c) }

  // ── Alta manual ────────────────────────────────────────────────────────
  const agregar = () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) { toast.warning('Escribe el nombre'); return }
    if (!serieId) { toast.warning('Elige una serie'); return }

    const { id, next } = issuePersonId(club.identity)
    let c: ClubStore = {
      ...club,
      identity: next,
      personas: [...club.personas, {
        id, nombre, apodo: '', rol: 'jugador', isGoalie: false, doc: ''
      }]
    }
    const r = assignDorsal(c, serieId, id, nuevoDorsal.trim())
    if (!r.ok) { toast.warning(r.error!); return }
    guardar(r.club!)
    setNuevoNombre(''); setNuevoDorsal('')
    toast.success(`${nombre} agregada como ${id}`)
  }

  const cambiarDorsal = (personId: string, dorsal: string) => {
    const r = assignDorsal(club, serieId, personId, dorsal)
    if (!r.ok) { toast.warning(r.error!); return }
    guardar(r.club!)
  }

  const cambiarApodo = (personId: string, apodo: string) =>
    guardar({
      ...club,
      personas: club.personas.map(p =>
        p.id === personId ? { ...p, apodo: apodo.trim().slice(0, APODO_MAX) } : p)
    })

  const sacarDeSerie = (personId: string) =>
    guardar({
      ...club,
      series: { ...club.series, [serieId]: (club.series[serieId] || []).filter(m => m.personId !== personId) }
    })

  // ── Plantilla e ingesta ────────────────────────────────────────────────
  const bajarPlantilla = () => {
    const ejemplo: PersonRow[] = [
      { id: '', nombre: 'Nombre Apellido', apodo: 'Apodo', rol: 'jugador', isGoalie: false, doc: '' },
      { id: '', nombre: 'Otra Jugadora', apodo: '', rol: 'portero', isGoalie: true, doc: '' },
    ]
    descargar(
      buildPlantelCSV(ejemplo, { club: club.nombre, clubId: club.identity.clubId }),
      'ardi-plantilla-plantel.csv'
    )
    toast.success('Plantilla descargada. Llénala y vuelve a importarla.')
  }

  const exportar = () => {
    descargar(
      buildPlantelCSV(club.personas, { club: club.nombre, clubId: club.identity.clubId }),
      `ardi-plantel-${club.identity.prefix.toLowerCase()}.csv`
    )
  }

  const importar = (file: File) => {
    const lector = new FileReader()
    lector.onload = () => {
      const { rows, issues } = parsePlantelCSV(String(lector.result || ''))
      issues.forEach(i => toast.warning(i.fila ? `Fila ${i.fila}: ${i.motivo}` : i.motivo, { duration: 8000 }))
      if (rows.length === 0) return
      // Nada se aplica sin que el operador vea qué reconoció y qué no.
      setPendiente(matchRows(club, rows))
    }
    lector.readAsText(file)
  }

  const aplicar = () => {
    if (!pendiente) return
    guardar(applyRows(club, pendiente))
    const nuevas = pendiente.filter(m => m.kind === 'nueva').length
    const conocidas = pendiente.length - nuevas
    setPendiente(null)
    toast.success(`${conocidas} actualizadas, ${nuevas} nuevas`)
  }

  const dudosas = pendiente?.filter(m => m.kind === 'ambigua').length ?? 0

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setPendiente(null); onClose() } }}>
      <DialogContent className="bg-zinc-900 border-2 border-amber-800 text-white max-w-2xl max-h-[92vh] p-0 flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="p-4 pb-3 border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Users className="w-5 h-5 text-amber-400" /> Planteles
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 leading-snug">
            La base de jugadores del club. Se llena de a poco: a mano, importando
            un archivo, o bajando la plantilla y devolviéndola llena.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* ── Revisión de una importación ─────────────────────────────── */}
          {pendiente ? (
            <>
              <div className="bg-zinc-950 border border-blue-800 rounded-lg p-3">
                <p className="text-sm font-black text-blue-300 mb-1">Revisa antes de aplicar</p>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {pendiente.filter(m => m.kind !== 'nueva' && m.kind !== 'ambigua').length} reconocidas ·{' '}
                  {pendiente.filter(m => m.kind === 'nueva').length} nuevas
                  {dudosas > 0 && <> · <b className="text-amber-400">{dudosas} dudosas</b></>}
                </p>
              </div>

              <div className="space-y-1">
                {pendiente.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5">
                    <span className="flex-1 text-[12px] font-bold text-zinc-200 truncate">{m.row.nombre}</span>
                    {m.kind === 'ambigua' ? (
                      <span className="text-[10px] font-black text-amber-400">
                        {m.candidatas?.length} coincidencias — se omite
                      </span>
                    ) : (
                      <span className={`text-[10px] font-black ${m.kind === 'nueva' ? 'text-green-400' : 'text-zinc-500'}`}>
                        {m.kind === 'nueva' ? 'NUEVA' : m.target?.id}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {dudosas > 0 && (
                <p className="text-[11px] text-amber-400 leading-snug">
                  Las dudosas no se aplican: hay más de una persona con ese nombre.
                  Cámbiales el nombre en el archivo o agrégales la columna <code>id</code>.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setPendiente(null)} variant="outline" className="h-11 font-bold border-zinc-600">
                  CANCELAR
                </Button>
                <Button onClick={aplicar} className="h-11 font-black bg-green-700 hover:bg-green-600">
                  <Check className="w-4 h-4 mr-1.5" /> APLICAR
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* ── Serie ───────────────────────────────────────────────── */}
              <div>
                <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Serie</Label>
                <select value={serieId} onChange={e => setSerieId(e.target.value)}
                  className="w-full h-10 mt-1 bg-zinc-800 border border-zinc-600 rounded text-sm font-bold px-2">
                  {series.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({squadOf(club, s.id).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Alta a mano ─────────────────────────────────────────── */}
              <div className="flex gap-2">
                <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') agregar() }}
                  placeholder="Nombre y apellido"
                  className="flex-1 h-10 bg-zinc-950 border-zinc-700 text-sm" />
                <Input value={nuevoDorsal} onChange={e => setNuevoDorsal(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  onKeyDown={e => { if (e.key === 'Enter') agregar() }}
                  placeholder="Nº"
                  className="w-16 h-10 bg-zinc-950 border-zinc-700 text-sm text-center font-black" />
                <Button onClick={agregar} className="h-10 px-3 font-black bg-amber-700 hover:bg-amber-600">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* ── El plantel de esa serie ─────────────────────────────── */}
              {squad.length === 0 ? (
                <p className="text-[12px] text-zinc-600 text-center py-6 leading-snug">
                  Esta serie está vacía. Agrega a alguien arriba, o importa un
                  archivo con el plantel completo.
                </p>
              ) : (
                <div className="space-y-1">
                  {squad.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5">
                      <Input
                        defaultValue={p.dorsal}
                        onBlur={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); if (v !== p.dorsal) cambiarDorsal(p.id, v) }}
                        className="w-12 h-8 bg-zinc-900 border-zinc-700 text-center font-black text-sm px-1"
                        placeholder="—"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-[12px] font-bold text-zinc-100 truncate">{p.nombre}</span>
                        <span className="block text-[9px] text-zinc-600 font-mono">{p.id}</span>
                      </div>

                      {editando === p.id ? (
                        <Input autoFocus defaultValue={p.apodo} maxLength={APODO_MAX}
                          placeholder="Apodo"
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          onBlur={e => { cambiarApodo(p.id, e.target.value); setEditando(null) }}
                          className="w-24 h-8 bg-zinc-900 border-zinc-700 text-center text-[11px]" />
                      ) : (
                        <button onClick={() => setEditando(p.id)}
                          title="Apodo para la pantalla"
                          className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-white w-24 justify-center">
                          <span className="truncate">{p.apodo || 'sin apodo'}</span>
                          <Pencil className="w-2.5 h-2.5 opacity-60 shrink-0" />
                        </button>
                      )}

                      <button onClick={() => sacarDeSerie(p.id)}
                        title="Sacar de esta serie (no borra a la persona)"
                        className="text-zinc-600 hover:text-red-400 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!pendiente && (
          <div className="border-t border-zinc-800 p-3 grid grid-cols-3 gap-2 bg-zinc-950">
            <Button onClick={bajarPlantilla} variant="outline" className="h-11 text-[10px] font-bold border-zinc-600">
              <FileText className="w-4 h-4 mr-1" /> PLANTILLA
            </Button>
            <label className="h-11 flex items-center justify-center rounded-md border border-zinc-600 text-[10px] font-bold cursor-pointer hover:bg-zinc-900">
              <Upload className="w-4 h-4 mr-1" /> IMPORTAR
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
            </label>
            <Button onClick={exportar} variant="outline" className="h-11 text-[10px] font-bold border-zinc-600">
              <Download className="w-4 h-4 mr-1" /> EXPORTAR
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
