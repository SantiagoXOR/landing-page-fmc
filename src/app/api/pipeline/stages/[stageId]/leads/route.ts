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
// NOTA: Solo usar valores del enum actualizado (según migración 002_update_pipeline_stages_manychat.sql)
// Enum válido: CLIENTE_NUEVO, CONSULTANDO_CREDITO, SOLICITANDO_DOCS, LISTO_ANALISIS, 
//              PREAPROBADO, APROBADO, EN_SEGUIMIENTO, CERRADO_GANADO, ENCUESTA, RECHAZADO, SOLICITAR_REFERIDO
const stageIdToPipelineStage: Record<string, string[]> = {
  'cliente-nuevo': ['CLIENTE_NUEVO'], // Removido 'LEAD_NUEVO' que no existe en el enum
  'consultando-credito': ['CONSULTANDO_CREDITO'], // Removido 'CONTACTO_INICIAL' que no existe en el enum
  'solicitando-docs': ['SOLICITANDO_DOCS'], // Removido 'CALIFICACION' que no existe en el enum
  'listo-analisis': ['LISTO_ANALISIS'], // Removido 'PRESENTACION' que no existe en el enum
  'preaprobado': ['PREAPROBADO'],
  'rechazado': ['RECHAZADO'], // Removido 'CIERRE_PERDIDO' que no existe en el enum
  'aprobado': ['APROBADO'],
  'en-seguimiento': ['EN_SEGUIMIENTO'], // Cambiado de 'SEGUIMIENTO' a 'EN_SEGUIMIENTO'
  'cerrado-ganado': ['CERRADO_GANADO'], // Removido 'CIERRE_GANADO' que no existe en el enum
  'solicitar-referido': ['SOLICITAR_REFERIDO'] // Cambiado de 'SEGUIMIENTO' a 'SOLICITAR_REFERIDO'
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
  
  // Asegurar que createdAt esté disponible como string ISO
  const createdAtISO = lead.createdAt 
    ? (typeof lead.createdAt === 'string' ? lead.createdAt : new Date(lead.createdAt).toISOString())
    : new Date().toISOString()

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
    stageEntryDate: typeof stageEntryDate === 'string' ? stageEntryDate : stageEntryDate.toISOString(),
    lastActivity: typeof lastActivity === 'string' ? lastActivity : lastActivity.toISOString(),
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
    cuil: lead.cuil || undefined,
    createdAt: createdAtISO
  } as PipelineLead & { timeInStage?: number; urgency?: string; scoreColor?: string; scoreLabel?: string; cuil?: string; createdAt?: string }
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
      logger.warn('No pipeline stages found for stageId', { stageId })
      return NextResponse.json([], {
        headers: {
          'X-Total-Count': '0',
          'X-Page': page.toString(),
          'X-Limit': limit.toString(),
          'X-Has-More': 'false'
        }
      })
    }

    // Validar que los stages sean strings válidos
    const validStages = pipelineStages.filter(stage => typeof stage === 'string' && stage.length > 0)
    if (validStages.length === 0) {
      logger.error('No valid pipeline stages after filtering', { stageId, pipelineStages })
      return NextResponse.json({ 
        error: 'Invalid stage configuration',
        message: `No valid pipeline stages found for stageId: ${stageId}`
      }, { status: 400 })
    }

    // Obtener leads con pipeline en las etapas especificadas
    // Primero obtener los lead_ids de lead_pipeline que están en estas etapas
    const { supabaseClient } = await import('@/lib/db')
    if (!supabaseClient) {
      const hasUrl = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
      const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
      logger.error('Supabase client not available', {
        hasUrl,
        hasKey,
        nodeEnv: process.env.NODE_ENV
      })
      return NextResponse.json({ 
        error: 'Database not configured',
        message: 'La base de datos no está configurada correctamente',
        details: `URL: ${hasUrl ? '✅' : '❌'}, Key: ${hasKey ? '✅' : '❌'}`
      }, { status: 500 })
    }

    // Obtener lead_ids de lead_pipeline que están en las etapas especificadas
    // Usar solo los stages válidos
    logger.debug('Fetching pipelines for stage', { stageId, validStages, offset, limit })
    const { data: pipelines, error: pipelineError } = await supabaseClient
      .from('lead_pipeline')
      .select('lead_id, current_stage, stage_entered_at, assigned_to')
      .in('current_stage', validStages)
      .range(offset, offset + limit - 1)
    
    logger.debug('Pipelines fetched', { 
      stageId, 
      pipelinesCount: pipelines?.length || 0,
      samplePipelineStages: pipelines?.slice(0, 3).map((p: any) => p.current_stage) || []
    })

    if (pipelineError) {
      logger.error('Error fetching pipelines for stage', { 
        error: pipelineError, 
        stageId,
        pipelineStages,
        errorMessage: pipelineError.message,
        errorDetails: pipelineError.details,
        errorHint: pipelineError.hint
      })
      
      // En desarrollo, incluir más detalles del error
      const isDevelopment = process.env.NODE_ENV === 'development'
      return NextResponse.json({ 
        error: 'Error al obtener leads de la etapa',
        ...(isDevelopment && {
          details: pipelineError.message,
          hint: pipelineError.hint,
          stageId,
          pipelineStages
        })
      }, { status: 500 })
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

    if (leadIds.length === 0) {
      return NextResponse.json([], {
        headers: {
          'X-Total-Count': '0',
          'X-Page': page.toString(),
          'X-Limit': limit.toString(),
          'X-Has-More': 'false'
        }
      })
    }

    // Obtener total de leads en esta etapa para paginación
    const { count: totalCount, error: countError } = await supabaseClient
      .from('lead_pipeline')
      .select('*', { count: 'exact', head: true })
      .in('current_stage', validStages)
    
    if (countError) {
      logger.error('Error counting pipelines for stage', { 
        error: countError, 
        stageId,
        validStages 
      })
      // Continuar con count = 0 si falla el conteo
    }

    // Obtener los leads directamente de Supabase filtrando por los IDs específicos
    // Esto evita problemas con caché y asegura que obtenemos los leads correctos
    logger.debug('Fetching leads by IDs', { 
      leadIdsCount: leadIds.length,
      sampleLeadIds: leadIds.slice(0, 3)
    })
    
    const { data: leadsData, error: leadsError } = await supabaseClient
      .from('Lead')
      .select('*')
      .in('id', leadIds)

    if (leadsError) {
      logger.error('Error fetching leads by IDs', { 
        error: leadsError, 
        leadIds: leadIds.slice(0, 5), // Log solo los primeros 5 para no saturar
        leadIdsCount: leadIds.length
      })
      return NextResponse.json({ 
        error: 'Error al obtener leads',
        message: leadsError.message
      }, { status: 500 })
    }

    const leads = leadsData || []
    logger.debug('Leads fetched', { 
      leadsCount: leads.length,
      expectedCount: leadIds.length,
      sampleLeadIds: leads.slice(0, 3).map((l: any) => l.id)
    })

    // Obtener eventos en paralelo
    const eventsMap = await supabaseLeadService.getLatestEventsByLeadIds(leadIds)

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

    // Ordenar por fecha de entrada A LA ETAPA (stage_entered_at): más antiguos en la etapa primero
    // Prioritarios (urgent/high que llevan <24h en la etapa) arriba, ordenados por stageEntryDate ascendente
    // Resto debajo, también por stageEntryDate ascendente (quien más tiempo lleva esperando, primero)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const priorityLeadsWith24hWindow: PipelineLead[] = []
    const otherLeads: PipelineLead[] = []

    for (const pipelineLead of pipelineLeads) {
      const isPriority = pipelineLead.priority === 'high' || pipelineLead.priority === 'urgent'
      const stageEntry = pipelineLead.stageEntryDate ? new Date(pipelineLead.stageEntryDate).getTime() : 0
      const enteredThisStageRecently = stageEntry && stageEntry >= twentyFourHoursAgo.getTime()

      if (isPriority && enteredThisStageRecently) {
        priorityLeadsWith24hWindow.push(pipelineLead)
      } else {
        otherLeads.push(pipelineLead)
      }
    }

    const sortByStageEntryAsc = (a: PipelineLead, b: PipelineLead) => {
      const dateA = a.stageEntryDate ? new Date(a.stageEntryDate).getTime() : 0
      const dateB = b.stageEntryDate ? new Date(b.stageEntryDate).getTime() : 0
      return dateA - dateB // Ascendente: más antiguos en la etapa primero
    }

    priorityLeadsWith24hWindow.sort(sortByStageEntryAsc)
    otherLeads.sort(sortByStageEntryAsc)

    const sortedPipelineLeads = [...priorityLeadsWith24hWindow, ...otherLeads]

    return NextResponse.json(sortedPipelineLeads, {
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
      stack: error.stack,
      errorName: error.name,
      stageId: params?.stageId,
      errorDetails: error.details || error.hint || error
    })

    // En desarrollo, incluir más detalles del error
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener leads de la etapa',
      ...(isDevelopment && {
        details: error.message,
        errorName: error.name,
        stack: error.stack,
        stageId: params?.stageId
      })
    }, { status: 500 })
  }
}

