'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Users,
  UserPlus,
  UserCheck,
  Loader2,
  MessageSquare
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface BulkSyncProgress {
  status: 'idle' | 'running' | 'completed' | 'error'
  total: number
  processed: number
  created: number
  updated: number
  errors: number
  messagesSynced?: number
  currentStep?: string
  errorMessages: string[]
  startedAt?: string
  completedAt?: string
}

export function ManychatBulkSync() {
  const [syncId, setSyncId] = useState<string | null>(null)
  const [progress, setProgress] = useState<BulkSyncProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Polling para actualizar progreso
  useEffect(() => {
    if (!syncId || !progress || progress.status === 'completed' || progress.status === 'error') {
      return
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/manychat/bulk-sync?syncId=${syncId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.progress) {
            setProgress(data.progress)
          }
        }
      } catch (err) {
        console.error('Error obteniendo progreso:', err)
      }
    }, 2000) // Actualizar cada 2 segundos

    return () => clearInterval(interval)
  }, [syncId, progress])

  const handleStartSync = async () => {
    setLoading(true)
    setError(null)
    setProgress(null)

    try {
      const response = await fetch('/api/manychat/bulk-sync', {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error iniciando sincronización')
      }

      const data = await response.json()
      setSyncId(data.syncId)
      setProgress({
        status: 'running',
        total: 0,
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        currentStep: 'Iniciando...',
        errorMessages: [],
        startedAt: new Date().toISOString()
      })

      // Iniciar polling inmediatamente
      setTimeout(async () => {
        try {
          const progressResponse = await fetch(`/api/manychat/bulk-sync?syncId=${data.syncId}`)
          if (progressResponse.ok) {
            const progressData = await progressResponse.json()
            if (progressData.progress) {
              setProgress(progressData.progress)
            }
          }
        } catch (err) {
          console.error('Error obteniendo progreso inicial:', err)
        }
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'Error desconocido')
      console.error('Error iniciando sincronización:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (!progress) return null

    switch (progress.status) {
      case 'running':
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            En progreso
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completado
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  const getProgressPercentage = () => {
    if (!progress || progress.total === 0) return 0
    return Math.round((progress.processed / progress.total) * 100)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Sincronización Masiva de ManyChat
            </span>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Sincroniza todos los contactos de ManyChat al CRM. Este proceso puede tomar varios minutos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Botón de inicio */}
          {!progress || progress.status === 'completed' || progress.status === 'error' ? (
            <Button
              onClick={handleStartSync}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Iniciar Sincronización
                </>
              )}
            </Button>
          ) : null}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Progreso */}
          {progress && progress.status === 'running' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{progress.currentStep || 'Procesando...'}</span>
                  <span className="text-sm text-muted-foreground">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{progress.total}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-md">
                  <div className="flex items-center gap-2 text-green-700">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-xs font-medium">Creados</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">{progress.created}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-md">
                  <div className="flex items-center gap-2 text-purple-700">
                    <UserCheck className="w-4 h-4" />
                    <span className="text-xs font-medium">Actualizados</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{progress.updated}</p>
                </div>
                {progress.messagesSynced !== undefined && (
                  <div className="p-3 bg-orange-50 rounded-md">
                    <div className="flex items-center gap-2 text-orange-700">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-medium">Mensajes</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{progress.messagesSynced}</p>
                  </div>
                )}
              </div>

              {/* Errores */}
              {progress.errors > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {progress.errors} error{progress.errors !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resultado final */}
          {progress && progress.status === 'completed' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Sincronización Completada</span>
                </div>
                <p className="text-sm text-green-700">
                  Se procesaron {progress.total} contactos en total.
                </p>
              </div>

              {/* Estadísticas finales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{progress.total}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-md">
                  <div className="flex items-center gap-2 text-green-700">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-xs font-medium">Creados</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">{progress.created}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-md">
                  <div className="flex items-center gap-2 text-purple-700">
                    <UserCheck className="w-4 h-4" />
                    <span className="text-xs font-medium">Actualizados</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{progress.updated}</p>
                </div>
                {progress.messagesSynced !== undefined && progress.messagesSynced > 0 && (
                  <div className="p-3 bg-orange-50 rounded-md">
                    <div className="flex items-center gap-2 text-orange-700">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-medium">Mensajes</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900 mt-1">{progress.messagesSynced}</p>
                  </div>
                )}
              </div>

              {/* Tiempo */}
              {progress.startedAt && progress.completedAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    Completado{' '}
                    {formatDistanceToNow(new Date(progress.completedAt), {
                      addSuffix: true,
                      locale: es
                    })}
                  </span>
                </div>
              )}

              {/* Errores si los hay */}
              {progress.errors > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {progress.errors} error{progress.errors !== 1 ? 'es' : ''} durante la sincronización
                    </span>
                  </div>
                  {progress.errorMessages.length > 0 && (
                    <ul className="text-xs text-yellow-700 mt-2 space-y-1">
                      {progress.errorMessages.slice(0, 5).map((msg, idx) => (
                        <li key={idx}>• {msg}</li>
                      ))}
                      {progress.errorMessages.length > 5 && (
                        <li className="text-yellow-600">
                          ... y {progress.errorMessages.length - 5} más
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error final */}
          {progress && progress.status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Error en la Sincronización</span>
              </div>
              {progress.errorMessages.length > 0 && (
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  {progress.errorMessages.map((msg, idx) => (
                    <li key={idx}>• {msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

