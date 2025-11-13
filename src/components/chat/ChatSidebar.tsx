'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagPill } from '@/components/manychat/TagPill'
import { ManychatBadge } from '@/components/manychat/ManychatBadge'
import { SyncStatusIndicator } from '@/components/manychat/SyncStatusIndicator'
import { useManychatSync } from '@/hooks/useManychatSync'
import { 
  User, 
  Phone, 
  Mail, 
  Tag, 
  UserPlus, 
  Clock, 
  MessageSquare,
  FileText,
  Calendar,
  ExternalLink,
  Bot
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/chat'

interface ChatSidebarProps {
  conversation?: Conversation
  onAssignUser: (userId: string) => void
  onCloseConversation: () => void
  onAddNote: (note: string) => void
  className?: string
}

export function ChatSidebar({ 
  conversation, 
  onAssignUser, 
  onCloseConversation,
  onAddNote,
  className 
}: ChatSidebarProps) {
  const [note, setNote] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  
  // Hook de sincronización de Manychat
  const {
    isSynced,
    syncNow,
    syncStatus,
    lastSyncAt,
  } = useManychatSync(conversation?.lead?.id || '')

  // Mock de usuarios disponibles
  const availableUsers = [
    { id: '1', nombre: 'Agustina Rivas', email: 'agustina@fmc.com' },
    { id: '2', nombre: 'Carlos Mendoza', email: 'carlos@fmc.com' },
    { id: '3', nombre: 'María González', email: 'maria@fmc.com' }
  ]

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote(note.trim())
      setNote('')
    }
  }

  const handleAssignUser = () => {
    if (selectedUser) {
      onAssignUser(selectedUser)
      setSelectedUser('')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!conversation) {
    return (
      <div className={cn('w-80 bg-white border-l border-gray-200 p-4', className)}>
        <div className="text-center text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Selecciona una conversación para ver los detalles</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-80 bg-white border-l border-gray-200 p-4 space-y-6', className)}>
      {/* Información del contacto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Información del Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{conversation.lead?.nombre}</p>
              <p className="text-sm text-gray-500">Nombre completo</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{conversation.lead?.telefono}</p>
              <p className="text-sm text-gray-500">Teléfono</p>
            </div>
          </div>
          
          {conversation.lead?.email && (
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{conversation.lead.email}</p>
                <p className="text-sm text-gray-500">Email</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manychat Info */}
      {conversation.lead?.id && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Manychat
              </CardTitle>
              {conversation.lead?.manychatId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  asChild
                >
                  <a 
                    href={`https://manychat.com/fb${conversation.lead.manychatId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Estado de sincronización */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Estado</span>
              {conversation.lead?.manychatId ? (
                <ManychatBadge variant="success" size="sm">
                  Sincronizado
                </ManychatBadge>
              ) : (
                <ManychatBadge variant="warning" size="sm">
                  No sincronizado
                </ManychatBadge>
              )}
            </div>

            {/* Manychat ID */}
            {conversation.lead?.manychatId && (
              <div>
                <span className="text-xs text-gray-500">Manychat ID</span>
                <p className="text-xs font-mono bg-white px-2 py-1 rounded mt-1">
                  {conversation.lead.manychatId}
                </p>
              </div>
            )}

            {/* Flujo activo */}
            {conversation.manychatData?.flowName && (
              <div>
                <span className="text-xs text-gray-500">Flujo activo</span>
                <div className="flex items-center gap-2 mt-1">
                  <Bot className={cn(
                    "w-3 h-3",
                    conversation.manychatData.botActive && "animate-pulse text-blue-600"
                  )} />
                  <p className="text-sm font-medium text-gray-900">
                    {conversation.manychatData.flowName}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {conversation.lead?.tags && conversation.lead.tags.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 mb-2 block">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {conversation.lead.tags.map((tag) => (
                    <TagPill key={tag} tag={tag} readonly />
                  ))}
                </div>
              </div>
            )}

            {/* Botón de sincronización */}
            {conversation.lead?.id && (
              <Button
                onClick={syncNow}
                disabled={syncStatus === 'syncing'}
                size="sm"
                variant="outline"
                className="w-full text-xs"
              >
                {syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado y asignación */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Estado de la Conversación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Estado</span>
            <Badge className={cn(
              conversation.status === 'open' ? 'bg-red-100 text-red-800' :
              conversation.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            )}>
              {conversation.status === 'open' ? 'Abierta' :
               conversation.status === 'assigned' ? 'Asignada' : 'Cerrada'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Plataforma</span>
            <Badge variant="outline">
              {conversation.platform === 'whatsapp' ? 'WhatsApp' :
               conversation.platform === 'instagram' ? 'Instagram' : 'Facebook'}
            </Badge>
          </div>

          {conversation.assignedUser && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Asignado a</span>
              <span className="text-sm font-medium text-gray-900">
                {conversation.assignedUser.nombre}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asignar a usuario */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Asignar a Agente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar agente" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleAssignUser}
            disabled={!selectedUser}
            className="w-full"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Asignar
          </Button>
        </CardContent>
      </Card>

      {/* Historial de actividad */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Historial de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-900">Conversación iniciada</p>
              <p className="text-gray-500">{formatDate(conversation.createdAt)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 text-sm">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-gray-900">Último mensaje</p>
              <p className="text-gray-500">{formatDate(conversation.lastMessageAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notas internas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Notas Internas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Agregar nota interna..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handleAddNote}
            disabled={!note.trim()}
            size="sm"
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            Agregar Nota
          </Button>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="space-y-2">
        <Button 
          onClick={onCloseConversation}
          variant="outline"
          className="w-full"
          size="sm"
        >
          Cerrar Conversación
        </Button>
      </div>
    </div>
  )
}
