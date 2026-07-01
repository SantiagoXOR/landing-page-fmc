/**
 * Movimiento masivo de leads entre etapas del pipeline (por lotes).
 */

import { supabaseClient, supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  resolvePipelineStagesForStageId,
  stageIdToPipelineEnum,
  getBroadcastStageLabel,
} from '@/lib/pipeline-stage-map'
import { pipelineService } from '@/server/services/pipeline-service'
import { assignStageTagForLead } from '@/server/services/pipeline-stage-tag-assignment'

export const BULK_MOVE_DEFAULT_BATCH_SIZE = 25

function assertSupabase() {
  if (!supabaseClient) {
    throw new Error('Base de datos no configurada')
  }
  return supabaseClient
}

function normalizeStageId(stageId: string): string {
  return stageId.toLowerCase().trim().replace(/_/g, '-')
}

async function fetchLeadIdsInStagesPaginated(
  pipelineStages: string[],
  offset: number,
  limit: number
): Promise<string[]> {
  const db = assertSupabase()
  const { data, error } = await db
    .from('lead_pipeline')
    .select('lead_id')
    .in('current_stage', pipelineStages)
    .order('updated_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Error al listar leads: ${error.message}`)
  }

  return (data || []).map((row) => row.lead_id as string).filter(Boolean)
}

export async function countLeadsInStage(fromStageId: string): Promise<number> {
  const pipelineStages = resolvePipelineStagesForStageId(normalizeStageId(fromStageId))
  if (pipelineStages.length === 0) {
    return 0
  }

  const db = assertSupabase()
  const { count, error } = await db
    .from('lead_pipeline')
    .select('lead_id', { count: 'exact', head: true })
    .in('current_stage', pipelineStages)

  if (error) {
    throw new Error(`Error al contar leads: ${error.message}`)
  }

  return count ?? 0
}

async function moveLeadDirect(
  leadId: string,
  toStageEnum: string,
  userId: string,
  notes?: string
): Promise<void> {
  try {
    await pipelineService.moveLeadToStage(
      leadId,
      toStageEnum as Parameters<typeof pipelineService.moveLeadToStage>[1],
      userId,
      notes || 'Movimiento masivo desde pipeline'
    )
  } catch (serviceError) {
    logger.warn('Bulk move: pipelineService falló, intentando PATCH directo', {
      leadId,
      toStageEnum,
      error: serviceError instanceof Error ? serviceError.message : String(serviceError),
    })

    const currentPipeline = await pipelineService.getLeadPipeline(leadId)
    if (!currentPipeline) {
      throw new Error('Lead sin registro en pipeline')
    }

    await supabase.request(`/lead_pipeline?id=eq.${currentPipeline.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        current_stage: toStageEnum,
        stage_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        probability_percent: pipelineService.getProbabilityForStage(
          toStageEnum as Parameters<typeof pipelineService.getProbabilityForStage>[0]
        ),
      }),
    })
  }
}

export interface BulkMoveBatchResult {
  processed: number
  failed: number
  totalInStage: number
  offset: number
  nextOffset: number
  done: boolean
  errors: string[]
  fromStageId: string
  toStageId: string
  fromLabel: string
  toLabel: string
}

export async function bulkMoveLeadsBatch(options: {
  fromStageId: string
  toStageId: string
  userId: string
  offset?: number
  batchSize?: number
}): Promise<BulkMoveBatchResult> {
  const fromStageId = normalizeStageId(options.fromStageId)
  const toStageId = normalizeStageId(options.toStageId)
  const offset = Math.max(0, options.offset ?? 0)
  const batchSize = Math.min(
    Math.max(1, options.batchSize ?? BULK_MOVE_DEFAULT_BATCH_SIZE),
    100
  )

  if (fromStageId === toStageId) {
    throw new Error('La etapa origen y destino no pueden ser la misma')
  }

  const pipelineStages = resolvePipelineStagesForStageId(fromStageId)
  if (pipelineStages.length === 0) {
    throw new Error(`Etapa origen desconocida: ${fromStageId}`)
  }

  const toStageEnum = stageIdToPipelineEnum(toStageId)
  const totalInStage = await countLeadsInStage(fromStageId)
  // Siempre offset 0: los leads movidos dejan de estar en la etapa origen
  const leadIds = await fetchLeadIdsInStagesPaginated(pipelineStages, 0, batchSize)

  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const leadId of leadIds) {
    try {
      await moveLeadDirect(leadId, toStageEnum, options.userId)
      await assignStageTagForLead(leadId, toStageId)
      processed++
    } catch (error) {
      failed++
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${leadId}: ${message}`)
      logger.warn('Bulk move: lead falló', { leadId, toStageEnum, message })
    }
  }

  const remaining = Math.max(0, totalInStage - processed)
  const done = remaining === 0 || leadIds.length === 0

  return {
    processed,
    failed,
    totalInStage,
    offset,
    nextOffset: offset + processed + failed,
    done,
    errors: errors.slice(0, 10),
    fromStageId,
    toStageId,
    fromLabel: getBroadcastStageLabel(fromStageId),
    toLabel: getBroadcastStageLabel(toStageId),
  }
}
