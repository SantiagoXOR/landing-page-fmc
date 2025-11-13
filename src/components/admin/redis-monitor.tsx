'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Database, 
  Clock, 
  Users, 
  Shield, 
  Zap, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface RedisStats {
  connected: boolean
  uptime: number
  usedMemory: number
  totalMemory: number
  connectedClients: number
  totalCommands: number
  keyspaceHits: number
  keyspaceMisses: number
  evictedKeys: number
}

interface CacheStats {
  totalKeys: number
  keysByPattern: Record<string, number>
  hitRate: number
  avgTTL: number
}

interface RateLimitStats {
  activeUsers: number
  blockedRequests: number
  topLimitedUsers: Array<{
    userId: string
    requests: number
    blocked: boolean
  }>
}

export function RedisMonitor() {
  const [redisStats, setRedisStats] = useState<RedisStats | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { addToast } = useToast()

  // Simular datos (en producción esto vendría de una API)
  const fetchStats = async () => {
    setIsLoading(true)
    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Datos simulados de Redis
      setRedisStats({
        connected: true,
        uptime: 86400, // 1 día en segundos
        usedMemory: 52428800, // 50MB
        totalMemory: 134217728, // 128MB
        connectedClients: 12,
        totalCommands: 15420,
        keyspaceHits: 8932,
        keyspaceMisses: 1245,
        evictedKeys: 23
      })

      // Datos simulados de Cache
      setCacheStats({
        totalKeys: 156,
        keysByPattern: {
          'cache:dashboard:*': 12,
          'cache:leads:*': 45,
          'cache:pipeline:*': 23,
          'rate_limit:*': 76
        },
        hitRate: 87.8,
        avgTTL: 180 // 3 minutos
      })

      // Datos simulados de Rate Limiting
      setRateLimitStats({
        activeUsers: 8,
        blockedRequests: 3,
        topLimitedUsers: [
          { userId: 'user_123', requests: 95, blocked: false },
          { userId: 'user_456', requests: 102, blocked: true },
          { userId: 'user_789', requests: 78, blocked: false }
        ]
      })

      setLastUpdate(new Date())
      addToast({
        type: "success",
        title: "Éxito",
        description: "Estadísticas actualizadas"
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        description: "Error al cargar estadísticas"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const getConnectionStatus = () => {
    if (!redisStats) return { icon: XCircle, color: 'text-gray-500', text: 'Desconocido' }
    if (redisStats.connected) return { icon: CheckCircle, color: 'text-green-500', text: 'Conectado' }
    return { icon: XCircle, color: 'text-red-500', text: 'Desconectado' }
  }

  const connectionStatus = getConnectionStatus()
  const ConnectionIcon = connectionStatus.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-red-500" />
          <h2 className="text-2xl font-bold">Monitor Redis</h2>
          <Badge variant={redisStats?.connected ? 'default' : 'destructive'}>
            <ConnectionIcon className="h-3 w-3 mr-1" />
            {connectionStatus.text}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={fetchStats}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="ratelimit">Rate Limiting</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Estado de conexión */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado</CardTitle>
                <ConnectionIcon className={`h-4 w-4 ${connectionStatus.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{connectionStatus.text}</div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {redisStats ? formatUptime(redisStats.uptime) : 'N/A'}
                </p>
              </CardContent>
            </Card>

            {/* Uso de memoria */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memoria</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {redisStats ? formatBytes(redisStats.usedMemory) : 'N/A'}
                </div>
                <Progress 
                  value={redisStats ? (redisStats.usedMemory / redisStats.totalMemory) * 100 : 0} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  de {redisStats ? formatBytes(redisStats.totalMemory) : 'N/A'}
                </p>
              </CardContent>
            </Card>

            {/* Clientes conectados */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {redisStats?.connectedClients || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Conexiones activas
                </p>
              </CardContent>
            </Card>

            {/* Comandos totales */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comandos</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {redisStats?.totalCommands?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total ejecutados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas de rendimiento */}
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Hit Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {redisStats ? 
                      Math.round((redisStats.keyspaceHits / (redisStats.keyspaceHits + redisStats.keyspaceMisses)) * 100) 
                      : 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Hits</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {redisStats?.keyspaceHits?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Misses</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {redisStats?.keyspaceMisses?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cache */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estadísticas de cache */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas de Cache</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total de claves:</span>
                  <Badge>{cacheStats?.totalKeys || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <Badge variant={cacheStats && cacheStats.hitRate > 80 ? 'default' : 'secondary'}>
                    {cacheStats?.hitRate || 0}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>TTL Promedio:</span>
                  <Badge variant="outline">
                    {cacheStats?.avgTTL || 0}s
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Distribución por patrón */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Claves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cacheStats?.keysByPattern && Object.entries(cacheStats.keysByPattern).map(([pattern, count]) => (
                    <div key={pattern} className="flex items-center justify-between">
                      <span className="text-sm font-mono">{pattern}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Rate Limiting */}
        <TabsContent value="ratelimit" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Usuarios activos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rateLimitStats?.activeUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Con límites aplicados
                </p>
              </CardContent>
            </Card>

            {/* Requests bloqueados */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {rateLimitStats?.blockedRequests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requests rechazados
                </p>
              </CardContent>
            </Card>

            {/* Alertas */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {rateLimitStats?.topLimitedUsers?.filter(u => u.blocked).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Usuarios bloqueados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top usuarios con límites */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios con Mayor Actividad</CardTitle>
              <CardDescription>
                Usuarios que están cerca o han excedido sus límites de rate limiting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rateLimitStats?.topLimitedUsers?.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-mono text-sm">{user.userId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{user.requests} requests</span>
                      <Badge variant={user.blocked ? 'destructive' : user.requests > 90 ? 'secondary' : 'default'}>
                        {user.blocked ? 'Bloqueado' : user.requests > 90 ? 'Cerca del límite' : 'Normal'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}