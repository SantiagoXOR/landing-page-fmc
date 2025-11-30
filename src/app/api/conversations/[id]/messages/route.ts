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
    const body = await request.json()
    const { message, messageType = 'text', mediaUrl } = body

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

    // Obtener teléfono del lead o usar platformId
    const phoneNumber = conversation.lead?.telefono || conversation.platformId
    const email = conversation.lead?.email

    if (!phoneNumber && !email) {
      logger.error('No se pudo determinar destinatario del mensaje', {
        conversationId: params.id,
        leadId: conversation.lead?.id,
        platformId: conversation.platformId,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'No se pudo determinar el número de teléfono o email del destinatario' },
        { status: 400 }
      )
    }

    // Detectar canal desde la conversación si es posible
    // El campo platform puede ser 'whatsapp', 'instagram', 'facebook', etc.
    const platform = (conversation.platform || 'whatsapp').toLowerCase()
    const channel = platform === 'whatsapp' ? 'whatsapp' : 
                    platform === 'instagram' ? 'instagram' :
                    platform === 'facebook' || platform === 'messenger' ? 'facebook' : 'auto'

    logger.info('Enviando mensaje desde conversación', {
      conversationId: params.id,
      leadId: conversation.lead?.id,
      phone: phoneNumber ? phoneNumber.substring(0, 5) + '***' : undefined,
      email: email ? email.substring(0, 3) + '***' : undefined,
      messageType,
      messageLength: message.length,
      channel,
      userId: session.user.id
    })

    // Enviar mensaje usando WhatsAppService (que internamente usa MessagingService)
    // WhatsAppService maneja la lógica de ManyChat o Meta API
    const whatsappResult = await WhatsAppService.sendMessage({
      to: phoneNumber || email || '',
      message: message.trim(),
      messageType,
      mediaUrl
    })

    if (!whatsappResult || !whatsappResult.messageId) {
      logger.error('Error al enviar mensaje - resultado inválido', {
        conversationId: params.id,
        leadId: conversation.lead?.id,
        userId: session.user.id
      })
      return NextResponse.json(
        { error: 'No se pudo enviar el mensaje. Intenta nuevamente.' },
        { status: 500 }
      )
    }

    // Crear mensaje en la base de datos
    const messageRecord = await WhatsAppService.createMessage({
      conversationId: params.id,
      direction: 'outbound',
      content: message.trim(),
      messageType,
      mediaUrl,
      platformMsgId: whatsappResult.messageId
    })

    // Actualizar última actividad
    await ConversationService.updateLastActivity(params.id)

    logger.info('Mensaje enviado exitosamente', {
      conversationId: params.id,
      messageId: whatsappResult.messageId,
      messageRecordId: messageRecord.id,
      channel: ('channel' in whatsappResult ? whatsappResult.channel : undefined) || channel,
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
        messageId: whatsappResult.messageId,
        channel: ('channel' in whatsappResult ? whatsappResult.channel : undefined) || channel,
        provider: whatsappResult.provider || 'manychat'
      }
    }, { status: 201 })

  } catch (error: any) {
    logger.error('Error enviando mensaje', {
      error: error.message,
      stack: error.stack,
      conversationId: params.id,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Sin permisos' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: 500 }
    )
  }
}
