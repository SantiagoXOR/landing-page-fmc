import { vi } from 'vitest'

/**
 * Helper functions para tests de mensajería (sin dependencias ManyChat)
 */

export const createMockSession = (overrides: any = {}) => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'ADMIN',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
})

export const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
    method: 'POST',
    url: 'http://localhost:3000/api/test',
  } as any
}

export const createAuthenticatedRequest = (body: any) => {
  return createMockRequest(body, {
    'authorization': 'Bearer test-token',
    'content-type': 'application/json',
  })
}

export const createUnauthenticatedRequest = (body: any) => {
  return createMockRequest(body, {
    'content-type': 'application/json',
  })
}
