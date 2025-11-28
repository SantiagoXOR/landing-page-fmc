import { NextRequest, NextResponse } from 'next/server'
import { ConversationService } from '@/server/services/conversation-service'
import { WhatsAppService } from '@/server/services/whatsapp-service'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const conversation = await ConversationService.getConversationById(params.id)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Transformar mensajes al formato esperado por el frontend
    const formattedMessages = (conversation.messages || []).map((msg: any) => {
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
        
        // Fallback: fecha actual
        return new Date().toISOString()
      }

      // Obtener la mejor fecha disponible (sent_at tiene prioridad)
      const sentAt = msg.sent_at || msg.sentAt || msg.created_at || msg.createdAt
      const formattedSentAt = toISOString(sentAt)
      
      return {
        id: msg.id,
        direction: msg.direction || (msg.message_type === 'outbound' ? 'outbound' : 'inbound'),
        content: msg.content || '',
        messageType: msg.message_type || msg.messageType || 'text',
        sentAt: formattedSentAt, // Asegurar que siempre sea un string ISO válido
        readAt: msg.read_at || msg.readAt || undefined,
        isFromBot: msg.is_from_bot || msg.isFromBot || false,
        manychatFlowId: msg.manychat_flow_id || msg.manychatFlowId || undefined
      }
    })

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { message, messageType = 'text', mediaUrl } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Obtener conversación
    const conversation = await ConversationService.getConversationById(params.id)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Obtener teléfono del lead o usar platformId
    const phoneNumber = conversation.lead?.telefono || conversation.platformId

    // Enviar mensaje por WhatsApp
    const whatsappResult = await WhatsAppService.sendMessage({
      to: phoneNumber,
      message,
      messageType,
      mediaUrl
    })

    // Crear mensaje en la base de datos
    const messageRecord = await WhatsAppService.createMessage({
      conversationId: params.id,
      direction: 'outbound',
      content: message,
      messageType,
      mediaUrl,
      platformMsgId: whatsappResult.messageId
    })

    // Actualizar última actividad
    await ConversationService.updateLastActivity(params.id)

    return NextResponse.json({ 
      message: messageRecord,
      whatsappResult 
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
