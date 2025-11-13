'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Trash2, TrendingUp, Database, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface CacheStats {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  hitRate: number
  size: number
  tagCount: number
}

interface CacheEntry {
  key: string
  size: number
  ttl: number
  tags: string[]
  timestamp: number
  accessCount: number
}

export function CacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [entries, setEntries] = useState<CacheEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/cache/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error)
      toast.error('Error al obtener estadísticas de cache')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const clearCache = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST'
      })
      
      if (response.ok) {
        toast.success('Cache limpiado exitosamente')
        await fetchStats()
      } else {
        toast.error('Error al limpiar cache')
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('Error al limpiar cache')
    } finally {
      setRefreshing(false)
    }
  }

  const invalidateTag = async (tag: string) => {
    try {
      const response = await fetch('/api/admin/cache/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag })
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(`${result.count} entradas invalidadas para tag: ${tag}`)
        await fetchStats()
      } else {
        toast.error('Error al invalidar cache')
      }
    } catch (error) {
      console.error('Error invalidating cache:', error)
      toast.error('Error al invalidar cache')
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Actualizar estadísticas cada 30 segundos
    const interval = setInterval(fetchStats, 30000)
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

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">No se pudieron cargar las estadísticas de cache</p>
        </CardContent>
      </Card>
    )
  }

  const getPerformanceColor = (hitRate: number) => {
    if (hitRate >= 0.8) return 'text-green-600'
    if (hitRate >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBadge = (hitRate: number) => {
    if (hitRate >= 0.8) return <Badge variant="default" className="bg-green-100 text-green-800">Excelente</Badge>
    if (hitRate >= 0.6) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Bueno</Badge>
    return <Badge variant="destructive">Necesita Mejora</Badge>
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(stats.hitRate)}`}>
              {(stats.hitRate * 100).toFixed(1)}%
            </div>
            <div className="mt-2">
              {getPerformanceBadge(stats.hitRate)}
            </div>
            <Progress value={stats.hitRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas en Cache</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.size}</div>
            <p className="text-xs text-muted-foreground">
              {stats.tagCount} tags únicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operaciones</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hits + stats.misses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.hits} hits, {stats.misses} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evictions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.evictions}</div>
            <p className="text-xs text-muted-foreground">
              Entradas eliminadas automáticamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Cache</CardTitle>
          <CardDescription>
            Controla y monitorea el rendimiento del sistema de cache
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={() => fetchStats()}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            
            <Button
              onClick={clearCache}
              disabled={refreshing}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tags Populares */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags de Cache</CardTitle>
            <CardDescription>
              Invalidar cache por categorías específicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(new Set(entries.flatMap(e => e.tags))).map(tag => (
                <div key={tag} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <Badge variant="outline">{tag}</Badge>
                    <span className="ml-2 text-sm text-gray-600">
                      {entries.filter(e => e.tags.includes(tag)).length} entradas
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => invalidateTag(tag)}
                  >
                    Invalidar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
