import { supabase } from '@/lib/db'
import { ConversationService } from './conversation-service'
import { ManychatService } from './manychat-service'
import { ManychatSyncService } from './manychat-sync-service'
import { MessagingService } from './messaging-service'
import { ManychatMessage } from '@/types/manychat'
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
   * Usa el nuevo MessagingService para mejor detección de canal y manejo de errores
   */
  private static async sendMessageViaManychat(data: SendMessageData) {
    try {
      logger.info('Enviando mensaje vía ManyChat', {
        to: data.to.substring(0, 5) + '***',
        messageType: data.messageType || 'text',
        hasMedia: !!data.mediaUrl
      })

      // Intentar sincronizar lead si no existe el subscriber
      let subscriber = await ManychatService.getSubscriberByPhone(data.to)
      
      if (!subscriber) {
        logger.debug('Subscriber no encontrado, intentando sincronizar lead', {
          phone: data.to.substring(0, 5) + '***'
        })
        
        const lead = await supabase.findLeadByPhoneOrDni(data.to)

        if (lead) {
          logger.info('Lead encontrado, sincronizando a ManyChat', {
            leadId: lead.id,
            phone: data.to.substring(0, 5) + '***'
          })
          
          try {
            // Sincronizar lead a Manychat
            await ManychatSyncService.syncLeadToManychat(lead.id)
            
            // Intentar obtener subscriber nuevamente
            subscriber = await ManychatService.getSubscriberByPhone(data.to)
            
            if (subscriber) {
              logger.info('Subscriber creado después de sincronización', {
                subscriberId: subscriber.id
              })
            } else {
              logger.warn('Subscriber no encontrado después de sincronización', {
                leadId: lead.id,
                phone: data.to.substring(0, 5) + '***'
              })
            }
          } catch (syncError: any) {
            logger.error('Error sincronizando lead a ManyChat', {
              error: syncError.message,
              leadId: lead.id,
              phone: data.to.substring(0, 5) + '***'
            })
            // Continuar intentando enviar el mensaje, puede que el subscriber ya exista
          }
        } else {
          logger.warn('Lead no encontrado para sincronizar', {
            phone: data.to.substring(0, 5) + '***'
          })
        }
      }
      
      // Si aún no hay subscriber, lanzar error descriptivo
      if (!subscriber) {
        const errorMessage = `El contacto con teléfono ${data.to.substring(0, 5)}*** no está sincronizado con ManyChat. Por favor, sincroniza el contacto primero desde la página del lead.`
        logger.error('No se puede enviar mensaje: subscriber no encontrado', {
          phone: data.to.substring(0, 5) + '***'
        })
        throw new Error(errorMessage)
      }

      // Usar el nuevo MessagingService para mejor manejo multi-canal
      // Mapear messageType 'document' a 'file' para ManyChat
      const messageType = data.messageType === 'document' ? 'file' : data.messageType || 'text'

      const result = await MessagingService.sendMessage({
        to: {
          phone: data.to,
        },
        message: data.message,
        messageType: messageType as 'text' | 'image' | 'video' | 'file' | 'audio',
        mediaUrl: data.mediaUrl,
        channel: 'auto', // Detectar automáticamente
      })

      if (result.success) {
        logger.info('Mensaje enviado exitosamente vía ManyChat', {
          messageId: result.messageId,
          channel: result.channel,
          subscriberId: result.subscriberId
        })

        return {
          success: true,
          messageId: result.messageId,
          provider: 'manychat',
          channel: result.channel,
        }
      } else {
        logger.error('Error enviando mensaje vía ManyChat', {
          error: result.error,
          errorCode: result.errorCode,
          channel: result.channel
        })
        
        throw new Error(result.error || 'Error enviando mensaje por Manychat')
      }
    } catch (error: any) {
      logger.error('Error en sendMessageViaManychat', {
        error: error.message,
        stack: error.stack,
        to: data.to.substring(0, 5) + '***'
      })
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