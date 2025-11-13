'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { ReportBuilder } from '@/components/reports/ReportBuilder'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, FileText, Download, Calendar, Filter } from 'lucide-react'

interface ReportConfig {
  name: string
  description: string
  type: 'leads' | 'pipeline' | 'conversion' | 'custom'
  dateRange: {
    from: Date | null
    to: Date | null
  }
  filters: {
    zonas?: string[]
    estados?: string[]
    origenes?: string[]
    assignedTo?: string
  }
  groupBy: string[]
  metrics: string[]
}

const REPORT_TEMPLATES = [
  {
    id: 'leads-por-zona',
    name: 'Leads por Zona',
    description: 'Distribución de leads por zona geográfica',
    icon: BarChart3,
    type: 'leads' as const,
  },
  {
    id: 'conversion-pipeline',
    name: 'Tasa de Conversión',
    description: 'Análisis de conversión por etapa del pipeline',
    icon: BarChart3,
    type: 'pipeline' as const,
  },
  {
    id: 'leads-por-origen',
    name: 'Leads por Origen',
    description: 'Análisis de leads por canal de origen',
    icon: BarChart3,
    type: 'leads' as const,
  },
  {
    id: 'performance-mensual',
    name: 'Performance Mensual',
    description: 'Métricas de performance del último mes',
    icon: Calendar,
    type: 'conversion' as const,
  },
]

export default function AdvancedReportsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null)
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const handleSelectTemplate = (templateId: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    // Configuración predeterminada basada en la plantilla
    const config: ReportConfig = {
      name: template.name,
      description: template.description,
      type: template.type,
      dateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
        to: new Date()
      },
      filters: {},
      groupBy: template.type === 'leads' ? ['zona'] : ['current_stage'],
      metrics: ['count', 'total_value']
    }

    setReportConfig(config)
    setSelectedTemplate(templateId)
  }

  const handleGenerateReport = async () => {
    if (!reportConfig) return

    try {
      setGenerating(true)

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportConfig)
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        console.error('Error generating report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!reportData) return

    try {
      const response = await fetch('/api/reports/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData, config: reportConfig })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte-${reportConfig?.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const handleDownloadExcel = async () => {
    if (!reportData) return

    try {
      const response = await fetch('/api/reports/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData, config: reportConfig })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte-${reportConfig?.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading Excel:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Reportes Avanzados"
        subtitle="Crea y exporta reportes personalizados"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
      />

      <div className="p-6 space-y-6">
        {/* Plantillas de reportes */}
        {!selectedTemplate && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Plantillas de Reportes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {REPORT_TEMPLATES.map(template => (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all"
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <CardHeader>
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                      <template.icon className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}

              {/* Opción de reporte personalizado */}
              <Card 
                className="cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all border-dashed"
                onClick={() => {
                  setReportConfig({
                    name: 'Reporte Personalizado',
                    description: 'Configuración manual',
                    type: 'custom',
                    dateRange: { from: null, to: null },
                    filters: {},
                    groupBy: [],
                    metrics: []
                  })
                  setSelectedTemplate('custom')
                }}
              >
                <CardHeader>
                  <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <Filter className="h-6 w-6 text-gray-600" />
                  </div>
                  <CardTitle className="text-lg">Personalizado</CardTitle>
                  <CardDescription>Crea un reporte desde cero</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Constructor de reporte */}
        {selectedTemplate && reportConfig && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{reportConfig.name}</h2>
                <p className="text-gray-600">{reportConfig.description}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTemplate(null)
                  setReportConfig(null)
                  setReportData(null)
                }}
              >
                ← Volver a plantillas
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Panel de configuración */}
              <div className="lg:col-span-1">
                <ReportBuilder
                  config={reportConfig}
                  onChange={(config) => setReportConfig(config)}
                  onGenerate={handleGenerateReport}
                  generating={generating}
                />
              </div>

              {/* Panel de resultados */}
              <div className="lg:col-span-2">
                {reportData ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Resultados del Reporte</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPDF}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadExcel}
                            className="gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Excel
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Visualización de datos del reporte */}
                      <div className="space-y-4">
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                          {JSON.stringify(reportData, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        Configura los filtros y haz click en "Generar Reporte"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

