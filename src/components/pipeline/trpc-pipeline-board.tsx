'use client'

import { useState } from 'react'
import { api } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  User, 
  Calendar,
  DollarSign,
  Phone,
  Mail
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/components/ui/toast'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  value?: number
  score: number
  lastContact?: string
  source: string
}

interface PipelineStage {
  id: string
  name: string
  color: string
  leads: Lead[]
  conversionRate: number
}

export function TRPCPipelineBoard() {
  const [selectedLead, setSelectedLead] = useState<string | null>(null)
  const utils = api.useUtils()
  const { addToast } = useToast()

  // Fetch pipeline data
  const {
    data: stages,
    isLoading: stagesLoading,
    error: stagesError,
  } = api.pipeline.getStages.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const {
    data: metrics,
    isLoading: metricsLoading,
  } = api.pipeline.getMetrics.useQuery({})

  const {
    data: conversionRates,
    isLoading: conversionLoading,
  } = api.pipeline.getConversionRates.useQuery({})

  // Move lead mutation
  const moveLead = api.pipeline.moveLead.useMutation({
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: "Éxito",
        description: `Lead "${data.leadId || 'Lead'}" movido exitosamente`
      })
      // Invalidate related queries
      utils.pipeline.getStages.invalidate()
      utils.pipeline.getMetrics.invalidate()
      utils.dashboard.getMetrics.invalidate()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error al mover lead',
        description: error.message
      })
    },
  })

  const handleMoveLead = async (leadId: string, fromStage: string, toStage: string) => {
    moveLead.mutate({
      leadId,
      fromStage,
      toStage,
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      proposal: 'bg-purple-100 text-purple-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed_won: 'bg-emerald-100 text-emerald-800',
      closed_lost: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  if (stagesError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar el pipeline: {stagesError.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total en Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                ${metrics?.totalValue?.toLocaleString() || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {metrics?.totalLeads || 0} leads activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {conversionLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {0}%
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Promedio del pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.averageSalesCycle || 0}d
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Desde lead hasta cierre
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Calientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.totalLeads || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Score &gt; 80
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {stagesLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          stages?.map((stage) => (
            <Card key={stage.id} className="min-h-[400px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {stage.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {0}
                  </Badge>
                </div>
                <CardDescription className="flex items-center space-x-2">
                  <span>Conversión: 0%</span>
                  {false ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* No leads data available */}
                  {[].map((lead: any) => (
                    <Card 
                      key={lead.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedLead === lead.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedLead(lead.id)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm truncate">
                              {lead.name}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getScoreColor(lead.score)}`}
                            >
                              {lead.score}
                            </Badge>
                          </div>
                          
                          {lead.company && (
                            <p className="text-xs text-muted-foreground truncate">
                              {lead.company}
                            </p>
                          )}
                          
                          {lead.value && (
                            <p className="text-xs font-medium text-green-600">
                              ${lead.value.toLocaleString()}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{lead.source}</span>
                          </div>
                          
                          {lead.lastContact && (
                            <p className="text-xs text-muted-foreground">
                              Último contacto: {formatDistanceToNow(
                                new Date(lead.lastContact),
                                { addSuffix: true, locale: es }
                              )}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            {lead.email && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <Mail className="h-3 w-3" />
                              </Button>
                            )}
                            {lead.phone && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <Phone className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No hay leads en esta etapa</p>
                    </div>
                  )}
                </div>
                
                {/* Quick Move Actions */}
                {selectedLead && false && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs font-medium mb-2">Mover a:</p>
                    <div className="flex flex-wrap gap-1">
                      {stages
                        ?.filter(s => s.id !== stage.id)
                        .map(targetStage => (
                          <Button
                            key={targetStage.id}
                            size="sm"
                            variant="outline"
                            className="text-xs h-6"
                            onClick={() => handleMoveLead(
                              selectedLead!,
                              stage.id,
                              targetStage.id
                            )}
                            disabled={moveLead.isPending}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            {targetStage.name}
                          </Button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}