import { ManychatService } from './manychat-service'
import {
  ManychatChannel,
  ManychatSubscriber,
  ManychatSubscriberIdentifier,
  ManychatSendMessageParams,
  ManychatSendMessageResult,
  ManychatMessage,
  ManychatChannelError,
  ManychatChannelErrorCode,
} from '@/types/manychat'
import { logger } from '@/lib/logger'

/**
 * Servicio unificado para envío de mensajes multi-canal
 * Soporta WhatsApp, Instagram y Facebook Messenger a través de ManyChat
 */
export class MessagingService {
  /**
   * Enviar mensaje a través de cualquier canal soportado
   * Detecta automáticamente el canal o usa el especificado
   */
  static async sendMessage(
    params: ManychatSendMessageParams
  ): Promise<ManychatSendMessageResult> {
    try {
      // Validar parámetros de entrada
      const validationError = this.validateParams(params)
      if (validationError) {
        return {
          success: false,
          error: validationError.message,
          errorCode: validationError.code,
        }
      }

      // Buscar subscriber
      const subscriber = await ManychatService.getSubscriberByIdentifier(params.to)
      
      if (!subscriber) {
        logger.warn('Subscriber no encontrado', {
          identifier: this.sanitizeIdentifier(params.to)
        })
        return {
          success: false,
          error: 'Contacto no encontrado en ManyChat. Verifica que el contacto exista o sincronízalo primero.',
          errorCode: 'SUBSCRIBER_NOT_FOUND',
        }
      }

      // Detectar o validar canal
      const detectedChannel = ManychatService.detectChannel(subscriber)
      let channel = params.channel === 'auto' ? detectedChannel : params.channel || detectedChannel

      // Si se especificó un canal diferente al detectado, verificar compatibilidad
      if (params.channel && params.channel !== 'auto' && params.channel !== detectedChannel) {
        logger.warn('Canal especificado difiere del detectado', {
          specified: params.channel,
          detected: detectedChannel,
          subscriberId: subscriber.id
        })
        // Usar el canal detectado en lugar del especificado para evitar errores
        channel = detectedChannel
      }

      if (channel === 'unknown') {
        logger.error('No se pudo determinar el canal del subscriber', {
          subscriberId: subscriber.id,
          subscriberData: {
            hasPhone: !!subscriber.phone,
            hasEmail: !!subscriber.email,
            hasWhatsAppPhone: !!subscriber.whatsapp_phone,
            hasInstagramId: !!subscriber.instagram_id,
            pageId: subscriber.page_id
          }
        })
        return {
          success: false,
          error: 'No se pudo determinar el canal de comunicación. Verifica que el contacto tenga teléfono o email configurado.',
          errorCode: 'CHANNEL_UNAVAILABLE',
          channel: 'unknown',
        }
      }

      // Validar tipo de mensaje según canal
      const messageTypeError = this.validateMessageTypeForChannel(params.messageType || 'text', channel)
      if (messageTypeError) {
        return {
          success: false,
          error: messageTypeError.message,
          errorCode: messageTypeError.code,
          channel,
        }
      }

      // Construir mensajes según tipo
      const messages = this.buildMessages(params)

      logger.info('Enviando mensaje a través de ManyChat', {
        subscriberId: subscriber.id,
        channel,
        messageType: params.messageType || 'text',
        messageLength: params.message.length,
        hasMedia: !!params.mediaUrl
      })

      // Enviar mensaje usando ManychatService
      const response = await ManychatService.sendMessage(
        subscriber.id,
        messages,
        params.tag
      )

      if (response.status === 'success') {
        logger.info('Mensaje enviado exitosamente', {
          subscriberId: subscriber.id,
          channel,
          messageId: response.data?.message_id,
          messageType: params.messageType || 'text'
        })

        return {
          success: true,
          messageId: response.data?.message_id,
          channel,
          subscriberId: subscriber.id,
        }
      } else {
        logger.error('Error enviando mensaje a través de ManyChat', {
          subscriberId: subscriber.id,
          channel,
          error: response.error,
          errorCode: response.error_code
        })

        return {
          success: false,
          error: response.error || 'Error desconocido al enviar mensaje',
          errorCode: this.mapManychatErrorToChannelError(response.error_code),
          channel,
          subscriberId: subscriber.id,
        }
      }
    } catch (error: any) {
      logger.error('Error inesperado en MessagingService.sendMessage', {
        error: error.message,
        stack: error.stack,
        params: this.sanitizeParams(params)
      })

      return {
        success: false,
        error: error.message || 'Error interno al enviar mensaje',
        errorCode: 'INTERNAL_ERROR',
      }
    }
  }

  /**
   * Validar parámetros de entrada
   */
  private static validateParams(params: ManychatSendMessageParams): ManychatChannelError | null {
    // Validar que haya al menos un identificador
    if (!params.to.phone && !params.to.email && !params.to.subscriberId) {
      return {
        code: 'SUBSCRIBER_NOT_FOUND',
        message: 'Debe proporcionar al menos un identificador (teléfono, email o subscriberId)',
      }
    }

    // Validar teléfono si se proporciona
    if (params.to.phone && !this.isValidPhone(params.to.phone)) {
      return {
        code: 'INVALID_PHONE',
        message: 'Formato de teléfono inválido. Debe estar en formato E.164 (ej: +5491155556789)',
      }
    }

    // Validar email si se proporciona
    if (params.to.email && !this.isValidEmail(params.to.email)) {
      return {
        code: 'INVALID_EMAIL',
        message: 'Formato de email inválido',
      }
    }

    // Validar que haya mensaje
    if (!params.message || params.message.trim().length === 0) {
      return {
        code: 'MESSAGE_TOO_LONG',
        message: 'El mensaje no puede estar vacío',
      }
    }

    // Validar longitud del mensaje
    if (params.message.length > 4096) {
      return {
        code: 'MESSAGE_TOO_LONG',
        message: 'El mensaje es demasiado largo (máximo 4096 caracteres)',
      }
    }

    // Validar que si se especifica mediaUrl, también debe haber messageType adecuado
    if (params.mediaUrl && !['image', 'video', 'file', 'audio'].includes(params.messageType || '')) {
      return {
        code: 'UNSUPPORTED_MESSAGE_TYPE',
        message: 'Si se proporciona mediaUrl, messageType debe ser: image, video, file o audio',
      }
    }

    return null
  }

  /**
   * Validar tipo de mensaje según canal
   */
  private static validateMessageTypeForChannel(
    messageType: string,
    channel: ManychatChannel
  ): ManychatChannelError | null {
    // WhatsApp e Instagram tienen limitaciones similares
    if (channel === 'whatsapp' || channel === 'instagram') {
      // Ambos soportan los tipos básicos
      const supportedTypes = ['text', 'image', 'video', 'audio', 'file']
      if (!supportedTypes.includes(messageType)) {
        return {
          code: 'UNSUPPORTED_MESSAGE_TYPE',
          message: `Tipo de mensaje '${messageType}' no soportado para ${channel}`,
          channel,
        }
      }
    }

    // Facebook Messenger es más permisivo
    // Por ahora aceptamos todos los tipos para Facebook

    return null
  }

  /**
   * Construir array de mensajes según tipo
   */
  private static buildMessages(params: ManychatSendMessageParams): ManychatMessage[] {
    const messages: ManychatMessage[] = []

    const messageType = params.messageType || 'text'

    switch (messageType) {
      case 'image':
        if (params.mediaUrl) {
          messages.push({
            type: 'image',
            url: params.mediaUrl,
            caption: params.message || params.caption,
          })
        } else {
          // Fallback a texto si no hay mediaUrl
          messages.push({
            type: 'text',
            text: params.message,
          })
        }
        break

      case 'video':
        if (params.mediaUrl) {
          messages.push({
            type: 'video',
            url: params.mediaUrl,
            caption: params.message || params.caption,
          })
        } else {
          messages.push({
            type: 'text',
            text: params.message,
          })
        }
        break

      case 'file':
        if (params.mediaUrl) {
          messages.push({
            type: 'file',
            url: params.mediaUrl,
            filename: params.filename || 'document',
          })
          // Agregar mensaje de texto si hay contenido
          if (params.message) {
            messages.push({
              type: 'text',
              text: params.message,
            })
          }
        } else {
          messages.push({
            type: 'text',
            text: params.message,
          })
        }
        break

      case 'audio':
        if (params.mediaUrl) {
          messages.push({
            type: 'audio',
            url: params.mediaUrl,
          })
        } else {
          messages.push({
            type: 'text',
            text: params.message,
          })
        }
        break

      case 'text':
      default:
        messages.push({
          type: 'text',
          text: params.message,
        })
        break
    }

    return messages
  }

  /**
   * Validar formato de teléfono E.164
   */
  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  }

  /**
   * Validar formato de email
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Mapear errores de ManyChat a códigos de error del canal
   */
  private static mapManychatErrorToChannelError(
    manychatErrorCode?: string
  ): ManychatChannelErrorCode {
    if (!manychatErrorCode) return 'INTERNAL_ERROR'

    const errorMap: Record<string, ManychatChannelErrorCode> = {
      'SUBSCRIBER_NOT_FOUND': 'SUBSCRIBER_NOT_FOUND',
      'CHANNEL_UNAVAILABLE': 'CHANNEL_UNAVAILABLE',
      'OUTSIDE_WINDOW': 'OUTSIDE_WINDOW',
      'RATE_LIMIT': 'RATE_LIMIT',
      'INVALID_PHONE': 'INVALID_PHONE',
      'INVALID_EMAIL': 'INVALID_EMAIL',
      'MESSAGE_TOO_LONG': 'MESSAGE_TOO_LONG',
      'UNSUPPORTED_MESSAGE_TYPE': 'UNSUPPORTED_MESSAGE_TYPE',
    }

    return errorMap[manychatErrorCode] || 'INTERNAL_ERROR'
  }

  /**
   * Sanitizar identificador para logs (ocultar datos sensibles)
   */
  private static sanitizeIdentifier(identifier: ManychatSubscriberIdentifier): any {
    return {
      hasPhone: !!identifier.phone,
      hasEmail: !!identifier.email,
      hasSubscriberId: !!identifier.subscriberId,
      phonePreview: identifier.phone ? identifier.phone.substring(0, 5) + '***' : undefined,
      emailPreview: identifier.email ? identifier.email.substring(0, 3) + '***' : undefined,
    }
  }

  /**
   * Sanitizar parámetros para logs
   */
  private static sanitizeParams(params: ManychatSendMessageParams): any {
    return {
      to: this.sanitizeIdentifier(params.to),
      messageLength: params.message?.length || 0,
      messagePreview: params.message?.substring(0, 50) + '...',
      messageType: params.messageType,
      hasMediaUrl: !!params.mediaUrl,
      channel: params.channel,
      hasTag: !!params.tag,
    }
  }
}


