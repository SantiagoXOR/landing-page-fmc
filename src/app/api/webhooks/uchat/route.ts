import { NextRequest, NextResponse } from 'next/server'
import { UchatWebhookService } from '@/server/services/uchat-webhook-service'
import type { UchatWebhookEvent, UchatWebhookEventType } from '@/types/uchat'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const UCHAT_SECRET = (process.env.UCHAT_WEBHOOK_SECRET || process.env.UCHAT_WEBHOOK_VERIFY_TOKEN || '').trim()

/**
 * OPTIONS /api/webhooks/uchat
 * CORS preflight (por si Uchat lo requiere)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Uchat-Signature, X-Webhook-Secret',
      'Access-Control-Max-Age': '86400',
    },
  })
}

/**
 * Normaliza el body del webhook al formato esperado (tipo Manychat).
 * Acepta event_type o type; subscriber o user; etc.
 */
function normalizeBody(body: Record<string, unknown>): UchatWebhookEvent {
  const eventType = (body.event_type || body.type) as UchatWebhookEventType
  const subscriber = (body.subscriber || body.user) as UchatWebhookEvent['subscriber']
  const message = body.message as UchatWebhookEvent['message']
  const tag = body.tag as UchatWebhookEvent['tag']
  const customField = body.custom_field as UchatWebhookEvent['custom_field']

  const subscriberId = body.subscriber_id ?? subscriber?.id
  const subscriberIdTyped =
    typeof subscriberId === 'number' || typeof subscriberId === 'string' ? subscriberId : undefined

  return {
    event_type: eventType,
    subscriber_id: subscriberIdTyped,
    subscriber,
    message,
    tag,
    custom_field: customField,
    timestamp: body.timestamp as number | undefined,
    created_at: body.created_at as string | undefined,
    data: body.data,
  }
}

/**
 * POST /api/webhooks/uchat
 * Recibe eventos de Uchat (mismo contrato que Manychat: event_type, subscriber, message, tag, custom_field).
 */
export async function POST(request: NextRequest) {
  try {
    if (UCHAT_SECRET) {
      const signature =
        request.headers.get('x-uchat-signature') ||
        request.headers.get('x-webhook-secret') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      if (signature !== UCHAT_SECRET) {
        logger.warn('Webhook Uchat: secret inválido o faltante')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    let body: Record<string, unknown>
    try {
      const text = await request.text()
      body = text ? JSON.parse(text) : {}
    } catch (e) {
      logger.error('Webhook Uchat: JSON inválido', { error: (e as Error).message })
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventType = (body.event_type || body.type) as string | undefined
    if (!eventType) {
      logger.warn('Webhook Uchat: sin event_type ni type', { keys: Object.keys(body) })
      return NextResponse.json({ error: 'Missing event_type or type' }, { status: 400 })
    }

    const event = normalizeBody(body)
    logger.info('Webhook Uchat recibido', {
      event_type: event.event_type,
      subscriber_id: event.subscriber_id ?? event.subscriber?.id,
    })

    const result = await UchatWebhookService.processWebhookEvent(event)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true, leadId: result.leadId, conversationId: result.conversationId })
  } catch (error) {
    logger.error('Error procesando webhook Uchat', { error: (error as Error).message })
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}
