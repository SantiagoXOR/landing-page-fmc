import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { POST, GET } from '../route'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { hasPermission, checkUserPermission } from '@/lib/rbac'
import { createMockSupabaseLeadService, mockLeads } from '@/__tests__/mocks/supabase'

// Mock next-auth/next (la ruta importa desde aquí)
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

// Mock del singleton supabaseLeadService (la ruta usa supabaseLeadService.createLead / getLeads)
vi.mock('@/server/services/supabase-lead-service', () => ({
  SupabaseLeadService: vi.fn(),
  supabaseLeadService: {
    createLead: vi.fn(),
    getLeads: vi.fn(),
    getLeadById: vi.fn(),
    updateLead: vi.fn(),
    deleteLead: vi.fn(),
    findLeadByPhone: vi.fn(),
  },
}))

vi.mock('@/lib/rbac', () => ({
  hasPermission: vi.fn(),
  checkUserPermission: vi.fn(),
}))

vi.mock('@/server/services/pipeline-service', () => ({
  pipelineService: {
    createLeadPipeline: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/server/services/scoring-service', () => ({
  ScoringService: {
    evaluateLead: vi.fn().mockResolvedValue({ total_score: 0, recommendation: 'NUEVO' }),
  },
}))

// GET /api/leads usa supabaseClient de @/lib/db (dynamic import), no supabaseLeadService.getLeads
const mockLeadsForGet = [
  { id: 'lead-1', nombre: 'Juan Pérez', telefono: '3704123456', estado: 'NUEVO', createdAt: new Date().toISOString() },
  { id: 'lead-2', nombre: 'María González', telefono: '3705987654', estado: 'PREAPROBADO', createdAt: new Date().toISOString() },
]
const thenable = {
  then: (resolve: (v: any) => void) => resolve({ data: mockLeadsForGet, count: mockLeadsForGet.length, error: null }),
  order: function () { return thenable },
  limit: function () { return thenable },
  range: function () { return thenable },
  eq: function () { return thenable },
  gte: function () { return thenable },
  lte: function () { return thenable },
  or: function () { return thenable },
  ilike: function () { return thenable },
}
vi.mock('@/lib/db', () => ({
  supabase: {},
  supabaseClient: {
    from: () => ({ select: () => thenable }),
  },
}))

const mockGetServerSession = vi.mocked(getServerSession)
const mockHasPermission = vi.mocked(hasPermission)
const mockCheckUserPermission = vi.mocked(checkUserPermission)

describe('/api/leads', () => {
  let mockLeadService: ReturnType<typeof createMockSupabaseLeadService>

  beforeEach(() => {
    vi.clearAllMocks()
    mockLeadService = createMockSupabaseLeadService()
    vi.mocked(supabaseLeadService.createLead).mockImplementation(mockLeadService.createLead as any)
    vi.mocked(supabaseLeadService.getLeads).mockImplementation(mockLeadService.getLeads as any)
    vi.mocked(supabaseLeadService.updateLead).mockImplementation(mockLeadService.updateLead as any)
  })

  describe('POST /api/leads', () => {
    it('should create a new lead successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'ADMIN' }
      } as any)
      mockCheckUserPermission.mockResolvedValue(true)

      const leadData = {
        nombre: 'Juan Pérez',
        telefono: '37041234567',
        email: 'lead@example.com',
        ingresos: 50000,
        zona: 'Formosa Capital',
        producto: 'Préstamo Personal',
        monto: 100000,
        origen: 'whatsapp'
      }

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.estado).toBeDefined()
      expect(supabaseLeadService.createLead).toHaveBeenCalledWith(expect.objectContaining({
        nombre: leadData.nombre,
        telefono: expect.any(String),
        origen: leadData.origen
      }))
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const prev = process.env.TESTING_MODE
      process.env.TESTING_MODE = 'false'

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Juan Pérez', telefono: '37041234567' })
      })

      const response = await POST(request)
      const data = await response.json()

      process.env.TESTING_MODE = prev
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 when user lacks permissions', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'VIEWER' }
      } as any)
      mockCheckUserPermission.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Juan Pérez', telefono: '37041234567' })
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
      mockCheckUserPermission.mockResolvedValue(true)

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
      expect(data.page).toBeDefined()
      expect(data.limit).toBeDefined()
    })

    it('should handle search filters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'ADMIN' }
      } as any)
      mockHasPermission.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/leads?q=Juan&estado=NUEVO&page=1&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.leads).toBeDefined()
      expect(data.filters).toBeDefined()
      expect(data.filters.hasSearch).toBe(true)
    })

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const prev = process.env.TESTING_MODE
      process.env.TESTING_MODE = 'false'

      const request = new NextRequest('http://localhost:3000/api/leads')
      const response = await GET(request)
      const data = await response.json()

      process.env.TESTING_MODE = prev
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
      expect(data.page).toBe(2)
      expect(data.limit).toBe(5)
      expect(data.leads).toBeDefined()
    })
  })
})
