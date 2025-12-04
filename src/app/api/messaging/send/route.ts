import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { MessagingService } from '@/server/services/messaging-service'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { ConversationService } from '@/server/services/conversation-service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

/**
 * POST /api/messaging/send
 * 
 * Endpoint unificado para enviar mensajes a través de múltiples canales
 * (WhatsApp, Instagram, Facebook Messenger) usando ManyChat
 * 
 * Request body:
 * {
 *   leadId?: string
 *   conversationId?: string
 *   to: {
 *     phone?: string
 *     email?: string
 *     subscriberId?: number
 *   }
 *   message: string
 *   messageType?: 'text' | 'image' | 'video' | 'file' | 'audio'
 *   mediaUrl?: string
 *   caption?: string
 *   filename?: string
 *   channel?: 'whatsapp' | 'instagram' | 'facebook' | 'auto'
 *   tag?: string
 * }
 */

// Esquema de validación
const SendMessageSchema = z.object({
  leadId: z.string().cuid().optional(),
  conversationId: z.string().cuid().optional(),
  to: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    subscriberId: z.number().positive().optional(),
  }).refine(
    (data) => data.phone || data.email || data.subscriberId,
    { message: 'Debe proporcionar al menos un identificador (phone, email o subscriberId)' }
  ),
  message: z.string().min(1).max(4096),
  messageType: z.enum(['text', 'image', 'video', 'file', 'audio']).optional().default('text'),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
  channel: z.enum(['whatsapp', 'instagram', 'facebook', 'auto']).optional().default('auto'),
  tag: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      logger.warn('Intento de envío de mensaje no autorizado', {
        path: '/api/messaging/send'
      })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:write')
    } catch (error) {
      logger.warn('Usuario sin permisos para enviar mensajes', {
        userId: session.user.id,
        role: session.user.role,
        path: '/api/messaging/send'
      })
      return NextResponse.json(
        { error: 'Sin permisos para enviar mensajes' },
        { status: 403 }
      )
    }

    // Validar datos de entrada
    let body
    try {
      body = await request.json()
    } catch (error) {
      logger.warn('Error parseando JSON en request body', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    let validatedData
    try {
      validatedData = SendMessageSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Error de validación en datos de entrada', {
          errors: error.errors,
          userId: session.user.id
        })
        return NextResponse.json(
          { 
            error: 'Datos de entrada inválidos',
            details: error.errors 
          },
          { status: 400 }
        )
      }
      throw error
    }

    logger.info('Iniciando envío de mensaje multi-canal', {
      leadId: validatedData.leadId,
      conversationId: validatedData.conversationId,
      hasPhone: !!validatedData.to.phone,
      hasEmail: !!validatedData.to.email,
      hasSubscriberId: !!validatedData.to.subscriberId,
      messageType: validatedData.messageType,
      messageLength: validatedData.message.length,
      channel: validatedData.channel,
      userId: session.user.id
    })

    // Si se proporciona conversationId, obtener información de la conversación
    let phoneNumber: string | undefined
    let email: string | undefined

    if (validatedData.conversationId) {
      const conversation = await ConversationService.getConversationById(validatedData.conversationId)
      if (conversation) {
        phoneNumber = conversation.lead?.telefono || conversation.platformId
        email = conversation.lead?.email
      }
    }

    // Usar datos de la conversación si no se proporcionaron explícitamente
    const to = {
      phone: validatedData.to.phone || phoneNumber,
      email: validatedData.to.email || email,
      subscriberId: validatedData.to.subscriberId,
    }

    // Enviar mensaje usando MessagingService
    const result = await MessagingService.sendMessage({
      to,
      message: validatedData.message,
      messageType: validatedData.messageType,
      mediaUrl: validatedData.mediaUrl,
      caption: validatedData.caption,
      filename: validatedData.filename,
      channel: validatedData.channel,
      tag: validatedData.tag,
    })

    if (!result.success) {
      logger.error('Error enviando mensaje', {
        error: result.error,
        errorCode: result.errorCode,
        channel: result.channel,
        userId: session.user.id
      })

      return NextResponse.json(
        { 
          error: result.error || 'Error al enviar mensaje',
          errorCode: result.errorCode,
          channel: result.channel
        },
        { status: 500 }
      )
    }

    // Si se proporcionó conversationId, crear registro de mensaje en la base de datos
    if (validatedData.conversationId && result.messageId) {
      try {
        await WhatsAppService.createMessage({
          conversationId: validatedData.conversationId,
          direction: 'outbound',
          content: validatedData.message,
          messageType: validatedData.messageType,
          mediaUrl: validatedData.mediaUrl,
          platformMsgId: result.messageId
        })

        // Actualizar última actividad de la conversación
        await ConversationService.updateLastActivity(validatedData.conversationId)

        logger.debug('Mensaje registrado en base de datos', {
          conversationId: validatedData.conversationId,
          messageId: result.messageId
        })
      } catch (error: any) {
        // Log pero no fallar el request si el mensaje ya se envió
        logger.warn('Error registrando mensaje en base de datos', {
          error: error.message,
          conversationId: validatedData.conversationId,
          messageId: result.messageId
        })
      }
    }

    logger.info('Mensaje enviado exitosamente', {
      messageId: result.messageId,
      channel: result.channel,
      subscriberId: result.subscriberId,
      conversationId: validatedData.conversationId,
      leadId: validatedData.leadId,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      channel: result.channel,
      subscriberId: result.subscriberId,
      conversationId: validatedData.conversationId,
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error inesperado en endpoint de envío de mensajes', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Sin permisos' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { 
        error: error.message || 'Error interno del servidor al enviar mensaje'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/messaging/send
 * 
 * Obtener información sobre el endpoint y canales disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    checkPermission(session.user.role, 'leads:read')

    return NextResponse.json({
      endpoint: '/api/messaging/send',
      description: 'Endpoint unificado para envío de mensajes multi-canal',
      supportedChannels: ['whatsapp', 'instagram', 'facebook'],
      messageTypes: ['text', 'image', 'video', 'file', 'audio'],
      autoChannelDetection: true,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error obteniendo información del endpoint' },
      { status: 500 }
    )
  }
}











