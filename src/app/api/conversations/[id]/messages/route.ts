import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { ConversationService } from '@/server/services/conversation-service'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { MessagingService } from '@/server/services/messaging-service'
import { logger } from '@/lib/logger'
import { toSafeISOString } from '@/lib/safe-date-utils'
import {
  isOutsideCustomerCareWindow,
  resolveChatReengagementTemplateName,
} from '@/lib/whatsapp-customer-care-window'

interface RouteParams {
  params: {
    id: string
  }
}

const TEMPLATE_BODY_MAX = 1024

/** Último inbound del cliente para regla de 24 h: por lead (todas las conv. WA) o solo esta conversación si no hay lead */
async function getLastInboundForCareWindow(
  leadId: string | undefined,
  messages: { direction?: string; sentAt?: string | Date }[]
): Promise<Date | null> {
  if (leadId) {
    return ConversationService.getLastInboundWhatsAppMessageAt(leadId)
  }
  const inbound = (messages || [])
    .filter((m) => (m.direction || '') === 'inbound')
    .map((m) => new Date(m.sentAt || 0))
    .filter((d) => !Number.isNaN(d.getTime()))
  if (inbound.length === 0) return null
  return new Date(Math.max(...inbound.map((d) => d.getTime())))
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

    const { message = '', messageType = 'text', mediaUrl } = body || {}
    const messageStr = typeof message === 'string' ? message : ''
    const delivery: 'session' | 'template' =
      body?.delivery === 'template' ? 'template' : 'session'

    if (delivery === 'template' && mediaUrl) {
      return NextResponse.json(
        { error: 'La plantilla solo admite texto en el cuerpo; no uses adjuntos.' },
        { status: 400 }
      )
    }

    // Debe haber texto o archivo adjunto (mediaUrl) — salvo que sea plantilla solo texto
    if (!messageStr.trim() && !mediaUrl) {
      return NextResponse.json(
        { error: 'Escribe un mensaje o adjunta un archivo (imagen, audio o documento)' },
        { status: 400 }
      )
    }

    if (delivery === 'template' && messageStr.length > TEMPLATE_BODY_MAX) {
      return NextResponse.json(
        {
          error: `El texto para la plantilla no puede superar ${TEMPLATE_BODY_MAX} caracteres.`,
        },
        { status: 400 }
      )
    }

    if (messageStr.length > 4096) {
      logger.warn('Mensaje demasiado largo', {
        conversationId: params.id,
        messageLength: messageStr.length,
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
    const platform = (conversation.platform || 'whatsapp').toLowerCase()
    let phoneNumber = conversation.lead?.telefono
    // Para WhatsApp, usar platformId como teléfono si el lead no tiene telefono (ej. conversación creada por webhook)
    if (!phoneNumber && platform === 'whatsapp' && platformId && typeof platformId === 'string' && /^\+?\d+$/.test(platformId)) {
      phoneNumber = platformId
    }
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
    const channel = platform === 'whatsapp' ? 'whatsapp' as const :
                    platform === 'instagram' ? 'instagram' as const :
                    platform === 'facebook' || platform === 'messenger' ? 'facebook' as const : 'auto' as const

    // Mapear document -> file (MessagingService usa 'file')
    const effectiveMessageType = messageType === 'document' ? 'file' : messageType

    // --- WhatsApp: plantilla (reengagement; no exige ventana de 24 h)
    if (delivery === 'template') {
      if (platform !== 'whatsapp') {
        return NextResponse.json(
          { error: 'El envío por plantilla solo está disponible para WhatsApp.' },
          { status: 400 }
        )
      }
      if (!phoneNumber) {
        return NextResponse.json(
          { error: 'Falta teléfono del destinatario para enviar la plantilla.' },
          { status: 400 }
        )
      }
      if (!WhatsAppService.isConfigured()) {
        return NextResponse.json(
          { error: 'WhatsApp no está configurado.' },
          { status: 503 }
        )
      }
      const templateName = resolveChatReengagementTemplateName()
      if (!templateName) {
        return NextResponse.json(
          {
            error:
              'No hay plantilla configurada. Definí WHATSAPP_TEMPLATE_CHAT_REENGAGEMENT o WHATSAPP_TEMPLATE_PIPELINE_NOTIFY.',
            code: 'WHATSAPP_TEMPLATE_NOT_CONFIGURED',
          },
          { status: 503 }
        )
      }
      const lang = (process.env.WHATSAPP_TEMPLATE_PIPELINE_LANG || 'es').trim()
      const bodyText = messageStr.trim().slice(0, TEMPLATE_BODY_MAX)

      let tplResult: { success: true; messageId?: string }
      try {
        tplResult = await WhatsAppService.sendTemplateBodySingleVariable({
          to: phoneNumber,
          templateName,
          languageCode: lang,
          bodyText,
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        logger.error('Error enviando plantilla desde Chats', {
          conversationId: params.id,
          error: msg,
        })
        return NextResponse.json(
          { error: msg || 'No se pudo enviar la plantilla.' },
          { status: 500 }
        )
      }

      if (!tplResult.messageId) {
        return NextResponse.json(
          { error: 'No se pudo enviar la plantilla (sin ID de mensaje).' },
          { status: 500 }
        )
      }

      let messageRecord
      try {
        messageRecord = await WhatsAppService.createMessage({
          conversationId: params.id,
          direction: 'outbound',
          content: bodyText,
          messageType: 'template',
          platformMsgId: tplResult.messageId,
        })
      } catch (createError: unknown) {
        const errMsg = createError instanceof Error ? createError.message : String(createError)
        logger.error('Error creando mensaje plantilla en base de datos', {
          error: errMsg,
          conversationId: params.id,
          messageId: tplResult.messageId,
          userId: session.user.id,
        })
        return NextResponse.json(
          {
            success: true,
            warning: 'La plantilla se envió pero no se pudo guardar en el historial del CRM',
            messageId: tplResult.messageId,
            delivery: 'template',
          },
          { status: 201 }
        )
      }

      await ConversationService.updateLastActivity(params.id)

      const formattedMessage = {
        id: messageRecord.id,
        direction: 'outbound' as const,
        content: messageRecord.content,
        messageType: messageRecord.message_type || 'template',
        sentAt: toSafeISOString(messageRecord.sent_at || new Date()),
        readAt: undefined,
        isFromBot: false,
      }

      return NextResponse.json(
        {
          success: true,
          message: formattedMessage,
          whatsappResult: {
            messageId: tplResult.messageId,
            channel: 'whatsapp',
            provider: 'meta',
            delivery: 'template',
          },
        },
        { status: 201 }
      )
    }

    // --- WhatsApp sesión: mensaje libre solo dentro de ventana de 24 h
    if (delivery === 'session' && channel === 'whatsapp') {
      const lastInbound = await getLastInboundForCareWindow(
        conversation.lead?.id,
        conversation.messages || []
      )
      if (isOutsideCustomerCareWindow(lastInbound)) {
        return NextResponse.json(
          {
            error:
              'Pasaron más de 24 horas desde el último mensaje del cliente en esta cuenta. No se puede enviar un mensaje libre; usá el envío por plantilla aprobada o esperá a que el cliente escriba de nuevo.',
            code: 'WHATSAPP_SESSION_WINDOW_CLOSED',
          },
          { status: 422 }
        )
      }
    }

    // Envío de sesión vía MessagingService (Meta / canales soportados)
    const sendResult = await MessagingService.sendMessage({
      to,
      message: messageStr.trim() || (mediaUrl ? '(archivo adjunto)' : ''),
      messageType: effectiveMessageType,
      mediaUrl,
      channel,
    })

    if (!sendResult.success) {
      logger.error('Error al enviar mensaje', {
        error: sendResult.error,
        errorCode: sendResult.errorCode,
        conversationId: params.id,
        leadId: conversation.lead?.id,
        userId: session.user.id,
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
        result: sendResult,
      })
      return NextResponse.json(
        {
          error:
            'No se pudo enviar el mensaje. Verifica la configuración de WhatsApp (Meta API).',
        },
        { status: 500 }
      )
    }

    // Crear mensaje en la base de datos
    let messageRecord
    try {
      messageRecord = await WhatsAppService.createMessage({
        conversationId: params.id,
        direction: 'outbound',
        content: messageStr.trim() || (mediaUrl ? '(archivo adjunto)' : ''),
        messageType,
        mediaUrl,
        platformMsgId: sendResult.messageId,
      })
    } catch (createError: any) {
      logger.error('Error creando mensaje en base de datos', {
        error: createError.message,
        stack: createError.stack,
        conversationId: params.id,
        messageId: sendResult.messageId,
        userId: session.user.id,
      })

      return NextResponse.json(
        {
          success: true,
          warning: 'El mensaje se envió pero no se pudo guardar en la base de datos',
          messageId: sendResult.messageId,
          channel: sendResult.channel || channel,
        },
        { status: 201 }
      )
    }

    await ConversationService.updateLastActivity(params.id)

    logger.info('Mensaje enviado exitosamente', {
      conversationId: params.id,
      messageId: sendResult.messageId,
      messageRecordId: messageRecord.id,
      channel: sendResult.channel || channel,
      userId: session.user.id,
    })

    const formattedMessage = {
      id: messageRecord.id,
      direction: 'outbound' as const,
      content: messageRecord.content,
      messageType: messageRecord.message_type || messageType,
      sentAt: toSafeISOString(messageRecord.sent_at || new Date()),
      readAt: undefined,
      isFromBot: false,
    }

    const provider = 'meta'

    return NextResponse.json(
      {
        success: true,
        message: formattedMessage,
        whatsappResult: {
          messageId: sendResult.messageId,
          channel: sendResult.channel || channel,
          provider,
        },
      },
      { status: 201 }
    )

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
