/**
 * Tipos para el servicio de mensajería (envío multi-canal).
 * Agnóstico del proveedor (Meta/WhatsApp, UChat, etc.).
 */

export type MessagingChannel = 'whatsapp' | 'instagram' | 'facebook' | 'unknown'

export interface SendMessageTo {
  phone?: string
  email?: string
  subscriberId?: number
}

export interface SendMessageParams {
  to: SendMessageTo
  message: string
  messageType?: 'text' | 'image' | 'video' | 'file' | 'audio'
  mediaUrl?: string
  caption?: string
  filename?: string
  channel?: MessagingChannel | 'auto'
  tag?: string
}

export type SendMessageErrorCode =
  | 'SUBSCRIBER_NOT_FOUND'
  | 'CHANNEL_UNAVAILABLE'
  | 'OUTSIDE_WINDOW'
  | 'RATE_LIMIT'
  | 'INVALID_PHONE'
  | 'INVALID_EMAIL'
  | 'MESSAGE_TOO_LONG'
  | 'UNSUPPORTED_MESSAGE_TYPE'
  | 'WHATSAPP_TOKEN_EXPIRED'
  | 'INTERNAL_ERROR'

export interface SendMessageResult {
  success: boolean
  messageId?: string
  channel?: MessagingChannel
  subscriberId?: number
  error?: string
  errorCode?: SendMessageErrorCode
}
