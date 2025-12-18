import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { PipelineLead } from '@/types/pipeline'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { pipelineService } from '@/server/services/pipeline-service'
import { calculateTimeBasedScore } from '@/server/services/pipeline-scoring-service'

// Mapeo de pipeline_stage (enum de DB) a stageId (string usado en componente)
const pipelineStageToStageId: Record<string, string> = {
  'LEAD_NUEVO': 'nuevo',
  'CLIENTE_NUEVO': 'nuevo',
  'CONTACTO_INICIAL': 'contactado',
  'CONSULTANDO_CREDITO': 'contactado',
  'CALIFICACION': 'calificado',
  'SOLICITANDO_DOCS': 'calificado',
  'PRESENTACION': 'calificado',
  'LISTO_ANALISIS': 'propuesta',
  'PROPUESTA': 'propuesta',
  'PREAPROBADO': 'negociacion',
  'NEGOCIACION': 'negociacion',
  'APROBADO': 'negociacion',
  'CIERRE_GANADO': 'cerrado-ganado',
  'CERRADO_GANADO': 'cerrado-ganado',
  'CIERRE_PERDIDO': 'cerrado-perdido',
  'RECHAZADO': 'cerrado-perdido',
  'SEGUIMIENTO': 'cerrado-ganado'
}

// Mapeo inverso: stageId a pipeline_stage
const stageIdToPipelineStage: Record<string, string[]> = {
  'cliente-nuevo': ['LEAD_NUEVO', 'CLIENTE_NUEVO'],
  'consultando-credito': ['CONTACTO_INICIAL', 'CONSULTANDO_CREDITO'],
  'solicitando-docs': ['CALIFICACION', 'SOLICITANDO_DOCS'],
  'listo-analisis': ['LISTO_ANALISIS', 'PRESENTACION'],
  'preaprobado': ['PREAPROBADO'],
  'rechazado': ['RECHAZADO', 'CIERRE_PERDIDO'],
  'aprobado': ['APROBADO'],
  'en-seguimiento': ['SEGUIMIENTO'],
  'cerrado-ganado': ['CIERRE_GANADO', 'CERRADO_GANADO'],
  'solicitar-referido': ['SEGUIMIENTO']
}

// Función helper para mapear lead a PipelineLead (simplificada)
function mapLeadToPipelineLead(
  lead: any,
  pipelineInfo: { current_stage: string; stage_entered_at: string } | null,
  lastEvent: any = null,
  assignedTo?: string
): PipelineLead {
  let tags: any[] = []
  try {
    if (lead.tags) {
      tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags
    }
  } catch {
    tags = []
  }

  const stageId = pipelineInfo?.current_stage 
    ? (pipelineStageToStageId[pipelineInfo.current_stage] || 'nuevo')
    : 'nuevo'
  
  const stageEntryDate = pipelineInfo?.stage_entered_at 
    ? new Date(pipelineInfo.stage_entered_at)
    : new Date(lead.createdAt || Date.now())

  const lastActivity = lastEvent?.createdAt 
    ? new Date(lastEvent.createdAt)
    : new Date(lead.createdAt || Date.now())

  const timeScore = calculateTimeBasedScore(stageEntryDate, stageId)
  
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  if (timeScore.urgency === 'critical') priority = 'urgent'
  else if (timeScore.urgency === 'high') priority = 'high'
  else if (timeScore.urgency === 'low') priority = 'low'

  return {
    id: lead.id,
    nombre: lead.nombre,
    telefono: lead.telefono,
    email: lead.email || undefined,
    origen: lead.origen || 'web',
    estado: lead.estado,
    stageId,
    stageEntryDate,
    lastActivity,
    score: timeScore.score,
    tags: Array.isArray(tags) ? tags : [],
    customFields: lead.customFields ? (typeof lead.customFields === 'string' ? JSON.parse(lead.customFields) : lead.customFields) : undefined,
    notes: lead.notas || undefined,
    assignedTo: assignedTo || undefined,
    priority,
    value: lead.monto || undefined,
    probability: 10,
    activities: [],
    tasks: [],
    timeInStage: timeScore.daysInStage,
    urgency: timeScore.urgency,
    scoreColor: timeScore.color,
    scoreLabel: timeScore.label,
    cuil: lead.cuil || undefined
  } as PipelineLead & { timeInStage?: number; urgency?: string; scoreColor?: string; scoreLabel?: string; cuil?: string }
}

/**
 * GET /api/pipeline/stages/[stageId]/leads
 * Obtener leads de una etapa específica con paginación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { stageId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a los leads del pipeline'
      }, { status: 401 })
    }

    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a los leads del pipeline'
      }, { status: 403 })
    }

    const { stageId } = params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Mapear stageId a pipeline_stage
    const pipelineStages = stageIdToPipelineStage[stageId] || []
    
    if (pipelineStages.length === 0) {
      return NextResponse.json([])
    }

    // Obtener leads con pipeline en las etapas especificadas
    // Primero obtener los lead_ids de lead_pipeline que están en estas etapas
    const { supabaseClient } = await import('@/lib/db')
    if (!supabaseClient) {
      throw new Error('Supabase client not available')
    }

    // Obtener lead_ids de lead_pipeline que están en las etapas especificadas
    const { data: pipelines, error: pipelineError } = await supabaseClient
      .from('lead_pipeline')
      .select('lead_id, current_stage, stage_entered_at, assigned_to')
      .in('current_stage', pipelineStages)
      .range(offset, offset + limit - 1)

    if (pipelineError) {
      logger.error('Error fetching pipelines for stage', { error: pipelineError, stageId })
      return NextResponse.json({ error: 'Error al obtener leads de la etapa' }, { status: 500 })
    }

    if (!pipelines || pipelines.length === 0) {
      return NextResponse.json([], {
        headers: {
          'X-Total-Count': '0',
          'X-Page': page.toString(),
          'X-Limit': limit.toString(),
          'X-Has-More': 'false'
        }
      })
    }

    const leadIds = pipelines.map(p => p.lead_id).filter((id): id is string => id !== undefined)

    // Obtener total de leads en esta etapa para paginación
    const { count: totalCount } = await supabaseClient
      .from('lead_pipeline')
      .select('*', { count: 'exact', head: true })
      .in('current_stage', pipelineStages)

    // Obtener los leads y datos relacionados en paralelo
    const [leadsData, eventsMap] = await Promise.all([
      supabaseLeadService.getLeads({ limit: leadIds.length, offset: 0 }),
      supabaseLeadService.getLatestEventsByLeadIds(leadIds)
    ])

    const { leads } = leadsData

    // Crear mapas para acceso rápido
    const pipelineMap = new Map<string, { current_stage: string; stage_entered_at: string }>()
    const assignmentMap = new Map<string, string>()
    
    pipelines.forEach((p: any) => {
      if (p.lead_id && p.current_stage) {
        pipelineMap.set(p.lead_id, {
          current_stage: p.current_stage,
          stage_entered_at: p.stage_entered_at || new Date().toISOString()
        })
      }
      if (p.lead_id && p.assigned_to) {
        assignmentMap.set(p.lead_id, p.assigned_to)
      }
    })

    // Mapear leads a PipelineLead
    const pipelineLeads: PipelineLead[] = []
    for (const lead of leads) {
      if (!lead.id || !leadIds.includes(lead.id)) continue
      
      try {
        const leadId = lead.id as string
        const pipelineInfo = pipelineMap.get(leadId) || null
        const lastEvent = eventsMap.get(leadId) || null
        const assignedTo = assignmentMap.get(leadId)
        const mappedLead = mapLeadToPipelineLead(lead, pipelineInfo, lastEvent, assignedTo)
        pipelineLeads.push(mappedLead)
      } catch (error: any) {
        logger.error(`Error mapping lead ${lead.id}`, { error: error.message })
      }
    }

    return NextResponse.json(pipelineLeads, {
      headers: {
        'X-Total-Count': (totalCount || 0).toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
        'X-Has-More': (offset + limit < (totalCount || 0)).toString()
      }
    })

  } catch (error: any) {
    logger.error('Error getting stage leads', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener leads de la etapa'
    }, { status: 500 })
  }
}

