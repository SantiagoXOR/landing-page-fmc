import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { EventRepository } from '@/server/repositories/event-repository'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { supabase } from '@/lib/db'

const eventRepo = new EventRepository()

// Esquema de validación para envío de mensajes
const SendMessageSchema = z.object({
  to: z.string().min(10, 'El número de teléfono es requerido'),
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(4096, 'El mensaje es demasiado largo'),
  messageType: z.enum(['text', 'image', 'video', 'audio', 'document']).default('text'),
  mediaUrl: z.string().url().optional().or(z.literal('')),
  leadId: z.string().optional(), // Opcional para compatibilidad
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      logger.warn('Unauthorized access attempt to send-message endpoint')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:write')
    } catch (permissionError) {
      logger.warn('Insufficient permissions for send-message', {
        userId: session.user.id,
        role: session.user.role
      })
      return NextResponse.json(
        { error: 'Sin permisos para enviar mensajes' },
        { status: 403 }
      )
    }

    // Validar datos
    const body = await request.json()
    let validatedData
    try {
      validatedData = SendMessageSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn('Validation error in send-message', {
          errors: validationError.errors,
          userId: session.user.id
        })
        return NextResponse.json(
          { 
            error: 'Datos inválidos',
            details: validationError.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Verificar que WhatsApp esté configurado
    if (!WhatsAppService.isConfigured()) {
      logger.warn('WhatsApp not configured', { userId: session.user.id })
      return NextResponse.json(
        { error: 'WhatsApp no está configurado' },
        { status: 503 }
      )
    }

    // Intentar obtener leadId si no se proporcionó
    let leadId = validatedData.leadId
    if (!leadId) {
      try {
        const lead = await supabase.findLeadByPhoneOrDni(validatedData.to)
        if (lead) {
          leadId = lead.id
          logger.debug('Lead ID found from phone number', {
            leadId,
            phone: validatedData.to.substring(0, 5) + '***'
          })
        }
      } catch (findError) {
        logger.warn('Could not find lead by phone', {
          phone: validatedData.to.substring(0, 5) + '***',
          error: findError instanceof Error ? findError.message : 'Unknown error'
        })
        // Continuar sin leadId, el mensaje se puede enviar igual
      }
    }

    logger.info('Sending WhatsApp message', {
      userId: session.user.id,
      phone: validatedData.to.substring(0, 5) + '***',
      messageType: validatedData.messageType,
      hasMedia: !!validatedData.mediaUrl,
      leadId
    })

    // Enviar mensaje
    const result = await WhatsAppService.sendMessage({
      to: validatedData.to,
      message: validatedData.message,
      mediaUrl: validatedData.mediaUrl || undefined,
      messageType: validatedData.messageType,
      leadId: leadId // Pasar leadId para sincronización si es necesario
    })

    if (!result || !result.messageId) {
      logger.error('WhatsApp service returned invalid result', {
        result,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje. El servicio no retornó un ID de mensaje válido.' },
        { status: 500 }
      )
    }

    // Registrar evento de mensaje enviado si tenemos leadId
    if (leadId) {
      try {
        await eventRepo.create({
          leadId,
          tipo: 'whatsapp_out',
          payload: {
            mensaje: validatedData.message,
            telefono: validatedData.to,
            messageId: result.messageId,
            messageType: validatedData.messageType,
            mediaUrl: validatedData.mediaUrl,
            sentBy: session.user.id,
            sentAt: new Date().toISOString()
          }
        })
        logger.info('Event registered for sent message', {
          leadId,
          messageId: result.messageId
        })
      } catch (eventError) {
        logger.error('Error registering event for sent message', {
          error: eventError instanceof Error ? eventError.message : 'Unknown error',
          leadId,
          messageId: result.messageId
        })
        // No fallar el request si falla el registro del evento
      }
    }

    logger.info('WhatsApp message sent successfully', {
      messageId: result.messageId,
      provider: result.provider,
      userId: session.user.id,
      leadId
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider
    })

  } catch (error: any) {
    logger.error('Error sending WhatsApp message', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    // Proporcionar mensajes de error más específicos
    let errorMessage = 'Error al enviar el mensaje'
    let statusCode = 500

    if (error.message?.includes('not found') || error.message?.includes('no encontrado')) {
      errorMessage = 'El contacto no está sincronizado con ManyChat. Por favor, sincroniza el contacto primero.'
      statusCode = 404
    } else if (error.message?.includes('not configured') || error.message?.includes('no configurado')) {
      errorMessage = 'WhatsApp no está configurado correctamente. Contacta al administrador.'
      statusCode = 503
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    )
  }
}
