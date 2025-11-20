'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { ManychatMetrics } from '@/components/manychat/ManychatMetrics'
import { ManychatConnectionStatus } from '@/components/manychat/ManychatConnectionStatus'
import { ManychatBulkSync } from '@/components/manychat/ManychatBulkSync'
import { ManychatBroadcastPanel } from '@/components/manychat/ManychatBroadcastPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Bot, ExternalLink, Settings, RefreshCw, Radio, Workflow, Info, Clock, CheckCircle2, XCircle, Users, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Broadcast {
  id: number
  name: string
  message: string
  status: 'draft' | 'scheduled' | 'sent' | 'failed'
  createdAt: Date
  sentAt?: Date
  stats?: {
    sent: number
    delivered: number
    read: number
    failed: number
  }
}

interface Flow {
  id: number
  name: string
  ns: string
  status: 'active' | 'inactive'
  activeLeads?: number
  completionRate?: number
}

export default function ManychatDashboardPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [flows, setFlows] = useState<Flow[]>([])
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(true)
  const [loadingFlows, setLoadingFlows] = useState(true)
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Cargar broadcasts
  useEffect(() => {
    // fetchBroadcasts() - TODO: implementar endpoint
    setLoadingBroadcasts(false)
    
    // Mock data para desarrollo
    setBroadcasts([
      {
        id: 1,
        name: 'Promoción Octubre',
        message: 'Oferta especial por tiempo limitado...',
        status: 'sent',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        stats: {
          sent: 150,
          delivered: 145,
          read: 98,
          failed: 5,
        },
      },
      {
        id: 2,
        name: 'Recordatorio Documentación',
        message: 'No olvides completar tu documentación...',
        status: 'scheduled',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
    ])
  }, [])

  // Cargar flujos
  useEffect(() => {
    const fetchFlows = async () => {
      try {
        setLoadingFlows(true)
        const response = await fetch('/api/manychat/flows')
        
        if (response.ok) {
          const data = await response.json()
          setFlows(data.flows || [])
        }
      } catch (error) {
        console.error('Error fetching flows:', error)
      } finally {
        setLoadingFlows(false)
      }
    }
    fetchFlows()
  }, [])

  const handleBroadcastSent = (broadcastId?: number) => {
    setShowCreatePanel(false)
    // Refresh broadcasts list
    // fetchBroadcasts()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Enviado
          </Badge>
        )
      case 'scheduled':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Programado
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Fallido
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            Borrador
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Dashboard del Chatbot"
        subtitle="Métricas y estadísticas de la integración con el chatbot"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
        actions={
          <div className="flex items-center gap-2">
            <ManychatConnectionStatus />
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/manychat">
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Banner de bienvenida */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-purple-900">
                  Integración Híbrida del Chatbot
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Flujos automáticos + Gestión manual desde el CRM
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://manychat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Abrir Chatbot
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="sync">Sincronización</TabsTrigger>
            <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
            <TabsTrigger value="flows">Flujos</TabsTrigger>
          </TabsList>

          {/* Tab: Resumen */}
          <TabsContent value="overview" className="space-y-6">
            {/* Métricas principales */}
            <ManychatMetrics />

            {/* Guía rápida */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Guía Rápida</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">📱 Enviar Mensajes</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Ve al detalle de un lead</li>
                      <li>• Usa el tab "Enviar" para mensajes</li>
                      <li>• Soporta texto, imágenes, videos, archivos</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🏷️ Gestionar Tags</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Usa el tab "Tags" en detalle de lead</li>
                      <li>• Agrega/remueve tags fácilmente</li>
                      <li>• Sincronización automática con el chatbot</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">🔄 Sincronización</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Sincronización bidireccional automática</li>
                      <li>• Usa "Sincronizar ahora" para forzar sync</li>
                      <li>• Revisa logs en el panel de sync</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">📢 Broadcasts</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Envía mensajes masivos por tags</li>
                      <li>• Requiere templates aprobados</li>
                      <li>• Cumple políticas de WhatsApp</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Sincronización */}
          <TabsContent value="sync" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Sincronización del Chatbot</h2>
              <p className="text-muted-foreground">
                Importa y sincroniza todos los contactos del chatbot al CRM
              </p>
            </div>

            {/* Información */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Información sobre la Sincronización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="font-medium text-blue-900 mb-2">⚠️ Limitación de la API del Chatbot</p>
                  <p className="text-blue-800">
                    El chatbot <strong>no proporciona un endpoint</strong> para listar todos los contactos directamente. 
                    Por esta razón, la sincronización masiva solo puede procesar contactos que ya existen en el CRM.
                  </p>
                </div>
                
                <div>
                  <p className="font-medium text-gray-900 mb-2">¿Cómo se capturan los contactos del chatbot?</p>
                  <p className="mb-2">
                    Los contactos se capturan <strong>automáticamente</strong> a través de los webhooks cuando:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li>Un usuario envía un mensaje a través del chatbot</li>
                    <li>Se crea un nuevo subscriber en el chatbot</li>
                    <li>Hay cualquier interacción con los flujos del chatbot</li>
                  </ul>
                  <p className="text-xs text-gray-600 italic">
                    Los webhooks están configurados y funcionando automáticamente. Cada vez que hay actividad 
                    en el chatbot, el contacto se sincroniza al CRM.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-gray-900 mb-2">¿Qué hace la sincronización masiva?</p>
                  <p className="mb-2">
                    La sincronización masiva procesará todos los contactos que ya existen en el CRM y:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Buscará su información correspondiente en el chatbot</li>
                    <li>Actualizará los datos con la información más reciente</li>
                    <li>Sincronizará tags y custom fields</li>
                    <li>Creará conversaciones si no existen</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Componente de sincronización */}
            <ManychatBulkSync />
          </TabsContent>

          {/* Tab: Broadcasts */}
          <TabsContent value="broadcasts" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Broadcasts del Chatbot</h2>
                <p className="text-muted-foreground">
                  Gestiona los envíos masivos de mensajes
                </p>
              </div>
              <Button onClick={() => setShowCreatePanel(!showCreatePanel)}>
                <Radio className="w-4 h-4 mr-2" />
                {showCreatePanel ? 'Ocultar formulario' : 'Nuevo Broadcast'}
              </Button>
            </div>

            {/* Panel de creación */}
            {showCreatePanel && (
              <ManychatBroadcastPanel onBroadcastSent={handleBroadcastSent} />
            )}

            {/* Lista de broadcasts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5" />
                  Historial de Broadcasts
                </CardTitle>
                <CardDescription>
                  Broadcasts enviados y programados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBroadcasts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-gray-500">Cargando broadcasts...</p>
                    </div>
                  </div>
                ) : broadcasts.length > 0 ? (
                  <div className="space-y-4">
                    {broadcasts.map((broadcast) => (
                      <div
                        key={broadcast.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">
                                {broadcast.name}
                              </h3>
                              {getStatusBadge(broadcast.status)}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {broadcast.message}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {broadcast.sentAt
                                ? `Enviado ${formatDistanceToNow(broadcast.sentAt, { locale: es, addSuffix: true })}`
                                : `Creado ${formatDistanceToNow(broadcast.createdAt, { locale: es, addSuffix: true })}`
                              }
                            </span>
                          </div>

                          {broadcast.stats && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{broadcast.stats.sent} enviados</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span>{broadcast.stats.delivered} entregados</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-blue-600">👁</span>
                                <span>{broadcast.stats.read} leídos</span>
                              </div>
                              {broadcast.stats.failed > 0 && (
                                <div className="flex items-center gap-1">
                                  <XCircle className="w-3 h-3 text-red-600" />
                                  <span className="text-red-600">{broadcast.stats.failed} fallidos</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay broadcasts
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Crea tu primer broadcast para enviar mensajes masivos
                    </p>
                    <Button onClick={() => setShowCreatePanel(true)}>
                      <Radio className="w-4 h-4 mr-2" />
                      Crear Broadcast
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Flujos */}
          <TabsContent value="flows" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Flujos del Chatbot</h2>
                <p className="text-muted-foreground">
                  Visualiza y gestiona los flujos automáticos configurados
                </p>
              </div>
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
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="w-5 h-5" />
                      Flujos Disponibles
                    </CardTitle>
                    <CardDescription>
                      Flujos configurados en tu cuenta del chatbot
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const fetchFlows = async () => {
                      try {
                        setLoadingFlows(true)
                        const response = await fetch('/api/manychat/flows')
                        
                        if (response.ok) {
                          const data = await response.json()
                          setFlows(data.flows || [])
                        }
                      } catch (error) {
                        console.error('Error fetching flows:', error)
                      } finally {
                        setLoadingFlows(false)
                      }
                    }
                    fetchFlows()
                  }}>
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingFlows ? (
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
                              Editar en el Chatbot
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
                      Crea flujos automáticos en el chatbot para aparecer aquí
                    </p>
                    <Button variant="outline" asChild>
                      <a
                        href="https://manychat.com/automation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ir al Chatbot
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

