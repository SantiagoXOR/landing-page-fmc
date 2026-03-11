import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { ConversationService } from '@/server/services/conversation-service'
import { supabase } from '@/lib/db'
import { formatWhatsAppNumber } from '@/lib/integrations/whatsapp-business-api'
import { parseFormMessage, updateLeadFromParsedForm } from '@/lib/form-message-parser'

export async function GET(request: NextRequest) {
  // Verificación del webhook de WhatsApp (Meta) o Manychat
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')?.trim() ?? ''
  const challenge = searchParams.get('hub.challenge') ?? ''

  const verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim()

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

    if (body.object === 'whatsapp_business_account') {
      return await handleMetaWebhook(body)
    }
    return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
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
        // message_echoes: mensajes enviados por el negocio (agente o automatización). Suscribir este campo en Meta para que se vean en el panel de chat.
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

            // Flujo "lead-nuevo": cuando alguien escribe por primera vez (sin etiqueta lead-nuevo), llamar a UChat
            // para que envíe el mensaje de bienvenida y aplique la etiqueta en UChat (como en el diagrama del flujo).
            if (lead?.id) {
              let leadTags: string[] = []
              if (lead.tags) {
                try {
                  leadTags = Array.isArray(lead.tags) ? lead.tags : JSON.parse(String(lead.tags))
                } catch {
                  leadTags = []
                }
              }
              if (!leadTags.includes('lead-nuevo')) {
                const uchatLeadNuevoUrl = (process.env.UCHAT_INBOUND_WEBHOOK_LEAD_NUEVO_URL || '').trim()
                if (uchatLeadNuevoUrl) {
                  const contactName = getContactNameFromWebhook(phoneNumber, contacts, message)
                  const firstName = contactName?.split(/\s+/)[0] || lead.nombre?.split(/\s+/)[0]
                  const payload: Record<string, string | number> = { phone: formattedPhone }
                  if (firstName) payload.first_name = firstName
                  console.log('[WhatsApp Webhook] Llamando a UChat Inbound Webhook lead-nuevo', { phone: formattedPhone })
                  fetch(uchatLeadNuevoUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  }).then((res) => {
                    if (!res.ok) {
                      console.warn('[WhatsApp Webhook] UChat Inbound Webhook lead-nuevo respondió', res.status, { url: uchatLeadNuevoUrl })
                    } else {
                      console.log('[WhatsApp Webhook] UChat Inbound Webhook lead-nuevo llamado', { phone: formattedPhone })
                    }
                  }).catch((err) => {
                    console.error('[WhatsApp Webhook] Error llamando a UChat Inbound Webhook lead-nuevo:', err)
                  })
                } else {
                  console.warn('[WhatsApp Webhook] UCHAT_INBOUND_WEBHOOK_LEAD_NUEVO_URL no configurada; no se envía mensaje de bienvenida a UChat', { leadId: lead.id })
                }
                leadTags.push('lead-nuevo')
                await supabase.updateLead(lead.id, {
                  tags: JSON.stringify(leadTags),
                  updatedAt: new Date().toISOString(),
                })
                ;(lead as { tags?: string }).tags = JSON.stringify(leadTags)
                console.log('[WhatsApp Webhook] Tag lead-nuevo asignado al lead', { leadId: lead.id })
              }
            }

            // Si el mensaje es "Solicitud de Crédito" (formulario), actualizar custom fields y asignar tag en el CRM,
            // y reenviar a UChat Inbound Webhook para que el bot ejecute el flujo y envíe la respuesta (Opción B).
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
                // Reenviar a UChat Inbound Webhook para que ejecute el flujo "Solicitud de Crédito" y envíe la respuesta al usuario
                const uchatWebhookUrl = (process.env.UCHAT_INBOUND_WEBHOOK_SOLICITUD_CREDITO_URL || '').trim()
                if (uchatWebhookUrl) {
                  const contactName = getContactNameFromWebhook(phoneNumber, contacts, message)
                  const firstName = contactName?.split(/\s+/)[0] || lead.nombre?.split(/\s+/)[0]
                  const payload: Record<string, string | number> = { phone: formattedPhone }
                  if (firstName) payload.first_name = firstName
                  // Fire-and-forget: no bloquear la respuesta a Meta
                  fetch(uchatWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  }).then((res) => {
                    if (!res.ok) {
                      console.warn('[WhatsApp Webhook] UChat Inbound Webhook respondió', res.status, { url: uchatWebhookUrl })
                    } else {
                      console.log('[WhatsApp Webhook] UChat Inbound Webhook llamado para Solicitud de Crédito', { phone: formattedPhone })
                    }
                  }).catch((err) => {
                    console.error('[WhatsApp Webhook] Error llamando a UChat Inbound Webhook:', err)
                  })
                }
              } catch (err) {
                console.error('[WhatsApp Webhook] Error procesando Solicitud de Crédito (custom fields / tag):', err)
              }
            } else if (rawText && lead?.id) {
              // Mensaje de consulta (no es "Solicitud de Crédito"): reenviar a UChat Inbound Webhook "Consultas - Carla"
              // para que el AI Agent Carla responda con la base de conocimiento. Solo si el lead ya tiene lead-nuevo
              // (no es el primer mensaje) para no enviar bienvenida + respuesta de Carla a la vez.
              let hasLeadNuevo = false
              if (lead.tags) {
                try {
                  const tags = Array.isArray(lead.tags) ? lead.tags : JSON.parse(String(lead.tags))
                  hasLeadNuevo = tags.includes('lead-nuevo')
                } catch {
                  // ignore
                }
              }
              if (hasLeadNuevo) {
                const uchatCarlaUrl = (process.env.UCHAT_INBOUND_WEBHOOK_CONSULTAS_CARLA_URL || '').trim()
                if (uchatCarlaUrl) {
                  const contactName = getContactNameFromWebhook(phoneNumber, contacts, message)
                  const firstName = contactName?.split(/\s+/)[0] || lead.nombre?.split(/\s+/)[0]
                  const payload: Record<string, string> = {
                    phone: formattedPhone,
                    message: rawText,
                  }
                  if (firstName) payload.first_name = firstName
                  console.log('[WhatsApp Webhook] Llamando a UChat Inbound Webhook Consultas - Carla', { phone: formattedPhone })
                  fetch(uchatCarlaUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  }).then((res) => {
                    if (!res.ok) {
                      console.warn('[WhatsApp Webhook] UChat Inbound Webhook Consultas - Carla respondió', res.status, { url: uchatCarlaUrl })
                    } else {
                      console.log('[WhatsApp Webhook] UChat Inbound Webhook Consultas - Carla llamado', { phone: formattedPhone })
                    }
                  }).catch((err) => {
                    console.error('[WhatsApp Webhook] Error llamando a UChat Inbound Webhook Consultas - Carla:', err)
                  })
                } else {
                  console.warn('[WhatsApp Webhook] UCHAT_INBOUND_WEBHOOK_CONSULTAS_CARLA_URL no configurada; Carla no responderá consultas', { leadId: lead.id })
                }
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
 * Extraer texto/contenido de un mensaje echo (enviado por el negocio) para guardarlo en el historial.
 * Meta puede enviar text, template, interactive, image, etc.
 */
function getEchoMessageContent(message: any): { content: string; messageType: string } {
  if (message.text?.body) {
    return { content: message.text.body, messageType: 'text' }
  }
  if (message.template?.components) {
    const body = message.template.components?.find((c: any) => c.type === 'body')
    const text = body?.parameters?.map((p: any) => p.text).join(' ') || message.template.name || '[Plantilla]'
    return { content: text, messageType: 'text' }
  }
  if (message.interactive?.body?.text) {
    return { content: message.interactive.body.text, messageType: 'text' }
  }
  if (message.interactive?.type === 'button' && message.interactive?.action?.buttons) {
    const btn = message.interactive.action.buttons[0]
    return { content: btn?.reply?.title || '[Botón]', messageType: 'text' }
  }
  if (message.interactive?.type === 'list') {
    const desc = message.interactive.body?.text || message.interactive.action?.title
    return { content: desc || '[Lista]', messageType: 'text' }
  }
  const type = message.type || 'unknown'
  if (type === 'image') return { content: message.image?.caption || '[Imagen]', messageType: 'image' }
  if (type === 'video') return { content: message.video?.caption || '[Video]', messageType: 'video' }
  if (type === 'audio') return { content: '[Audio]', messageType: 'audio' }
  if (type === 'document') return { content: message.document?.filename || '[Documento]', messageType: 'document' }
  return { content: '[Mensaje]', messageType: type }
}

/**
 * Procesar message_echoes: mensajes enviados por el negocio (agente o automatización) para mostrarlos en el CRM.
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
      const { content, messageType } = getEchoMessageContent(message)
      await WhatsAppService.createMessage({
        conversationId: conv.id,
        direction: 'outbound',
        content,
        messageType: messageType === 'document' ? 'file' : messageType,
        platformMsgId: message.id,
        isFromBot: true,
      })
      await ConversationService.updateLastActivity(conv.id)
      console.log('[WhatsApp Webhook] Echo saved for lead', lead.id)
    } catch (err) {
      console.error('[WhatsApp Webhook] Error processing echo:', err)
    }
  }
}
