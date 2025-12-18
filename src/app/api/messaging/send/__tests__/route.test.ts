import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import { getServerSession } from 'next-auth/next'
import { checkPermission } from '@/lib/rbac'
import { MessagingService } from '@/server/services/messaging-service'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { ConversationService } from '@/server/services/conversation-service'
import {
  createMockSession,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
} from '@/__tests__/helpers/messaging-test-helpers'

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  checkPermission: vi.fn(),
}))

vi.mock('@/server/services/messaging-service', () => ({
  MessagingService: {
    sendMessage: vi.fn(),
  },
}))

vi.mock('@/server/services/whatsapp-service', () => ({
  WhatsAppService: {
    createMessage: vi.fn(),
  },
}))

vi.mock('@/server/services/conversation-service', () => ({
  ConversationService: {
    getConversationById: vi.fn(),
    updateLastActivity: vi.fn(),
  },
}))

const mockGetServerSession = vi.mocked(getServerSession)
const mockCheckPermission = vi.mocked(checkPermission)
const mockMessagingService = vi.mocked(MessagingService)
const mockWhatsAppService = vi.mocked(WhatsAppService)
const mockConversationService = vi.mocked(ConversationService)

describe('/api/messaging/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/messaging/send', () => {
    describe('Envío exitoso', () => {
      it('debe enviar mensaje exitosamente con teléfono', async () => {
        const mockSession = createMockSession()
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {})

        mockMessagingService.sendMessage.mockResolvedValueOnce({
          success: true,
          messageId: 'wamid.test123',
          channel: 'whatsapp',
          subscriberId: 123456789,
        })

        const requestBody = {
          to: {
            phone: '+5491155556789',
          },
          message: 'Test message',
          messageType: 'text',
          channel: 'auto',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.messageId).toBe('wamid.test123')
        expect(data.channel).toBe('whatsapp')
        expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            to: requestBody.to,
            message: requestBody.message,
            messageType: requestBody.messageType,
            channel: requestBody.channel,
          })
        )
      })

      it('debe enviar mensaje exitosamente con email', async () => {
        const mockSession = createMockSession()
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {})

        mockMessagingService.sendMessage.mockResolvedValueOnce({
          success: true,
          messageId: 'wamid.insta123',
          channel: 'instagram',
          subscriberId: 987654321,
        })

        const requestBody = {
          to: {
            email: 'maria@example.com',
          },
          message: 'Test message',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.channel).toBe('instagram')
      })

      it('debe registrar mensaje en base de datos cuando hay conversationId', async () => {
        const mockSession = createMockSession()
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {})

        mockMessagingService.sendMessage.mockResolvedValueOnce({
          success: true,
          messageId: 'wamid.test123',
          channel: 'whatsapp',
          subscriberId: 123456789,
        })

        mockWhatsAppService.createMessage.mockResolvedValueOnce({
          id: 'msg-123',
          conversation_id: 'conv-123',
          direction: 'outbound',
          content: 'Test message',
          message_type: 'text',
          sent_at: new Date().toISOString(),
        } as any)

        mockConversationService.updateLastActivity.mockResolvedValueOnce(undefined)

        const requestBody = {
          conversationId: 'conv-123',
          to: {
            phone: '+5491155556789',
          },
          message: 'Test message',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)

        expect(response.status).toBe(201)
        expect(mockWhatsAppService.createMessage).toHaveBeenCalled()
        expect(mockConversationService.updateLastActivity).toHaveBeenCalledWith('conv-123')
      })
    })

    describe('Autenticación y Permisos', () => {
      it('debe retornar 401 si no está autenticado', async () => {
        mockGetServerSession.mockResolvedValue(null)

        const requestBody = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('No autorizado')
        expect(mockMessagingService.sendMessage).not.toHaveBeenCalled()
      })

      it('debe retornar 403 si no tiene permisos', async () => {
        const mockSession = createMockSession({ user: { role: 'VIEWER' } })
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {
          throw new Error('Insufficient permissions')
        })

        const requestBody = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error).toBe('Sin permisos para enviar mensajes')
      })
    })

    describe('Validación de Datos', () => {
      it('debe retornar 400 si los datos son inválidos', async () => {
        const mockSession = createMockSession()
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {})

        const requestBody = {
          to: {}, // Sin identificador
          message: 'Test message',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBeDefined()
        expect(data.details).toBeDefined()
      })

      it('debe retornar 400 si el JSON es inválido', async () => {
        const mockSession = createMockSession()
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {})

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid JSON')
      })
    })

    describe('Manejo de Errores', () => {
      it('debe retornar 500 si el envío falla', async () => {
        const mockSession = createMockSession()
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {})

        mockMessagingService.sendMessage.mockResolvedValueOnce({
          success: false,
          error: 'Error enviando mensaje',
          errorCode: 'SUBSCRIBER_NOT_FOUND',
        })

        const requestBody = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBeDefined()
        expect(data.errorCode).toBe('SUBSCRIBER_NOT_FOUND')
      })

      it('debe manejar errores inesperados', async () => {
        const mockSession = createMockSession()
        mockGetServerSession.mockResolvedValue(mockSession as any)
        mockCheckPermission.mockImplementation(() => {})

        mockMessagingService.sendMessage.mockRejectedValueOnce(
          new Error('Unexpected error')
        )

        const requestBody = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
        }

        const request = new NextRequest('http://localhost:3000/api/messaging/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('GET /api/messaging/send', () => {
    it('debe retornar información del endpoint', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const request = new NextRequest('http://localhost:3000/api/messaging/send', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.endpoint).toBe('/api/messaging/send')
      expect(data.supportedChannels).toContain('whatsapp')
      expect(data.supportedChannels).toContain('instagram')
      expect(data.supportedChannels).toContain('facebook')
      expect(data.autoChannelDetection).toBe(true)
    })

    it('debe requerir autenticación para GET', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/messaging/send', {
        method: 'GET',
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})






















