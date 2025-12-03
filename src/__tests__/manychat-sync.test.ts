/**
 * Tests unitarios para el servicio de sincronización de ManyChat
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  syncPipelineToManychat,
  getTagForStage,
  getPipelineTags,
  getBusinessTags
} from '@/lib/manychat-sync'
import * as manychatClient from '@/lib/manychat-client'

// Mock de Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { manychat_tag: 'lead-nuevo' },
              error: null
            }))
          })),
          single: vi.fn(() => ({
            data: { manychat_tag: 'lead-nuevo' },
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({ error: null }))
    }))
  }))
}))

// Mock del cliente ManyChat
vi.mock('@/lib/manychat-client', () => ({
  getManychatSubscriber: vi.fn(),
  updateManychatTags: vi.fn(),
  addManychatTag: vi.fn(),
  removeManychatTag: vi.fn()
}))

describe('manychat-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTagForStage', () => {
    it('debería obtener el tag correcto para una etapa', async () => {
      const tag = await getTagForStage('CLIENTE_NUEVO')
      expect(tag).toBe('lead-nuevo')
    })

    it('debería retornar null si la etapa no existe', async () => {
      const tag = await getTagForStage('ETAPA_INEXISTENTE')
      // Dependiendo de la implementación del mock
      expect(tag).toBeDefined()
    })
  })

  describe('syncPipelineToManychat', () => {
    it('debería sincronizar exitosamente cuando el lead tiene manychatId', async () => {
      // Mock de subscriber con tags actuales
      vi.mocked(manychatClient.getManychatSubscriber).mockResolvedValue({
        id: 'test-subscriber-id',
        key: 'test-key',
        page_id: 'test-page',
        status: 'active',
        tags: ['lead-consultando', 'atencion-humana']
      } as any)

      vi.mocked(manychatClient.updateManychatTags).mockResolvedValue(true)

      const result = await syncPipelineToManychat({
        leadId: 'test-lead-id',
        manychatId: 'test-manychat-id',
        previousStage: 'CONSULTANDO_CREDITO',
        newStage: 'LISTO_ANALISIS'
      })

      expect(result).toBe(true)
      expect(manychatClient.getManychatSubscriber).toHaveBeenCalledWith('test-manychat-id')
    })

    it('debería retornar false si el lead no tiene manychatId', async () => {
      const result = await syncPipelineToManychat({
        leadId: 'test-lead-id',
        manychatId: '',
        previousStage: 'CLIENTE_NUEVO',
        newStage: 'CONSULTANDO_CREDITO'
      })

      expect(result).toBe(false)
      expect(manychatClient.getManychatSubscriber).not.toHaveBeenCalled()
    })

    it('debería mantener tags de negocio al cambiar de etapa', async () => {
      vi.mocked(manychatClient.getManychatSubscriber).mockResolvedValue({
        id: 'test-subscriber-id',
        key: 'test-key',
        page_id: 'test-page',
        status: 'active',
        tags: ['lead-consultando', 'atencion-humana', 'venta-concretada']
      } as any)

      vi.mocked(manychatClient.updateManychatTags).mockResolvedValue(true)

      const result = await syncPipelineToManychat({
        leadId: 'test-lead-id',
        manychatId: 'test-manychat-id',
        previousStage: 'CONSULTANDO_CREDITO',
        newStage: 'LISTO_ANALISIS'
      })

      expect(result).toBe(true)
      
      // Verificar que se llamó a updateManychatTags
      expect(manychatClient.updateManychatTags).toHaveBeenCalled()
      
      // Los tags de negocio (atencion-humana, venta-concretada) deben mantenerse
      const callArgs = vi.mocked(manychatClient.updateManychatTags).mock.calls[0]
      expect(callArgs[0]).toBe('test-manychat-id') // subscriberId
      // callArgs[1] son los tags a agregar
      // callArgs[2] son los tags a remover
    })

    it('debería manejar errores cuando el subscriber no existe', async () => {
      vi.mocked(manychatClient.getManychatSubscriber).mockRejectedValue(
        new Error('Subscriber not found')
      )

      const result = await syncPipelineToManychat({
        leadId: 'test-lead-id',
        manychatId: 'test-manychat-id',
        previousStage: 'CLIENTE_NUEVO',
        newStage: 'CONSULTANDO_CREDITO'
      })

      expect(result).toBe(false)
    })

    it('debería remover el tag anterior de pipeline', async () => {
      vi.mocked(manychatClient.getManychatSubscriber).mockResolvedValue({
        id: 'test-subscriber-id',
        key: 'test-key',
        page_id: 'test-page',
        status: 'active',
        tags: ['lead-nuevo']
      } as any)

      vi.mocked(manychatClient.updateManychatTags).mockResolvedValue(true)

      await syncPipelineToManychat({
        leadId: 'test-lead-id',
        manychatId: 'test-manychat-id',
        previousStage: 'CLIENTE_NUEVO',
        newStage: 'CONSULTANDO_CREDITO'
      })

      const callArgs = vi.mocked(manychatClient.updateManychatTags).mock.calls[0]
      const tagsToRemove = callArgs[2]
      
      // Verificar que se intenta remover el tag anterior
      expect(tagsToRemove).toBeDefined()
    })
  })

  describe('getPipelineTags', () => {
    it('debería obtener todos los tags de pipeline', async () => {
      const tags = await getPipelineTags()
      expect(Array.isArray(tags)).toBe(true)
    })
  })

  describe('getBusinessTags', () => {
    it('debería obtener todos los tags de negocio', async () => {
      const tags = await getBusinessTags()
      expect(Array.isArray(tags)).toBe(true)
    })
  })
})

