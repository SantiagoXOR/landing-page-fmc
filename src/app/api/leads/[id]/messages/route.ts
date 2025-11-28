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
  const leadId = params.id
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform') || 'whatsapp'

  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:read')

    // Obtener mensajes de la conversación del lead
    const messages = await ConversationService.getMessagesByLeadId(leadId, platform)

    // Transformar mensajes al formato esperado por el frontend
    const formattedMessages = messages.map((msg: any) => {
      // Función helper para convertir cualquier formato de fecha a ISO string
      const toISOString = (dateValue: any): string => {
        if (!dateValue) return new Date().toISOString()
        
        // Si ya es un string ISO válido
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue)
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString()
          }
        }
        
        // Si es un objeto Date
        if (dateValue instanceof Date) {
          if (!isNaN(dateValue.getTime())) {
            return dateValue.toISOString()
          }
        }
        
        // Si es un timestamp
        if (typeof dateValue === 'number') {
          const parsed = new Date(dateValue)
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString()
          }
        }
        
        // Fallback: fecha actual
        return new Date().toISOString()
      }
      
      // Obtener la mejor fecha disponible
      const sentAt = msg.sent_at || msg.created_at
      const createdAt = toISOString(sentAt || msg.created_at)
      
      return {
        id: msg.id,
        tipo: msg.direction === 'inbound' ? 'whatsapp_in' : 'whatsapp_out',
        payload: {
          mensaje: msg.content || '',
          messageId: msg.platform_msg_id || msg.id,
          messageType: msg.message_type || 'text',
          sentAt: createdAt,
          ...(msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {})
        },
        createdAt: createdAt
      }
    })

    // Ordenar por fecha (más recientes primero) con validación
    const sortedMessages = formattedMessages.sort((a: any, b: any) => {
      try {
        const dateA = new Date(a.createdAt)
        const dateB = new Date(b.createdAt)
        
        // Si alguna fecha es inválida, ponerla al final
        if (isNaN(dateA.getTime())) return 1
        if (isNaN(dateB.getTime())) return -1
        
        return dateB.getTime() - dateA.getTime()
      } catch (error) {
        console.error('Error sorting messages:', error)
        return 0
      }
    })

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
      errorStack: error.stack,
      leadId: params.id,
      platform
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

