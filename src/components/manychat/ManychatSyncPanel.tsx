'use client'

import { useEffect } from 'react'
import { ManychatSyncPanelProps } from '@/types/manychat-ui'
import { useManychatSync } from '@/hooks/useManychatSync'
import { ManychatBadge } from './ManychatBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink, Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export function ManychatSyncPanel({ leadId, onSyncComplete }: ManychatSyncPanelProps) {
  const { addToast } = useToast()
  const {
    isSynced,
    isManychatConfigured,
    syncNow,
    syncStatus,
    lastSyncAt,
    loading,
    error,
  } = useManychatSync(leadId)

  const handleSync = async () => {
    try {
      await syncNow()
      addToast({
        title: 'Sincronización exitosa',
        description: 'El contacto ha sido sincronizado con el chatbot',
        type: 'success',
      })
      onSyncComplete?.()
    } catch (err) {
      // El error ya está manejado por el hook
    }
  }

  if (!isManychatConfigured) {
    return (
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <CardTitle className="text-lg text-yellow-900">
              Chatbot no configurado
            </CardTitle>
          </div>
          <CardDescription className="text-yellow-700">
            Configura el chatbot para sincronizar contactos automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild className="w-full">
            <a href="/settings/manychat" className="flex items-center justify-center gap-2">
              Configurar Chatbot
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className={cn(
              'w-5 h-5',
              syncStatus === 'syncing' ? 'animate-pulse text-blue-600' : 
              isSynced ? 'text-green-600' : 'text-gray-400'
            )} />
            <CardTitle className="text-lg">Estado del Chatbot</CardTitle>
          </div>
          {isSynced && (
            <ManychatBadge variant="success" size="sm">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Conectado
            </ManychatBadge>
          )}
        </div>
        <CardDescription>
          {isSynced 
            ? 'Este contacto está sincronizado con el chatbot' 
            : 'Sincroniza este contacto para enviar mensajes automáticos'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado visual */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-3 h-3 rounded-full',
              isSynced ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            )} />
            <div>
              <p className="text-sm font-medium">
                {isSynced ? 'Sincronizado' : 'No sincronizado'}
              </p>
              {lastSyncAt && (
                <p className="text-xs text-gray-500">
                  Hace {formatDistanceToNow(lastSyncAt, { locale: es, addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Botón de acción */}
        <Button
          onClick={handleSync}
          disabled={syncStatus === 'syncing' || loading}
          className="w-full"
          variant={isSynced ? 'outline' : 'default'}
          size="lg"
        >
          {syncStatus === 'syncing' ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {isSynced ? 'Actualizar sincronización' : 'Sincronizar ahora'}
            </>
          )}
        </Button>

        {/* Info adicional */}
        {isSynced && (
          <p className="text-xs text-center text-gray-500">
            ✓ Los mensajes se enviarán automáticamente a través del chatbot
          </p>
        )}
      </CardContent>
    </Card>
  )
}

