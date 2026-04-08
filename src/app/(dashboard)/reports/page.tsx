'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Users, CalendarDays, Layers, Trophy } from 'lucide-react'
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker'
import { LeadsByOriginChart } from '@/components/reports/LeadsByOriginChart'
import { LeadsByStatusChart } from '@/components/reports/LeadsByStatusChart'
import { LeadsByDayChart } from '@/components/reports/LeadsByDayChart'
import { EmbudoResumenChart } from '@/components/reports/EmbudoResumenChart'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_GANADO = 'CERRADO_GANADO'
const ESTADOS_NO_CONCRETADOS = new Set(['CERRADO_PERDIDO', 'RECHAZADO'])
const ESTADO_NUEVO = 'NUEVO'

function diasEnRangoInclusive(from: Date, to: Date): number {
  const a = new Date(from)
  const b = new Date(to)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  const diff = Math.ceil((b.getTime() - a.getTime()) / 86400000)
  return Math.max(1, diff + 1)
}

interface ReportData {
  totalLeads: number
  leadsPorOrigen: Record<string, number>
  leadsPorEstado: Record<string, number>
  leadsPorDia: Array<{ fecha: string; cantidad: number }>
  promedioDiario: number
  activosEnEmbudo: number
  cerradosGanados: number
  noConcretados: number
  embudoNuevos: number
  embudoSeguimiento: number
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Inicializar con "Esta semana"
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(today)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    return {
      from: startOfWeek,
      to: today,
    }
  })

  const fetchReportData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!dateRange.from || !dateRange.to) {
        return
      }

      // Obtener leads del período
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        limit: '1000',
      })

      const response = await fetch(`/api/leads?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar los datos')
      }

      const { leads } = await response.json()

      // Procesar datos para reportes
      const reportData: ReportData = {
        totalLeads: leads.length,
        leadsPorOrigen: {},
        leadsPorEstado: {},
        leadsPorDia: [],
        promedioDiario: 0,
        activosEnEmbudo: 0,
        cerradosGanados: 0,
        noConcretados: 0,
        embudoNuevos: 0,
        embudoSeguimiento: 0,
      }

      // Contar por origen
      leads.forEach((lead: any) => {
        const origen = lead.origen || 'Sin origen'
        reportData.leadsPorOrigen[origen] = (reportData.leadsPorOrigen[origen] || 0) + 1
      })

      // Contar por estado
      leads.forEach((lead: any) => {
        reportData.leadsPorEstado[lead.estado] = (reportData.leadsPorEstado[lead.estado] || 0) + 1
      })

      const days = diasEnRangoInclusive(dateRange.from!, dateRange.to!)
      reportData.promedioDiario =
        leads.length > 0 ? Math.round((leads.length / days) * 10) / 10 : 0

      leads.forEach((lead: any) => {
        const e = lead.estado as string
        if (e === ESTADO_GANADO) {
          reportData.cerradosGanados += 1
        } else if (ESTADOS_NO_CONCRETADOS.has(e)) {
          reportData.noConcretados += 1
        } else if (e === ESTADO_NUEVO) {
          reportData.embudoNuevos += 1
        } else {
          reportData.embudoSeguimiento += 1
        }
      })

      reportData.activosEnEmbudo = reportData.embudoNuevos + reportData.embudoSeguimiento

      // Leads por día
      const leadsPorDiaMap: Record<string, number> = {}
      leads.forEach((lead: any) => {
        const fecha = new Date(lead.createdAt).toISOString().split('T')[0]
        leadsPorDiaMap[fecha] = (leadsPorDiaMap[fecha] || 0) + 1
      })

      reportData.leadsPorDia = Object.entries(leadsPorDiaMap)
        .map(([fecha, cantidad]) => ({ fecha, cantidad }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))

      setData(reportData)
    } catch (error: any) {
      console.error('Error fetching report data:', error)
      setError(error.message || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchReportData()
    }
  }, [dateRange])

  const exportReport = async () => {
    if (!data || !dateRange.from || !dateRange.to) return

    const dateRangeStr = dateRange.from.getTime() === dateRange.to.getTime()
      ? format(dateRange.from, 'dd/MM/yyyy', { locale: es })
      : `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`

    const reportContent = [
      'REPORTE DE LEADS',
      `Período: ${dateRangeStr}`,
      `Generado: ${new Date().toLocaleString('es-AR')}`,
      '',
      'RESUMEN GENERAL',
      `Total de leads: ${data.totalLeads}`,
      `Promedio diario: ${data.promedioDiario}`,
      `Activos en embudo: ${data.activosEnEmbudo}`,
      `Cerrados ganados: ${data.cerradosGanados}`,
      `No concretados (perdido/rechazado): ${data.noConcretados}`,
      '',
      'LEADS POR ORIGEN',
      ...Object.entries(data.leadsPorOrigen)
        .sort(([, a], [, b]) => b - a)
        .map(([origen, cantidad]) => `${origen}: ${cantidad} (${((cantidad / data.totalLeads) * 100).toFixed(1)}%)`),
      '',
      'LEADS POR ESTADO',
      ...Object.entries(data.leadsPorEstado)
        .sort(([, a], [, b]) => b - a)
        .map(([estado, cantidad]) => `${estado}: ${cantidad} (${((cantidad / data.totalLeads) * 100).toFixed(1)}%)`),
      '',
      'LEADS POR DÍA',
      ...data.leadsPorDia.map(({ fecha, cantidad }) => `${fecha}: ${cantidad}`),
    ].join('\n')

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-leads-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reportes</h1>
        </div>
        <div className="text-center py-8 text-destructive">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reportes</h1>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          No hay datos disponibles para el período seleccionado
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button onClick={exportReport} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              En el período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio diario</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.promedioDiario}</div>
            <p className="text-xs text-muted-foreground">
              Leads por día en el rango
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En embudo</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activosEnEmbudo}</div>
            <p className="text-xs text-muted-foreground">
              Sin cierre ganado ni perdido/rechazado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cerrados ganados</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.cerradosGanados}</div>
            <p className="text-xs text-muted-foreground">
              Estado {ESTADO_GANADO.replace(/_/g, ' ')}
            </p>
          </CardContent>
        </Card>
      </div>

      <EmbudoResumenChart
        nuevos={data.embudoNuevos}
        enSeguimiento={data.embudoSeguimiento}
        ganados={data.cerradosGanados}
        noConcretados={data.noConcretados}
        totalLeads={data.totalLeads}
      />

      {/* Gráficos de distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadsByOriginChart
          data={data.leadsPorOrigen}
          totalLeads={data.totalLeads}
        />
        <LeadsByStatusChart
          data={data.leadsPorEstado}
          totalLeads={data.totalLeads}
        />
      </div>

      {/* Gráfico de leads por día */}
      <LeadsByDayChart data={data.leadsPorDia} />
    </div>
  )
}
