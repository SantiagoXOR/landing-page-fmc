'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Play, 
  Pause, 
  Settings, 
  Plus, 
  Edit, 
  Trash2,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Filter,
  Search
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-states'
import { toast } from 'sonner'
import { AutomationRule, AutomationExecution, AutomationMetrics } from '@/types/automation'
import { automationService } from '@/services/automation-service'

interface AutomationRulesManagerProps {
  className?: string
}

export function AutomationRulesManager({ className = '' }: AutomationRulesManagerProps) {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [executions, setExecutions] = useState<AutomationExecution[]>([])
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('rules')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      const [rulesData, executionsData, metricsData] = await Promise.all([
        automationService.getRules(),
        automationService.getExecutions({ limit: 50 }),
        automationService.getMetrics()
      ])
      
      setRules(rulesData)
      setExecutions(executionsData)
      setMetrics(metricsData)
      
    } catch (error) {
      console.error('Error loading automation data:', error)
      toast.error('Error al cargar datos de automatización')
    } finally {
      setIsLoading(false)
    }
  }

  // Alternar estado de regla
  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await automationService.toggleRule(ruleId, isActive)
      
      setRules(prevRules => 
        prevRules.map(rule => 
          rule.id === ruleId ? { ...rule, isActive } : rule
        )
      )
      
      toast.success(`Regla ${isActive ? 'activada' : 'desactivada'} exitosamente`)
    } catch (error) {
      toast.error('Error al cambiar estado de la regla')
    }
  }

  // Eliminar regla
  const deleteRule = async (ruleId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta regla?')) return
    
    try {
      await automationService.deleteRule(ruleId)
      setRules(prevRules => prevRules.filter(rule => rule.id !== ruleId))
      toast.success('Regla eliminada exitosamente')
    } catch (error) {
      toast.error('Error al eliminar la regla')
    }
  }

  // Filtrar reglas
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterActive === null || rule.isActive === filterActive
    
    return matchesSearch && matchesFilter
  })

  // Obtener color del trigger
  const getTriggerColor = (triggerType: string) => {
    switch (triggerType) {
      case 'stage_change': return 'bg-blue-500'
      case 'field_update': return 'bg-green-500'
      case 'time_based': return 'bg-purple-500'
      case 'lead_created': return 'bg-orange-500'
      case 'task_completed': return 'bg-teal-500'
      default: return 'bg-gray-500'
    }
  }

  // Obtener nombre del trigger
  const getTriggerName = (triggerType: string) => {
    switch (triggerType) {
      case 'stage_change': return 'Cambio de Etapa'
      case 'field_update': return 'Actualización de Campo'
      case 'time_based': return 'Basado en Tiempo'
      case 'lead_created': return 'Lead Creado'
      case 'task_completed': return 'Tarea Completada'
      case 'email_received': return 'Email Recibido'
      case 'whatsapp_received': return 'WhatsApp Recibido'
      case 'manual': return 'Manual'
      default: return triggerType
    }
  }

  // Obtener color del estado de ejecución
  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'running': return 'text-blue-600'
      case 'pending': return 'text-yellow-600'
      case 'cancelled': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  // Formatear fecha relativa
  const formatRelativeDate = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Ahora'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`
    return `Hace ${Math.floor(diffInMinutes / 1440)} días`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automatizaciones</h2>
          <p className="text-muted-foreground">
            Gestiona reglas de automatización para el pipeline
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Regla
          </Button>
        </div>
      </div>

      {/* Métricas rápidas */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reglas Activas</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeRules}</div>
              <p className="text-xs text-muted-foreground">
                de {metrics.totalRules} reglas totales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ejecuciones Hoy</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.executionsToday}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.successfulExecutions} exitosas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.totalExecutions > 0 
                  ? Math.round((metrics.successfulExecutions / metrics.totalExecutions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.failedExecutions} fallos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(metrics.averageExecutionTime)}ms
              </div>
              <p className="text-xs text-muted-foreground">
                por ejecución
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido principal con tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
          <TabsTrigger value="executions">Ejecuciones</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {/* Controles de filtro */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar reglas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterActive === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(null)}
              >
                Todas
              </Button>
              <Button
                variant={filterActive === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(true)}
              >
                Activas
              </Button>
              <Button
                variant={filterActive === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(false)}
              >
                Inactivas
              </Button>
            </div>
          </div>

          {/* Lista de reglas */}
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={toggleRule}
                onDelete={deleteRule}
                getTriggerColor={getTriggerColor}
                getTriggerName={getTriggerName}
              />
            ))}
            
            {filteredRules.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron reglas de automatización</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <div className="space-y-4">
            {executions.map((execution) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                getExecutionStatusColor={getExecutionStatusColor}
                formatRelativeDate={formatRelativeDate}
              />
            ))}
            
            {executions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay ejecuciones recientes</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Automatización</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Templates próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics de Automatización</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente para tarjeta de regla
interface RuleCardProps {
  rule: AutomationRule
  onToggle: (ruleId: string, isActive: boolean) => void
  onDelete: (ruleId: string) => void
  getTriggerColor: (triggerType: string) => string
  getTriggerName: (triggerType: string) => string
}

function RuleCard({ rule, onToggle, onDelete, getTriggerColor, getTriggerName }: RuleCardProps) {
  const successRate = rule.executionCount > 0
    ? Math.round((rule.successCount / rule.executionCount) * 100)
    : 0

  return (
    <Card className={`transition-all duration-200 ${rule.isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{rule.name}</CardTitle>
              <Badge
                variant="secondary"
                className={`${getTriggerColor(rule.trigger.type)} text-white text-xs`}
              >
                {getTriggerName(rule.trigger.type)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Prioridad {rule.priority}
              </Badge>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground">{rule.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
            />
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(rule.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Acciones</p>
            <p className="text-lg font-semibold">{rule.actions.length}</p>
          </div>

          <div>
            <p className="font-medium text-muted-foreground">Ejecuciones</p>
            <p className="text-lg font-semibold">{rule.executionCount}</p>
          </div>

          <div>
            <p className="font-medium text-muted-foreground">Tasa de Éxito</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">{successRate}%</p>
              {rule.errorCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </div>
        </div>

        {rule.actions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">Acciones:</p>
            <div className="flex flex-wrap gap-2">
              {rule.actions.map((action, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {action.type.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente para tarjeta de ejecución
interface ExecutionCardProps {
  execution: AutomationExecution
  getExecutionStatusColor: (status: string) => string
  formatRelativeDate: (date: Date) => string
}

function ExecutionCard({ execution, getExecutionStatusColor, formatRelativeDate }: ExecutionCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'failed': return <XCircle className="h-4 w-4" />
      case 'running': return <Activity className="h-4 w-4 animate-spin" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={getExecutionStatusColor(execution.status)}>
              {getStatusIcon(execution.status)}
            </div>
            <div>
              <p className="font-medium">Ejecución {execution.id.slice(-8)}</p>
              <p className="text-sm text-muted-foreground">
                Lead: {execution.leadId} • {formatRelativeDate(execution.triggeredAt)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {execution.successfulActions}/{execution.totalActions} acciones
            </p>
            <p className="text-xs text-muted-foreground">
              {execution.executionTimeMs}ms
            </p>
          </div>
        </div>

        {execution.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Error:</strong> {execution.error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
