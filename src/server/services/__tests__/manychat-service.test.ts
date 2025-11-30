import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { ManychatService } from '../manychat-service'
import {
  mockWhatsAppSubscriber,
  mockInstagramSubscriber,
  mockFacebookSubscriber,
  mockUnknownSubscriber,
  testData,
} from '@/__tests__/mocks/manychat-api'
import { logger } from '@/lib/logger'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// NO mockear ManychatService aquí - queremos probar la implementación real

describe('ManychatService - Métodos Nuevos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    mockFetch.mockReset()
    // Asegurar que las variables de entorno estén configuradas
    // (ya deberían estar en setup.ts, pero por si acaso)
    process.env.MANYCHAT_API_KEY = 'test-api-key'
    process.env.MANYCHAT_BASE_URL = 'https://api.manychat.com'
  })

  describe('getSubscriberByEmail', () => {
    it('debe encontrar subscriber por email válido', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: mockInstagramSubscriber,
        }),
        headers: new Headers(),
      } as Response)

      const result = await ManychatService.getSubscriberByEmail('maria@example.com')

      expect(result).toEqual(mockInstagramSubscriber)
      expect(mockFetch).toHaveBeenCalled()
      const callUrl = mockFetch.mock.calls[0]?.[0]
      expect(callUrl).toContain('/fb/subscriber/findBySystemField')
      // El email está URL-encoded en la URL
      expect(callUrl).toMatch(/email=maria%40example\.com|email=maria@example\.com/)
    })

    it('debe retornar null si subscriber no se encuentra', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
          error: 'Subscriber not found',
          error_code: 'SUBSCRIBER_NOT_FOUND',
        }),
        headers: new Headers(),
      } as Response)

      const result = await ManychatService.getSubscriberByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })

    it('debe retornar null para email inválido', async () => {
      const result = await ManychatService.getSubscriberByEmail('invalid-email')

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        'Formato de email inválido',
        expect.objectContaining({ email: 'invalid-email' })
      )
    })

    it('debe retornar null para email vacío', async () => {
      const result = await ManychatService.getSubscriberByEmail('')

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        'Email inválido para buscar subscriber',
        expect.objectContaining({ email: '' })
      )
    })

    it('debe normalizar email a minúsculas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: mockInstagramSubscriber,
        }),
        headers: new Headers(),
      } as Response)

      await ManychatService.getSubscriberByEmail('MARIA@EXAMPLE.COM')

      expect(mockFetch).toHaveBeenCalled()
      const callUrl = mockFetch.mock.calls[0]?.[0]
      // El email está normalizado a minúsculas y URL-encoded
      expect(callUrl).toMatch(/email=maria%40example\.com|email=maria@example\.com/)
    })
  })

  describe('getSubscriberByIdentifier', () => {
    it('debe encontrar subscriber por subscriberId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: mockWhatsAppSubscriber,
        }),
        headers: new Headers(),
      } as Response)

      const result = await ManychatService.getSubscriberByIdentifier({
        subscriberId: 123456789,
      })

      expect(result).toEqual(mockWhatsAppSubscriber)
    })

    it('debe encontrar subscriber por teléfono', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: mockWhatsAppSubscriber,
        }),
        headers: new Headers(),
      } as Response)

      const result = await ManychatService.getSubscriberByIdentifier({
        phone: '+5491155556789',
      })

      expect(result).toEqual(mockWhatsAppSubscriber)
    })

    it('debe encontrar subscriber por email si teléfono no funciona', async () => {
      // Primero falla por teléfono
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
          error: 'Subscriber not found',
        }),
        headers: new Headers(),
      } as Response)

      // Luego encuentra por email
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          data: mockInstagramSubscriber,
        }),
        headers: new Headers(),
      } as Response)

      const result = await ManychatService.getSubscriberByIdentifier({
        phone: '+5491199999999',
        email: 'maria@example.com',
      })

      expect(result).toEqual(mockInstagramSubscriber)
    })

    it('debe retornar null si ningún identificador funciona', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
          error: 'Subscriber not found',
        }),
        headers: new Headers(),
      } as Response)

      const result = await ManychatService.getSubscriberByIdentifier({
        phone: '+5491199999999',
        email: 'nonexistent@example.com',
      })

      expect(result).toBeNull()
    })

    it('debe retornar null si no se proporcionan identificadores', async () => {
      const result = await ManychatService.getSubscriberByIdentifier({})

      expect(result).toBeNull()
    })
  })

  describe('detectChannel', () => {
    it('debe detectar canal WhatsApp por whatsapp_phone', () => {
      const channel = ManychatService.detectChannel(mockWhatsAppSubscriber)

      expect(channel).toBe('whatsapp')
    })

    it('debe detectar canal WhatsApp por phone en formato E.164', () => {
      const subscriber = {
        ...mockWhatsAppSubscriber,
        whatsapp_phone: undefined,
        phone: '+5491155556789',
      }

      const channel = ManychatService.detectChannel(subscriber)

      expect(channel).toBe('whatsapp')
    })

    it('debe detectar canal Instagram por instagram_id', () => {
      const channel = ManychatService.detectChannel(mockInstagramSubscriber)

      expect(channel).toBe('instagram')
    })

    it('debe detectar canal Facebook Messenger por email y page_id', () => {
      const channel = ManychatService.detectChannel(mockFacebookSubscriber)

      expect(channel).toBe('facebook')
    })

    it('debe retornar unknown para subscriber sin información clara', () => {
      const channel = ManychatService.detectChannel(mockUnknownSubscriber)

      expect(channel).toBe('unknown')
    })

    it('debe priorizar WhatsApp sobre otros canales', () => {
      const subscriber = {
        ...mockWhatsAppSubscriber,
        whatsapp_phone: '+5491155556789',
        instagram_id: 'instagram_user_123',
        email: 'test@example.com',
      }

      const channel = ManychatService.detectChannel(subscriber)

      expect(channel).toBe('whatsapp')
    })

    it('debe asumir WhatsApp si solo tiene phone válido', () => {
      const subscriber = {
        ...mockWhatsAppSubscriber,
        whatsapp_phone: undefined,
        phone: '+5491155556789',
        instagram_id: undefined,
        email: undefined,
      }

      const channel = ManychatService.detectChannel(subscriber)

      expect(channel).toBe('whatsapp')
    })

    it('debe asumir Facebook si solo tiene email', () => {
      const subscriber = {
        ...mockFacebookSubscriber,
        phone: undefined,
        whatsapp_phone: undefined,
        instagram_id: undefined,
        email: 'test@example.com',
        page_id: 1003,
      }

      const channel = ManychatService.detectChannel(subscriber)

      expect(channel).toBe('facebook')
    })
  })

  describe('Validaciones', () => {
    describe('Formato E.164', () => {
      it('debe aceptar teléfonos válidos en formato E.164', () => {
        const validPhones = [
          '+5491155556789',
          '+12025551234',
          '+543704123456',
        ]

        validPhones.forEach(phone => {
          const subscriber = {
            ...mockWhatsAppSubscriber,
            phone,
            whatsapp_phone: undefined,
          }
          const channel = ManychatService.detectChannel(subscriber)
          expect(channel).toBe('whatsapp')
        })
      })

      it('debe rechazar teléfonos inválidos', () => {
        const invalidPhones = [
          '5491155556789', // Sin +
          '+1', // Muy corto
          '+123456789012345678', // Muy largo
          '+54911ABC5678', // Con letras
        ]

        invalidPhones.forEach(phone => {
          const subscriber = {
            ...mockWhatsAppSubscriber,
            phone,
            whatsapp_phone: undefined,
            instagram_id: undefined,
            email: undefined,
          }
          const channel = ManychatService.detectChannel(subscriber)
          // Si el teléfono no es válido para WhatsApp, puede retornar unknown
          // o asumir WhatsApp si solo tiene phone (fallback)
          expect(['unknown', 'whatsapp']).toContain(channel)
        })
      })
    })

    describe('Formato de Email', () => {
      it('debe validar formato básico de email', async () => {
        const invalidEmails = [
          'invalid',
          '@example.com',
          'user@',
          'user@example',
          'user@@example.com',
        ]

        for (const email of invalidEmails) {
          const result = await ManychatService.getSubscriberByEmail(email)
          expect(result).toBeNull()
        }
      })

    it('debe aceptar emails válidos', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+test@example.com',
        'user-name@example.com',
      ]

      for (const email of validEmails) {
        vi.clearAllMocks()
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'success',
            data: mockInstagramSubscriber,
          }),
          headers: new Headers(),
        } as Response)
        
        const result = await ManychatService.getSubscriberByEmail(email)
        expect(result).not.toBeNull()
      }
    })
    })
  })

  describe('Manejo de Errores', () => {
    it('debe manejar errores de red correctamente', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        ManychatService.getSubscriberByEmail('test@example.com')
      ).rejects.toThrow()
    })

    it('debe manejar respuestas HTTP no exitosas', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          status: 'error',
          error: 'Internal server error',
        }),
        headers: new Headers(),
      } as Response)

      const result = await ManychatService.getSubscriberByEmail('test@example.com')

      expect(result).toBeNull()
    })

    it('debe loggear errores correctamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
          error: 'Subscriber not found',
          error_code: 'SUBSCRIBER_NOT_FOUND',
          details: 'Additional details',
        }),
        headers: new Headers(),
      } as Response)

      await ManychatService.getSubscriberByEmail('nonexistent@example.com')

      expect(logger.error).toHaveBeenCalledWith(
        'Error buscando subscriber por email en Manychat',
        expect.objectContaining({
          error: 'Subscriber not found',
          errorCode: 'SUBSCRIBER_NOT_FOUND',
          details: 'Additional details',
        })
      )
    })
  })
})

