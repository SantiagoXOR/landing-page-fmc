'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { PipelineStage } from '@/types/pipeline'
import { isRemarketingStageId } from '@/lib/remarketing-templates'

interface BulkStageMoveDialogProps {
  open: boolean
  fromStage: PipelineStage | null
  toStage: PipelineStage | null
  totalCount: number
  onClose: () => void
  onComplete: () => void
}

export function BulkStageMoveDialog({
  open,
  fromStage,
  toStage,
  totalCount,
  onClose,
  onComplete,
}: BulkStageMoveDialogProps) {
  const [running, setRunning] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [failed, setFailed] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setRunning(false)
      setProcessed(0)
      setFailed(0)
      setDone(false)
      setError(null)
    }
  }, [open])

  if (!open || !fromStage || !toStage || typeof window === 'undefined') {
    return null
  }

  const progressPercent =
    totalCount > 0 ? Math.min(100, Math.round((processed / totalCount) * 100)) : 0

  const startBulkMove = async () => {
    setRunning(true)
    setError(null)
    let totalProcessed = 0
    let totalFailed = 0
    let offset = 0

    try {
      while (true) {
        const response = await fetch('/api/pipeline/stages/bulk-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromStageId: fromStage.id,
            toStageId: toStage.id,
            offset,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || data.error || 'Error al mover leads')
        }

        totalProcessed += data.processed ?? 0
        totalFailed += data.failed ?? 0
        offset = data.nextOffset ?? totalProcessed + totalFailed
        setProcessed(totalProcessed)
        setFailed(totalFailed)

        if (data.done) {
          setDone(true)
          onComplete()
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setRunning(false)
    }
  }

  const toRemarketing = isRemarketingStageId(toStage.id)

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Mover todos los leads
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            {fromStage.name} → {toStage.name} ({totalCount} contacto
            {totalCount !== 1 ? 's' : ''})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {toRemarketing && !running && !done && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              No se enviará WhatsApp al mover. Para contactar masivamente, usá{' '}
              <strong>Broadcast WhatsApp</strong> después del movimiento.
            </p>
          )}

          {!running && !done && (
            <p className="text-sm text-muted-foreground">
              Se moverán en lotes de 25. Podés cerrar esta ventana solo antes de iniciar.
            </p>
          )}

          {(running || done) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {done ? 'Completado' : 'Procesando…'} {processed} / {totalCount}
                </span>
                {failed > 0 && (
                  <span className="text-destructive">{failed} fallidos</span>
                )}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            {!running && (
              <Button variant="outline" onClick={onClose}>
                {done ? 'Cerrar' : 'Cancelar'}
              </Button>
            )}
            {!running && !done && (
              <Button onClick={startBulkMove}>
                Mover {totalCount} leads
              </Button>
            )}
            {running && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moviendo…
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}
