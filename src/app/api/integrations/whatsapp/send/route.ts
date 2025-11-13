import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getIntegrationManager } from '@/lib/integrations/integration-manager'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Schema de validación para envío de mensajes
const SendMessageSchema = z.object({
  to: z.string().min(10, 'Número de teléfono inválido'),
  type: z.enum(['text', 'template']),
  message: z.string().min(1, 'Mensaje es requerido').optional(),
  templateName: z.string().optional(),
  languageCode: z.string().default('es').optional(),
  components: z.array(z.any()).optional()
}).refine(data => {
  if (data.type === 'text' && !data.message) {
    return false
  }
  if (data.type === 'template' && !data.templateName) {
    return false
  }
  return true
}, {
  message: 'Para mensajes de texto se requiere message, para templates se requiere templateName'
})

/**
 * POST /api/integrations/whatsapp/send
 * Enviar mensaje de WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para enviar mensajes'
      }, { status: 401 })
    }

    // Verificar permisos para enviar mensajes
    try {
      checkPermission(session.user.role, 'leads:write')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para enviar mensajes'
      }, { status: 403 })
    }

    const body = await request.json()
    
    // Validar datos de entrada
    let validatedData
    try {
      validatedData = SendMessageSchema.parse(body)
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

    const integrationManager = getIntegrationManager()
    
    if (!integrationManager) {
      return NextResponse.json({
        error: 'Integration manager not available',
        message: 'El gestor de integraciones no está disponible'
      }, { status: 503 })
    }

    // Verificar que WhatsApp esté habilitado
    if (!integrationManager.isIntegrationEnabled('whatsapp')) {
      return NextResponse.json({
        error: 'WhatsApp integration disabled',
        message: 'La integración de WhatsApp está deshabilitada'
      }, { status: 503 })
    }

    let result
    
    if (validatedData.type === 'text') {
      // Enviar mensaje de texto
      result = await integrationManager.sendWhatsAppMessage(
        validatedData.to,
        validatedData.message!
      )
    } else {
      // Enviar template
      result = await integrationManager.sendWhatsAppTemplate(
        validatedData.to,
        validatedData.templateName!,
        validatedData.languageCode,
        validatedData.components
      )
    }

    if (result.success) {
      logger.info('WhatsApp message sent successfully', {
        userId: session.user.id,
        userName: session.user.name,
        to: validatedData.to,
        type: validatedData.type,
        messageId: result.data?.messages?.[0]?.id
      })

      return NextResponse.json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: result.data,
        timestamp: result.timestamp
      })
    } else {
      logger.error('Failed to send WhatsApp message', {
        userId: session.user.id,
        to: validatedData.to,
        type: validatedData.type,
        error: result.error
      })

      return NextResponse.json({
        error: 'Failed to send message',
        message: 'Error al enviar mensaje',
        details: result.error
      }, { status: 500 })
    }

  } catch (error: any) {
    logger.error('Error in WhatsApp send endpoint', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al enviar mensaje'
    }, { status: 500 })
  }
}

/**
 * GET /api/integrations/whatsapp/send
 * Obtener información sobre el envío de mensajes (templates disponibles, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a la información'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a esta información'
      }, { status: 403 })
    }

    const integrationManager = getIntegrationManager()
    
    if (!integrationManager) {
      return NextResponse.json({
        error: 'Integration manager not available',
        message: 'El gestor de integraciones no está disponible'
      }, { status: 503 })
    }

    const isEnabled = integrationManager.isIntegrationEnabled('whatsapp')
    const config = integrationManager.getIntegrationConfig('whatsapp') as any
    const metrics = integrationManager.getMetrics().whatsapp

    // Templates disponibles (esto se podría obtener de la API de WhatsApp en el futuro)
    const availableTemplates = [
      {
        name: 'bienvenida',
        language: 'es',
        description: 'Mensaje de bienvenida para nuevos leads'
      },
      {
        name: 'seguimiento',
        language: 'es', 
        description: 'Mensaje de seguimiento para leads existentes'
      },
      {
        name: 'recordatorio',
        language: 'es',
        description: 'Recordatorio de documentación pendiente'
      }
    ]

    return NextResponse.json({
      enabled: isEnabled,
      phoneNumber: config?.phoneNumberId ? `***${config.phoneNumberId.slice(-4)}` : null,
      metrics: metrics || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0
      },
      availableTemplates,
      messageTypes: [
        {
          type: 'text',
          description: 'Mensaje de texto simple',
          required: ['to', 'message']
        },
        {
          type: 'template',
          description: 'Mensaje usando template pre-aprobado',
          required: ['to', 'templateName'],
          optional: ['languageCode', 'components']
        }
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Error getting WhatsApp send info', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor'
    }, { status: 500 })
  }
}
