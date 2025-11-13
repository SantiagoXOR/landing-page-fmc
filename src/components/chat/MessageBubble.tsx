'use client'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageTypeIndicator } from '@/components/manychat/MessageTypeIndicator'
import type { Message } from '@/types/chat'

interface MessageBubbleProps {
  message: Message
  className?: string
}

export function MessageBubble({ message, className }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'
  const isRead = !!message.readAt
  const isFromBot = message.isFromBot || false

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: es })
  }

  const getMessageIcon = () => {
    switch (message.messageType) {
      case 'image':
        return '🖼️'
      case 'video':
        return '🎥'
      case 'audio':
        return '🎵'
      case 'document':
        return '📄'
      default:
        return null
    }
  }

  return (
    <div
      className={cn(
        'flex w-full',
        isOutbound ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        {/* Indicador de tipo de mensaje (solo para bot) */}
        {!isOutbound && isFromBot && (
          <div className="flex justify-start">
            <MessageTypeIndicator
              isFromBot={isFromBot}
              messageType={message.messageType}
            />
          </div>
        )}

        <div
          className={cn(
            'max-w-xs lg:max-w-md px-4 py-2 rounded-2xl',
            isOutbound
              ? 'bg-purple-600 text-white rounded-br-md'
              : isFromBot 
                ? 'bg-blue-50 text-blue-900 rounded-bl-md border border-blue-200'
                : 'bg-gray-100 text-gray-900 rounded-bl-md'
          )}
        >
          <div className="flex items-start space-x-2">
            {!isOutbound && getMessageIcon() && (
              <span className="text-lg flex-shrink-0">
                {getMessageIcon()}
              </span>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm break-words whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center justify-end space-x-1 mt-1 text-xs',
              isOutbound ? 'text-purple-100' : isFromBot ? 'text-blue-600' : 'text-gray-500'
            )}
          >
            <span>{formatTime(message.sentAt)}</span>
            {isOutbound && (
              <span className={cn(
                'text-xs',
                isRead ? 'text-blue-300' : 'text-purple-200'
              )}>
                {isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
