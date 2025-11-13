import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { AutomationRule } from '@/types/automation'

// Schema de validación para crear regla
const CreateRuleSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(5),
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
  }),
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
  })).default([]),
  actions: z.array(z.object({
    id: z.string(),
    type: z.enum(['send_email', 'send_whatsapp', 'create_task', 'update_field', 'move_stage', 'create_note', 'send_notification', 'webhook', 'wait', 'custom_function']),
    config: z.record(z.any()),
    continueOnError: z.boolean().default(true),
    retryCount: z.number().min(0).max(5).default(0),
    retryDelayMinutes: z.number().min(0).default(5),
    executeIf: z.array(z.any()).optional()
  })).min(1, 'Al menos una acción es requerida'),
  settings: z.object({
    maxExecutionsPerDay: z.number().optional(),
    maxExecutionsPerHour: z.number().optional(),
    maxExecutionsPerLead: z.number().optional(),
    allowedHours: z.object({
      start: z.string(),
      end: z.string()
    }).optional(),
    allowedDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
    timezone: z.string().default('America/Argentina/Buenos_Aires'),
    stopOnError: z.boolean().default(false),
    notifyOnError: z.boolean().default(true),
    errorNotificationRecipients: z.array(z.string()).optional(),
    logLevel: z.enum(['none', 'basic', 'detailed', 'debug']).default('basic'),
    retentionDays: z.number().min(1).max(365).default(30),
    requireApproval: z.boolean().default(false),
    approvalUsers: z.array(z.string()).optional(),
    globalVariables: z.record(z.any()).optional()
  }).default({})
})

// Reglas de automatización de ejemplo
const mockAutomationRules: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Seguimiento Automático - Lead Nuevo',
    description: 'Crear tarea de seguimiento cuando un lead entra en la etapa "Nuevo"',
    isActive: true,
    priority: 8,
    trigger: {
      type: 'stage_change',
      toStageId: 'nuevo'
    },
    conditions: [],
    actions: [
      {
        id: 'action-1',
        type: 'create_task',
        config: {
          taskTitle: 'Contactar lead nuevo',
          taskDescription: 'Realizar primer contacto con el lead para calificar interés',
          taskType: 'call',
          taskPriority: 'high',
          taskDueInDays: 1,
          taskAssignedTo: 'auto' // Se asigna automáticamente
        },
        continueOnError: true,
        retryCount: 2,
        retryDelayMinutes: 5
      }
    ],
    settings: {
      maxExecutionsPerLead: 1,
      allowedHours: {
        start: '09:00',
        end: '18:00'
      },
      allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timezone: 'America/Argentina/Buenos_Aires',
      stopOnError: false,
      notifyOnError: true,
      logLevel: 'basic',
      retentionDays: 30
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'admin',
    executionCount: 45,
    successCount: 43,
    errorCount: 2
  },
  {
    id: 'rule-2',
    name: 'WhatsApp de Bienvenida',
    description: 'Enviar mensaje de bienvenida por WhatsApp a leads de alta prioridad',
    isActive: true,
    priority: 9,
    trigger: {
      type: 'lead_created'
    },
    conditions: [
      {
        id: 'cond-1',
        field: 'priority',
        operator: 'in',
        value: ['high', 'urgent'],
        valueType: 'static'
      },
      {
        id: 'cond-2',
        field: 'origen',
        operator: 'equals',
        value: 'WhatsApp',
        valueType: 'static'
      }
    ],
    actions: [
      {
        id: 'action-2',
        type: 'send_whatsapp',
        config: {
          whatsappTemplate: 'bienvenida_lead',
          whatsappMessage: '¡Hola {{nombre}}! Gracias por contactarnos. En breve un asesor se comunicará contigo para ayudarte con tu consulta sobre propiedades en Formosa.'
        },
        continueOnError: true,
        retryCount: 3,
        retryDelayMinutes: 10
      }
    ],
    settings: {
      maxExecutionsPerLead: 1,
      logLevel: 'detailed',
      retentionDays: 60,
      stopOnError: false,
      notifyOnError: true,
      timezone: 'America/Argentina/Buenos_Aires'
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-01'),
    createdBy: 'manager',
    executionCount: 28,
    successCount: 26,
    errorCount: 2
  },
  {
    id: 'rule-3',
    name: 'Recordatorio Propuesta Vencida',
    description: 'Notificar cuando una propuesta lleva más de 7 días sin respuesta',
    isActive: true,
    priority: 6,
    trigger: {
      type: 'time_based',
      schedule: {
        type: 'interval',
        intervalDays: 1
      }
    },
    conditions: [
      {
        id: 'cond-3',
        field: 'stageId',
        operator: 'equals',
        value: 'propuesta',
        valueType: 'static'
      },
      {
        id: 'cond-4',
        field: 'stageEntryDate',
        operator: 'less_than',
        value: 7,
        valueType: 'function',
        dynamicValue: {
          type: 'current_date',
          parameter: 'days_ago'
        }
      }
    ],
    actions: [
      {
        id: 'action-3',
        type: 'send_notification',
        config: {
          notificationTitle: 'Propuesta sin respuesta',
          notificationMessage: 'El lead {{nombre}} tiene una propuesta pendiente hace {{dias_en_etapa}} días',
          notificationRecipients: ['assigned_user', 'manager'],
          notificationChannels: ['email', 'in_app']
        },
        continueOnError: true,
        retryCount: 1,
        retryDelayMinutes: 30
      },
      {
        id: 'action-4',
        type: 'create_task',
        config: {
          taskTitle: 'Seguimiento propuesta vencida',
          taskDescription: 'Contactar al lead para conocer el estado de la propuesta',
          taskType: 'follow_up',
          taskPriority: 'medium',
          taskDueInDays: 1
        },
        continueOnError: true,
        retryCount: 0,
        retryDelayMinutes: 0
      }
    ],
    settings: {
      maxExecutionsPerLead: 3,
      allowedHours: {
        start: '08:00',
        end: '20:00'
      },
      logLevel: 'detailed',
      retentionDays: 90,
      stopOnError: false,
      notifyOnError: true,
      timezone: 'America/Argentina/Buenos_Aires'
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15'),
    createdBy: 'admin',
    executionCount: 12,
    successCount: 11,
    errorCount: 1
  }
]

/**
 * GET /api/automation/rules
 * Obtener reglas de automatización
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a las reglas de automatización'
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

    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de filtro
    const isActive = searchParams.get('isActive')
    const trigger = searchParams.get('trigger')
    const category = searchParams.get('category')

    let filteredRules = [...mockAutomationRules]

    // Aplicar filtros
    if (isActive !== null) {
      filteredRules = filteredRules.filter(rule => rule.isActive === (isActive === 'true'))
    }

    if (trigger) {
      filteredRules = filteredRules.filter(rule => rule.trigger.type === trigger)
    }

    // Ordenar por prioridad
    filteredRules.sort((a, b) => b.priority - a.priority)

    logger.info('Automation rules requested', {
      userId: session.user.id,
      userName: session.user.name,
      filters: { isActive, trigger, category },
      resultCount: filteredRules.length
    })

    return NextResponse.json(filteredRules)

  } catch (error: any) {
    logger.error('Error getting automation rules', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener reglas de automatización'
    }, { status: 500 })
  }
}

/**
 * POST /api/automation/rules
 * Crear nueva regla de automatización
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para crear reglas de automatización'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'pipeline:manage')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para crear reglas de automatización'
      }, { status: 403 })
    }

    const body = await request.json()
    
    // Validar datos de entrada
    let validatedData
    try {
      validatedData = CreateRuleSchema.parse(body)
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

    // Crear nueva regla
    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
      executionCount: 0,
      successCount: 0,
      errorCount: 0
    }

    // En una implementación real, guardar en base de datos
    mockAutomationRules.push(newRule)

    logger.info('Automation rule created', {
      userId: session.user.id,
      userName: session.user.name,
      ruleId: newRule.id,
      ruleName: newRule.name,
      triggerType: newRule.trigger.type,
      actionsCount: newRule.actions.length
    })

    return NextResponse.json(newRule, { status: 201 })

  } catch (error: any) {
    logger.error('Error creating automation rule', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al crear regla de automatización'
    }, { status: 500 })
  }
}
