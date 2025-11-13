'use client'

import { MessageTypeIndicatorProps } from '@/types/manychat-ui'
import { Bot, User, FileText } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function MessageTypeIndicator({
  isFromBot = false,
  flowName,
  messageType = 'text',
}: MessageTypeIndicatorProps) {
  if (!isFromBot) {
    return null // No mostrar indicador para mensajes de agente
  }

  const getIcon = () => {
    if (messageType === 'template') {
      return <FileText className="w-3 h-3" />
    }
    return <Bot className="w-3 h-3" />
  }

  const getLabel = () => {
    if (messageType === 'template') {
      return 'Mensaje automático'
    }
    if (flowName) {
      return `Bot: ${flowName}`
    }
    return 'Mensaje de bot'
  }

  const getTooltipContent = () => {
    const parts = []
    
    if (messageType === 'template') {
      parts.push('Mensaje enviado usando template de WhatsApp')
    } else {
      parts.push('Mensaje enviado automáticamente por Manychat')
    }
    
    if (flowName) {
      parts.push(`Flujo: ${flowName}`)
    }
    
    return parts.join('\n')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              messageType === 'template' 
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            )}
          >
            {getIcon()}
            <span>{getLabel()}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs whitespace-pre-line">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

