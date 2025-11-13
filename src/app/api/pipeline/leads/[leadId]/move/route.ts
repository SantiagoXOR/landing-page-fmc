import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission, checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { automationService } from '@/services/automation-service'

// Schema de validación para mover lead
const MoveLeadSchema = z.object({
  fromStageId: z.string().min(1, 'ID de etapa origen es requerido'),
  toStageId: z.string().min(1, 'ID de etapa destino es requerido'),
  notes: z.string().optional(),
  reason: z.string().optional()
})

/**
 * POST /api/pipeline/leads/[leadId]/move
 * Mover lead entre etapas del pipeline
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para mover leads'
      }, { status: 401 })
    }

    // Verificar permisos granulares
    const hasUpdatePermission = await checkUserPermission(session.user.id, 'pipeline', 'update')
    
    if (!hasUpdatePermission) {
      logger.warn('Permission denied for pipeline move', {
        userId: session.user.id,
        leadId: params.leadId
      })
      
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para mover leads en el pipeline'
      }, { status: 403 })
    }

    const { leadId } = params
    
    if (!leadId) {
      return NextResponse.json({
        error: 'Missing lead ID',
        message: 'ID del lead es requerido'
      }, { status: 400 })
    }

    const body = await request.json()
    
    // Validar datos de entrada
    let validatedData
    try {
      validatedData = MoveLeadSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          message: 'Datos de entrada inválidos',
          details: error.errors
        }, { status: 400 })
      }
      throw error
    }

    const { fromStageId, toStageId, notes, reason } = validatedData

    // Verificar que las etapas sean diferentes
    if (fromStageId === toStageId) {
      return NextResponse.json({
        error: 'Same stage',
        message: 'La etapa origen y destino no pueden ser la misma'
      }, { status: 400 })
    }

    // Simular validaciones de negocio
    const validationResult = await validateStageTransition(leadId, fromStageId, toStageId)
    
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Transition not allowed',
        message: 'La transición no está permitida',
        details: validationResult.errors
      }, { status: 422 })
    }

    // Simular actualización en base de datos
    const transition = {
      id: `transition-${Date.now()}`,
      leadId,
      fromStageId,
      toStageId,
      date: new Date(),
      userId: session.user.id,
      userName: session.user.name,
      notes,
      reason,
      wasAutomated: false
    }

    // En una implementación real, aquí se actualizaría la base de datos
    // await updateLeadStage(leadId, toStageId, transition)

    // Ejecutar automatizaciones de la nueva etapa
    await executeStageAutomations(leadId, fromStageId, toStageId, session.user.id)

    logger.info('Lead moved between stages', {
      userId: session.user.id,
      userName: session.user.name,
      leadId,
      fromStageId,
      toStageId,
      notes,
      reason
    })

    return NextResponse.json({
      success: true,
      message: 'Lead movido exitosamente',
      transition,
      warnings: validationResult.warnings
    })

  } catch (error: any) {
    logger.error('Error moving lead', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id,
      leadId: params?.leadId
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al mover lead'
    }, { status: 500 })
  }
}

// Función para validar transición entre etapas
async function validateStageTransition(
  leadId: string, 
  fromStageId: string, 
  toStageId: string
): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []

  // Obtener configuración de etapas (simulado)
  const stages = {
    'nuevo': { order: 1, name: 'Nuevo Lead' },
    'contactado': { order: 2, name: 'Contactado' },
    'calificado': { order: 3, name: 'Calificado' },
    'propuesta': { order: 4, name: 'Propuesta Enviada' },
    'negociacion': { order: 5, name: 'Negociación' },
    'cerrado-ganado': { order: 6, name: 'Cerrado Ganado' },
    'cerrado-perdido': { order: 7, name: 'Cerrado Perdido' }
  }

  const fromStage = stages[fromStageId as keyof typeof stages]
  const toStage = stages[toStageId as keyof typeof stages]

  if (!fromStage || !toStage) {
    errors.push('Etapa no válida')
    return { isValid: false, errors, warnings }
  }

  // Validar salto de etapas
  const orderDiff = Math.abs(toStage.order - fromStage.order)
  if (orderDiff > 1 && !['cerrado-ganado', 'cerrado-perdido'].includes(toStageId)) {
    warnings.push(`Se está saltando ${orderDiff - 1} etapa(s) del pipeline`)
  }

  // Validar retroceso
  if (toStage.order < fromStage.order && !['cerrado-perdido'].includes(toStageId)) {
    warnings.push('Se está retrocediendo en el pipeline')
  }

  // Validaciones específicas por etapa
  switch (toStageId) {
    case 'calificado':
      // Verificar que el lead tenga información mínima
      // En una implementación real, verificaríamos la base de datos
      break
      
    case 'propuesta':
      // Verificar que el lead esté calificado
      if (fromStageId === 'nuevo') {
        errors.push('El lead debe estar calificado antes de enviar propuesta')
      }
      break
      
    case 'cerrado-ganado':
      // Verificar que haya pasado por negociación
      if (!['negociacion', 'propuesta'].includes(fromStageId)) {
        warnings.push('Se recomienda pasar por negociación antes de cerrar')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Función para ejecutar automatizaciones de etapa
async function executeStageAutomations(
  leadId: string,
  fromStageId: string,
  toStageId: string,
  userId: string
): Promise<void> {
  try {
    // Ejecutar automatizaciones usando el nuevo sistema
    await automationService.executeTrigger(
      {
        type: 'stage_change',
        fromStageId,
        toStageId
      },
      leadId,
      userId,
      {
        timestamp: new Date(),
        fromStage: fromStageId,
        toStage: toStageId
      }
    )

    logger.info('Stage change automations triggered', {
      leadId,
      fromStageId,
      toStageId,
      userId
    })
  } catch (error) {
    logger.error('Error executing stage automations', {
      leadId,
      fromStageId,
      toStageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
