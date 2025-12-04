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
  leadId?: string // ID del lead para sincronización si es necesario
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

      // Intentar obtener subscriber primero
      let subscriber = await ManychatService.getSubscriberByPhone(data.to)
      
      // Si no hay subscriber o no tiene ID válido, intentar sincronizar usando leadId
      if (!subscriber || !subscriber.id || (typeof subscriber.id === 'number' && subscriber.id <= 0)) {
        logger.debug('Subscriber no encontrado o sin ID válido, intentando sincronizar lead', {
          phone: data.to.substring(0, 5) + '***',
          hasLeadId: !!data.leadId,
          subscriberHasKey: subscriber?.key ? true : false
        })
        
        // Usar leadId directamente si está disponible, de lo contrario buscar por teléfono
        let lead = null
        if (data.leadId) {
          lead = await supabase.findLeadById(data.leadId)
          logger.info('Lead obtenido por ID', {
            leadId: data.leadId,
            found: !!lead
          })
        }
        
        // Si no se encontró por ID, intentar por teléfono
        if (!lead) {
          lead = await supabase.findLeadByPhoneOrDni(data.to)
          logger.info('Lead obtenido por teléfono', {
            phone: data.to.substring(0, 5) + '***',
            found: !!lead
          })
        }

        if (lead) {
          logger.info('Lead encontrado, sincronizando a ManyChat', {
            leadId: lead.id,
            phone: data.to.substring(0, 5) + '***'
          })
          
          try {
            // Sincronizar lead a Manychat
            await ManychatSyncService.syncLeadToManychat(lead.id)
            
            // Intentar obtener subscriber nuevamente después de sincronizar
            subscriber = await ManychatService.getSubscriberByPhone(data.to)
            
            if (subscriber && subscriber.id && typeof subscriber.id === 'number' && subscriber.id > 0) {
              logger.info('Subscriber válido obtenido después de sincronización', {
                subscriberId: subscriber.id
              })
            } else {
              logger.warn('Subscriber no encontrado o sin ID válido después de sincronización', {
                leadId: lead.id,
                phone: data.to.substring(0, 5) + '***',
                hasSubscriber: !!subscriber,
                subscriberId: subscriber?.id
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
            phone: data.to.substring(0, 5) + '***',
            leadId: data.leadId
          })
        }
      }
      
      // Si aún no hay subscriber o no tiene ID válido después de todos los intentos,
      // intentar obtener el subscriber_id usando otras estrategias
      if (!subscriber || !subscriber.id || (typeof subscriber.id === 'number' && subscriber.id <= 0)) {
        logger.warn('Subscriber no encontrado o sin ID válido, intentando obtener ID usando otras estrategias', {
          phone: data.to.substring(0, 5) + '***',
          hasSubscriber: !!subscriber,
          subscriberKey: subscriber?.key
        })

        // Estrategia 1: Usar manychatId guardado en el lead
        if (data.leadId) {
          const lead = await supabase.findLeadById(data.leadId)
          
          if (lead && lead.manychatId) {
            logger.info('Intentando usar manychatId del lead para obtener subscriber', {
              leadId: data.leadId,
              manychatId: lead.manychatId,
              phone: data.to.substring(0, 5) + '***'
            })
            
            try {
              // Intentar obtener subscriber usando el manychatId guardado
              const subscriberById = await ManychatService.getSubscriberById(lead.manychatId)
              
              if (subscriberById && subscriberById.id && typeof subscriberById.id === 'number' && subscriberById.id > 0) {
                logger.info('Subscriber válido obtenido usando manychatId del lead', {
                  subscriberId: subscriberById.id,
                  manychatId: lead.manychatId
                })
                subscriber = subscriberById
              } else {
                // Si getSubscriberById retorna null o subscriber sin ID válido, intentar usar manychatId directamente
                logger.warn('Subscriber obtenido por manychatId pero sin ID válido o retornó null, intentando usar manychatId directamente', {
                  manychatId: lead.manychatId,
                  hasSubscriber: !!subscriberById,
                  subscriberId: subscriberById?.id,
                  subscriberKey: subscriberById?.key
                })
                
                // Intentar usar el manychatId directamente como subscriber_id
                const manychatIdAsNumber = typeof lead.manychatId === 'string' 
                  ? parseInt(lead.manychatId) 
                  : lead.manychatId
                
                if (manychatIdAsNumber && !isNaN(manychatIdAsNumber) && manychatIdAsNumber > 0) {
                  logger.info('Intentando enviar mensaje usando manychatId directamente como subscriber_id', {
                    manychatId: manychatIdAsNumber,
                    phone: data.to.substring(0, 5) + '***'
                  })
                  
                  // Preparar mensaje según el tipo
                  const messageType = data.messageType === 'document' ? 'file' : data.messageType || 'text'
                  const messages: any[] = []

                  if (messageType === 'text') {
                    messages.push({
                      type: 'text',
                      text: data.message
                    })
                  } else if (data.mediaUrl) {
                    if (messageType === 'image') {
                      messages.push({
                        type: 'image',
                        url: data.mediaUrl,
                        caption: data.message || undefined
                      })
                    } else if (messageType === 'video') {
                      messages.push({
                        type: 'video',
                        url: data.mediaUrl,
                        caption: data.message || undefined
                      })
                    } else if (messageType === 'file') {
                      messages.push({
                        type: 'file',
                        url: data.mediaUrl,
                        filename: data.message || 'document'
                      })
                    } else if (messageType === 'audio') {
                      messages.push({
                        type: 'audio',
                        url: data.mediaUrl
                      })
                    }
                  }

                  // Intentar enviar mensaje usando manychatId directamente
                  const sendResponse = await ManychatService.sendMessage(manychatIdAsNumber, messages)
                  
                  if (sendResponse.status === 'success') {
                    logger.info('Mensaje enviado exitosamente usando manychatId directamente como subscriber_id', {
                      manychatId: manychatIdAsNumber,
                      messageId: sendResponse.data?.message_id
                    })
                    
                    return {
                      success: true,
                      messageId: sendResponse.data?.message_id || 'sent_by_manychat_id',
                      provider: 'manychat',
                      channel: 'whatsapp',
                    }
                  } else {
                    logger.warn('Error enviando mensaje usando manychatId directamente', {
                      manychatId: manychatIdAsNumber,
                      error: sendResponse.error,
                      errorCode: sendResponse.error_code,
                      details: sendResponse.details
                    })
                    // Continuar con las otras estrategias
                  }
                }
              }
            } catch (error: any) {
              logger.error('Error obteniendo subscriber por manychatId', {
                error: error.message,
                stack: error.stack,
                manychatId: lead.manychatId
              })
              
              // Si hay un error pero tenemos manychatId, intentar usarlo directamente
              const manychatIdAsNumber = typeof lead.manychatId === 'string' 
                ? parseInt(lead.manychatId) 
                : lead.manychatId
              
              if (manychatIdAsNumber && !isNaN(manychatIdAsNumber) && manychatIdAsNumber > 0) {
                logger.info('Error obteniendo subscriber, intentando usar manychatId directamente como último recurso', {
                  manychatId: manychatIdAsNumber,
                  error: error.message
                })
                
                try {
                  // Preparar mensaje según el tipo
                  const messageType = data.messageType === 'document' ? 'file' : data.messageType || 'text'
                  const messages: any[] = []

                  if (messageType === 'text') {
                    messages.push({
                      type: 'text',
                      text: data.message
                    })
                  } else if (data.mediaUrl) {
                    if (messageType === 'image') {
                      messages.push({
                        type: 'image',
                        url: data.mediaUrl,
                        caption: data.message || undefined
                      })
                    } else if (messageType === 'video') {
                      messages.push({
                        type: 'video',
                        url: data.mediaUrl,
                        caption: data.message || undefined
                      })
                    } else if (messageType === 'file') {
                      messages.push({
                        type: 'file',
                        url: data.mediaUrl,
                        filename: data.message || 'document'
                      })
                    } else if (messageType === 'audio') {
                      messages.push({
                        type: 'audio',
                        url: data.mediaUrl
                      })
                    }
                  }

                  const sendResponse = await ManychatService.sendMessage(manychatIdAsNumber, messages)
                  
                  if (sendResponse.status === 'success') {
                    logger.info('Mensaje enviado exitosamente usando manychatId directamente después de error', {
                      manychatId: manychatIdAsNumber,
                      messageId: sendResponse.data?.message_id
                    })
                    
                    return {
                      success: true,
                      messageId: sendResponse.data?.message_id || 'sent_by_manychat_id',
                      provider: 'manychat',
                      channel: 'whatsapp',
                    }
                  } else {
                    logger.warn('Error enviando mensaje usando manychatId directamente después de error', {
                      manychatId: manychatIdAsNumber,
                      error: sendResponse.error,
                      errorCode: sendResponse.error_code
                    })
                  }
                } catch (sendError: any) {
                  logger.error('Error enviando mensaje usando manychatId directamente después de error', {
                    error: sendError.message,
                    stack: sendError.stack,
                    manychatId: manychatIdAsNumber
                  })
                }
              }
            }
          }
        }

        // Estrategia 2: Intentar extraer subscriber_id del key si tiene formato específico
        if ((!subscriber || !subscriber.id || (typeof subscriber.id === 'number' && subscriber.id <= 0)) && subscriber?.key) {
          // Intentar extraer subscriber_id del key si tiene formato "user:123456789" o similar
          const keyMatch = subscriber.key.match(/user[:_](\d+)/i)
          if (keyMatch && keyMatch[1]) {
            const extractedId = parseInt(keyMatch[1])
            if (extractedId && extractedId > 0) {
              logger.info('Intentando usar ID extraído del key del subscriber', {
                extractedId,
                key: subscriber.key.substring(0, 30) + '...',
                phone: data.to.substring(0, 5) + '***'
              })
              
              try {
                const subscriberById = await ManychatService.getSubscriberById(extractedId)
                if (subscriberById && subscriberById.id && typeof subscriberById.id === 'number' && subscriberById.id > 0) {
                  logger.info('Subscriber válido obtenido usando ID extraído del key', {
                    subscriberId: subscriberById.id
                  })
                  subscriber = subscriberById
                }
              } catch (error: any) {
                logger.warn('Error obteniendo subscriber por ID extraído del key', {
                  error: error.message,
                  extractedId
                })
              }
            }
          }
        }

        // Estrategia 3: Intentar usar el key directamente como subscriber_id (algunos formatos de ManyChat aceptan esto)
        if ((!subscriber || !subscriber.id || (typeof subscriber.id === 'number' && subscriber.id <= 0)) && subscriber?.key) {
          // Intentar parsear el key como número si es posible
          const keyAsNumber = parseInt(subscriber.key)
          if (!isNaN(keyAsNumber) && keyAsNumber > 0) {
            logger.info('Intentando usar key como subscriber_id numérico', {
              keyAsNumber,
              key: subscriber.key.substring(0, 30) + '...',
              phone: data.to.substring(0, 5) + '***'
            })
            
            try {
              const subscriberById = await ManychatService.getSubscriberById(keyAsNumber)
              if (subscriberById && subscriberById.id && typeof subscriberById.id === 'number' && subscriberById.id > 0) {
                logger.info('Subscriber válido obtenido usando key como subscriber_id', {
                  subscriberId: subscriberById.id
                })
                subscriber = subscriberById
              }
            } catch (error: any) {
              logger.warn('Error obteniendo subscriber usando key como subscriber_id', {
                error: error.message,
                keyAsNumber
              })
            }
          }
        }

        // Si después de todas las estrategias aún no tenemos un subscriber válido,
        // intentar usar teléfono directamente como último recurso
        if (!subscriber || !subscriber.id || (typeof subscriber.id === 'number' && subscriber.id <= 0)) {
          logger.warn('Subscriber no encontrado o sin ID válido después de todas las estrategias, intentando usar teléfono directamente como último recurso', {
            phone: data.to.substring(0, 5) + '***',
            hasSubscriber: !!subscriber,
            subscriberKey: subscriber?.key
          })

          // Preparar mensaje según el tipo
          const messageType = data.messageType === 'document' ? 'file' : data.messageType || 'text'
          const messages: any[] = []

          if (messageType === 'text') {
            messages.push({
              type: 'text',
              text: data.message
            })
          } else if (data.mediaUrl) {
            if (messageType === 'image') {
              messages.push({
                type: 'image',
                url: data.mediaUrl,
                caption: data.message || undefined
              })
            } else if (messageType === 'video') {
              messages.push({
                type: 'video',
                url: data.mediaUrl,
                caption: data.message || undefined
              })
            } else if (messageType === 'file') {
              messages.push({
                type: 'file',
                url: data.mediaUrl,
                filename: data.message || 'document'
              })
            } else if (messageType === 'audio') {
              messages.push({
                type: 'audio',
                url: data.mediaUrl
              })
            }
          }

          // Intentar enviar usando teléfono directamente
          try {
            const phoneResponse = await ManychatService.sendMessageByPhone(data.to, messages)
            
            if (phoneResponse.status === 'success') {
              logger.info('Mensaje enviado exitosamente usando teléfono directamente', {
                phone: data.to.substring(0, 5) + '***',
                messageId: phoneResponse.data?.message_id
              })

              return {
                success: true,
                messageId: phoneResponse.data?.message_id || 'sent_by_phone',
                provider: 'manychat',
                channel: 'whatsapp',
              }
            } else {
              logger.error('Error enviando mensaje usando teléfono directamente', {
                phone: data.to.substring(0, 5) + '***',
                error: phoneResponse.error,
                errorCode: phoneResponse.error_code
              })
              
              // Si el error es sobre permisos, proporcionar mensaje más específico
              if (phoneResponse.error_code?.includes('PERMISSION') || 
                  phoneResponse.error?.toLowerCase().includes('permission denied')) {
                throw new Error('ManyChat requiere permisos adicionales para enviar mensajes. Por favor, contacta al soporte de ManyChat para habilitar esta funcionalidad.')
              }
              
              // Si falla, continuar con el error original
              throw new Error(phoneResponse.error || 'Error enviando mensaje por ManyChat usando teléfono')
            }
          } catch (phoneError: any) {
            // Si el error de teléfono es diferente, lanzarlo
            if (phoneError.message && !phoneError.message.includes('Error enviando mensaje por ManyChat')) {
              throw phoneError
            }
            
            // Si falla el envío por teléfono, lanzar error descriptivo
            // ManyChat requiere subscriber_id y no acepta solo phone
            const errorMessage = `No se puede enviar el mensaje porque ManyChat requiere un subscriber_id válido y el contacto no está completamente sincronizado. Por favor, sincroniza el contacto primero desde la página del lead usando el botón "Actualizar sincronización".`
            logger.error('No se puede enviar mensaje: subscriber no encontrado y falló envío por teléfono', {
              phone: data.to.substring(0, 5) + '***',
              phoneError: phoneError.message,
              hasSubscriber: !!subscriber,
              subscriberKey: subscriber?.key,
              leadId: data.leadId
            })
            throw new Error(errorMessage)
          }
        }
      }

      // Si llegamos aquí, el subscriber tiene un ID válido
      // Asegurar que tenga teléfono configurado
      if (subscriber && !subscriber.whatsapp_phone && !subscriber.phone) {
        logger.info('Subscriber sin teléfono configurado, asignando teléfono', {
          subscriberId: subscriber.id,
          phone: data.to.substring(0, 5) + '***'
        })
        subscriber.whatsapp_phone = data.to
        subscriber.phone = data.to
      } else if (subscriber && !subscriber.whatsapp_phone && subscriber.phone) {
        // Si tiene phone pero no whatsapp_phone, asignar whatsapp_phone también
        subscriber.whatsapp_phone = subscriber.phone
      } else if (subscriber && subscriber.whatsapp_phone && !subscriber.phone) {
        // Si tiene whatsapp_phone pero no phone, asignar phone también
        subscriber.phone = subscriber.whatsapp_phone
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