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
  totalValue: MetricsComparison
  averageDealSize: MetricsComparison
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
  totalValue: number
  averageDealSize: number
  highPriorityLeads: number
  leadsWithTasks: number
  urgentLeads: number
  averageTimeInStage: number
  stalledLeads: number
}> {
  try {
    // Obtener todos los leads del período
    const { leads } = await supabaseLeadService.getLeads({
      limit: 10000,
      offset: 0
    })

    // Filtrar leads por fecha de creación
    const periodLeads = leads.filter(lead => {
      if (!lead.createdAt) return false
      const leadDate = new Date(lead.createdAt)
      return leadDate >= dateFrom && leadDate <= dateTo
    })

    const leadIds = periodLeads
      .map(l => l.id)
      .filter((id): id is string => id !== undefined)

    // Obtener información del pipeline
    const pipelineMap = await supabaseLeadService.getLeadPipelines(leadIds)

    // Mapeo de stages
    const pipelineStageToStageId: Record<string, string> = {
      'LEAD_NUEVO': 'nuevo',
      'CONTACTO_INICIAL': 'contactado',
      'CALIFICACION': 'calificado',
      'PRESENTACION': 'calificado',
      'PROPUESTA': 'propuesta',
      'NEGOCIACION': 'negociacion',
      'CIERRE_GANADO': 'cerrado-ganado',
      'CIERRE_PERDIDO': 'cerrado-perdido',
      'SEGUIMIENTO': 'cerrado-ganado'
    }

    let totalValue = 0
    let highPriorityCount = 0
    let leadsWithTasksCount = 0
    let urgentCount = 0
    let totalTimeInStage = 0
    let stalledCount = 0
    let leadsWithTimeData = 0

    for (const lead of periodLeads) {
      const leadId = lead.id as string
      const pipelineInfo = pipelineMap.get(leadId)

      // Calcular valor total
      if (lead.monto) {
        totalValue += lead.monto
      }

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

    const averageDealSize = periodLeads.length > 0 ? totalValue / periodLeads.length : 0
    const averageTimeInStage = leadsWithTimeData > 0 ? totalTimeInStage / leadsWithTimeData : 0

    return {
      totalLeads: periodLeads.length,
      totalValue,
      averageDealSize,
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
    const response: PipelineMetricsResponse = {
      totalLeads: calculateComparison(currentMetrics.totalLeads, previousMetrics.totalLeads),
      totalValue: calculateComparison(currentMetrics.totalValue, previousMetrics.totalValue),
      averageDealSize: calculateComparison(currentMetrics.averageDealSize, previousMetrics.averageDealSize),
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

