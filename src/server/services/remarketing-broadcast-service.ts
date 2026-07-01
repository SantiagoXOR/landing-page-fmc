/**
 * Broadcast WhatsApp a leads en etapa Remarketing (cola + logs en Supabase).
 */

import { supabaseClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import {
  DEFAULT_REMARKETING_TEMPLATE_ID,
  getRemarketingTemplateProfile,
} from '@/lib/remarketing-templates'
import {
  getBroadcastStageLabel,
  resolvePipelineStagesForStageId,
} from '@/lib/pipeline-stage-map'
import {
  sendRemarketingWhatsAppToLead,
  type PipelineNotifyLead,
} from '@/server/services/uchat-pipeline-notify'

export const REMARKETING_BROADCAST_STAGE_ID = 'remarketing'
export const BROADCAST_BATCH_SIZE = 5
export const BROADCAST_SEND_DELAY_MS = 800
const LEAD_PIPELINE_PAGE = 500
const LEAD_FETCH_CHUNK = 100
const ITEM_INSERT_CHUNK = 100

export type BroadcastJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type BroadcastItemStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface BroadcastJobRow {
  id: string
  created_by: string | null
  stage_id: string
  template_id: string
  custom_message: string | null
  status: BroadcastJobStatus
  total_count: number
  sent_count: number
  failed_count: number
  skipped_count: number
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface BroadcastItemRow {
  id: string
  job_id: string
  lead_id: string
  lead_nombre: string | null
  telefono: string | null
  status: BroadcastItemStatus
  message_id: string | null
  error_message: string | null
  processed_at: string | null
  created_at: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assertSupabase() {
  if (!supabaseClient) {
    throw new Error(
      'Base de datos no configurada. Ejecutá scripts/migrations/006_whatsapp_broadcast.sql en Supabase.'
    )
  }
  return supabaseClient
}

async function fetchLeadIdsInStages(pipelineStages: string[]): Promise<string[]> {
  const db = assertSupabase()
  const allIds: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await db
      .from('lead_pipeline')
      .select('lead_id')
      .in('current_stage', pipelineStages)
      .range(offset, offset + LEAD_PIPELINE_PAGE - 1)

    if (error) {
      throw new Error(`Error al listar leads: ${error.message}`)
    }

    const batch = (data || []).map((p) => p.lead_id as string).filter(Boolean)
    if (batch.length === 0) break

    allIds.push(...batch)
    if (batch.length < LEAD_PIPELINE_PAGE) break
    offset += LEAD_PIPELINE_PAGE
  }

  return allIds
}

async function fetchLeadsByIds(leadIds: string[]): Promise<PipelineNotifyLead[]> {
  if (leadIds.length === 0) return []

  const db = assertSupabase()
  const leads: PipelineNotifyLead[] = []

  for (let i = 0; i < leadIds.length; i += LEAD_FETCH_CHUNK) {
    const chunk = leadIds.slice(i, i + LEAD_FETCH_CHUNK)
    const { data, error } = await db
      .from('Lead')
      .select('id, nombre, telefono, manychatId')
      .in('id', chunk)

    if (error) {
      throw new Error(`Error al cargar contactos: ${error.message}`)
    }

    for (const l of data || []) {
      leads.push({
        id: l.id as string,
        nombre: l.nombre as string | null,
        telefono: l.telefono as string | null,
        manychatId: l.manychatId as string | null,
      })
    }
  }

  return leads
}

async function fetchLeadsByStageId(stageId: string): Promise<PipelineNotifyLead[]> {
  const pipelineStages = resolvePipelineStagesForStageId(stageId)
  if (pipelineStages.length === 0) {
    throw new Error(`Etapa desconocida: ${stageId}`)
  }

  const leadIds = await fetchLeadIdsInStages(pipelineStages)
  return fetchLeadsByIds(leadIds)
}

export async function countBroadcastTargets(stageId: string = REMARKETING_BROADCAST_STAGE_ID): Promise<number> {
  const pipelineStages = resolvePipelineStagesForStageId(stageId)
  if (pipelineStages.length === 0) return 0

  const db = assertSupabase()
  const { count, error } = await db
    .from('lead_pipeline')
    .select('*', { count: 'exact', head: true })
    .in('current_stage', pipelineStages)

  if (error) {
    throw new Error(error.message)
  }

  return count || 0
}

/** @deprecated use countBroadcastTargets */
export async function countRemarketingBroadcastTargets(): Promise<number> {
  return countBroadcastTargets(REMARKETING_BROADCAST_STAGE_ID)
}

export async function createRemarketingBroadcastJob(options: {
  createdBy: string
  templateId: string
  stageId?: string
  customMessage?: string | null
  leadIds?: string[]
}): Promise<{ job: BroadcastJobRow; skippedNoPhone: number }> {
  const db = assertSupabase()
  const stageId = (options.stageId || REMARKETING_BROADCAST_STAGE_ID).trim()
  const templateId = (options.templateId || DEFAULT_REMARKETING_TEMPLATE_ID).trim()
  if (!getRemarketingTemplateProfile(templateId)) {
    throw new Error(`Plantilla desconocida: ${templateId}`)
  }

  let leads = await fetchLeadsByStageId(stageId)
  if (options.leadIds?.length) {
    const allowed = new Set(options.leadIds)
    leads = leads.filter((l) => allowed.has(l.id))
  }

  if (leads.length === 0) {
    throw new Error(
      `No hay leads en etapa ${getBroadcastStageLabel(stageId)} para enviar`
    )
  }

  const { data: job, error: jobError } = await db
    .from('whatsapp_broadcast_jobs')
    .insert({
      created_by: options.createdBy,
      stage_id: stageId,
      template_id: templateId,
      custom_message: options.customMessage?.trim() || null,
      status: 'pending',
      total_count: leads.length,
    })
    .select('*')
    .single()

  if (jobError || !job) {
    throw new Error(jobError?.message || 'No se pudo crear la campaña')
  }

  const items = leads.map((lead) => ({
    job_id: job.id,
    lead_id: lead.id,
    lead_nombre: lead.nombre || null,
    telefono: lead.telefono || null,
    status: 'pending' as BroadcastItemStatus,
  }))

  for (let i = 0; i < items.length; i += ITEM_INSERT_CHUNK) {
    const chunk = items.slice(i, i + ITEM_INSERT_CHUNK)
    const { error: itemsError } = await db.from('whatsapp_broadcast_items').insert(chunk)
    if (itemsError) {
      await db.from('whatsapp_broadcast_jobs').delete().eq('id', job.id)
      throw new Error(`Error al encolar contactos: ${itemsError.message}`)
    }
  }

  logger.info('Remarketing broadcast job created', {
    jobId: job.id,
    total: leads.length,
    templateId,
  })

  return { job: job as BroadcastJobRow, skippedNoPhone: 0 }
}

async function refreshJobCounts(jobId: string): Promise<BroadcastJobRow> {
  const db = assertSupabase()

  const { data: items, error } = await db
    .from('whatsapp_broadcast_items')
    .select('status')
    .eq('job_id', jobId)

  if (error) {
    throw new Error(error.message)
  }

  const counts = { sent: 0, failed: 0, skipped: 0, pending: 0 }
  for (const item of items || []) {
    const s = item.status as BroadcastItemStatus
    if (s === 'sent') counts.sent++
    else if (s === 'failed') counts.failed++
    else if (s === 'skipped') counts.skipped++
    else counts.pending++
  }

  const status: BroadcastJobStatus =
    counts.pending === 0 ? 'completed' : 'processing'

  const { data: job, error: updateError } = await db
    .from('whatsapp_broadcast_jobs')
    .update({
      sent_count: counts.sent,
      failed_count: counts.failed,
      skipped_count: counts.skipped,
      status,
      updated_at: new Date().toISOString(),
      ...(counts.pending === 0 ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', jobId)
    .select('*')
    .single()

  if (updateError || !job) {
    throw new Error(updateError?.message || 'Error actualizando job')
  }

  return job as BroadcastJobRow
}

export async function processRemarketingBroadcastBatch(
  jobId: string,
  batchSize: number = BROADCAST_BATCH_SIZE
): Promise<{
  job: BroadcastJobRow
  processed: number
  items: BroadcastItemRow[]
}> {
  const db = assertSupabase()

  const { data: job, error: jobError } = await db
    .from('whatsapp_broadcast_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    throw new Error('Campaña no encontrada')
  }

  if (job.status === 'cancelled' || job.status === 'completed') {
    return { job: job as BroadcastJobRow, processed: 0, items: [] }
  }

  await db
    .from('whatsapp_broadcast_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)

  const { data: pendingItems, error: itemsError } = await db
    .from('whatsapp_broadcast_items')
    .select('*')
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const processedItems: BroadcastItemRow[] = []

  for (let i = 0; i < (pendingItems || []).length; i++) {
    const item = pendingItems![i] as BroadcastItemRow
    if (i > 0) {
      await sleep(BROADCAST_SEND_DELAY_MS)
    }

    const lead: PipelineNotifyLead = {
      id: item.lead_id,
      nombre: item.lead_nombre,
      telefono: item.telefono,
    }

    const result = await sendRemarketingWhatsAppToLead(lead, {
      templateId: job.template_id,
      customMessage: job.custom_message,
    })

    const now = new Date().toISOString()
    let update: Partial<BroadcastItemRow> & { status: BroadcastItemStatus }

    if (result.ok) {
      update = {
        status: 'sent',
        message_id: result.messageId,
        error_message: null,
        processed_at: now,
      }
    } else if (result.reason === 'no_phone') {
      update = {
        status: 'skipped',
        error_message: result.message,
        processed_at: now,
      }
    } else {
      update = {
        status: 'failed',
        error_message: result.message,
        processed_at: now,
      }
    }

    const { data: updated, error: updateError } = await db
      .from('whatsapp_broadcast_items')
      .update(update)
      .eq('id', item.id)
      .select('*')
      .single()

    if (updateError) {
      logger.error('Error updating broadcast item', { itemId: item.id, error: updateError.message })
    } else if (updated) {
      processedItems.push(updated as BroadcastItemRow)
    }
  }

  const refreshedJob = await refreshJobCounts(jobId)

  return {
    job: refreshedJob,
    processed: processedItems.length,
    items: processedItems,
  }
}

export async function getRemarketingBroadcastJob(jobId: string): Promise<{
  job: BroadcastJobRow
  items: BroadcastItemRow[]
}> {
  const db = assertSupabase()

  const { data: job, error: jobError } = await db
    .from('whatsapp_broadcast_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    throw new Error('Campaña no encontrada')
  }

  const { data: items, error: itemsError } = await db
    .from('whatsapp_broadcast_items')
    .select('*')
    .eq('job_id', jobId)
    .order('processed_at', { ascending: false, nullsFirst: false })
    .limit(200)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  return {
    job: job as BroadcastJobRow,
    items: (items || []) as BroadcastItemRow[],
  }
}

export async function listRemarketingBroadcastJobs(limit: number = 20): Promise<BroadcastJobRow[]> {
  const db = assertSupabase()

  const { data, error } = await db
    .from('whatsapp_broadcast_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as BroadcastJobRow[]
}

export async function cancelRemarketingBroadcastJob(jobId: string): Promise<BroadcastJobRow> {
  const db = assertSupabase()

  const { data, error } = await db
    .from('whatsapp_broadcast_jobs')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .in('status', ['pending', 'processing'])
    .select('*')
    .single()

  if (error || !data) {
    throw new Error('No se pudo cancelar la campaña (ya finalizó o no existe)')
  }

  return data as BroadcastJobRow
}
