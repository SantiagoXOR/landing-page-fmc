'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { toast } from 'sonner'
import {
  ArrowLeft,
  MessageCircle,
  Radio,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
} from 'lucide-react'
import {
  DEFAULT_REMARKETING_TEMPLATE_ID,
  getRemarketingTemplatesForUi,
  formatRemarketingPreview,
} from '@/lib/remarketing-templates'
import { BROADCAST_STAGE_OPTIONS } from '@/lib/pipeline-stage-map'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BroadcastJob {
  id: string
  template_id: string
  status: string
  total_count: number
  sent_count: number
  failed_count: number
  skipped_count: number
  created_at: string
  completed_at: string | null
}

interface BroadcastItem {
  id: string
  lead_nombre: string | null
  telefono: string | null
  status: string
  message_id: string | null
  error_message: string | null
  processed_at: string | null
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendiente', variant: 'secondary' },
    processing: { label: 'Enviando…', variant: 'default' },
    completed: { label: 'Completada', variant: 'outline' },
    cancelled: { label: 'Cancelada', variant: 'secondary' },
    failed: { label: 'Fallida', variant: 'destructive' },
  }
  const cfg = map[status] || { label: status, variant: 'outline' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function itemIcon(status: string) {
  if (status === 'sent') return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-600 shrink-0" />
  if (status === 'skipped') return <SkipForward className="h-4 w-4 text-amber-600 shrink-0" />
  return <AlertCircle className="h-4 w-4 text-gray-400 shrink-0" />
}

export default function RemarketingBroadcastPage() {
  const templates = getRemarketingTemplatesForUi()
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_REMARKETING_TEMPLATE_ID)
  const [selectedStageId, setSelectedStageId] = useState('preaprobado')
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({})
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [recentJobs, setRecentJobs] = useState<BroadcastJob[]>([])
  const [activeJob, setActiveJob] = useState<BroadcastJob | null>(null)
  const [logItems, setLogItems] = useState<BroadcastItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const cancelRef = useRef(false)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const selectedStageLabel =
    BROADCAST_STAGE_OPTIONS.find((s) => s.id === selectedStageId)?.label || selectedStageId
  const targetCount = stageCounts[selectedStageId] ?? null

  const loadStageCounts = useCallback(async () => {
    setLoadingPreview(true)
    try {
      const res = await fetch('/api/pipeline/remarketing/broadcast?preview=stages')
      if (!res.ok) throw new Error('No se pudo cargar etapas')
      const data = await res.json()
      const counts: Record<string, number> = {}
      for (const stage of data.stages || []) {
        counts[stage.id] = stage.count ?? 0
      }
      setStageCounts(counts)
    } catch {
      setStageCounts({})
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const loadRecentJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/remarketing/broadcast')
      if (res.ok) {
        const data = await res.json()
        setRecentJobs(data.jobs || [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadStageCounts()
    loadRecentJobs()
  }, [loadStageCounts, loadRecentJobs])

  const refreshJobDetail = async (jobId: string) => {
    const res = await fetch(`/api/pipeline/remarketing/broadcast/${jobId}`)
    if (!res.ok) return null
    const data = await res.json()
    setActiveJob(data.job)
    setLogItems(data.items || [])
    return data.job as BroadcastJob
  }

  const processUntilDone = async (jobId: string) => {
    cancelRef.current = false
    setIsRunning(true)

    try {
      let done = false
      while (!done && !cancelRef.current) {
        const res = await fetch(`/api/pipeline/remarketing/broadcast/${jobId}/process`, {
          method: 'POST',
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Error al procesar lote')
        }
        const data = await res.json()
        setActiveJob(data.job)
        if (data.items?.length) {
          setLogItems((prev) => {
            const ids = new Set(prev.map((i) => i.id))
            const merged = [...data.items.filter((i: BroadcastItem) => !ids.has(i.id)), ...prev]
            return merged.slice(0, 200)
          })
        }
        done = data.done === true
        if (!done) {
          await new Promise((r) => setTimeout(r, 400))
        }
      }

      await refreshJobDetail(jobId)
      await loadRecentJobs()
      if (!cancelRef.current) {
        toast.success('Campaña finalizada')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error en el envío')
    } finally {
      setIsRunning(false)
    }
  }

  const handleStart = async () => {
    if (!targetCount || targetCount === 0) {
      toast.error(`No hay contactos en etapa ${selectedStageLabel}`)
      return
    }

    try {
      setIsRunning(true)
      const res = await fetch('/api/pipeline/remarketing/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          stageId: selectedStageId,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'No se pudo crear la campaña')
      }
      const data = await res.json()
      setActiveJob(data.job)
      setLogItems([])
      toast.info(`Encolados ${data.job.total_count} contactos`)
      await processUntilDone(data.job.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error')
      setIsRunning(false)
    }
  }

  const handleCancel = async () => {
    if (!activeJob) return
    cancelRef.current = true
    try {
      await fetch(`/api/pipeline/remarketing/broadcast/${activeJob.id}`, { method: 'DELETE' })
      toast.info('Campaña cancelada')
      await refreshJobDetail(activeJob.id)
    } catch {
      toast.error('No se pudo cancelar')
    }
  }

  const progressPct =
    activeJob && activeJob.total_count > 0
      ? Math.round(
          ((activeJob.sent_count + activeJob.failed_count + activeJob.skipped_count) /
            activeJob.total_count) *
            100
        )
      : 0

  return (
    <PermissionGuard permission="pipeline:write">
      <div className="space-y-6">
        <Header title="Broadcast Remarketing" />

        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <Link href="/pipeline" className="inline-flex items-center hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al pipeline
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-emerald-600" />
                Nueva campaña
              </CardTitle>
              <CardDescription>
                Enviá una plantilla WhatsApp a <strong>todos los contactos de una etapa</strong> del
                pipeline. No hace falta moverlos uno por uno a Remarketing. Cola: ~5 por lote, 800 ms
                entre mensajes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Etapa del pipeline</p>
                <Select
                  value={selectedStageId}
                  onValueChange={setSelectedStageId}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {BROADCAST_STAGE_OPTIONS.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.label}
                        {stageCounts[stage.id] != null ? ` (${stageCounts[stage.id]})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border bg-muted/40 p-4">
                {loadingPreview ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <p className="text-lg font-semibold">
                    {targetCount ?? '—'} contacto{targetCount === 1 ? '' : 's'} en{' '}
                    {selectedStageLabel}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Se envía a todos los leads de esa columna en Ventas. Meta limita ~250 usuarios
                  únicos/día al inicio; campañas grandes pueden requerir varios días o tier superior.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Plantilla WhatsApp</p>
                {templates.map((template) => {
                  const isSelected = selectedTemplateId === template.id
                  return (
                    <Button
                      key={template.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      disabled={isRunning}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className="justify-start text-left h-auto py-3 px-4 w-full"
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{template.label}</span>
                        <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {template.description}
                        </span>
                      </div>
                    </Button>
                  )
                })}
              </div>

              {selectedTemplate && (
                <div className="p-4 bg-gray-50 rounded-md border">
                  <div className="text-sm font-semibold mb-2">Vista previa</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {formatRemarketingPreview(selectedTemplate.preview, 'Cliente')}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  className="flex-1"
                  disabled={isRunning || !targetCount}
                  onClick={handleStart}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {isRunning ? 'Enviando…' : 'Iniciar broadcast'}
                </Button>
                {isRunning && activeJob && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progreso y logs</CardTitle>
              <CardDescription>
                Cada contacto queda registrado (enviado, omitido o error). Los mensajes también aparecen
                en Chats.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeJob ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(activeJob.status)}
                    <span className="text-sm text-muted-foreground">
                      {activeJob.sent_count} enviados · {activeJob.failed_count} errores ·{' '}
                      {activeJob.skipped_count} omitidos · {activeJob.total_count} total
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Iniciá una campaña para ver el progreso en tiempo real.
                </p>
              )}

              <div className="max-h-80 overflow-y-auto border rounded-md divide-y">
                {logItems.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Sin registros aún.</p>
                ) : (
                  logItems.map((item) => (
                    <div key={item.id} className="p-3 flex gap-2 text-sm">
                      {itemIcon(item.status)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {item.lead_nombre || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.telefono || '—'}
                          {item.error_message ? ` · ${item.error_message}` : ''}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {item.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {recentJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Campañas recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Fecha</th>
                      <th className="pb-2 pr-4">Plantilla</th>
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2 pr-4">Resultado</th>
                      <th className="pb-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job) => (
                      <tr key={job.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          {new Date(job.created_at).toLocaleString('es-AR')}
                        </td>
                        <td className="py-2 pr-4">{job.template_id}</td>
                        <td className="py-2 pr-4">{statusBadge(job.status)}</td>
                        <td className="py-2 pr-4">
                          {job.sent_count}/{job.total_count} OK
                          {job.failed_count > 0 ? ` · ${job.failed_count} err` : ''}
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => refreshJobDetail(job.id)}
                          >
                            Ver logs
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionGuard>
  )
}
