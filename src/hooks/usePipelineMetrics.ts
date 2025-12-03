import { useState, useEffect, useCallback } from 'react'

export interface MetricsComparison {
  current: number
  previous: number
  change: number // porcentaje de cambio
  trend: 'up' | 'down' | 'stable'
}

export interface PipelineMetricsData {
  totalLeads: MetricsComparison
  totalValue: MetricsComparison
  averageDealSize: MetricsComparison
  highPriorityLeads: MetricsComparison
  leadsWithTasks: MetricsComparison
  urgentLeads: MetricsComparison
  averageTimeInStage: MetricsComparison
  stalledLeads: MetricsComparison
}

export function usePipelineMetrics(period: 'week' | 'month' | 'quarter' = 'month') {
  const [metrics, setMetrics] = useState<PipelineMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/pipeline/metrics?period=${period}`)
      
      if (!response.ok) {
        throw new Error(`Error al obtener métricas: ${response.statusText}`)
      }

      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar métricas'
      setError(errorMessage)
      console.error('Error fetching pipeline metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  }
}

/**
 * Formatear cambio porcentual para mostrar en UI
 */
export function formatChange(change: number): string {
  if (change === 0) return 'Sin cambios'
  
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

/**
 * Obtener color según tendencia
 */
export function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'text-green-600'
    case 'down':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

/**
 * Obtener icono según tendencia
 */
export function getTrendIcon(trend: 'up' | 'down' | 'stable'): 'TrendingUp' | 'TrendingDown' | 'ArrowRight' {
  switch (trend) {
    case 'up':
      return 'TrendingUp'
    case 'down':
      return 'TrendingDown'
    default:
      return 'ArrowRight'
  }
}

