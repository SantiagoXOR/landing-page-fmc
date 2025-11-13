import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SupabaseLeadService } from '../supabase-lead-service'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SupabaseLeadService', () => {
  let service: SupabaseLeadService
  
  beforeEach(() => {
    // Reset mocks
    mockFetch.mockReset()
    
    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    
    service = new SupabaseLeadService()
  })

  describe('createLead', () => {
    it('should create a lead successfully', async () => {
      const mockLead = {
        id: 'test-uuid',
        nombre: 'Test Lead',
        telefono: '1234567890',
        email: 'test@example.com',
        estado: 'NUEVO',
        createdAt: '2025-08-24T18:00:00.000Z',
        updatedAt: '2025-08-24T18:00:00.000Z'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockLead]
      })

      const leadData = {
        nombre: 'Test Lead',
        telefono: '1234567890',
        email: 'test@example.com'
      }

      const result = await service.createLead(leadData)

      expect(result).toEqual(mockLead)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/Lead',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'apikey': 'test-service-key',
            'Authorization': 'Bearer test-service-key',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }),
          body: expect.stringContaining('"nombre":"Test Lead"')
        })
      )
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      })

      const leadData = {
        nombre: 'Test Lead',
        telefono: '1234567890'
      }

      await expect(service.createLead(leadData)).rejects.toThrow('Supabase API error: 400 - Bad Request')
    })

    it('should clean null and undefined values', async () => {
      const mockLead = {
        id: 'test-uuid',
        nombre: 'Test Lead',
        telefono: '1234567890',
        estado: 'NUEVO'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockLead]
      })

      const leadData = {
        nombre: 'Test Lead',
        telefono: '1234567890',
        email: null,
        dni: undefined,
        zona: ''
      }

      await service.createLead(leadData)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody).not.toHaveProperty('email')
      expect(callBody).not.toHaveProperty('dni')
      expect(callBody).not.toHaveProperty('zona')
    })
  })

  describe('getLeads', () => {
    it('should fetch leads with filters', async () => {
      const mockLeads = [
        { id: '1', nombre: 'Lead 1', telefono: '111', estado: 'NUEVO' },
        { id: '2', nombre: 'Lead 2', telefono: '222', estado: 'EN_REVISION' }
      ]

      // Mock leads response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeads
      })

      // Mock count response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ count: 2 }]
      })

      const filters = {
        estado: 'NUEVO',
        limit: 10,
        offset: 0
      }

      const result = await service.getLeads(filters)

      expect(result.leads).toEqual(mockLeads)
      expect(result.total).toBe(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should build correct query string with filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      })

      const filters = {
        estado: 'NUEVO',
        origen: 'whatsapp',
        search: 'test',
        limit: 5,
        offset: 10
      }

      await service.getLeads(filters)

      const firstCall = mockFetch.mock.calls[0]
      const url = firstCall[0]
      
      expect(url).toContain('estado.eq.NUEVO')
      expect(url).toContain('origen.eq.whatsapp')
      expect(url).toContain('or=(nombre.ilike.*test*,telefono.ilike.*test*,email.ilike.*test*)')
      expect(url).toContain('limit=5')
      expect(url).toContain('offset=10')
      expect(url).toContain('order=createdAt.desc')
    })
  })

  describe('getLeadById', () => {
    it('should fetch a lead by ID', async () => {
      const mockLead = {
        id: 'test-id',
        nombre: 'Test Lead',
        telefono: '1234567890'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockLead]
      })

      const result = await service.getLeadById('test-id')

      expect(result).toEqual(mockLead)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/Lead?id=eq.test-id&select=*',
        expect.any(Object)
      )
    })

    it('should return null if lead not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      const result = await service.getLeadById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateLead', () => {
    it('should update a lead successfully', async () => {
      const mockUpdatedLead = {
        id: 'test-id',
        nombre: 'Updated Lead',
        telefono: '1234567890',
        updatedAt: '2025-08-24T18:30:00.000Z'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockUpdatedLead]
      })

      const updates = {
        nombre: 'Updated Lead'
      }

      const result = await service.updateLead('test-id', updates)

      expect(result).toEqual(mockUpdatedLead)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/Lead?id=eq.test-id',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Prefer': 'return=representation'
          })
        })
      )
    })
  })

  describe('findLeadByPhone', () => {
    it('should find a lead by phone number', async () => {
      const mockLead = {
        id: 'test-id',
        nombre: 'Test Lead',
        telefono: '1234567890'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockLead]
      })

      const result = await service.findLeadByPhone('1234567890')

      expect(result).toEqual(mockLead)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/rest/v1/Lead?telefono=eq.1234567890&select=*',
        expect.any(Object)
      )
    })
  })

  describe('constructor', () => {
    it('should throw error if credentials are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      expect(() => new SupabaseLeadService()).toThrow('Supabase credentials not configured')
    })
  })
})
