'use client'

import { useEffect, useState } from 'react'
import { ManychatSyncPanelProps } from '@/types/manychat-ui'
import { useManychatSync } from '@/hooks/useManychatSync'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { ManychatBadge } from './ManychatBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react'
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
    logs,
    loading,
    error,
  } = useManychatSync(leadId)

  const [leadData, setLeadData] = useState<any>(null)

  useEffect(() => {
    // Obtener datos del lead
    const fetchLead = async () => {
      try {
        const response = await fetch(`/api/leads/${leadId}`)
        if (response.ok) {
          const data = await response.json()
          setLeadData(data)
        }
      } catch (err) {
        console.error('Error fetching lead:', err)
      }
    }

    fetchLead()
  }, [leadId, syncStatus])

  const handleSync = async () => {
    try {
      await syncNow()
      addToast({
        title: 'Sincronización exitosa',
        description: 'El lead ha sido sincronizado con Manychat',
        type: 'success',
      })
      onSyncComplete?.()
    } catch (err) {
      // El error ya está manejado por el hook
    }
  }

  if (!isManychatConfigured) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <CardTitle className="text-lg text-yellow-900">
              Manychat no configurado
            </CardTitle>
          </div>
          <CardDescription className="text-yellow-700">
            La integración de Manychat no está configurada o no está disponible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/settings/manychat" className="flex items-center gap-2">
              Configurar Manychat
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
            <RefreshCw className={cn(
              'w-5 h-5',
              syncStatus === 'syncing' ? 'animate-spin text-blue-600' : 'text-gray-600'
            )} />
            <CardTitle className="text-lg">Sincronización Manychat</CardTitle>
          </div>
          {isSynced ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Sincronizado
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              No sincronizado
            </Badge>
          )}
        </div>
        <CardDescription>
          Estado de sincronización con Manychat API
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado general */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Manychat ID</p>
            {leadData?.manychatId ? (
              <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                {leadData.manychatId}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No asignado</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-500">Última sincronización</p>
            {lastSyncAt ? (
              <p className="text-sm text-gray-700">
                {formatDistanceToNow(lastSyncAt, { locale: es, addSuffix: true })}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">Nunca</p>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error de sincronización</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Botón de sincronización */}
        <div className="flex items-center justify-between pt-2 border-t">
          <SyncStatusIndicator
            status={syncStatus}
            lastSyncAt={lastSyncAt || undefined}
            error={error || undefined}
          />
          
          <Button
            onClick={handleSync}
            disabled={syncStatus === 'syncing' || loading}
            size="sm"
            variant={isSynced ? 'outline' : 'default'}
          >
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {isSynced ? 'Resincronizar' : 'Sincronizar ahora'}
              </>
            )}
          </Button>
        </div>

        {/* Logs de sincronización */}
        {logs.length > 0 && (
          <div className="pt-3 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Historial reciente
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-xs"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="w-3 h-3 text-red-600" />
                    ) : (
                      <Clock className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">
                      {log.syncType.replace('_', ' ')}
                    </p>
                    <p className="text-gray-500">
                      {formatDistanceToNow(new Date(log.createdAt), { locale: es, addSuffix: true })}
                    </p>
                    {log.error && (
                      <p className="text-red-600 mt-1">{log.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="pt-3 border-t">
          <ManychatBadge variant={isSynced ? 'success' : 'warning'} size="sm">
            {isSynced ? 'Sincronización activa' : 'Sincronización pendiente'}
          </ManychatBadge>
          {isSynced && leadData?.manychatId && (
            <p className="text-xs text-gray-500 mt-2">
              Este lead está vinculado como subscriber en Manychat
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

