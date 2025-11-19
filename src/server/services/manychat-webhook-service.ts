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
          logger.info('📥 Evento NEW_SUBSCRIBER recibido', {
            subscriberId: subscriber.id,
            phone: subscriber.whatsapp_phone || subscriber.phone || 'sin teléfono',
            hasMessage: !!event.message,
            subscribed: subscriber.subscribed
          })

          // Si es nuevo subscriber pero tiene mensaje, procesar ambos
          if (event.message) {
            // Primero crear/actualizar el lead (forzar creación si es nuevo)
            const leadResult = await this.handleSubscriberEvent(subscriber, true)
            if (!leadResult.success || !leadResult.leadId) {
              return leadResult
            }
            
            logger.info('Lead procesado para new_subscriber con mensaje', {
              leadId: leadResult.leadId,
              wasCreated: leadResult.wasCreated
            })

            // Luego procesar el mensaje
            const messageResult = await this.handleMessageEvent(
              subscriber, 
              event.message, 
              'message_received'
            )
            return {
              success: messageResult.success,
              leadId: leadResult.leadId || messageResult.leadId,
              conversationId: messageResult.conversationId,
              messageId: messageResult.messageId,
              error: messageResult.error
            }
          }
          
          // Solo evento de nuevo subscriber sin mensaje
          const subscriberResult = await this.handleSubscriberEvent(subscriber, true)
          logger.info('Resultado de procesamiento new_subscriber', {
            success: subscriberResult.success,
            leadId: subscriberResult.leadId,
            wasCreated: subscriberResult.wasCreated
          })
          return subscriberResult

        case 'subscriber_updated':
          logger.info('📝 Evento SUBSCRIBER_UPDATED recibido', {
            subscriberId: subscriber.id,
            phone: subscriber.whatsapp_phone || subscriber.phone || 'sin teléfono'
          })
          return await this.handleSubscriberEvent(subscriber, false)

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
   * 
   * @param subscriber - Subscriber de Manychat
   * @param forceCreate - Si es true, crea un nuevo lead incluso si existe por teléfono (útil para eventos new_subscriber)
   * @returns ID del lead encontrado o creado
   */
  static async findOrCreateLeadFromSubscriber(
    subscriber: ManychatSubscriber, 
    forceCreate: boolean = false
  ): Promise<string | null> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const subscriberId = String(subscriber.id)
      const phone = subscriber.whatsapp_phone || subscriber.phone || ''

      logger.info('Buscando o creando lead desde subscriber', {
        subscriberId,
        phone: phone ? `${phone.substring(0, 3)}***` : 'sin teléfono',
        forceCreate,
        hasManychatId: !!subscriberId,
        hasPhone: !!phone
      })

      // Prioridad 1: Buscar por manychatId (subscriber_id)
      if (subscriberId) {
        const { data: leadByManychatId } = await supabase.client
          .from('Lead')
          .select('id, nombre, telefono, createdAt')
          .eq('manychatId', subscriberId)
          .single()

        if (leadByManychatId) {
          logger.info('✅ Lead encontrado por manychatId (EXISTENTE)', {
            leadId: leadByManychatId.id,
            manychatId: subscriberId,
            nombre: leadByManychatId.nombre,
            telefono: leadByManychatId.telefono ? `${leadByManychatId.telefono.substring(0, 3)}***` : 'sin teléfono',
            createdAt: leadByManychatId.createdAt,
            action: 'UPDATE'
          })
          return leadByManychatId.id
        }
      }

      // Prioridad 2: Buscar por teléfono (solo si no se fuerza la creación)
      if (phone && !forceCreate) {
        const { data: leadByPhone } = await supabase.client
          .from('Lead')
          .select('id, nombre, manychatId, createdAt')
          .eq('telefono', phone)
          .single()

        if (leadByPhone) {
          // Actualizar lead con manychatId si no lo tiene
          const updateData: any = { updatedAt: new Date().toISOString() }
          if (!leadByPhone.manychatId) {
            updateData.manychatId = subscriberId
          }

          await supabase.client
            .from('Lead')
            .update(updateData)
            .eq('id', leadByPhone.id)

          logger.info('✅ Lead encontrado por teléfono (EXISTENTE)', {
            leadId: leadByPhone.id,
            phone: `${phone.substring(0, 3)}***`,
            nombre: leadByPhone.nombre,
            manychatId: leadByPhone.manychatId || 'sin manychatId',
            createdAt: leadByPhone.createdAt,
            action: 'UPDATE',
            updatedManychatId: !leadByPhone.manychatId
          })
          return leadByPhone.id
        }
      }

      // No existe lead: crear automáticamente
      const nombre = [subscriber.first_name, subscriber.last_name]
        .filter(Boolean)
        .join(' ') || subscriber.name || 'Contacto Manychat'

      const customFields = subscriber.custom_fields || {}
      const tags = subscriber.tags || []

      const leadData = {
        nombre,
        telefono: phone || `manychat_${subscriber.id}`,
        email: subscriber.email || null,
        manychatId: subscriberId,
        origen: subscriber.instagram_id ? 'instagram' : 'whatsapp',
        estado: customFields.estado || 'NUEVO',
        dni: customFields.dni || null,
        cuil: customFields.cuit || customFields.cuil || null,
        ingresos: customFields.ingresos ?? null,
        zona: customFields.zona || null,
        producto: customFields.producto || null,
        monto: customFields.monto ?? null,
        agencia: customFields.agencia || null,
        banco: customFields.banco || null,
        trabajo_actual: customFields.trabajo_actual || null,
        tags: tags.length > 0 ? JSON.stringify(tags.map(t => typeof t === 'string' ? t : t.name)) : null,
        customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const { data: newLead, error: createError } = await supabase.client
        .from('Lead')
        .insert(leadData)
        .select()
        .single()

      if (createError) {
        logger.error('❌ Error creando lead desde subscriber', {
          error: createError.message,
          errorCode: createError.code,
          subscriberId,
          phone: phone ? `${phone.substring(0, 3)}***` : 'sin teléfono',
          leadData: {
            nombre,
            origen: leadData.origen,
            estado: leadData.estado
          }
        })
        throw createError
      }

      logger.info('🆕 Lead CREADO automáticamente desde subscriber (NUEVO)', {
        leadId: newLead.id,
        subscriberId: subscriber.id,
        phone: phone ? `${phone.substring(0, 3)}***` : `manychat_${subscriber.id}`,
        nombre: newLead.nombre,
        origen: newLead.origen,
        estado: newLead.estado,
        hasManychatId: !!newLead.manychatId,
        action: 'CREATE',
        timestamp: new Date().toISOString()
      })

      return newLead.id
    } catch (error: any) {
      logger.error('❌ Error en findOrCreateLeadFromSubscriber', {
        error: error.message,
        stack: error.stack,
        subscriberId: subscriber.id,
        phone: subscriber.whatsapp_phone || subscriber.phone || 'sin teléfono'
      })
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
  private static async handleSubscriberEvent(
    subscriber: ManychatSubscriber,
    isNewSubscriber: boolean = false
  ): Promise<{
    success: boolean
    leadId?: string
    error?: string
    wasCreated?: boolean
  }> {
    try {
      // Si es nuevo subscriber, forzar creación incluso si existe por teléfono
      // (pero no si ya existe por manychatId)
      const leadId = await this.findOrCreateLeadFromSubscriber(subscriber, isNewSubscriber)

      if (!leadId) {
        logger.error('No se pudo encontrar o crear lead', {
          subscriberId: subscriber.id,
          phone: subscriber.whatsapp_phone || subscriber.phone || 'sin teléfono',
          isNewSubscriber
        })
        return { success: false, error: 'Could not find or create lead' }
      }

      // Verificar si el lead fue creado recientemente (últimos 5 segundos)
      // para determinar si fue creado o actualizado
      const { data: lead } = await supabase.client
        ?.from('Lead')
        .select('id, createdAt, updatedAt')
        .eq('id', leadId)
        .single() || { data: null }

      const wasCreated = lead ? (() => {
        const createdAt = new Date(lead.createdAt).getTime()
        const updatedAt = new Date(lead.updatedAt).getTime()
        const now = Date.now()
        // Si fue creado en los últimos 5 segundos, es nuevo
        return (now - createdAt) < 5000 && Math.abs(createdAt - updatedAt) < 1000
      })() : false

      logger.info(`Procesando evento de subscriber (${isNewSubscriber ? 'NUEVO' : 'ACTUALIZADO'})`, {
        leadId,
        subscriberId: subscriber.id,
        wasCreated,
        action: wasCreated ? 'CREATE' : 'UPDATE'
      })

      // Sincronizar datos del subscriber al lead
      await ManychatSyncService.syncManychatToLead(subscriber)

      // Actualizar actividad
      await this.updateLeadActivity(leadId)

      return { success: true, leadId, wasCreated }
    } catch (error: any) {
      logger.error('Error en handleSubscriberEvent', {
        error: error.message,
        subscriberId: subscriber.id,
        isNewSubscriber
      })
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
   * Acepta number o string para manejar IDs grandes de Facebook
   */
  private static async getSubscriberById(subscriberId: number | string): Promise<ManychatSubscriber | null> {
    try {
      return await ManychatService.getSubscriberById(subscriberId)
    } catch (error: any) {
      logger.error('Error obteniendo subscriber por ID', { error: error.message, subscriberId })
      return null
    }
  }
}

