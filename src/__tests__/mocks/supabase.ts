import { vi } from 'vitest'

// Mock data for testing
export const mockLeads = [
  {
    id: 'lead-1',
    nombre: 'Juan Pérez',
    telefono: '3704123456',
    email: 'juan@example.com',
    dni: '12345678',
    ingresos: 50000,
    zona: 'Centro',
    producto: 'Préstamo Personal',
    monto: 100000,
    origen: 'whatsapp',
    estado: 'NUEVO',
    agencia: 'Formosa Centro',
    notas: 'Cliente interesado',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lead-2',
    nombre: 'María González',
    telefono: '3705987654',
    email: 'maria@example.com',
    dni: '87654321',
    ingresos: 75000,
    zona: 'Norte',
    producto: 'Crédito Hipotecario',
    monto: 500000,
    origen: 'facebook',
    estado: 'PREAPROBADO',
    agencia: 'Formosa Norte',
    notas: 'Documentación completa',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@phorencial.com',
    nombre: 'Admin',
    apellido: 'User',
    role: 'ADMIN',
    status: 'ACTIVE',
    password_hash: '$2a$10$hashedpassword',
  },
  {
    id: 'user-2',
    email: 'vendedor@phorencial.com',
    nombre: 'Vendedor',
    apellido: 'Test',
    role: 'VENDEDOR',
    status: 'ACTIVE',
    password_hash: '$2a$10$hashedpassword',
  },
]

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  findUserByEmail: vi.fn().mockImplementation((email: string) => {
    return Promise.resolve(mockUsers.find(user => user.email === email) || null)
  }),
  
  findUserByEmailNew: vi.fn().mockImplementation((email: string) => {
    return Promise.resolve(mockUsers.find(user => user.email === email) || null)
  }),
  
  updateUserLastLogin: vi.fn().mockResolvedValue(undefined),
  
  createLead: vi.fn().mockImplementation((leadData: any) => {
    const newLead = {
      id: `lead-${Date.now()}`,
      ...leadData,
      estado: leadData.estado || 'NUEVO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return Promise.resolve(newLead)
  }),
  
  getLeads: vi.fn().mockImplementation((filters: any = {}) => {
    let filteredLeads = [...mockLeads]
    
    if (filters.estado) {
      filteredLeads = filteredLeads.filter(lead => lead.estado === filters.estado)
    }
    
    if (filters.origen) {
      filteredLeads = filteredLeads.filter(lead => lead.origen === filters.origen)
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredLeads = filteredLeads.filter(lead => 
        lead.nombre.toLowerCase().includes(searchLower) ||
        lead.telefono.includes(searchLower) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower))
      )
    }
    
    const offset = filters.offset || 0
    const limit = filters.limit || 10
    const paginatedLeads = filteredLeads.slice(offset, offset + limit)
    
    return Promise.resolve({
      leads: paginatedLeads,
      total: filteredLeads.length,
    })
  }),
  
  getLeadById: vi.fn().mockImplementation((id: string) => {
    return Promise.resolve(mockLeads.find(lead => lead.id === id) || null)
  }),
  
  updateLead: vi.fn().mockImplementation((id: string, updates: any) => {
    const lead = mockLeads.find(l => l.id === id)
    if (!lead) return Promise.resolve(null)
    
    const updatedLead = {
      ...lead,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    return Promise.resolve(updatedLead)
  }),
  
  deleteLead: vi.fn().mockResolvedValue(undefined),
  
  findLeadByPhone: vi.fn().mockImplementation((telefono: string) => {
    return Promise.resolve(mockLeads.find(lead => lead.telefono === telefono) || null)
  }),
})

// Mock SupabaseLeadService
export const createMockSupabaseLeadService = () => {
  const mockClient = createMockSupabaseClient()
  
  return {
    createLead: mockClient.createLead,
    getLeads: mockClient.getLeads,
    getLeadById: mockClient.getLeadById,
    updateLead: mockClient.updateLead,
    deleteLead: mockClient.deleteLead,
    findLeadByPhone: mockClient.findLeadByPhone,
  }
}

// Mock fetch responses for Supabase API
export const createMockFetchResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  headers: new Headers({
    'content-type': 'application/json',
  }),
})

// Setup mock fetch for Supabase API calls
export const setupSupabaseFetchMocks = (mockFetch: any) => {
  // Mock leads endpoint
  mockFetch.mockImplementation((url: string, options: any = {}) => {
    if (url.includes('/rest/v1/Lead')) {
      if (options.method === 'POST') {
        const body = JSON.parse(options.body || '{}')
        const newLead = {
          id: `lead-${Date.now()}`,
          ...body,
          estado: body.estado || 'NUEVO',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return Promise.resolve(createMockFetchResponse([newLead], 201))
      }
      
      if (options.method === 'GET' || !options.method) {
        return Promise.resolve(createMockFetchResponse(mockLeads))
      }
      
      if (options.method === 'PATCH') {
        const body = JSON.parse(options.body || '{}')
        const updatedLead = {
          ...mockLeads[0],
          ...body,
          updatedAt: new Date().toISOString(),
        }
        return Promise.resolve(createMockFetchResponse([updatedLead]))
      }
      
      if (options.method === 'DELETE') {
        return Promise.resolve(createMockFetchResponse(null, 204))
      }
    }
    
    // Default response
    return Promise.resolve(createMockFetchResponse([]))
  })
}