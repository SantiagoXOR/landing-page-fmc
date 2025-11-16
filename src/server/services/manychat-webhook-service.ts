import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ManychatWebhookEvent, ManychatSubscriber, ManychatWebhookMessage } from '@/types/manychat'
import { ConversationService } from './conversation-service'
import { ManychatSyncService } from './manychat-sync-service'
import { ManychatService } from './manychat-service'

/**
 * Servicio para procesar webhooks de Manychat
 * Maneja eventos de mensajes, tags, custom fields y nuevos subscribers
 */
export class ManychatWebhookService {
  /**
   * Procesar evento de webhook de Manychat
   */
  static async processWebhookEvent(event: ManychatWebhookEvent): Promise<{
    success: boolean
    leadId?: string
    conversationId?: string
    messageId?: string
    error?: string
  }> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      logger.info('Procesando webhook de Manychat', {
        event_type: event.event_type,
        subscriber_id: event.subscriber_id || event.subscriber?.id
      })

      // Extraer subscriber del evento
      const subscriber = event.subscriber || (event.subscriber_id ? await this.getSubscriberById(event.subscriber_id) : null)

      if (!subscriber) {
        logger.warn('Webhook sin subscriber', { event_type: event.event_type })
        return { success: false, error: 'No subscriber found in webhook event' }
      }

      // Procesar según el tipo de evento
      switch (event.event_type) {
        case 'new_subscriber':
        case 'subscriber_updated':
          return await this.handleSubscriberEvent(subscriber)

        case 'message_received':
        case 'message_sent':
          return await this.handleMessageEvent(subscriber, event.message!, event.event_type)

        case 'tag_added':
        case 'tag_removed':
          return await this.handleTagEvent(subscriber, event.tag!)

        case 'custom_field_changed':
          return await this.handleCustomFieldEvent(subscriber, event.custom_field!)

        default:
          logger.info('Evento de webhook no procesado', { event_type: event.event_type })
          return { success: true }
      }
    } catch (error: any) {
      logger.error('Error procesando webhook de Manychat', {
        error: error.message,
        stack: error.stack,
        event_type: event.event_type
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Buscar o crear lead desde subscriber de Manychat
   * Prioridad: 1) subscriber_id (manychatId), 2) teléfono
   */
  static async findOrCreateLeadFromSubscriber(subscriber: ManychatSubscriber): Promise<string | null> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const subscriberId = String(subscriber.id)
      const phone = subscriber.whatsapp_phone || subscriber.phone || ''

      // Prioridad 1: Buscar por manychatId (subscriber_id)
      if (subscriberId) {
        const { data: leadByManychatId } = await supabase.client
          .from('Lead')
          .select('id')
          .eq('manychatId', subscriberId)
          .single()

        if (leadByManychatId) {
          logger.debug('Lead encontrado por manychatId', { leadId: leadByManychatId.id, manychatId: subscriberId })
          return leadByManychatId.id
        }
      }

      // Prioridad 2: Buscar por teléfono
      if (phone) {
        const { data: leadByPhone } = await supabase.client
          .from('Lead')
          .select('id')
          .eq('telefono', phone)
          .single()

        if (leadByPhone) {
          // Actualizar lead con manychatId si no lo tiene
          await supabase.client
            .from('Lead')
            .update({ manychatId: subscriberId, updatedAt: new Date().toISOString() })
            .eq('id', leadByPhone.id)

          logger.debug('Lead encontrado por teléfono', { leadId: leadByPhone.id, phone })
          return leadByPhone.id
        }
      }

      // No existe lead: crear automáticamente
      const nombre = [subscriber.first_name, subscriber.last_name]
        .filter(Boolean)
        .join(' ') || subscriber.name || 'Contacto Manychat'

      const { data: newLead, error: createError } = await supabase.client
        .from('Lead')
        .insert({
          nombre,
          telefono: phone || `manychat_${subscriber.id}`,
          email: subscriber.email || null,
          manychatId: subscriberId,
          origen: subscriber.instagram_id ? 'instagram' : 'whatsapp',
          estado: 'NUEVO',
          tags: subscriber.tags ? JSON.stringify(subscriber.tags.map(t => t.name)) : null,
          customFields: subscriber.custom_fields ? JSON.stringify(subscriber.custom_fields) : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        logger.error('Error creando lead desde subscriber', { error: createError.message })
        throw createError
      }

      logger.info('Lead creado automáticamente desde subscriber', {
        leadId: newLead.id,
        subscriberId: subscriber.id,
        phone
      })

      return newLead.id
    } catch (error: any) {
      logger.error('Error en findOrCreateLeadFromSubscriber', { error: error.message })
      return null
    }
  }

  /**
   * Buscar o crear conversación
   */
  static async findOrCreateConversation(
    leadId: string,
    platform: string,
    platformId: string
  ): Promise<string | null> {
    try {
      // Buscar conversación existente
      let conversation = await ConversationService.findConversationByPlatform(platform, platformId)

      if (conversation) {
        // Actualizar lead_id si no lo tiene
        if (!conversation.lead_id && leadId) {
          if (supabase.client) {
            await supabase.client
              .from('conversations')
              .update({ lead_id: leadId, updated_at: new Date().toISOString() })
              .eq('id', conversation.id)
          }
        }
        return conversation.id
      }

      // Crear nueva conversación
      conversation = await ConversationService.createConversation({
        platform,
        platformId,
        leadId
      })

      return conversation?.id || null
    } catch (error: any) {
      logger.error('Error en findOrCreateConversation', { error: error.message })
      return null
    }
  }

  /**
   * Guardar mensaje en la base de datos
   */
  static async saveMessage(
    conversationId: string,
    message: ManychatWebhookMessage,
    direction: 'inbound' | 'outbound'
  ): Promise<string | null> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      // Extraer contenido según el tipo de mensaje
      let content = ''
      let mediaUrl: string | null = null

      switch (message.type) {
        case 'text':
          content = message.text || ''
          break
        case 'image':
        case 'video':
        case 'audio':
        case 'file':
          content = message.caption || `[${message.type}]`
          mediaUrl = message.url || null
          break
        case 'location':
          content = `Ubicación: ${message.latitude}, ${message.longitude}`
          break
        case 'template':
          content = message.template_name || '[Template]'
          if (message.text) content += `: ${message.text}`
          break
        default:
          content = `[${message.type}]`
      }

      // Verificar si el mensaje ya existe (por platform_msg_id)
      if (message.platform_msg_id || message.id) {
        const msgId = message.platform_msg_id || message.id
        const { data: existingMessage } = await supabase.client
          .from('messages')
          .select('id')
          .eq('platform_msg_id', msgId)
          .single()

        if (existingMessage) {
          logger.debug('Mensaje duplicado ignorado', { messageId: msgId })
          return existingMessage.id
        }
      }

      // Crear mensaje
      const sentAt = message.timestamp
        ? new Date(message.timestamp * 1000).toISOString()
        : new Date().toISOString()

      const { data: newMessage, error: createError } = await supabase.client
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction,
          content,
          media_url: mediaUrl,
          message_type: message.type,
          platform_msg_id: message.platform_msg_id || message.id,
          sent_at: sentAt,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        logger.error('Error guardando mensaje', { error: createError.message })
        throw createError
      }

      // Actualizar última actividad de la conversación
      await ConversationService.updateLastActivity(conversationId)

      logger.debug('Mensaje guardado', { messageId: newMessage.id, direction, conversationId })

      return newMessage.id
    } catch (error: any) {
      logger.error('Error en saveMessage', { error: error.message })
      return null
    }
  }

  /**
   * Actualizar última actividad del lead
   */
  static async updateLeadActivity(leadId: string): Promise<void> {
    try {
      if (!supabase.client) {
        return
      }

      await supabase.client
        .from('Lead')
        .update({ updatedAt: new Date().toISOString() })
        .eq('id', leadId)
    } catch (error: any) {
      logger.error('Error actualizando actividad del lead', { error: error.message, leadId })
    }
  }

  /**
   * Manejar evento de subscriber (nuevo o actualizado)
   */
  private static async handleSubscriberEvent(subscriber: ManychatSubscriber): Promise<{
    success: boolean
    leadId?: string
    error?: string
  }> {
    try {
      const leadId = await this.findOrCreateLeadFromSubscriber(subscriber)

      if (!leadId) {
        return { success: false, error: 'Could not find or create lead' }
      }

      // Sincronizar datos del subscriber al lead
      await ManychatSyncService.syncManychatToLead(subscriber)

      // Actualizar actividad
      await this.updateLeadActivity(leadId)

      return { success: true, leadId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Manejar evento de mensaje (recibido o enviado)
   */
  private static async handleMessageEvent(
    subscriber: ManychatSubscriber,
    message: ManychatWebhookMessage,
    eventType: 'message_received' | 'message_sent'
  ): Promise<{
    success: boolean
    leadId?: string
    conversationId?: string
    messageId?: string
    error?: string
  }> {
    try {
      // Buscar o crear lead
      const leadId = await this.findOrCreateLeadFromSubscriber(subscriber)

      if (!leadId) {
        return { success: false, error: 'Could not find or create lead' }
      }

      // Determinar plataforma y platformId
      const platform = subscriber.instagram_id ? 'instagram' : 'whatsapp'
      const platformId = subscriber.instagram_id || subscriber.whatsapp_phone || subscriber.phone || String(subscriber.id)

      // Buscar o crear conversación
      const conversationId = await this.findOrCreateConversation(leadId, platform, platformId)

      if (!conversationId) {
        return { success: false, error: 'Could not find or create conversation' }
      }

      // Determinar dirección del mensaje
      const direction = eventType === 'message_received' ? 'inbound' : 'outbound'

      // Guardar mensaje
      const messageId = await this.saveMessage(conversationId, message, direction)

      if (!messageId) {
        return { success: false, error: 'Could not save message' }
      }

      // Actualizar actividad del lead
      await this.updateLeadActivity(leadId)

      return {
        success: true,
        leadId,
        conversationId,
        messageId
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Manejar evento de tag (agregado o removido)
   */
  private static async handleTagEvent(
    subscriber: ManychatSubscriber,
    tag: { id: number; name: string }
  ): Promise<{
    success: boolean
    leadId?: string
    error?: string
  }> {
    try {
      const leadId = await this.findOrCreateLeadFromSubscriber(subscriber)

      if (!leadId) {
        return { success: false, error: 'Could not find or create lead' }
      }

      // Sincronizar tags desde Manychat
      await ManychatSyncService.syncTagsFromManychat(leadId)

      // Actualizar actividad
      await this.updateLeadActivity(leadId)

      return { success: true, leadId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Manejar evento de custom field
   */
  private static async handleCustomFieldEvent(
    subscriber: ManychatSubscriber,
    customField: { id: number; name: string; value: any }
  ): Promise<{
    success: boolean
    leadId?: string
    error?: string
  }> {
    try {
      const leadId = await this.findOrCreateLeadFromSubscriber(subscriber)

      if (!leadId) {
        return { success: false, error: 'Could not find or create lead' }
      }

      // Sincronizar subscriber completo para actualizar custom fields
      await ManychatSyncService.syncManychatToLead(subscriber)

      // Actualizar actividad
      await this.updateLeadActivity(leadId)

      return { success: true, leadId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Obtener subscriber por ID (helper privado)
   */
  private static async getSubscriberById(subscriberId: number): Promise<ManychatSubscriber | null> {
    try {
      return await ManychatService.getSubscriberById(subscriberId)
    } catch (error: any) {
      logger.error('Error obteniendo subscriber por ID', { error: error.message, subscriberId })
      return null
    }
  }
}

