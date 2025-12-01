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

    logger.info('Moving lead', {
      leadId,
      fromStageId,
      toStageId,
      userId: session.user.id
    })

    // Verificar que las etapas sean diferentes
    if (fromStageId === toStageId) {
      return NextResponse.json({
        error: 'Same stage',
        message: 'La etapa origen y destino no pueden ser la misma'
      }, { status: 400 })
    }

    // Normalizar IDs de etapas (pueden venir con guión bajo o guión)
    const normalizedFromStageId = fromStageId.replace(/_/g, '-')
    const normalizedToStageId = toStageId.replace(/_/g, '-')

    // Validaciones de negocio (solo warnings, permitir movimientos hacia atrás)
    const validationResult = await validateStageTransition(leadId, normalizedFromStageId, normalizedToStageId)
    
    // Solo bloquear si hay errores críticos, no por warnings
    if (!validationResult.isValid) {
      logger.warn('Transition validation failed', {
        leadId,
        fromStageId: normalizedFromStageId,
        toStageId: normalizedToStageId,
        errors: validationResult.errors
      })
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
      'cerrado-perdido': 'CIERRE_PERDIDO',
      'cerrado_ganado': 'CIERRE_GANADO', // También aceptar con guión bajo
      'cerrado_perdido': 'CIERRE_PERDIDO' // También aceptar con guión bajo
    }

    const toStageEnum = stageMapping[normalizedToStageId] || normalizedToStageId

    logger.info('Stage mapping', {
      originalToStageId: toStageId,
      normalizedToStageId,
      mappedToStageEnum: toStageEnum
    })

    // Actualizar en la base de datos usando el servicio de pipeline
    let pipelineUpdated = false
    try {
      logger.info('Attempting to update pipeline via service', {
        leadId,
        toStageEnum
      })
      
      await pipelineService.moveLeadToStage(
        leadId,
        toStageEnum as any,
        session.user.id,
        notes,
        reason as any
      )
      pipelineUpdated = true
      logger.info('Pipeline updated successfully via service', { leadId })
    } catch (pipelineError: any) {
      logger.warn('Pipeline service update failed, trying direct update', {
        error: pipelineError.message,
        stack: pipelineError.stack,
        leadId,
        toStageEnum
      })
      
      // Si falla la actualización del pipeline, intentar actualizar directamente
      try {
        // Obtener el pipeline actual del lead
        const currentPipeline = await pipelineService.getLeadPipeline(leadId)
        
        if (currentPipeline) {
          logger.info('Updating existing pipeline record', {
            pipelineId: currentPipeline.id,
            leadId,
            toStageEnum
          })
          
          // Actualizar directamente
          const updateResult = await supabase.request(`/lead_pipeline?id=eq.${currentPipeline.id}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              current_stage: toStageEnum,
              stage_entered_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          })
          
          logger.info('Pipeline updated directly', {
            leadId,
            updateResult: updateResult ? 'success' : 'no result'
          })
          pipelineUpdated = true
        } else {
          logger.info('Pipeline record not found, creating new one', { leadId })
          
          // Si no existe pipeline, crearlo
          const createResult = await supabase.request('/lead_pipeline', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              lead_id: leadId,
              current_stage: toStageEnum,
              stage_entered_at: new Date().toISOString()
            })
          })
          
          logger.info('Pipeline created', {
            leadId,
            createResult: createResult ? 'success' : 'no result'
          })
          pipelineUpdated = true
        }
      } catch (directUpdateError: any) {
        logger.error('Error in direct pipeline update', {
          error: directUpdateError.message,
          stack: directUpdateError.stack,
          leadId
        })
        // No lanzar error aquí, continuar con el proceso
      }
    }

    if (!pipelineUpdated) {
      logger.error('Failed to update pipeline in database', { leadId })
      return NextResponse.json({
        error: 'Database update failed',
        message: 'No se pudo actualizar el pipeline en la base de datos'
      }, { status: 500 })
    }

    // Asignar tags según la nueva etapa (no crítico si falla)
    try {
      await assignStageTag(leadId, normalizedToStageId)
    } catch (tagError: any) {
      logger.warn('Failed to assign stage tag', {
        error: tagError.message,
        leadId,
        stageId: normalizedToStageId
      })
      // Continuar aunque falle la asignación de tags
    }

    // Ejecutar automatizaciones de la nueva etapa (no crítico si falla)
    try {
      await executeStageAutomations(leadId, normalizedFromStageId, normalizedToStageId, session.user.id)
    } catch (automationError: any) {
      logger.warn('Failed to execute stage automations', {
        error: automationError.message,
        leadId
      })
      // Continuar aunque falle la automatización
    }

    const transition = {
      id: `transition-${Date.now()}`,
      leadId,
      fromStageId: normalizedFromStageId,
      toStageId: normalizedToStageId,
      date: new Date(),
      userId: session.user.id,
      userName: session.user.name,
      notes,
      reason,
      wasAutomated: false
    }

    logger.info('Lead moved between stages successfully', {
      userId: session.user.id,
      userName: session.user.name,
      leadId,
      fromStageId: normalizedFromStageId,
      toStageId: normalizedToStageId,
      toStageEnum,
      warnings: validationResult.warnings.length
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
