'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react'
import { usePipeline } from '@/hooks/usePipeline'
import { PipelineStage } from '@/server/services/pipeline-service'
import { usePermissions } from '@/components/auth/PermissionGuard'

interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  ingresos?: number
  zona?: string
  pipeline?: {
    current_stage: PipelineStage
    probability_percent: number
    total_value?: number
    expected_close_date?: string
  }
}

interface PipelineColumn {
  stage: PipelineStage
  name: string
  color: string
  leads: Lead[]
  count: number
  totalValue: number
}

export function PipelineDashboard() {
  const { checkPermission } = usePermissions()
  const { getPipelineMetrics, getStageDisplayName, getStageColor } = usePipeline()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('')

  // Definir etapas del pipeline
  const pipelineStages: PipelineStage[] = [
    'LEAD_NUEVO',
    'CONTACTO_INICIAL', 
    'CALIFICACION',
    'PRESENTACION',
    'PROPUESTA',
    'NEGOCIACION',
    'CIERRE_GANADO',
    'CIERRE_PERDIDO'
  ]

  // Cargar datos del pipeline
  const loadPipelineData = async () => {
    try {
      setLoading(true)
      
      // Cargar leads con información del pipeline
      const leadsResponse = await fetch('/api/leads?include_pipeline=true')
      const leadsData = await leadsResponse.json()
      
      // Cargar métricas del pipeline
      const metricsData = await getPipelineMetrics()
      
      setLeads(leadsData.leads || [])
      setMetrics(metricsData || [])
      
      // Organizar leads por columnas
      organizeLeadsByStage(leadsData.leads || [])
      
    } catch (error) {
      console.error('Error loading pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Organizar leads por etapa
  const organizeLeadsByStage = (leadsData: Lead[]) => {
    const newColumns: PipelineColumn[] = pipelineStages.map(stage => {
      const stageLeads = leadsData.filter(lead => 
        lead.pipeline?.current_stage === stage ||
        (!lead.pipeline && stage === 'LEAD_NUEVO') // Leads sin pipeline van a LEAD_NUEVO
      )
      
      const totalValue = stageLeads.reduce((sum, lead) => 
        sum + (lead.pipeline?.total_value || lead.ingresos || 0), 0
      )

      return {
        stage,
        name: getStageDisplayName(stage),
        color: getStageColor(stage),
        leads: stageLeads,
        count: stageLeads.length,
        totalValue
      }
    })

    setColumns(newColumns)
  }

  // Filtrar leads
  const filteredColumns = columns.map(column => ({
    ...column,
    leads: column.leads.filter(lead => {
      const matchesSearch = searchTerm === '' || 
        lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefono.includes(searchTerm) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = selectedFilter === '' || 
        lead.zona === selectedFilter ||
        (lead.pipeline?.expected_close_date && selectedFilter === 'vence_pronto')
      
      return matchesSearch && matchesFilter
    })
  }))

  // Calcular métricas generales
  const totalLeads = leads.length
  const totalValue = leads.reduce((sum, lead) => sum + (lead.pipeline?.total_value || lead.ingresos || 0), 0)
  const avgConversion = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + (m.conversion_rate || 0), 0) / metrics.length 
    : 0

  useEffect(() => {
    loadPipelineData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <TrendingUp className="h-8 w-8 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Cargando pipeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con métricas */}
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
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold">
                  ${(totalValue / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conversión Promedio</p>
                <p className="text-2xl font-bold">{avgConversion.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En Negociación</p>
                <p className="text-2xl font-bold">
                  {columns.find(c => c.stage === 'NEGOCIACION')?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nombre, teléfono, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Zona</label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas las zonas</option>
                <option value="Formosa Capital">Formosa Capital</option>
                <option value="Clorinda">Clorinda</option>
                <option value="Pirané">Pirané</option>
                <option value="El Colorado">El Colorado</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadPipelineData} className="w-full">
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vista Kanban del Pipeline */}
      <div className="overflow-x-auto">
        <div className="flex space-x-4 min-w-max pb-4">
          {filteredColumns.map((column) => (
            <div key={column.stage} className="flex-shrink-0 w-80">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <CardTitle className="text-lg">{column.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{column.leads.length}</Badge>
                  </div>
                  
                  {column.totalValue > 0 && (
                    <CardDescription>
                      Valor: ${(column.totalValue / 1000000).toFixed(1)}M
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {column.leads.map((lead) => (
                    <Card key={lead.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{lead.nombre}</h4>
                          {lead.pipeline?.probability_percent && (
                            <Badge variant="outline" className="text-xs">
                              {lead.pipeline.probability_percent}%
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>{lead.telefono}</p>
                          {lead.email && <p>{lead.email}</p>}
                          {lead.zona && <p>📍 {lead.zona}</p>}
                          {(lead.pipeline?.total_value || lead.ingresos) && (
                            <p className="font-medium text-green-600">
                              ${((lead.pipeline?.total_value || lead.ingresos || 0) / 1000000).toFixed(1)}M
                            </p>
                          )}
                        </div>

                        {lead.pipeline?.expected_close_date && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>
                              {new Date(lead.pipeline.expected_close_date).toLocaleDateString('es-AR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}

                  {column.leads.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay leads en esta etapa</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
