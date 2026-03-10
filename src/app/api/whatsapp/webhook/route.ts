import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { ManychatSyncService } from '@/server/services/manychat-sync-service'
import { ConversationService } from '@/server/services/conversation-service'
import { ManychatWebhookEvent, ManychatSubscriber } from '@/types/manychat'
import { supabase } from '@/lib/db'
import { formatWhatsAppNumber } from '@/lib/integrations/whatsapp-business-api'
import { parseFormMessage, updateLeadFromParsedForm } from '@/lib/form-message-parser'

export async function GET(request: NextRequest) {
  // Verificación del webhook de WhatsApp (Meta) o Manychat
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')?.trim() ?? ''
  const challenge = searchParams.get('hub.challenge') ?? ''

  const verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || process.env.MANYCHAT_WEBHOOK_SECRET || '').trim()

  if (!verifyToken) {
    console.error('Webhook verification failed: WHATSAPP_VERIFY_TOKEN (or MANYCHAT_WEBHOOK_SECRET) is not set')
    return new NextResponse('Server misconfiguration: verify token not set', { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.log('Webhook verification failed', { mode, hasToken: !!token, tokenMatch: token === verifyToken })
  return new NextResponse('Forbidden', { status: 403 })
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
    console.log('Processing Manychat webhook:', event.event_type)

    switch (event.event_type) {
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
        console.log('Unhandled Manychat event type:', event.event_type)
    }

    return NextResponse.json({ status: 'success' })
  } catch (error) {
    console.error('Error handling Manychat webhook:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

/**
 * Extraer nombre del contacto desde el payload del webhook de Meta.
 * Meta puede enviar: value.contacts[].profile.name; también se revisa el mensaje por si trae nombre.
 */
function getContactNameFromWebhook(phoneNumber: string, contacts: any[], message: any): string | undefined {
  if (!contacts?.length) return undefined
  const contact = contacts.find((c: any) => c.wa_id === phoneNumber || String(c.wa_id) === String(phoneNumber))
  const fromProfile = contact?.profile?.name
  if (fromProfile && typeof fromProfile === 'string' && fromProfile.trim()) return fromProfile.trim()
  const fromContact = (contact as any)?.name
  if (fromContact && typeof fromContact === 'string' && fromContact.trim()) return fromContact.trim()
  return undefined
}

/**
 * Procesar webhook de Meta (WhatsApp Business API)
 * Incluye auto-creación de leads para números desconocidos y nombre desde el webhook
 */
async function handleMetaWebhook(body: any) {
  try {
    console.log('[WhatsApp Webhook] Processing Meta webhook')

    // Procesar cada entrada del webhook
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'message_echoes') {
          await handleMessageEchoes(change.value)
          continue
        }
        if (change.field === 'message_template_status_update') {
          await handleMessageTemplateStatusUpdate(change.value)
          continue
        }
        if (change.field === 'messages') {
          const value = change.value
          const messages = value.messages || []
          const contacts = value.contacts || []

          // Errores de entrega (mensajes fallidos)
          const errors = value.errors || []
          for (const err of errors) {
            console.error('[WhatsApp Webhook] Message delivery error:', {
              code: err.code,
              title: err.title,
              message: err.message,
              messageId: err.error_data?.message_id,
            })
            if (err.error_data?.message_id) {
              try {
                await WhatsAppService.markMessageDeliveryFailed(err.error_data.message_id, err.message || err.title)
              } catch (e) {
                console.warn('[WhatsApp Webhook] Could not update message as failed:', e)
              }
            }
          }

          // Procesar cada mensaje
          for (const message of messages) {
            const phoneNumber = message.from
            const contactName = getContactNameFromWebhook(phoneNumber, contacts, message)
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
              // Siempre traer el nombre desde el webhook cuando Meta lo envíe: actualizar si está vacío, genérico o si viene nombre nuevo
              if (contactName) {
                const current = (lead.nombre || '').trim()
                const isGeneric = !current || /^Lead WhatsApp \d{4}$|^Usuario$|^Sin nombre$/i.test(current) || current.length < 2
                if (isGeneric || current !== contactName) {
                  try {
                    await supabase.updateLead(lead.id, { nombre: contactName })
                    console.log('[WhatsApp Webhook] Lead name from webhook:', contactName)
                  } catch (e) {
                    console.warn('[WhatsApp Webhook] Could not update lead name:', e)
                  }
                }
              }
            }

            // Procesar el mensaje usando el servicio (pasamos leadId y platformId por teléfono para vincular bien)
            await WhatsAppService.processIncomingMessage({
              messages: [message],
              contacts: contacts,
              metadata: value.metadata,
              leadId: lead?.id,
              platformIdByPhone: formattedPhone,
            })

            // Si el mensaje es "Solicitud de Crédito" (formulario), actualizar custom fields y asignar tag en el CRM
            // (cuando el webhook de Meta apunta al CRM, UChat no recibe el mensaje; esta lógica replica el efecto en el CRM)
            const rawText = message.text?.body
            if (rawText && rawText.includes('Solicitud de Crédito') && lead?.id) {
              try {
                if (supabase.client) {
                  const parsed = parseFormMessage(rawText)
                  if (parsed) {
                    await updateLeadFromParsedForm(lead.id, parsed, supabase.client)
                    console.log('[WhatsApp Webhook] Lead actualizado con datos de Solicitud de Crédito', { leadId: lead.id })
                  }
                }
                let currentTags: string[] = []
                if (lead.tags) {
                  try {
                    currentTags = Array.isArray(lead.tags) ? lead.tags : JSON.parse(String(lead.tags))
                  } catch {
                    currentTags = []
                  }
                }
                if (!currentTags.includes('solicitud-en-proceso')) {
                  currentTags.push('solicitud-en-proceso')
                  await supabase.updateLead(lead.id, {
                    tags: JSON.stringify(currentTags),
                    updatedAt: new Date().toISOString(),
                  })
                  console.log('[WhatsApp Webhook] Tag solicitud-en-proceso asignado al lead', { leadId: lead.id })
                }
              } catch (err) {
                console.error('[WhatsApp Webhook] Error procesando Solicitud de Crédito (custom fields / tag):', err)
              }
            }
          }

          // Procesar estados de mensajes (sent, delivered, read) y persistir en DB
          const statuses = value.statuses || []
          for (const status of statuses) {
            const msgStatus = status.status
            if (msgStatus !== 'sent' && msgStatus !== 'delivered' && msgStatus !== 'read') continue

            console.log('[WhatsApp Webhook] Message status update:', {
              id: status.id,
              status: msgStatus,
              timestamp: status.timestamp,
            })
            try {
              await WhatsAppService.updateMessageStatus(
                status.id,
                msgStatus as 'sent' | 'delivered' | 'read',
                status.timestamp
              )
            } catch (error) {
              console.error('[WhatsApp Webhook] Error updating message status:', error)
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

/**
 * Procesar message_echoes: mensajes enviados por el negocio (para mostrarlos en el historial del CRM)
 */
/**
 * Handler para message_template_status_update (estado de plantillas: aprobadas, rechazadas, etc.)
 * Ver https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#message-template-status-update
 */
async function handleMessageTemplateStatusUpdate(value: any) {
  if (!value) return
  console.log('[WhatsApp Webhook] Template status update:', {
    event: value.event,
    messageTemplateId: value.message_template_id,
    messageTemplateName: value.message_template_name,
    messageTemplateLanguage: value.message_template_language,
    reason: value.reason,
  })
  // Aquí se podría persistir estado de plantillas en el CRM si se necesita
}

async function handleMessageEchoes(value: any) {
  const messages = value?.messages || []
  if (!supabase.client || messages.length === 0) return

  for (const message of messages) {
    try {
      const to = message.to
      if (!to) continue
      const formattedPhone = formatWhatsAppNumber(to)
      const lead = await supabase.findLeadByPhoneOrDni(formattedPhone) || await supabase.findLeadByPhoneOrDni(to)
      if (!lead) {
        console.log('[WhatsApp Webhook] Echo: lead not found for', to)
        continue
      }
      const { data: conv } = await supabase.client
        .from('conversations')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('platform', 'whatsapp')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!conv?.id) {
        console.log('[WhatsApp Webhook] Echo: no conversation for lead', lead.id)
        continue
      }
      const content = message.text?.body || '[Multimedia]'
      const messageType = message.type || 'text'
      await WhatsAppService.createMessage({
        conversationId: conv.id,
        direction: 'outbound',
        content,
        messageType,
        platformMsgId: message.id,
      })
      await ConversationService.updateLastActivity(conv.id)
      console.log('[WhatsApp Webhook] Echo saved for lead', lead.id)
    } catch (err) {
      console.error('[WhatsApp Webhook] Error processing echo:', err)
    }
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
