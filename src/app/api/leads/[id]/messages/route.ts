import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ConversationService } from '@/server/services/conversation-service'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:read')

    const leadId = params.id
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') || 'whatsapp'

    // Obtener mensajes de la conversación del lead
    const messages = await ConversationService.getMessagesByLeadId(leadId, platform)

    // Transformar mensajes al formato esperado por el frontend
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      tipo: msg.direction === 'inbound' ? 'whatsapp_in' : 'whatsapp_out',
      payload: {
        mensaje: msg.content,
        messageId: msg.platform_msg_id,
        messageType: msg.message_type,
        sentAt: msg.sent_at,
        ...(msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {})
      },
      createdAt: msg.sent_at || msg.created_at
    }))

    // Ordenar por fecha (más recientes primero)
    const sortedMessages = formattedMessages.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    logger.info('Messages retrieved for lead', {
      leadId,
      messageCount: sortedMessages.length,
      platform
    })

    return NextResponse.json({
      leadId,
      messages: sortedMessages,
      total: sortedMessages.length
    })

  } catch (error: any) {
    logger.error('Error retrieving lead messages', {
      error: error.message,
      leadId: params.id
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

