'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download,
  Users,
  CalendarDays,
  Layers,
  Trophy,
  Clock,
  AlertTriangle,
  MessageCircle,
  MessageSquareOff,
  GitBranch,
  Banknote,
  Percent,
  Timer,
} from 'lucide-react'
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker'
import { LeadsByOriginChart } from '@/components/reports/LeadsByOriginChart'
import { LeadsByStatusChart } from '@/components/reports/LeadsByStatusChart'
import { LeadsByDayChart } from '@/components/reports/LeadsByDayChart'
import { EmbudoResumenChart } from '@/components/reports/EmbudoResumenChart'
import { ReportFiltersBar, type ReportFiltersState } from '@/components/reports/ReportFiltersBar'
import { ReportInsights } from '@/components/reports/ReportInsights'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_GANADO = 'CERRADO_GANADO'

function defaultFilters(): ReportFiltersState {
  return {
    origen: '',
    estado: '',
    zona: '',
    agencia: '',
    tag: '',
    q: '',
    dailyGoal: '',
  }
}

function buildAnalyticsParams(
  dateRange: DateRange,
  filters: ReportFiltersState
): URLSearchParams {
  const params = new URLSearchParams()
  if (!dateRange.from || !dateRange.to) return params
  params.set('from', dateRange.from.toISOString())
  params.set('to', dateRange.to.toISOString())
  if (filters.origen) params.set('origen', filters.origen)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.zona) params.set('zona', filters.zona)
  if (filters.agencia.trim()) params.set('agencia', filters.agencia.trim())
  if (filters.tag.trim()) params.set('tag', filters.tag.trim())
  if (filters.q.trim()) params.set('q', filters.q.trim())
  const g = parseFloat(filters.dailyGoal)
  if (Number.isFinite(g) && g > 0) params.set('dailyGoal', String(g))
  return params
}

function escapeCsvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function ReportsPage() {
  const [payload, setPayload] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFiltersState>(defaultFilters)
  const [debouncedText, setDebouncedText] = useState({ q: '', tag: '', agencia: '' })

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(today)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    return { from: startOfWeek, to: today }
  })

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedText({
        q: filters.q.trim(),
        tag: filters.tag.trim(),
        agencia: filters.agencia.trim(),
      })
    }, 400)
    return () => clearTimeout(t)
  }, [filters.q, filters.tag, filters.agencia])

  const filtersForQuery = useMemo(
    () => ({
      origen: filters.origen,
      estado: filters.estado,
      zona: filters.zona,
      dailyGoal: filters.dailyGoal,
      q: debouncedText.q,
      tag: debouncedText.tag,
      agencia: debouncedText.agencia,
    }),
    [
      filters.origen,
      filters.estado,
      filters.zona,
      filters.dailyGoal,
      debouncedText.q,
      debouncedText.tag,
      debouncedText.agencia,
    ]
  )

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      if (!dateRange.from || !dateRange.to) return
      const params = buildAnalyticsParams(dateRange, filtersForQuery)
      const response = await fetch(`/api/reports/leads-analytics?${params}`)
      if (!response.ok) {
        const j = await response.json().catch(() => ({}))
        throw new Error(j.message || 'Error al cargar analíticas')
      }
      const data = await response.json()
      setPayload(data)
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Error al cargar los datos')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [dateRange, filtersForQuery])

  useEffect(() => {
    if (dateRange.from && dateRange.to) fetchAnalytics()
  }, [dateRange, filtersForQuery, fetchAnalytics])

  const exportTxt = () => {
    if (!payload || !dateRange.from || !dateRange.to) return
    const s = payload.summary
    const dateRangeStr =
      dateRange.from.getTime() === dateRange.to.getTime()
        ? format(dateRange.from, 'dd/MM/yyyy', { locale: es })
        : `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`

    const lines = [
      'REPORTE DE LEADS (analíticas)',
      `Período: ${dateRangeStr}`,
      `Filtros: ${JSON.stringify(filtersForQuery)}`,
      `Generado: ${new Date().toLocaleString('es-AR')}`,
      '',
      'RESUMEN',
      `Total leads período: ${s.totalLeads}`,
      `Promedio diario: ${s.promedioDiario}`,
      `Backlog inicio / fin (embudo): ${s.backlogInicio} / ${s.backlogFin}`,
      `NUEVO >24h / >72h (ref. fin rango): ${s.nuevoMas24h} / ${s.nuevoMas72h}`,
      `Tasa salida de NUEVO (en período): ${s.tasaSalidaNuevo}%`,
      `Con conversación / sin: ${s.leadsConConversacion} / ${s.leadsSinConversacion}`,
      `Pipeline avanzado pero CRM NUEVO: ${s.pipelineEstadoNuevoPeroAvanzado}`,
      `Operaciones cerradas: ${s.operacionesCerradas}; tasa éxito: ${s.tasaExitoCierres ?? '—'}%`,
      `Leads en trabajo calificado (snapshot): ${s.qualifiedActivos}`,
      `Valor total (monto): ${s.valorTotal}; con monto: ${s.valorConMonto}`,
      `Días prom. hasta cierre (aprox.): ${s.diasPromedioHastaCierre ?? '—'}`,
      `Horas prom. 1ª respuesta saliente: ${s.horasPromedioPrimeraRespuesta ?? '—'}`,
      '',
      'INSIGHTS',
      ...((payload.insights as string[]) || []).map((x) => `- ${x}`),
      '',
      'LEADS POR ORIGEN',
      ...Object.entries(payload.leadsPorOrigen || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([k, v]) => `${k}: ${v}`),
      '',
      'VALOR POR ORIGEN',
      ...Object.entries(s.valorPorOrigen || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([k, v]) => `${k}: $${v}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-leads-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportCsv = async () => {
    if (!dateRange.from || !dateRange.to) return
    const params = buildAnalyticsParams(dateRange, filtersForQuery)
    params.set('includeLeads', 'true')
    const response = await fetch(`/api/reports/leads-analytics?${params}`)
    if (!response.ok) return
    const data = await response.json()
    const rows = (data.leads || []) as Record<string, unknown>[]
    if (!rows.length) {
      window.alert('No hay filas para exportar con los filtros actuales.')
      return
    }
    const keys = Object.keys(rows[0])
    const body = [
      keys.map(escapeCsvCell).join(','),
      ...rows.map((r) => keys.map((k) => escapeCsvCell(r[k])).join(',')),
    ].join('\r\n')
    const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-detalle-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading && !payload) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <div className="text-center py-8 text-destructive">{error}</div>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <div className="text-center py-8 text-muted-foreground">Seleccioná un rango de fechas</div>
      </div>
    )
  }

  const s = payload.summary
  const meta = payload.meta
  const insights = (payload.insights as string[]) || []
  const dailyGoal = meta?.dailyGoal as number | undefined
  const leadsPorDia = payload.leadsPorDia || []
  const leadsPorDiaPrev = payload.leadsPorDiaSemanaAnterior || []

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Reportes</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-wrap">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button onClick={exportTxt} variant="outline" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Exportar TXT
            </Button>
            <Button onClick={exportCsv} variant="outline" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <ReportFiltersBar value={filters} onChange={setFilters} />
      </div>

      {insights.length > 0 && <ReportInsights lines={insights} />}

      {meta?.truncated && (
        <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Resultado truncado a 10.000 filas; ajustá el rango o los filtros para mayor precisión.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.totalLeads}</div>
            <p className="text-xs text-muted-foreground">Creados en el período (filtros aplicados)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio diario</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.promedioDiario}</div>
            <p className="text-xs text-muted-foreground">Alta en el rango</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En embudo</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.activosEnEmbudo}</div>
            <p className="text-xs text-muted-foreground">Sin cierre ganado / perdido / rechazado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cerrados ganados</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.cerradosGanados}</div>
            <p className="text-xs text-muted-foreground">{ESTADO_GANADO.replace(/_/g, ' ')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backlog embudo</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {s.backlogInicio} → {s.backlogFin}
            </div>
            <p className="text-xs text-muted-foreground">Inicio vs fin de rango (estimación)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NUEVO &gt;24h / &gt;72h</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {s.nuevoMas24h} / {s.nuevoMas72h}
            </div>
            <p className="text-xs text-muted-foreground">SLA primer contacto (ref. fin de rango)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salida de NUEVO</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.tasaSalidaNuevo}%</div>
            <p className="text-xs text-muted-foreground">Leads del período que ya no están NUEVO</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éxito en cierres</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {s.tasaExitoCierres != null ? `${s.tasaExitoCierres}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              Ganados / (ganados + perdidos + rechazados) en el período
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con conversación</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.leadsConConversacion}</div>
            <p className="text-xs text-muted-foreground">Lead vinculado a conversación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin conversación</CardTitle>
            <MessageSquareOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.leadsSinConversacion}</div>
            <p className="text-xs text-muted-foreground">En el período filtrado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CRM vs pipeline</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.pipelineEstadoNuevoPeroAvanzado}</div>
            <p className="text-xs text-muted-foreground">NUEVO en CRM pero etapa avanzada en tablero</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En calificación / trabajo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.qualifiedActivos}</div>
            <p className="text-xs text-muted-foreground">Estados tipo CALIFICADO, PROPUESTA, etc.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor total</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {s.valorTotal > 0
                ? `$${s.valorTotal.toLocaleString('es-AR')}`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Suma de montos declarados en el período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto promedio</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {s.valorPromedioConMonto != null
                ? `$${s.valorPromedioConMonto.toLocaleString('es-AR')}`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Solo leads con monto &gt; 0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días hasta cierre</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s.diasPromedioHastaCierre ?? '—'}</div>
            <p className="text-xs text-muted-foreground">Promedio createdAt→updatedAt (cierres)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">1ª respuesta</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {s.horasPromedioPrimeraRespuesta != null
                ? `${s.horasPromedioPrimeraRespuesta} h`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">1er mensaje saliente tras alta (aprox.)</p>
          </CardContent>
        </Card>
      </div>

      <EmbudoResumenChart
        nuevos={s.embudoNuevos}
        enSeguimiento={s.embudoSeguimiento}
        ganados={s.cerradosGanados}
        noConcretados={s.noConcretados}
        totalLeads={s.totalLeads}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadsByOriginChart data={payload.leadsPorOrigen || {}} totalLeads={s.totalLeads} />
        <LeadsByStatusChart data={payload.leadsPorEstado || {}} totalLeads={s.totalLeads} />
      </div>

      {(Object.keys(s.valorPorOrigen || {}).length > 0 ||
        Object.keys(s.productoPorOrigen || {}).length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.keys(s.valorPorOrigen || {}).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valor por origen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {Object.entries(s.valorPorOrigen as Record<string, number>)
                    .sort(([, a], [, b]) => b - a)
                    .map(([origen, val]) => (
                      <div
                        key={origen}
                        className="flex justify-between border-b border-border/60 pb-2"
                      >
                        <span className="text-muted-foreground">{origen}</span>
                        <span className="font-medium">${val.toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
          {Object.keys(s.productoPorOrigen || {}).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Producto (frecuencia en el período)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {(() => {
                    const flat: Record<string, number> = {}
                    for (const inner of Object.values(
                      s.productoPorOrigen as Record<string, Record<string, number>>
                    )) {
                      for (const [p, c] of Object.entries(inner)) {
                        flat[p] = (flat[p] || 0) + c
                      }
                    }
                    return Object.entries(flat)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 24)
                      .map(([producto, cnt]) => (
                        <div
                          key={producto}
                          className="flex justify-between border-b border-border/60 pb-2"
                        >
                          <span className="text-muted-foreground truncate pr-2">{producto}</span>
                          <span className="font-medium shrink-0">{cnt}</span>
                        </div>
                      ))
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <LeadsByDayChart
        data={leadsPorDia}
        comparisonData={leadsPorDiaPrev}
        comparisonLabel="Ventana previa (misma duración)"
        dailyGoal={dailyGoal}
      />
    </div>
  )
}
