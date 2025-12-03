import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getServerSession } from 'next-auth/next'
import { checkPermission } from '@/lib/rbac'
import { ConversationService } from '@/server/services/conversation-service'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { createMockSession } from '@/__tests__/helpers/messaging-test-helpers'

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  checkPermission: vi.fn(),
}))

vi.mock('@/server/services/conversation-service', () => ({
  ConversationService: {
    getConversationById: vi.fn(),
    updateLastActivity: vi.fn(),
  },
}))

vi.mock('@/server/services/whatsapp-service', () => ({
  WhatsAppService: {
    sendMessage: vi.fn(),
    createMessage: vi.fn(),
  },
}))

const mockGetServerSession = vi.mocked(getServerSession)
const mockCheckPermission = vi.mocked(checkPermission)
const mockConversationService = vi.mocked(ConversationService)
const mockWhatsAppService = vi.mocked(WhatsAppService)

describe('/api/conversations/[id]/messages', () => {
  const conversationId = 'conv-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/conversations/[id]/messages', () => {
    it('debe obtener mensajes exitosamente', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const mockConversation = {
        id: conversationId,
        platform: 'whatsapp',
        status: 'open',
        messages: [
          {
            id: 'msg-1',
            direction: 'inbound',
            content: 'Hello',
            message_type: 'text',
            sent_at: new Date('2024-01-01T10:00:00Z').toISOString(),
            created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
          },
          {
            id: 'msg-2',
            direction: 'outbound',
            content: 'Hi there!',
            message_type: 'text',
            sent_at: new Date('2024-01-01T10:05:00Z').toISOString(),
            created_at: new Date('2024-01-01T10:05:00Z').toISOString(),
          },
        ],
        lead: {
          id: 'lead-123',
          nombre: 'Test Lead',
          telefono: '+5491155556789',
          email: 'test@example.com',
        },
      }

      mockConversationService.getConversationById.mockResolvedValueOnce(
        mockConversation as any
      )

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toHaveLength(2)
      expect(data.messages[0].content).toBe('Hello')
      expect(data.messages[1].content).toBe('Hi there!')
      expect(mockCheckPermission).toHaveBeenCalledWith('ADMIN', 'leads:read')
    })

    it('debe retornar 401 si no está autenticado', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
    })

    it('debe retornar 403 si no tiene permisos', async () => {
      const mockSession = createMockSession({ user: { role: 'VIEWER' } })
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {
        throw new Error('Insufficient permissions')
      })

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Sin permisos')
    })

    it('debe retornar 404 si la conversación no existe', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      mockConversationService.getConversationById.mockResolvedValueOnce(null)

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Conversation not found')
    })

    it('debe formatear fechas correctamente', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const mockConversation = {
        id: conversationId,
        platform: 'whatsapp',
        messages: [
          {
            id: 'msg-1',
            direction: 'inbound',
            content: 'Test',
            message_type: 'text',
            sent_at: new Date('2024-01-01T10:00:00Z'),
          },
        ],
      }

      mockConversationService.getConversationById.mockResolvedValueOnce(
        mockConversation as any
      )

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages[0].sentAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO format
    })
  })

  describe('POST /api/conversations/[id]/messages', () => {
    it('debe enviar mensaje exitosamente desde conversación', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const mockConversation = {
        id: conversationId,
        platform: 'whatsapp',
        lead: {
          id: 'lead-123',
          telefono: '+5491155556789',
          email: 'test@example.com',
        },
        platformId: '+5491155556789',
      }

      mockConversationService.getConversationById.mockResolvedValueOnce(
        mockConversation as any
      )

      mockWhatsAppService.sendMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'wamid.test123',
        provider: 'manychat',
        channel: 'whatsapp',
      } as any)

      mockWhatsAppService.createMessage.mockResolvedValueOnce({
        id: 'msg-123',
        conversation_id: conversationId,
        direction: 'outbound',
        content: 'Test message',
        message_type: 'text',
        sent_at: new Date().toISOString(),
      } as any)

      mockConversationService.updateLastActivity.mockResolvedValueOnce(undefined)

      const requestBody = {
        message: 'Test message',
        messageType: 'text',
      }

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      const response = await POST(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message.id).toBe('msg-123')
      expect(mockWhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+5491155556789',
          message: 'Test message',
        })
      )
      expect(mockConversationService.updateLastActivity).toHaveBeenCalledWith(conversationId)
    })

    it('debe validar que el mensaje no esté vacío', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const requestBody = {
        message: '',
      }

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      const response = await POST(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('vacío')
    })

    it('debe validar longitud máxima del mensaje', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const longMessage = 'a'.repeat(4097)

      const requestBody = {
        message: longMessage,
      }

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      const response = await POST(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('demasiado largo')
    })

    it('debe retornar 400 si no se puede determinar destinatario', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const mockConversation = {
        id: conversationId,
        platform: 'whatsapp',
        lead: {
          id: 'lead-123',
          // Sin teléfono ni email
        },
        platformId: undefined,
      }

      mockConversationService.getConversationById.mockResolvedValueOnce(
        mockConversation as any
      )

      const requestBody = {
        message: 'Test message',
      }

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      const response = await POST(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('destinatario')
    })

    it('debe detectar canal desde platform de conversación', async () => {
      const mockSession = createMockSession()
      mockGetServerSession.mockResolvedValue(mockSession as any)
      mockCheckPermission.mockImplementation(() => {})

      const mockConversation = {
        id: conversationId,
        platform: 'instagram',
        lead: {
          id: 'lead-123',
          telefono: '+5491155556789',
          email: 'test@example.com',
        },
      }

      mockConversationService.getConversationById.mockResolvedValueOnce(
        mockConversation as any
      )

      mockWhatsAppService.sendMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'wamid.test123',
        provider: 'manychat',
        channel: 'instagram',
      } as any)

      mockWhatsAppService.createMessage.mockResolvedValueOnce({
        id: 'msg-123',
        conversation_id: conversationId,
        direction: 'outbound',
        content: 'Test message',
        message_type: 'text',
        sent_at: new Date().toISOString(),
      } as any)

      mockConversationService.updateLastActivity.mockResolvedValueOnce(undefined)

      const requestBody = {
        message: 'Test message',
      }

      const request = new NextRequest(
        `http://localhost:3000/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      const response = await POST(request, { params: { id: conversationId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.whatsappResult.channel).toBe('instagram')
    })
  })
})










