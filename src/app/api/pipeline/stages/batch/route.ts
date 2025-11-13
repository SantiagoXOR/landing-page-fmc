import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { PipelineStage } from '@/types/pipeline'

/**
 * POST /api/pipeline/stages/batch
 * Crear múltiples etapas del pipeline por defecto
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para crear etapas'
      }, { status: 401 })
    }

    // Verificar permisos de administrador
    try {
      checkPermission(session.user.role, 'admin:pipeline')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para crear etapas del pipeline'
      }, { status: 403 })
    }

    const body = await request.json()
    const { stages } = body
    
    // Validar datos requeridos
    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Se requiere un array de stages'
      }, { status: 400 })
    }

    // Crear etapas con estructura completa
    const createdStages: PipelineStage[] = stages.map((stage: any, index: number) => ({
      id: `stage-${Date.now()}-${index}`,
      name: stage.name,
      description: stage.description || `Etapa ${stage.name}`,
      color: stage.color,
      order: stage.order || index,
      isActive: true,
      rules: [],
      automation: [],
      metrics: {
        totalLeads: 0,
        averageTimeInStage: 0,
        conversionRate: 0,
        leadsThisWeek: 0,
        leadsThisMonth: 0,
        trend: 'stable'
      }
    }))

    logger.info('Pipeline stages created in batch', {
      userId: session.user.id,
      userName: session.user.name,
      stagesCount: createdStages.length,
      stageNames: createdStages.map(s => s.name)
    })

    return NextResponse.json({ 
      stages: createdStages,
      message: `${createdStages.length} etapas creadas exitosamente`
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error creating pipeline stages in batch', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al crear etapas'
    }, { status: 500 })
  }
}
