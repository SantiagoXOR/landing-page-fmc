/**
 * Módulo legacy: solo exporta no-ops y tipos para compatibilidad.
 * ManyChat eliminado; tags y pipeline se gestionan en CRM (pipeline-stage-tags).
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export interface SyncPipelineParams {
  leadId: string
  manychatId: string
  previousStage?: string
  newStage: string
  userId?: string
  notes?: string
  rejectionMessage?: string
}

/** No-op: ManyChat eliminado. Los tags se actualizan solo en CRM (assignStageTag en move/route). */
export async function syncPipelineToManychat(_params: SyncPipelineParams): Promise<boolean> {
  return true
}

/** Indica si el lead tiene externalId (manychatId/uchat) en BD. */
export async function isLeadSyncedWithManychat(leadId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('Lead')
      .select('manychatId')
      .eq('id', leadId)
      .single()

    if (error || !data) return false
    return !!data.manychatId
  } catch (error: any) {
    logger.error('Error checking if lead is synced', { leadId, error: error.message })
    return false
  }
}

/** No-op: sincronización batch con ManyChat eliminada. */
export async function syncMultipleLeadsToManychat(
  leads: Array<{ leadId: string; manychatId: string; newStage: string; previousStage?: string }>
): Promise<{ success: number; failed: number; errors: Array<{ leadId: string; error: string }> }> {
  const results = { success: 0, failed: 0, errors: [] as Array<{ leadId: string; error: string }> }
  for (const lead of leads) {
    try {
      await syncPipelineToManychat(lead)
      results.success++
    } catch (error: any) {
      results.failed++
      results.errors.push({ leadId: lead.leadId, error: error.message })
    }
  }
  return results
}
