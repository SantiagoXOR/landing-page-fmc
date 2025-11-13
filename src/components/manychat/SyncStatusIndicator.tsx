'use client'

import { cn } from '@/lib/utils'
import { SyncStatusIndicatorProps } from '@/types/manychat-ui'
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function SyncStatusIndicator({
  status,
  lastSyncAt,
  error,
  onClick,
  className,
}: SyncStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'idle':
      default:
        return <RefreshCw className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'syncing':
        return 'Sincronizando...'
      case 'success':
        return 'Sincronizado'
      case 'error':
        return 'Error al sincronizar'
      case 'idle':
      default:
        if (lastSyncAt) {
          return `Última sincronización: ${formatDistanceToNow(lastSyncAt, { locale: es, addSuffix: true })}`
        }
        return 'No sincronizado'
    }
  }

  const getTooltipContent = () => {
    const parts = [getStatusText()]
    
    if (lastSyncAt && status !== 'syncing') {
      parts.push(`Última actualización: ${lastSyncAt.toLocaleString('es-AR')}`)
    }
    
    if (error) {
      parts.push(`Error: ${error}`)
    }
    
    if (onClick) {
      parts.push('Click para ver detalles')
    }

    return parts.join('\n')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={!onClick || status === 'syncing'}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              onClick && status !== 'syncing' && 'hover:bg-gray-100 cursor-pointer',
              !onClick && 'cursor-default',
              status === 'syncing' && 'cursor-wait',
              className
            )}
          >
            {getStatusIcon()}
            <span className={cn(
              'text-sm',
              status === 'syncing' && 'text-blue-600',
              status === 'success' && 'text-green-600',
              status === 'error' && 'text-red-600',
              status === 'idle' && 'text-gray-600'
            )}>
              {status === 'syncing' ? 'Sincronizando...' : 
               status === 'success' ? 'Sincronizado' :
               status === 'error' ? 'Error' :
               'Sincronizar'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs whitespace-pre-line">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

