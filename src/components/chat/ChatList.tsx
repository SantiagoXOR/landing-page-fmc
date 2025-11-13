'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MessageSquare, MoreHorizontal, Phone, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/chat'

interface ChatListProps {
  conversations: Conversation[]
  selectedConversationId?: string
  onSelectConversation: (conversation: Conversation) => void
  className?: string
}

export function ChatList({ 
  conversations, 
  selectedConversationId, 
  onSelectConversation,
  className 
}: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'instagram'>('all')

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.lead?.nombre
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      conversation.lead?.telefono.includes(searchTerm)

    const matchesFilter = filter === 'all' || conversation.platform === filter

    return matchesSearch && matchesFilter
  })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 48) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      })
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp':
        return <Phone className="h-4 w-4 text-green-600" />
      case 'instagram':
        return <Camera className="h-4 w-4 text-pink-600" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={cn('flex flex-col h-full bg-white border-r border-gray-200', className)}>
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className={cn(
              'text-xs',
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'whatsapp' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('whatsapp')}
            className={cn(
              'text-xs',
              filter === 'whatsapp' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Phone className="h-3 w-3 mr-1" />
            WhatsApp
          </Button>
          <Button
            variant={filter === 'instagram' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('instagram')}
            className={cn(
              'text-xs',
              filter === 'instagram' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Camera className="h-3 w-3 mr-1" />
            Instagram
          </Button>
        </div>
      </div>

      {/* Lista de conversaciones */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay conversaciones</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const lastMessage = conversation.messages[0]
              const isSelected = selectedConversationId === conversation.id

              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={cn(
                    'flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-purple-100 border border-purple-200'
                      : 'hover:bg-gray-50'
                  )}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {getInitials(conversation.lead?.nombre || 'U')}
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.lead?.nombre || 'Usuario'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">
                        {lastMessage?.content || 'Sin mensajes'}
                      </p>
                      <div className="flex items-center space-x-1">
                        {getPlatformIcon(conversation.platform)}
                        {conversation.status === 'open' && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
