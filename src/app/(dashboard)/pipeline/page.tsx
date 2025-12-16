'use client'

import { useState, useEffect, useRef } from 'react'
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

// Constantes para el caché en sessionStorage
const CACHE_KEY = 'pipeline_data_cache'
const CACHE_TIMESTAMP_KEY = 'pipeline_data_cache_timestamp'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos en milisegundos

// Funciones de caché
const getCachedData = (): { stages: PipelineStage[], leads: PipelineLead[], metrics?: any } | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
    
    if (!cached || !timestamp) {
      console.log('🔍 No hay caché disponible')
      return null
    }
    
    const now = Date.now()
    const cacheTime = parseInt(timestamp, 10)
    const age = now - cacheTime
    
    // Verificar si el caché ha expirado
    if (age > CACHE_TTL) {
      console.log(`⏰ Caché expirado (edad: ${Math.round(age / 1000)}s, TTL: ${CACHE_TTL / 1000}s)`)
      sessionStorage.removeItem(CACHE_KEY)
      sessionStorage.removeItem(CACHE_TIMESTAMP_KEY)
      return null
    }
    
    const data = JSON.parse(cached)
    console.log(`✅ Caché encontrado (edad: ${Math.round(age / 1000)}s, stages: ${data.stages?.length || 0}, leads: ${data.leads?.length || 0})`)
    return data
  } catch (error) {
    console.error('❌ Error reading cache:', error)
    return null
  }
}

const saveToCache = (data: { stages: PipelineStage[], leads: PipelineLead[], metrics?: any }) => {
  if (typeof window === 'undefined') return
  
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    console.log(`💾 Caché guardado (stages: ${data.stages?.length || 0}, leads: ${data.leads?.length || 0})`)
  } catch (error) {
    console.error('❌ Error saving cache:', error)
    // Si hay error (por ejemplo, storage lleno), limpiar caché viejo
    try {
      sessionStorage.removeItem(CACHE_KEY)
      sessionStorage.removeItem(CACHE_TIMESTAMP_KEY)
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
      console.log('✅ Caché guardado después de limpiar espacio')
    } catch (retryError) {
      console.error('❌ Error retrying cache save:', retryError)
    }
  }
}

function PipelinePage() {
  const { data: session } = useSession()
  const hasLoadedRef = useRef(false)
  const isRefreshing = useRef(false)
  
  // Inicializar estado - verificar caché solo en el cliente
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return {
        stages: [] as PipelineStage[],
        leads: [] as PipelineLead[],
        metrics: null,
        isLoading: true
      }
    }
    
    const cachedData = getCachedData()
    const hasCachedData = cachedData && cachedData.stages && cachedData.leads
    
    if (hasCachedData) {
      return {
        stages: cachedData.stages,
        leads: cachedData.leads,
        metrics: cachedData.metrics || null,
        isLoading: false // No mostrar loading si hay caché
      }
    }
    
    return {
      stages: [] as PipelineStage[],
      leads: [] as PipelineLead[],
      metrics: null,
      isLoading: true
    }
  }
  
  const initialState = getInitialState()
  const [stages, setStages] = useState<PipelineStage[]>(initialState.stages)
  const [leads, setLeads] = useState<PipelineLead[]>(initialState.leads)
  const [isLoading, setIsLoading] = useState(initialState.isLoading)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(initialState.metrics)
  const [activeTab, setActiveTab] = useState('board')
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Hook para métricas reales
  const { metrics: realMetrics, loading: metricsLoading, error: metricsError } = usePipelineMetrics('month')

  // Verificar y aplicar caché inmediatamente después del montaje en el cliente
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Si el estado está vacío pero hay caché, aplicarlo inmediatamente
    if ((stages.length === 0 || leads.length === 0) && isLoading) {
      const cachedData = getCachedData()
      if (cachedData && cachedData.stages && cachedData.leads && cachedData.stages.length > 0) {
        console.log('📦 Aplicando caché al estado después del montaje...')
        setStages(cachedData.stages)
        setLeads(cachedData.leads)
        if (cachedData.metrics) {
          setMetrics(cachedData.metrics)
        }
        setIsLoading(false)
      }
    }
  }, []) // Solo ejecutar una vez al montar

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

  const loadPipelineData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
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
          return loadPipelineData(showLoading)
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
      
      // Guardar en caché
      const cacheData = {
        stages: stagesData,
        leads: mappedLeads
      }
      saveToCache(cacheData)
      
      console.log('Pipeline data loaded:', {
        stagesCount: stagesData.length,
        leadsCount: mappedLeads.length,
        stageMapping: Object.entries(stageIdMapping),
        unmatchedLeads: mappedLeads.filter(l => !stagesData.some(s => s.id === l.stageId)).length
      })

      // Cargar métricas en segundo plano (no crítico, puede fallar)
      // Esto permite que el pipeline se muestre primero y las métricas se carguen después
      setTimeout(async () => {
        try {
          const metricsData = await pipelineService.getMetrics()
          setMetrics(metricsData)
          // Actualizar caché con métricas
          const updatedCache = getCachedData()
          if (updatedCache) {
            saveToCache({ ...updatedCache, metrics: metricsData })
          } else {
            saveToCache({ ...cacheData, metrics: metricsData })
          }
        } catch (metricsError) {
          console.error('Error loading metrics:', metricsError)
          // No es crítico, continuar sin métricas
        }
      }, 100) // Pequeño delay para permitir que el pipeline se renderice primero

    } catch (error) {
      console.error('Error loading pipeline data:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar datos del pipeline')
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }

  // Cargar datos iniciales - solo una vez al montar en el cliente
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return
    // Evitar múltiples ejecuciones
    if (hasLoadedRef.current) return
    if (!session) return
    
    hasLoadedRef.current = true

    // Verificar si hay datos en caché (verificar nuevamente en el cliente)
    const cachedData = getCachedData()
    const hasCachedData = cachedData && cachedData.stages && cachedData.leads && cachedData.stages.length > 0

    if (hasCachedData) {
      // Si hay caché pero el estado no se inicializó correctamente, actualizarlo
      if (stages.length === 0 || leads.length === 0) {
        console.log('📦 Aplicando caché al estado desde useEffect...')
        setStages(cachedData.stages)
        setLeads(cachedData.leads)
        if (cachedData.metrics) {
          setMetrics(cachedData.metrics)
        }
        setIsLoading(false)
      }
      
      // Ya tenemos datos del caché, solo refrescar en segundo plano SIN mostrar loading
      console.log('📦 Usando datos del caché, refrescando en segundo plano...')
      isRefreshing.current = true
      // Asegurarse de que isLoading esté en false antes de refrescar
      setIsLoading(false)
      loadPipelineData(false).finally(() => {
        isRefreshing.current = false
      })
    } else {
      // No hay caché válido, cargar normalmente con loading
      console.log('🔄 No hay caché, cargando datos...')
      // Solo mostrar loading si realmente no hay datos
      if (stages.length === 0 && leads.length === 0) {
        loadPipelineData(true)
      } else {
        // Si hay datos pero no caché, solo refrescar sin loading
        setIsLoading(false)
        loadPipelineData(false)
      }
    }
  }, [session])

  // Manejar movimiento de leads desde dropdown (sin drag & drop)
  const handleLeadMoved = (leadId: string, newStageId: string) => {
    // Actualizar el lead localmente de forma optimista
    setLeads(prevLeads => {
      const updatedLeads = prevLeads.map(lead =>
        lead.id === leadId
          ? {
              ...lead,
              stageId: newStageId,
              stageEntryDate: new Date()
            }
          : lead
      )
      
      // Actualizar caché
      const cachedData = getCachedData()
      if (cachedData) {
        saveToCache({
          ...cachedData,
          leads: updatedLeads
        })
      } else {
        saveToCache({
          stages,
          leads: updatedLeads
        })
      }
      
      return updatedLeads
    })
  }

  // Manejar movimiento de leads con actualización optimista
  const handleLeadMove = async (result: DragDropResult): Promise<boolean> => {
    // Guardar el estado anterior para poder revertir si falla
    const previousLeads = [...leads]
    const leadToMove = leads.find(l => l.id === result.leadId)
    
    if (!leadToMove) {
      console.error('Lead no encontrado para mover:', result.leadId)
      return false
    }

    // ACTUALIZACIÓN OPTIMISTA: Actualizar el estado ANTES de llamar a la API
    setLeads(prevLeads => {
      const updatedLeads = prevLeads.map(lead =>
        lead.id === result.leadId
          ? {
              ...lead,
              stageId: result.destinationStageId,
              stageEntryDate: new Date()
            }
          : lead
      )
      
      // Actualizar caché inmediatamente con los leads actualizados
      const cachedData = getCachedData()
      if (cachedData) {
        saveToCache({
          ...cachedData,
          leads: updatedLeads
        })
      } else {
        saveToCache({
          stages,
          leads: updatedLeads
        })
      }
      
      return updatedLeads
    })

    // Llamar a la API en segundo plano
    try {
      await pipelineService.moveLead(result)
      // Si la API tiene éxito, el estado ya está actualizado (optimistic update)
      return true
    } catch (error) {
      console.error('Error moving lead:', error)
      
      // REVERTIR: Si la API falla, restaurar el estado anterior
      setLeads(previousLeads)
      
      // Restaurar caché
      const cachedData = getCachedData()
      if (cachedData) {
        saveToCache({
          ...cachedData,
          leads: previousLeads
        })
      } else {
        saveToCache({
          stages,
          leads: previousLeads
        })
      }
      
      toast.error('Error al mover el lead. Los cambios se han revertido.')
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
                onClick={() => loadPipelineData(true)}
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
            onLeadMoved={handleLeadMoved}
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
