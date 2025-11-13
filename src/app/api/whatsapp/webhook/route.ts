import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { ManychatSyncService } from '@/server/services/manychat-sync-service'
import { ConversationService } from '@/server/services/conversation-service'
import { ManychatWebhookEvent, ManychatSubscriber } from '@/types/manychat'
import { supabase } from '@/lib/db'
import { formatWhatsAppNumber } from '@/lib/integrations/whatsapp-business-api'

export async function GET(request: NextRequest) {
  // Verificación del webhook de WhatsApp (Meta) o Manychat
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.MANYCHAT_WEBHOOK_SECRET

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.log('Webhook verification failed')
    return new NextResponse('Forbidden', { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Detectar si es webhook de Manychat o Meta
    if (body.type || body.id) {
      // Es webhook de Manychat
      return await handleManychatWebhook(body)
    } else if (body.object === 'whatsapp_business_account') {
      // Es webhook de Meta
      return await handleMetaWebhook(body)
    } else {
      return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * Procesar webhook de Manychat
 */
async function handleManychatWebhook(event: ManychatWebhookEvent) {
  try {
    console.log('Processing Manychat webhook:', event.type)

    switch (event.type) {
      case 'new_subscriber':
        await handleNewSubscriber(event)
        break
      
      case 'message_received':
        await handleMessageReceived(event)
        break
      
      case 'tag_added':
        await handleTagAdded(event)
        break
      
      case 'tag_removed':
        await handleTagRemoved(event)
        break
      
      case 'custom_field_changed':
        await handleCustomFieldChanged(event)
        break
      
      default:
        console.log('Unhandled Manychat event type:', event.type)
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Error handling Manychat webhook:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

/**
 * Procesar webhook de Meta (WhatsApp Business API)
 * Incluye auto-creación de leads para números desconocidos
 */
async function handleMetaWebhook(body: any) {
  try {
    console.log('[WhatsApp Webhook] Processing Meta webhook')

    // Procesar cada entrada del webhook
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value
          const messages = value.messages || []
          const contacts = value.contacts || []

          // Procesar cada mensaje
          for (const message of messages) {
            const phoneNumber = message.from
            const contactName = contacts.find((c: any) => c.wa_id === phoneNumber)?.profile?.name
            const messageText = message.text?.body || '[Multimedia]'

            console.log('[WhatsApp Webhook] Message received:', {
              from: phoneNumber,
              name: contactName,
              type: message.type,
              preview: messageText.substring(0, 50),
            })

            // Buscar lead existente por teléfono
            const formattedPhone = formatWhatsAppNumber(phoneNumber)
            let lead = await supabase.findLeadByPhoneOrDni(formattedPhone) || 
                      await supabase.findLeadByPhoneOrDni(phoneNumber)

            // Auto-crear lead si no existe
            if (!lead) {
              console.log('[WhatsApp Webhook] Creating new lead for:', phoneNumber)
              
              try {
                lead = await supabase.createLead({
                  nombre: contactName || `Lead WhatsApp ${phoneNumber.slice(-4)}`,
                  telefono: formattedPhone,
                  origen: 'whatsapp',
                  estado: 'NUEVO',
                  notas: `Lead creado automáticamente desde WhatsApp.\nPrimer mensaje: ${messageText}`,
                })

                console.log('[WhatsApp Webhook] Lead created successfully:', lead.id)

                // Registrar evento de creación
                await supabase.createEvent({
                  leadId: lead.id,
                  tipo: 'lead_created_from_whatsapp',
                  payload: JSON.stringify({
                    phoneNumber,
                    contactName,
                    firstMessage: messageText,
                    messageType: message.type,
                  }),
                })
              } catch (error) {
                console.error('[WhatsApp Webhook] Error creating lead:', error)
                // Continuar procesamiento incluso si falla la creación del lead
              }
            } else {
              console.log('[WhatsApp Webhook] Lead found:', lead.id)
            }

            // Procesar el mensaje usando el servicio
            await WhatsAppService.processIncomingMessage(value)
          }

          // Procesar estados de mensajes (entregado, leído, etc.)
          const statuses = value.statuses || []
          for (const status of statuses) {
            console.log('[WhatsApp Webhook] Message status update:', {
              id: status.id,
              status: status.status,
              timestamp: status.timestamp,
            })

            // Si el mensaje fue leído, marcarlo como leído
            if (status.status === 'read') {
              try {
                await WhatsAppService.markAsRead(status.id)
              } catch (error) {
                console.error('[WhatsApp Webhook] Error marking message as read:', error)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('[WhatsApp Webhook] Error handling Meta webhook:', error)
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// Handlers de eventos de Manychat
// ============================================================================

async function handleNewSubscriber(event: ManychatWebhookEvent) {
  if (!event.data.subscriber) return

  const subscriber = event.data.subscriber
  
  // Sincronizar subscriber a CRM
  const leadId = await ManychatSyncService.syncManychatToLead(subscriber)
  
  if (leadId) {
    console.log(`New subscriber ${subscriber.id} synced to lead ${leadId}`)
  }
}

async function handleMessageReceived(event: ManychatWebhookEvent) {
  if (!event.data.subscriber || !event.data.message) return

  const subscriber = event.data.subscriber
  const message = event.data.message

  // Sincronizar subscriber si no existe en CRM
  let lead = null
  if (supabase.client) {
    const { data } = await supabase.client
      .from('"Lead"')
      .select('*')
      .eq('manychatId', String(subscriber.id))
      .single()
    lead = data
  }

  if (!lead) {
    const leadId = await ManychatSyncService.syncManychatToLead(subscriber)
    if (leadId) {
      lead = await supabase.findLeadById(leadId)
    }
  }

  if (!lead) return

  // Buscar o crear conversación
  let conversation = await ConversationService.findConversationByPlatform(
    'whatsapp',
    String(subscriber.id)
  )

  if (!conversation) {
    conversation = await ConversationService.createConversation({
      platform: 'whatsapp',
      platformId: String(subscriber.id),
      leadId: lead.id,
    })
  }

  // Crear mensaje en CRM
  const content = message.text || getMediaPlaceholder(message.type)
  
  await WhatsAppService.createMessage({
    conversationId: conversation.id,
    direction: 'inbound',
    content,
    messageType: message.type,
    mediaUrl: message.url,
    platformMsgId: message.id,
  })

  // Actualizar última actividad
  await ConversationService.updateLastActivity(conversation.id)

  console.log(`Message received from subscriber ${subscriber.id}`)
}

async function handleTagAdded(event: ManychatWebhookEvent) {
  if (!event.data.subscriber || !event.data.tag) return

  const subscriber = event.data.subscriber
  const tag = event.data.tag

  // Buscar lead por manychatId
  let lead = null
  if (supabase.client) {
    const { data } = await supabase.client
      .from('"Lead"')
      .select('*')
      .eq('manychatId', String(subscriber.id))
      .single()
    lead = data
  }

  if (!lead) return

  // Actualizar tags del lead
  let tags: string[] = []
  try {
    tags = lead.tags ? JSON.parse(lead.tags) : []
  } catch (e) {
    tags = []
  }

  if (!tags.includes(tag.name)) {
    tags.push(tag.name)
    await supabase.updateLead(lead.id, { 
      tags: JSON.stringify(tags) 
    })
  }

  console.log(`Tag ${tag.name} added to lead ${lead.id}`)
}

async function handleTagRemoved(event: ManychatWebhookEvent) {
  if (!event.data.subscriber || !event.data.tag) return

  const subscriber = event.data.subscriber
  const tag = event.data.tag

  // Buscar lead por manychatId
  let lead = null
  if (supabase.client) {
    const { data } = await supabase.client
      .from('"Lead"')
      .select('*')
      .eq('manychatId', String(subscriber.id))
      .single()
    lead = data
  }

  if (!lead) return

  // Actualizar tags del lead
  let tags: string[] = []
  try {
    tags = lead.tags ? JSON.parse(lead.tags) : []
  } catch (e) {
    tags = []
  }

  tags = tags.filter(t => t !== tag.name)
  await supabase.updateLead(lead.id, { 
    tags: JSON.stringify(tags) 
  })

  console.log(`Tag ${tag.name} removed from lead ${lead.id}`)
}

async function handleCustomFieldChanged(event: ManychatWebhookEvent) {
  if (!event.data.subscriber || !event.data.custom_field) return

  const subscriber = event.data.subscriber
  const customField = event.data.custom_field

  // Buscar lead por manychatId
  let lead = null
  if (supabase.client) {
    const { data } = await supabase.client
      .from('"Lead"')
      .select('*')
      .eq('manychatId', String(subscriber.id))
      .single()
    lead = data
  }

  if (!lead) return

  // Actualizar custom field en el lead
  let customFields: Record<string, any> = {}
  try {
    customFields = lead.customFields ? JSON.parse(lead.customFields) : {}
  } catch (e) {
    customFields = {}
  }

  customFields[customField.name] = customField.value

  await supabase.updateLead(lead.id, { 
    customFields: JSON.stringify(customFields) 
  })

  console.log(`Custom field ${customField.name} updated for lead ${lead.id}`)
}

function getMediaPlaceholder(type: string): string {
  switch (type) {
    case 'image': return '[Imagen]'
    case 'video': return '[Video]'
    case 'audio': return '[Audio]'
    case 'file': return '[Archivo]'
    case 'location': return '[Ubicación]'
    case 'sticker': return '[Sticker]'
    default: return '[Mensaje multimedia]'
  }
}
