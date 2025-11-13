'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { ManychatBroadcastPanel } from '@/components/manychat/ManychatBroadcastPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Radio, Clock, CheckCircle2, XCircle, Users, Calendar } from 'lucide-react'
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

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePanel, setShowCreatePanel] = useState(false)

  useEffect(() => {
    // fetchBroadcasts() - TODO: implementar endpoint
    setLoading(false)
    
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

  const handleBroadcastSent = (broadcastId: number) => {
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
        title="Broadcasts de Manychat"
        subtitle="Gestiona los envíos masivos de mensajes"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
        actions={
          <Button onClick={() => setShowCreatePanel(!showCreatePanel)}>
            <Radio className="w-4 h-4 mr-2" />
            {showCreatePanel ? 'Ocultar formulario' : 'Nuevo Broadcast'}
          </Button>
        }
      />

      <div className="p-6 space-y-6">
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
            {loading ? (
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
      </div>
    </div>
  )
}

