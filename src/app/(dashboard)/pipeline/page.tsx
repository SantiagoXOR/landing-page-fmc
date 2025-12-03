'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/Header'
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  DollarSign,
  Users,
  Clock,
  BarChart3,
  Settings,
  Plus,
  Filter,
  Download,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { PipelineBoardAdvanced } from '@/components/pipeline/PipelineBoardAdvanced'
import { LeadDetailModal } from '@/components/pipeline/LeadDetailModal'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { toast } from 'sonner'
import { pipelineService } from '@/services/pipeline-service'
import { PipelineStage, PipelineLead, DragDropResult } from '@/types/pipeline'
import { usePipelineMetrics, formatChange, getTrendColor, getTrendIcon } from '@/hooks/usePipelineMetrics'

function PipelinePage() {
  const { data: session } = useSession()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('board')
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Hook para métricas reales
  const { metrics: realMetrics, loading: metricsLoading, error: metricsError } = usePipelineMetrics('month')

  // Cargar datos iniciales
  useEffect(() => {
    if (session) {
      loadPipelineData()
    }
  }, [session])

  // Mapeo entre stageId de leads y IDs de stages del API
  const stageIdMapping: Record<string, string> = {
    'nuevo': 'cliente-nuevo',
    'contactado': 'consultando-credito',
    'calificado': 'solicitando-docs',
    'propuesta': 'listo-analisis',
    'negociacion': 'preaprobado',
    'cerrado-ganado': 'cerrado-ganado',
    'cerrado-perdido': 'rechazado',
    // Mapeos adicionales para compatibilidad
    'cliente-nuevo': 'cliente-nuevo',
    'consultando-credito': 'consultando-credito',
    'solicitando-docs': 'solicitando-docs',
    'listo-analisis': 'listo-analisis',
    'preaprobado': 'preaprobado',
    'rechazado': 'rechazado'
  }

  const loadPipelineData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Cargar etapas y leads en paralelo
      const [stagesData, leadsData] = await Promise.all([
        pipelineService.getStages(),
        pipelineService.getLeads()
      ])

      // Validar que existan stages
      if (!stagesData || stagesData.length === 0) {
        // Crear stages por defecto si no existen
        try {
          await pipelineService.createDefaultStages()
          // Recargar después de crear stages
          return loadPipelineData()
        } catch (createError) {
          console.error('Error creating default stages:', createError)
          setError('No se pudieron crear las etapas del pipeline. Contacta al administrador.')
          return
        }
      }

      // Mapear stageId de leads a IDs de stages
      const mappedLeads = leadsData.map(lead => {
        const mappedStageId = stageIdMapping[lead.stageId] || lead.stageId
        // Buscar el stage correspondiente
        const matchingStage = stagesData.find(s => s.id === mappedStageId)
        if (matchingStage) {
          return { ...lead, stageId: matchingStage.id }
        }
        return lead
      })

      setStages(stagesData)
      setLeads(mappedLeads)
      
      console.log('Pipeline data loaded:', {
        stagesCount: stagesData.length,
        leadsCount: mappedLeads.length,
        stageMapping: Object.entries(stageIdMapping),
        unmatchedLeads: mappedLeads.filter(l => !stagesData.some(s => s.id === l.stageId)).length
      })

      // Cargar métricas
      try {
        const metricsData = await pipelineService.getMetrics()
        setMetrics(metricsData)
      } catch (metricsError) {
        console.error('Error loading metrics:', metricsError)
        // No es crítico, continuar sin métricas
      }

    } catch (error) {
      console.error('Error loading pipeline data:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar datos del pipeline')
    } finally {
      setIsLoading(false)
    }
  }

  // Manejar movimiento de leads
  const handleLeadMove = async (result: DragDropResult): Promise<boolean> => {
    try {
      await pipelineService.moveLead(result)

      // Actualizar el lead localmente
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === result.leadId
            ? {
                ...lead,
                stageId: result.destinationStageId,
                stageEntryDate: new Date()
              }
            : lead
        )
      )

      return true
    } catch (error) {
      console.error('Error moving lead:', error)
      toast.error('Error al mover el lead')
      return false
    }
  }

  // Manejar click en lead
  const handleLeadClick = (lead: PipelineLead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  // Manejar click en etapa
  const handleStageClick = (stage: PipelineStage) => {
    toast.info(`Configurando etapa: ${stage.name}`)
  }

  // Manejar agregar lead
  const handleAddLead = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId)
    toast.info(`Agregando lead a: ${stage?.name}`)
  }

  // Calcular métricas rápidas
  const quickMetrics = {
    totalLeads: leads.length,
    totalValue: leads.reduce((sum, lead) => sum + (lead.value || 0), 0),
    averageDealSize: leads.length > 0
      ? leads.reduce((sum, lead) => sum + (lead.value || 0), 0) / leads.length
      : 0,
    highPriorityLeads: leads.filter(lead => ['high', 'urgent'].includes(lead.priority)).length,
    leadsWithTasks: leads.filter(lead => lead.tasks && lead.tasks.length > 0).length
  }

  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Pipeline de Ventas"
          subtitle="Gestiona y visualiza tu proceso de ventas completo"
          showNewButton={true}
          newButtonText="Nuevo Lead"
          newButtonHref="/leads/new"
          showExportButton={true}
        />
        <div className="p-6 space-y-6">
          {/* Skeleton loaders para métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Skeleton loader para pipeline */}
          <Card className="animate-pulse">
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <LoadingSpinner size="lg" />
                <span className="ml-4 text-gray-600">Cargando pipeline...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        title="Pipeline de Ventas"
        subtitle="Gestiona y visualiza tu proceso de ventas completo"
        showNewButton={true}
        newButtonText="Nuevo Lead"
        newButtonHref="/leads/new"
        showExportButton={true}
      />

      <div className="p-6 space-y-6">
        {/* Mostrar error si existe */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error al cargar el pipeline</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <Button
                onClick={loadPipelineData}
                className="mt-4"
                variant="outline"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realMetrics ? realMetrics.totalLeads.current : quickMetrics.totalLeads}
            </div>
            {realMetrics && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(realMetrics.totalLeads.trend)}`}>
                {realMetrics.totalLeads.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {realMetrics.totalLeads.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {realMetrics.totalLeads.trend === 'stable' && <ArrowRight className="h-3 w-3" />}
                <span>{formatChange(realMetrics.totalLeads.change)} desde el mes pasado</span>
              </div>
            )}
            {!realMetrics && (
              <p className="text-xs text-muted-foreground">
                Cargando comparación...
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {realMetrics ? realMetrics.approvedLeads.current : 0}
            </div>
            {realMetrics && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(realMetrics.approvedLeads.trend)}`}>
                {realMetrics.approvedLeads.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {realMetrics.approvedLeads.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {realMetrics.approvedLeads.trend === 'stable' && <ArrowRight className="h-3 w-3" />}
                <span>{formatChange(realMetrics.approvedLeads.change)} desde el mes pasado</span>
              </div>
            )}
            {!realMetrics && (
              <p className="text-xs text-muted-foreground">
                Cargando comparación...
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {realMetrics ? realMetrics.rejectedLeads.current : 0}
            </div>
            {realMetrics && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(realMetrics.rejectedLeads.trend)}`}>
                {realMetrics.rejectedLeads.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {realMetrics.rejectedLeads.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {realMetrics.rejectedLeads.trend === 'stable' && <ArrowRight className="h-3 w-3" />}
                <span>{formatChange(realMetrics.rejectedLeads.change)} desde el mes pasado</span>
              </div>
            )}
            {!realMetrics && (
              <p className="text-xs text-muted-foreground">
                Cargando comparación...
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Urgentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {realMetrics ? realMetrics.urgentLeads.current : quickMetrics.highPriorityLeads}
            </div>
            {realMetrics && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(realMetrics.urgentLeads.trend)}`}>
                {realMetrics.urgentLeads.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {realMetrics.urgentLeads.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {realMetrics.urgentLeads.trend === 'stable' && <ArrowRight className="h-3 w-3" />}
                <span>Requieren atención inmediata</span>
              </div>
            )}
            {!realMetrics && (
              <p className="text-xs text-muted-foreground">
                Requieren atención inmediata
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Estancados</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {realMetrics ? realMetrics.stalledLeads.current : 0}
            </div>
            {realMetrics && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(realMetrics.stalledLeads.trend)}`}>
                {realMetrics.stalledLeads.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                {realMetrics.stalledLeads.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                {realMetrics.stalledLeads.trend === 'stable' && <ArrowRight className="h-3 w-3" />}
                <span>{formatChange(realMetrics.stalledLeads.change)} desde el mes pasado</span>
              </div>
            )}
            {!realMetrics && (
              <p className="text-xs text-muted-foreground">
                15+ días sin movimiento
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Explicación del Pipeline - Minimalista */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-blue-900 font-medium">
                <strong>Etapas</strong> • <strong>Arrastrar y soltar</strong> • <strong>Gestión visual</strong> • <strong>Seguimiento de ventas</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">Tablero</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
          <TabsTrigger value="forecast">Pronóstico</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          <PipelineBoardAdvanced
            stages={stages}
            leads={leads}
            onLeadMove={handleLeadMove}
            onLeadClick={handleLeadClick}
            onStageClick={handleStageClick}
            onAddLead={handleAddLead}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis del Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Análisis avanzados próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pronóstico de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Pronóstico próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configuración próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Modal de detalles del lead */}
      <LeadDetailModal
        lead={selectedLead}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  )
}

// Envolver con PermissionGuard
export default function ProtectedPipelinePage() {
  return (
    <PermissionGuard permission="leads:read" route="/pipeline">
      <PipelinePage />
    </PermissionGuard>
  )
}
