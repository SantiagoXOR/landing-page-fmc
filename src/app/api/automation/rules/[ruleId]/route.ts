import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema de validación para actualizar regla
const UpdateRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().min(1).max(10).optional(),
  trigger: z.object({
    type: z.enum(['stage_change', 'field_update', 'time_based', 'lead_created', 'task_completed', 'email_received', 'whatsapp_received', 'manual']),
    fromStageId: z.string().optional(),
    toStageId: z.string().optional(),
    fieldName: z.string().optional(),
    schedule: z.object({
      type: z.enum(['interval', 'cron', 'delay']),
      intervalMinutes: z.number().optional(),
      intervalHours: z.number().optional(),
      intervalDays: z.number().optional(),
      cronExpression: z.string().optional(),
      timezone: z.string().optional(),
      delayMinutes: z.number().optional(),
      delayHours: z.number().optional(),
      delayDays: z.number().optional(),
      maxExecutions: z.number().optional(),
      endDate: z.string().transform(str => str ? new Date(str) : undefined).optional()
    }).optional(),
    eventType: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).optional(),
  conditions: z.array(z.object({
    id: z.string(),
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'exists', 'not_exists', 'in', 'not_in', 'regex']),
    value: z.any().optional(),
    valueType: z.enum(['static', 'field', 'function', 'user_input']).default('static'),
    logicalOperator: z.enum(['AND', 'OR']).optional(),
    group: z.string().optional(),
    dynamicValue: z.object({
      type: z.enum(['current_user', 'current_date', 'lead_field', 'stage_field', 'custom_function']),
      parameter: z.string().optional()
    }).optional()
  })).optional(),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(['send_email', 'send_whatsapp', 'create_task', 'update_field', 'move_stage', 'create_note', 'send_notification', 'webhook', 'wait', 'custom_function']),
    config: z.record(z.any()),
    continueOnError: z.boolean().default(true),
    retryCount: z.number().min(0).max(5).default(0),
    retryDelayMinutes: z.number().min(0).default(5),
    executeIf: z.array(z.any()).optional()
  })).optional(),
  settings: z.object({
    maxExecutionsPerDay: z.number().optional(),
    maxExecutionsPerHour: z.number().optional(),
    maxExecutionsPerLead: z.number().optional(),
    allowedHours: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    allowedDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
    timezone: z.string().optional(),
    stopOnError: z.boolean().optional(),
    notifyOnError: z.boolean().optional(),
    errorNotificationRecipients: z.array(z.string()).optional(),
    logLevel: z.enum(['none', 'basic', 'detailed', 'debug']).optional(),
    retentionDays: z.number().min(1).max(365).optional(),
    requireApproval: z.boolean().optional(),
    approvalUsers: z.array(z.string()).optional(),
    globalVariables: z.record(z.any()).optional()
  }).optional()
})

/**
 * GET /api/automation/rules/[ruleId]
 * Obtener regla específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a la regla'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'pipeline:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a las reglas de automatización'
      }, { status: 403 })
    }

    const { ruleId } = params

    // En una implementación real, buscar en base de datos
    // Por ahora, simulamos que no existe
    return NextResponse.json({
      error: 'Not found',
      message: 'Regla de automatización no encontrada'
    }, { status: 404 })

  } catch (error: any) {
    logger.error('Error getting automation rule', {
      error: error.message,
      stack: error.stack,
      ruleId: params.ruleId,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener regla de automatización'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/automation/rules/[ruleId]
 * Actualizar regla específica
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para actualizar la regla'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'pipeline:manage')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para actualizar reglas de automatización'
      }, { status: 403 })
    }

    const { ruleId } = params
    const body = await request.json()
    
    // Validar datos de entrada
    let validatedData
    try {
      validatedData = UpdateRuleSchema.parse(body)
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

    // En una implementación real, actualizar en base de datos
    const updatedRule = {
      id: ruleId,
      ...validatedData,
      updatedAt: new Date()
    }

    logger.info('Automation rule updated', {
      userId: session.user.id,
      userName: session.user.name,
      ruleId,
      updates: Object.keys(validatedData)
    })

    return NextResponse.json(updatedRule)

  } catch (error: any) {
    logger.error('Error updating automation rule', {
      error: error.message,
      stack: error.stack,
      ruleId: params.ruleId,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al actualizar regla de automatización'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/automation/rules/[ruleId]
 * Eliminar regla específica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para eliminar la regla'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'pipeline:manage')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para eliminar reglas de automatización'
      }, { status: 403 })
    }

    const { ruleId } = params

    // En una implementación real, eliminar de base de datos
    // Verificar que la regla existe y pertenece al usuario/organización

    logger.info('Automation rule deleted', {
      userId: session.user.id,
      userName: session.user.name,
      ruleId
    })

    return NextResponse.json({ 
      success: true,
      message: 'Regla de automatización eliminada exitosamente'
    })

  } catch (error: any) {
    logger.error('Error deleting automation rule', {
      error: error.message,
      stack: error.stack,
      ruleId: params.ruleId,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al eliminar regla de automatización'
    }, { status: 500 })
  }
}
