import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { supabaseLeadService } from '@/server/services/supabase-lead-service'
import { pipelineService } from '@/server/services/pipeline-service'
import { calculateTimeBasedScore } from '@/server/services/pipeline-scoring-service'

interface MetricsComparison {
  current: number
  previous: number
  change: number // porcentaje de cambio
  trend: 'up' | 'down' | 'stable'
}

interface PipelineMetricsResponse {
  totalLeads: MetricsComparison
  approvedLeads: MetricsComparison
  rejectedLeads: MetricsComparison
  highPriorityLeads: MetricsComparison
  leadsWithTasks: MetricsComparison
  urgentLeads: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down' | 'stable'
  }
  averageTimeInStage: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down' | 'stable'
  }
  stalledLeads: {
    current: number
    previous: number
    change: number
    trend: 'up' | 'down' | 'stable'
  }
}

/**
 * Calcular métricas para un período específico
 */
async function calculatePeriodMetrics(
  dateFrom: Date,
  dateTo: Date
): Promise<{
  totalLeads: number
  approvedLeads: number
  rejectedLeads: number
  highPriorityLeads: number
  leadsWithTasks: number
  urgentLeads: number
  averageTimeInStage: number
  stalledLeads: number
}> {
  try {
    // Obtener TODOS los leads (no solo del período para totalLeads)
    const { leads: allLeads } = await supabaseLeadService.getLeads({
      limit: 10000,
      offset: 0
    })

    // Filtrar leads por fecha de creación para métricas del período
    const periodLeads = allLeads.filter(lead => {
      if (!lead.createdAt) return false
      const leadDate = new Date(lead.createdAt)
      return leadDate >= dateFrom && leadDate <= dateTo
    })

    const allLeadIds = allLeads
      .map(l => l.id)
      .filter((id): id is string => id !== undefined)

    // Obtener información del pipeline para todos los leads
    const pipelineMap = await supabaseLeadService.getLeadPipelines(allLeadIds)

    // Mapeo de stages
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

    // Tags que indican aprobación
    const approvedTags = ['aprobado', 'preaprobado', 'pre-aprobado', 'cerrado-ganado', 'venta-concretada']
    // Tags que indican rechazo
    const rejectedTags = ['rechazado', 'credito-rechazado', 'rechazado-credito', 'perdido', 'cerrado-perdido']

    let approvedCount = 0
    let rejectedCount = 0
    let highPriorityCount = 0
    let leadsWithTasksCount = 0
    let urgentCount = 0
    let totalTimeInStage = 0
    let stalledCount = 0
    let leadsWithTimeData = 0

    // Contar aprobados y rechazados de TODOS los leads
    for (const lead of allLeads) {
      const leadId = lead.id as string
      const pipelineInfo = pipelineMap.get(leadId)
      
      // Parsear tags
      const tags = lead.tags ? (typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags) : []
      const tagsArray = Array.isArray(tags) ? tags : []
      const tagsLower = tagsArray.map(t => String(t).toLowerCase().trim())

      // Determinar si está aprobado o rechazado
      let isApproved = false
      let isRejected = false

      // Primero verificar por etapa del pipeline
      if (pipelineInfo) {
        const stageId = pipelineStageToStageId[pipelineInfo.current_stage] || ''
        if (stageId === 'cerrado-ganado' || pipelineInfo.current_stage === 'APROBADO' || pipelineInfo.current_stage === 'PREAPROBADO' || pipelineInfo.current_stage === 'CERRADO_GANADO') {
          isApproved = true
        } else if (stageId === 'cerrado-perdido' || pipelineInfo.current_stage === 'RECHAZADO' || pipelineInfo.current_stage === 'CIERRE_PERDIDO') {
          isRejected = true
        }
      }

      // Luego verificar por tags
      if (!isApproved && !isRejected) {
        for (const tag of tagsLower) {
          if (approvedTags.includes(tag)) {
            isApproved = true
            break
          }
          if (rejectedTags.includes(tag)) {
            isRejected = true
            break
          }
        }
      }

      if (isApproved) approvedCount++
      if (isRejected) rejectedCount++
    }

    // Calcular métricas del período para urgentes y estancados
    for (const lead of periodLeads) {
      const leadId = lead.id as string
      const pipelineInfo = pipelineMap.get(leadId)

      // Calcular score y urgencia
      if (pipelineInfo) {
        const stageId = pipelineStageToStageId[pipelineInfo.current_stage] || 'nuevo'
        const stageEntryDate = new Date(pipelineInfo.stage_entered_at || lead.createdAt || new Date())
        const timeScore = calculateTimeBasedScore(stageEntryDate, stageId)

        // Contar urgentes (high o critical)
        if (timeScore.urgency === 'high' || timeScore.urgency === 'critical') {
          urgentCount++
        }

        // Contar estancados (15+ días)
        if (timeScore.daysInStage >= 15) {
          stalledCount++
        }

        // Acumular tiempo en etapa
        totalTimeInStage += timeScore.daysInStage
        leadsWithTimeData++

        // Determinar prioridad basada en score
        if (timeScore.urgency === 'critical' || timeScore.urgency === 'high') {
          highPriorityCount++
        }
      }
    }

    const averageTimeInStage = leadsWithTimeData > 0 ? totalTimeInStage / leadsWithTimeData : 0

    return {
      totalLeads: allLeads.length, // Total de TODOS los leads
      approvedLeads: approvedCount,
      rejectedLeads: rejectedCount,
      highPriorityLeads: highPriorityCount,
      leadsWithTasks: leadsWithTasksCount, // TODO: Implementar cuando haya sistema de tareas
      urgentLeads: urgentCount,
      averageTimeInStage: Math.round(averageTimeInStage * 10) / 10,
      stalledLeads: stalledCount
    }
  } catch (error) {
    logger.error('Error calculating period metrics:', error)
    return {
      totalLeads: 0,
      totalValue: 0,
      averageDealSize: 0,
      highPriorityLeads: 0,
      leadsWithTasks: 0,
      urgentLeads: 0,
      averageTimeInStage: 0,
      stalledLeads: 0
    }
  }
}

/**
 * Calcular comparación entre dos períodos
 */
function calculateComparison(
  current: number,
  previous: number
): MetricsComparison {
  if (previous === 0) {
    return {
      current,
      previous: 0,
      change: current > 0 ? 100 : 0,
      trend: current > 0 ? 'up' : 'stable'
    }
  }

  const change = ((current - previous) / previous) * 100
  const absChange = Math.abs(change)

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (absChange >= 5) {
    trend = change > 0 ? 'up' : 'down'
  }

  return {
    current,
    previous,
    change: Math.round(change * 10) / 10,
    trend
  }
}

/**
 * GET /api/pipeline/metrics
 * Obtener métricas del pipeline con comparación de períodos anteriores
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a las métricas'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a las métricas'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // 'week', 'month', 'quarter'

    // Calcular fechas para período actual
    const now = new Date()
    const currentPeriodEnd = new Date(now)
    currentPeriodEnd.setHours(23, 59, 59, 999)

    let currentPeriodStart: Date
    let previousPeriodStart: Date
    let previousPeriodEnd: Date

    switch (period) {
      case 'week':
        currentPeriodStart = new Date(now)
        currentPeriodStart.setDate(now.getDate() - 7)
        previousPeriodEnd = new Date(currentPeriodStart)
        previousPeriodEnd.setMilliseconds(previousPeriodEnd.getMilliseconds() - 1)
        previousPeriodStart = new Date(previousPeriodEnd)
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7)
        break
      case 'quarter':
        currentPeriodStart = new Date(now)
        currentPeriodStart.setMonth(now.getMonth() - 3)
        previousPeriodEnd = new Date(currentPeriodStart)
        previousPeriodEnd.setMilliseconds(previousPeriodEnd.getMilliseconds() - 1)
        previousPeriodStart = new Date(previousPeriodEnd)
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 3)
        break
      default: // month
        currentPeriodStart = new Date(now)
        currentPeriodStart.setMonth(now.getMonth() - 1)
        previousPeriodEnd = new Date(currentPeriodStart)
        previousPeriodEnd.setMilliseconds(previousPeriodEnd.getMilliseconds() - 1)
        previousPeriodStart = new Date(previousPeriodEnd)
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1)
        break
    }

    // Calcular métricas para ambos períodos
    const [currentMetrics, previousMetrics] = await Promise.all([
      calculatePeriodMetrics(currentPeriodStart, currentPeriodEnd),
      calculatePeriodMetrics(previousPeriodStart, previousPeriodEnd)
    ])

    // Construir respuesta con comparaciones
    // Nota: totalLeads, approvedLeads y rejectedLeads son totales absolutos, no del período
    const response: PipelineMetricsResponse = {
      totalLeads: {
        current: currentMetrics.totalLeads,
        previous: previousMetrics.totalLeads,
        change: previousMetrics.totalLeads > 0 
          ? ((currentMetrics.totalLeads - previousMetrics.totalLeads) / previousMetrics.totalLeads) * 100 
          : currentMetrics.totalLeads > 0 ? 100 : 0,
        trend: currentMetrics.totalLeads > previousMetrics.totalLeads ? 'up' 
          : currentMetrics.totalLeads < previousMetrics.totalLeads ? 'down' 
          : 'stable'
      },
      approvedLeads: {
        current: currentMetrics.approvedLeads,
        previous: previousMetrics.approvedLeads,
        change: previousMetrics.approvedLeads > 0 
          ? ((currentMetrics.approvedLeads - previousMetrics.approvedLeads) / previousMetrics.approvedLeads) * 100 
          : currentMetrics.approvedLeads > 0 ? 100 : 0,
        trend: currentMetrics.approvedLeads > previousMetrics.approvedLeads ? 'up' 
          : currentMetrics.approvedLeads < previousMetrics.approvedLeads ? 'down' 
          : 'stable'
      },
      rejectedLeads: {
        current: currentMetrics.rejectedLeads,
        previous: previousMetrics.rejectedLeads,
        change: previousMetrics.rejectedLeads > 0 
          ? ((currentMetrics.rejectedLeads - previousMetrics.rejectedLeads) / previousMetrics.rejectedLeads) * 100 
          : currentMetrics.rejectedLeads > 0 ? 100 : 0,
        trend: currentMetrics.rejectedLeads > previousMetrics.rejectedLeads ? 'up' 
          : currentMetrics.rejectedLeads < previousMetrics.rejectedLeads ? 'down' 
          : 'stable'
      },
      highPriorityLeads: calculateComparison(currentMetrics.highPriorityLeads, previousMetrics.highPriorityLeads),
      leadsWithTasks: calculateComparison(currentMetrics.leadsWithTasks, previousMetrics.leadsWithTasks),
      urgentLeads: calculateComparison(currentMetrics.urgentLeads, previousMetrics.urgentLeads),
      averageTimeInStage: calculateComparison(currentMetrics.averageTimeInStage, previousMetrics.averageTimeInStage),
      stalledLeads: calculateComparison(currentMetrics.stalledLeads, previousMetrics.stalledLeads)
    }

    logger.info('Pipeline metrics calculated', {
      userId: session.user.id,
      period,
      currentPeriod: {
        start: currentPeriodStart.toISOString(),
        end: currentPeriodEnd.toISOString()
      },
      previousPeriod: {
        start: previousPeriodStart.toISOString(),
        end: previousPeriodEnd.toISOString()
      }
    })

    return NextResponse.json(response)

  } catch (error: any) {
    logger.error('Error getting pipeline metrics', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener métricas del pipeline'
    }, { status: 500 })
  }
}

