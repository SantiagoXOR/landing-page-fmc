import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationManager } from '@/lib/integrations/integration-manager'
import { logger } from '@/lib/logger'

/**
 * GET /api/webhooks/whatsapp
 * Verificación del webhook de WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    logger.info('WhatsApp webhook verification attempt', {
      mode,
      token: token ? '***' : null,
      challenge: challenge ? '***' : null
    })

    if (!mode || !token || !challenge) {
      logger.warn('Missing required webhook verification parameters')
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const integrationManager = getIntegrationManager()
    if (!integrationManager) {
      logger.error('Integration manager not initialized')
      return NextResponse.json(
        { error: 'Integration manager not available' },
        { status: 500 }
      )
    }

    const challengeResponse = integrationManager.verifyWhatsAppWebhook(mode, token, challenge)
    
    if (challengeResponse) {
      logger.info('WhatsApp webhook verified successfully')
      return new NextResponse(challengeResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    } else {
      logger.warn('WhatsApp webhook verification failed', { mode, token })
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 403 }
      )
    }

  } catch (error: any) {
    logger.error('Error in WhatsApp webhook verification', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/webhooks/whatsapp
 * Recepción de eventos de WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    
    logger.info('WhatsApp webhook event received', {
      hasSignature: !!signature,
      bodyLength: body.length
    })

    if (!body) {
      logger.warn('Empty webhook body received')
      return NextResponse.json(
        { error: 'Empty body' },
        { status: 400 }
      )
    }

    let data
    try {
      data = JSON.parse(body)
    } catch (parseError) {
      logger.error('Invalid JSON in webhook body', { parseError })
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const integrationManager = getIntegrationManager()
    if (!integrationManager) {
      logger.error('Integration manager not initialized')
      return NextResponse.json(
        { error: 'Integration manager not available' },
        { status: 500 }
      )
    }

    // Determinar el tipo de evento
    let eventType = 'unknown'
    if (data.entry && data.entry[0]?.changes) {
      const change = data.entry[0].changes[0]
      if (change.value.messages) {
        eventType = 'messages'
      } else if (change.value.statuses) {
        eventType = 'message_status'
      }
    }

    // Procesar el webhook
    const webhookPayload = {
      event: eventType,
      data,
      timestamp: new Date(),
      source: 'whatsapp',
      signature: signature || undefined
    }

    const result = await integrationManager.processWebhook('whatsapp', webhookPayload)

    if (result.success) {
      logger.info('WhatsApp webhook processed successfully', {
        event: eventType,
        timestamp: result.timestamp
      })

      return NextResponse.json(
        { 
          success: true, 
          message: 'Webhook processed successfully',
          event: eventType
        },
        { status: 200 }
      )
    } else {
      logger.error('Failed to process WhatsApp webhook', {
        error: result.error,
        event: eventType
      })

      return NextResponse.json(
        { 
          error: 'Failed to process webhook',
          details: result.error
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    logger.error('Error processing WhatsApp webhook', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/webhooks/whatsapp
 * Manejar preflight requests para CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-hub-signature-256',
    },
  })
}
