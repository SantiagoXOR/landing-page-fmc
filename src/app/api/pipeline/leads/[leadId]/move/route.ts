import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission, checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { automationService } from '@/services/automation-service'
import { pipelineService } from '@/server/services/pipeline-service'
import { supabase } from '@/lib/db'

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
    // Usar pipeline:write que es el permiso correcto para mover leads
    const hasWritePermission = await checkUserPermission(session.user.id, 'pipeline', 'write')
    
    if (!hasWritePermission) {
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

    // Validaciones de negocio (solo warnings, permitir movimientos hacia atrás)
    const validationResult = await validateStageTransition(leadId, fromStageId, toStageId)
    
    // Solo bloquear si hay errores críticos, no por warnings
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Transition not allowed',
        message: 'La transición no está permitida',
        details: validationResult.errors
      }, { status: 422 })
    }

    // Mapear IDs de etapas del frontend a los valores del enum de la base de datos
    const stageMapping: Record<string, string> = {
      'nuevo': 'LEAD_NUEVO',
      'contactado': 'CONTACTO_INICIAL',
      'calificado': 'CALIFICACION',
      'propuesta': 'PROPUESTA',
      'negociacion': 'NEGOCIACION',
      'cerrado-ganado': 'CIERRE_GANADO',
      'cerrado-perdido': 'CIERRE_PERDIDO'
    }

    const toStageEnum = stageMapping[toStageId] || toStageId

    // Actualizar en la base de datos usando el servicio de pipeline
    try {
      await pipelineService.moveLeadToStage(
        leadId,
        toStageEnum as any,
        session.user.id,
        notes,
        reason as any
      )
    } catch (pipelineError: any) {
      logger.error('Error updating pipeline in database', {
        error: pipelineError.message,
        leadId,
        toStageEnum
      })
      
      // Si falla la actualización del pipeline, intentar actualizar directamente
      try {
        // Obtener el pipeline actual del lead
        const currentPipeline = await pipelineService.getLeadPipeline(leadId)
        
        if (currentPipeline) {
          // Actualizar directamente
          await supabase.request(`/lead_pipeline?id=eq.${currentPipeline.id}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              current_stage: toStageEnum,
              stage_entered_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          })
        } else {
          // Si no existe pipeline, crearlo
          await supabase.request('/lead_pipeline', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              lead_id: leadId,
              current_stage: toStageEnum,
              stage_entered_at: new Date().toISOString()
            })
          })
        }
      } catch (directUpdateError: any) {
        logger.error('Error in direct pipeline update', {
          error: directUpdateError.message,
          leadId
        })
        throw new Error('No se pudo actualizar el pipeline en la base de datos')
      }
    }

    // Asignar tags según la nueva etapa
    await assignStageTag(leadId, toStageId)

    // Ejecutar automatizaciones de la nueva etapa
    await executeStageAutomations(leadId, fromStageId, toStageId, session.user.id)

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

  // Permitir retrocesos (solo warning, no error)
  if (toStage.order < fromStage.order && !['cerrado-perdido'].includes(toStageId)) {
    warnings.push('Se está retrocediendo en el pipeline')
    // No bloqueamos retrocesos, solo avisamos
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

// Función para asignar tags según la etapa
async function assignStageTag(leadId: string, stageId: string): Promise<void> {
  try {
    // Mapeo de etapas a tags
    const stageTags: Record<string, string> = {
      'nuevo': 'nuevo-lead',
      'contactado': 'contactado',
      'calificado': 'calificado',
      'propuesta': 'propuesta-enviada',
      'negociacion': 'negociacion',
      'cerrado-ganado': 'cerrado-ganado',
      'cerrado-perdido': 'cerrado-perdido'
    }

    const tagToAdd = stageTags[stageId]
    if (!tagToAdd) return

    // Obtener lead actual
    const lead = await supabase.findLeadById(leadId)
    if (!lead) {
      logger.warn('Lead not found for tag assignment', { leadId })
      return
    }

    // Obtener tags actuales
    let currentTags: string[] = []
    if (lead.tags) {
      try {
        currentTags = typeof lead.tags === 'string' 
          ? JSON.parse(lead.tags) 
          : lead.tags
      } catch {
        currentTags = Array.isArray(lead.tags) ? lead.tags : []
      }
    }

    // Remover tags de otras etapas
    const stageTagValues = Object.values(stageTags)
    const filteredTags = currentTags.filter(tag => !stageTagValues.includes(tag))

    // Agregar el nuevo tag si no existe
    if (!filteredTags.includes(tagToAdd)) {
      filteredTags.push(tagToAdd)
    }

    // Actualizar lead con nuevos tags
    await supabase.updateLead(leadId, {
      tags: JSON.stringify(filteredTags)
    })

    logger.info('Stage tag assigned', {
      leadId,
      stageId,
      tag: tagToAdd
    })
  } catch (error) {
    logger.error('Error assigning stage tag', {
      leadId,
      stageId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    // No lanzar error, es opcional
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
