import { NextRequest, NextResponse } from 'next/server'
import { ManychatWebhookService } from '@/server/services/manychat-webhook-service'
import { ManychatWebhookEvent, ManychatWebhookMessage } from '@/types/manychat'
import { logger } from '@/lib/logger'

// Forzar renderizado dinámico (webhooks son siempre dinámicos)
export const dynamic = 'force-dynamic'

/**
 * OPTIONS /api/webhooks/manychat
 * Manejar preflight requests para CORS (requerido por ManyChat)
 */
export async function OPTIONS(request: NextRequest) {
  logger.info('OPTIONS request recibido (CORS preflight)', {
    origin: request.headers.get('origin'),
    method: request.headers.get('access-control-request-method')
  })
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 horas
    },
  })
}

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
    // Log inicial para debug
    logger.info('POST request recibido de Manychat', {
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type'),
      timestamp: new Date().toISOString()
    })

    // Obtener payload del webhook
    let body
    try {
      const bodyText = await request.text()
      try {
        body = JSON.parse(bodyText)
      } catch (parseError: any) {
        logger.error('Error parseando JSON del webhook', {
          error: parseError.message,
          bodyText: bodyText.substring(0, 500) // Primeros 500 caracteres para debug
        })
        return NextResponse.json(
          { error: 'Invalid JSON', details: parseError.message },
          { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          }
        )
      }
    } catch (readError: any) {
      logger.error('Error leyendo body del webhook', {
        error: readError.message
      })
      return NextResponse.json(
        { error: 'Error reading request body', details: readError.message },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    logger.info('📨 Webhook recibido de Manychat', {
      event_type: body.event_type || body.type,
      subscriber_id: body.subscriber_id || body.subscriber?.id || body.id,
      timestamp: new Date().toISOString(),
      hasLastInputText: !!body.last_input_text,
      hasId: !!body.id,
      hasFirstName: !!body.first_name,
      hasSubscribed: !!body.subscribed,
      hasLastInteraction: !!body.last_interaction,
      phone: body.phone || body.whatsapp_phone ? `${(body.phone || body.whatsapp_phone).substring(0, 3)}***` : 'sin teléfono',
      bodyKeys: Object.keys(body),
      subscribedDate: body.subscribed,
      lastInteractionDate: body.last_interaction
    })

    // Detectar si viene el formato "Full Contact Data" de Manychat
    // Este formato no tiene event_type pero tiene datos del contacto
    // Verificamos explícitamente que NO tenga event_type ni type, Y que tenga datos de contacto
    const hasEventType = !!(body.event_type || body.type)
    const hasContactData = !!(body.id || body.first_name || body.last_input_text || body.key)
    const isFullContactDataFormat = !hasEventType && hasContactData

    logger.info('Detección de formato', {
      hasEventType,
      hasContactData,
      isFullContactDataFormat,
      bodyId: body.id,
      bodyKey: body.key
    })

    let normalizedBody = body

    // Si es formato "Full Contact Data", transformarlo a nuestro formato esperado
    if (isFullContactDataFormat) {
      logger.info('Detectado formato Full Contact Data de Manychat, transformando...', {
        contactId: body.id,
        hasLastInputText: !!body.last_input_text
      })

      // Determinar el tipo de evento basado en los datos disponibles
      // Mejoramos la detección para identificar correctamente nuevos suscriptores
      let eventType = 'new_subscriber' // Por defecto, priorizamos new_subscriber
      
      // Verificar si la suscripción es reciente (últimas 24 horas)
      const isRecentSubscription = body.subscribed ? (() => {
        try {
          const subscribedTime = new Date(body.subscribed).getTime()
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
          const isRecent = subscribedTime > oneDayAgo
          logger.debug('Verificación de suscripción reciente', {
            subscribedTime: new Date(subscribedTime).toISOString(),
            oneDayAgo: new Date(oneDayAgo).toISOString(),
            isRecent,
            hoursAgo: Math.round((Date.now() - subscribedTime) / (60 * 60 * 1000))
          })
          return isRecent
        } catch (error: any) {
          logger.warn('Error parseando fecha de suscripción', { error: error.message, subscribed: body.subscribed })
          return false
        }
      })() : false

      // Verificar si la última interacción es muy reciente (última hora)
      const hasRecentInteraction = body.last_interaction ? (() => {
        try {
          const lastInteractionTime = new Date(body.last_interaction).getTime()
          const oneHourAgo = Date.now() - (60 * 60 * 1000)
          const isRecent = lastInteractionTime > oneHourAgo
          logger.debug('Verificación de interacción reciente', {
            lastInteractionTime: new Date(lastInteractionTime).toISOString(),
            oneHourAgo: new Date(oneHourAgo).toISOString(),
            isRecent,
            minutesAgo: Math.round((Date.now() - lastInteractionTime) / (60 * 1000))
          })
          return isRecent
        } catch (error: any) {
          logger.warn('Error parseando fecha de interacción', { error: error.message, last_interaction: body.last_interaction })
          return false
        }
      })() : false

      // Lógica mejorada de detección con prioridad para new_subscriber:
      if (isRecentSubscription) {
        // Suscripción reciente (últimas 24 horas) = nuevo suscriptor
        // Incluso si tiene last_input_text, si la suscripción es reciente, es nuevo suscriptor
        eventType = 'new_subscriber'
        logger.info('✅ Detectado como NEW_SUBSCRIBER: Suscripción reciente', {
          subscribedDate: body.subscribed,
          hoursAgo: Math.round((Date.now() - new Date(body.subscribed).getTime()) / (60 * 60 * 1000))
        })
      } else if (body.subscribed && !body.last_interaction) {
        // Tiene fecha de suscripción pero no tiene interacciones = nuevo suscriptor
        eventType = 'new_subscriber'
        logger.info('✅ Detectado como NEW_SUBSCRIBER: Tiene suscripción pero sin interacciones', {
          subscribedDate: body.subscribed
        })
      } else if (body.subscribed && body.last_interaction && !hasRecentInteraction) {
        // Tiene suscripción e interacción, pero la interacción NO es reciente
        // Si la suscripción es más reciente que la interacción, es nuevo suscriptor
        try {
          const subscribedTime = new Date(body.subscribed).getTime()
          const lastInteractionTime = new Date(body.last_interaction).getTime()
          if (subscribedTime >= lastInteractionTime || (lastInteractionTime - subscribedTime) < (2 * 60 * 60 * 1000)) {
            // Suscripción es más reciente o muy cercana a la interacción = nuevo suscriptor
            eventType = 'new_subscriber'
            logger.info('✅ Detectado como NEW_SUBSCRIBER: Suscripción más reciente que interacción', {
              subscribedDate: body.subscribed,
              lastInteractionDate: body.last_interaction,
              diffHours: Math.round((lastInteractionTime - subscribedTime) / (60 * 60 * 1000))
            })
          } else {
            eventType = 'message_received'
            logger.info('📩 Detectado como MESSAGE_RECEIVED: Interacción más reciente', {
              subscribedDate: body.subscribed,
              lastInteractionDate: body.last_interaction
            })
          }
        } catch {
          eventType = 'new_subscriber'
        }
      } else if (body.last_input_text && hasRecentInteraction && !isRecentSubscription) {
        // Tiene mensaje Y la interacción es muy reciente (última hora) PERO la suscripción NO es reciente
        // = mensaje recibido de contacto existente
        eventType = 'message_received'
        logger.info('📩 Detectado como MESSAGE_RECEIVED: Mensaje reciente de contacto existente', {
          hasLastInputText: true,
          lastInteractionDate: body.last_interaction
        })
      } else if (body.last_input_text && !body.subscribed) {
        // Tiene mensaje pero no tiene fecha de suscripción = mensaje recibido
        eventType = 'message_received'
        logger.info('📩 Detectado como MESSAGE_RECEIVED: Mensaje sin fecha de suscripción', {
          hasLastInputText: true
        })
      } else if (!body.subscribed && body.last_interaction) {
        // No tiene suscripción pero tiene interacción = actualización
        eventType = 'subscriber_updated'
        logger.info('📝 Detectado como SUBSCRIBER_UPDATED: Sin suscripción pero con interacción', {
          lastInteractionDate: body.last_interaction
        })
      } else {
        // Por defecto, tratar como nuevo suscriptor si no hay información clara
        eventType = 'new_subscriber'
        logger.info('✅ Detectado como NEW_SUBSCRIBER: Por defecto (sin información clara)', {
          hasSubscribed: !!body.subscribed,
          hasLastInteraction: !!body.last_interaction,
          hasLastInputText: !!body.last_input_text
        })
      }

      logger.info('🎯 Detección de tipo de evento completada', {
        eventType,
        isRecentSubscription,
        hasRecentInteraction,
        hasLastInputText: !!body.last_input_text,
        hasSubscribed: !!body.subscribed,
        hasLastInteraction: !!body.last_interaction,
        subscribedDate: body.subscribed,
        lastInteractionDate: body.last_interaction,
        phone: body.phone || body.whatsapp_phone ? `${(body.phone || body.whatsapp_phone).substring(0, 3)}***` : 'sin teléfono'
      })

      // Transformar al formato esperado
      // Convertir id a número si es posible, sino mantener como string
      const subscriberId = body.id || body.subscriber_id
      const subscriberIdNum = typeof subscriberId === 'string' 
        ? (parseInt(subscriberId) || 0)
        : (subscriberId || 0)

      normalizedBody = {
        event_type: eventType,
        subscriber_id: subscriberIdNum,
        subscriber: {
          id: subscriberIdNum,
          key: body.key || `user:${body.id}`,
          page_id: typeof body.page_id === 'string' ? parseInt(body.page_id) || 0 : (body.page_id || 0),
          status: (body.status as 'active' | 'inactive') || 'active',
          first_name: body.first_name,
          last_name: body.last_name,
          name: body.name,
          phone: body.phone || body.whatsapp_phone || null,
          whatsapp_phone: body.whatsapp_phone || body.phone || null,
          email: body.email || null,
          custom_fields: body.custom_fields || {},
          tags: body.tags || [],
          gender: body.gender as 'male' | 'female' | undefined,
          profile_pic: body.profile_pic,
          locale: body.locale,
          language: body.language,
          timezone: body.timezone,
          subscribed: body.subscribed,
          last_interaction: body.last_interaction,
          opted_in_phone: body.optin_phone || false,
          opted_in_email: body.optin_email || false,
          has_opt_in_sms: body.optin_phone || false,
          has_opt_in_email: body.optin_email || false
        },
        message: body.last_input_text ? {
          id: `msg_${body.id}_${Date.now()}`,
          type: 'text',
          text: body.last_input_text,
          timestamp: body.last_interaction ? new Date(body.last_interaction).getTime() / 1000 : Date.now() / 1000,
          direction: 'inbound',
          platform_msg_id: `manychat_${body.id}_${Date.now()}`
        } : undefined,
        timestamp: body.last_interaction ? new Date(body.last_interaction).getTime() / 1000 : Date.now() / 1000,
        created_at: body.subscribed || body.last_interaction
      }

      logger.info('Formato transformado exitosamente', {
        event_type: normalizedBody.event_type,
        subscriber_id: normalizedBody.subscriber_id,
        has_message: !!normalizedBody.message
      })
    }

    // Validar que el webhook tenga un tipo de evento (después de la transformación)
    const eventType = normalizedBody.event_type || normalizedBody.type
    if (!eventType) {
      logger.warn('Webhook sin event_type después de transformación', { 
        originalBody: {
          id: body.id,
          key: body.key,
          hasEventType: !!(body.event_type || body.type),
          keys: Object.keys(body)
        },
        normalizedBody: {
          event_type: normalizedBody.event_type,
          type: normalizedBody.type,
          keys: Object.keys(normalizedBody)
        },
        isFullContactDataFormat
      })
      return NextResponse.json(
        { 
          error: 'Missing event_type',
          debug: {
            receivedFormat: isFullContactDataFormat ? 'Full Contact Data' : 'Standard',
            hasId: !!body.id,
            hasKey: !!body.key,
            normalizedEventType: normalizedBody.event_type
          }
        },
        { status: 400 }
      )
    }

    // Normalizar el evento a nuestro formato (usar normalizedBody después de la transformación)
    const event: ManychatWebhookEvent = {
      event_type: eventType,
      subscriber_id: normalizedBody.subscriber_id,
      subscriber: normalizedBody.subscriber || (normalizedBody.subscriber_id ? undefined : normalizedBody.subscriber),
      message: normalizeMessage(normalizedBody.message),
      tag: normalizedBody.tag,
      custom_field: normalizedBody.custom_field,
      flow: normalizedBody.flow,
      button: normalizedBody.button,
      timestamp: normalizedBody.timestamp || Date.now() / 1000,
      created_at: normalizedBody.created_at,
      data: normalizedBody.data
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
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    logger.info('✅ Webhook procesado exitosamente', {
      event_type: eventType,
      subscriber_id: event.subscriber_id,
      leadId: result.leadId,
      conversationId: result.conversationId,
      messageId: result.messageId,
      success: result.success,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      processed: true,
      leadId: result.leadId,
      conversationId: result.conversationId,
      messageId: result.messageId
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error: any) {
    logger.error('Error procesando webhook de Manychat', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      errorCause: error.cause
    })

    // Responder 200 OK incluso en caso de error para evitar reintentos
    // El error ya fue registrado en los logs
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      processed: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, {
      status: 200, // Mantener 200 para evitar reintentos de ManyChat
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
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
