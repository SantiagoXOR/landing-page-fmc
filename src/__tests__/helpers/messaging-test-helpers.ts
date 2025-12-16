import { vi } from 'vitest'
import { ManychatSubscriber, ManychatSendMessageParams, ManychatChannel } from '@/types/manychat'
import {
  mockWhatsAppSubscriber,
  mockInstagramSubscriber,
  mockFacebookSubscriber,
  createMockSubscriber,
  createMockSuccessResponse,
  createMockErrorResponse,
  getMockSubscriberByChannel,
} from '../mocks/manychat-api'

/**
 * Helper functions para tests de mensajería
 */

// Mock de sesión de usuario para tests
export const createMockSession = (overrides: any = {}) => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

// Mock de request para tests de API routes
export const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
    method: 'POST',
    url: 'http://localhost:3000/api/test',
  } as any
}

// Mock de NextRequest con autenticación
export const createAuthenticatedRequest = (body: any) => {
  return createMockRequest(body, {
    'authorization': 'Bearer test-token',
    'content-type': 'application/json',
  })
}

// Mock de NextRequest sin autenticación
export const createUnauthenticatedRequest = (body: any) => {
  return createMockRequest(body, {
    'content-type': 'application/json',
  })
}

// Helper para mockear ManychatService.getSubscriberByEmail
export const mockGetSubscriberByEmail = (
  email: string,
  subscriber: ManychatSubscriber | null = null
) => {
  if (email.includes('instagram')) {
    return mockInstagramSubscriber
  }
  if (email.includes('facebook')) {
    return mockFacebookSubscriber
  }
  return subscriber
}

// Helper para mockear ManychatService.getSubscriberByPhone
export const mockGetSubscriberByPhone = (
  phone: string,
  subscriber: ManychatSubscriber | null = null
) => {
  if (phone.includes('+54911')) {
    return mockWhatsAppSubscriber
  }
  return subscriber
}

// Helper para mockear ManychatService.getSubscriberByIdentifier
export const mockGetSubscriberByIdentifier = (
  identifier: { phone?: string; email?: string; subscriberId?: number },
  subscriber: ManychatSubscriber | null = null
) => {
  if (identifier.subscriberId) {
    if (identifier.subscriberId === 123456789) return mockWhatsAppSubscriber
    if (identifier.subscriberId === 987654321) return mockInstagramSubscriber
    if (identifier.subscriberId === 456789123) return mockFacebookSubscriber
  }
  if (identifier.phone) {
    return mockGetSubscriberByPhone(identifier.phone)
  }
  if (identifier.email) {
    return mockGetSubscriberByEmail(identifier.email)
  }
  return subscriber
}

// Helper para mockear ManychatService.detectChannel
export const mockDetectChannel = (subscriber: ManychatSubscriber): ManychatChannel => {
  if (subscriber.whatsapp_phone || (subscriber.phone && /^\+[1-9]\d{1,14}$/.test(subscriber.phone))) {
    return 'whatsapp'
  }
  if (subscriber.instagram_id) {
    return 'instagram'
  }
  if (subscriber.email && subscriber.page_id) {
    return 'facebook'
  }
  return 'unknown'
}

// Helper para mockear ManychatService.sendMessage
export const mockSendMessage = (
  subscriberId: number,
  success: boolean = true,
  messageId: string = 'wamid.test123'
) => {
  if (success) {
    return createMockSuccessResponse(messageId)
  }
  return createMockErrorResponse('Error sending message', 'SEND_ERROR')
}

// Helper para crear parámetros de envío válidos
export const createValidSendParams = (
  overrides: Partial<ManychatSendMessageParams> = {}
): ManychatSendMessageParams => {
  return {
    to: {
      phone: '+5491155556789',
    },
    message: 'Test message',
    messageType: 'text',
    channel: 'auto',
    ...overrides,
  }
}

// Helper para validar respuesta de envío
export const validateSendResponse = (response: any, expected: any) => {
  expect(response.success).toBe(expected.success)
  if (expected.success) {
    expect(response.messageId).toBeDefined()
    if (expected.channel) {
      expect(response.channel).toBe(expected.channel)
    }
  } else {
    expect(response.error).toBeDefined()
    if (expected.errorCode) {
      expect(response.errorCode).toBe(expected.errorCode)
    }
  }
}

// Helper para setup de variables de entorno para tests
export const setupTestEnv = () => {
  process.env.MANYCHAT_API_KEY = 'test-api-key'
  process.env.MANYCHAT_BASE_URL = 'https://api.manychat.com'
  process.env.NEXTAUTH_SECRET = 'test-secret'
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
}

// Helper para limpiar variables de entorno después de tests
export const cleanupTestEnv = () => {
  delete process.env.MANYCHAT_API_KEY
  delete process.env.MANYCHAT_BASE_URL
}

// Helper para crear error de ManyChat API
export const createManyChatApiError = (errorCode: string, message: string) => {
  return {
    status: 'error' as const,
    error: message,
    error_code: errorCode,
  }
}

// Helper para mockear fetch con respuesta de ManyChat
export const mockManyChatFetch = (
  success: boolean = true,
  responseData: any = null,
  status: number = 200
) => {
  const mockResponse = success
    ? responseData || createMockSuccessResponse()
    : responseData || createMockErrorResponse('Error', 'ERROR')

  return vi.fn().mockResolvedValue({
    ok: success,
    status,
    json: vi.fn().mockResolvedValue(mockResponse),
    headers: new Headers(),
  })
}

// Helper para esperar que se haya llamado con parámetros específicos
export const expectCalledWithParams = (mockFn: any, params: any) => {
  expect(mockFn).toHaveBeenCalledWith(
    expect.objectContaining(params)
  )
}

// Helper para crear subscriber según canal
export const createSubscriberForChannel = (channel: ManychatChannel): ManychatSubscriber => {
  return getMockSubscriberByChannel(channel)
}

// Helper para crear múltiples subscribers para tests
export const createMultipleSubscribers = (count: number, channel: ManychatChannel = 'whatsapp') => {
  return Array.from({ length: count }, (_, i) => 
    createMockSubscriber({
      id: 1000000 + i,
      phone: `+549115555${String(i).padStart(4, '0')}`,
      first_name: `User${i}`,
      last_name: 'Test',
    })
  )
}

// Helper para simular delay en tests asíncronos
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))




















