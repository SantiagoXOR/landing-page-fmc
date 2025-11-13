import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { pipelineService, PipelineStage, LossReason } from '@/server/services/pipeline-service'
import { checkPermission } from '@/lib/rbac'

// GET - Obtener pipeline de un lead específico
export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:read')

    const pipeline = await pipelineService.getLeadPipeline(params.leadId)
    
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }

    return NextResponse.json(pipeline)

  } catch (error: any) {
    console.error('Error in GET /api/pipeline/[leadId]:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Crear pipeline para un lead
export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:write')

    const body = await request.json()
    const { assigned_to } = body

    // Verificar si ya existe pipeline para este lead
    const existingPipeline = await pipelineService.getLeadPipeline(params.leadId)
    if (existingPipeline) {
      return NextResponse.json({ error: 'Pipeline already exists for this lead' }, { status: 400 })
    }

    const pipeline = await pipelineService.createLeadPipeline(params.leadId, assigned_to)

    return NextResponse.json(pipeline, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/pipeline/[leadId]:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Actualizar pipeline (mover a nueva etapa)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:write')

    const body = await request.json()
    const { new_stage, notes, loss_reason } = body

    // Validar nueva etapa
    const validStages: PipelineStage[] = [
      'LEAD_NUEVO', 'CONTACTO_INICIAL', 'CALIFICACION', 'PRESENTACION',
      'PROPUESTA', 'NEGOCIACION', 'CIERRE_GANADO', 'CIERRE_PERDIDO', 'SEGUIMIENTO'
    ]

    if (!validStages.includes(new_stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    // Validar loss_reason si es necesario
    if (new_stage === 'CIERRE_PERDIDO' && loss_reason) {
      const validLossReasons: LossReason[] = [
        'PRECIO', 'COMPETENCIA', 'PRESUPUESTO', 'TIMING', 
        'NO_INTERES', 'NO_CONTACTO', 'OTRO'
      ]
      
      if (!validLossReasons.includes(loss_reason)) {
        return NextResponse.json({ error: 'Invalid loss reason' }, { status: 400 })
      }
    }

    const updatedPipeline = await pipelineService.moveLeadToStage(
      params.leadId,
      new_stage,
      session.user.id,
      notes,
      loss_reason
    )

    return NextResponse.json(updatedPipeline)

  } catch (error: any) {
    console.error('Error in PATCH /api/pipeline/[leadId]:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.message.includes('not allowed')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
