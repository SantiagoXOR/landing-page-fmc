import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getServerSession } from 'next-auth/next'
import { setupSupabaseFetchMocks, createMockFetchResponse, mockLeads } from '@/__tests__/mocks/supabase'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key'
// NODE_ENV is read-only, so we don't set it directly

const mockGetServerSession = vi.mocked(getServerSession)
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('/api/dashboard/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSupabaseFetchMocks(mockFetch)
    
    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  describe('GET /api/dashboard/metrics', () => {
    it('should return dashboard metrics successfully', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'ADMIN'
        }
      } as any)

      // Mock Supabase response with realistic data
      const mockMetricsData = [
        {
          id: 'lead-1',
          nombre: 'Juan Pérez',
          estado: 'NUEVO',
          createdAt: new Date().toISOString(),
          monto: 100000
        },
        {
          id: 'lead-2',
          nombre: 'María González',
          estado: 'PREAPROBADO',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          monto: 500000
        },
        {
          id: 'lead-3',
          nombre: 'Carlos López',
          estado: 'APROBADO',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          monto: 250000
        }
      ]

      mockFetch.mockResolvedValue(createMockFetchResponse(mockMetricsData))

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalLeads).toBe(3)
      expect(data.newLeadsToday).toBeDefined()
      expect(data.leadsThisWeek).toBeDefined()
      expect(data.leadsThisMonth).toBeDefined()
      expect(data.conversionRate).toBeDefined()
      expect(data.trendData).toBeDefined()
      expect(typeof data.totalLeads).toBe('number')
      expect(typeof data.conversionRate).toBe('number')
    })

    it('should calculate metrics correctly with empty data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', email: 'test@example.com', role: 'ADMIN' }
      } as any)

      mockFetch.mockResolvedValue(createMockFetchResponse([]))

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalLeads).toBe(0)
      expect(data.newLeadsToday).toBe(0)
      expect(data.leadsThisWeek).toBe(0)
      expect(data.leadsThisMonth).toBe(0)
      expect(data.conversionRate).toBe(0)
    })

    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)
      // Disable testing mode for this test
      delete process.env.TESTING_MODE

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('No autorizado')
      
      // Restore testing mode
      process.env.TESTING_MODE = 'true'
    })

    it('should handle Supabase errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' }
      } as any)

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({ error: 'Database error' }),
      text: vi.fn().mockResolvedValue('Internal Server Error'),
        headers: new Headers()
      })

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metrics')
    })

    it('should handle network errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' }
      } as any)

      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/dashboard/metrics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch metrics')
    })
  })

  it('should calculate metrics correctly for different time periods', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN' }
    } as any)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000)

    const mockLeads = [
      { id: '1', estado: 'NUEVO', createdAt: now.toISOString() }, // Today
      { id: '2', estado: 'PREAPROBADO', createdAt: today.toISOString() }, // Today
      { id: '3', estado: 'NUEVO', createdAt: yesterday.toISOString() }, // Yesterday (this week)
      { id: '4', estado: 'RECHAZADO', createdAt: lastWeek.toISOString() }, // Last week (not this week)
      { id: '5', estado: 'NUEVO', createdAt: lastMonth.toISOString() } // Last month (not this month)
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeads
    })

    const request = new NextRequest('http://localhost:3000/api/dashboard/metrics')

    const response = await GET(request)
    const data = await response.json()

    expect(data.totalLeads).toBe(5)
    expect(data.newLeadsToday).toBe(2) // Only leads from today
    expect(data.leadsThisWeek).toBe(3) // Today + yesterday
    expect(data.leadsThisMonth).toBe(4) // All except last month
    expect(data.conversionRate).toBe(20) // 1 preaprobado / 5 total * 100
  })

  it('should generate trend data for last 7 days', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', role: 'ADMIN' }
    } as any)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const mockLeads = [
      {
        id: '1',
        estado: 'NUEVO',
        createdAt: today.toISOString()
      },
      {
        id: '2',
        estado: 'PREAPROBADO',
        createdAt: today.toISOString()
      },
      {
        id: '3',
        estado: 'NUEVO',
        createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeads
    })

    const request = new NextRequest('http://localhost:3000/api/dashboard/metrics')

    const response = await GET(request)
    const data = await response.json()

    expect(data.trendData).toHaveLength(7)
    
    // Check today's data
    const todayData = data.trendData[6] // Last item should be today
    expect(todayData.leads).toBe(2)
    expect(todayData.conversions).toBe(1)
    
    // Check yesterday's data
    const yesterdayData = data.trendData[5]
    expect(yesterdayData.leads).toBe(1)
    expect(yesterdayData.conversions).toBe(0)
  })
})
