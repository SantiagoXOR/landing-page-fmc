import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { pipelineService, PipelineStage } from '@/server/services/pipeline-service'
import { checkPermission } from '@/lib/rbac'

// GET - Obtener transiciones permitidas desde una etapa
export async function GET(
  request: NextRequest,
  { params }: { params: { stage: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:read')

    // Validar etapa
    const validStages: PipelineStage[] = [
      'LEAD_NUEVO', 'CONTACTO_INICIAL', 'CALIFICACION', 'PRESENTACION',
      'PROPUESTA', 'NEGOCIACION', 'CIERRE_GANADO', 'CIERRE_PERDIDO', 'SEGUIMIENTO'
    ]

    if (!validStages.includes(params.stage as PipelineStage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const transitions = await pipelineService.getAllowedTransitions(params.stage as PipelineStage)

    return NextResponse.json(transitions)

  } catch (error: any) {
    console.error('Error in GET /api/pipeline/transitions/[stage]:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
