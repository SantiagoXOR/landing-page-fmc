'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  MessageSquare, 
  Activity, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Send,
  BarChart3,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/ui/loading-states'

interface IntegrationStatus {
  initialized: boolean
  totalIntegrations: number
  activeIntegrations: number
  integrations: Array<{
    type: string
    enabled: boolean
    name: string
  }>
}

interface IntegrationMetrics {
  [key: string]: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    lastRequestTime?: string
    rateLimitHits: number
  }
}

interface IntegrationHealth {
  [key: string]: boolean
}

export function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [metrics, setMetrics] = useState<IntegrationMetrics>({})
  const [health, setHealth] = useState<IntegrationHealth>({})
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data.status)
        setMetrics(data.metrics)
        setHealth(data.healthCheck)
      } else {
        toast.error('Error al obtener estado de integraciones')
      }
    } catch (error) {
      console.error('Error fetching integration status:', error)
      toast.error('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const toggleIntegration = async (integration: string, currentEnabled: boolean) => {
    try {
      setUpdating(integration)
      const action = currentEnabled ? 'disable' : 'enable'
      
      const response = await fetch('/api/integrations/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integration, action })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        await fetchStatus() // Refrescar estado
      } else {
        const error = await response.json()
        toast.error(error.message || 'Error al actualizar integración')
      }
    } catch (error) {
      console.error('Error toggling integration:', error)
      toast.error('Error al actualizar integración')
    } finally {
      setUpdating(null)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">No se pudo cargar el estado de las integraciones</p>
        </CardContent>
      </Card>
    )
  }

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5" />
      default:
        return <Zap className="h-5 w-5" />
    }
  }

  const getHealthBadge = (type: string) => {
    const isHealthy = health[type]
    if (isHealthy === undefined) {
      return <Badge variant="outline" className="bg-gray-100"><Clock className="h-3 w-3 mr-1" />Verificando</Badge>
    }
    
    return isHealthy ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />Saludable
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />Error
      </Badge>
    )
  }

  const formatMetric = (value: number, type: 'number' | 'time' | 'percentage' = 'number') => {
    if (type === 'time') {
      return `${value.toFixed(0)}ms`
    }
    if (type === 'percentage') {
      return `${(value * 100).toFixed(1)}%`
    }
    return value.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integraciones</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.totalIntegrations}</div>
            <p className="text-xs text-muted-foreground">
              Configuradas en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{status.activeIntegrations}</div>
            <p className="text-xs text-muted-foreground">
              Habilitadas y funcionando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado General</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.initialized ? (
                <span className="text-green-600">OK</span>
              ) : (
                <span className="text-red-600">Error</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {status.initialized ? 'Sistema inicializado' : 'Sistema no disponible'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Integraciones */}
      <Card>
        <CardHeader>
          <CardTitle>Integraciones Disponibles</CardTitle>
          <CardDescription>
            Gestiona las integraciones externas del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status.integrations.map((integration) => {
              const integrationMetrics = metrics[integration.type]
              const isUpdating = updating === integration.type
              
              return (
                <div key={integration.type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getIntegrationIcon(integration.type)}
                      <div>
                        <h3 className="font-medium">{integration.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{integration.type}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getHealthBadge(integration.type)}
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {integration.enabled ? 'Habilitada' : 'Deshabilitada'}
                        </span>
                        {isUpdating ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Switch
                            checked={integration.enabled}
                            onCheckedChange={() => toggleIntegration(integration.type, integration.enabled)}
                            disabled={isUpdating}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Métricas */}
                  {integrationMetrics && integration.enabled && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {formatMetric(integrationMetrics.totalRequests)}
                        </div>
                        <div className="text-xs text-gray-600">Total Requests</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {formatMetric(integrationMetrics.successfulRequests)}
                        </div>
                        <div className="text-xs text-gray-600">Exitosos</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">
                          {formatMetric(integrationMetrics.failedRequests)}
                        </div>
                        <div className="text-xs text-gray-600">Fallidos</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {formatMetric(integrationMetrics.averageResponseTime, 'time')}
                        </div>
                        <div className="text-xs text-gray-600">Tiempo Promedio</div>
                      </div>
                    </div>
                  )}

                  {/* Acciones específicas */}
                  {integration.type === 'whatsapp' && integration.enabled && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Mensaje de Prueba
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar Templates
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones del Sistema</CardTitle>
          <CardDescription>
            Controles generales para el sistema de integraciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button onClick={fetchStatus} variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Actualizar Estado
            </Button>
            
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configuración Avanzada
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
