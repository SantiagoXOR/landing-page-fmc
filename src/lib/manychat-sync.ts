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
import { ManychatSubscriber as ManychatSubscriberType } from '@/types/manychat'
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

    const tag = data?.manychat_tag || null
    
    // Validación crítica: Verificar que el tag sea correcto para PREAPROBADO y APROBADO
    if (stage === 'PREAPROBADO' && tag !== 'credito-preaprobado') {
      logger.error('CRITICAL: Tag incorrecto para PREAPROBADO en base de datos', {
        stage,
        tagFromDB: tag,
        expectedTag: 'credito-preaprobado'
      })
      // Retornar el tag correcto aunque la BD tenga un error
      return 'credito-preaprobado'
    }
    
    if (stage === 'APROBADO' && tag !== 'credito-aprobado') {
      logger.error('CRITICAL: Tag incorrecto para APROBADO en base de datos', {
        stage,
        tagFromDB: tag,
        expectedTag: 'credito-aprobado'
      })
      // Retornar el tag correcto aunque la BD tenga un error
      return 'credito-aprobado'
    }

    return tag
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
    
    // Log detallado para debugging de tags incorrectos
    logger.info('Tag mapping for stage', {
      leadId,
      stage: newStage,
      tag: newTag,
      expectedTag: newStage === 'PREAPROBADO' ? 'credito-preaprobado' : 
                    newStage === 'APROBADO' ? 'credito-aprobado' : 'unknown'
    })

    // 3. Obtener tag de la etapa anterior (si existe)
    let previousTag: string | null = null
    if (previousStage) {
      previousTag = await getTagForStage(previousStage)
    }

    // 4. Obtener tags actuales del subscriber en ManyChat
    let currentTags: string[] = []
    try {
      const subscriber = await getManychatSubscriber(manychatId)
      // Normalizar tags: ManyChat puede devolver tags como strings o como objetos {id, name}
      // Extraer el nombre del tag en ambos casos
      currentTags = (subscriber.tags || []).map(tag => {
        if (typeof tag === 'string') {
          return tag.trim()
        } else if (tag && typeof tag === 'object' && 'name' in tag) {
          // Si es un objeto con propiedad 'name', extraer el nombre
          return String((tag as any).name || tag).trim()
        } else {
          // Fallback: convertir a string (aunque esto debería ser raro)
          return String(tag).trim()
        }
      }).filter(tag => tag.length > 0)
      
      logger.info('Current ManyChat tags', { 
        leadId, 
        tags: currentTags,
        rawTags: subscriber.tags,
        tagCount: currentTags.length,
        rawTagTypes: subscriber.tags?.map(t => typeof t),
        rawTagStructure: subscriber.tags?.map(t => typeof t === 'object' ? Object.keys(t) : 'primitive')
      })
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

    // Normalizar tags de pipeline y negocio para comparación
    const normalizedPipelineTags = pipelineTags.map(tag => tag.trim().toLowerCase())
    const normalizedBusinessTags = businessTags.map(tag => tag.trim().toLowerCase())

    logger.info('Tag lists', {
      leadId,
      pipelineTags,
      businessTags,
      normalizedPipelineTags,
      normalizedBusinessTags,
      currentTagsCount: currentTags.length,
      newTag
    })

    // 6. Determinar tags a mantener (solo tags de negocio y tags no relacionados con pipeline)
    // IMPORTANTE: NO mantener el nuevo tag de pipeline si ya existe, lo eliminaremos y re-agregaremos
    // para asegurar que ManyChat dispare las automatizaciones correctamente
    const normalizedNewTag = newTag.trim().toLowerCase()
    const tagsToKeep = currentTags.filter(tag => {
      const normalizedTag = tag.trim().toLowerCase()
      
      // Mantener tags de negocio
      if (normalizedBusinessTags.includes(normalizedTag)) {
        return true
      }
      // Mantener tags que no son de pipeline
      if (!normalizedPipelineTags.includes(normalizedTag)) {
        return true
      }
      // NO mantener tags de pipeline (incluyendo el nuevo si ya existe)
      // Los eliminaremos todos y luego agregaremos el nuevo para disparar automatizaciones
      return false
    })

    // 7. Determinar tags a agregar y remover
    const tagsToRemove: string[] = []
    
    // Remover TODOS los tags de pipeline (incluyendo el nuevo si ya existe)
    // Esto asegura un estado limpio antes de agregar el nuevo tag
    // El orden correcto es: eliminar todos → esperar → agregar nuevo → ManyChat dispara automatización
    for (const tag of currentTags) {
      const normalizedTag = tag.trim().toLowerCase()
      // Si es un tag de pipeline, agregarlo a la lista de eliminación
      const isPipelineTag = normalizedPipelineTags.includes(normalizedTag)
      
      if (isPipelineTag) {
        tagsToRemove.push(tag) // Usar el tag original (no normalizado) para la eliminación
        logger.debug('Tag de pipeline marcado para eliminación', {
          leadId,
          tag,
          normalizedTag,
          isPipelineTag,
          isNewTag: normalizedTag === normalizedNewTag
        })
      }
    }

    const tagsToAdd: string[] = []
    
    // Siempre agregar el nuevo tag (incluso si ya existía)
    // Esto asegura que ManyChat dispare el evento "tag_added" y active las automatizaciones
    tagsToAdd.push(newTag)
    logger.debug('Tag marcado para agregar', {
      leadId,
      newTag,
      normalizedNewTag,
      wasAlreadyPresent: currentTags.some(tag => tag.trim().toLowerCase() === normalizedNewTag)
    })

    logger.info('Tags to update', {
      leadId,
      keep: tagsToKeep,
      add: tagsToAdd,
      remove: tagsToRemove
    })

    // 8. Si no hay cambios (no hay tags para eliminar y el nuevo tag ya existe y no es credito-preaprobado), salir
    // Nota: Para credito-preaprobado siempre hacemos el proceso completo para asegurar que se dispare el flujo
    const newTagWasAlreadyPresent = currentTags.some(tag => 
      tag.trim().toLowerCase() === normalizedNewTag
    )
    const needsSpecialHandling = newTag === 'credito-preaprobado' && newTagWasAlreadyPresent
    
    if (tagsToRemove.length === 0 && newTagWasAlreadyPresent && !needsSpecialHandling) {
      logger.info('No tag changes needed (tag ya existe y no requiere manejo especial)', { 
        leadId, 
        manychatId,
        newTag,
        wasAlreadyPresent: true
      })
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
          message: 'No changes needed - tag already exists'
        }
      })
      return true
    }

    // 8.5. Obtener subscriber para detectar canal y establecer custom field "origen"
    // Esto es necesario para que las reglas de ManyChat puedan filtrar por plataforma
    let detectedChannel: string | null = null
    try {
      const subscriberRaw = await getManychatSubscriber(manychatId)
      // Convertir el subscriber al tipo esperado por detectChannel
      const subscriber: ManychatSubscriberType = {
        ...subscriberRaw,
        id: typeof subscriberRaw.id === 'string' ? parseInt(subscriberRaw.id, 10) || 0 : subscriberRaw.id,
        page_id: typeof subscriberRaw.page_id === 'string' ? parseInt(subscriberRaw.page_id, 10) || 0 : subscriberRaw.page_id,
        status: subscriberRaw.status as 'active' | 'inactive',
        gender: subscriberRaw.gender === 'male' || subscriberRaw.gender === 'female' ? subscriberRaw.gender : undefined,
        subscribed: subscriberRaw.subscribed !== undefined 
          ? (typeof subscriberRaw.subscribed === 'boolean' 
              ? (subscriberRaw.subscribed ? new Date().toISOString() : undefined)
              : subscriberRaw.subscribed)
          : undefined,
        tags: subscriberRaw.tags?.map(tag => typeof tag === 'string' ? { id: 0, name: tag } : tag) || []
      }
      detectedChannel = ManychatService.detectChannel(subscriber)
      
      // Establecer el custom field "origen" en ManyChat para que las reglas puedan filtrar
      if (detectedChannel && detectedChannel !== 'unknown') {
        try {
          await ManychatService.setCustomField(
            String(manychatId),
            'origen',
            detectedChannel
          )
          logger.info('Custom field "origen" establecido en ManyChat para filtrar automatizaciones por plataforma', {
            leadId,
            manychatId,
            origen: detectedChannel
          })
        } catch (origenError: any) {
          // No fallar si no se puede establecer el origen, solo loguear
          logger.warn('No se pudo establecer custom field "origen" en ManyChat', {
            leadId,
            manychatId,
            error: origenError.message
          })
        }
      }
    } catch (subscriberError: any) {
      logger.warn('No se pudo obtener subscriber para establecer origen', {
        leadId,
        manychatId,
        error: subscriberError.message
      })
    }

    // 9. Actualizar tags en ManyChat usando ManychatService que busca tags por ID
    // Remover tags primero
    logger.info('Iniciando eliminación de tags', {
      leadId,
      manychatId,
      tagsToRemove,
      count: tagsToRemove.length
    })
    
    for (const tag of tagsToRemove) {
      try {
        logger.info(`Intentando eliminar tag '${tag}' del subscriber ${manychatId}`, {
          leadId,
          manychatId,
          tag
        })
        const removed = await ManychatService.removeTagFromSubscriber(manychatId, tag)
        if (removed) {
          logger.info(`Tag '${tag}' eliminado exitosamente del subscriber ${manychatId}`, {
            leadId,
            manychatId,
            tag
          })
        } else {
          logger.warn(`Failed to remove tag '${tag}' from subscriber ${manychatId}`, {
            leadId,
            manychatId,
            tag
          })
        }
      } catch (error: any) {
        // Si el tag no existe, ignorar el error pero loguearlo
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          logger.info(`Tag '${tag}' no existe en ManyChat, ignorando`, {
            leadId,
            manychatId,
            tag,
            error: error.message
          })
        } else {
          logger.error(`Error removing tag '${tag}' from subscriber ${manychatId}`, {
            leadId,
            manychatId,
            tag,
            error: error.message,
            stack: error.stack
          })
        }
      }
    }
    
    // Esperar 1 segundo para que ManyChat procese la eliminación antes de agregar nuevos tags
    // Esto es necesario para que las automatizaciones se disparen correctamente
    if (tagsToRemove.length > 0 && tagsToAdd.length > 0) {
      logger.info('Esperando 1 segundo después de remover tags para que ManyChat procese la eliminación', {
        leadId,
        manychatId,
        removed: tagsToRemove.length,
        toAdd: tagsToAdd.length
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
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
        
        // Verificar que el subscriber existe en ManyChat antes de agregar el tag
        try {
          const subscriber = await ManychatService.getSubscriberById(manychatId)
          if (!subscriber) {
            const errorMsg = `Subscriber ${manychatId} no existe en ManyChat. No se puede agregar el tag '${tag}'.`
            logger.error(errorMsg, {
              leadId,
              manychatId,
              tag,
              tagId: tagExists.id
            })
            throw new Error(errorMsg)
          }
          
          logger.info(`Subscriber ${manychatId} encontrado en ManyChat, procediendo a agregar tag`)
        } catch (subscriberError: any) {
          if (subscriberError.message.includes('no existe')) {
            throw subscriberError
          }
          logger.warn(`No se pudo verificar subscriber, continuando de todas formas`, {
            error: subscriberError.message,
            manychatId
          })
        }
        
        try {
          const added = await ManychatService.addTagToSubscriber(manychatId, tag)
          if (!added) {
            const errorMsg = `No se pudo agregar el tag '${tag}' al subscriber ${manychatId} en ManyChat. Verifica los logs del servidor para más detalles.`
            logger.error(errorMsg, {
              leadId,
              manychatId,
              tag,
              tagId: tagExists.id,
              subscriberExists: true // Ya verificamos arriba
            })
            throw new Error(errorMsg)
          }
        } catch (addError: any) {
          // Si el error indica que el tag ya está asignado, considerarlo éxito
          if (addError.message?.includes('ya está asignado') || addError.message?.includes('already')) {
            logger.info(`Tag '${tag}' ya estaba asignado al subscriber ${manychatId}`, {
              leadId,
              manychatId,
              tag
            })
            // Continuar como si fuera éxito
          } else {
            // Re-lanzar el error con más contexto
            const errorMsg = addError.error_code 
              ? `ManyChat API error ${addError.error_code}: ${addError.message || 'Error desconocido'}`
              : `No se pudo agregar el tag '${tag}' al subscriber ${manychatId}: ${addError.message}`
            
            logger.error(errorMsg, {
              leadId,
              manychatId,
              tag,
              tagId: tagExists.id,
              error_code: addError.error_code,
              details: addError.details,
              fullResponse: addError.fullResponse
            })
            throw new Error(errorMsg)
          }
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

    // 9.5. Caso especial: Si el tag es credito-preaprobado y ya existía antes,
    // hacer un remove/re-add adicional para asegurar que ManyChat dispare el flujo
    // Esto es necesario porque ManyChat solo dispara automatizaciones en eventos "tag_added"
    // Nota: newTagWasAlreadyPresent ya fue definido arriba en la sección 8
    const needsSpecialHandlingForPreaprobado = newTag === 'credito-preaprobado' && newTagWasAlreadyPresent
    
    if (needsSpecialHandlingForPreaprobado) {
      try {
        logger.info('Tag credito-preaprobado ya existía antes, haciendo remove/re-add adicional para disparar flujo', {
          leadId,
          manychatId,
          tag: newTag
        })
        
        // Remover el tag que acabamos de agregar
        await ManychatService.removeTagFromSubscriber(manychatId, newTag)
        
        // Esperar un momento para que ManyChat procese la eliminación
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Volver a agregar el tag para generar el evento "tag_added" y disparar el flujo
        await ManychatService.addTagToSubscriber(manychatId, newTag)
        
        logger.info('Tag credito-preaprobado removido y reañadido exitosamente, ManyChat debería disparar el flujo automáticamente', {
          leadId,
          manychatId,
          tag: newTag
        })
      } catch (err: any) {
        logger.warn('Error en remove/re-add adicional para credito-preaprobado (no crítico)', {
          leadId,
          manychatId,
          tag: newTag,
          error: err.message
        })
        // No fallar si esto falla, el tag ya fue agregado correctamente
      }
    }

    logger.info('Successfully synced pipeline to ManyChat', {
      leadId,
      manychatId,
      newStage,
      newTag,
      added: tagsToAdd,
      removed: tagsToRemove,
      specialHandling: newTag === 'credito-preaprobado' && newTagWasAlreadyPresent ? 'remove-re-add' : 'none'
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

