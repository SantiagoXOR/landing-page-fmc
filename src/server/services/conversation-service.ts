import { supabase } from '@/lib/db'
import {
  buildLeadSearchOrParts,
  buildMessageContentSearchPattern,
  buildWhatsAppPlatformIdSearchPattern,
} from '@/lib/chat-search-utils'

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

const MAX_SEARCH_CONVERSATION_IDS = 800
const SEARCH_MESSAGES_ROW_CAP = 2500
const SEARCH_LEADS_ROW_CAP = 500
const SEARCH_WA_PLATFORM_ID_CAP = 500

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
          lead:Lead(id, nombre, telefono, email, manychatId)
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
        platformId: conversation.platform_id || conversation.platformId,
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

      const searchRaw = (filters.search || '').trim()
      const hasSearch = searchRaw.length > 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const applyConversationFilters = (base: any) => {
        let q = base
        if (filters.status) {
          if (filters.status === 'active') {
            q = q.in('status', ['open', 'assigned'])
          } else {
            q = q.eq('status', filters.status)
          }
        }
        if (filters.platform) {
          q = q.eq('platform', filters.platform)
        }
        if (filters.assignedTo) {
          q = q.eq('assigned_to', filters.assignedTo)
        }
        return q
      }

      /**
       * Búsqueda: nombre de lead, teléfono (texto y solo dígitos) y contenido de mensajes.
       * Se resuelve antes de paginar para no perder coincidencias fuera de la primera página.
       */
      if (hasSearch) {
        const orParts = buildLeadSearchOrParts(searchRaw)
        const idSet = new Set<string>()

        // 1) Mensajes cuyo contenido coincide
        const contentPattern = buildMessageContentSearchPattern(searchRaw)
        if (contentPattern.length > 0) {
          const { data: matchingMessages, error: msgErr } = await supabase.client
            .from('messages')
            .select('conversation_id')
            .ilike('content', `%${contentPattern}%`)
            .limit(SEARCH_MESSAGES_ROW_CAP)

          if (msgErr) throw msgErr
          for (const m of matchingMessages || []) {
            if (m.conversation_id) idSet.add(m.conversation_id as string)
          }
        }

        // 2) Leads por nombre y/o teléfono (incl. últimos dígitos sin prefijo)
        if (orParts.length > 0) {
          const { data: matchingLeads, error: leadErr } = await supabase.client
            .from('Lead')
            .select('id')
            .or(orParts.join(','))
            .limit(SEARCH_LEADS_ROW_CAP)

          if (leadErr) throw leadErr

          const leadIds = (matchingLeads || []).map((l: { id: string }) => l.id).filter(Boolean)
          if (leadIds.length > 0) {
            const chunkSize = 120
            for (let i = 0; i < leadIds.length; i += chunkSize) {
              const chunk = leadIds.slice(i, i + chunkSize)
              const { data: convByLead, error: cErr } = await supabase.client
                .from('conversations')
                .select('id')
                .in('lead_id', chunk)

              if (cErr) throw cErr
              for (const c of convByLead || []) {
                if (c.id) idSet.add(c.id as string)
              }
            }
          }
        }

        // 3) WhatsApp: conversaciones pueden existir sin lead_id; el teléfono suele ir en platform_id
        const waPlatformPattern = buildWhatsAppPlatformIdSearchPattern(searchRaw)
        if (waPlatformPattern) {
          const { data: waByPlatform, error: waErr } = await supabase.client
            .from('conversations')
            .select('id')
            .eq('platform', 'whatsapp')
            .ilike('platform_id', `%${waPlatformPattern}%`)
            .limit(SEARCH_WA_PLATFORM_ID_CAP)

          if (waErr) throw waErr
          for (const c of waByPlatform || []) {
            if (c.id) idSet.add(c.id as string)
          }
        }

        if (idSet.size === 0) {
          return {
            data: [],
            total: 0,
            page,
            limit
          }
        }

        let allIds = Array.from(idSet)
        if (allIds.length > MAX_SEARCH_CONVERSATION_IDS) {
          allIds = allIds.slice(0, MAX_SEARCH_CONVERSATION_IDS)
        }

        const chunkSize = 90
        const chunks: string[][] = []
        for (let i = 0; i < allIds.length; i += chunkSize) {
          chunks.push(allIds.slice(i, i + chunkSize))
        }

        const merged: any[] = []
        for (const chunk of chunks) {
          let q = supabase.client
            .from('conversations')
            .select(`
              *,
              lead:Lead(id, nombre, telefono, email, zona, estado)
            `)
            .in('id', chunk)

          q = applyConversationFilters(q)
          const { data: rows, error: convErr } = await q
          if (convErr) throw convErr
          merged.push(...(rows || []))
        }

        const convMap = new Map<string, any>()
        for (const row of merged) {
          if (row?.id) convMap.set(row.id, row)
        }

        const sorted = Array.from(convMap.values()).sort((a, b) => {
          const aT = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
          const bT = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
          if (aT !== bT) return bT - aT
          const aC = a.created_at ? new Date(a.created_at).getTime() : 0
          const bC = b.created_at ? new Date(b.created_at).getTime() : 0
          return bC - aC
        })

        const total = sorted.length
        const pageSlice = sorted.slice(offset, offset + limit)

        // #region agent log
        if (pageSlice.length > 0) {
          const sample = pageSlice.slice(0, 5).map((c: { id: string; last_message_at?: string; created_at?: string }) => ({
            id: c.id,
            last_message_at: c.last_message_at,
            created_at: c.created_at,
            hasLastMessageAt: !!c.last_message_at
          }))
          fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'conversation-service.ts:getConversations:searchPath',message:'Conversations search path',data:{total,returned:pageSlice.length,firstFive:sample},timestamp:Date.now(),sessionId:'debug-session',runId:'search-fix',hypothesisId:'S1'})}).catch(()=>{});
        }
        // #endregion

        return {
          data: pageSlice,
          total,
          page,
          limit
        }
      }

      // Sin búsqueda: paginación en base de datos
      let query = supabase.client
        .from('conversations')
        .select(`
          *,
          lead:Lead(id, nombre, telefono, email, zona, estado)
        `, { count: 'exact' })

      query = applyConversationFilters(query)

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

      return {
        data: conversations || [],
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
   * Buscar conversación por lead y plataforma (útil cuando platform_id cambió, ej. de message.id a teléfono)
   */
  static async findConversationByLeadAndPlatform(leadId: string, platform: string) {
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
        .eq('lead_id', leadId)
        .eq('platform', platform)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return conversation
    } catch (error) {
      console.error('Error finding conversation by lead and platform:', error)
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

      // Buscar la conversación más reciente del lead para esta plataforma (puede haber más de una)
      const { data: conversation, error: conversationError } = await supabase.client
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('platform', platform)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (conversationError) throw conversationError
      if (!conversation?.id) return []

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

  /**
   * Último mensaje entrante del cliente en WhatsApp (para ventana de 24 h de Meta).
   * Si el lead solo habló por Uchat y no hay filas en el CRM, devuelve null.
   */
  static async getLastInboundWhatsAppMessageAt(leadId: string): Promise<Date | null> {
    try {
      if (!supabase.client) return null
      const { data: convs, error: cErr } = await supabase.client
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .eq('platform', 'whatsapp')
      if (cErr || !convs?.length) return null
      const ids = convs.map((c: { id: string }) => c.id)
      const { data: row } = await supabase.client
        .from('messages')
        .select('sent_at')
        .in('conversation_id', ids)
        .eq('direction', 'inbound')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!row?.sent_at) return null
      const d = new Date(row.sent_at as string)
      return Number.isNaN(d.getTime()) ? null : d
    } catch {
      return null
    }
  }
}
