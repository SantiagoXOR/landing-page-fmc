'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  DollarSign,
  Users,
  ArrowRight,
  BarChart3,
  Calendar,
  Download
} from 'lucide-react'
import { usePipeline } from '@/hooks/usePipeline'

interface PipelineMetric {
  stage: string
  total_leads: number
  avg_duration_days: number
  conversion_rate: number
}

interface ConversionFunnel {
  stage: string
  leads: number
  conversion: number
  dropoff: number
}

export function PipelineMetrics() {
  const { getPipelineMetrics } = usePipeline()
  const [metrics, setMetrics] = useState<PipelineMetric[]>([])
  const [funnel, setFunnel] = useState<ConversionFunnel[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // días

  // Cargar métricas
  const loadMetrics = async () => {
    try {
      setLoading(true)
      
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - parseInt(dateRange))
      
      const metricsData = await getPipelineMetrics(
        dateFrom.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )
      
      setMetrics(metricsData || [])
      
      // Calcular embudo de conversión
      calculateConversionFunnel(metricsData || [])
      
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular embudo de conversión
  const calculateConversionFunnel = (metricsData: PipelineMetric[]) => {
    const stageOrder = [
      'LEAD_NUEVO',
      'CONTACTO_INICIAL', 
      'CALIFICACION',
      'PRESENTACION',
      'PROPUESTA',
      'NEGOCIACION',
      'CIERRE_GANADO'
    ]

    const funnelData: ConversionFunnel[] = []
    let previousLeads = 0

    stageOrder.forEach((stage, index) => {
      const metric = metricsData.find(m => m.stage === stage)
      const leads = metric?.total_leads || 0
      
      let conversion = 0
      let dropoff = 0
      
      if (index > 0 && previousLeads > 0) {
        conversion = (leads / previousLeads) * 100
        dropoff = 100 - conversion
      } else if (index === 0) {
        conversion = 100
      }

      funnelData.push({
        stage: getStageDisplayName(stage),
        leads,
        conversion,
        dropoff
      })

      previousLeads = leads
    })

    setFunnel(funnelData)
  }

  // Obtener nombre de visualización de la etapa
  const getStageDisplayName = (stage: string): string => {
    const stageNames: Record<string, string> = {
      'LEAD_NUEVO': 'Lead Nuevo',
      'CONTACTO_INICIAL': 'Contacto Inicial',
      'CALIFICACION': 'Calificación',
      'PRESENTACION': 'Presentación',
      'PROPUESTA': 'Propuesta',
      'NEGOCIACION': 'Negociación',
      'CIERRE_GANADO': 'Cierre Ganado',
      'CIERRE_PERDIDO': 'Cierre Perdido',
      'SEGUIMIENTO': 'Seguimiento'
    }
    return stageNames[stage] || stage
  }

  // Calcular métricas generales
  const totalLeads = metrics.reduce((sum, m) => sum + m.total_leads, 0)
  const avgConversionRate = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.conversion_rate, 0) / metrics.length 
    : 0
  const avgDuration = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.avg_duration_days, 0) / metrics.length
    : 0

  useEffect(() => {
    loadMetrics()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Métricas del Pipeline</h2>
          <p className="text-gray-600">Análisis de rendimiento y conversión</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
          </select>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conversión Promedio</p>
                <p className="text-2xl font-bold">{avgConversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
                <p className="text-2xl font-bold">{avgDuration.toFixed(0)} días</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Leads Ganados</p>
                <p className="text-2xl font-bold">
                  {metrics.find(m => m.stage === 'CIERRE_GANADO')?.total_leads || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Embudo de conversión */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="w-5 h-5 mr-2" />
            Embudo de Conversión
          </CardTitle>
          <CardDescription>
            Flujo de leads a través de las etapas del pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnel.map((stage, index) => (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{stage.stage}</h4>
                      <p className="text-sm text-gray-600">{stage.leads} leads</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {index > 0 && (
                      <Badge 
                        variant={stage.conversion >= 50 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {stage.conversion.toFixed(1)}% conversión
                      </Badge>
                    )}
                    
                    {index > 0 && stage.dropoff > 0 && (
                      <Badge variant="outline" className="text-xs text-red-600">
                        {stage.dropoff.toFixed(1)}% pérdida
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Barra visual del embudo */}
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.max(stage.conversion, 5)}%` }}
                  />
                </div>
                
                {index < funnel.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas por etapa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Métricas por Etapa
          </CardTitle>
          <CardDescription>
            Rendimiento detallado de cada etapa del pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Etapa</th>
                  <th className="text-left p-4 font-medium">Leads</th>
                  <th className="text-left p-4 font-medium">Duración Promedio</th>
                  <th className="text-left p-4 font-medium">Tasa de Conversión</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.stage} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">
                      {getStageDisplayName(metric.stage)}
                    </td>
                    <td className="p-4">{metric.total_leads}</td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {metric.avg_duration_days.toFixed(1)} días
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant={metric.conversion_rate >= 50 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {metric.conversion_rate.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
