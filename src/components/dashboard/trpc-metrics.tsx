'use client'

import { api } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, Users, Target, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface TRPCMetricsProps {
  dateFrom?: string
  dateTo?: string
}

export function TRPCMetrics({ dateFrom, dateTo }: TRPCMetricsProps) {
  // Using tRPC hooks for data fetching
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = api.dashboard.getMetrics.useQuery(
    { dateFrom, dateTo },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 20000, // Consider data stale after 20 seconds
    }
  )

  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
  } = api.dashboard.getRecentActivity.useQuery(
    { limit: 5 },
    {
      refetchInterval: 10000, // Refetch every 10 seconds for real-time feel
    }
  )

  const {
    data: performance,
    isLoading: performanceLoading,
    error: performanceError,
  } = api.dashboard.getPerformanceSummary.useQuery(
    { period: 'month' },
    {
      staleTime: 60000, // Performance data can be stale for 1 minute
    }
  )

  if (metricsError || activityError || performanceError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las métricas: {metricsError?.message || activityError?.message || performanceError?.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `+${metrics?.newLeadsToday || 0} hoy`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.conversionRate || 0}%</div>
            )}
            <p className="text-xs text-muted-foreground">
              {performanceLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <span className="flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{performance?.trends.conversionGrowth || 0}% vs mes anterior
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Activos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{metrics?.activeLeads || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              En proceso de seguimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo de Respuesta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {performanceLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{performance?.averageResponseTime || 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {performanceLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `${performance?.trends.responseTimeImprovement || 0}% mejora`
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Últimas acciones realizadas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: es,
                      })}
                      {activity.user && ` • ${activity.user}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
          )}
        </CardContent>
      </Card>

      {/* Leads by Source */}
      {metrics?.leadsBySource && (
        <Card>
          <CardHeader>
            <CardTitle>Leads por Fuente</CardTitle>
            <CardDescription>
              Distribución de leads según su origen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.leadsBySource.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{source.source}</span>
                  <span className="text-sm text-muted-foreground">{source.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}