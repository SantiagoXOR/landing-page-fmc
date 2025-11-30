import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessagingService } from '../messaging-service'
import { ManychatService } from '../manychat-service'
import {
  mockWhatsAppSubscriber,
  mockInstagramSubscriber,
  mockFacebookSubscriber,
  mockUnknownSubscriber,
  createMockSuccessResponse,
  createMockErrorResponse,
  testData,
} from '@/__tests__/mocks/manychat-api'
import {
  createValidSendParams,
  validateSendResponse,
} from '@/__tests__/helpers/messaging-test-helpers'
import { ManychatSendMessageParams } from '@/types/manychat'

// Mock ManychatService
vi.mock('../manychat-service')
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

const MockedManychatService = vi.mocked(ManychatService)

describe('MessagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    describe('Envío exitoso', () => {
      it('debe enviar mensaje de texto exitosamente', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.test123')
        )

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
          messageType: 'text',
          channel: 'auto',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(true)
        expect(result.messageId).toBe('wamid.test123')
        expect(result.channel).toBe('whatsapp')
        expect(result.subscriberId).toBe(mockWhatsAppSubscriber.id)
      })

      it('debe enviar mensaje con imagen exitosamente', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.image123')
        )

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Check this image',
          messageType: 'image',
          mediaUrl: 'https://example.com/image.jpg',
          caption: 'Check this image',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(true)
        expect(MockedManychatService.sendMessage).toHaveBeenCalledWith(
          expect.any(Number),
          expect.arrayContaining([
            expect.objectContaining({
              type: 'image',
              url: 'https://example.com/image.jpg',
              caption: 'Check this image',
            }),
          ]),
          undefined
        )
      })

      it('debe enviar mensaje con archivo exitosamente', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.file123')
        )

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Document attached',
          messageType: 'file',
          mediaUrl: 'https://example.com/document.pdf',
          filename: 'document.pdf',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(true)
        expect(MockedManychatService.sendMessage).toHaveBeenCalledWith(
          expect.any(Number),
          expect.arrayContaining([
            expect.objectContaining({
              type: 'file',
              url: 'https://example.com/document.pdf',
              filename: 'document.pdf',
            }),
          ]),
          undefined
        )
      })

      it('debe detectar canal automáticamente cuando es "auto"', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockInstagramSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('instagram')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.insta123')
        )

        const params: ManychatSendMessageParams = {
          to: { email: 'maria@example.com' },
          message: 'Test message',
          channel: 'auto',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.channel).toBe('instagram')
        expect(MockedManychatService.detectChannel).toHaveBeenCalled()
      })
    })

    describe('Validaciones', () => {
      it('debe validar que haya al menos un identificador', async () => {
        const params: ManychatSendMessageParams = {
          to: {},
          message: 'Test message',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('SUBSCRIBER_NOT_FOUND')
        expect(result.error).toContain('al menos un identificador')
      })

      it('debe validar formato de teléfono', async () => {
        const params: ManychatSendMessageParams = {
          to: { phone: 'invalid-phone' },
          message: 'Test message',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('INVALID_PHONE')
      })

      it('debe validar formato de email', async () => {
        const params: ManychatSendMessageParams = {
          to: { email: 'invalid-email' },
          message: 'Test message',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('INVALID_EMAIL')
      })

      it('debe validar que el mensaje no esté vacío', async () => {
        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: '',
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('MESSAGE_TOO_LONG')
        expect(result.error).toContain('vacío')
      })

      it('debe validar longitud máxima del mensaje', async () => {
        const longMessage = 'a'.repeat(4097)

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: longMessage,
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('MESSAGE_TOO_LONG')
        expect(result.error).toContain('demasiado largo')
      })

      it('debe validar que si hay mediaUrl, haya messageType adecuado', async () => {
        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
          mediaUrl: 'https://example.com/image.jpg',
          messageType: 'text', // Tipo incorrecto para media
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('UNSUPPORTED_MESSAGE_TYPE')
      })
    })

    describe('Manejo de Errores', () => {
      it('debe manejar subscriber no encontrado', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(null)

        const params = createValidSendParams()

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('SUBSCRIBER_NOT_FOUND')
        expect(result.error).toContain('Contacto no encontrado')
      })

      it('debe manejar canal desconocido', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockUnknownSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('unknown')

        const params = createValidSendParams()

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe('CHANNEL_UNAVAILABLE')
        expect(result.channel).toBe('unknown')
      })

      it('debe manejar errores de ManyChat API', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockErrorResponse('Error sending message', 'SEND_ERROR')
        )

        const params = createValidSendParams()

        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('debe usar canal detectado si el especificado difiere', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.test123')
        )

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
          channel: 'instagram', // Especifica Instagram pero detecta WhatsApp
        }

        const result = await MessagingService.sendMessage(params)

        // Debe usar WhatsApp (detectado) en lugar de Instagram (especificado)
        expect(result.channel).toBe('whatsapp')
      })
    })

    describe('Construcción de Mensajes', () => {
      it('debe construir mensaje de texto correctamente', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.test123')
        )

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Hello, world!',
          messageType: 'text',
        }

        await MessagingService.sendMessage(params)

        expect(MockedManychatService.sendMessage).toHaveBeenCalledWith(
          expect.any(Number),
          [
            {
              type: 'text',
              text: 'Hello, world!',
            },
          ],
          undefined
        )
      })

      it('debe construir mensaje con imagen y caption', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.image123')
        )

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Check this out',
          messageType: 'image',
          mediaUrl: 'https://example.com/image.jpg',
          caption: 'Check this out',
        }

        await MessagingService.sendMessage(params)

        expect(MockedManychatService.sendMessage).toHaveBeenCalledWith(
          expect.any(Number),
          [
            {
              type: 'image',
              url: 'https://example.com/image.jpg',
              caption: 'Check this out',
            },
          ],
          undefined
        )
      })

      it('debe construir mensaje con archivo y texto separado', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.file123')
        )

        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Please review this document',
          messageType: 'file',
          mediaUrl: 'https://example.com/document.pdf',
          filename: 'document.pdf',
        }

        await MessagingService.sendMessage(params)

        expect(MockedManychatService.sendMessage).toHaveBeenCalledWith(
          expect.any(Number),
          expect.arrayContaining([
            expect.objectContaining({
              type: 'file',
              url: 'https://example.com/document.pdf',
              filename: 'document.pdf',
            }),
            expect.objectContaining({
              type: 'text',
              text: 'Please review this document',
            }),
          ]),
          undefined
        )
      })

      it('debe hacer fallback a texto si hay mediaUrl pero no es tipo válido', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.test123')
        )

        // Este caso no debería pasar validación, pero si pasa, debe manejar bien
        const params: ManychatSendMessageParams = {
          to: { phone: '+5491155556789' },
          message: 'Test message',
          messageType: 'text',
          mediaUrl: 'https://example.com/image.jpg', // mediaUrl sin messageType adecuado
        }

        // Debería fallar en validación
        const result = await MessagingService.sendMessage(params)

        expect(result.success).toBe(false)
      })
    })

    describe('Diferentes Canales', () => {
      it('debe enviar mensaje a WhatsApp correctamente', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValueOnce('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.wa123')
        )

        const params = createValidSendParams({ to: { phone: '+5491155556789' } })

        const result = await MessagingService.sendMessage(params)

        expect(result.channel).toBe('whatsapp')
        expect(result.success).toBe(true)
      })

      it('debe enviar mensaje a Instagram correctamente', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockInstagramSubscriber
        )
        // Mock detectChannel para que retorne 'instagram'
        MockedManychatService.detectChannel.mockReturnValueOnce('instagram')
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.insta123')
        )

        const params: ManychatSendMessageParams = {
          to: { email: 'maria@example.com' },
          message: 'Test message',
          channel: 'auto', // Auto detect
        }

        const result = await MessagingService.sendMessage(params)

        expect(result.channel).toBe('instagram')
        expect(result.success).toBe(true)
      })

      it('debe enviar mensaje a Facebook Messenger correctamente', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValueOnce(
          mockFacebookSubscriber
        )
        // Mock detectChannel para que retorne 'facebook' basado en el subscriber
        MockedManychatService.detectChannel.mockImplementation((subscriber) => {
          if (subscriber.page_id && subscriber.email) return 'facebook'
          return 'unknown'
        })
        MockedManychatService.sendMessage.mockResolvedValueOnce(
          createMockSuccessResponse('wamid.fb123')
        )

        const params = createValidSendParams({ to: { email: 'carlos@example.com' } })

        const result = await MessagingService.sendMessage(params)

        expect(result.channel).toBe('facebook')
        expect(result.success).toBe(true)
      })
    })

    describe('Rate Limiting', () => {
      it('debe respetar rate limiting de ManyChat', async () => {
        MockedManychatService.getSubscriberByIdentifier.mockResolvedValue(
          mockWhatsAppSubscriber
        )
        MockedManychatService.detectChannel.mockReturnValue('whatsapp')
        MockedManychatService.sendMessage.mockResolvedValue(
          createMockSuccessResponse('wamid.test123')
        )

        const params = createValidSendParams()

        // Enviar múltiples mensajes
        const promises = Array.from({ length: 5 }, () =>
          MessagingService.sendMessage(params)
        )

        const results = await Promise.all(promises)

        // Todos deben ser exitosos, pero ManychatService maneja el rate limiting
        results.forEach(result => {
          expect(result.success).toBe(true)
        })

        // Verificar que se llamó a sendMessage múltiples veces
        expect(MockedManychatService.sendMessage).toHaveBeenCalledTimes(5)
      })
    })
  })
})

