import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { pipelineService } from '@/server/services/pipeline-service'
import { calculateTimeBasedScore } from '@/server/services/pipeline-scoring-service'

/**
 * GET /api/pipeline/leads/[leadId]/score
 * Obtener score basado en tiempo para un lead específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder al score del lead'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder al score del lead'
      }, { status: 403 })
    }

    const { leadId } = params

    if (!leadId) {
      return NextResponse.json({ 
        error: 'Bad Request',
        message: 'ID de lead es requerido'
      }, { status: 400 })
    }

    // Obtener pipeline del lead
    const pipeline = await pipelineService.getLeadPipeline(leadId)
    
    if (!pipeline) {
      return NextResponse.json({ 
        error: 'Not Found',
        message: 'Pipeline no encontrado para este lead'
      }, { status: 404 })
    }

    // Mapear stage de DB a stageId usado en componentes
    const stageMapping: Record<string, string> = {
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

    const stageId = stageMapping[pipeline.current_stage] || 'nuevo'
    const stageEntryDate = new Date(pipeline.stage_entered_at)

    // Calcular score basado en tiempo
    const timeScore = calculateTimeBasedScore(stageEntryDate, stageId)

    logger.info('Score calculated for lead', {
      leadId,
      stageId,
      daysInStage: timeScore.daysInStage,
      score: timeScore.score,
      urgency: timeScore.urgency
    })

    return NextResponse.json({
      leadId,
      stageId,
      ...timeScore
    })

  } catch (error: any) {
    logger.error('Error getting lead score', {
      error: error.message,
      stack: error.stack,
      leadId: params.leadId
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener score del lead'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/pipeline/leads/[leadId]/score
 * Actualizar umbrales de scoring para un lead específico (futuro)
 * Por ahora solo retorna el score actual
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para actualizar el score'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:write')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para actualizar el score'
      }, { status: 403 })
    }

    // Por ahora solo retornamos el score actual
    // En el futuro se podrían actualizar umbrales personalizados
    return GET(request, { params })

  } catch (error: any) {
    logger.error('Error updating lead score', {
      error: error.message,
      stack: error.stack,
      leadId: params.leadId
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al actualizar score del lead'
    }, { status: 500 })
  }
}

