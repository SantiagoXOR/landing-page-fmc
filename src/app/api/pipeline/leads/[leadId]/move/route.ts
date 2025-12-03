import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { automationService } from '@/services/automation-service'
import { pipelineService } from '@/server/services/pipeline-service'
import { supabase } from '@/lib/db'
import { syncPipelineToManychat } from '@/lib/manychat-sync'

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

    // Verificar que el lead existe antes de continuar
    let lead
    try {
      lead = await supabase.findLeadById(leadId)
      if (!lead) {
        logger.error('Lead not found', { leadId })
        return NextResponse.json({
          error: 'Lead not found',
          message: `El lead con ID ${leadId} no existe en la base de datos`
        }, { status: 404 })
      }
      logger.info('Lead found', { leadId, leadName: lead.nombre || 'Sin nombre' })
    } catch (leadError: any) {
      logger.error('Error verifying lead exists', {
        error: leadError.message,
        leadId
      })
      return NextResponse.json({
        error: 'Error verifying lead',
        message: 'No se pudo verificar que el lead existe',
        details: leadError.message
      }, { status: 500 })
    }

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
      // Mapeo anterior (legacy support)
      'nuevo': 'CLIENTE_NUEVO',
      'contactado': 'CONSULTANDO_CREDITO',
      'calificado': 'LISTO_ANALISIS',
      'propuesta': 'PREAPROBADO',
      'negociacion': 'APROBADO',
      'cerrado-ganado': 'CERRADO_GANADO',
      'cerrado-perdido': 'RECHAZADO',
      // Mapeo nuevo (ManyChat pipeline)
      'cliente-nuevo': 'CLIENTE_NUEVO',
      'consultando-credito': 'CONSULTANDO_CREDITO',
      'solicitando-docs': 'SOLICITANDO_DOCS',
      'solicitando-documentacion': 'SOLICITANDO_DOCS',
      'listo-analisis': 'LISTO_ANALISIS',
      'preaprobado': 'PREAPROBADO',
      'aprobado': 'APROBADO',
      'en-seguimiento': 'EN_SEGUIMIENTO',
      'cerrado_ganado': 'CERRADO_GANADO',
      'venta-cerrada': 'CERRADO_GANADO',
      'encuesta': 'ENCUESTA',
      'encuesta-pendiente': 'ENCUESTA',
      'rechazado': 'RECHAZADO',
      'cerrado_perdido': 'RECHAZADO',
      'solicitar-referido': 'SOLICITAR_REFERIDO'
    }

    const fromStageEnum = stageMapping[normalizedFromStageId] || normalizedFromStageId
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
              updated_at: new Date().toISOString(),
              probability_percent: pipelineService.getProbabilityForStage(toStageEnum as any)
            })
          })
          
          if (!updateResult || updateResult.length === 0) {
            throw new Error('No result returned from pipeline update')
          }
          
          logger.info('Pipeline updated directly', {
            leadId,
            updateResult: 'success'
          })
          pipelineUpdated = true
        } else {
          logger.info('Pipeline record not found, creating new one', { leadId })
          
          // Si no existe pipeline, crearlo usando el servicio que maneja todos los campos requeridos
          try {
            const newPipeline = await pipelineService.createLeadPipeline(leadId, session.user.id)
            
            // Ahora actualizar la etapa al valor deseado
            if (newPipeline) {
              const updateResult = await supabase.request(`/lead_pipeline?id=eq.${newPipeline.id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=representation' },
                body: JSON.stringify({
                  current_stage: toStageEnum,
                  stage_entered_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  probability_percent: pipelineService.getProbabilityForStage(toStageEnum as any)
                })
              })
              
              if (!updateResult || updateResult.length === 0) {
                throw new Error('No result returned from pipeline stage update')
              }
              
              logger.info('Pipeline created and updated to target stage', {
                leadId,
                pipelineId: newPipeline.id,
                toStageEnum
              })
              pipelineUpdated = true
            }
          } catch (createError: any) {
            logger.error('Error creating pipeline via service', {
              error: createError.message,
              stack: createError.stack,
              leadId
            })
            throw createError // Re-lanzar para que se capture en el catch externo
          }
        }
      } catch (directUpdateError: any) {
        logger.error('Error in direct pipeline update', {
          error: directUpdateError.message,
          stack: directUpdateError.stack,
          leadId,
          errorType: directUpdateError.constructor.name,
          errorDetails: directUpdateError
        })
        // No re-lanzar aquí, dejar que continúe para intentar otras opciones
        // El error se manejará al final si pipelineUpdated sigue siendo false
      }
    }

    if (!pipelineUpdated) {
      // Intentar una última vez crear el pipeline de forma más simple
      try {
        logger.info('Attempting final fallback: create minimal pipeline', { 
          leadId,
          toStageEnum,
          leadExists: !!lead,
          leadIdType: typeof leadId,
          leadIdLength: leadId?.length
        })
        
        // Verificar nuevamente que el lead existe
        if (!lead) {
          throw new Error('Lead no encontrado en la verificación inicial')
        }
        
        const minimalPipeline = await supabase.request('/lead_pipeline', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            lead_id: leadId,
            current_stage: toStageEnum,
            probability_percent: pipelineService.getProbabilityForStage(toStageEnum as any),
            stage_entered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        })
        
        if (minimalPipeline && minimalPipeline.length > 0) {
          logger.info('Pipeline created successfully with minimal data', { 
            leadId,
            pipelineId: minimalPipeline[0]?.id 
          })
          pipelineUpdated = true
        } else {
          throw new Error('No se retornó ningún pipeline después de la creación')
        }
      } catch (finalError: any) {
        logger.error('Final fallback also failed', {
          error: finalError.message,
          stack: finalError.stack,
          leadId,
          toStageEnum,
          errorType: finalError.constructor?.name,
          errorResponse: finalError.response?.data || finalError.details || finalError,
          leadExists: !!lead
        })
      }
    }

    if (!pipelineUpdated) {
      logger.error('Failed to update pipeline in database after all attempts', { 
        leadId,
        toStageEnum,
        fromStageEnum
      })
      return NextResponse.json({
        error: 'Database update failed',
        message: 'No se pudo actualizar el pipeline en la base de datos. Verifique que el lead existe y que tiene permisos.',
        details: 'El sistema intentó múltiples métodos pero todos fallaron. Revise los logs del servidor para más detalles.'
      }, { status: 500 })
    }

    // Sincronizar cambio de etapa con ManyChat (no crítico si falla)
    let manychatSynced = false
    try {
      // Usar el lead que ya verificamos anteriormente
      
      if (lead && lead.manychatId) {
        logger.info('Syncing pipeline change to ManyChat', {
          leadId,
          manychatId: lead.manychatId,
          fromStage: fromStageEnum,
          toStage: toStageEnum
        })

        await syncPipelineToManychat({
          leadId,
          manychatId: lead.manychatId,
          previousStage: fromStageEnum,
          newStage: toStageEnum,
          userId: session.user.id,
          notes
        })

        manychatSynced = true
        logger.info('Successfully synced to ManyChat', {
          leadId,
          manychatId: lead.manychatId
        })
      } else {
        logger.info('Lead does not have ManyChat ID, skipping sync', { leadId })
      }
    } catch (manychatError: any) {
      logger.warn('Failed to sync to ManyChat (non-critical)', {
        error: manychatError.message,
        leadId
      })
      // Continuar aunque falle la sincronización con ManyChat
      // No bloqueamos el movimiento del lead si ManyChat falla
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
      manychatSynced,
      warnings: validationResult.warnings.length
    })

    return NextResponse.json({
      success: true,
      message: manychatSynced 
        ? 'Lead movido y sincronizado con ManyChat' 
        : 'Lead movido exitosamente',
      transition,
      manychatSynced,
      warnings: validationResult.warnings
    })

  } catch (error: any) {
    logger.error('Error moving lead', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      errorType: error.constructor?.name,
      userId: (await getServerSession(authOptions))?.user?.id,
      leadId: params?.leadId,
      errorDetails: error.response?.data || error.details || error
    })

    // Si el error tiene un mensaje específico, usarlo
    const errorMessage = error.message || 'Error interno del servidor al mover lead'
    const errorDetails = error.response?.data?.details || error.details || null

    return NextResponse.json({
      error: 'Internal server error',
      message: errorMessage,
      details: errorDetails,
      errorType: error.name || 'UnknownError'
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

  // Mapeo completo de todas las etapas del pipeline (nuevas y legacy)
  const stages: Record<string, { order: number; name: string }> = {
    // Etapas nuevas (ManyChat pipeline)
    'cliente-nuevo': { order: 1, name: 'Cliente Nuevo' },
    'consultando-credito': { order: 2, name: 'Consultando Crédito' },
    'solicitando-docs': { order: 3, name: 'Solicitando Documentación' },
    'solicitando-documentacion': { order: 3, name: 'Solicitando Documentación' },
    'listo-analisis': { order: 4, name: 'Listo para Análisis' },
    'preaprobado': { order: 5, name: 'Preaprobado' },
    'aprobado': { order: 6, name: 'Aprobado' },
    'en-seguimiento': { order: 7, name: 'En Seguimiento' },
    'cerrado-ganado': { order: 8, name: 'Cerrado Ganado' },
    'venta-cerrada': { order: 8, name: 'Cerrado Ganado' },
    'cerrado_ganado': { order: 8, name: 'Cerrado Ganado' },
    'rechazado': { order: 9, name: 'Rechazado' },
    'credito-rechazado': { order: 9, name: 'Rechazado' },
    'cerrado-perdido': { order: 9, name: 'Cerrado Perdido' },
    'cerrado_perdido': { order: 9, name: 'Cerrado Perdido' },
    'encuesta': { order: 10, name: 'Encuesta' },
    'encuesta-pendiente': { order: 10, name: 'Encuesta Pendiente' },
    'solicitar-referido': { order: 11, name: 'Solicitar Referido' },
    
    // Etapas legacy (soporte retrocompatibilidad)
    'nuevo': { order: 1, name: 'Nuevo Lead' },
    'contactado': { order: 2, name: 'Contactado' },
    'calificado': { order: 3, name: 'Calificado' },
    'propuesta': { order: 4, name: 'Propuesta Enviada' },
    'negociacion': { order: 5, name: 'Negociación' }
  }

  const fromStage = stages[fromStageId]
  const toStage = stages[toStageId]

  // Si las etapas no están en el mapeo, permitir la transición pero con warning
  if (!fromStage || !toStage) {
    // Permitir transiciones desconocidas (pueden ser etapas personalizadas)
    warnings.push(`Transición entre etapas no estándar: ${fromStageId} → ${toStageId}`)
    return { isValid: true, errors, warnings }
  }

  // Validar salto de etapas (solo warning, no bloquea)
  const orderDiff = Math.abs(toStage.order - fromStage.order)
  if (orderDiff > 1 && !['cerrado-ganado', 'cerrado_ganado', 'venta-cerrada', 'rechazado', 'credito-rechazado', 'cerrado-perdido', 'cerrado_perdido'].includes(toStageId)) {
    warnings.push(`Se está saltando ${orderDiff - 1} etapa(s) del pipeline`)
  }

  // Permitir retrocesos (solo warning, no error)
  if (toStage.order < fromStage.order && !['rechazado', 'credito-rechazado', 'cerrado-perdido', 'cerrado_perdido'].includes(toStageId)) {
    warnings.push('Se está retrocediendo en el pipeline')
    // No bloqueamos retrocesos, solo avisamos
  }

  // Validaciones específicas por etapa (solo bloquean si es crítico)
  switch (toStageId) {
    case 'preaprobado':
      // Permitir transición desde cualquier etapa anterior
      // No hay restricciones críticas
      break
      
    case 'aprobado':
      // Recomendar que venga de preaprobado, pero no bloquear
      if (!['preaprobado', 'listo-analisis'].includes(fromStageId)) {
        warnings.push('Se recomienda pasar por Preaprobado antes de Aprobado')
      }
      break
      
    case 'cerrado-ganado':
    case 'cerrado_ganado':
    case 'venta-cerrada':
      // Recomendar que haya pasado por aprobación, pero no bloquear
      if (!['aprobado', 'preaprobado', 'negociacion'].includes(fromStageId)) {
        warnings.push('Se recomienda pasar por Aprobado o Preaprobado antes de cerrar')
      }
      break
  }

  // Por defecto, permitir todas las transiciones
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