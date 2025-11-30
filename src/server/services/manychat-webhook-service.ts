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

            // Crear mensajes para custom_fields si existen (antes del mensaje del usuario)
            // Esto asegura que los datos del AI Step aparezcan antes del último mensaje
            if (subscriber.custom_fields && Object.keys(subscriber.custom_fields).length > 0) {
              await this.createMessagesForCustomFields(leadResult.leadId, subscriber)
            }

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
      // Esto previene duplicados cuando ManyChat envía el mismo mensaje múltiples veces
      if (message.platform_msg_id) {
        const msgId = message.platform_msg_id
        const { data: existingMessage, error: queryError } = await supabase.client
          .from('messages')
          .select('id, sent_at, content, platform_msg_id')
          .eq('platform_msg_id', msgId)
          .single()

        if (existingMessage) {
          // Verificar también que el contenido sea el mismo para evitar falsos positivos
          const existingContent = existingMessage.content || ''
          const newContent = content.trim()
          
          // Si el contenido es diferente, no es un duplicado, es un mensaje diferente
          // Guardar el nuevo mensaje con un ID único
          if (existingContent.trim() !== newContent && newContent.length > 0) {
            logger.info('⚠️ Mensaje con mismo platform_msg_id pero contenido diferente, generando nuevo ID', {
              existingPlatformMsgId: msgId,
              existingContent: existingContent.substring(0, 50),
              newContent: newContent.substring(0, 50),
              conversationId
            })
            // Generar un nuevo ID único para este mensaje
            const timestampMs = Date.now()
            const contentHash = newContent.substring(0, 20).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
            const random = Math.random().toString(36).substring(2, 8)
            message.platform_msg_id = `${msgId}_diff_${timestampMs}_${contentHash}_${random}`
            logger.info('✅ Nuevo platform_msg_id generado para mensaje diferente', {
              newPlatformMsgId: message.platform_msg_id
            })
          } else {
            // Es un duplicado real
            logger.info('🔄 Mensaje duplicado detectado y ignorado', {
              messageId: msgId,
              existingMessageId: existingMessage.id,
              sentAt: existingMessage.sent_at,
              contentPreview: existingMessage.content?.substring(0, 50),
              conversationId
            })
            return existingMessage.id
          }
        }

        // Si hay error pero no es "no encontrado", loguearlo
        if (queryError && queryError.code !== 'PGRST116') {
          logger.warn('Error verificando mensaje duplicado', {
            error: queryError.message,
            errorCode: queryError.code,
            messageId: msgId
          })
        }
      } else {
        logger.warn('⚠️ Mensaje sin platform_msg_id, no se puede verificar duplicados', {
          messageType: message.type,
          hasText: !!message.text,
          conversationId
        })
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
        logger.error('❌ Error guardando mensaje en base de datos', {
          error: createError.message,
          errorCode: createError.code,
          conversationId,
          direction,
          messageType: message.type,
          platformMsgId: message.platform_msg_id || message.id,
          content: content.substring(0, 100) // Primeros 100 caracteres para debug
        })
        throw createError
      }

      // Actualizar última actividad de la conversación
      await ConversationService.updateLastActivity(conversationId)

      logger.info('✅ Mensaje guardado exitosamente en base de datos', {
        messageId: newMessage.id,
        direction,
        conversationId,
        messageType: message.type,
        platformMsgId: message.platform_msg_id || message.id,
        contentLength: content.length,
        hasMedia: !!mediaUrl,
        contentPreview: content.substring(0, 100),
        sentAt: sentAt
      })

      return newMessage.id
    } catch (error: any) {
      logger.error('❌ Error en saveMessage', {
        error: error.message,
        stack: error.stack,
        conversationId,
        direction,
        messageType: message.type,
        platformMsgId: message.platform_msg_id || message.id
      })
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

      // Crear mensajes para cada custom_field que tenga un valor
      // Esto permite ver todos los datos recopilados del AI Step en el chat
      if (subscriber.custom_fields && Object.keys(subscriber.custom_fields).length > 0) {
        await this.createMessagesForCustomFields(leadId, subscriber)
      }

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
      logger.info('📩 Procesando evento de mensaje', {
        eventType,
        subscriberId: subscriber.id,
        messageType: message.type,
        messageId: message.id || message.platform_msg_id,
        hasText: !!message.text,
        phone: subscriber.whatsapp_phone || subscriber.phone || 'sin teléfono'
      })

      // Buscar o crear lead
      const leadId = await this.findOrCreateLeadFromSubscriber(subscriber)

      if (!leadId) {
        logger.error('No se pudo encontrar o crear lead para mensaje', {
          subscriberId: subscriber.id,
          eventType,
          messageId: message.id
        })
        return { success: false, error: 'Could not find or create lead' }
      }

      logger.debug('Lead encontrado/creado para mensaje', {
        leadId,
        subscriberId: subscriber.id
      })

      // Determinar plataforma y platformId
      const platform = subscriber.instagram_id ? 'instagram' : 'whatsapp'
      const platformId = subscriber.instagram_id || subscriber.whatsapp_phone || subscriber.phone || String(subscriber.id)

      logger.debug('Plataforma determinada para mensaje', {
        platform,
        platformId: platformId.substring(0, 5) + '***',
        leadId
      })

      // Buscar o crear conversación
      const conversationId = await this.findOrCreateConversation(leadId, platform, platformId)

      if (!conversationId) {
        logger.error('No se pudo encontrar o crear conversación para mensaje', {
          leadId,
          platform,
          platformId: platformId.substring(0, 5) + '***',
          subscriberId: subscriber.id
        })
        return { success: false, error: 'Could not find or create conversation' }
      }

      logger.debug('Conversación encontrada/creada para mensaje', {
        conversationId,
        leadId,
        platform
      })

      // Verificar que la conversación existe en la base de datos
      if (supabase.client) {
        const { data: conversation, error: convError } = await supabase.client
          .from('conversations')
          .select('id')
          .eq('id', conversationId)
          .single()

        if (convError || !conversation) {
          logger.error('Conversación no existe en la base de datos', {
            conversationId,
            error: convError?.message,
            leadId
          })
          return { success: false, error: 'Conversation does not exist in database' }
        }
      }

      // Determinar dirección del mensaje
      const direction = eventType === 'message_received' ? 'inbound' : 'outbound'

      logger.debug('Guardando mensaje', {
        conversationId,
        direction,
        messageType: message.type,
        hasContent: !!(message.text || message.caption)
      })

      // Guardar mensaje
      const messageId = await this.saveMessage(conversationId, message, direction)

      if (!messageId) {
        logger.error('No se pudo guardar mensaje', {
          conversationId,
          leadId,
          messageType: message.type,
          direction,
          messageId: message.id || message.platform_msg_id
        })
        return { success: false, error: 'Could not save message' }
      }

      logger.info('✅ Mensaje guardado exitosamente', {
        messageId,
        conversationId,
        leadId,
        direction,
        messageType: message.type
      })

      // Actualizar actividad del lead
      await this.updateLeadActivity(leadId)

      return {
        success: true,
        leadId,
        conversationId,
        messageId
      }
    } catch (error: any) {
      logger.error('❌ Error en handleMessageEvent', {
        error: error.message,
        stack: error.stack,
        subscriberId: subscriber.id,
        eventType,
        messageId: message.id || message.platform_msg_id
      })
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
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      logger.info('📝 Procesando evento custom_field_changed', {
        subscriberId: subscriber.id,
        fieldName: customField.name,
        fieldValue: customField.value,
        fieldId: customField.id
      })

      const leadId = await this.findOrCreateLeadFromSubscriber(subscriber)

      if (!leadId) {
        logger.error('No se pudo encontrar o crear lead para custom_field_changed', {
          subscriberId: subscriber.id,
          fieldName: customField.name
        })
        return { success: false, error: 'Could not find or create lead' }
      }

      // Mapeo de custom fields de Manychat a campos del Lead
      const fieldMapping: Record<string, string> = {
        'dni': 'dni',
        'ingresos': 'ingresos',
        'zona': 'zona',
        'producto': 'producto',
        'monto': 'monto',
        'origen': 'origen',
        'estado': 'estado',
        'agencia': 'agencia',
        'banco': 'banco',
        'trabajo_actual': 'trabajo_actual',
        'cuit': 'cuil',
        'cuil': 'cuil'
      }

      const dbFieldName = fieldMapping[customField.name.toLowerCase()]

      // Intentar actualizar el campo específico directamente primero
      if (dbFieldName) {
        try {
          // Obtener el lead actual para preservar otros campos
          const { data: currentLead, error: fetchError } = await supabase.client
            .from('Lead')
            .select('customFields')
            .eq('id', leadId)
            .single()

          if (fetchError) {
            logger.warn('Error obteniendo lead actual para actualizar custom field', {
              leadId,
              error: fetchError.message
            })
          } else {
            // Actualizar el campo específico en el lead
            const updateData: any = {
              updatedAt: new Date().toISOString()
            }

            // Actualizar el campo mapeado si existe
            updateData[dbFieldName] = customField.value !== null && customField.value !== undefined 
              ? customField.value 
              : null

            // Actualizar también el JSON de customFields completo
            let customFieldsJson: Record<string, any> = {}
            if (currentLead?.customFields) {
              try {
                customFieldsJson = typeof currentLead.customFields === 'string' 
                  ? JSON.parse(currentLead.customFields) 
                  : currentLead.customFields
              } catch (parseError) {
                logger.warn('Error parseando customFields existentes', { leadId })
                customFieldsJson = {}
              }
            }

            // Actualizar el campo en el JSON
            customFieldsJson[customField.name] = customField.value
            updateData.customFields = JSON.stringify(customFieldsJson)

            const { error: updateError } = await supabase.client
              .from('Lead')
              .update(updateData)
              .eq('id', leadId)

            if (updateError) {
              logger.error('Error actualizando custom field directamente', {
                leadId,
                fieldName: customField.name,
                dbFieldName,
                error: updateError.message
              })
              throw updateError
            }

            logger.info('✅ Custom field actualizado directamente', {
              leadId,
              fieldName: customField.name,
              dbFieldName,
              value: customField.value
            })

            // Crear mensaje en la conversación para mostrar el dato recopilado
            await this.createCustomFieldMessage(leadId, subscriber, customField)

            // Actualizar actividad
            await this.updateLeadActivity(leadId)

            return { success: true, leadId }
          }
        } catch (directUpdateError: any) {
          logger.warn('Error en actualización directa de custom field, intentando sincronización completa', {
            leadId,
            fieldName: customField.name,
            error: directUpdateError.message
          })
          // Continuar con sincronización completa como fallback
        }
      } else {
        logger.debug('Custom field no tiene mapeo directo, usando sincronización completa', {
          fieldName: customField.name,
          leadId
        })
      }

      // Fallback: Sincronizar subscriber completo para actualizar custom fields
      // Esto asegura que todos los campos se actualicen correctamente
      logger.info('Sincronizando subscriber completo como fallback', {
        leadId,
        subscriberId: subscriber.id
      })

      await ManychatSyncService.syncManychatToLead(subscriber)

      // Crear mensaje en la conversación para mostrar el dato recopilado
      await this.createCustomFieldMessage(leadId, subscriber, customField)

      // Actualizar actividad
      await this.updateLeadActivity(leadId)

      logger.info('✅ Custom field actualizado vía sincronización completa', {
        leadId,
        fieldName: customField.name,
        value: customField.value
      })

      return { success: true, leadId }
    } catch (error: any) {
      logger.error('❌ Error en handleCustomFieldEvent', {
        error: error.message,
        stack: error.stack,
        subscriberId: subscriber.id,
        fieldName: customField.name,
        fieldValue: customField.value
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Crear mensajes para todos los custom_fields del subscriber
   * Esto permite ver todos los datos recopilados del AI Step en el chat
   */
  private static async createMessagesForCustomFields(
    leadId: string,
    subscriber: ManychatSubscriber
  ): Promise<void> {
    try {
      if (!subscriber.custom_fields || Object.keys(subscriber.custom_fields).length === 0) {
        return
      }

      // Lista de campos que queremos mostrar como mensajes, en orden de prioridad
      // Este orden determina el orden en que aparecerán los mensajes
      const relevantFields = [
        'producto',
        'banco',
        'trabajo_actual',
        'zona',
        'cuit',
        'cuil',
        'dni',
        'ingresos',
        'monto',
        'agencia',
        'estado',
        'origen'
      ]

      // Obtener timestamp base (usar last_interaction si está disponible, sino usar ahora)
      const baseTimestamp = subscriber.last_interaction
        ? Math.floor(new Date(subscriber.last_interaction).getTime() / 1000)
        : Math.floor(Date.now() / 1000)

      // Crear mensajes para cada campo relevante que tenga un valor
      const customFields = subscriber.custom_fields
      const fieldsToProcess: Array<{ name: string; value: any; order: number }> = []

      // Primero, recopilar todos los campos que necesitan mensajes
      for (const [fieldName, fieldValue] of Object.entries(customFields)) {
        const normalizedFieldName = fieldName.toLowerCase()
        
        // Solo procesar campos relevantes que tengan un valor
        if (
          relevantFields.includes(normalizedFieldName) &&
          fieldValue !== null &&
          fieldValue !== undefined &&
          fieldValue !== ''
        ) {
          const order = relevantFields.indexOf(normalizedFieldName)
          fieldsToProcess.push({
            name: fieldName,
            value: fieldValue,
            order
          })
        }
      }

      // Ordenar por orden de prioridad
      fieldsToProcess.sort((a, b) => a.order - b.order)

      // Crear mensajes con timestamps incrementales para mantener el orden
      // Usar timestamps que sean anteriores al último mensaje para que aparezcan en orden
      let timestampOffset = -fieldsToProcess.length // Empezar antes del último mensaje
      
      for (const field of fieldsToProcess) {
        // Crear mensaje con timestamp incremental
        await this.createCustomFieldMessageWithTimestamp(
          leadId,
          subscriber,
          {
            id: 0,
            name: field.name,
            value: field.value
          },
          baseTimestamp + timestampOffset
        )
        
        timestampOffset++ // Incrementar para el siguiente mensaje
      }

      logger.info('✅ Mensajes de custom fields creados para subscriber', {
        leadId,
        subscriberId: subscriber.id,
        fieldsCount: fieldsToProcess.length,
        fieldsProcessed: fieldsToProcess.map(f => f.name)
      })
    } catch (error: any) {
      // No fallar si no se pueden crear los mensajes, solo loguear
      logger.warn('Error creando mensajes de custom fields para subscriber', {
        error: error.message,
        leadId,
        subscriberId: subscriber.id
      })
    }
  }

  /**
   * Crear mensaje en la conversación cuando se recopila un dato del AI Step
   * Esto permite ver todos los datos recopilados en orden en el chat del CRM
   */
  private static async createCustomFieldMessage(
    leadId: string,
    subscriber: ManychatSubscriber,
    customField: { id: number; name: string; value: any }
  ): Promise<void> {
    // Usar timestamp actual por defecto
    const timestamp = Math.floor(Date.now() / 1000)
    return this.createCustomFieldMessageWithTimestamp(leadId, subscriber, customField, timestamp)
  }

  /**
   * Crear mensaje en la conversación con un timestamp específico
   * Permite controlar el orden de los mensajes
   */
  private static async createCustomFieldMessageWithTimestamp(
    leadId: string,
    subscriber: ManychatSubscriber,
    customField: { id: number; name: string; value: any },
    timestamp: number
  ): Promise<void> {
    try {
      if (!supabase.client) {
        return
      }

      // Verificar si el mensaje ya existe para evitar duplicados
      // Buscar mensajes existentes con el mismo contenido para este lead
      const fieldName = customField.name.toLowerCase()
      const fieldLabel = this.getFieldLabel(fieldName)
      const formattedValue = this.formatFieldValue(fieldName, customField.value)
      const messageText = `${fieldLabel}: ${formattedValue}`

      // Determinar plataforma y platformId
      const platform = subscriber.instagram_id ? 'instagram' : 'whatsapp'
      const platformId = subscriber.instagram_id || subscriber.whatsapp_phone || subscriber.phone || String(subscriber.id)

      // Buscar o crear conversación
      const conversationId = await this.findOrCreateConversation(leadId, platform, platformId)

      if (!conversationId) {
        logger.warn('No se pudo encontrar o crear conversación para mensaje de custom field', {
          leadId,
          fieldName: customField.name
        })
        return
      }

      // Verificar si ya existe un mensaje con el mismo contenido para evitar duplicados
      const { data: existingMessages } = await supabase.client
        .from('messages')
        .select('id, content, sent_at')
        .eq('conversation_id', conversationId)
        .eq('content', messageText)
        .limit(1)

      if (existingMessages && existingMessages.length > 0) {
        logger.debug('Mensaje de custom field ya existe, omitiendo duplicado', {
          conversationId,
          leadId,
          fieldName: customField.name,
          existingMessageId: existingMessages[0].id
        })
        return
      }

      // Generar un platform_msg_id único para este mensaje de custom field
      const microsecondPrecision = Date.now() % 1000
      const platformMsgId = `manychat_cf_${subscriber.id}_${customField.name}_${timestamp}_${microsecondPrecision}_${Math.random().toString(36).substring(2, 8)}`

      const message: ManychatWebhookMessage = {
        id: `cf_msg_${subscriber.id}_${customField.name}_${timestamp}_${Date.now()}`,
        type: 'text',
        text: messageText,
        timestamp,
        direction: 'inbound',
        platform_msg_id: platformMsgId
      }

      // Guardar el mensaje
      const messageId = await this.saveMessage(conversationId, message, 'inbound')

      if (messageId) {
        logger.info('✅ Mensaje de custom field creado en conversación', {
          messageId,
          conversationId,
          leadId,
          fieldName: customField.name,
          fieldLabel,
          messageText,
          timestamp
        })
      } else {
        logger.warn('No se pudo crear mensaje de custom field en conversación', {
          conversationId,
          leadId,
          fieldName: customField.name
        })
      }
    } catch (error: any) {
      // No fallar si no se puede crear el mensaje, solo loguear
      logger.warn('Error creando mensaje de custom field en conversación', {
        error: error.message,
        leadId,
        fieldName: customField.name
      })
    }
  }

  /**
   * Obtener etiqueta amigable para un campo
   */
  private static getFieldLabel(fieldName: string): string {
    const fieldLabels: Record<string, string> = {
      'producto': 'Producto',
      'banco': 'Banco',
      'trabajo_actual': 'Trabajo Actual',
      'zona': 'Zona',
      'cuit': 'CUIT',
      'cuil': 'CUIL',
      'dni': 'DNI',
      'ingresos': 'Ingresos',
      'monto': 'Monto',
      'agencia': 'Agencia',
      'estado': 'Estado',
      'origen': 'Origen'
    }
    return fieldLabels[fieldName] || fieldName
  }

  /**
   * Formatear valor de campo según su tipo
   */
  private static formatFieldValue(fieldName: string, fieldValue: any): string {
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      return ''
    }

    // Formatear números como moneda
    if (fieldName === 'ingresos' || fieldName === 'monto') {
      const numValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue
      if (!isNaN(numValue)) {
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0
        }).format(numValue)
      }
    }

    return String(fieldValue)
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

