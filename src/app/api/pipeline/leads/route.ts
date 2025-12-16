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
  'PRESENTACION': 'calificado', // PRESENTACION se mapea a calificado ya que no hay etapa específica en el componente
  'LISTO_ANALISIS': 'propuesta',
  'PROPUESTA': 'propuesta',
  'PREAPROBADO': 'negociacion',
  'NEGOCIACION': 'negociacion',
  'APROBADO': 'negociacion',
  'CIERRE_GANADO': 'cerrado-ganado',
  'CERRADO_GANADO': 'cerrado-ganado',
  'CIERRE_PERDIDO': 'cerrado-perdido',
  'RECHAZADO': 'cerrado-perdido',
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

// Mapeo de tags a stageId interno (luego se mapea a ID real de etapa)
const tagToStageId: Record<string, string> = {
  // Tags de Manychat comunes
  'lead-consultando': 'contactado', // Se mapeará a 'consultando-credito'
  'consultando-credito': 'contactado',
  'consultando': 'contactado',
  'solicitud-en-proceso': 'propuesta', // Se mapeará a 'listo-analisis'
  'solicitando-docs': 'calificado', // Se mapeará a 'solicitando-docs'
  'solicitando-documentacion': 'calificado',
  'documentacion': 'calificado',
  'listo-para-analisis': 'propuesta',
  'listo-analisis': 'propuesta',
  'preaprobado': 'negociacion', // Se mapeará a 'preaprobado'
  'pre-aprobado': 'negociacion',
  'aprobado': 'negociacion',
  'cerrado-ganado': 'cerrado-ganado',
  'venta-concretada': 'cerrado-ganado',
  'rechazado': 'cerrado-perdido', // Se mapeará a 'rechazado'
  'credito-rechazado': 'cerrado-perdido', // Se mapeará a 'rechazado'
  'rechazado-credito': 'cerrado-perdido',
  'perdido': 'cerrado-perdido',
  'nuevo-lead': 'nuevo', // Se mapeará a 'cliente-nuevo'
  'nuevo': 'nuevo',
  'contactado': 'contactado',
  'calificado': 'calificado',
  'propuesta-enviada': 'propuesta',
  'negociacion': 'negociacion'
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
  // Parsear tags primero para poder usarlos en la lógica
  let tags: any[] = []
  try {
    if (lead.tags) {
      if (typeof lead.tags === 'string') {
        tags = JSON.parse(lead.tags)
      } else {
        tags = lead.tags
      }
    }
  } catch (e) {
    logger.warn(`Error parsing tags for lead ${lead.id}`, { error: e, tags: lead.tags })
    tags = []
  }
  const tagsArray = Array.isArray(tags) ? tags : []

  // Determinar stageId: priorizar tags si el pipeline está en etapa inicial, sino usar current_stage del pipeline
  let stageId: string = 'nuevo'
  let stageEntryDate: Date = new Date()

  // Helper para crear fecha válida
  const createValidDate = (dateValue: any): Date => {
    try {
      if (!dateValue) return new Date()
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return new Date()
      return date
    } catch {
      return new Date()
    }
  }

  // Etapas iniciales que pueden ser sobrescritas por tags
  const initialStages = ['LEAD_NUEVO', 'CLIENTE_NUEVO']
  
  // Intentar mapear desde tags primero (tiene prioridad si hay tags relevantes)
  let stageFromTag: string | null = null
  for (const tag of tagsArray) {
    const tagLower = String(tag).toLowerCase().trim()
    if (tagToStageId[tagLower]) {
      stageFromTag = tagToStageId[tagLower]
      break
    }
  }

  if (pipelineInfo && pipelineInfo.current_stage) {
    const pipelineStageId = pipelineStageToStageId[pipelineInfo.current_stage] || 'nuevo'
    
    // Priorizar tags sobre pipeline: si hay un tag que indica una etapa, usar el tag
    // Esto asegura que los leads se asignen correctamente según sus tags, incluso si tienen pipeline con otra etapa
    if (stageFromTag) {
      const tagStageId = stageFromTag
      
      // Si el tag indica una etapa diferente a la del pipeline, o el pipeline está en etapa inicial, usar el tag
      if (tagStageId !== pipelineStageId || initialStages.includes(pipelineInfo.current_stage)) {
        stageId = tagStageId
        stageEntryDate = createValidDate(pipelineInfo.stage_entered_at || lead.createdAt)
        logger.info(`Lead reasignado desde etapa "${pipelineInfo.current_stage}" (${pipelineStageId}) a "${tagStageId}" basado en tag`, {
          leadId: lead.id,
          tags: tagsArray,
          originalStage: pipelineInfo.current_stage,
          originalStageId: pipelineStageId,
          newStageId: tagStageId
        })
      } else {
        // El pipeline y el tag coinciden, usar el pipeline
        stageId = pipelineStageId
        stageEntryDate = createValidDate(pipelineInfo.stage_entered_at || lead.createdAt)
      }
    } else {
      // No hay tag relevante, usar current_stage del pipeline como fuente de verdad
      stageId = pipelineStageId
      stageEntryDate = createValidDate(pipelineInfo.stage_entered_at || lead.createdAt)
      
      // Log si el current_stage no está mapeado
      if (!pipelineStageToStageId[pipelineInfo.current_stage]) {
        logger.warn(`Pipeline stage no mapeado: "${pipelineInfo.current_stage}" - Asignado a etapa "nuevo"`, {
          leadId: lead.id,
          currentStage: pipelineInfo.current_stage
        })
      }
    }
  } else {
    // No hay pipeline info: usar tags o estado del lead
    if (stageFromTag) {
      stageId = stageFromTag
      stageEntryDate = createValidDate(lead.createdAt)
      logger.info(`Lead asignado a etapa desde tag: "${stageId}"`, {
        leadId: lead.id,
        tags: tagsArray
      })
    } else {
      // Fallback: mapear desde estado del lead
      const estadoNormalizado = lead.estado ? String(lead.estado).trim().toUpperCase() : 'NUEVO'
      stageId = estadoToStageId[estadoNormalizado] || 'nuevo'
      stageEntryDate = createValidDate(lead.createdAt)
      
      // Log para debugging si el estado no está mapeado
      if (!estadoToStageId[estadoNormalizado] && lead.estado) {
        logger.warn(`Estado no mapeado encontrado: "${lead.estado}" (normalizado: "${estadoNormalizado}") - Asignado a etapa "nuevo"`, {
          leadId: lead.id,
          tags: tagsArray
        })
      }
    }
  }
  
  // Usar el evento más reciente pasado como parámetro, o la fecha de creación del lead
  let lastActivity: Date
  try {
    if (lastEvent && lastEvent.createdAt) {
      lastActivity = new Date(lastEvent.createdAt)
      if (isNaN(lastActivity.getTime())) {
        throw new Error('Invalid date')
      }
    } else if (lead.createdAt) {
      lastActivity = new Date(lead.createdAt)
      if (isNaN(lastActivity.getTime())) {
        throw new Error('Invalid date')
      }
    } else {
      lastActivity = new Date()
    }
  } catch (e) {
    logger.warn(`Error parsing date for lead ${lead.id}`, { error: e, createdAt: lead.createdAt, lastEvent })
    lastActivity = new Date()
  }
  
  // Parsear custom fields si existen
  let customFields: Record<string, any> = {}
  if (lead.customFields) {
    try {
      const parsed = typeof lead.customFields === 'string' 
        ? JSON.parse(lead.customFields) 
        : lead.customFields
      
      // Normalizar custom fields: si vienen como objetos Manychat con estructura {id, name, value, ...}
      // extraer solo el valor
      Object.entries(parsed).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          customFields[key] = value
          return
        }
        
        // Si es un objeto Manychat con estructura {id, name, type, description, value}
        if (typeof value === 'object' && value !== null && 'value' in value) {
          customFields[key] = value.value
        } else {
          customFields[key] = value
        }
      })
      
      // Log para debugging si hay muchos customFields
      if (Object.keys(customFields).length > 0) {
        logger.debug(`CustomFields normalizados para lead ${lead.id}`, {
          leadId: lead.id,
          leadNombre: lead.nombre,
          customFieldsKeys: Object.keys(customFields),
          customFieldsSample: Object.fromEntries(Object.entries(customFields).slice(0, 3))
        })
      }
    } catch (e) {
      logger.warn(`Error parseando customFields para lead ${lead.id}`, { 
        error: e instanceof Error ? e.message : String(e),
        leadId: lead.id 
      })
    }
  }
  
  // Función helper para extraer CUIL/CUIT/DNI de un valor (puede estar dentro de texto)
  const extractCUILOrDNI = (value: any): string | null => {
    if (!value) return null
    
    const strValue = String(value).trim()
    if (!strValue || strValue === '') return null
    
    // Buscar patrón CUIL/CUIT con formato XX-XXXXXXXX-X
    const cuilWithDashes = strValue.match(/\b\d{2}-\d{8}-\d{1}\b/)
    if (cuilWithDashes) {
      return cuilWithDashes[0]
    }
    
    // Buscar patrón CUIL/CUIT sin guiones (11 dígitos consecutivos)
    const cuilWithoutDashes = strValue.match(/\b\d{11}\b/)
    if (cuilWithoutDashes) {
      const digits = cuilWithoutDashes[0]
      // Validar que tenga formato de CUIL/CUIT (XX-XXXXXXXX-X)
      if (/^\d{2}\d{8}\d{1}$/.test(digits)) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
      }
    }
    
    // Buscar DNI (8 dígitos) - solo si no encontramos CUIL/CUIT
    const dni = strValue.match(/\b\d{8}\b/)
    if (dni && !cuilWithDashes && !cuilWithoutDashes) {
      return dni[0]
    }
    
    return null
  }
  
  // Función helper para detectar si un valor parece ser un CUIL/CUIT/DNI
  const looksLikeCUILOrDNI = (value: any): boolean => {
    return extractCUILOrDNI(value) !== null
  }
  
  // Extraer CUIL/DNI de customFields si no está en el campo directo
  // Buscar en claves conocidas primero
  let cuilValue = lead.cuil || customFields.cuit || customFields.cuil || customFields.dni
  
  // Si no se encontró, buscar en todos los valores de customFields por patrón
  if (!cuilValue) {
    try {
      for (const [key, value] of Object.entries(customFields)) {
        if (value === null || value === undefined || value === '') continue
        
        let normalizedValue: any
        try {
          // Si el valor es un objeto Manychat con estructura {id, name, value, ...}
          normalizedValue = typeof value === 'object' && value !== null && 'value' in value ? value.value : value
        } catch (e) {
          normalizedValue = value
        }
        
        // Intentar extraer CUIL/DNI del valor (puede estar dentro de texto)
        const extracted = extractCUILOrDNI(normalizedValue)
        if (extracted) {
          cuilValue = extracted
          logger.info(`CUIL/DNI encontrado en customField[${key}] para lead ${lead.id}`, {
            leadId: lead.id,
            leadNombre: lead.nombre,
            customFieldKey: key,
            customFieldValue: normalizedValue,
            extractedCUIL: extracted
          })
          break
        }
      }
    } catch (e) {
      logger.warn(`Error searching for CUIL/DNI in customFields for lead ${lead.id}`, { error: e })
    }
  } else {
    // Si ya tenemos un valor, intentar extraerlo en caso de que tenga formato incorrecto
    const extracted = extractCUILOrDNI(cuilValue)
    if (extracted) {
      cuilValue = extracted
    }
  }
  
  cuilValue = cuilValue || undefined
  
  // Log si no se encontró CUIL pero hay customFields (para debugging)
  if (!cuilValue && Object.keys(customFields).length > 0) {
    logger.debug(`No se encontró CUIL/DNI para lead ${lead.id}`, {
      leadId: lead.id,
      leadNombre: lead.nombre,
      leadCuil: lead.cuil,
      customFieldsKeys: Object.keys(customFields),
      customFieldsValues: Object.values(customFields).slice(0, 5) // Primeros 5 valores para debugging
    })
  }

  // Calcular score basado en tiempo en etapa
  let timeScore: any
  try {
    // Validar que stageEntryDate sea una fecha válida
    if (!stageEntryDate || isNaN(stageEntryDate.getTime())) {
      logger.warn(`Invalid stageEntryDate for lead ${lead.id}, using current date`, { stageEntryDate })
      stageEntryDate = new Date()
    }
    timeScore = calculateTimeBasedScore(stageEntryDate, stageId)
  } catch (e) {
    logger.error(`Error calculating time score for lead ${lead.id}`, { error: e, stageEntryDate, stageId })
    // Usar valores por defecto si falla el cálculo
    timeScore = {
      score: 0,
      daysInStage: 0,
      urgency: 'low',
      color: 'gray',
      label: 'Sin datos'
    }
  }
  
  // Determinar prioridad basada en score de tiempo
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  if (timeScore.urgency === 'critical') {
    priority = 'urgent'
  } else if (timeScore.urgency === 'high') {
    priority = 'high'
  } else if (timeScore.urgency === 'low') {
    priority = 'low'
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
    score: timeScore.score, // Score basado en tiempo en etapa
    tags: Array.isArray(tags) ? tags : [],
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    notes: lead.notas || undefined,
    assignedTo: assignedTo || undefined,
    priority,
    value: lead.monto || undefined,
    probability: getProbabilityForStage(stageId),
    activities: [],
    tasks: [],
    // Agregar información adicional de scoring
    timeInStage: timeScore.daysInStage,
    urgency: timeScore.urgency,
    scoreColor: timeScore.color,
    scoreLabel: timeScore.label,
    cuil: cuilValue // Agregar CUIL (puede venir del campo directo o de customFields)
  } as PipelineLead & { timeInStage?: number; urgency?: string; scoreColor?: string; scoreLabel?: string; cuil?: string }
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
    const tags = searchParams.get('tags') // Comma-separated tag IDs
    const timeInStageMin = searchParams.get('timeInStageMin')
    const timeInStageMax = searchParams.get('timeInStageMax')
    const scoreMin = searchParams.get('scoreMin')
    const scoreMax = searchParams.get('scoreMax')

    // Construir filtros para la consulta de leads
    // Optimización: Reducir límite inicial para carga más rápida
    // Si se necesita más, se puede usar paginación por etapa
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '200')
    const offset = (page - 1) * limit
    
    const filters: any = {
      limit,
      offset
    }

    if (search) {
      filters.search = search
    }

    // Obtener leads reales de la base de datos
    const { leads, total } = await supabaseLeadService.getLeads(filters)

    // Obtener el evento más reciente por cada lead para calcular lastActivity
    // Filtrar undefined para cumplir con el tipo string[] requerido
    const leadIds = leads.map(l => l.id).filter((id): id is string => id !== undefined)
    
    // Optimización: Ejecutar todas las queries en paralelo en lugar de secuencialmente
    // Esto reduce significativamente el tiempo de carga
    const [pipelineMap, eventsMap, assignmentMap] = await Promise.all([
      supabaseLeadService.getLeadPipelines(leadIds),
      leadIds.length > 0 
        ? supabaseLeadService.getLatestEventsByLeadIds(leadIds)
        : Promise.resolve(new Map<string, any>()),
      supabaseLeadService.getLeadAssignments(leadIds)
    ])

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
    let pipelineLeads: PipelineLead[] = []
    for (const lead of leads) {
      if (!lead.id) {
        logger.warn('Skipping lead without id', { lead })
        continue
      }
      try {
        const leadId = lead.id as string
        const pipelineInfo = pipelineMap.get(leadId) || null
        const lastEvent = eventsMap.get(leadId) || null
        const mappedLead = mapLeadToPipelineLead(lead, pipelineInfo, lastEvent, assignmentMap.get(leadId))
        pipelineLeads.push(mappedLead)
      } catch (error: any) {
        logger.error(`Error mapping lead ${lead.id} to PipelineLead`, {
          error: error.message,
          stack: error.stack,
          leadId: lead.id,
          leadNombre: lead.nombre
        })
        // Continuar con el siguiente lead en lugar de fallar completamente
      }
    }

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

    // Filtro por tags
    if (tags) {
      const tagIds = tags.split(',').map(t => t.trim())
      pipelineLeads = pipelineLeads.filter(lead => {
        const leadTags = lead.tags || []
        return tagIds.some(tagId => 
          leadTags.some(tag => tag === tagId || tag.includes(tagId))
        )
      })
    }

    // Filtro por tiempo en etapa (ya calculado en el score)
    if (timeInStageMin || timeInStageMax) {
      pipelineLeads = pipelineLeads.filter(lead => {
        const daysInStage = lead.timeInStage || 0
        if (timeInStageMin && daysInStage < parseInt(timeInStageMin)) return false
        if (timeInStageMax && daysInStage > parseInt(timeInStageMax)) return false
        return true
      })
    }

    // Filtro por score
    if (scoreMin || scoreMax) {
      pipelineLeads = pipelineLeads.filter(lead => {
        const score = lead.score || 0
        if (scoreMin && score < parseInt(scoreMin)) return false
        if (scoreMax && score > parseInt(scoreMax)) return false
        return true
      })
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

    // Devolver los leads del pipeline con información de paginación
    return NextResponse.json(pipelineLeads, {
      headers: {
        'X-Total-Count': total.toString(),
        'X-Page': page.toString(),
        'X-Limit': limit.toString(),
        'X-Has-More': (offset + limit < total).toString()
      }
    })

  } catch (error: any) {
    const session = await getServerSession(authOptions).catch(() => null)
    logger.error('Error getting pipeline leads', {
      error: error.message,
      stack: error.stack,
      userId: session?.user?.id,
      errorName: error.name,
      errorString: String(error)
    })

    // En desarrollo, incluir más detalles del error
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener leads del pipeline',
      ...(isDevelopment && {
        details: error.message,
        stack: error.stack
      })
    }, { status: 500 })
  }
}
