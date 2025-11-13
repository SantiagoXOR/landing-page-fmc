'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'not_configured' | 'checking'

interface ManychatConnectionStatusProps {
  className?: string
  showDetails?: boolean
}

export function ManychatConnectionStatus({ 
  className, 
  showDetails = false 
}: ManychatConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    checkConnection()
    
    // Verificar cada 5 minutos
    const interval = setInterval(checkConnection, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const checkConnection = async () => {
    try {
      setStatus('checking')
      
      const response = await fetch('/api/manychat/health')
      const data = await response.json()
      
      setLastCheck(new Date())
      
      if (data.status === 'healthy') {
        setStatus('connected')
        setErrorMessage('')
      } else if (data.status === 'not_configured') {
        setStatus('not_configured')
        setErrorMessage('API Key no configurada')
      } else {
        setStatus('error')
        setErrorMessage(data.message || 'Error de conexión')
      }
    } catch (error) {
      setStatus('disconnected')
      setErrorMessage('No se pudo conectar al servidor')
      setLastCheck(new Date())
    }
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle2,
          text: 'Conectado',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
        }
      case 'checking':
        return {
          icon: Loader2,
          text: 'Verificando...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
        }
      case 'error':
        return {
          icon: XCircle,
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
        }
      case 'not_configured':
        return {
          icon: AlertCircle,
          text: 'No configurado',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
        }
      case 'disconnected':
      default:
        return {
          icon: XCircle,
          text: 'Desconectado',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  if (!showDetails) {
    // Versión compacta (badge)
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors hover:opacity-80',
              config.bgColor,
              config.color,
              config.borderColor,
              className
            )}
          >
            <Icon className={cn(
              'w-3 h-3',
              status === 'checking' && 'animate-spin'
            )} />
            <span>Manychat</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Estado de Manychat</h4>
              <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', config.color)} />
                <span className="text-sm">{config.text}</span>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                {errorMessage}
              </p>
            )}

            {lastCheck && (
              <p className="text-xs text-gray-500">
                Última verificación: {lastCheck.toLocaleTimeString('es-AR')}
              </p>
            )}

            <Button
              onClick={checkConnection}
              size="sm"
              variant="outline"
              className="w-full"
              disabled={status === 'checking'}
            >
              <RefreshCw className={cn(
                'w-3 h-3 mr-2',
                status === 'checking' && 'animate-spin'
              )} />
              Verificar ahora
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Versión expandida (card)
  return (
    <Card className={cn('border-l-4', config.borderColor, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn(
              'w-5 h-5',
              config.color,
              status === 'checking' && 'animate-spin'
            )} />
            <CardTitle className="text-base">Estado de Manychat</CardTitle>
          </div>
          <Badge className={cn(config.bgColor, config.color, 'border', config.borderColor)}>
            {config.text}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        {status === 'connected' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Conexión establecida con Manychat API
            </p>
          </div>
        )}

        {lastCheck && (
          <div className="text-xs text-gray-500">
            Última verificación: {lastCheck.toLocaleString('es-AR')}
          </div>
        )}

        <Button
          onClick={checkConnection}
          size="sm"
          variant="outline"
          className="w-full"
          disabled={status === 'checking'}
        >
          <RefreshCw className={cn(
            'w-4 h-4 mr-2',
            status === 'checking' && 'animate-spin'
          )} />
          Verificar conexión
        </Button>
      </CardContent>
    </Card>
  )
}

