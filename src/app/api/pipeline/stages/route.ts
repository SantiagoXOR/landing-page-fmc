import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { PipelineStage } from '@/types/pipeline'

// Etapas por defecto del pipeline
const defaultStages: PipelineStage[] = [
  {
    id: 'cliente-nuevo',
    name: 'Cliente Nuevo',
    description: 'Leads recién ingresados al sistema',
    color: '#3B82F6',
    order: 1,
    isActive: true,
    rules: [
      {
        id: 'rule-1',
        type: 'required_field',
        field: 'telefono',
        message: 'El teléfono es requerido',
        isActive: true
      }
    ],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'consultando-credito',
    name: 'Consultando Crédito',
    description: 'Cliente está consultando opciones de crédito',
    color: '#10B981',
    order: 2,
    isActive: true,
    rules: [],
    automation: [
      {
        id: 'auto-1',
        trigger: 'on_enter',
        action: 'create_task',
        conditions: [],
        parameters: {
          title: 'Realizar seguimiento',
          type: 'follow_up',
          dueInDays: 2
        },
        isActive: true
      }
    ],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'solicitando-docs',
    name: 'Solicitando Documentación',
    description: 'Cliente está proporcionando documentación requerida',
    color: '#F59E0B',
    order: 3,
    isActive: true,
    rules: [],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'listo-analisis',
    name: 'Listo para Análisis',
    description: 'Documentación completa, listo para análisis crediticio',
    color: '#8B5CF6',
    order: 4,
    isActive: true,
    rules: [],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'preaprobado',
    name: 'Preaprobado',
    description: 'Crédito preaprobado, pendiente de documentación final',
    color: '#6366F1',
    order: 5,
    isActive: true,
    rules: [],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'rechazado',
    name: 'Rechazado',
    description: 'Crédito rechazado o cliente desistió',
    color: '#DC2626',
    order: 6,
    isActive: true,
    rules: [
      {
        id: 'rule-6',
        type: 'required_field',
        field: 'razon_perdida',
        message: 'La razón de rechazo es requerida',
        isActive: true
      }
    ],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'aprobado',
    name: 'Aprobado',
    description: 'Crédito aprobado, proceso de desembolso',
    color: '#06B6D4',
    order: 7,
    isActive: true,
    rules: [],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'en-seguimiento',
    name: 'En Seguimiento',
    description: 'Crédito activo, en seguimiento post-desembolso',
    color: '#84CC16',
    order: 8,
    isActive: true,
    rules: [
      {
        id: 'rule-5',
        type: 'required_field',
        field: 'valor_final',
        message: 'El valor final de la venta es requerido',
        isActive: true
      }
    ],
    automation: [
      {
        id: 'auto-3',
        trigger: 'on_enter',
        action: 'send_email',
        conditions: [],
        parameters: {
          template: 'venta_exitosa',
          to: 'admin'
        },
        isActive: true
      }
    ],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'cerrado-ganado',
    name: 'Cerrado Ganado',
    description: 'Venta exitosa completada',
    color: '#059669',
    order: 9,
    isActive: true,
    rules: [],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'encuesta',
    name: 'Encuesta Satisfacción',
    description: 'Encuesta de satisfacción post-venta',
    color: '#A855F7',
    order: 10,
    isActive: true,
    rules: [],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  },
  {
    id: 'solicitar-referido',
    name: 'Solicitar Referido',
    description: 'Solicitar referidos al cliente',
    color: '#EC4899',
    order: 11,
    isActive: true,
    rules: [],
    automation: [],
    metrics: {
      totalLeads: 0,
      averageTimeInStage: 0,
      conversionRate: 0,
      leadsThisWeek: 0,
      leadsThisMonth: 0,
      trend: 'stable'
    }
  }
]

/**
 * GET /api/pipeline/stages
 * Obtener todas las etapas del pipeline
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a las etapas del pipeline'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a las etapas del pipeline'
      }, { status: 403 })
    }

    // Por ahora devolvemos las etapas por defecto
    // En una implementación real, estas vendrían de la base de datos
    logger.info('Pipeline stages requested', {
      userId: session.user.id,
      userName: session.user.name,
      stagesCount: defaultStages.length
    })

    // Devolver en formato esperado por el servicio
    return NextResponse.json({ stages: defaultStages })

  } catch (error: any) {
    logger.error('Error getting pipeline stages', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener etapas del pipeline'
    }, { status: 500 })
  }
}

/**
 * POST /api/pipeline/stages
 * Crear nueva etapa del pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para crear etapas'
      }, { status: 401 })
    }

    // Verificar permisos de administrador
    try {
      checkPermission(session.user.role, 'admin:pipeline')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para crear etapas del pipeline'
      }, { status: 403 })
    }

    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.name || !body.color) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Nombre y color son requeridos'
      }, { status: 400 })
    }

    // Crear nueva etapa
    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      color: body.color,
      order: body.order || defaultStages.length + 1,
      isActive: body.isActive !== false,
      rules: body.rules || [],
      automation: body.automation || [],
      metrics: {
        totalLeads: 0,
        averageTimeInStage: 0,
        conversionRate: 0,
        leadsThisWeek: 0,
        leadsThisMonth: 0,
        trend: 'stable'
      }
    }

    logger.info('Pipeline stage created', {
      userId: session.user.id,
      userName: session.user.name,
      stageId: newStage.id,
      stageName: newStage.name
    })

    return NextResponse.json(newStage, { status: 201 })

  } catch (error: any) {
    logger.error('Error creating pipeline stage', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al crear etapa'
    }, { status: 500 })
  }
}
