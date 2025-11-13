import { NextRequest, NextResponse } from 'next/server'
import { ManychatService } from '@/server/services/manychat-service'
import { ManychatMessage } from '@/types/manychat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, message, subscriberIds, tagIds, sendTime } = body

    if (!name || !message) {
      return NextResponse.json(
        { error: 'name y message son requeridos' },
        { status: 400 }
      )
    }

    if (!subscriberIds && !tagIds) {
      return NextResponse.json(
        { error: 'Debe especificar subscriberIds o tagIds' },
        { status: 400 }
      )
    }

    // Construir mensaje
    const messages: ManychatMessage[] = [
      {
        type: 'text',
        text: message,
      },
    ]

    // Enviar broadcast
    const response = await ManychatService.sendBroadcast(name, messages, {
      subscriberIds,
      tagIds,
      sendTime,
    })

    if (response.status === 'success') {
      return NextResponse.json({
        success: true,
        broadcastId: response.broadcast_id,
        message: 'Broadcast enviado exitosamente',
      })
    } else {
      return NextResponse.json(
        { error: response.error || 'Error al enviar broadcast' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error enviando broadcast:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar broadcast' },
      { status: 500 }
    )
  }
}

