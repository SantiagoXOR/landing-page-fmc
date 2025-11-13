'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { BarChart3, Filter } from 'lucide-react'

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

interface ReportBuilderProps {
  config: ReportConfig
  onChange: (config: ReportConfig) => void
  onGenerate: () => void
  generating: boolean
}

const AVAILABLE_ZONES = [
  'Formosa Capital',
  'Clorinda',
  'Pirané',
  'El Colorado',
  'Las Lomitas',
  'Ingeniero Juárez'
]

const AVAILABLE_ESTADOS = [
  'NUEVO',
  'EN_REVISION',
  'PREAPROBADO',
  'RECHAZADO',
  'DOC_PENDIENTE',
  'DERIVADO'
]

const AVAILABLE_ORIGENES = [
  'whatsapp',
  'instagram',
  'facebook',
  'web',
  'ads',
  'referido'
]

const AVAILABLE_METRICS = [
  { key: 'count', label: 'Cantidad de leads' },
  { key: 'total_value', label: 'Valor total' },
  { key: 'avg_ingresos', label: 'Ingresos promedio' },
  { key: 'conversion_rate', label: 'Tasa de conversión' },
]

export function ReportBuilder({ config, onChange, onGenerate, generating }: ReportBuilderProps) {
  const handleDateChange = (field: 'from' | 'to', value: string) => {
    onChange({
      ...config,
      dateRange: {
        ...config.dateRange,
        [field]: value ? new Date(value) : null
      }
    })
  }

  const handleFilterToggle = (filterType: keyof ReportConfig['filters'], value: string) => {
    const currentFilter = config.filters[filterType] as string[] || []
    const newFilter = currentFilter.includes(value)
      ? currentFilter.filter(v => v !== value)
      : [...currentFilter, value]

    onChange({
      ...config,
      filters: {
        ...config.filters,
        [filterType]: newFilter
      }
    })
  }

  const handleMetricToggle = (metric: string) => {
    const newMetrics = config.metrics.includes(metric)
      ? config.metrics.filter(m => m !== metric)
      : [...config.metrics, metric]

    onChange({
      ...config,
      metrics: newMetrics
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Configuración
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rango de fechas */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Rango de Fechas</h3>
          <div className="space-y-2">
            <div>
              <Label htmlFor="date-from" className="text-xs">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={config.dateRange.from?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleDateChange('from', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to" className="text-xs">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={config.dateRange.to?.toISOString().split('T')[0] || ''}
                onChange={(e) => handleDateChange('to', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filtro de zonas */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Zonas</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {AVAILABLE_ZONES.map(zona => (
              <div key={zona} className="flex items-center gap-2">
                <Checkbox
                  id={`zona-${zona}`}
                  checked={(config.filters.zonas || []).includes(zona)}
                  onCheckedChange={() => handleFilterToggle('zonas', zona)}
                />
                <Label htmlFor={`zona-${zona}`} className="text-sm cursor-pointer">
                  {zona}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Filtro de estados */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Estados</h3>
          <div className="space-y-2">
            {AVAILABLE_ESTADOS.map(estado => (
              <div key={estado} className="flex items-center gap-2">
                <Checkbox
                  id={`estado-${estado}`}
                  checked={(config.filters.estados || []).includes(estado)}
                  onCheckedChange={() => handleFilterToggle('estados', estado)}
                />
                <Label htmlFor={`estado-${estado}`} className="text-sm cursor-pointer">
                  {estado}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Filtro de orígenes */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Orígenes</h3>
          <div className="space-y-2">
            {AVAILABLE_ORIGENES.map(origen => (
              <div key={origen} className="flex items-center gap-2">
                <Checkbox
                  id={`origen-${origen}`}
                  checked={(config.filters.origenes || []).includes(origen)}
                  onCheckedChange={() => handleFilterToggle('origenes', origen)}
                />
                <Label htmlFor={`origen-${origen}`} className="text-sm cursor-pointer">
                  {origen}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Métricas */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Métricas a Incluir</h3>
          <div className="space-y-2">
            {AVAILABLE_METRICS.map(metric => (
              <div key={metric.key} className="flex items-center gap-2">
                <Checkbox
                  id={`metric-${metric.key}`}
                  checked={config.metrics.includes(metric.key)}
                  onCheckedChange={() => handleMetricToggle(metric.key)}
                />
                <Label htmlFor={`metric-${metric.key}`} className="text-sm cursor-pointer">
                  {metric.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Botón de generar */}
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={onGenerate}
          disabled={generating || config.metrics.length === 0}
        >
          {generating ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generando...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              Generar Reporte
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

