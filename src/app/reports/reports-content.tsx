'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react'

interface ReportData {
  totalLeads: number
  leadsPorOrigen: Record<string, number>
  leadsPorEstado: Record<string, number>
  tasaPreaprobacion: number
  leadsPorDia: Array<{ fecha: string; cantidad: number }>
  promedioRespuesta: number // en horas
}

export default function ReportsContent() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7') // días

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      // Calcular fechas
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - parseInt(dateRange))

      // Obtener leads del período
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        limit: '1000',
      })

      const response = await fetch(`/api/leads?${params}`)
      if (response.ok) {
        const { leads } = await response.json()
        
        // Procesar datos para reportes
        const reportData: ReportData = {
          totalLeads: leads.length,
          leadsPorOrigen: {},
          leadsPorEstado: {},
          tasaPreaprobacion: 0,
          leadsPorDia: [],
          promedioRespuesta: 0,
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

        // Calcular tasa de preaprobación
        const preaprobados = reportData.leadsPorEstado['PREAPROBADO'] || 0
        const rechazados = reportData.leadsPorEstado['RECHAZADO'] || 0
        const evaluados = preaprobados + rechazados
        reportData.tasaPreaprobacion = evaluados > 0 ? (preaprobados / evaluados) * 100 : 0

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
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const exportReport = async () => {
    if (!data) return

    const reportContent = [
      'REPORTE DE LEADS',
      `Período: Últimos ${dateRange} días`,
      `Generado: ${new Date().toLocaleString('es-AR')}`,
      '',
      'RESUMEN GENERAL',
      `Total de leads: ${data.totalLeads}`,
      `Tasa de preaprobación: ${data.tasaPreaprobacion.toFixed(1)}%`,
      '',
      'LEADS POR ORIGEN',
      ...Object.entries(data.leadsPorOrigen).map(([origen, cantidad]) => `${origen}: ${cantidad}`),
      '',
      'LEADS POR ESTADO',
      ...Object.entries(data.leadsPorEstado).map(([estado, cantidad]) => `${estado}: ${cantidad}`),
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
    return <div className="flex items-center justify-center min-h-screen">Cargando reportes...</div>
  }

  if (!data) {
    return <div className="text-center py-8">Error al cargar los datos</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
          <Button onClick={exportReport} variant="outline">
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
              Últimos {dateRange} días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Preaprobación</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tasaPreaprobacion.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              De leads evaluados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preaprobados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leadsPorEstado['PREAPROBADO'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Leads preaprobados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leadsPorEstado['RECHAZADO'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Leads rechazados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads por origen */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Origen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.leadsPorOrigen)
                .sort(([,a], [,b]) => b - a)
                .map(([origen, cantidad]) => (
                  <div key={origen} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{origen}</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium">{cantidad}</div>
                      <div className="text-xs text-gray-500">
                        ({((cantidad / data.totalLeads) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Leads por estado */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.leadsPorEstado)
                .sort(([,a], [,b]) => b - a)
                .map(([estado, cantidad]) => (
                  <div key={estado} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          estado === 'PREAPROBADO' ? 'default' :
                          estado === 'RECHAZADO' ? 'destructive' : 'secondary'
                        }
                      >
                        {estado}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium">{cantidad}</div>
                      <div className="text-xs text-gray-500">
                        ({((cantidad / data.totalLeads) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de leads por día */}
      <Card>
        <CardHeader>
          <CardTitle>Leads por Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.leadsPorDia.map(({ fecha, cantidad }) => (
              <div key={fecha} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="text-sm">{new Date(fecha).toLocaleDateString('es-AR')}</div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">{cantidad}</div>
                  <div 
                    className="h-2 bg-blue-500 rounded"
                    style={{ 
                      width: `${Math.max(10, (cantidad / Math.max(...data.leadsPorDia.map(d => d.cantidad))) * 100)}px` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
