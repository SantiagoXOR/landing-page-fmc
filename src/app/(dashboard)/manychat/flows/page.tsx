'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Workflow, ExternalLink, Users, TrendingUp, Settings } from 'lucide-react'
import Link from 'next/link'
import { ManychatConnectionStatus } from '@/components/manychat/ManychatConnectionStatus'
import { ManychatBroadcastPanel } from '@/components/manychat/ManychatBroadcastPanel'
import { cn } from '@/lib/utils'

interface Flow {
  id: number
  name: string
  ns: string
  status: 'active' | 'inactive'
  activeLeads?: number
  completionRate?: number
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePanel, setShowCreatePanel] = useState(false)

  useEffect(() => {
    fetchFlows()
  }, [])

  const fetchFlows = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/manychat/flows')
      
      if (response.ok) {
        const data = await response.json()
        setFlows(data.flows || [])
      }
    } catch (error) {
      console.error('Error fetching flows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBroadcastSent = () => {
    setShowCreatePanel(false)
    // Opcional: refrescar datos
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Flujos de Manychat"
        subtitle="Visualiza y gestiona los flujos automáticos configurados"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
        actions={
          <div className="flex items-center gap-2">
            <ManychatConnectionStatus />
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://manychat.com/automation"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Editar en Manychat
              </a>
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="w-5 h-5" />
                  Flujos Disponibles
                </CardTitle>
                <CardDescription>
                  Flujos configurados en tu cuenta de Manychat
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchFlows}>
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-gray-500">Cargando flujos...</p>
                </div>
              </div>
            ) : flows.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {flows.map((flow) => (
                  <Card
                    key={flow.id}
                    className={cn(
                      'transition-all hover:shadow-md',
                      flow.status === 'active' ? 'border-green-200' : 'border-gray-200'
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {flow.name}
                          </CardTitle>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            {flow.ns}
                          </p>
                        </div>
                        <Badge
                          variant={flow.status === 'active' ? 'default' : 'outline'}
                          className={cn(
                            flow.status === 'active' && 'bg-green-100 text-green-800 border-green-200'
                          )}
                        >
                          {flow.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {flow.activeLeads !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>Leads activos</span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {flow.activeLeads}
                          </span>
                        </div>
                      )}

                      {flow.completionRate !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <TrendingUp className="w-4 h-4" />
                            <span>Tasa de completado</span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {flow.completionRate}%
                          </span>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <a
                          href={`https://manychat.com/fb/flow/${flow.ns}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Editar en Manychat
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Workflow className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay flujos configurados
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Crea flujos automáticos en Manychat para aparecer aquí
                </p>
                <Button variant="outline" asChild>
                  <a
                    href="https://manychat.com/automation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ir a Manychat
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de creación de broadcast */}
        {showCreatePanel && (
          <div className="mt-6">
            <ManychatBroadcastPanel onBroadcastSent={handleBroadcastSent} />
          </div>
        )}
      </div>
    </div>
  )
}

