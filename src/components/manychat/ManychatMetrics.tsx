'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useManychatMetrics } from '@/hooks/useManychatMetrics'
import { 
  Users, 
  MessageSquare, 
  Bot, 
  User, 
  TrendingUp, 
  Tag as TagIcon,
  Workflow,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ManychatMetricsProps {
  className?: string
}

export function ManychatMetrics({ className }: ManychatMetricsProps) {
  const {
    totalSubscribers,
    syncedLeads,
    unsyncedLeads,
    botMessages,
    agentMessages,
    activeFlows,
    topTags,
    loading,
    error,
    refresh,
  } = useManychatMetrics()

  if (loading) {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-800">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const totalLeads = syncedLeads + unsyncedLeads
  const syncPercentage = totalLeads > 0 ? Math.round((syncedLeads / totalLeads) * 100) : 0
  const totalMessages = botMessages + agentMessages
  const botPercentage = totalMessages > 0 ? Math.round((botMessages / totalMessages) * 100) : 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Subscribers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              Total en Manychat
            </p>
          </CardContent>
        </Card>

        {/* Leads Sincronizados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sincronizados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncedLeads}</div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {syncPercentage}% del total
              </p>
              <Badge variant="outline" className="text-xs">
                {unsyncedLeads} pendientes
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Mensajes de Bot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mensajes Bot
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{botMessages}</div>
            <p className="text-xs text-muted-foreground">
              {botPercentage}% del total
            </p>
          </CardContent>
        </Card>

        {/* Mensajes de Agente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mensajes Agente
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentMessages}</div>
            <p className="text-xs text-muted-foreground">
              {100 - botPercentage}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Flujos activos y Tags */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Flujos Activos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Flujos Activos
              </CardTitle>
              <Badge variant="outline">{activeFlows.length}</Badge>
            </div>
            <CardDescription>
              Flujos configurados en Manychat
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeFlows.length > 0 ? (
              <div className="space-y-2">
                {activeFlows.slice(0, 5).map((flow) => (
                  <div
                    key={flow.flowId}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {flow.flowName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {flow.activeLeads} leads activos
                      </p>
                    </div>
                    {flow.completionRate > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {flow.completionRate}%
                      </Badge>
                    )}
                  </div>
                ))}
                {activeFlows.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{activeFlows.length - 5} flujos más
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-500">
                <Workflow className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No hay flujos activos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Tags */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                Tags Más Usados
              </CardTitle>
              <Badge variant="outline">{topTags.length}</Badge>
            </div>
            <CardDescription>
              Tags aplicados en el CRM
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topTags.length > 0 ? (
              <div className="space-y-2">
                {topTags.slice(0, 10).map((tag) => (
                  <div
                    key={tag.tagName}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tag.tagName}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {tag.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-500">
                <TagIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No hay tags aplicados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparativa Bot vs Agente */}
      {totalMessages > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Distribución de Mensajes
            </CardTitle>
            <CardDescription>
              Bot vs Agente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Bot</span>
                    <span className="text-sm text-gray-600">{botMessages} ({botPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${botPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Agente</span>
                    <span className="text-sm text-gray-600">{agentMessages} ({100 - botPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${100 - botPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

