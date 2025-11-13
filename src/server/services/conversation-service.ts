import { supabase } from '@/lib/db'

export interface CreateConversationData {
  platform: string
  platformId: string
  leadId?: string
}

export interface ConversationWithDetails {
  id: string
  platform: string
  platformId: string
  status: string
  assignedTo?: string
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
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
    sentAt: Date
    readAt?: Date
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
          lead:Lead(id, nombre, telefono, email),
          assigned_user:auth.users!conversations_assigned_to_fkey(id)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // No encontrado
        throw error
      }

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

      return {
        ...(conversation as any),
        messages: messages || []
      }
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
      query = query
        .order('last_message_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: conversations, error, count } = await query

      if (error) throw error

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

      const { error } = await supabase.client
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating conversation activity:', error)
      throw new Error('Failed to update conversation activity')
    }
  }
}
