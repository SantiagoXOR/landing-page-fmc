'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MessageSquare, MoreHorizontal, Phone, Camera, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/chat'
import Image from 'next/image'

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
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'facebook'>('all')

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.lead?.nombre
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      conversation.lead?.telefono.includes(searchTerm) ||
      conversation.messages[0]?.content.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filter === 'all' || 
      conversation.platform === filter || 
      (filter === 'facebook' && (conversation.platform === 'facebook' || conversation.platform === 'messenger'))

    return matchesSearch && matchesFilter
  })
  
  // #region agent log
  if (filteredConversations.length > 0) {
    const sample = filteredConversations.slice(0, 5).map(c => ({
      id: c.id,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt
    }))
    fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatList.tsx:filtered',message:'Filtered conversations before render',data:{total:filteredConversations.length,firstFive:sample},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  }
  // #endregion

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Fecha inválida'
    
    const date = new Date(dateString)
    
    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    
    try {
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      const diffInDays = Math.floor(diffInHours / 24)

      // Si es hoy, mostrar hora
      if (diffInHours < 24 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        })
      }
      
      // Si fue ayer
      if (diffInDays === 1 || (diffInHours < 48 && date.getDate() === now.getDate() - 1)) {
        return 'Ayer'
      }
      
      // Si fue esta semana, mostrar día abreviado
      if (diffInDays < 7) {
        return date.toLocaleDateString('es-ES', { 
          weekday: 'short'
        }).toLowerCase()
      }
      
      // Si fue hace más tiempo, mostrar fecha
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      })
    } catch (error) {
      console.error('Error formateando tiempo:', error, dateString)
      return 'Fecha inválida'
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp':
        return <Phone className="h-3.5 w-3.5 text-purple-600" />
      case 'instagram':
        return <Camera className="h-3.5 w-3.5 text-purple-600" />
      case 'facebook':
      case 'messenger':
        return <MessageCircle className="h-3.5 w-3.5 text-purple-600" />
      default:
        return <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Función para generar colores únicos basados en el nombre o ID
  const getAvatarColor = (identifier: string) => {
    if (!identifier) return 'from-purple-500 to-purple-600'
    
    // Generar hash simple del identificador
    let hash = 0
    for (let i = 0; i < identifier.length; i++) {
      hash = identifier.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    // Paleta de colores atractivos con gradientes
    const colorPalettes = [
      'from-purple-500 to-purple-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-pink-500 to-pink-600',
      'from-orange-500 to-orange-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
      'from-yellow-500 to-yellow-600',
      'from-cyan-500 to-cyan-600',
      'from-violet-500 to-violet-600',
      'from-rose-500 to-rose-600',
      'from-emerald-500 to-emerald-600',
      'from-amber-500 to-amber-600',
      'from-sky-500 to-sky-600',
    ]
    
    // Usar el hash para seleccionar un color de forma consistente
    const index = Math.abs(hash) % colorPalettes.length
    return colorPalettes[index]
  }

  const getLastMessagePreview = (conversation: Conversation) => {
    const lastMessage = conversation.messages[0]
    if (!lastMessage) return 'Sin mensajes'
    
    const content = lastMessage.content
    const isFromBot = lastMessage.isFromBot || lastMessage.direction === 'outbound'
    
    // Agregar prefijo "P:" si es del bot
    if (isFromBot) {
      return `P: ${content}`
    }
    
    return content
  }

  return (
    <div className={cn('flex flex-col h-full bg-white overflow-hidden', className)}>
      {/* Header con búsqueda */}
      <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2 mb-2 sm:mb-3 md:mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <Input
              placeholder="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 h-8 sm:h-9 text-sm"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-8 sm:h-9 w-8 sm:w-9 p-0 flex-shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Filtros estilo Prometheo - Responsive */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto -mx-2 sm:-mx-0 px-2 sm:px-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter('all')}
            className={cn(
              'text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0',
              filter === 'all' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter('instagram')}
            className={cn(
              'text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0',
              filter === 'instagram' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <Camera className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 sm:mr-1.5" />
            <span className="hidden xs:inline">Instagram</span>
            <span className="xs:hidden">IG</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter('whatsapp')}
            className={cn(
              'text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0',
              filter === 'whatsapp' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 sm:mr-1.5" />
            <span className="hidden xs:inline">WhatsApp</span>
            <span className="xs:hidden">WA</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter('facebook')}
            className={cn(
              'text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0',
              filter === 'facebook' 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <MessageCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 sm:mr-1.5" />
            <span className="hidden xs:inline">Facebook</span>
            <span className="xs:hidden">FB</span>
          </Button>
        </div>
      </div>

      {/* Lista de conversaciones */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-gray-100">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-purple-400" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                {searchTerm || filter !== 'all' 
                  ? 'No se encontraron conversaciones' 
                  : 'No hay conversaciones'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-3">
                {searchTerm || filter !== 'all'
                  ? 'Intenta ajustar los filtros o la búsqueda'
                  : 'Sincroniza con el chatbot para ver las conversaciones de tus leads. Los mensajes llegarán automáticamente vía webhooks cuando haya actividad.'}
              </p>
              {!searchTerm && filter === 'all' && (
                <div className="flex flex-col gap-2 text-xs text-gray-400">
                  <p>💡 Tip: Verifica que:</p>
                  <ul className="text-left list-disc list-inside space-y-1">
                    <li>Los leads tengan chatbot ID o teléfono válido</li>
                    <li>Los webhooks estén configurados en el chatbot</li>
                    <li>Haya actividad reciente en el chatbot</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isSelected = selectedConversationId === conversation.id
              const unreadCount = conversation.unreadCount || 0
              const hasBotAlert = conversation.botAlert || false
              const lastMessagePreview = getLastMessagePreview(conversation)

              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={cn(
                    'flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 md:p-4 cursor-pointer transition-all duration-150',
                    isSelected
                      ? 'bg-purple-50 border-l-4 border-purple-600'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  )}
                >
                  {/* Avatar con foto o iniciales - Responsive */}
                  <div className="flex-shrink-0 relative">
                    {conversation.lead?.profileImage ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-gray-200 ring-2 ring-gray-100">
                        <Image
                          src={conversation.lead.profileImage}
                          alt={conversation.lead.nombre}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold text-xs sm:text-sm ring-2 ring-gray-200",
                        getAvatarColor(conversation.lead?.nombre || conversation.lead?.id || 'U')
                      )}>
                        {getInitials(conversation.lead?.nombre || 'U')}
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-1 sm:gap-2">
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {conversation.lead?.nombre || 'Usuario'}
                        </h4>
                        {/* Icono de plataforma pequeño junto al nombre */}
                        <div className="flex-shrink-0">
                          {getPlatformIcon(conversation.platform)}
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-xs text-gray-500 flex-shrink-0">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-1 sm:gap-2">
                      <p className="text-xs sm:text-sm text-gray-600 truncate flex-1 min-w-0">
                        {lastMessagePreview}
                      </p>
                      
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Botón Bot Alert - Responsive */}
                        {hasBotAlert && (
                          <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-pink-500 text-white shadow-sm whitespace-nowrap">
                            <span className="hidden sm:inline">Bot Alert</span>
                            <span className="sm:hidden">Alert</span>
                          </span>
                        )}
                        
                        {/* Badge de mensajes no leídos - Responsive */}
                        {unreadCount > 0 && (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                            <span className="text-[10px] sm:text-xs font-semibold text-white">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          </div>
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
