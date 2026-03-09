/**
 * Tipos para el webhook Uchat → CRM
 * Contrato alineado con Manychat para reutilizar la misma lógica:
 * event_type, subscriber, message, tag, custom_field.
 * Cuando Uchat envíe otro formato, normalizar en la ruta a esta estructura.
 */

// ============================================================================
// Usuario / Contacto (equivalente a Manychat Subscriber)
// ============================================================================

export interface UchatSubscriber {
  id: number | string
  first_name?: string
  last_name?: string
  name?: string
  phone?: string
  whatsapp_phone?: string
  email?: string
  subscribed?: string
  last_interaction?: string
  last_input_text?: string
  custom_fields?: Record<string, unknown>
  tags?: Array<{ id: number; name: string }>
}

// ============================================================================
// Mensaje
// ============================================================================

export interface UchatWebhookMessage {
  id: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker' | 'template' | 'interactive'
  text?: string
  url?: string
  caption?: string
  filename?: string
  latitude?: number
  longitude?: number
  template_name?: string
  interactive?: unknown
  timestamp?: number
  direction?: 'inbound' | 'outbound'
  platform_msg_id?: string
}

// ============================================================================
// Tag y custom field
// ============================================================================

export interface UchatTag {
  id: number
  name: string
}

export interface UchatWebhookCustomField {
  id: number
  name: string
  value: unknown
  type?: string
}

// ============================================================================
// Evento de webhook (mismo esquema que Manychat)
// ============================================================================

export type UchatWebhookEventType =
  | 'new_subscriber'
  | 'message_received'
  | 'message_sent'
  | 'tag_added'
  | 'tag_removed'
  | 'custom_field_changed'
  | 'subscriber_updated'

export interface UchatWebhookEvent {
  event_type: UchatWebhookEventType
  subscriber_id?: number | string
  subscriber?: UchatSubscriber
  message?: UchatWebhookMessage
  tag?: UchatTag
  custom_field?: UchatWebhookCustomField
  timestamp?: number
  created_at?: string
  data?: unknown
}
