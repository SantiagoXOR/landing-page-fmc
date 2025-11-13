import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { AutomationExecution } from '@/types/automation'

// Ejecuciones de ejemplo
const mockExecutions: AutomationExecution[] = [
  {
    id: 'exec-1708012345678-abc123',
    ruleId: 'rule-1',
    leadId: 'lead-001',
    triggeredBy: 'system',
    triggeredAt: new Date('2024-02-15T14:30:00Z'),
    completedAt: new Date('2024-02-15T14:30:02Z'),
    status: 'completed',
    triggerData: {
      fromStageId: null,
      toStageId: 'nuevo',
      leadName: 'María González'
    },
    leadData: {
      id: 'lead-001',
      nombre: 'María González',
      email: 'maria.gonzalez@email.com',
      telefono: '+54 370 4123456',
      stageId: 'nuevo'
    },
    userContext: {
      userId: 'system'
    },
    actionsExecuted: [
      {
        actionId: 'action-1',
        actionType: 'create_task',
        status: 'completed',
        startedAt: new Date('2024-02-15T14:30:01Z'),
        completedAt: new Date('2024-02-15T14:30:02Z'),
        result: {
          taskId: 'task-12345',
          created: true
        },
        retryCount: 0,
        executionTimeMs: 850
      }
    ],
    totalActions: 1,
    successfulActions: 1,
    failedActions: 0,
    executionTimeMs: 2100,
    logs: [
      {
        id: 'log-1',
        timestamp: new Date('2024-02-15T14:30:01Z'),
        level: 'info',
        message: 'Automation rule triggered for lead stage change',
        data: { leadId: 'lead-001', fromStage: null, toStage: 'nuevo' }
      },
      {
        id: 'log-2',
        timestamp: new Date('2024-02-15T14:30:02Z'),
        level: 'info',
        message: 'Task created successfully',
        data: { taskId: 'task-12345' },
        actionId: 'action-1'
      }
    ]
  },
  {
    id: 'exec-1708012245678-def456',
    ruleId: 'rule-2',
    leadId: 'lead-002',
    triggeredBy: 'user-123',
    triggeredAt: new Date('2024-02-15T13:15:00Z'),
    completedAt: new Date('2024-02-15T13:15:05Z'),
    status: 'completed',
    triggerData: {
      leadCreated: true,
      priority: 'high',
      origen: 'WhatsApp'
    },
    leadData: {
      id: 'lead-002',
      nombre: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@email.com',
      telefono: '+54 370 4987654',
      priority: 'high',
      origen: 'WhatsApp'
    },
    userContext: {
      userId: 'user-123'
    },
    actionsExecuted: [
      {
        actionId: 'action-2',
        actionType: 'send_whatsapp',
        status: 'completed',
        startedAt: new Date('2024-02-15T13:15:02Z'),
        completedAt: new Date('2024-02-15T13:15:05Z'),
        result: {
          sent: true,
          messageId: 'whatsapp-msg-789'
        },
        retryCount: 0,
        executionTimeMs: 3200
      }
    ],
    totalActions: 1,
    successfulActions: 1,
    failedActions: 0,
    executionTimeMs: 5100,
    logs: [
      {
        id: 'log-3',
        timestamp: new Date('2024-02-15T13:15:01Z'),
        level: 'info',
        message: 'Automation rule triggered for new lead creation',
        data: { leadId: 'lead-002', priority: 'high' }
      },
      {
        id: 'log-4',
        timestamp: new Date('2024-02-15T13:15:05Z'),
        level: 'info',
        message: 'WhatsApp message sent successfully',
        data: { messageId: 'whatsapp-msg-789' },
        actionId: 'action-2'
      }
    ]
  },
  {
    id: 'exec-1708011145678-ghi789',
    ruleId: 'rule-3',
    leadId: 'lead-003',
    triggeredBy: 'system',
    triggeredAt: new Date('2024-02-15T10:00:00Z'),
    completedAt: new Date('2024-02-15T10:00:08Z'),
    status: 'failed',
    triggerData: {
      scheduledCheck: true,
      stageId: 'propuesta',
      daysInStage: 8
    },
    leadData: {
      id: 'lead-003',
      nombre: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      telefono: '+54 370 4555666',
      stageId: 'propuesta',
      stageEntryDate: new Date('2024-02-07T09:00:00Z')
    },
    userContext: {
      userId: 'system'
    },
    actionsExecuted: [
      {
        actionId: 'action-3',
        actionType: 'send_notification',
        status: 'completed',
        startedAt: new Date('2024-02-15T10:00:02Z'),
        completedAt: new Date('2024-02-15T10:00:04Z'),
        result: {
          sent: true,
          notificationId: 'notif-456'
        },
        retryCount: 0,
        executionTimeMs: 2100
      },
      {
        actionId: 'action-4',
        actionType: 'create_task',
        status: 'failed',
        startedAt: new Date('2024-02-15T10:00:05Z'),
        completedAt: new Date('2024-02-15T10:00:08Z'),
        error: 'Task creation failed: assigned user not found',
        retryCount: 2,
        executionTimeMs: 3000
      }
    ],
    totalActions: 2,
    successfulActions: 1,
    failedActions: 1,
    error: 'Partial execution failure',
    executionTimeMs: 8200,
    logs: [
      {
        id: 'log-5',
        timestamp: new Date('2024-02-15T10:00:01Z'),
        level: 'info',
        message: 'Automation rule triggered for time-based check',
        data: { leadId: 'lead-003', daysInStage: 8 }
      },
      {
        id: 'log-6',
        timestamp: new Date('2024-02-15T10:00:04Z'),
        level: 'info',
        message: 'Notification sent successfully',
        data: { notificationId: 'notif-456' },
        actionId: 'action-3'
      },
      {
        id: 'log-7',
        timestamp: new Date('2024-02-15T10:00:08Z'),
        level: 'error',
        message: 'Task creation failed after retries',
        data: { error: 'assigned user not found', retryCount: 2 },
        actionId: 'action-4'
      }
    ]
  },
  {
    id: 'exec-1708010045678-jkl012',
    ruleId: 'rule-1',
    leadId: 'lead-004',
    triggeredBy: 'user-456',
    triggeredAt: new Date('2024-02-15T08:30:00Z'),
    status: 'running',
    triggerData: {
      fromStageId: 'contactado',
      toStageId: 'calificado',
      leadName: 'Pedro López'
    },
    leadData: {
      id: 'lead-004',
      nombre: 'Pedro López',
      email: 'pedro.lopez@email.com',
      telefono: '+54 370 4777888',
      stageId: 'calificado'
    },
    userContext: {
      userId: 'user-456'
    },
    actionsExecuted: [],
    totalActions: 1,
    successfulActions: 0,
    failedActions: 0,
    executionTimeMs: 0,
    logs: [
      {
        id: 'log-8',
        timestamp: new Date('2024-02-15T08:30:00Z'),
        level: 'info',
        message: 'Automation rule triggered for lead stage change',
        data: { leadId: 'lead-004', fromStage: 'contactado', toStage: 'calificado' }
      }
    ]
  }
]

/**
 * GET /api/automation/executions
 * Obtener historial de ejecuciones de automatización
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a las ejecuciones'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'pipeline:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a las ejecuciones de automatización'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de filtro
    const ruleId = searchParams.get('ruleId')
    const leadId = searchParams.get('leadId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = parseInt(searchParams.get('limit') || '50')

    let filteredExecutions = [...mockExecutions]

    // Aplicar filtros
    if (ruleId) {
      filteredExecutions = filteredExecutions.filter(exec => exec.ruleId === ruleId)
    }

    if (leadId) {
      filteredExecutions = filteredExecutions.filter(exec => exec.leadId === leadId)
    }

    if (status) {
      filteredExecutions = filteredExecutions.filter(exec => exec.status === status)
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      filteredExecutions = filteredExecutions.filter(exec => 
        new Date(exec.triggeredAt) >= fromDate
      )
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      filteredExecutions = filteredExecutions.filter(exec => 
        new Date(exec.triggeredAt) <= toDate
      )
    }

    // Ordenar por fecha más reciente
    filteredExecutions.sort((a, b) => 
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    )

    // Aplicar límite
    filteredExecutions = filteredExecutions.slice(0, limit)

    logger.info('Automation executions requested', {
      userId: session.user.id,
      userName: session.user.name,
      filters: { ruleId, leadId, status, dateFrom, dateTo, limit },
      resultCount: filteredExecutions.length
    })

    return NextResponse.json(filteredExecutions)

  } catch (error: any) {
    logger.error('Error getting automation executions', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener ejecuciones de automatización'
    }, { status: 500 })
  }
}

/**
 * POST /api/automation/executions
 * Crear nueva ejecución (guardar resultado)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para crear ejecuciones'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'pipeline:write')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para crear ejecuciones de automatización'
      }, { status: 403 })
    }

    const execution = await request.json()

    // En una implementación real, guardar en base de datos
    mockExecutions.unshift(execution)

    logger.info('Automation execution saved', {
      userId: session.user.id,
      userName: session.user.name,
      executionId: execution.id,
      ruleId: execution.ruleId,
      status: execution.status
    })

    return NextResponse.json(execution, { status: 201 })

  } catch (error: any) {
    logger.error('Error saving automation execution', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al guardar ejecución de automatización'
    }, { status: 500 })
  }
}
