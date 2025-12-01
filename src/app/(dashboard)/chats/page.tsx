'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { ChatList } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/chat'

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | undefined>()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'sidebar'>('list')

  const fetchConversations = useCallback(async (sync: boolean = false) => {
    try {
      setLoading(true)
      
      const url = sync ? '/api/conversations?sync=true' : '/api/conversations'
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        const apiConversations = data.conversations || []
        
        // Siempre usar las conversaciones del API, incluso si están vacías
        setConversations(apiConversations)
        
        if (sync) {
          if (apiConversations.length > 0) {
            setSyncStatus(`Sincronizado: ${apiConversations.length} conversaciones`)
          } else {
            setSyncStatus('No hay conversaciones para mostrar. Sincroniza con Manychat primero.')
          }
          setTimeout(() => setSyncStatus(null), 5000)
        }
      } else {
        // Si el API falla, mostrar array vacío y mensaje de error
        setConversations([])
        if (sync) {
          setSyncStatus('Error al obtener conversaciones')
          setTimeout(() => setSyncStatus(null), 5000)
        }
      }
    } catch (error) {
      // Si hay un error, mostrar array vacío
      setConversations([])
      if (sync) {
        setSyncStatus('Error de conexión al obtener conversaciones')
        setTimeout(() => setSyncStatus(null), 5000)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSyncManychat = async () => {
    try {
      setSyncing(true)
      setSyncStatus('Sincronizando...')
      
      const response = await fetch('/api/conversations/sync-manychat', {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        const syncedConversations = data.conversations || []
        const syncedCount = data.synced || 0
        const foundSubscribers = data.foundSubscribers || 0
        
        // Actualizar inmediatamente con las conversaciones retornadas
        if (syncedConversations.length > 0) {
          setConversations(syncedConversations)
          const conversationsWithMessages = data.conversationsWithMessages || 0
          const conversationsWithoutMessages = data.conversationsWithoutMessages || 0
          
          let statusMessage = `Sincronizado: ${syncedCount} conversaciones`
          if (foundSubscribers > 0) {
            statusMessage += `, ${foundSubscribers} nuevos subscribers encontrados`
          }
          if (conversationsWithoutMessages > 0) {
            statusMessage += `. ${conversationsWithoutMessages} sin mensajes aún (llegarán vía webhooks)`
          }
          
          setSyncStatus(statusMessage)
        } else {
          // Si no hay conversaciones pero se encontraron subscribers, recargar
          if (foundSubscribers > 0) {
            await fetchConversations(false)
            setSyncStatus(`Encontrados ${foundSubscribers} subscribers. Recargando conversaciones...`)
          } else {
            const errorMessage = data.message || 'No hay conversaciones para sincronizar. Asegúrate de tener leads con manychatId o teléfonos válidos.'
            setSyncStatus(errorMessage)
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setSyncStatus(errorData.error || 'Error al sincronizar')
      }
    } catch (error: any) {
      setSyncStatus(`Error de conexión: ${error.message || 'No se pudo conectar con el servidor'}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncStatus(null), 5000)
    }
  }

  // Cargar conversaciones al montar el componente y cuando cambien filtros
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    
    // En mobile, cambiar a vista de chat
    if (window.innerWidth < 768) {
      setMobileView('chat')
    }
    
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
      .catch(() => {
        // Error silencioso, la conversación ya está seleccionada
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
    } catch {
      // Error silencioso
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
    } catch {
      // Error silencioso
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
    } catch {
      // Error silencioso
    }
  }

  const handleAddNote = () => {
    // Implementar lógica para agregar notas
  }

  // Botón de sincronizar para el Header
  const syncButton = (
    <div className="flex items-center gap-2">
      {syncStatus && (
        <div className={cn(
          "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-sm",
          syncStatus.includes('Error') || syncStatus.includes('error')
            ? "bg-red-50 text-red-700 border border-red-200"
            : syncStatus.includes('Sincronizado') || syncStatus.includes('Encontrados')
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-blue-50 text-blue-700 border border-blue-200"
        )}>
          {syncStatus.includes('Error') || syncStatus.includes('error') ? (
            <span className="text-red-500">✕</span>
          ) : syncStatus.includes('Sincronizado') || syncStatus.includes('Encontrados') ? (
            <span className="text-green-500">✓</span>
          ) : (
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
          )}
          <span>{syncStatus}</span>
        </div>
      )}
      <Button
        onClick={handleSyncManychat}
        disabled={syncing || loading}
        size="sm"
        className={cn(
          "h-9 sm:h-10 w-9 sm:w-10 p-0 flex items-center justify-center transition-all",
          syncing
            ? "bg-purple-400 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        )}
      >
        <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${syncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Chats"
          subtitle="Gestiona las conversaciones de WhatsApp e Instagram"
          showDateFilter={false}
          showExportButton={false}
          showNewButton={false}
          actions={syncButton}
        />
        <div className="flex h-[calc(100vh-80px)]">
          <div className="hidden md:block w-1/3 bg-white border-r border-gray-200 animate-pulse">
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
        actions={syncButton}
      />

      {/* Layout Responsive */}
      <div className="flex h-[calc(100vh-80px)] relative overflow-hidden">
        {/* Mobile: Vista de lista */}
        <div className={cn(
          'bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 h-full overflow-hidden',
          'md:w-1/3 lg:w-80',
          mobileView === 'list' ? 'w-full' : 'hidden md:flex',
          mobileView === 'chat' && 'hidden'
        )}>
          <ChatList
            conversations={conversations}
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Mobile: Vista de chat */}
        <div className={cn(
          'flex-1 flex flex-col bg-white transition-transform duration-300 h-full overflow-hidden',
          mobileView === 'chat' ? 'w-full' : 'hidden md:flex',
          mobileView === 'list' && 'hidden'
        )}>
          {/* Botón volver en mobile */}
          {selectedConversation && (
            <div className="md:hidden flex items-center gap-2 p-3 border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView('list')}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {selectedConversation.lead?.nombre || 'Usuario'}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMobileView('sidebar')
                }}
                className="h-8 w-8 p-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </Button>
            </div>
          )}
          <ChatWindow
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Desktop: Sidebar siempre visible, Mobile: Drawer */}
        <div className={cn(
          'bg-white border-l border-gray-200 transition-transform duration-300 h-full overflow-y-auto',
          'lg:w-80',
          // Desktop: siempre visible en lg+
          'hidden lg:block',
          // Tablet: oculto por defecto, se puede mostrar
          'md:hidden',
          // Mobile: drawer
          mobileView === 'sidebar' && 'fixed inset-y-0 right-0 w-full max-w-sm z-50 shadow-xl block'
        )}>
          {mobileView === 'sidebar' && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Detalles</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMobileView('chat')
                }}
                className="h-8 w-8 p-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          )}
          <ChatSidebar
            conversation={selectedConversation}
            onAssignUser={handleAssignUser}
            onCloseConversation={() => {
              handleCloseConversation()
              if (window.innerWidth < 768) {
                setMobileView('list')
              }
            }}
            onAddNote={handleAddNote}
          />
        </div>

        {/* Overlay para mobile sidebar */}
        {mobileView === 'sidebar' && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => {
              setMobileView('chat')
            }}
          />
        )}
      </div>
    </div>
  )
}

// Datos mock para desarrollo (mantenido para referencia futura)
// eslint-disable-next-line no-unused-vars
function getMockConversations(): Conversation[] {
  return [
    {
      id: '1',
      platform: 'whatsapp',
      status: 'open',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      unreadCount: 2,
      lead: {
        id: 'lead1',
        nombre: 'Ariel',
        telefono: '+54123456789',
        email: 'ariel@email.com'
      },
      messages: [
        {
          id: 'msg1',
          direction: 'outbound',
          content: '¡Hola Ariel! Soy Clara, la asistente del Team...',
          messageType: 'text',
          sentAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          isFromBot: true
        }
      ]
    },
    {
      id: '2',
      platform: 'instagram',
      status: 'assigned',
      assignedTo: 'user1',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      unreadCount: 18,
      lead: {
        id: 'lead2',
        nombre: 'Eugenio Alonso',
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
          direction: 'outbound',
          content: 'Muchas gracias por todos los datos...',
          messageType: 'text',
          sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          isFromBot: true
        }
      ]
    },
    {
      id: '3',
      platform: 'whatsapp',
      status: 'open',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      botAlert: true,
      lead: {
        id: 'lead3',
        nombre: 'Lucas de Martos',
        telefono: '+54123456791'
      },
      messages: [
        {
          id: 'msg3',
          direction: 'outbound',
          content: 'Sii yo creo que si!...',
          messageType: 'text',
          sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          isFromBot: true
        }
      ]
    },
    {
      id: '4',
      platform: 'whatsapp',
      status: 'open',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      lead: {
        id: 'lead4',
        nombre: 'Marcelo Avila',
        telefono: '+54123456792'
      },
      messages: [
        {
          id: 'msg4',
          direction: 'outbound',
          content: '¡Gracias, Marcelo! He elevado tu...',
          messageType: 'text',
          sentAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          isFromBot: true
        }
      ]
    }
  ]
}
