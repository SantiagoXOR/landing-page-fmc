import { supabase } from '@/lib/db'
import { ConversationService } from './conversation-service'
import { WhatsAppBusinessAPI, WhatsAppAPIError, formatWhatsAppNumber, isValidWhatsAppNumber } from '@/lib/integrations/whatsapp-business-api'
import { logger } from '@/lib/logger'

export interface WhatsAppMessage {
  id: string
  from: string
  to: string
  type: 'text' | 'image' | 'video' | 'audio' | 'document'
  text?: {
    body: string
  }
  image?: {
    id: string
    mime_type: string
    sha256: string
  }
  video?: {
    id: string
    mime_type: string
    sha256: string
  }
  audio?: {
    id: string
    mime_type: string
    sha256: string
  }
  document?: {
    id: string
    mime_type: string
    sha256: string
    filename: string
  }
  timestamp: string
}

export interface SendMessageData {
  to: string
  message: string
  mediaUrl?: string
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document'
  leadId?: string // ID del lead para sincronización si es necesario
}

export class WhatsAppService {
  // Cliente de WhatsApp Business API (Meta)
  private static whatsappClient: WhatsAppBusinessAPI | null = WhatsAppBusinessAPI.fromEnv()

  /**
   * Verificar si WhatsApp está configurado (Meta API)
   */
  static isConfigured(): boolean {
    return !!this.whatsappClient
  }

  /**
   * Obtener proveedor activo (solo Meta/WhatsApp o ninguno)
   */
  static getActiveProvider(): 'whatsapp' | 'none' {
    return this.whatsappClient ? 'whatsapp' : 'none'
  }

  /**
   * Indica si se puede enviar por Meta API
   */
  static canSendViaMeta(): boolean {
    return !!this.whatsappClient
  }

  /**
   * Procesar mensaje entrante de WhatsApp
   */
  static async processIncomingMessage(webhookData: any) {
    try {
      // Intentar obtener mensaje de la estructura completa del webhook
      // Estructura 1: webhook completo {entry: [{changes: [{value: {messages: [...]}}]}]}
      let message = webhookData.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
      
      // Estructura 2: si no se encuentra, intentar acceder directamente a messages
      // Esto ocurre cuando se pasa solo change.value que tiene {messages, contacts, statuses}
      if (!message && webhookData.messages && Array.isArray(webhookData.messages) && webhookData.messages.length > 0) {
        message = webhookData.messages[0]
      }
      
      if (!message) {
        console.log('No message found in webhook data', {
          hasEntry: !!webhookData.entry,
          hasMessages: !!webhookData.messages,
          structure: Object.keys(webhookData)
        })
        return
      }

      const from = message.from
      const content = this.extractMessageContent(message)
      const messageType = this.extractMessageType(message)
      const mediaUrl = this.extractMediaUrl(message)

      // Usar teléfono como platformId para que la misma conversación se reutilice (no message.id)
      const platformId = webhookData.platformIdByPhone ?? formatWhatsAppNumber(from)
      const preferredLeadId = webhookData.leadId

      // Buscar o crear conversación (por teléfono como platformId para reutilizar la misma)
      let conversation = await ConversationService.findConversationByPlatform('whatsapp', platformId)
      if (!conversation && preferredLeadId) {
        conversation = await ConversationService.findConversationByLeadAndPlatform(preferredLeadId, 'whatsapp')
        if (conversation && supabase.client) {
          await supabase.client.from('conversations').update({ platform_id: platformId }).eq('id', conversation.id)
        }
      }
      if (!conversation) {
        // Buscar lead por teléfono (varios formatos) o usar el que vino del webhook
        let lead = preferredLeadId ? await supabase.findLeadById(preferredLeadId) : null
        if (!lead) {
          const formattedFrom = formatWhatsAppNumber(from)
          lead = await supabase.findLeadByPhoneOrDni(formattedFrom) || await supabase.findLeadByPhoneOrDni(from)
        }

        // Crear nueva conversación vinculada al lead
        conversation = await ConversationService.createConversation({
          platform: 'whatsapp',
          platformId,
          leadId: lead?.id
        })
      }

      // Crear mensaje (platform_msg_id debe ser el ID del mensaje de Meta, único por mensaje; no el teléfono)
      const messageIdFromMeta = message.id
      await this.createMessage({
        conversationId: conversation.id,
        direction: 'inbound',
        content,
        messageType,
        mediaUrl,
        platformMsgId: messageIdFromMeta || undefined
      })

      // Actualizar última actividad
      await ConversationService.updateLastActivity(conversation.id)

      console.log(`Processed incoming WhatsApp message from ${from}`)
      return conversation
    } catch (error) {
      console.error('Error processing incoming WhatsApp message:', error)
      throw error
    }
  }

  /**
   * Enviar mensaje por WhatsApp (Meta API)
   */
  static async sendMessage(data: SendMessageData) {
    try {
      return await this.sendMessageViaMetaAPI(data)
    } catch (error) {
      logger.error('Error sending WhatsApp message', { error, to: data.to?.substring(0, 5) + '***' })
      throw error
    }
  }

  /**
   * Enviar mensaje usando Meta API (WhatsApp Business API)
   */
  private static async sendMessageViaMetaAPI(data: SendMessageData) {
    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp Business API not configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN')
      }

      // Validar número de teléfono
      if (!isValidWhatsAppNumber(data.to)) {
        throw new Error(`Invalid WhatsApp number format: ${data.to}`)
      }

      const formattedPhone = formatWhatsAppNumber(data.to)
      let response

      // Enviar según el tipo de mensaje
      if (data.messageType === 'text' || !data.messageType) {
        response = await this.whatsappClient.sendTextMessage({
          to: formattedPhone,
          text: data.message,
          previewUrl: true,
        })
      } else if (data.mediaUrl && ['image', 'video', 'audio', 'document'].includes(data.messageType)) {
        response = await this.whatsappClient.sendMediaMessage({
          to: formattedPhone,
          type: data.messageType as 'image' | 'video' | 'audio' | 'document',
          url: data.mediaUrl,
          caption: data.message,
          filename: data.messageType === 'document' ? 'document.pdf' : undefined,
        })
      } else {
        response = await this.whatsappClient.sendTextMessage({
          to: formattedPhone,
          text: data.message,
        })
      }

      logger.info('Message sent successfully', {
        messageId: response.messages?.[0]?.id,
        to: formattedPhone.substring(0, 5) + '***',
        type: data.messageType || 'text',
      })

      return {
        success: true,
        messageId: response.messages?.[0]?.id,
        provider: 'whatsapp',
        waId: response.contacts?.[0]?.wa_id,
      }
    } catch (error) {
      if (error instanceof WhatsAppAPIError) {
        if (error.isRateLimitError()) {
          throw new Error('Rate limit exceeded. Please try again later.')
        }
        if (error.isInvalidNumberError()) {
          throw new Error(`Invalid phone number: ${data.to}`)
        }
      }
      throw error
    }
  }


  /**
   * Crear mensaje en la base de datos
   */
  static async createMessage(data: {
    conversationId: string
    direction: 'inbound' | 'outbound'
    content: string
    messageType: string
    mediaUrl?: string
    platformMsgId?: string
    isFromBot?: boolean
  }) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const row: Record<string, unknown> = {
        conversation_id: data.conversationId,
        direction: data.direction,
        content: data.content,
        message_type: data.messageType,
        media_url: data.mediaUrl,
        platform_msg_id: data.platformMsgId,
        sent_at: new Date().toISOString(),
        delivered_at: data.direction === 'outbound' ? new Date().toISOString() : null,
      }
      if (data.isFromBot !== undefined) {
        row.is_from_bot = data.isFromBot
      }

      const { data: message, error } = await supabase.client
        .from('messages')
        .insert(row)
        .select()
        .single()

      if (error) {
        console.error('[WhatsApp] Error creating message in database:', error)
        throw error
      }

      console.log('[WhatsApp] Message created in database:', {
        id: message.id,
        direction: data.direction,
        type: data.messageType,
        conversationId: data.conversationId,
      })

      return message
    } catch (error) {
      console.error('[WhatsApp] Error creating message:', error)
      throw error
    }
  }

  /**
   * Actualizar estado de un mensaje por platform_msg_id (sent → delivered → read).
   * Persiste en DB para reflejar los estados que envía Meta en el webhook.
   */
  static async updateMessageStatus(
    platformMsgId: string,
    status: 'sent' | 'delivered' | 'read',
    timestamp?: string
  ) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const ts = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      const updates: Record<string, string> = {}

      if (status === 'sent') {
        updates.sent_at = ts
      } else if (status === 'delivered') {
        updates.delivered_at = ts
      } else if (status === 'read') {
        updates.read_at = ts
      }

      if (Object.keys(updates).length === 0) return

      const { error } = await supabase.client
        .from('messages')
        .update(updates)
        .eq('platform_msg_id', platformMsgId)

      if (error) {
        console.warn('[WhatsApp] Could not update message status in database:', error)
        return
      }

      console.log('[WhatsApp] Message status updated:', { platformMsgId, status })

      if (status === 'read' && this.whatsappClient) {
        await this.whatsappClient.markAsRead(platformMsgId)
      }
    } catch (error) {
      console.error('[WhatsApp] Error updating message status:', error)
    }
  }

  /**
   * Marcar mensaje como leído (conveniencia que delega en updateMessageStatus)
   */
  static async markAsRead(messageId: string) {
    await this.updateMessageStatus(messageId, 'read')
  }

  /**
   * Registrar fallo de entrega de un mensaje (webhook value.errors).
   * Persiste en messages.delivery_error para poder mostrarlo en el CRM.
   */
  static async markMessageDeliveryFailed(platformMsgId: string, errorMessage: string) {
    try {
      if (!supabase.client) return

      const { error } = await supabase.client
        .from('messages')
        .update({ delivery_error: errorMessage })
        .eq('platform_msg_id', platformMsgId)

      if (error) {
        console.warn('[WhatsApp] Could not save delivery_error in database:', error)
        return
      }
      console.log('[WhatsApp] Message marked as delivery failed:', platformMsgId)
    } catch (e) {
      console.warn('[WhatsApp] Could not record delivery failure:', e)
    }
  }

  /**
   * Obtener historial de conversación
   */
  static async getConversationHistory(conversationId: string) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: messages, error } = await supabase.client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true })

      if (error) throw error

      console.log('[WhatsApp] Fetched conversation history:', {
        conversationId,
        messageCount: messages?.length || 0,
      })
      
      return messages || []
    } catch (error) {
      console.error('[WhatsApp] Error fetching conversation history:', error)
      throw error
    }
  }

  /**
   * Extraer contenido del mensaje
   */
  private static extractMessageContent(message: WhatsAppMessage): string {
    if (message.text?.body) {
      return message.text.body
    }
    
    if (message.image) {
      return '[Imagen]'
    }
    
    if (message.video) {
      return '[Video]'
    }
    
    if (message.audio) {
      return '[Audio]'
    }
    
    if (message.document) {
      return `[Documento: ${message.document.filename}]`
    }
    
    return '[Mensaje no soportado]'
  }

  /**
   * Extraer tipo de mensaje
   */
  private static extractMessageType(message: WhatsAppMessage): string {
    if (message.text) return 'text'
    if (message.image) return 'image'
    if (message.video) return 'video'
    if (message.audio) return 'audio'
    if (message.document) return 'document'
    return 'text'
  }

  /**
   * Extraer URL de media
   */
  private static extractMediaUrl(message: WhatsAppMessage): string | undefined {
    const media = message.image || message.video || message.audio || message.document
    // Para WhatsApp Business API, el ID del media necesita descargarse por separado
    return media?.id ? media.id : undefined
  }
}

// Exportar instancia del servicio para uso en otros módulos
export const whatsappService = WhatsAppService