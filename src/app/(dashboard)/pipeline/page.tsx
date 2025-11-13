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
  DollarSign,
  Users,
  Clock,
  BarChart3,
  Settings,
  Plus,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react'
import { PipelineBoardAdvanced } from '@/components/pipeline/PipelineBoardAdvanced'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { toast } from 'sonner'
import { pipelineService } from '@/services/pipeline-service'
import { PipelineStage, PipelineLead, DragDropResult } from '@/types/pipeline'

function PipelinePage() {
  const { data: session } = useSession()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [leads, setLeads] = useState<PipelineLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('board')

  // Cargar datos iniciales
  useEffect(() => {
    if (session) {
      loadPipelineData()
    }
  }, [session])

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

      setStages(stagesData)
      setLeads(leadsData)

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
    // En una implementación real, abriríamos un modal o navegaríamos a la página del lead
    toast.info(`Abriendo detalles de ${lead.nombre}`)
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
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
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
            <div className="text-2xl font-bold">{quickMetrics.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              +12% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(quickMetrics.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              +8% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(quickMetrics.averageDealSize)}
            </div>
            <p className="text-xs text-muted-foreground">
              +5% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Prioridad</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickMetrics.highPriorityLeads}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Tareas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickMetrics.leadsWithTasks}</div>
            <p className="text-xs text-muted-foreground">
              Leads con actividades pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="board">Pipeline Board</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="forecast">Forecasting</TabsTrigger>
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
              <CardTitle>Analytics del Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics avanzados próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Forecasting de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Forecasting próximamente</p>
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
