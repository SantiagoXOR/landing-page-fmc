import { vi } from 'vitest'

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key'
process.env.JWT_SECRET = 'test-jwt-secret-key'
process.env.ALLOWED_WEBHOOK_TOKEN = 'test-webhook-token'
process.env.TESTING_MODE = 'true'
// NODE_ENV is read-only, so we don't set it directly

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock NextAuth
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}))

// Mock NextAuth providers
vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({
    id: 'credentials',
    name: 'credentials',
    type: 'credentials',
    credentials: {},
    authorize: vi.fn(),
  })),
}))

// Mock Supabase client
vi.mock('@/lib/db', () => ({
  supabase: {
    findUserByEmail: vi.fn(),
    findUserByEmailNew: vi.fn(),
    updateUserLastLogin: vi.fn(),
    createLead: vi.fn(),
    getLeads: vi.fn(),
    updateLead: vi.fn(),
    deleteLead: vi.fn(),
  },
}))

// Mock Supabase Lead Service
vi.mock('@/server/services/supabase-lead-service', () => ({
  SupabaseLeadService: vi.fn().mockImplementation(() => ({
    createLead: vi.fn(),
    getLeads: vi.fn(),
    getLeadById: vi.fn(),
    updateLead: vi.fn(),
    deleteLead: vi.fn(),
    findLeadByPhone: vi.fn(),
  })),
  supabaseLeadService: {
    createLead: vi.fn(),
    getLeads: vi.fn(),
    getLeadById: vi.fn(),
    updateLead: vi.fn(),
    deleteLead: vi.fn(),
    findLeadByPhone: vi.fn(),
  },
}))

// Mock RBAC
vi.mock('@/lib/rbac', () => ({
  hasPermission: vi.fn(() => true),
  checkPermission: vi.fn(),
  getPermissions: vi.fn(() => []),
  hasAnyPermission: vi.fn(() => true),
  hasAllPermissions: vi.fn(() => true),
  getPermissionsByResource: vi.fn(() => []),
  canAccessRoute: vi.fn(() => true),
}))

// Mock Logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Pipeline Service
vi.mock('@/server/services/pipeline-service', () => ({
  pipelineService: {
    createLeadPipeline: vi.fn(),
    updatePipelineStage: vi.fn(),
    getPipelineByLeadId: vi.fn(),
  },
}))

// Setup default fetch responses
beforeEach(() => {
  vi.clearAllMocks()
  
  // Default successful fetch response
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue([]),
    text: vi.fn().mockResolvedValue(''),
    headers: new Headers(),
  })
})

// Export mocks for use in tests
export { mockFetch }
export const mockConsole = global.console