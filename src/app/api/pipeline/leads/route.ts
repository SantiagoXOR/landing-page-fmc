import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { PipelineLead } from '@/types/pipeline'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { pipelineService } from '@/server/services/pipeline-service'

// Mapeo de pipeline_stage (enum de DB) a stageId (string usado en componente)
const pipelineStageToStageId: Record<string, string> = {
  'LEAD_NUEVO': 'nuevo',
  'CONTACTO_INICIAL': 'contactado',
  'CALIFICACION': 'calificado',
  'PRESENTACION': 'calificado', // PRESENTACION se mapea a calificado ya que no hay etapa específica en el componente
  'PROPUESTA': 'propuesta',
  'NEGOCIACION': 'negociacion',
  'CIERRE_GANADO': 'cerrado-ganado',
  'CIERRE_PERDIDO': 'cerrado-perdido',
  'SEGUIMIENTO': 'cerrado-ganado' // SEGUIMIENTO se mapea a cerrado-ganado ya que no hay etapa específica
}

// Mapeo inverso: stageId a pipeline_stage (para filtros)
const stageIdToPipelineStage: Record<string, string[]> = {
  'nuevo': ['LEAD_NUEVO'],
  'contactado': ['CONTACTO_INICIAL'],
  'calificado': ['CALIFICACION', 'PRESENTACION'],
  'propuesta': ['PROPUESTA'],
  'negociacion': ['NEGOCIACION'],
  'cerrado-ganado': ['CIERRE_GANADO', 'SEGUIMIENTO'],
  'cerrado-perdido': ['CIERRE_PERDIDO']
}

// Mapeo de estados de leads a etapas del pipeline (fallback si no hay pipeline)
const estadoToStageId: Record<string, string> = {
  'NUEVO': 'nuevo',
  'CONTACTADO': 'contactado',
  'EN_REVISION': 'calificado',
  'CALIFICADO': 'calificado',
  'PREAPROBADO': 'propuesta',
  'PROPUESTA': 'propuesta',
  'NEGOCIACION': 'negociacion',
  'DOC_PENDIENTE': 'propuesta',
  'RECHAZADO': 'cerrado-perdido',
  'DERIVADO': 'cerrado-ganado'
}

// Función para obtener probabilidad por etapa
function getProbabilityForStage(stageId: string): number {
  const probabilities: Record<string, number> = {
    'nuevo': 10,
    'contactado': 20,
    'calificado': 30,
    'propuesta': 70,
    'negociacion': 80,
    'ganado': 100,
    'perdido': 0,
    'seguimiento': 100
  }
  return probabilities[stageId] || 10
}

// Función para mapear lead a PipelineLead
// IMPORTANTE: Usa current_stage de lead_pipeline como fuente de verdad
// Si no hay pipeline, usa el estado del lead como fallback
function mapLeadToPipelineLead(
  lead: any, 
  pipelineInfo: { current_stage: string; stage_entered_at: string } | null,
  lastEvent: any = null, 
  assignedTo?: string
): PipelineLead {
  // Determinar stageId: usar current_stage del pipeline si existe, sino mapear desde estado del lead
  let stageId: string
  let stageEntryDate: Date

  if (pipelineInfo && pipelineInfo.current_stage) {
    // Usar current_stage del pipeline como fuente de verdad
    stageId = pipelineStageToStageId[pipelineInfo.current_stage] || 'nuevo'
    stageEntryDate = new Date(pipelineInfo.stage_entered_at || lead.createdAt)
    
    // Log si el current_stage no está mapeado
    if (!pipelineStageToStageId[pipelineInfo.current_stage]) {
      logger.warn(`Pipeline stage no mapeado: "${pipelineInfo.current_stage}" - Asignado a etapa "nuevo"`, {
        leadId: lead.id,
        currentStage: pipelineInfo.current_stage
      })
    }
  } else {
    // Fallback: mapear desde estado del lead
    const estadoNormalizado = lead.estado ? String(lead.estado).trim().toUpperCase() : 'NUEVO'
    stageId = estadoToStageId[estadoNormalizado] || 'nuevo'
    stageEntryDate = new Date(lead.createdAt)
    
    // Log para debugging si el estado no está mapeado
    if (!estadoToStageId[estadoNormalizado] && lead.estado) {
      logger.warn(`Estado no mapeado encontrado: "${lead.estado}" (normalizado: "${estadoNormalizado}") - Asignado a etapa "nuevo"`, {
        leadId: lead.id
      })
    }
  }

  const tags = lead.tags ? (typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags) : []
  
  // Usar el evento más reciente pasado como parámetro, o la fecha de creación del lead
  const lastActivity = lastEvent ? new Date(lastEvent.createdAt) : new Date(lead.createdAt)
  
  // Parsear custom fields si existen
  let customFields: Record<string, any> = {}
  if (lead.customFields) {
    try {
      customFields = typeof lead.customFields === 'string' 
        ? JSON.parse(lead.customFields) 
        : lead.customFields
    } catch (e) {
      // Ignorar errores de parsing
    }
  }

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
    score: undefined, // Se puede calcular después
    tags: Array.isArray(tags) ? tags : [],
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    notes: lead.notas || undefined,
    assignedTo: assignedTo || undefined,
    priority: 'medium' as const, // Se puede calcular basado en score o valor
    value: lead.monto || undefined,
    probability: getProbabilityForStage(stageId),
    activities: [],
    tasks: []
  }
}

// Datos de ejemplo eliminados - Ahora se usan datos reales de la base de datos

/**
 * GET /api/pipeline/leads
 * Obtener leads del pipeline con filtros opcionales
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a los leads del pipeline'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a los leads del pipeline'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de filtro
    const stageId = searchParams.get('stageId')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')
    const search = searchParams.get('search')

    // Construir filtros para la consulta de leads
    // Para el pipeline, necesitamos obtener todos los leads sin límite estricto
    const filters: any = {
      limit: 1000, // Límite aumentado para incluir todos los leads del pipeline
      offset: 0
    }

    // Si hay stageId, mapear a pipeline_stage correspondientes para filtrar en la consulta
    // Nota: El filtro real se hará después de obtener los datos del pipeline
    // Por ahora no aplicamos filtro aquí ya que necesitamos obtener todos los leads primero

    if (search) {
      filters.search = search
    }

    // Obtener leads reales de la base de datos
    const { leads, total } = await supabaseLeadService.getLeads(filters)

    // Obtener el evento más reciente por cada lead para calcular lastActivity
    // Filtrar undefined para cumplir con el tipo string[] requerido
    const leadIds = leads.map(l => l.id).filter((id): id is string => id !== undefined)
    
    // Obtener información del pipeline para todos los leads (current_stage)
    const pipelineMap = await supabaseLeadService.getLeadPipelines(leadIds)
    
    // Obtener el evento más reciente para cada lead usando Supabase REST API
    // Esto asegura que cada lead tenga su evento más reciente, incluso si tiene muchos eventos antiguos
    const eventsMap = leadIds.length > 0 
      ? await supabaseLeadService.getLatestEventsByLeadIds(leadIds)
      : new Map<string, any>()

    // Obtener asignaciones de leads (assignedTo) desde lead_pipeline
    // Nota: lead_pipeline puede no existir para todos los leads, el método maneja errores gracefully
    const assignmentMap = await supabaseLeadService.getLeadAssignments(leadIds)

    // Crear pipelines para leads que no los tienen
    const leadsWithoutPipeline: string[] = []
    leadIds.forEach(leadId => {
      if (!pipelineMap.has(leadId)) {
        leadsWithoutPipeline.push(leadId)
      }
    })

    // Crear pipelines automáticamente para leads que no los tienen
    if (leadsWithoutPipeline.length > 0 && session.user?.id) {
      logger.info(`Creando pipelines automáticamente para ${leadsWithoutPipeline.length} leads sin pipeline`)
      const createPipelinePromises = leadsWithoutPipeline.map(async (leadId) => {
        try {
          await pipelineService.createLeadPipeline(leadId, session.user.id)
          // Obtener el pipeline recién creado
          const newPipeline = await pipelineService.getLeadPipeline(leadId)
          if (newPipeline) {
            pipelineMap.set(leadId, {
              current_stage: newPipeline.current_stage,
              stage_entered_at: newPipeline.stage_entered_at
            })
          }
        } catch (error) {
          logger.error(`Error creando pipeline para lead ${leadId}:`, error)
          // Continuar con otros leads aunque falle uno
        }
      })
      await Promise.allSettled(createPipelinePromises)
    }

    // Mapear leads a PipelineLead usando current_stage del pipeline como fuente de verdad
    // Filtrar leads sin id para evitar errores de tipo
    let pipelineLeads = leads
      .filter(lead => lead.id !== undefined)
      .map(lead => {
        const leadId = lead.id as string // Type assertion seguro después del filter
        const pipelineInfo = pipelineMap.get(leadId) || null
        const lastEvent = eventsMap.get(leadId) || null
        return mapLeadToPipelineLead(lead, pipelineInfo, lastEvent, assignmentMap.get(leadId))
      })

    // Aplicar filtro por stageId si se especificó
    if (stageId) {
      pipelineLeads = pipelineLeads.filter(lead => lead.stageId === stageId)
    }

    // Aplicar filtros adicionales que no están en la base de datos
    if (priority) {
      pipelineLeads = pipelineLeads.filter(lead => lead.priority === priority)
    }

    if (assignedTo) {
      pipelineLeads = pipelineLeads.filter(lead => lead.assignedTo === assignedTo)
    }

    // Agrupar leads por estado original y stageId para debugging
    const leadsByEstado = leads.reduce((acc, lead) => {
      const estado = lead.estado || 'SIN_ESTADO'
      acc[estado] = (acc[estado] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const leadsByStage = pipelineLeads.reduce((acc, lead) => {
      acc[lead.stageId] = (acc[lead.stageId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Contar leads con y sin pipeline
    const leadsWithPipeline = Array.from(pipelineMap.keys()).length
    const leadsWithoutPipelineCount = leads.length - leadsWithPipeline

    logger.info('Pipeline leads requested', {
      userId: session.user.id,
      userName: session.user.name,
      filters: { stageId, priority, assignedTo, search },
      resultCount: pipelineLeads.length,
      totalLeads: total,
      leadsWithPipeline,
      leadsWithoutPipeline: leadsWithoutPipelineCount,
      leadsByEstado,
      leadsByStage,
      pipelineStageMapping: Object.entries(pipelineStageToStageId),
      sampleLeads: pipelineLeads.slice(0, 3).map(l => ({
        id: l.id,
        nombre: l.nombre,
        stageId: l.stageId,
        estado: l.estado
      }))
    })

    // Devolver los leads del pipeline
    return NextResponse.json(pipelineLeads)

  } catch (error: any) {
    logger.error('Error getting pipeline leads', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener leads del pipeline'
    }, { status: 500 })
  }
}
