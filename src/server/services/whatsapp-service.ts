import { supabase } from '@/lib/db'
import { ConversationService } from './conversation-service'
import { ManychatService } from './manychat-service'
import { ManychatSyncService } from './manychat-sync-service'
import { ManychatMessage } from '@/types/manychat'
import { WhatsAppBusinessAPI, WhatsAppAPIError, formatWhatsAppNumber, isValidWhatsAppNumber } from '@/lib/integrations/whatsapp-business-api'

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
}

export class WhatsAppService {
  // Cliente robusto de WhatsApp Business API
  private static whatsappClient: WhatsAppBusinessAPI | null = WhatsAppBusinessAPI.fromEnv()
  
  // Usar Manychat como prioridad
  private static readonly USE_MANYCHAT = ManychatService.isConfigured()

  /**
   * Verificar si WhatsApp está configurado
   */
  static isConfigured(): boolean {
    return this.USE_MANYCHAT || !!this.whatsappClient
  }

  /**
   * Obtener proveedor activo (manychat o whatsapp)
   */
  static getActiveProvider(): 'manychat' | 'whatsapp' | 'none' {
    if (this.USE_MANYCHAT) return 'manychat'
    if (this.whatsappClient) return 'whatsapp'
    return 'none'
  }

  /**
   * Procesar mensaje entrante de WhatsApp
   */
  static async processIncomingMessage(webhookData: any) {
    try {
      const message = webhookData.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
      if (!message) {
        console.log('No message found in webhook data')
        return
      }

      const from = message.from
      const platformId = message.id
      const content = this.extractMessageContent(message)
      const messageType = this.extractMessageType(message)
      const mediaUrl = this.extractMediaUrl(message)

      // Buscar o crear conversación
      let conversation = await ConversationService.findConversationByPlatform('whatsapp', platformId)
      
      if (!conversation) {
        // Buscar lead existente por teléfono
        const lead = await supabase.findLeadByPhoneOrDni(from)

        // Crear nueva conversación
        conversation = await ConversationService.createConversation({
          platform: 'whatsapp',
          platformId,
          leadId: lead?.id
        })
      }

      // Crear mensaje
      await this.createMessage({
        conversationId: conversation.id,
        direction: 'inbound',
        content,
        messageType,
        mediaUrl,
        platformMsgId: platformId
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
   * Enviar mensaje por WhatsApp (usando Manychat o Meta API)
   */
  static async sendMessage(data: SendMessageData) {
    try {
      // Si Manychat está configurado, usarlo
      if (this.USE_MANYCHAT) {
        return await this.sendMessageViaManychat(data)
      }

      // Fallback a Meta API
      return await this.sendMessageViaMetaAPI(data)
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
      throw error
    }
  }

  /**
   * Enviar mensaje usando Manychat
   */
  private static async sendMessageViaManychat(data: SendMessageData) {
    try {
      // Buscar subscriber por teléfono
      let subscriber = await ManychatService.getSubscriberByPhone(data.to)

      // Si no existe, buscar lead en CRM y sincronizar
      if (!subscriber) {
        const lead = await supabase.findLeadByPhoneOrDni(data.to)

        if (lead) {
          // Sincronizar lead a Manychat
          await ManychatSyncService.syncLeadToManychat(lead.id)
          // Intentar obtener subscriber nuevamente
          subscriber = await ManychatService.getSubscriberByPhone(data.to)
        }
      }

      if (!subscriber) {
        throw new Error(`No se encontró subscriber en Manychat para ${data.to}`)
      }

      // Construir mensaje para Manychat
      const messages: ManychatMessage[] = []

      if (data.messageType === 'image' && data.mediaUrl) {
        messages.push({
          type: 'image',
          url: data.mediaUrl,
          caption: data.message,
        })
      } else if (data.messageType === 'video' && data.mediaUrl) {
        messages.push({
          type: 'video',
          url: data.mediaUrl,
          caption: data.message,
        })
      } else if (data.messageType === 'audio' && data.mediaUrl) {
        messages.push({
          type: 'audio',
          url: data.mediaUrl,
        })
      } else if (data.messageType === 'document' && data.mediaUrl) {
        messages.push({
          type: 'file',
          url: data.mediaUrl,
          filename: 'document.pdf',
        })
      } else {
        // Mensaje de texto por defecto
        messages.push({
          type: 'text',
          text: data.message,
        })
      }

      // Enviar mensaje
      const response = await ManychatService.sendMessage(subscriber.id, messages)

      if (response.status === 'success') {
        return {
          success: true,
          messageId: response.data?.message_id,
          provider: 'manychat',
        }
      } else {
        throw new Error(response.error || 'Error enviando mensaje por Manychat')
      }
    } catch (error) {
      console.error('Error en sendMessageViaManychat:', error)
      throw error
    }
  }

  /**
   * Enviar mensaje usando Meta API (fallback) con el cliente robusto
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
        // Fallback a texto
        response = await this.whatsappClient.sendTextMessage({
          to: formattedPhone,
          text: data.message,
        })
      }

      console.log('[WhatsApp] Message sent successfully:', {
        messageId: response.messages?.[0]?.id,
        to: formattedPhone,
        type: data.messageType || 'text',
      })

      return {
        success: true,
        messageId: response.messages?.[0]?.id,
        provider: 'whatsapp',
        waId: response.contacts?.[0]?.wa_id,
      }
    } catch (error) {
      console.error('[WhatsApp] Error sending message:', error)
      
      // Manejo especial para errores de la API de WhatsApp
      if (error instanceof WhatsAppAPIError) {
        console.error('[WhatsApp] API Error Details:', error.getDetails())
        
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
  }) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: message, error } = await supabase.client
        .from('messages')
        .insert({
          conversation_id: data.conversationId,
          direction: data.direction,
          content: data.content,
          message_type: data.messageType,
          media_url: data.mediaUrl,
          platform_msg_id: data.platformMsgId,
          sent_at: new Date().toISOString(),
          delivered_at: data.direction === 'outbound' ? new Date().toISOString() : null,
        })
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
   * Marcar mensaje como leído
   */
  static async markAsRead(messageId: string) {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      // Actualizar en la base de datos
      const { error } = await supabase.client
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('platform_msg_id', messageId)

      if (error) {
        console.warn('[WhatsApp] Could not mark message as read in database:', error)
      }

      console.log('[WhatsApp] Message marked as read:', messageId)
      
      // Si usamos WhatsApp Business API, marcar en la plataforma también
      if (this.whatsappClient) {
        await this.whatsappClient.markAsRead(messageId)
      }
    } catch (error) {
      console.error('[WhatsApp] Error marking message as read:', error)
      // No lanzar error, es una operación secundaria
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