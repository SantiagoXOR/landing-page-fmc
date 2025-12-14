'use client'

import { useState, useEffect } from 'react'
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
  Bot,
  MapPin,
  DollarSign,
  Briefcase,
  Building2,
  Package,
  ExternalLink as ExternalLinkIcon,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
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
  // #region agent log
  if (conversation) {
    fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:render:conversation',message:'ChatSidebar received conversation',data:{conversationId:conversation.id,lastMessageAt:conversation.lastMessageAt,createdAt:conversation.createdAt,hasLastMessageAt:!!conversation.lastMessageAt,hasCreatedAt:!!conversation.createdAt,lastMessageAtType:typeof conversation.lastMessageAt,createdAtType:typeof conversation.createdAt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
  }
  // #endregion
  const [note, setNote] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; nombre: string; email: string }>>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  
  // Hook de sincronización del chatbot
  const {
    isSynced,
    syncNow,
    syncStatus,
    lastSyncAt,
  } = useManychatSync(conversation?.lead?.id || '')

  // Obtener agentes desde la API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents')
        if (response.ok) {
          const agents = await response.json()
          setAvailableUsers(agents)
        } else {
          // Fallback a agentes por defecto si hay error
          setAvailableUsers([
            { id: '1', nombre: 'Agustina Rivas', email: 'agustina@fmc.com' },
            { id: '2', nombre: 'Carlos Mendoza', email: 'carlos@fmc.com' },
            { id: '3', nombre: 'María González', email: 'maria@fmc.com' }
          ])
        }
      } catch (error) {
        console.error('Error fetching agents:', error)
        // Fallback a agentes por defecto
        setAvailableUsers([
          { id: '1', nombre: 'Agustina Rivas', email: 'agustina@fmc.com' },
          { id: '2', nombre: 'Carlos Mendoza', email: 'carlos@fmc.com' },
          { id: '3', nombre: 'María González', email: 'maria@fmc.com' }
        ])
      } finally {
        setLoadingAgents(false)
      }
    }

    fetchAgents()
  }, [])

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

  const formatDate = (dateString: string | undefined | null) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:formatDate:entry',message:'formatDate called',data:{dateString,type:typeof dateString,isNull:dateString===null,isUndefined:dateString===undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    if (!dateString) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:formatDate:noDate',message:'dateString is falsy',data:{dateString},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      return 'Fecha no disponible'
    }
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:formatDate:invalid',message:'Invalid date',data:{dateString,parsedDate:date.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        return 'Fecha inválida'
      }
      const formatted = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:formatDate:success',message:'Date formatted successfully',data:{dateString,formatted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return formatted
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:formatDate:error',message:'Error formatting date',data:{dateString,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return 'Fecha inválida'
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'No especificado'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount)
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
    <div className={cn('w-80 bg-white border-l border-gray-200 p-4 space-y-6 overflow-y-auto h-full', className)}>
      {/* Información del contacto */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Información del Contacto
            </CardTitle>
            {conversation.lead?.id && (
              <Link 
                href={`/leads/${conversation.lead.id}`}
                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                Ver detalle
                <ExternalLinkIcon className="h-3 w-3" />
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <User className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{conversation.lead?.nombre}</p>
              <p className="text-sm text-gray-500">Nombre completo</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{conversation.lead?.telefono}</p>
              <p className="text-sm text-gray-500">Teléfono</p>
            </div>
          </div>
          
          {conversation.lead?.email && (
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{conversation.lead.email}</p>
                <p className="text-sm text-gray-500">Email</p>
              </div>
            </div>
          )}

          {conversation.lead?.estado && (
            <div className="flex items-center space-x-3">
              <Tag className="h-4 w-4 text-gray-400" />
              <div className="flex-1">
                <Badge variant="outline" className="text-xs">
                  {conversation.lead.estado}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">Estado del lead</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del crédito */}
      {(conversation.lead?.producto || conversation.lead?.monto || conversation.lead?.zona || conversation.lead?.banco || conversation.lead?.trabajo_actual) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Información del Crédito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversation.lead?.producto && (
              <div className="flex items-center space-x-3">
                <Package className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{conversation.lead.producto}</p>
                  <p className="text-sm text-gray-500">Producto</p>
                </div>
              </div>
            )}

            {conversation.lead?.monto && (
              <div className="flex items-center space-x-3">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{formatCurrency(conversation.lead.monto)}</p>
                  <p className="text-sm text-gray-500">Monto solicitado</p>
                </div>
              </div>
            )}

            {conversation.lead?.zona && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{conversation.lead.zona}</p>
                  <p className="text-sm text-gray-500">Zona</p>
                </div>
              </div>
            )}

            {conversation.lead?.banco && (
              <div className="flex items-center space-x-3">
                <Building2 className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{conversation.lead.banco}</p>
                  <p className="text-sm text-gray-500">Banco</p>
                </div>
              </div>
            )}

            {conversation.lead?.trabajo_actual && (
              <div className="flex items-center space-x-3">
                <Briefcase className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{conversation.lead.trabajo_actual}</p>
                  <p className="text-sm text-gray-500">Trabajo actual</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chatbot Info */}
      {conversation.lead?.id && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Chatbot
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

            {/* Chatbot ID */}
            {conversation.lead?.manychatId && (
              <div>
                <span className="text-xs text-gray-500">Chatbot ID</span>
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
          {loadingAgents ? (
            <div className="text-center py-4">
              <RefreshCw className="h-4 w-4 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-xs text-gray-500">Cargando agentes...</p>
            </div>
          ) : (
            <>
              <Select value={selectedUser} onValueChange={setSelectedUser} disabled={availableUsers.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={availableUsers.length === 0 ? "No hay agentes disponibles" : "Seleccionar agente"} />
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
                disabled={!selectedUser || availableUsers.length === 0}
                className="w-full"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Asignar
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas de la conversación */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Estadísticas de la Conversación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Total mensajes</span>
            </div>
            <span className="font-medium text-gray-900">
              {conversation.messages?.length || 0}
            </span>
          </div>

          {conversation.unreadCount !== undefined && conversation.unreadCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                <span className="text-gray-600">No leídos</span>
              </div>
              <Badge variant="destructive" className="text-xs">
                {conversation.unreadCount}
              </Badge>
            </div>
          )}

          <div className="flex items-center space-x-3 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-gray-900">Conversación iniciada</p>
              {/* #region agent log */}
              {(()=>{fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:render:createdAt',message:'Rendering createdAt',data:{createdAt:conversation.createdAt,type:typeof conversation.createdAt,conversationId:conversation.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});return null;})()}
              {/* #endregion */}
              <p className="text-gray-500 text-xs">{formatDate(conversation.createdAt)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 text-sm">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-gray-900">Último mensaje</p>
              {/* #region agent log */}
              {(()=>{fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ChatSidebar.tsx:render:lastMessageAt',message:'Rendering lastMessageAt',data:{lastMessageAt:conversation.lastMessageAt,type:typeof conversation.lastMessageAt,conversationId:conversation.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});return null;})()}
              {/* #endregion */}
              <p className="text-gray-500 text-xs">{formatDate(conversation.lastMessageAt)}</p>
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
