import { ManychatSubscriber, ManychatSendMessageResponse, ManychatChannel } from '@/types/manychat'

/**
 * Mocks para la API de ManyChat
 * Utilizado en tests unitarios y de integración
 */

// Subscriber mock para WhatsApp
export const mockWhatsAppSubscriber: ManychatSubscriber = {
  id: 123456789,
  key: 'subscriber_key_whatsapp',
  page_id: 1001,
  status: 'active',
  first_name: 'Juan',
  last_name: 'Pérez',
  name: 'Juan Pérez',
  phone: '+5491155556789',
  whatsapp_phone: '+5491155556789',
  email: undefined,
  instagram_id: undefined,
  subscribed: new Date().toISOString(),
  last_interaction: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  last_input_text: 'Hola, quiero información',
  opted_in_phone: true,
  opted_in_email: false,
  custom_fields: {},
  tags: [],
}

// Subscriber mock para Instagram
export const mockInstagramSubscriber: ManychatSubscriber = {
  id: 987654321,
  key: 'subscriber_key_instagram',
  page_id: 1002,
  status: 'active',
  first_name: 'María',
  last_name: 'González',
  name: 'María González',
  email: 'maria@example.com',
  instagram_id: 'instagram_user_123',
  phone: undefined,
  whatsapp_phone: undefined,
  subscribed: new Date().toISOString(),
  last_interaction: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  last_input_text: '¿Dónde están ubicados?',
  opted_in_phone: false,
  opted_in_email: true,
  custom_fields: {},
  tags: [],
}

// Subscriber mock para Facebook Messenger
export const mockFacebookSubscriber: ManychatSubscriber = {
  id: 456789123,
  key: 'subscriber_key_facebook',
  page_id: 1003,
  status: 'active',
  first_name: 'Carlos',
  last_name: 'Rodríguez',
  name: 'Carlos Rodríguez',
  email: 'carlos@example.com',
  phone: undefined,
  whatsapp_phone: undefined,
  instagram_id: undefined,
  subscribed: new Date().toISOString(),
  last_interaction: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  last_input_text: 'Necesito ayuda',
  opted_in_phone: false,
  opted_in_email: true,
  custom_fields: {},
  tags: [],
}

// Subscriber mock sin canal claro (unknown)
export const mockUnknownSubscriber: ManychatSubscriber = {
  id: 111222333,
  key: 'subscriber_key_unknown',
  page_id: 1004,
  status: 'active',
  first_name: 'Test',
  last_name: 'User',
  name: 'Test User',
  phone: undefined,
  email: undefined,
  whatsapp_phone: undefined,
  instagram_id: undefined,
  subscribed: new Date().toISOString(),
  last_interaction: new Date().toISOString(),
  custom_fields: {},
  tags: [],
}

// Respuesta exitosa de ManyChat API
export const mockManyChatSuccessResponse: ManychatSendMessageResponse = {
  status: 'success',
  data: {
    message_id: 'wamid.test123456789',
  },
}

// Respuestas de error de ManyChat API
export const mockManyChatErrorResponses = {
  subscriberNotFound: {
    status: 'error' as const,
    error: 'Subscriber not found',
    error_code: 'SUBSCRIBER_NOT_FOUND',
  },
  channelUnavailable: {
    status: 'error' as const,
    error: 'Channel not available',
    error_code: 'CHANNEL_UNAVAILABLE',
  },
  outsideWindow: {
    status: 'error' as const,
    error: 'Message outside 24h window',
    error_code: 'OUTSIDE_WINDOW',
  },
  rateLimit: {
    status: 'error' as const,
    error: 'Rate limit exceeded',
    error_code: 'RATE_LIMIT',
  },
  invalidPhone: {
    status: 'error' as const,
    error: 'Invalid phone number',
    error_code: 'INVALID_PHONE',
  },
  invalidEmail: {
    status: 'error' as const,
    error: 'Invalid email address',
    error_code: 'INVALID_EMAIL',
  },
}

// Helper para crear subscriber mock personalizado
export function createMockSubscriber(overrides: Partial<ManychatSubscriber> = {}): ManychatSubscriber {
  return {
    ...mockWhatsAppSubscriber,
    ...overrides,
  }
}

// Helper para crear respuesta exitosa mock
export function createMockSuccessResponse(
  messageId: string = 'wamid.test123'
): ManychatSendMessageResponse {
  return {
    status: 'success',
    data: {
      message_id: messageId,
    },
  }
}

// Helper para crear respuesta de error mock
export function createMockErrorResponse(
  error: string,
  errorCode?: string
): ManychatSendMessageResponse {
  return {
    status: 'error',
    error,
    error_code: errorCode,
  }
}

// Helper para obtener subscriber según canal
export function getMockSubscriberByChannel(channel: ManychatChannel): ManychatSubscriber {
  switch (channel) {
    case 'whatsapp':
      return mockWhatsAppSubscriber
    case 'instagram':
      return mockInstagramSubscriber
    case 'facebook':
      return mockFacebookSubscriber
    default:
      return mockUnknownSubscriber
  }
}

// Datos de prueba
export const testData = {
  validPhones: {
    argentina: '+5491155556789',
    argentinaFormosa: '+543704123456',
    us: '+12025551234',
  },
  invalidPhones: {
    noCountryCode: '5491155556789',
    noPlus: '5491155556789',
    tooShort: '+1',
    tooLong: '+123456789012345678',
    letters: '+54911ABC5678',
  },
  validEmails: {
    basic: 'user@example.com',
    withSubdomain: 'user@mail.example.com',
    withPlus: 'user+test@example.com',
    withDash: 'user-name@example.com',
  },
  invalidEmails: {
    noAt: 'userexample.com',
    noDomain: 'user@',
    noUser: '@example.com',
    doubleAt: 'user@@example.com',
    noTld: 'user@example',
  },
  subscriberIds: {
    whatsapp: 123456789,
    instagram: 987654321,
    facebook: 456789123,
  },
}




















