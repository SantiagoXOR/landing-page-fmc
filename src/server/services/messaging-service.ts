import { WhatsAppService } from './whatsapp-service'
import { WhatsAppAPIError } from '@/lib/integrations/whatsapp-business-api'
import type {
  SendMessageParams,
  SendMessageResult,
  SendMessageTo,
  SendMessageErrorCode,
  MessagingChannel,
} from '@/types/messaging'
import { logger } from '@/lib/logger'

const WHATSAPP_TOKEN_EXPIRED_MESSAGE =
  'El token de WhatsApp (Meta) ha expirado. Renoválo en Meta for Developers y actualizá WHATSAPP_ACCESS_TOKEN en la configuración del proyecto.'

/**
 * Servicio unificado para envío de mensajes.
 * Solo soporta WhatsApp vía Meta API (ManyChat eliminado).
 */
export class MessagingService {
  /**
   * Enviar mensaje. Solo canal WhatsApp (Meta API) está soportado.
   */
  static async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      const validationError = this.validateParams(params)
      if (validationError) {
        return {
          success: false,
          error: validationError.message,
          errorCode: validationError.code,
        }
      }

      const phone = params.to.phone
      const channel: MessagingChannel =
        params.channel === 'auto' || !params.channel
          ? phone
            ? 'whatsapp'
            : 'unknown'
          : params.channel as MessagingChannel

      if (channel !== 'whatsapp') {
        logger.warn('Canal no soportado, solo WhatsApp disponible', {
          channel,
          hasPhone: !!phone,
        })
        return {
          success: false,
          error:
            'Solo el canal WhatsApp está disponible. Configura la API de WhatsApp (Meta) en el CRM.',
          errorCode: 'CHANNEL_UNAVAILABLE',
          channel,
        }
      }

      if (!phone) {
        return {
          success: false,
          error: 'Se requiere teléfono para enviar por WhatsApp.',
          errorCode: 'INVALID_PHONE',
          channel: 'whatsapp',
        }
      }

      if (!WhatsAppService.isConfigured()) {
        return {
          success: false,
          error:
            'WhatsApp no está configurado. Configura WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN.',
          errorCode: 'CHANNEL_UNAVAILABLE',
          channel: 'whatsapp',
        }
      }

      const messageTypeError = this.validateMessageTypeForChannel(
        params.messageType || 'text',
        'whatsapp'
      )
      if (messageTypeError) {
        return {
          success: false,
          error: messageTypeError.message,
          errorCode: messageTypeError.code,
          channel: 'whatsapp',
        }
      }

      logger.info('Enviando mensaje por WhatsApp (Meta)', {
        phonePreview: phone.substring(0, 5) + '***',
        messageType: params.messageType || 'text',
        messageLength: params.message.length,
      })

      const result = await WhatsAppService.sendMessage({
        to: phone,
        message: params.message,
        messageType:
          params.messageType === 'file'
            ? 'document'
            : (params.messageType || 'text'),
        mediaUrl: params.mediaUrl,
      })

      if (result?.success && result?.messageId) {
        return {
          success: true,
          messageId: result.messageId,
          channel: 'whatsapp',
        }
      }

      return {
        success: false,
        error: (result as any)?.message || 'Error al enviar mensaje por WhatsApp',
        errorCode: 'INTERNAL_ERROR',
        channel: 'whatsapp',
      }
    } catch (error: any) {
      logger.error('Error en MessagingService.sendMessage', {
        error: error?.message,
        stack: error?.stack,
        params: this.sanitizeParams(params),
      })
      const isTokenExpired =
        error instanceof WhatsAppAPIError &&
        error.errorData?.error?.code === 190
      const isTokenExpiredMessage =
        typeof error?.message === 'string' &&
        (error.message.includes('Session has expired') ||
          error.message.includes('Error validating access token'))
      if (isTokenExpired || isTokenExpiredMessage) {
        return {
          success: false,
          error: WHATSAPP_TOKEN_EXPIRED_MESSAGE,
          errorCode: 'WHATSAPP_TOKEN_EXPIRED',
          channel: 'whatsapp',
        }
      }
      return {
        success: false,
        error: error?.message || 'Error interno al enviar mensaje',
        errorCode: 'INTERNAL_ERROR',
      }
    }
  }

  private static validateParams(params: SendMessageParams): { message: string; code: SendMessageErrorCode } | null {
    if (!params.to.phone && !params.to.email && !params.to.subscriberId) {
      return {
        code: 'SUBSCRIBER_NOT_FOUND',
        message:
          'Debe proporcionar al menos un identificador (teléfono, email o subscriberId)',
      }
    }
    if (params.to.phone && !this.isValidPhone(params.to.phone)) {
      return {
        code: 'INVALID_PHONE',
        message:
          'Formato de teléfono inválido. Debe estar en formato E.164 (ej: +5491155556789)',
      }
    }
    if (params.to.email && !this.isValidEmail(params.to.email)) {
      return {
        code: 'INVALID_EMAIL',
        message: 'Formato de email inválido',
      }
    }
    if (!params.message?.trim()) {
      return {
        code: 'MESSAGE_TOO_LONG',
        message: 'El mensaje no puede estar vacío',
      }
    }
    if (params.message.length > 4096) {
      return {
        code: 'MESSAGE_TOO_LONG',
        message: 'El mensaje es demasiado largo (máximo 4096 caracteres)',
      }
    }
    if (
      params.mediaUrl &&
      !['image', 'video', 'file', 'audio'].includes(params.messageType || '')
    ) {
      return {
        code: 'UNSUPPORTED_MESSAGE_TYPE',
        message:
          'Si se proporciona mediaUrl, messageType debe ser: image, video, file o audio',
      }
    }
    return null
  }

  private static validateMessageTypeForChannel(
    messageType: string,
    _channel: MessagingChannel
  ): { message: string; code: SendMessageErrorCode } | null {
    const supported = ['text', 'image', 'video', 'audio', 'file']
    if (!supported.includes(messageType)) {
      return {
        code: 'UNSUPPORTED_MESSAGE_TYPE',
        message: `Tipo de mensaje '${messageType}' no soportado para whatsapp`,
      }
    }
    return null
  }

  private static isValidPhone(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone)
  }

  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  private static sanitizeIdentifier(identifier: SendMessageTo): Record<string, unknown> {
    return {
      hasPhone: !!identifier.phone,
      hasEmail: !!identifier.email,
      hasSubscriberId: !!identifier.subscriberId,
      phonePreview: identifier.phone ? identifier.phone.substring(0, 5) + '***' : undefined,
      emailPreview: identifier.email ? identifier.email.substring(0, 3) + '***' : undefined,
    }
  }

  private static sanitizeParams(params: SendMessageParams): Record<string, unknown> {
    return {
      to: this.sanitizeIdentifier(params.to),
      messageLength: params.message?.length ?? 0,
      messagePreview: params.message?.substring(0, 50) + '...',
      messageType: params.messageType,
      hasMediaUrl: !!params.mediaUrl,
      channel: params.channel,
      hasTag: !!params.tag,
    }
  }
}
