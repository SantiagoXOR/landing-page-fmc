'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import { EmptyState } from './EmptyState'
import { ManychatFlowIndicator } from '@/components/manychat/ManychatFlowIndicator'
import { TagPill } from '@/components/manychat/TagPill'
import { Send, Paperclip, Smile, MoreVertical, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation, Message } from '@/types/chat'

interface ChatWindowProps {
  conversation?: Conversation
  onSendMessage: (message: string, messageType?: string, mediaUrl?: string) => void
  onTakeControl?: () => void
  onReleaseControl?: () => void
  className?: string
}

export function ChatWindow({ conversation, onSendMessage, onTakeControl, onReleaseControl, className }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const handleSendMessage = () => {
    if (!message.trim() || !conversation) return

    onSendMessage(message.trim(), 'text')
    setMessage('')
    setIsTyping(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    
    // Simular estado de escritura
    if (e.target.value && !isTyping) {
      setIsTyping(true)
    } else if (!e.target.value && isTyping) {
      setIsTyping(false)
    }
  }

  if (!conversation) {
    return (
      <div className={cn('flex-1 bg-white', className)}>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-white overflow-hidden', className)}>
      {/* Header de la conversación - Responsive (oculto en mobile porque ya está en la página) */}
      <div className="hidden md:block p-3 md:p-4 border-b border-gray-200 space-y-2 md:space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs md:text-sm">
              {conversation.lead?.nombre?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                {conversation.lead?.nombre || 'Usuario'}
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                {conversation.lead?.telefono}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              conversation.status === 'open' ? 'bg-red-500' : 'bg-green-500'
            )}></div>
            <Button variant="ghost" size="sm" className="h-7 w-7 md:h-8 md:w-8 p-0">
              <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>

        {/* Indicador de flujo del chatbot - Oculto en mobile muy pequeño */}
        {conversation.manychatData?.flowName && (
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <ManychatFlowIndicator
              flowName={conversation.manychatData.flowName}
              flowNs={conversation.manychatData.flowNs}
              botActive={conversation.manychatData.botActive}
            />
            {conversation.manychatData.botActive && onTakeControl && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTakeControl}
                className="text-[10px] md:text-xs h-6 md:h-7 px-2"
              >
                <span className="hidden sm:inline">Tomar control</span>
                <span className="sm:hidden">Control</span>
              </Button>
            )}
          </div>
        )}

        {/* Tags del lead - Oculto en mobile muy pequeño */}
        {conversation.lead?.tags && conversation.lead.tags.length > 0 && (
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <Tag className="w-3 h-3 text-gray-400 hidden sm:block" />
            {conversation.lead.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tag={tag} readonly />
            ))}
            {conversation.lead.tags.length > 3 && (
              <span className="text-[10px] md:text-xs text-gray-500">
                +{conversation.lead.tags.length - 3} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Área de mensajes - Responsive */}
      <ScrollArea className="flex-1 p-2 sm:p-3 md:p-4">
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {conversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl rounded-bl-md">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input de mensaje - Responsive */}
      <div className="p-2 sm:p-3 md:p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0">
            <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="pr-8 sm:pr-10 h-8 sm:h-9 md:h-10 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0.5 sm:right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-7 sm:w-7 p-0"
            >
              <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-auto md:px-3 p-0 md:p-2 flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline ml-1.5">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
