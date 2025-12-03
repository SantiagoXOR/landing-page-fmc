/**
 * Sistema de Cola para Sincronización con ManyChat
 * 
 * Este módulo maneja el procesamiento de sincronizaciones pendientes
 * y el retry automático cuando fallan.
 */

import { createClient } from '@supabase/supabase-js'
import { syncPipelineToManychat } from './manychat-sync'
import { logger } from './logger'

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Configuración
const MAX_RETRY_COUNT = 3
const RETRY_DELAY_MS = 5000 // 5 segundos
const BATCH_SIZE = 10 // Procesar 10 syncs a la vez

interface PendingSync {
  id: string
  leadId: string
  syncType: string
  status: string
  direction: string
  data: any
  error: string | null
  retryCount: number
  createdAt: string
  completedAt: string | null
}

/**
 * Obtener sincronizaciones pendientes o fallidas que se pueden reintentar
 */
async function getPendingSyncs(limit: number = BATCH_SIZE): Promise<PendingSync[]> {
  try {
    const { data, error } = await supabase
      .from('ManychatSync')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('retryCount', MAX_RETRY_COUNT)
      .order('createdAt', { ascending: true })
      .limit(limit)

    if (error) {
      logger.error('Failed to fetch pending syncs', { error: error.message })
      return []
    }

    return (data || []) as PendingSync[]
  } catch (error: any) {
    logger.error('Error fetching pending syncs', { error: error.message })
    return []
  }
}

/**
 * Procesar una sincronización pendiente
 */
async function processPendingSync(sync: PendingSync): Promise<boolean> {
  try {
    logger.info('Processing pending sync', {
      id: sync.id,
      leadId: sync.leadId,
      syncType: sync.syncType,
      retryCount: sync.retryCount
    })

    // Parsear data
    let syncData
    try {
      syncData = typeof sync.data === 'string' ? JSON.parse(sync.data) : sync.data
    } catch {
      syncData = sync.data
    }

    // Obtener información del lead
    const { data: lead, error: leadError } = await supabase
      .from('Lead')
      .select('id, manychatId')
      .eq('id', sync.leadId)
      .single()

    if (leadError || !lead) {
      logger.error('Lead not found for pending sync', { syncId: sync.id, leadId: sync.leadId })
      
      // Marcar como failed permanentemente
      await supabase
        .from('ManychatSync')
        .update({
          status: 'failed',
          error: 'Lead not found',
          completedAt: new Date().toISOString()
        })
        .eq('id', sync.id)
      
      return false
    }

    if (!lead.manychatId) {
      logger.warn('Lead does not have ManyChat ID', { syncId: sync.id, leadId: sync.leadId })
      
      // Marcar como failed permanentemente
      await supabase
        .from('ManychatSync')
        .update({
          status: 'failed',
          error: 'Lead does not have ManyChat ID',
          completedAt: new Date().toISOString()
        })
        .eq('id', sync.id)
      
      return false
    }

    // Ejecutar sincronización según el tipo
    if (sync.syncType === 'pipeline_stage_change') {
      await syncPipelineToManychat({
        leadId: sync.leadId,
        manychatId: lead.manychatId,
        previousStage: syncData.previousStage,
        newStage: syncData.newStage,
        notes: syncData.notes
      })

      // Marcar como exitoso
      await supabase
        .from('ManychatSync')
        .update({
          status: 'success',
          completedAt: new Date().toISOString()
        })
        .eq('id', sync.id)

      logger.info('Pending sync completed successfully', { syncId: sync.id })
      return true
    }

    logger.warn('Unknown sync type', { syncId: sync.id, syncType: sync.syncType })
    return false

  } catch (error: any) {
    logger.error('Error processing pending sync', {
      syncId: sync.id,
      error: error.message
    })

    // Incrementar retry count
    const newRetryCount = sync.retryCount + 1

    if (newRetryCount >= MAX_RETRY_COUNT) {
      // Máximo de reintentos alcanzado, marcar como failed permanentemente
      await supabase
        .from('ManychatSync')
        .update({
          status: 'failed',
          error: `Max retries reached: ${error.message}`,
          retryCount: newRetryCount,
          completedAt: new Date().toISOString()
        })
        .eq('id', sync.id)

      logger.warn('Pending sync failed permanently', {
        syncId: sync.id,
        retryCount: newRetryCount
      })
    } else {
      // Marcar como failed para reintentar más tarde
      await supabase
        .from('ManychatSync')
        .update({
          status: 'failed',
          error: error.message,
          retryCount: newRetryCount
        })
        .eq('id', sync.id)

      logger.info('Pending sync marked for retry', {
        syncId: sync.id,
        retryCount: newRetryCount
      })
    }

    return false
  }
}

/**
 * Procesar todas las sincronizaciones pendientes
 */
export async function processAllPendingSyncs(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0
  }

  try {
    logger.info('Starting to process pending syncs')

    while (true) {
      const pendingSyncs = await getPendingSyncs()
      
      if (pendingSyncs.length === 0) {
        break
      }

      logger.info(`Processing batch of ${pendingSyncs.length} pending syncs`)

      for (const sync of pendingSyncs) {
        results.processed++
        
        const success = await processPendingSync(sync)
        
        if (success) {
          results.succeeded++
        } else {
          results.failed++
        }

        // Pequeño delay entre syncs para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    logger.info('Finished processing pending syncs', results)
    return results

  } catch (error: any) {
    logger.error('Error in processAllPendingSyncs', {
      error: error.message,
      results
    })
    return results
  }
}

/**
 * Verificar si hay sincronizaciones pendientes
 */
export async function hasPendingSyncs(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ManychatSync')
      .select('id')
      .in('status', ['pending', 'failed'])
      .lt('retryCount', MAX_RETRY_COUNT)
      .limit(1)

    if (error) {
      logger.error('Failed to check for pending syncs', { error: error.message })
      return false
    }

    return (data || []).length > 0
  } catch (error: any) {
    logger.error('Error checking for pending syncs', { error: error.message })
    return false
  }
}

/**
 * Obtener estadísticas de sincronizaciones
 */
export async function getSyncStats(): Promise<{
  pending: number
  failed: number
  succeeded: number
  total: number
}> {
  try {
    const { data: pendingData } = await supabase
      .from('ManychatSync')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { data: failedData } = await supabase
      .from('ManychatSync')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')

    const { data: succeededData } = await supabase
      .from('ManychatSync')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'success')

    const { data: totalData } = await supabase
      .from('ManychatSync')
      .select('id', { count: 'exact', head: true })

    return {
      pending: pendingData?.length || 0,
      failed: failedData?.length || 0,
      succeeded: succeededData?.length || 0,
      total: totalData?.length || 0
    }
  } catch (error: any) {
    logger.error('Error getting sync stats', { error: error.message })
    return {
      pending: 0,
      failed: 0,
      succeeded: 0,
      total: 0
    }
  }
}

/**
 * Limpiar sincronizaciones antiguas exitosas
 */
export async function cleanupOldSyncs(daysToKeep: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data, error } = await supabase
      .from('ManychatSync')
      .delete()
      .eq('status', 'success')
      .lt('completedAt', cutoffDate.toISOString())
      .select()

    if (error) {
      logger.error('Failed to cleanup old syncs', { error: error.message })
      return 0
    }

    const deletedCount = (data || []).length
    logger.info(`Cleaned up ${deletedCount} old syncs`)
    return deletedCount
  } catch (error: any) {
    logger.error('Error cleaning up old syncs', { error: error.message })
    return 0
  }
}

