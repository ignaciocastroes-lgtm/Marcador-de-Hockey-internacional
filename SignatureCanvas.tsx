"use client"

import { useState, useRef } from 'react'
import { Trash2, X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ===== COMPONENTE DE FIRMA DIGITAL =====
export interface SignatureCanvasProps {
  onSave: (signature: string) => void
  onCancel: () => void
  title: string
}

export function SignatureCanvas({ onSave, onCancel, title }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    // El canvas se dibuja a 400x200 pero se renderiza con w-full: hay que
    // escalar o el trazo queda corrido respecto del dedo.
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasDrawn(false)
    }
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (canvas && hasDrawn) {
      onSave(canvas.toDataURL('image/png'))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl p-4 w-full max-w-lg">
        <h2 className="text-xl font-black text-yellow-400 text-center mb-4">{title}</h2>
        <div className="border-2 border-zinc-600 rounded-lg bg-zinc-950 mb-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <p className="text-zinc-500 text-sm text-center mb-4">Firme con el dedo o mouse en el area</p>
        <div className="flex gap-3">
          <Button onClick={clearCanvas} variant="outline" className="flex-1 border-zinc-600">
            <Trash2 className="w-4 h-4 mr-2" /> Limpiar
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1 border-zinc-600">
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={saveSignature} disabled={!hasDrawn} className="flex-1 bg-green-600 hover:bg-green-500">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
