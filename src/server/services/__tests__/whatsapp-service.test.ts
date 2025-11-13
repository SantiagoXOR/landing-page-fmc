import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WhatsAppService } from '../whatsapp-service'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WhatsAppService', () => {
  let service: WhatsAppService
  
  beforeEach(() => {
    // Reset mocks
    mockFetch.mockReset()
    
    // Mock environment variables
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-access-token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'
    
    service = new WhatsAppService()
  })

  describe('sendTextMessage', () => {
    it('should send a text message successfully', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '5491155556789', wa_id: '5491155556789' }],
        messages: [{ id: 'wamid.test123' }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.sendTextMessage('5491155556789', 'Hello, this is a test message')

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test-phone-id/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '5491155556789',
            type: 'text',
            text: {
              body: 'Hello, this is a test message'
            }
          })
        })
      )
    })

    it('should normalize phone numbers correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'test' }] })
      })

      // Test different phone number formats
      await service.sendTextMessage('+54 11 5555-6789', 'Test')
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.to).toBe('541155556789') // Normalized without 9
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid phone number'
      })

      await expect(
        service.sendTextMessage('invalid', 'Test message')
      ).rejects.toThrow('WhatsApp API error: 400 - Invalid phone number')
    })
  })

  describe('sendTemplateMessage', () => {
    it('should send a template message successfully', async () => {
      const mockResponse = {
        messaging_product: 'whatsapp',
        contacts: [{ input: '5491155556789', wa_id: '5491155556789' }],
        messages: [{ id: 'wamid.template123' }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await service.sendTemplateMessage(
        '5491155556789',
        'bienvenida_phorencial',
        'es',
        ['Juan Pérez']
      )

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/test-phone-id/messages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '5491155556789',
            type: 'template',
            template: {
              name: 'bienvenida_phorencial',
              language: {
                code: 'es'
              },
              components: [{
                type: 'body',
                parameters: [{
                  type: 'text',
                  text: 'Juan Pérez'
                }]
              }]
            }
          })
        })
      )
    })

    it('should send template without parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'test' }] })
      })

      await service.sendTemplateMessage('5491155556789', 'simple_template')

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.template.components).toBeUndefined()
    })
  })

  describe('normalizePhoneNumber', () => {
    it('should normalize different phone number formats', () => {
      const testCases = [
        { input: '+54 11 5555-6789', expected: '541155556789' },
        { input: '54 11 5555 6789', expected: '541155556789' },
        { input: '11 5555 6789', expected: '541155556789' },
        { input: '1155556789', expected: '541155556789' },
        { input: '549 11 5555 6789', expected: '541155556789' },
        { input: '5491155556789', expected: '541155556789' }
      ]

      testCases.forEach(({ input, expected }) => {
        // Access private method through any
        const normalized = (service as any).normalizePhoneNumber(input)
        expect(normalized).toBe(expected)
      })
    })
  })

  describe('isConfigured', () => {
    it('should return true when properly configured', () => {
      expect(service.isConfigured()).toBe(true)
    })

    it('should return false when missing credentials', () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN
      const unconfiguredService = new WhatsAppService()
      expect(unconfiguredService.isConfigured()).toBe(false)
    })
  })

  describe('getConfig', () => {
    it('should return configuration info without sensitive data', () => {
      const config = service.getConfig()
      
      expect(config).toEqual({
        configured: true,
        phoneNumberId: '***e-id', // Last 4 chars of 'test-phone-id'
        hasAccessToken: true
      })
    })
  })

  describe('sendMessage with missing credentials', () => {
    it('should return null when not configured', async () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN
      const unconfiguredService = new WhatsAppService()
      
      const result = await unconfiguredService.sendTextMessage('123', 'test')
      expect(result).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        service.sendTextMessage('5491155556789', 'Test')
      ).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      await expect(
        service.sendTextMessage('5491155556789', 'Test')
      ).rejects.toThrow('Invalid JSON')
    })
  })
})
