'use client'

import { useState } from 'react'
import { PipelineMetrics } from '@/components/pipeline/PipelineMetrics'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Filter,
  ArrowLeft,
  Target,
  Clock,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

function PipelineReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedMetric, setSelectedMetric] = useState('conversion')

  // Datos de ejemplo para gráficos adicionales
  const performanceData = [
    { period: 'Esta semana', leads: 45, conversion: 12.5, revenue: 2400000 },
    { period: 'Semana pasada', leads: 38, conversion: 15.2, revenue: 1800000 },
    { period: 'Hace 2 semanas', leads: 52, conversion: 9.8, revenue: 3200000 },
    { period: 'Hace 3 semanas', leads: 41, conversion: 18.1, revenue: 2100000 }
  ]

  const topPerformers = [
    { name: 'Juan Pérez', leads: 23, closed: 8, conversion: 34.8 },
    { name: 'María González', leads: 19, closed: 6, conversion: 31.6 },
    { name: 'Carlos López', leads: 15, closed: 4, conversion: 26.7 },
    { name: 'Ana Martínez', leads: 12, closed: 3, conversion: 25.0 }
  ]

  const exportReport = () => {
    // Implementar exportación de reportes
    console.log('Exporting pipeline report...')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Reportes
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Reportes de Pipeline</h1>
            <p className="text-gray-600">Análisis detallado del rendimiento del pipeline de ventas</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Programar Reporte
          </Button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="365">Último año</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Métrica Principal</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="conversion">Tasa de Conversión</option>
                <option value="duration">Duración por Etapa</option>
                <option value="revenue">Ingresos Generados</option>
                <option value="volume">Volumen de Leads</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Comparar con</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="previous">Período anterior</option>
                <option value="year">Mismo período año anterior</option>
                <option value="target">Meta establecida</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales del pipeline */}
      <PipelineMetrics />

      {/* Análisis de rendimiento temporal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Rendimiento Temporal
          </CardTitle>
          <CardDescription>
            Evolución del pipeline en las últimas semanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Período</th>
                  <th className="text-left p-4 font-medium">Leads</th>
                  <th className="text-left p-4 font-medium">Conversión</th>
                  <th className="text-left p-4 font-medium">Ingresos</th>
                  <th className="text-left p-4 font-medium">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((data, index) => (
                  <tr key={data.period} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{data.period}</td>
                    <td className="p-4">{data.leads}</td>
                    <td className="p-4">
                      <Badge 
                        variant={data.conversion >= 15 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {data.conversion}%
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                        ${(data.revenue / 1000000).toFixed(1)}M
                      </div>
                    </td>
                    <td className="p-4">
                      {index === 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : index === 1 ? (
                        <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Top Performers
            </CardTitle>
            <CardDescription>
              Vendedores con mejor rendimiento en el pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{performer.name}</h4>
                      <p className="text-sm text-gray-600">
                        {performer.closed}/{performer.leads} leads cerrados
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">
                    {performer.conversion}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Insights y Recomendaciones
            </CardTitle>
            <CardDescription>
              Análisis automático del rendimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">✅ Fortaleza</h4>
                <p className="text-sm text-green-700">
                  La etapa de &quot;Negociación&quot; tiene una conversión del 78%, superando la meta del 70%.
                </p>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-1">⚠️ Oportunidad</h4>
                <p className="text-sm text-yellow-700">
                  Los leads permanecen 12 días en &quot;Calificación&quot;, 4 días más que el objetivo.
                </p>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-1">🚨 Atención</h4>
                <p className="text-sm text-red-700">
                  La conversión de &quot;Contacto Inicial&quot; a &quot;Calificación&quot; bajó 15% esta semana.
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">💡 Recomendación</h4>
                <p className="text-sm text-blue-700">
                  Implementar seguimiento automático después de 7 días en &quot;Propuesta&quot;.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Envolver con PermissionGuard
export default function ProtectedPipelineReportsPage() {
  return (
    <PermissionGuard permission="reports:read" route="/reports/pipeline">
      <PipelineReportsPage />
    </PermissionGuard>
  )
}
