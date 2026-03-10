'use client'

import { Bot } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface FlowIndicatorProps {
  flowName?: string
  flowNs?: string
  botActive?: boolean
  className?: string
}

export function FlowIndicator({
  flowName,
  flowNs,
  botActive = false,
  className,
}: FlowIndicatorProps) {
  if (!flowName && !botActive) {
    return null
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border',
              botActive
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-50 text-gray-600 border-gray-200',
              className
            )}
          >
            <Bot className={cn('w-4 h-4', botActive && 'animate-pulse')} />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {flowName || 'Bot activo'}
              </span>
              {botActive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">
              {botActive ? 'Flujo automático activo' : 'Flujo finalizado'}
            </p>
            {flowName && <p className="text-gray-400">Flujo: {flowName}</p>}
            {flowNs && <p className="text-gray-400 font-mono">{flowNs}</p>}
            {botActive && (
              <p className="text-blue-400 mt-2">
                El bot está respondiendo automáticamente
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
