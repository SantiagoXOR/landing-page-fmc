import { supabase } from '@/lib/db'

export interface CreateConversationData {
  platform: string
  platformId: string
  leadId?: string
}

export interface ConversationWithDetails {
  id: string
  platform: string
  platformId?: string
  status: string
  assignedTo?: string
  lastMessageAt: string | Date // ISO string o Date
  createdAt: string | Date // ISO string o Date
  updatedAt?: string | Date
  lead?: {
    id: string
    nombre: string
    telefono: string
    email?: string
  }
  assignedUser?: {
    id: string
    nombre: string
    email: string
  }
  messages: Array<{
    id: string
    direction: string
    content: string
    messageType: string
    sentAt: string | Date // ISO string o Date
    readAt?: string | Date
  }>
}

export class ConversationService {
  /**
   * Crear una nueva conversación
   */
  static async createConversation(data: CreateConversationData) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: conversation, error } = await supabase.client
        .from('conversations')
        .insert({
          platform: data.platform,
          platform_id: data.platformId,
          lead_id: data.leadId,
        })
        .select(`
          *,
          lead:Lead(id, nombre, telefono, email)
        `)
        .single()

      if (error) throw error

      return {
        ...conversation,
        messages: []
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      throw new Error('Failed to create conversation')
    }
  }

  /**
   * Obtener conversación por ID con mensajes
   */
  static async getConversationById(id: string): Promise<ConversationWithDetails | null> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: conversation, error } = await supabase.client
        .from('conversations')
        .select(`
          *,
          lead:Lead(id, nombre, telefono, email)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No encontrado
        throw error
      }

      // #region agent log
      if (conversation) {
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversation-service.ts:getConversationById:afterQuery',message:'Conversation fetched from DB',data:{conversationId:conversation.id,last_message_at:conversation.last_message_at,created_at:conversation.created_at,hasLastMessageAt:!!conversation.last_message_at,hasCreatedAt:!!conversation.created_at,lastMessageAtType:typeof conversation.last_message_at,createdAtType:typeof conversation.created_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
      }
      // #endregion

      // Obtener mensajes de la conversación
      const { data: messages, error: messagesError } = await supabase.client
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('sent_at', { ascending: true })

      if (messagesError) throw messagesError

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      // Transformar mensajes al formato esperado por el frontend
      const formattedMessages = (messages || []).map((msg: any) => {
        // Función helper para convertir cualquier formato de fecha a ISO string
        const toISOString = (dateValue: any): string => {
          if (!dateValue) return new Date().toISOString()
          
          // Si ya es un string ISO válido
          if (typeof dateValue === 'string') {
            const parsed = new Date(dateValue)
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString()
            }
          }
          
          // Si es un objeto Date
          if (dateValue instanceof Date) {
            if (!isNaN(dateValue.getTime())) {
              return dateValue.toISOString()
            }
          }
          
          // Fallback: fecha actual
          return new Date().toISOString()
        }

        // Obtener la mejor fecha disponible (sent_at tiene prioridad)
        const sentAt = msg.sent_at || msg.sentAt || msg.created_at || msg.createdAt
        const formattedSentAt = toISOString(sentAt)

        return {
          id: msg.id,
          direction: msg.direction || 'inbound',
          content: msg.content || '',
          messageType: msg.message_type || msg.messageType || 'text',
          sentAt: formattedSentAt, // Asegurar que siempre sea un string ISO válido
          readAt: msg.read_at || msg.readAt || undefined,
          isFromBot: msg.is_from_bot || msg.isFromBot || false,
          manychatFlowId: msg.manychat_flow_id || msg.manychatFlowId || undefined
        }
      })

      // Transformar campos de snake_case a camelCase y asegurar formato ISO
      const toISOString = (dateValue: any): string => {
        if (!dateValue) return new Date().toISOString()
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue)
          if (!isNaN(parsed.getTime())) return parsed.toISOString()
        }
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          return dateValue.toISOString()
        }
        return new Date().toISOString()
      }

      const transformed = {
        id: conversation.id,
        platform: conversation.platform || 'whatsapp',
        status: conversation.status || 'open',
        assignedTo: conversation.assigned_to,
        lastMessageAt: toISOString(conversation.last_message_at || conversation.created_at),
        createdAt: toISOString(conversation.created_at),
        lead: conversation.lead ? {
          id: conversation.lead.id,
          nombre: conversation.lead.nombre || 'Sin nombre',
          telefono: conversation.lead.telefono || '',
          email: conversation.lead.email
        } : undefined,
        messages: formattedMessages
      }
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversation-service.ts:getConversationById:return',message:'Returning transformed conversation',data:{conversationId:transformed.id,lastMessageAt:transformed.lastMessageAt,createdAt:transformed.createdAt,hasLastMessageAt:!!transformed.lastMessageAt,hasCreatedAt:!!transformed.createdAt},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return transformed
    } catch (error) {
      console.error('Error fetching conversation:', error)
      throw new Error('Failed to fetch conversation')
    }
  }

  /**
   * Obtener conversaciones con filtros avanzados
   */
  static async getConversations(filters: {
    userId?: string | null
    status?: string | null
    platform?: string | null
    search?: string | null
    assignedTo?: string | null
    page?: number
    limit?: number
  }) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const page = filters.page || 1
      const limit = filters.limit || 50
      const offset = (page - 1) * limit

      let query = supabase.client
        .from('conversations')
        .select(`
          *,
          lead:Lead(id, nombre, telefono, email, zona, estado)
        `, { count: 'exact' })

      // Aplicar filtros
      if (filters.status) {
        if (filters.status === 'active') {
          query = query.in('status', ['open', 'assigned'])
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters.platform) {
        query = query.eq('platform', filters.platform)
      }

      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }

      // Orden y paginación
      // Ordenar por last_message_at descendente, pero manejar NULLs al final
      query = query
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      const { data: conversations, error, count } = await query
      
      // #region agent log
      if (conversations && conversations.length > 0) {
        const sample = conversations.slice(0, 5).map(c => ({
          id: c.id,
          last_message_at: c.last_message_at,
          created_at: c.created_at,
          hasLastMessageAt: !!c.last_message_at
        }))
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversation-service.ts:getConversations:afterOrder',message:'Conversations after ordering',data:{total:conversations.length,firstFive:sample},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      }
      // #endregion

      if (error) throw error
      
      // #region agent log
      if (conversations && conversations.length > 0) {
        const sample = conversations[0]
        fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversation-service.ts:getConversations:afterQuery',message:'Conversations fetched from DB',data:{count:conversations.length,sampleId:sample.id,sampleCreatedAt:sample.created_at,sampleLastMessageAt:sample.last_message_at,hasCreatedAt:!!sample.created_at,hasLastMessageAt:!!sample.last_message_at,createdAtType:typeof sample.created_at,lastMessageAtType:typeof sample.last_message_at},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      }
      // #endregion

      // Si hay búsqueda, filtrar por contenido de mensajes
      let filteredConversations = conversations || []
      
      if (filters.search && filteredConversations.length > 0) {
        const conversationIds = filteredConversations.map(c => c.id)
        
        const { data: matchingMessages } = await supabase.client
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .ilike('content', `%${filters.search}%`)

        const matchingIds = new Set(matchingMessages?.map(m => m.conversation_id) || [])
        filteredConversations = filteredConversations.filter(c => matchingIds.has(c.id))
      }

      return {
        data: filteredConversations,
        total: count || 0,
        page,
        limit
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      throw new Error('Failed to fetch conversations')
    }
  }

  /**
   * Obtener conversaciones activas (método legacy)
   */
  static async getActiveConversations(userId?: string) {
    const result = await this.getConversations({
      userId,
      status: 'active'
    })
    return result.data
  }

  /**
   * Asignar conversación a un usuario
   */
  static async assignConversation(conversationId: string, userId: string) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: conversation, error } = await supabase.client
        .from('conversations')
        .update({
          assigned_to: userId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select(`
          *,
          lead:Lead(id, nombre, telefono, email)
        `)
        .single()

      if (error) throw error

      return conversation
    } catch (error) {
      console.error('Error assigning conversation:', error)
      throw new Error('Failed to assign conversation')
    }
  }

  /**
   * Cerrar conversación
   */
  static async closeConversation(conversationId: string) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: conversation, error } = await supabase.client
        .from('conversations')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single()

      if (error) throw error

      return conversation
    } catch (error) {
      console.error('Error closing conversation:', error)
      throw new Error('Failed to close conversation')
    }
  }

  /**
   * Buscar conversación por plataforma e ID
   */
  static async findConversationByPlatform(platform: string, platformId: string) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: conversation, error } = await supabase.client
        .from('conversations')
        .select(`
          *,
          lead:Lead(id, nombre, telefono, email)
        `)
        .eq('platform', platform)
        .eq('platform_id', platformId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return conversation
    } catch (error) {
      console.error('Error finding conversation by platform:', error)
      return null
    }
  }

  /**
   * Actualizar última actividad de conversación
   */
  static async updateLastActivity(conversationId: string) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      // Obtener el último mensaje de la conversación para usar su timestamp real
      const { data: messages, error: messageError } = await supabase.client
        .from('messages')
        .select('sent_at')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .limit(1)

      // Si hay un mensaje, usar su timestamp; si no, mantener el last_message_at actual o usar created_at
      let lastMessageAt: string | null = null
      if (messages && messages.length > 0 && messages[0]?.sent_at) {
        lastMessageAt = new Date(messages[0].sent_at).toISOString()
      } else {
        // Si no hay mensajes, obtener el last_message_at actual o created_at de la conversación
        const { data: currentConv } = await supabase.client
          .from('conversations')
          .select('last_message_at, created_at')
          .eq('id', conversationId)
          .single()
        
        lastMessageAt = currentConv?.last_message_at 
          ? new Date(currentConv.last_message_at).toISOString()
          : currentConv?.created_at
          ? new Date(currentConv.created_at).toISOString()
          : new Date().toISOString()
      }

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversation-service.ts:updateLastActivity',message:'Updating last_message_at',data:{conversationId,lastMessageSentAt:messages?.[0]?.sent_at,lastMessageAt,hasLastMessage:!!(messages && messages.length > 0)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      const { error } = await supabase.client
        .from('conversations')
        .update({
          last_message_at: lastMessageAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating conversation activity:', error)
      throw new Error('Failed to update conversation activity')
    }
  }

  /**
   * Obtener mensajes de una conversación por leadId y plataforma
   */
  static async getMessagesByLeadId(leadId: string, platform: string = 'whatsapp') {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      // Primero buscar la conversación del lead
      const { data: conversation, error: conversationError } = await supabase.client
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('platform', platform)
        .single()

      if (conversationError) {
        if (conversationError.code === 'PGRST116') {
          // No hay conversación, retornar array vacío
          return []
        }
        throw conversationError
      }

      if (!conversation) {
        return []
      }

      // Obtener mensajes de la conversación
      const { data: messages, error: messagesError } = await supabase.client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('sent_at', { ascending: true })

      if (messagesError) throw messagesError

      return messages || []
    } catch (error) {
      console.error('Error fetching messages by leadId:', error)
      throw new Error('Failed to fetch messages')
    }
  }
}
