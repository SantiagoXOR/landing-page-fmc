/**
 * Tests unitarios para el endpoint de movimiento de pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/pipeline/leads/[leadId]/move/route'
import { NextRequest } from 'next/server'

// Mock de next-auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

// Mock de rbac
vi.mock('@/lib/rbac', () => ({
  checkUserPermission: vi.fn(() => Promise.resolve(true)),
  checkPermission: vi.fn()
}))

// Mock de logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock del servicio de pipeline
vi.mock('@/server/services/pipeline-service', () => ({
  pipelineService: {
    moveLeadToStage: vi.fn(),
    getLeadPipeline: vi.fn()
  }
}))

// Mock del servicio de automatización
vi.mock('@/services/automation-service', () => ({
  automationService: {
    executeTrigger: vi.fn()
  }
}))

// Mock de supabase
vi.mock('@/lib/db', () => ({
  supabase: {
    findLeadById: vi.fn(),
    updateLead: vi.fn(),
    request: vi.fn()
  }
}))

// Mock de manychat-sync
vi.mock('@/lib/manychat-sync', () => ({
  syncPipelineToManychat: vi.fn()
}))

import { getServerSession } from 'next-auth/next'
import { pipelineService } from '@/server/services/pipeline-service'
import { supabase } from '@/lib/db'
import { syncPipelineToManychat } from '@/lib/manychat-sync'

describe('POST /api/pipeline/leads/[leadId]/move', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock de sesión por defecto
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com'
      }
    } as any)
  })

  it('debería mover un lead exitosamente', async () => {
    // Mock de moveLeadToStage exitoso
    vi.mocked(pipelineService.moveLeadToStage).mockResolvedValue(undefined)
    
    // Mock de lead con manychatId
    vi.mocked(supabase.findLeadById).mockResolvedValue({
      id: 'test-lead-id',
      manychatId: 'test-manychat-id',
      nombre: 'Test Lead'
    } as any)
    
    // Mock de sincronización exitosa
    vi.mocked(syncPipelineToManychat).mockResolvedValue(true)

    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        fromStageId: 'nuevo',
        toStageId: 'contactado',
        notes: 'Test note'
      })
    })

    const response = await POST(request, { params: { leadId: 'test-lead-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.manychatSynced).toBe(true)
    expect(data.message).toContain('ManyChat')
  })

  it('debería rechazar si no hay sesión', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        fromStageId: 'nuevo',
        toStageId: 'contactado'
      })
    })

    const response = await POST(request, { params: { leadId: 'test-lead-id' } })
    
    expect(response.status).toBe(401)
  })

  it('debería validar datos de entrada', async () => {
    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        // Falta fromStageId
        toStageId: 'contactado'
      })
    })

    const response = await POST(request, { params: { leadId: 'test-lead-id' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation error')
  })

  it('debería rechazar movimiento a la misma etapa', async () => {
    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        fromStageId: 'nuevo',
        toStageId: 'nuevo'
      })
    })

    const response = await POST(request, { params: { leadId: 'test-lead-id' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Same stage')
  })

  it('debería mover lead incluso si falla la sincronización con ManyChat', async () => {
    vi.mocked(pipelineService.moveLeadToStage).mockResolvedValue(undefined)
    vi.mocked(supabase.findLeadById).mockResolvedValue({
      id: 'test-lead-id',
      manychatId: 'test-manychat-id',
      nombre: 'Test Lead'
    } as any)
    
    // Mock de sincronización fallida
    vi.mocked(syncPipelineToManychat).mockRejectedValue(new Error('ManyChat API error'))

    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        fromStageId: 'nuevo',
        toStageId: 'contactado'
      })
    })

    const response = await POST(request, { params: { leadId: 'test-lead-id' } })
    const data = await response.json()

    // El movimiento debería ser exitoso aunque falle ManyChat
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.manychatSynced).toBe(false)
  })

  it('debería mapear correctamente las etapas nuevas', async () => {
    vi.mocked(pipelineService.moveLeadToStage).mockResolvedValue(undefined)
    vi.mocked(supabase.findLeadById).mockResolvedValue({
      id: 'test-lead-id',
      manychatId: null,
      nombre: 'Test Lead'
    } as any)

    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        fromStageId: 'cliente-nuevo',
        toStageId: 'consultando-credito'
      })
    })

    const response = await POST(request, { params: { leadId: 'test-lead-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    
    // Verificar que se llamó a moveLeadToStage con el enum correcto
    expect(pipelineService.moveLeadToStage).toHaveBeenCalledWith(
      'test-lead-id',
      'CONSULTANDO_CREDITO',
      'test-user-id',
      undefined,
      undefined
    )
  })

  it('debería sincronizar con ManyChat si el lead tiene manychatId', async () => {
    vi.mocked(pipelineService.moveLeadToStage).mockResolvedValue(undefined)
    vi.mocked(supabase.findLeadById).mockResolvedValue({
      id: 'test-lead-id',
      manychatId: 'test-manychat-id',
      nombre: 'Test Lead'
    } as any)
    vi.mocked(syncPipelineToManychat).mockResolvedValue(true)

    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        fromStageId: 'nuevo',
        toStageId: 'contactado',
        notes: 'Test note'
      })
    })

    await POST(request, { params: { leadId: 'test-lead-id' } })

    // Verificar que se llamó a syncPipelineToManychat
    expect(syncPipelineToManychat).toHaveBeenCalledWith({
      leadId: 'test-lead-id',
      manychatId: 'test-manychat-id',
      previousStage: expect.any(String),
      newStage: expect.any(String),
      userId: 'test-user-id',
      notes: 'Test note'
    })
  })

  it('debería omitir sincronización si el lead no tiene manychatId', async () => {
    vi.mocked(pipelineService.moveLeadToStage).mockResolvedValue(undefined)
    vi.mocked(supabase.findLeadById).mockResolvedValue({
      id: 'test-lead-id',
      manychatId: null,
      nombre: 'Test Lead'
    } as any)

    const request = new NextRequest('http://localhost:3000/api/pipeline/leads/test-lead-id/move', {
      method: 'POST',
      body: JSON.stringify({
        fromStageId: 'nuevo',
        toStageId: 'contactado'
      })
    })

    const response = await POST(request, { params: { leadId: 'test-lead-id' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.manychatSynced).toBe(false)
    expect(syncPipelineToManychat).not.toHaveBeenCalled()
  })
})

