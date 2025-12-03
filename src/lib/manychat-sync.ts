/**
 * Servicio de Sincronización Pipeline → ManyChat
 * 
 * Este módulo maneja la sincronización de cambios del pipeline del CRM
 * hacia ManyChat, actualizando tags para activar automatizaciones.
 */

import { createClient } from '@supabase/supabase-js'
import {
  getManychatSubscriber,
  getSubscriberTags
} from './manychat-client'
import { ManychatService } from '@/server/services/manychat-service'
import { logger } from './logger'

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Tipos
export interface SyncPipelineParams {
  leadId: string
  manychatId: string
  previousStage?: string
  newStage: string
  userId?: string
  notes?: string
}

export interface PipelineStageTag {
  stage: string
  manychat_tag: string
  tag_type: 'pipeline' | 'business'
  description?: string
  is_active: boolean
}

/**
 * Obtener el tag de ManyChat para una etapa del pipeline
 */
export async function getTagForStage(stage: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stage_tags')
      .select('manychat_tag')
      .eq('stage', stage)
      .eq('tag_type', 'pipeline')
      .eq('is_active', true)
      .single()

    if (error) {
      logger.error(`Failed to get tag for stage ${stage}`, { error: error.message })
      return null
    }

    return data?.manychat_tag || null
  } catch (error: any) {
    logger.error(`Error getting tag for stage ${stage}`, { error: error.message })
    return null
  }
}

/**
 * Obtener todos los tags de pipeline (para filtrado)
 */
export async function getPipelineTags(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stage_tags')
      .select('manychat_tag')
      .eq('tag_type', 'pipeline')
      .eq('is_active', true)

    if (error) {
      logger.error('Failed to get pipeline tags', { error: error.message })
      return []
    }

    return (data || []).map(row => row.manychat_tag)
  } catch (error: any) {
    logger.error('Error getting pipeline tags', { error: error.message })
    return []
  }
}

/**
 * Obtener todos los tags de negocio (que deben mantenerse)
 */
export async function getBusinessTags(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_stage_tags')
      .select('manychat_tag')
      .eq('tag_type', 'business')
      .eq('is_active', true)

    if (error) {
      logger.error('Failed to get business tags', { error: error.message })
      return []
    }

    return (data || []).map(row => row.manychat_tag)
  } catch (error: any) {
    logger.error('Error getting business tags', { error: error.message })
    return []
  }
}

/**
 * Registrar sincronización en la tabla ManychatSync
 */
async function logManychatSync(params: {
  leadId: string
  syncType: string
  status: 'pending' | 'success' | 'failed'
  direction: string
  data?: any
  error?: string
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('ManychatSync')
      .insert({
        id: `${params.leadId}-${Date.now()}`,
        leadId: params.leadId,
        syncType: params.syncType,
        status: params.status,
        direction: params.direction,
        data: JSON.stringify(params.data || {}),
        error: params.error,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        completedAt: params.status !== 'pending' ? new Date().toISOString() : null
      })

    if (error) {
      logger.error('Failed to log ManyChat sync', { error: error.message })
    }
  } catch (error: any) {
    logger.error('Error logging ManyChat sync', { error: error.message })
  }
}

/**
 * Sincronizar cambio de etapa del pipeline a ManyChat
 * 
 * Esta función implementa la lógica híbrida de tags:
 * - Remueve el tag de pipeline anterior
 * - Agrega el nuevo tag de pipeline
 * - Mantiene los tags de negocio (atencion-humana, venta-concretada, etc.)
 */
export async function syncPipelineToManychat(
  params: SyncPipelineParams
): Promise<boolean> {
  const { leadId, manychatId, previousStage, newStage, userId, notes } = params

  logger.info('Starting pipeline sync to ManyChat', {
    leadId,
    manychatId,
    previousStage,
    newStage
  })

  try {
    // 1. Verificar que el lead tiene manychatId
    if (!manychatId) {
      logger.warn('Lead does not have manychatId, skipping sync', { leadId })
      return false
    }

    // 2. Obtener tag para la nueva etapa
    const newTag = await getTagForStage(newStage)
    if (!newTag) {
      logger.warn(`No tag mapping found for stage ${newStage}`, { leadId, newStage })
      return false
    }

    // 3. Obtener tag de la etapa anterior (si existe)
    let previousTag: string | null = null
    if (previousStage) {
      previousTag = await getTagForStage(previousStage)
    }

    // 4. Obtener tags actuales del subscriber en ManyChat
    let currentTags: string[] = []
    try {
      const subscriber = await getManychatSubscriber(manychatId)
      currentTags = subscriber.tags || []
      logger.info('Current ManyChat tags', { leadId, tags: currentTags })
    } catch (error: any) {
      if (error.message.includes('not found')) {
        logger.warn('Subscriber not found in ManyChat', { leadId, manychatId })
        await logManychatSync({
          leadId,
          syncType: 'pipeline_stage_change',
          status: 'failed',
          direction: 'to_manychat',
          data: { previousStage, newStage, newTag },
          error: 'Subscriber not found'
        })
        return false
      }
      throw error
    }

    // 5. Obtener todos los tags de pipeline y de negocio
    const pipelineTags = await getPipelineTags()
    const businessTags = await getBusinessTags()

    logger.info('Tag lists', {
      pipelineTags,
      businessTags
    })

    // 6. Filtrar tags a mantener (tags de negocio + tags no relacionados con pipeline)
    const tagsToKeep = currentTags.filter(tag => {
      // Mantener tags de negocio
      if (businessTags.includes(tag)) {
        return true
      }
      // Mantener tags que no son de pipeline
      if (!pipelineTags.includes(tag)) {
        return true
      }
      // Si es el nuevo tag, mantenerlo
      if (tag === newTag) {
        return true
      }
      // Remover cualquier otro tag de pipeline
      return false
    })

    // 7. Determinar tags a agregar y remover
    const tagsToRemove: string[] = []
    
    // Remover el tag anterior de pipeline si existe y está presente
    if (previousTag && currentTags.includes(previousTag) && previousTag !== newTag) {
      tagsToRemove.push(previousTag)
    }

    const tagsToAdd: string[] = []
    
    // Agregar el nuevo tag si no está presente
    if (!tagsToKeep.includes(newTag)) {
      tagsToAdd.push(newTag)
    }

    logger.info('Tags to update', {
      leadId,
      keep: tagsToKeep,
      add: tagsToAdd,
      remove: tagsToRemove
    })

    // 8. Si no hay cambios, salir
    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      logger.info('No tag changes needed', { leadId, manychatId })
      await logManychatSync({
        leadId,
        syncType: 'pipeline_stage_change',
        status: 'success',
        direction: 'to_manychat',
        data: {
          previousStage,
          newStage,
          previousTag,
          newTag,
          message: 'No changes needed'
        }
      })
      return true
    }

    // 9. Actualizar tags en ManyChat usando ManychatService que busca tags por ID
    // Remover tags primero
    for (const tag of tagsToRemove) {
      try {
        const removed = await ManychatService.removeTagFromSubscriber(manychatId, tag)
        if (!removed) {
          logger.warn(`Failed to remove tag '${tag}' from subscriber ${manychatId}`)
        }
      } catch (error: any) {
        // Si el tag no existe, ignorar el error
        if (!error.message.includes('not found') && !error.message.includes('does not exist')) {
          logger.warn(`Error removing tag '${tag}':`, error.message)
        }
      }
    }
    
    // Agregar nuevos tags
    for (const tag of tagsToAdd) {
      try {
        logger.info(`Attempting to add tag '${tag}' to subscriber ${manychatId}`)
        
        // Primero verificar si el tag existe en ManyChat (búsqueda case-insensitive)
        const allTags = await ManychatService.getTags()
        const normalizedTag = tag.toLowerCase().trim()
        const tagExists = allTags.find(t => 
          t.name.toLowerCase().trim() === normalizedTag ||
          t.name.trim() === tag
        )
        
        if (!tagExists) {
          const errorMsg = `Tag "${tag}" no existe en ManyChat. Por favor créalo primero en ManyChat antes de sincronizar.`
          logger.error(errorMsg, {
            leadId,
            manychatId,
            searchedTag: tag,
            normalizedSearch: normalizedTag,
            availableTags: allTags.slice(0, 20).map(t => ({ name: t.name, normalized: t.name.toLowerCase().trim() })),
            totalTags: allTags.length
          })
          throw new Error(errorMsg)
        }
        
        logger.info(`Tag '${tag}' encontrado en ManyChat con ID ${tagExists.id}`)
        
        const added = await ManychatService.addTagToSubscriber(manychatId, tag)
        if (!added) {
          const errorMsg = `No se pudo agregar el tag '${tag}' al subscriber ${manychatId} en ManyChat`
          logger.error(errorMsg, {
            leadId,
            manychatId,
            tag,
            tagId: tagExists.id
          })
          throw new Error(errorMsg)
        }
        
        logger.info(`Tag '${tag}' agregado exitosamente a subscriber ${manychatId}`)
      } catch (error: any) {
        logger.error(`Error adding tag '${tag}' to subscriber ${manychatId}:`, {
          error: error.message,
          leadId,
          manychatId,
          tag
        })
        throw error
      }
    }

    logger.info('Successfully synced pipeline to ManyChat', {
      leadId,
      manychatId,
      newStage,
      newTag,
      added: tagsToAdd,
      removed: tagsToRemove
    })

    // 10. Registrar sincronización exitosa
    await logManychatSync({
      leadId,
      syncType: 'pipeline_stage_change',
      status: 'success',
      direction: 'to_manychat',
      data: {
        previousStage,
        newStage,
        previousTag,
        newTag,
        tagsAdded: tagsToAdd,
        tagsRemoved: tagsToRemove
      }
    })

    return true

  } catch (error: any) {
    logger.error('Failed to sync pipeline to ManyChat', {
      leadId,
      manychatId,
      error: error.message,
      stack: error.stack
    })

    // Registrar error
    await logManychatSync({
      leadId,
      syncType: 'pipeline_stage_change',
      status: 'failed',
      direction: 'to_manychat',
      data: { previousStage, newStage },
      error: error.message
    })

    // Re-lanzar error para que el caller pueda manejarlo
    throw error
  }
}

/**
 * Verificar si un lead está sincronizado con ManyChat
 */
export async function isLeadSyncedWithManychat(leadId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('Lead')
      .select('manychatId')
      .eq('id', leadId)
      .single()

    if (error || !data) {
      return false
    }

    return !!data.manychatId
  } catch (error: any) {
    logger.error('Error checking if lead is synced', { leadId, error: error.message })
    return false
  }
}

/**
 * Sincronizar múltiples leads a ManyChat (para batch operations)
 */
export async function syncMultipleLeadsToManychat(
  leads: Array<{ leadId: string; manychatId: string; newStage: string; previousStage?: string }>
): Promise<{ success: number; failed: number; errors: Array<{ leadId: string; error: string }> }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ leadId: string; error: string }>
  }

  for (const lead of leads) {
    try {
      await syncPipelineToManychat(lead)
      results.success++
    } catch (error: any) {
      results.failed++
      results.errors.push({
        leadId: lead.leadId,
        error: error.message
      })
    }

    // Pequeño delay para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  logger.info('Batch sync completed', results)
  return results
}

