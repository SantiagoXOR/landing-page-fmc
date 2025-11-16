import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { PipelineLead } from '@/types/pipeline'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { PrismaClient } from '@prisma/client'

// Singleton pattern para PrismaClient en Next.js serverless
// Evita crear múltiples conexiones y fugas de recursos
// IMPORTANTE: Guardar en globalThis en TODOS los entornos (incluyendo producción)
// para evitar crear múltiples conexiones en serverless
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Guardar en globalThis en todos los entornos para evitar múltiples conexiones en serverless
globalForPrisma.prisma = prisma

// Mapeo de estados de leads a etapas del pipeline
const estadoToStageId: Record<string, string> = {
  'NUEVO': 'nuevo',
  'CONTACTADO': 'contactado',
  'EN_REVISION': 'calificado',
  'CALIFICADO': 'calificado',
  'PREAPROBADO': 'propuesta',
  'PROPUESTA': 'propuesta',
  'NEGOCIACION': 'negociacion',
  'DOC_PENDIENTE': 'propuesta',
  'RECHAZADO': 'perdido',
  'DERIVADO': 'seguimiento'
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
function mapLeadToPipelineLead(lead: any, lastEvent: any = null, assignedTo?: string): PipelineLead {
  const stageId = estadoToStageId[lead.estado] || 'nuevo'
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
    stageEntryDate: new Date(lead.createdAt),
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
    const filters: any = {
      limit: 100, // Límite razonable para el pipeline
      offset: 0
    }

    // Si hay stageId, mapear a estados correspondientes
    if (stageId) {
      const estados = Object.entries(estadoToStageId)
        .filter(([_, sid]) => sid === stageId)
        .map(([estado]) => estado)
      
      if (estados.length > 0) {
        // Usar el primer estado encontrado (se puede mejorar para múltiples)
        filters.estado = estados[0]
      }
    }

    if (search) {
      filters.search = search
    }

    // Obtener leads reales de la base de datos
    const { leads, total } = await supabaseLeadService.getLeads(filters)

    // Obtener el evento más reciente por cada lead para calcular lastActivity
    // Usar una query por lead para asegurar que obtenemos el evento más reciente de cada uno
    // en lugar de los 1000 eventos más recientes globalmente
    const leadIds = leads.map(l => l.id)
    const eventsMap = new Map<string, any>()
    
    if (leadIds.length > 0) {
      // Obtener el evento más reciente para cada lead usando DISTINCT ON (PostgreSQL)
      // Esto asegura que cada lead tenga su evento más reciente, incluso si tiene muchos eventos antiguos
      // Nota: DISTINCT ON requiere que la columna en DISTINCT ON sea la primera en ORDER BY
      try {
        const latestEvents = await prisma.$queryRaw<Array<{
          leadId: string
          id: string
          tipo: string
          payload: string | null
          createdAt: Date
        }>>`
          SELECT DISTINCT ON (e."leadId") 
            e."leadId",
            e.id,
            e.tipo,
            e.payload,
            e."createdAt"
          FROM "Event" e
          WHERE e."leadId" = ANY(${leadIds}::text[])
          ORDER BY e."leadId", e."createdAt" DESC
        `
        
        latestEvents.forEach(event => {
          eventsMap.set(event.leadId, event)
        })
      } catch (error: any) {
        // Fallback: si la query con DISTINCT ON falla (por ejemplo, nombres de columnas diferentes),
        // obtener todos los eventos y filtrar en memoria
        logger.warn('Error using DISTINCT ON query, falling back to in-memory filtering', {
          error: error.message,
          leadCount: leadIds.length
        })
        
        const allEvents = await prisma.event.findMany({
          where: {
            leadId: { in: leadIds }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        // Agrupar por leadId y tomar el más reciente de cada grupo
        const eventsByLead = new Map<string, any>()
        allEvents.forEach(event => {
          if (event.leadId && !eventsByLead.has(event.leadId)) {
            eventsByLead.set(event.leadId, event)
          }
        })
        
        eventsByLead.forEach((event, leadId) => {
          eventsMap.set(leadId, event)
        })
      }
    }

    // Obtener asignaciones de leads (assignedTo) desde lead_pipeline
    // Nota: lead_pipeline puede no existir para todos los leads, así que usamos LEFT JOIN
    let assignmentMap = new Map<string, string>()
    
    if (leadIds.length > 0) {
      try {
        // Intentar obtener asignaciones desde lead_pipeline si existe
        // Los IDs son CUID strings, no UUIDs, así que usamos TEXT/VARCHAR
        const leadAssignments = await prisma.$queryRaw<Array<{ lead_id: string, assigned_to: string | null }>>`
          SELECT lead_id, assigned_to 
          FROM lead_pipeline 
          WHERE lead_id = ANY(${leadIds}::text[])
          AND assigned_to IS NOT NULL
        `
        
        leadAssignments.forEach(assignment => {
          if (assignment.assigned_to) {
            assignmentMap.set(assignment.lead_id, assignment.assigned_to)
          }
        })
      } catch (error: any) {
        // Si la tabla lead_pipeline no existe o hay un error, simplemente continuar sin asignaciones
        logger.warn('Could not fetch lead assignments from lead_pipeline', {
          error: error.message,
          leadCount: leadIds.length
        })
      }
    }

    // Mapear leads a PipelineLead usando el evento más reciente de cada lead
    let pipelineLeads = leads.map(lead => {
      const lastEvent = eventsMap.get(lead.id) || null
      return mapLeadToPipelineLead(lead, lastEvent, assignmentMap.get(lead.id))
    })

    // Aplicar filtros adicionales que no están en la base de datos
    if (priority) {
      pipelineLeads = pipelineLeads.filter(lead => lead.priority === priority)
    }

    if (assignedTo) {
      pipelineLeads = pipelineLeads.filter(lead => lead.assignedTo === assignedTo)
    }

    logger.info('Pipeline leads requested', {
      userId: session.user.id,
      userName: session.user.name,
      filters: { stageId, priority, assignedTo, search },
      resultCount: pipelineLeads.length,
      totalLeads: total
    })

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
