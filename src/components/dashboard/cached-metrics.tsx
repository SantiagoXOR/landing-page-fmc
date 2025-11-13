'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Zap } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface CachedMetricsProps {
  className?: string
}

export function CachedMetrics({ className }: CachedMetricsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const utils = api.useUtils()
  const { addToast } = useToast()

  // Queries con cache automático
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    dataUpdatedAt: metricsUpdatedAt
  } = api.dashboard.getMetrics.useQuery({
    dateFrom: undefined,
    dateTo: undefined
  })

  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError,
    dataUpdatedAt: activityUpdatedAt
  } = api.dashboard.getRecentActivity.useQuery({
    limit: 10
  })

  const {
    data: performance,
    isLoading: performanceLoading,
    error: performanceError,
    dataUpdatedAt: performanceUpdatedAt
  } = api.dashboard.getPerformanceSummary.useQuery({
    period: 'month'
  })

  // Función para refrescar manualmente el cache
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        utils.dashboard.getMetrics.invalidate(),
        utils.dashboard.getRecentActivity.invalidate(),
        utils.dashboard.getPerformanceSummary.invalidate()
      ])
      addToast({
        type: "success",
        title: "Éxito",
        description: "Datos actualizados desde el cache"
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        description: "Error al actualizar los datos"
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Función para mostrar el tiempo desde la última actualización
  const getTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  if (metricsError || activityError || performanceError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
          <CardDescription>
            Error al cargar los datos del dashboard
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles de cache */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="text-2xl font-bold">Dashboard con Cache Redis</h2>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refrescar Cache
        </Button>
      </div>

      {/* Métricas principales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Métricas Principales</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Cache: {metricsUpdatedAt ? getTimeAgo(metricsUpdatedAt) : 'N/A'}
              </Badge>
              {metricsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{metrics.totalLeads}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Conversiones</p>
                <p className="text-2xl font-bold">{metrics.activeLeads}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Tasa Conversión</p>
                <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold">$0</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No hay datos disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Actividad reciente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Actividad Reciente</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Cache: {activityUpdatedAt ? getTimeAgo(activityUpdatedAt) : 'N/A'}
              </Badge>
              {activityLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : activity?.length ? (
            <div className="space-y-3">
              {activity.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">{item.timestamp}</p>
                  </div>
                  <Badge variant={item.type === 'lead_created' ? 'default' : 'secondary'}>
                    {item.type}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay actividad reciente</p>
          )}
        </CardContent>
      </Card>

      {/* Resumen de rendimiento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resumen de Rendimiento</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Cache: {performanceUpdatedAt ? getTimeAgo(performanceUpdatedAt) : 'N/A'}
              </Badge>
              {performanceLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {performanceLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : performance ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Leads Hoy</p>
                <p className="text-xl font-bold text-green-600">+{performance.totalLeads || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Conversiones Hoy</p>
                <p className="text-xl font-bold text-blue-600">+{performance.convertedLeads || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ingresos Hoy</p>
                <p className="text-xl font-bold text-purple-600">$0</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No hay datos de rendimiento</p>
          )}
        </CardContent>
      </Card>

      {/* Información del cache */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Información del Cache</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Los datos se cachean automáticamente en Redis</p>
            <p>• TTL: Métricas (5min), Actividad (2min), Rendimiento (1min)</p>
            <p>• El cache se invalida automáticamente con mutaciones</p>
            <p>• Usa el botón &quot;Refrescar Cache&quot; para forzar actualización</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}