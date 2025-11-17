import { NextRequest, NextResponse } from 'next/server'
import { ManychatWebhookService } from '@/server/services/manychat-webhook-service'
import { ManychatWebhookEvent, ManychatWebhookMessage } from '@/types/manychat'
import { logger } from '@/lib/logger'

// Forzar renderizado dinámico (webhooks son siempre dinámicos)
export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/manychat
 * Endpoint para recibir webhooks de Manychat
 * 
 * Eventos soportados:
 * - new_subscriber: Nuevo subscriber
 * - subscriber_updated: Subscriber actualizado
 * - message_received: Mensaje entrante
 * - message_sent: Mensaje saliente
 * - tag_added: Tag agregado
 * - tag_removed: Tag removido
 * - custom_field_changed: Custom field cambiado
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener payload del webhook
    const body = await request.json()

    logger.info('Webhook recibido de Manychat', {
      event_type: body.event_type || body.type,
      subscriber_id: body.subscriber_id || body.subscriber?.id,
      timestamp: new Date().toISOString()
    })

    // Validar que el webhook tenga un tipo de evento
    const eventType = body.event_type || body.type
    if (!eventType) {
      logger.warn('Webhook sin event_type', { body })
      return NextResponse.json(
        { error: 'Missing event_type' },
        { status: 400 }
      )
    }

    // Normalizar el evento a nuestro formato
    const event: ManychatWebhookEvent = {
      event_type: eventType,
      subscriber_id: body.subscriber_id,
      subscriber: body.subscriber || (body.subscriber_id ? undefined : body.subscriber),
      message: normalizeMessage(body.message),
      tag: body.tag,
      custom_field: body.custom_field,
      flow: body.flow,
      button: body.button,
      timestamp: body.timestamp || Date.now() / 1000,
      created_at: body.created_at,
      data: body.data
    }

    // Procesar el evento
    const result = await ManychatWebhookService.processWebhookEvent(event)

    // Siempre responder 200 OK para evitar reintentos de Manychat
    // (a menos que sea un error de formato, en cuyo caso ya respondimos 400)
    if (!result.success) {
      logger.error('Error procesando webhook', {
        error: result.error,
        event_type: eventType,
        subscriber_id: event.subscriber_id
      })
      // Aun así responder 200 para evitar reintentos infinitos
      // Manychat reintentará si respondemos con error
      return NextResponse.json({
        success: false,
        error: result.error,
        processed: false
      })
    }

    logger.info('Webhook procesado exitosamente', {
      event_type: eventType,
      leadId: result.leadId,
      conversationId: result.conversationId,
      messageId: result.messageId
    })

    return NextResponse.json({
      success: true,
      processed: true,
      leadId: result.leadId,
      conversationId: result.conversationId,
      messageId: result.messageId
    })

  } catch (error: any) {
    logger.error('Error procesando webhook de Manychat', {
      error: error.message,
      stack: error.stack
    })

    // Responder 200 OK incluso en caso de error para evitar reintentos
    // El error ya fue registrado en los logs
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      processed: false
    })
  }
}

/**
 * GET /api/webhooks/manychat
 * Endpoint para verificación de webhook (si Manychat lo requiere)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Si Manychat requiere verificación de webhook
  if (mode === 'subscribe' && token === process.env.MANYCHAT_WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook verificado exitosamente')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json(
    { error: 'Invalid verification' },
    { status: 403 }
  )
}

/**
 * Normalizar mensaje del webhook a nuestro formato
 */
function normalizeMessage(message: any): ManychatWebhookMessage | undefined {
  if (!message) return undefined

  // Manychat puede enviar el mensaje en diferentes formatos
  // Normalizamos a nuestro formato estándar
  return {
    id: message.id || message.message_id || message.mid || String(Date.now()),
    type: message.type || 'text',
    text: message.text || message.body,
    url: message.url || message.media_url,
    caption: message.caption,
    filename: message.filename,
    latitude: message.latitude || message.location?.lat,
    longitude: message.longitude || message.location?.lng,
    template_name: message.template_name || message.template?.name,
    interactive: message.interactive,
    timestamp: message.timestamp || message.created_time || Date.now() / 1000,
    direction: message.direction,
    platform_msg_id: message.platform_msg_id || message.id || message.message_id || message.mid
  }
}
