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

    return NextResponse.json({ messages: conversation.messages })
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
