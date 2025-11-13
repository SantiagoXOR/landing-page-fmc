import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/server/services/whatsapp-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, mediaUrl, messageType } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      )
    }

    const result = await WhatsAppService.sendMessage({
      to,
      message,
      mediaUrl,
      messageType
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
