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
  sendRemarketingWhatsAppToLead,
  type PipelineNotifyLead,
} from '@/server/services/uchat-pipeline-notify'

export const REMARKETING_BROADCAST_STAGE_ID = 'remarketing'
export const REMARKETING_PIPELINE_STAGE = 'REMARKETING'
export const BROADCAST_BATCH_SIZE = 5
export const BROADCAST_SEND_DELAY_MS = 800

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

async function fetchRemarketingLeads(): Promise<PipelineNotifyLead[]> {
  const db = assertSupabase()

  const { data: pipelines, error: pipelineError } = await db
    .from('lead_pipeline')
    .select('lead_id')
    .eq('current_stage', REMARKETING_PIPELINE_STAGE)

  if (pipelineError) {
    throw new Error(`Error al listar leads en Remarketing: ${pipelineError.message}`)
  }

  const leadIds = (pipelines || [])
    .map((p) => p.lead_id as string)
    .filter(Boolean)

  if (leadIds.length === 0) {
    return []
  }

  const { data: leads, error: leadsError } = await db
    .from('Lead')
    .select('id, nombre, telefono, manychatId')
    .in('id', leadIds)

  if (leadsError) {
    throw new Error(`Error al cargar contactos: ${leadsError.message}`)
  }

  return (leads || []).map((l) => ({
    id: l.id as string,
    nombre: l.nombre as string | null,
    telefono: l.telefono as string | null,
    manychatId: l.manychatId as string | null,
  }))
}

export async function countRemarketingBroadcastTargets(): Promise<number> {
  const leads = await fetchRemarketingLeads()
  return leads.length
}

export async function createRemarketingBroadcastJob(options: {
  createdBy: string
  templateId: string
  customMessage?: string | null
  leadIds?: string[]
}): Promise<{ job: BroadcastJobRow; skippedNoPhone: number }> {
  const db = assertSupabase()
  const templateId = (options.templateId || DEFAULT_REMARKETING_TEMPLATE_ID).trim()
  if (!getRemarketingTemplateProfile(templateId)) {
    throw new Error(`Plantilla desconocida: ${templateId}`)
  }

  let leads = await fetchRemarketingLeads()
  if (options.leadIds?.length) {
    const allowed = new Set(options.leadIds)
    leads = leads.filter((l) => allowed.has(l.id))
  }

  if (leads.length === 0) {
    throw new Error('No hay leads en etapa Remarketing para enviar')
  }

  const { data: job, error: jobError } = await db
    .from('whatsapp_broadcast_jobs')
    .insert({
      created_by: options.createdBy,
      stage_id: REMARKETING_BROADCAST_STAGE_ID,
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

  const { error: itemsError } = await db.from('whatsapp_broadcast_items').insert(items)
  if (itemsError) {
    await db.from('whatsapp_broadcast_jobs').delete().eq('id', job.id)
    throw new Error(`Error al encolar contactos: ${itemsError.message}`)
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
