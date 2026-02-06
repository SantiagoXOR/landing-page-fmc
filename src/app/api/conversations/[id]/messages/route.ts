import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { ConversationService } from '@/server/services/conversation-service'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { MessagingService } from '@/server/services/messaging-service'
import { logger } from '@/lib/logger'
import { toSafeISOString } from '@/lib/safe-date-utils'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      logger.warn('Intento de acceso no autorizado a mensajes', {
        conversationId: params.id
      })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      logger.warn('Usuario sin permisos para leer mensajes', {
        userId: session.user.id,
        role: session.user.role,
        conversationId: params.id
      })
      return NextResponse.json(
        { error: 'Sin permisos' },
        { status: 403 }
      )
    }

    logger.debug('Obteniendo mensajes de conversación', {
      conversationId: params.id,
      userId: session.user.id
    })

    const conversation = await ConversationService.getConversationById(params.id)

    if (!conversation) {
      logger.warn('Conversación no encontrada', {
        conversationId: params.id,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Transformar mensajes al formato esperado por el frontend
    const formattedMessages = (conversation.messages || []).map((msg: any) => {
      // Obtener la mejor fecha disponible (sent_at tiene prioridad)
      const sentAt = msg.sent_at || msg.sentAt || msg.created_at || msg.createdAt
      const formattedSentAt = toSafeISOString(sentAt)
      
      return {
        id: msg.id,
        direction: msg.direction || (msg.message_type === 'outbound' ? 'outbound' : 'inbound'),
        content: msg.content || '',
        messageType: msg.message_type || msg.messageType || 'text',
        sentAt: formattedSentAt,
        readAt: msg.read_at || msg.readAt ? toSafeISOString(msg.read_at || msg.readAt) : undefined,
        isFromBot: msg.is_from_bot || msg.isFromBot || false,
        manychatFlowId: msg.manychat_flow_id || msg.manychatFlowId || undefined
      }
    })

    logger.info('Mensajes obtenidos exitosamente', {
      conversationId: params.id,
      messageCount: formattedMessages.length,
      userId: session.user.id
    })

    return NextResponse.json({ messages: formattedMessages })
  } catch (error: any) {
    logger.error('Error obteniendo mensajes', {
      error: error.message,
      stack: error.stack,
      conversationId: params.id
    })
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      logger.warn('Intento de envío de mensaje no autorizado', {
        conversationId: params.id
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
        conversationId: params.id
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
    } catch (parseError: any) {
      logger.error('Error parseando body del request', {
        error: parseError.message,
        conversationId: params.id,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'Error al procesar los datos del mensaje. Verifica el formato.' },
        { status: 400 }
      )
    }

    const { message, messageType = 'text', mediaUrl } = body || {}

    // Validación de mensaje
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      logger.warn('Intento de enviar mensaje vacío', {
        conversationId: params.id,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      )
    }

    if (message.length > 4096) {
      logger.warn('Mensaje demasiado largo', {
        conversationId: params.id,
        messageLength: message.length,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'El mensaje es demasiado largo (máximo 4096 caracteres)' },
        { status: 400 }
      )
    }

    // Obtener conversación
    logger.debug('Obteniendo información de conversación', {
      conversationId: params.id,
      userId: session.user.id
    })

    const conversation = await ConversationService.getConversationById(params.id)
    if (!conversation) {
      logger.warn('Conversación no encontrada al intentar enviar mensaje', {
        conversationId: params.id,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Construir identificadores para MessagingService (soporta WhatsApp, Instagram, Facebook)
    const manychatId = (conversation.lead as { manychatId?: string })?.manychatId
    const platformId = conversation.platformId || (conversation as { platform_id?: string }).platform_id
    const phoneNumber = conversation.lead?.telefono
    const email = conversation.lead?.email

    // subscriberId: prioridad manychatId del lead, luego platformId (para IG/FB es el subscriber_id)
    let subscriberId: number | undefined
    if (manychatId) {
      const parsed = parseInt(String(manychatId), 10)
      if (!isNaN(parsed) && parsed > 0) subscriberId = parsed
    }
    if (subscriberId === undefined && platformId) {
      const parsed = parseInt(String(platformId), 10)
      if (!isNaN(parsed) && parsed > 0) subscriberId = parsed
    }

    const to = {
      subscriberId,
      phone: phoneNumber || undefined,
      email: email || undefined
    }

    if (!to.subscriberId && !to.phone && !to.email) {
      logger.error('No se pudo determinar destinatario del mensaje', {
        conversationId: params.id,
        leadId: conversation.lead?.id,
        platformId,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'No se pudo determinar el destinatario (subscriber_id, teléfono o email). Para Instagram y Facebook, sincroniza el contacto primero desde la página del lead.' },
        { status: 400 }
      )
    }

    // Detectar canal desde la conversación
    const platform = (conversation.platform || 'whatsapp').toLowerCase()
    const channel = platform === 'whatsapp' ? 'whatsapp' as const :
                    platform === 'instagram' ? 'instagram' as const :
                    platform === 'facebook' || platform === 'messenger' ? 'facebook' as const : 'auto' as const

    // Mapear document -> file (MessagingService usa 'file')
    const effectiveMessageType = messageType === 'document' ? 'file' : messageType

    logger.info('Enviando mensaje desde conversación', {
      conversationId: params.id,
      leadId: conversation.lead?.id,
      hasSubscriberId: !!to.subscriberId,
      phone: phoneNumber ? phoneNumber.substring(0, 5) + '***' : undefined,
      email: email ? email.substring(0, 3) + '***' : undefined,
      messageType: effectiveMessageType,
      messageLength: message.length,
      channel,
      userId: session.user.id
    })

    // Usar MessagingService (soporta subscriberId para Instagram/Facebook)
    const sendResult = await MessagingService.sendMessage({
      to,
      message: message.trim(),
      messageType: effectiveMessageType,
      mediaUrl,
      channel
    })

    if (!sendResult.success) {
      logger.error('Error al enviar mensaje vía MessagingService', {
        error: sendResult.error,
        errorCode: sendResult.errorCode,
        conversationId: params.id,
        leadId: conversation.lead?.id,
        userId: session.user.id
      })
      const errorMessage = sendResult.error || 'No se pudo enviar el mensaje. Intenta nuevamente.'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    if (!sendResult.messageId) {
      logger.error('Error al enviar mensaje - resultado inválido', {
        conversationId: params.id,
        leadId: conversation.lead?.id,
        userId: session.user.id,
        result: sendResult
      })
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje. El contacto puede no estar sincronizado con ManyChat.' },
        { status: 500 }
      )
    }

    // Crear mensaje en la base de datos
    let messageRecord
    try {
      messageRecord = await WhatsAppService.createMessage({
        conversationId: params.id,
        direction: 'outbound',
        content: message.trim(),
        messageType,
        mediaUrl,
        platformMsgId: sendResult.messageId
      })
    } catch (createError: any) {
      logger.error('Error creando mensaje en base de datos', {
        error: createError.message,
        stack: createError.stack,
        conversationId: params.id,
        messageId: sendResult.messageId,
        userId: session.user.id
      })
      
      // El mensaje ya se envió, pero no se pudo guardar en la BD
      return NextResponse.json({
        success: true,
        warning: 'El mensaje se envió pero no se pudo guardar en la base de datos',
        messageId: sendResult.messageId,
        channel: sendResult.channel || channel
      }, { status: 201 })
    }

    // Actualizar última actividad
    await ConversationService.updateLastActivity(params.id)

    logger.info('Mensaje enviado exitosamente', {
      conversationId: params.id,
      messageId: sendResult.messageId,
      messageRecordId: messageRecord.id,
      channel: sendResult.channel || channel,
      userId: session.user.id
    })

    // Formatear mensaje para respuesta
    const formattedMessage = {
      id: messageRecord.id,
      direction: 'outbound' as const,
      content: messageRecord.content,
      messageType: messageRecord.message_type || messageType,
      sentAt: toSafeISOString(messageRecord.sent_at || new Date()),
      readAt: undefined,
      isFromBot: false
    }

    return NextResponse.json({ 
      success: true,
      message: formattedMessage,
      whatsappResult: {
        messageId: sendResult.messageId,
        channel: sendResult.channel || channel,
        provider: 'manychat'
      }
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error enviando mensaje', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      conversationId: params.id,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    // Manejar errores de validación de Zod
    if (error.name === 'ZodError') {
      logger.error('Error de validación Zod', {
        errors: error.errors,
        conversationId: params.id
      })
      return NextResponse.json(
        { 
          error: 'Error de validación',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Sin permisos' },
        { status: 403 }
      )
    }

    // Proporcionar mensaje de error más descriptivo
    const errorMessage = error.message || 'Error al enviar mensaje'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
