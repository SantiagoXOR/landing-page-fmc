import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { AutomationMetrics } from '@/types/automation'

/**
 * GET /api/automation/metrics
 * Obtener métricas del sistema de automatización
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a las métricas'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'pipeline:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a las métricas de automatización'
      }, { status: 403 })
    }

    // En una implementación real, calcular métricas desde la base de datos
    const mockMetrics: AutomationMetrics = {
      totalRules: 3,
      activeRules: 3,
      totalExecutions: 85,
      successfulExecutions: 80,
      failedExecutions: 5,
      averageExecutionTime: 1250,
      
      // Por período
      executionsToday: 12,
      executionsThisWeek: 45,
      executionsThisMonth: 85,
      
      // Por tipo de trigger
      triggerStats: {
        'stage_change': 35,
        'lead_created': 28,
        'time_based': 12,
        'field_update': 8,
        'task_completed': 2
      },
      
      // Por tipo de acción
      actionStats: {
        'create_task': 45,
        'send_whatsapp': 28,
        'send_notification': 24,
        'update_field': 15,
        'send_email': 12,
        'create_note': 8,
        'move_stage': 5
      },
      
      // Errores más comunes
      commonErrors: [
        {
          error: 'WhatsApp API rate limit exceeded',
          count: 3,
          lastOccurrence: new Date('2024-02-15T14:30:00Z')
        },
        {
          error: 'Email template not found',
          count: 2,
          lastOccurrence: new Date('2024-02-14T09:15:00Z')
        }
      ],
      
      // Reglas más utilizadas
      topRules: [
        {
          ruleId: 'rule-1',
          ruleName: 'Seguimiento Automático - Lead Nuevo',
          executionCount: 45,
          successRate: 95.6
        },
        {
          ruleId: 'rule-2',
          ruleName: 'WhatsApp de Bienvenida',
          executionCount: 28,
          successRate: 92.9
        },
        {
          ruleId: 'rule-3',
          ruleName: 'Recordatorio Propuesta Vencida',
          executionCount: 12,
          successRate: 91.7
        }
      ]
    }

    logger.info('Automation metrics requested', {
      userId: session.user.id,
      userName: session.user.name
    })

    return NextResponse.json(mockMetrics)

  } catch (error: any) {
    logger.error('Error getting automation metrics', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener métricas de automatización'
    }, { status: 500 })
  }
}
