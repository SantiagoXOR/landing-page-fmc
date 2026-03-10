import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessagingService } from '../messaging-service'
import { WhatsAppService } from '../whatsapp-service'
import type { SendMessageParams } from '@/types/messaging'

vi.mock('../whatsapp-service')
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

const MockedWhatsAppService = vi.mocked(WhatsAppService)

describe('MessagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    MockedWhatsAppService.isConfigured.mockReturnValue(true)
  })

  describe('sendMessage', () => {
    it('debe enviar mensaje de texto por WhatsApp exitosamente', async () => {
      MockedWhatsAppService.sendMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'wamid.test123',
        provider: 'whatsapp',
      } as any)

      const params: SendMessageParams = {
        to: { phone: '+5491155556789' },
        message: 'Test message',
        messageType: 'text',
        channel: 'whatsapp',
      }

      const result = await MessagingService.sendMessage(params)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('wamid.test123')
      expect(result.channel).toBe('whatsapp')
      expect(MockedWhatsAppService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+5491155556789',
          message: 'Test message',
          messageType: 'text',
        })
      )
    })

    it('debe devolver error cuando WhatsApp no está configurado', async () => {
      MockedWhatsAppService.isConfigured.mockReturnValue(false)

      const result = await MessagingService.sendMessage({
        to: { phone: '+5491155556789' },
        message: 'Test',
        channel: 'whatsapp',
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('CHANNEL_UNAVAILABLE')
      expect(MockedWhatsAppService.sendMessage).not.toHaveBeenCalled()
    })

    it('debe devolver error para canal no whatsapp', async () => {
      const result = await MessagingService.sendMessage({
        to: { email: 'test@example.com' },
        message: 'Test',
        channel: 'instagram',
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('CHANNEL_UNAVAILABLE')
      expect(MockedWhatsAppService.sendMessage).not.toHaveBeenCalled()
    })

    it('debe validar parámetros (teléfono requerido para WhatsApp)', async () => {
      const result = await MessagingService.sendMessage({
        to: {},
        message: 'Test',
        channel: 'whatsapp',
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('SUBSCRIBER_NOT_FOUND')
    })
  })
})
