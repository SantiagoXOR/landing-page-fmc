import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Tipos para WhatsApp Business API
interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: {
          name: string
        }
        wa_id: string
      }>
      messages?: Array<{
        from: string
        id: string
        timestamp: string
        text?: {
          body: string
        }
        type: string
        context?: {
          from: string
          id: string
        }
      }>
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
      }>
    }
    field: string
  }>
}

interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppWebhookEntry[]
}

// Verificación del webhook (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  
  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('WhatsApp webhook verified successfully')
    return new Response(challenge, { status: 200 })
  } else {
    logger.warn('WhatsApp webhook verification failed', { mode, token })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

// Procesamiento de mensajes (POST request)
export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppWebhookPayload = await request.json()
    
    logger.info('WhatsApp webhook received', { 
      object: body.object,
      entries: body.entry?.length || 0 
    })

    // Verificar que es un webhook de WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid object type' }, { status: 400 })
    }

    // Procesar cada entrada
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages') {
          await processMessages(change.value)
        }
      }
    }

    return NextResponse.json({ status: 'success' })

  } catch (error: any) {
    logger.error('Error processing WhatsApp webhook', { 
      error: error.message,
      stack: error.stack 
    })
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processMessages(value: any) {
  const { messages, contacts, metadata } = value
  
  if (!messages || messages.length === 0) {
    return
  }

  for (const message of messages) {
    try {
      const phoneNumber = message.from
      const messageId = message.id
      const timestamp = message.timestamp
      const messageType = message.type
      
      // Obtener nombre del contacto si está disponible
      const contact = contacts?.find((c: any) => c.wa_id === phoneNumber)
      const contactName = contact?.profile?.name || `WhatsApp ${phoneNumber}`
      
      let messageText = ''
      
      // Extraer texto según el tipo de mensaje
      switch (messageType) {
        case 'text':
          messageText = message.text?.body || ''
          break
        case 'image':
          messageText = '[Imagen]'
          break
        case 'document':
          messageText = '[Documento]'
          break
        case 'audio':
          messageText = '[Audio]'
          break
        case 'video':
          messageText = '[Video]'
          break
        default:
          messageText = `[${messageType}]`
      }

      // Procesar el mensaje usando el servicio existente
      await processWhatsAppMessage({
        telefono: phoneNumber,
        nombre: contactName,
        mensaje: messageText,
        messageId,
        timestamp: parseInt(timestamp),
        type: messageType,
        phoneNumberId: metadata.phone_number_id
      })

    } catch (error: any) {
      logger.error('Error processing individual message', {
        error: error.message,
        messageId: message.id
      })
    }
  }
}

async function processWhatsAppMessage(data: {
  telefono: string
  nombre: string
  mensaje: string
  messageId: string
  timestamp: number
  type: string
  phoneNumberId: string
}) {
  try {
    // Llamar al endpoint existente de eventos de WhatsApp
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/events/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ALLOWED_WEBHOOK_TOKEN}`
      },
      body: JSON.stringify({
        telefono: data.telefono,
        type: 'text',
        messageId: data.messageId,
        timestamp: data.timestamp,
        payload: {
          nombre: data.nombre,
          mensaje: data.mensaje,
          messageType: data.type,
          phoneNumberId: data.phoneNumberId
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to process message: ${response.statusText}`)
    }

    const result = await response.json()
    
    logger.info('WhatsApp message processed successfully', {
      telefono: data.telefono,
      leadId: result.leadId,
      messageId: data.messageId
    })

  } catch (error: any) {
    logger.error('Error calling WhatsApp event processor', {
      error: error.message,
      telefono: data.telefono,
      messageId: data.messageId
    })
    throw error
  }
}
