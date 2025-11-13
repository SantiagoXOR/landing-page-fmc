'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { ChatList } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import type { Conversation } from '@/types/chat'

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>()
  const [loading, setLoading] = useState(true)
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    status: 'active' as string,
    platform: '' as string,
    search: '' as string,
  })

  // Cargar conversaciones al montar el componente y cuando cambien filtros
  useEffect(() => {
    fetchConversations()
  }, [filters])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      
      // Construir query params
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.platform) params.append('platform', filters.platform)
      if (filters.search) params.append('search', filters.search)
      
      const response = await fetch(`/api/conversations?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        console.error('Error fetching conversations')
        setConversations([])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearchChange = (value: string) => {
    // Debounce la búsqueda
    setFilters(prev => ({ ...prev, search: value }))
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    
    // Cargar mensajes completos de la conversación en segundo plano
    fetch(`/api/conversations/${conversation.id}`)
      .then(response => {
        if (response.ok) {
          return response.json()
        }
        throw new Error('Failed to fetch conversation')
      })
      .then(data => {
        setSelectedConversation(data.conversation)
      })
      .catch(error => {
        console.error('Error fetching conversation details:', error)
      })
  }

  const handleSendMessage = async (message: string, messageType: string = 'text', mediaUrl?: string) => {
    if (!selectedConversation) return

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          messageType,
          mediaUrl
        })
      })

      if (response.ok) {
        // Actualizar la conversación local
        const updatedConversation = {
          ...selectedConversation,
          messages: [
            ...selectedConversation.messages,
            {
              id: Date.now().toString(),
              direction: 'outbound' as const,
              content: message,
              messageType,
              sentAt: new Date().toISOString(),
              readAt: undefined
            }
          ]
        }
        setSelectedConversation(updatedConversation)
        
        // Actualizar la lista de conversaciones
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, lastMessageAt: new Date().toISOString() }
              : conv
          )
        )
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleAssignUser = async (userId: string) => {
    if (!selectedConversation) return

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        // Actualizar la conversación local
        const updatedConversation = {
          ...selectedConversation,
          status: 'assigned',
          assignedTo: userId
        }
        setSelectedConversation(updatedConversation)
      }
    } catch (error) {
      console.error('Error assigning user:', error)
    }
  }

  const handleCloseConversation = async () => {
    if (!selectedConversation) return

    try {
      const response = await fetch(`/api/conversations/${selectedConversation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'closed' })
      })

      if (response.ok) {
        // Remover de la lista de conversaciones activas
        setConversations(prev => prev.filter(conv => conv.id !== selectedConversation.id))
        setSelectedConversation(undefined)
      }
    } catch (error) {
      console.error('Error closing conversation:', error)
    }
  }

  const handleAddNote = (note: string) => {
    console.log('Adding note:', note)
    // Implementar lógica para agregar notas
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Chats"
          subtitle="Gestiona las conversaciones de WhatsApp e Instagram"
          showDateFilter={false}
          showExportButton={false}
          showNewButton={false}
        />
        <div className="flex h-[calc(100vh-80px)]">
          <div className="w-1/3 bg-white border-r border-gray-200 animate-pulse">
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-white animate-pulse">
            <div className="p-8">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        title="Chats"
        subtitle="Gestiona las conversaciones de WhatsApp e Instagram"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
      />

      {/* Layout de 3 columnas */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Columna 1: Lista de conversaciones con filtros */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* Filtros y búsqueda */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            {/* Búsqueda */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar en conversaciones..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="open">Abiertas</option>
                <option value="assigned">Asignadas</option>
                <option value="closed">Cerradas</option>
                <option value="resolved">Resueltas</option>
              </select>

              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
              >
                <option value="">Todas las plataformas</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="web">Web</option>
              </select>
            </div>

            {/* Contador de resultados */}
            <div className="text-sm text-gray-500">
              {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
            </div>
          </div>

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            <ChatList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id}
              onSelectConversation={handleSelectConversation}
            />
          </div>
        </div>

        {/* Columna 2: Ventana de chat */}
        <div className="flex-1">
          <ChatWindow
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Columna 3: Panel lateral */}
        <div className="w-80">
          <ChatSidebar
            conversation={selectedConversation}
            onAssignUser={handleAssignUser}
            onCloseConversation={handleCloseConversation}
            onAddNote={handleAddNote}
          />
        </div>
      </div>
    </div>
  )
}

// Datos mock para desarrollo
function getMockConversations(): Conversation[] {
  return [
    {
      id: '1',
      platform: 'whatsapp',
      status: 'open',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      lead: {
        id: 'lead1',
        nombre: 'Diana',
        telefono: '+54123456789',
        email: 'diana@email.com'
      },
      messages: [
        {
          id: 'msg1',
          direction: 'inbound',
          content: 'Hola, me interesa saber sobre los créditos para motos',
          messageType: 'text',
          sentAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        }
      ]
    },
    {
      id: '2',
      platform: 'whatsapp',
      status: 'assigned',
      assignedTo: 'user1',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      lead: {
        id: 'lead2',
        nombre: 'Margarita Fernández',
        telefono: '+54123456790'
      },
      assignedUser: {
        id: 'user1',
        nombre: 'Agustina Rivas',
        email: 'agustina@fmc.com'
      },
      messages: [
        {
          id: 'msg2',
          direction: 'inbound',
          content: 'Muchas gracias! He recibido la información',
          messageType: 'text',
          sentAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
        }
      ]
    },
    {
      id: '3',
      platform: 'instagram',
      status: 'open',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      lead: {
        id: 'lead3',
        nombre: 'Roberto',
        telefono: '+54123456791'
      },
      messages: [
        {
          id: 'msg3',
          direction: 'inbound',
          content: 'He elevado tu consulta al departamento correspondiente',
          messageType: 'text',
          sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        }
      ]
    }
  ]
}
