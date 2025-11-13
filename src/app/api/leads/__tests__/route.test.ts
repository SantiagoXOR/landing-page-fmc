import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { POST, GET } from '../route'
import { SupabaseLeadService } from '@/server/services/supabase-lead-service'
import { hasPermission } from '@/lib/rbac'
import { createMockSupabaseLeadService, mockLeads } from '@/__tests__/mocks/supabase'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/server/services/supabase-lead-service', () => ({
  SupabaseLeadService: vi.fn(),
}))

vi.mock('@/lib/rbac', () => ({
  hasPermission: vi.fn(),
}))

const mockGetServerSession = vi.mocked(getServerSession)
const mockHasPermission = vi.mocked(hasPermission)
const mockSupabaseLeadService = vi.mocked(SupabaseLeadService)

describe('/api/leads', () => {
  let mockLeadService: ReturnType<typeof createMockSupabaseLeadService>

  beforeEach(() => {
    vi.clearAllMocks()
    mockLeadService = createMockSupabaseLeadService()
    mockSupabaseLeadService.mockImplementation(() => mockLeadService as any)
  })

  describe('POST /api/leads', () => {
    it('should create a new lead successfully', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'ADMIN'
        }
      } as any)

      // Mock permissions
      mockHasPermission.mockReturnValue(true)

      const leadData = {
        nombre: 'Test Lead',
        telefono: '1234567890',
        email: 'lead@example.com',
        dni: '12345678',
        ingresos: 50000,
        zona: 'Centro',
        producto: 'Préstamo Personal',
        monto: 100000,
        origen: 'whatsapp'
      }

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.estado).toBe('NUEVO')
      expect(mockLeadService.createLead).toHaveBeenCalledWith(expect.objectContaining(leadData))
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 when user lacks permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'VIEWER' }
      } as any)

      mockHasPermission.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 400 for invalid data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'ADMIN' }
      } as any)

      mockHasPermission.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          nombre: ''
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /api/leads', () => {
    it('should return leads successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'ADMIN' }
      } as any)

      mockHasPermission.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/leads')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leads).toBeDefined()
      expect(Array.isArray(data.leads)).toBe(true)
      expect(data.total).toBeDefined()
      expect(mockLeadService.getLeads).toHaveBeenCalled()
    })

    it('should handle search filters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'ADMIN' }
      } as any)

      mockHasPermission.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/leads?search=Juan&estado=NUEVO&page=1&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leads).toBeDefined()
      expect(mockLeadService.getLeads).toHaveBeenCalledWith(expect.objectContaining({
        search: 'Juan',
        estado: 'NUEVO',
        offset: 0,
        limit: 10
      }))
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/leads')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 when user lacks permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'VIEWER' }
      } as any)

      mockHasPermission.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/leads')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should handle pagination correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'ADMIN' }
      } as any)

      mockHasPermission.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/leads?page=2&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockLeadService.getLeads).toHaveBeenCalledWith(expect.objectContaining({
        offset: 5,
        limit: 5
      }))
    })
  })
})
