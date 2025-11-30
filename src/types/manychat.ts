/**
 * Tipos TypeScript para la API de Manychat
 * Basado en la documentación oficial de Manychat API
 */

// ============================================================================
// Subscriber (Contacto)
// ============================================================================

export interface ManychatSubscriber {
  id: number
  key: string
  page_id: number
  status: 'active' | 'inactive'
  first_name?: string
  last_name?: string
  name?: string
  gender?: 'male' | 'female'
  profile_pic?: string
  locale?: string
  language?: string
  timezone?: string
  phone?: string
  email?: string
  subscribed?: string // ISO date
  last_interaction?: string // ISO date
  last_seen?: string // ISO date
  last_input_text?: string // Último mensaje enviado por el usuario
  opted_in_phone?: boolean
  opted_in_email?: boolean
  custom_fields?: Record<string, any>
  tags?: ManychatTag[]
  has_opt_in_sms?: boolean
  has_opt_in_email?: boolean
  whatsapp_phone?: string
  instagram_id?: string
}

// ============================================================================
// Tags
// ============================================================================

export interface ManychatTag {
  id: number
  name: string
}

export interface ManychatTagResponse {
  tags: ManychatTag[]
}

// ============================================================================
// Custom Fields
// ============================================================================

export interface ManychatCustomField {
  id: number
  name: string
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean'
  description?: string
}

export interface ManychatCustomFieldsResponse {
  fields: ManychatCustomField[]
}

// ============================================================================
// Messages
// ============================================================================

export interface ManychatTextMessage {
  type: 'text'
  text: string
}

export interface ManychatImageMessage {
  type: 'image'
  url: string
  caption?: string
}

export interface ManychatVideoMessage {
  type: 'video'
  url: string
  caption?: string
}

export interface ManychatAudioMessage {
  type: 'audio'
  url: string
}

export interface ManychatFileMessage {
  type: 'file'
  url: string
  filename?: string
}

export interface ManychatButtonMessage {
  type: 'cards'
  elements: Array<{
    title: string
    subtitle?: string
    image_url?: string
    buttons: Array<{
      type: 'url' | 'postback' | 'phone_number'
      title: string
      url?: string
      payload?: string
      phone_number?: string
    }>
  }>
}

export type ManychatMessage =
  | ManychatTextMessage
  | ManychatImageMessage
  | ManychatVideoMessage
  | ManychatAudioMessage
  | ManychatFileMessage
  | ManychatButtonMessage

// ============================================================================
// Send Message
// ============================================================================

export interface ManychatSendMessageRequest {
  subscriber_id?: number
  phone?: string // E.164 format
  email?: string
  data?: {
    version: 'v2'
    messages: ManychatMessage[]
    tag?: string
  }
}

export interface ManychatSendMessageResponse {
  status: 'success' | 'error'
  data?: {
    message_id?: string
  }
  error?: string
  error_code?: string
}

// ============================================================================
// Webhook Events
// ============================================================================

export type ManychatWebhookEventType =
  | 'new_subscriber'
  | 'message_received'
  | 'message_sent'
  | 'tag_added'
  | 'tag_removed'
  | 'custom_field_changed'
  | 'subscriber_updated'
  | 'flow_triggered'
  | 'button_clicked'

export interface ManychatWebhookEvent {
  event_type: ManychatWebhookEventType
  subscriber_id?: number
  subscriber?: ManychatSubscriber
  message?: ManychatWebhookMessage
  tag?: ManychatTag
  custom_field?: ManychatWebhookCustomField
  flow?: {
    id: number
    name: string
    ns: string
  }
  button?: {
    id: string
    title: string
    payload?: string
  }
  timestamp?: number
  created_at?: string
  data?: any // Para eventos personalizados
}

export interface ManychatWebhookMessage {
  id: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker' | 'template' | 'interactive'
  text?: string
  url?: string
  caption?: string
  filename?: string
  latitude?: number
  longitude?: number
  template_name?: string
  interactive?: any
  timestamp?: number
  direction?: 'inbound' | 'outbound'
  platform_msg_id?: string
}

export interface ManychatWebhookCustomField {
  id: number
  name: string
  value: any
  type?: 'text' | 'number' | 'date' | 'datetime' | 'boolean'
}

export interface ManychatWebhookData {
  subscriber?: ManychatSubscriber
  message?: ManychatWebhookMessage
  tag?: ManychatTag
  custom_field?: ManychatWebhookCustomField
  flow?: {
    id: number
    name: string
    ns: string
  }
  button?: {
    id: string
    title: string
    payload?: string
  }
}

// ============================================================================
// Broadcast
// ============================================================================

export interface ManychatBroadcastRequest {
  name: string
  subscribers?: number[] // Array of subscriber IDs
  tags?: number[] // Array of tag IDs
  message: ManychatMessage[]
  send_time?: string // ISO date for scheduled broadcasts
}

export interface ManychatBroadcastResponse {
  status: 'success' | 'error'
  broadcast_id?: number
  error?: string
}

// ============================================================================
// API Responses
// ============================================================================

export interface ManychatApiResponse<T = any> {
  status: 'success' | 'error'
  data?: T
  error?: string
  error_code?: string
  details?: string
}

export interface ManychatSubscriberResponse {
  status: 'success'
  data: ManychatSubscriber
}

export interface ManychatSubscribersResponse {
  status: 'success'
  data: ManychatSubscriber[]
  page_info?: {
    has_next_page: boolean
    end_cursor?: string
  }
}

// ============================================================================
// Flow Information
// ============================================================================

export interface ManychatFlow {
  id: number
  name: string
  ns: string // namespace
  status: 'active' | 'inactive'
}

export interface ManychatFlowsResponse {
  status: 'success'
  data: ManychatFlow[]
}

// ============================================================================
// Request Options
// ============================================================================

export interface ManychatRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  body?: any
  params?: Record<string, string | number | boolean>
}

// ============================================================================
// Subscriber Actions
// ============================================================================

export interface ManychatSubscriberActionRequest {
  subscriber_id: number
  action: 'add_tag' | 'remove_tag' | 'set_custom_field'
  tag_id?: number
  tag_name?: string
  field_id?: number
  field_name?: string
  field_value?: any
}

// ============================================================================
// Sync Types (para nuestro CRM)
// ============================================================================

export interface ManychatSyncData {
  leadId: string
  manychatId?: string
  syncType: 'lead_to_manychat' | 'manychat_to_lead' | 'tags' | 'custom_fields'
  direction: 'to_manychat' | 'from_manychat'
  data?: any
}

export interface ManychatLeadData {
  phone: string
  first_name?: string
  last_name?: string
  email?: string
  whatsapp_phone?: string
  custom_fields?: Record<string, any>
  tags?: string[]
}

// ============================================================================
// Channel Detection & Multi-Channel Messaging
// ============================================================================

/**
 * Canales soportados por ManyChat
 */
export type ManychatChannel = 'whatsapp' | 'instagram' | 'facebook' | 'unknown'

/**
 * Identificador para buscar un subscriber
 */
export interface ManychatSubscriberIdentifier {
  phone?: string
  email?: string
  subscriberId?: number
}

/**
 * Parámetros para envío de mensaje multi-canal
 */
export interface ManychatSendMessageParams {
  to: ManychatSubscriberIdentifier
  message: string
  messageType?: 'text' | 'image' | 'video' | 'file' | 'audio'
  mediaUrl?: string
  caption?: string
  filename?: string
  channel?: ManychatChannel | 'auto'
  tag?: string
}

/**
 * Resultado del envío de mensaje
 */
export interface ManychatSendMessageResult {
  success: boolean
  messageId?: string
  channel?: ManychatChannel
  subscriberId?: number
  error?: string
  errorCode?: string
}

/**
 * Errores específicos por canal
 */
export type ManychatChannelErrorCode =
  | 'SUBSCRIBER_NOT_FOUND'
  | 'CHANNEL_UNAVAILABLE'
  | 'OUTSIDE_WINDOW'
  | 'RATE_LIMIT'
  | 'INVALID_PHONE'
  | 'INVALID_EMAIL'
  | 'MESSAGE_TOO_LONG'
  | 'UNSUPPORTED_MESSAGE_TYPE'
  | 'INTERNAL_ERROR'

export interface ManychatChannelError {
  code: ManychatChannelErrorCode
  message: string
  channel?: ManychatChannel
  details?: any
}

