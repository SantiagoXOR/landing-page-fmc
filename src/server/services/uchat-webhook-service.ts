import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { parseFormMessage, updateLeadFromParsedForm, type ParsedForm } from '@/lib/form-message-parser'
import type { UchatWebhookEvent, UchatSubscriber, UchatWebhookMessage, UchatTag, UchatWebhookCustomField } from '@/types/uchat'
import { ConversationService } from './conversation-service'
import { PipelineAutoMoveService } from './pipeline-auto-move-service'

const UCHAT_PREFIX = 'uchat_'

/**
 * Servicio para procesar webhooks de Uchat.
 * Misma lÃ³gica que Manychat: new_subscriber, message_received, tag_added, custom_field_changed.
 * Los leads de Uchat se identifican con manychatId = "uchat_" + id del usuario Uchat.
 */
export class UchatWebhookService {
  static async processWebhookEvent(event: UchatWebhookEvent): Promise<{
    success: boolean
    leadId?: string
    conversationId?: string
    messageId?: string
    error?: string
  }> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const subscriber = event.subscriber ?? (event.subscriber_id != null ? null : undefined)
      if (!subscriber) {
        logger.warn('Webhook Uchat sin subscriber', { event_type: event.event_type })
        return { success: false, error: 'No subscriber in webhook event' }
      }

      switch (event.event_type) {
        case 'new_subscriber':
          if (event.message) {
            const formContent = event.message.text || event.message.caption || ''
            if (formContent.includes('Solicitud de CrÃ©dito')) {
              const parsed = parseFormMessage(formContent)
              if (parsed) {
                enrichSubscriberFromParsedForm(subscriber, parsed)
              }
            }
            const leadResult = await this.handleSubscriberEvent(subscriber, true)
            if (!leadResult.success || !leadResult.leadId) return leadResult
            const messageResult = await this.handleMessageEvent(subscriber, event.message, 'message_received')
            return {
              success: messageResult.success,
              leadId: leadResult.leadId ?? messageResult.leadId,
              conversationId: messageResult.conversationId,
              messageId: messageResult.messageId,
              error: messageResult.error,
            }
          }
          return await this.handleSubscriberEvent(subscriber, true)

        case 'subscriber_updated':
          return await this.handleSubscriberEvent(subscriber, false)

        case 'message_received':
        case 'message_sent':
          return await this.handleMessageEvent(subscriber, event.message!, event.event_type as 'message_received' | 'message_sent')

        case 'tag_added':
        case 'tag_removed':
          return await this.handleTagEvent(subscriber, event.tag!, event.event_type)

        case 'custom_field_changed':
          return await this.handleCustomFieldEvent(subscriber, event.custom_field!)

        default:
          logger.info('Evento Uchat no procesado', { event_type: event.event_type })
          return { success: true }
      }
    } catch (error: unknown) {
      const err = error as Error
      logger.error('Error procesando webhook Uchat', { error: err.message, event_type: event.event_type })
      return { success: false, error: err.message }
    }
  }

  private static uchatId(subscriber: UchatSubscriber): string {
    return UCHAT_PREFIX + String(subscriber.id)
  }

  private static async findOrCreateLeadFromUchatSubscriber(
    subscriber: UchatSubscriber,
    forceCreate: boolean
  ): Promise<string | null> {
    if (!supabase.client) return null

    const uchatId = this.uchatId(subscriber)
    const phone = subscriber.whatsapp_phone || subscriber.phone || ''

    if (uchatId) {
      const { data: byUchat } = await supabase.client
        .from('Lead')
        .select('id')
        .eq('manychatId', uchatId)
        .maybeSingle()
      if (byUchat) return byUchat.id
    }

    if (phone && !forceCreate) {
      const { data: byPhone } = await supabase.client
        .from('Lead')
        .select('id, manychatId')
        .eq('telefono', phone)
        .maybeSingle()
      if (byPhone) {
        if (!byPhone.manychatId) {
          await supabase.client.from('Lead').update({ manychatId: uchatId, updatedAt: new Date().toISOString() }).eq('id', byPhone.id)
        }
        return byPhone.id
      }
    }

    const nombre = [subscriber.first_name, subscriber.last_name].filter(Boolean).join(' ') || subscriber.name || 'Contacto Uchat'
    const customFields = subscriber.custom_fields || {}
    const tags = subscriber.tags || []

    const leadData = {
      nombre,
      telefono: phone || uchatId,
      email: (subscriber.email as string) || null,
      manychatId: uchatId,
      origen: (customFields.origen as string) || 'whatsapp',
      estado: (customFields.estado as string) || 'NUEVO',
      dni: (customFields.dni as string) || null,
      cuil: (customFields.cuit as string) || (customFields.cuil as string) || null,
      ingresos: customFields.ingresos != null ? Number(customFields.ingresos) : null,
      zona: (customFields.zona as string) || null,
      producto: (customFields.producto as string) || null,
      monto: customFields.monto != null ? Number(customFields.monto) : null,
      agencia: (customFields.agencia as string) || null,
      banco: (customFields.banco as string) || null,
      trabajo_actual: (customFields.trabajo_actual as string) || null,
      tags: tags.length > 0 ? JSON.stringify(tags.map((t) => (typeof t === 'string' ? t : t.name))) : null,
      customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const { data: newLead, error } = await supabase.client.from('Lead').insert(leadData).select('id').single()
    if (error) {
      logger.error('Error creando lead desde Uchat', { error: error.message, uchatId })
      return null
    }
    logger.info('Lead creado desde Uchat', { leadId: newLead.id, uchatId })
    return newLead.id
  }

  private static async findOrCreateConversation(leadId: string, platform: string, platformId: string): Promise<string | null> {
    let conv = await ConversationService.findConversationByPlatform(platform, platformId)
    if (conv) {
      if (!conv.lead_id && supabase.client) {
        await supabase.client.from('conversations').update({ lead_id: leadId, updated_at: new Date().toISOString() }).eq('id', conv.id)
      }
      return conv.id
    }
    conv = await ConversationService.createConversation({ platform, platformId, leadId })
    return conv?.id ?? null
  }

  private static async saveMessage(
    conversationId: string,
    message: UchatWebhookMessage,
    direction: 'inbound' | 'outbound'
  ): Promise<string | null> {
    if (!supabase.client) return null

    let content = ''
    let mediaUrl: string | null = null
    switch (message.type) {
      case 'text':
        content = message.text || ''
        break
      case 'image':
      case 'video':
      case 'audio':
      case 'file':
        content = message.caption || `[${message.type}]`
        mediaUrl = message.url || null
        break
      case 'location':
        content = `UbicaciÃ³n: ${message.latitude}, ${message.longitude}`
        break
      default:
        content = `[${message.type}]`
    }

    const platformMsgId = message.platform_msg_id || message.id
    if (platformMsgId) {
      const { data: existing } = await supabase.client
        .from('messages')
        .select('id')
        .eq('platform_msg_id', platformMsgId)
        .maybeSingle()
      if (existing) return existing.id
    }

    const sentAt = message.timestamp ? new Date(message.timestamp * 1000).toISOString() : new Date().toISOString()
    const { data: newMessage, error } = await supabase.client
      .from('messages')
      .insert({
        conversation_id: conversationId,
        direction,
        content,
        media_url: mediaUrl,
        message_type: message.type,
        platform_msg_id: platformMsgId,
        sent_at: sentAt,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Error guardando mensaje Uchat', { error: error.message, conversationId })
      return null
    }
    await ConversationService.updateLastActivity(conversationId)
    return newMessage.id
  }

  private static async handleSubscriberEvent(
    subscriber: UchatSubscriber,
    isNew: boolean
  ): Promise<{ success: boolean; leadId?: string; error?: string; wasCreated?: boolean }> {
    const leadId = await this.findOrCreateLeadFromUchatSubscriber(subscriber, isNew)
    if (!leadId) return { success: false, error: 'Could not find or create lead' }
    await this.updateLeadActivity(leadId)
    return { success: true, leadId }
  }

  private static async handleMessageEvent(
    subscriber: UchatSubscriber,
    message: UchatWebhookMessage,
    eventType: 'message_received' | 'message_sent'
  ): Promise<{ success: boolean; leadId?: string; conversationId?: string; messageId?: string; error?: string }> {
    const leadId = await this.findOrCreateLeadFromUchatSubscriber(subscriber, false)
    if (!leadId) return { success: false, error: 'Could not find or create lead' }

    const platform = 'whatsapp'
    const platformId = String(subscriber.whatsapp_phone || subscriber.phone || subscriber.id)
    const conversationId = await this.findOrCreateConversation(leadId, platform, platformId)
    if (!conversationId) return { success: false, error: 'Could not find or create conversation' }

    const direction = eventType === 'message_received' ? 'inbound' : 'outbound'
    const messageId = await this.saveMessage(conversationId, message, direction)
    if (!messageId) return { success: false, error: 'Could not save message' }

    await this.updateLeadActivity(leadId)

    const content = message.text || message.caption || ''
    if (content.includes('Solicitud de CrÃ©dito') && supabase.client) {
      try {
        const parsed = parseFormMessage(content)
        if (parsed) {
          await updateLeadFromParsedForm(leadId, parsed, supabase.client)
          await PipelineAutoMoveService.checkAndMoveLeadWithCUIL(leadId).catch(() => {})
        }
      } catch {
        // no crÃ­tico
      }
    }

    return { success: true, leadId, conversationId, messageId }
  }

  private static async handleTagEvent(
    subscriber: UchatSubscriber,
    tag: UchatTag,
    eventType: 'tag_added' | 'tag_removed'
  ): Promise<{ success: boolean; leadId?: string; error?: string }> {
    const leadId = await this.findOrCreateLeadFromUchatSubscriber(subscriber, false)
    if (!leadId) return { success: false, error: 'Could not find or create lead' }

    if (supabase.client) {
      const { data: lead } = await supabase.client.from('Lead').select('tags').eq('id', leadId).single()
      const current = lead?.tags ? (typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags) : []
      const next = Array.isArray(current) ? [...current] : []
      const name = tag.name
      if (eventType === 'tag_removed') {
        const idx = next.indexOf(name)
        if (idx >= 0) next.splice(idx, 1)
      } else if (!next.includes(name)) {
        next.push(name)
      }
      await supabase.client.from('Lead').update({ tags: JSON.stringify(next), updatedAt: new Date().toISOString() }).eq('id', leadId)
    }
    await this.updateLeadActivity(leadId)
    return { success: true, leadId }
  }

  private static async handleCustomFieldEvent(
    subscriber: UchatSubscriber,
    customField: UchatWebhookCustomField
  ): Promise<{ success: boolean; leadId?: string; error?: string }> {
    if (!supabase.client) return { success: false, error: 'Database connection error' }

    const leadId = await this.findOrCreateLeadFromUchatSubscriber(subscriber, false)
    if (!leadId) return { success: false, error: 'Could not find or create lead' }

    const fieldMapping: Record<string, string> = {
      dni: 'dni',
      ingresos: 'ingresos',
      zona: 'zona',
      producto: 'producto',
      monto: 'monto',
      origen: 'origen',
      estado: 'estado',
      agencia: 'agencia',
      banco: 'banco',
      trabajo_actual: 'trabajo_actual',
      cuit: 'cuil',
      cuil: 'cuil',
    }
    const dbField = fieldMapping[customField.name.toLowerCase()]
    const { data: current } = await supabase.client.from('Lead').select('customFields').eq('id', leadId).single()
    let customFieldsJson: Record<string, unknown> = {}
    if (current?.customFields) {
      try {
        customFieldsJson = typeof current.customFields === 'string' ? JSON.parse(current.customFields) : (current.customFields as Record<string, unknown>)
      } catch {
        // ignore
      }
    }
    customFieldsJson[customField.name] = customField.value

    const update: Record<string, unknown> = {
      customFields: JSON.stringify(customFieldsJson),
      updatedAt: new Date().toISOString(),
    }
    if (dbField) {
      update[dbField] = customField.value ?? null
    }

    await supabase.client.from('Lead').update(update).eq('id', leadId)

    if (dbField === 'cuil' && customField.value) {
      await PipelineAutoMoveService.checkAndMoveLeadWithCUIL(leadId).catch(() => {})
    }
    await this.updateLeadActivity(leadId)
    return { success: true, leadId }
  }

  private static async updateLeadActivity(leadId: string): Promise<void> {
    if (!supabase.client) return
    await supabase.client.from('Lead').update({ updatedAt: new Date().toISOString() }).eq('id', leadId)
  }
}

function enrichSubscriberFromParsedForm(subscriber: UchatSubscriber, parsed: ParsedForm): void {
  if (!subscriber.custom_fields) subscriber.custom_fields = {}
  const cf = subscriber.custom_fields as Record<string, unknown>
  if (parsed.cuil) cf.cuil = parsed.cuil
  if (parsed.dni) cf.dni = parsed.dni
  if (parsed.ingresos != null) cf.ingresos = parsed.ingresos
  if (parsed.zona) cf.zona = parsed.zona
  if (parsed.producto) cf.producto = parsed.producto
  if (parsed.marca) cf.marca = parsed.marca
  if (parsed.modelo) cf.modelo = parsed.modelo
  if (parsed.cuotas) cf.cuotas = parsed.cuotas
  if (parsed.email) cf.email = parsed.email
  if (parsed.nombre) {
    const parts = String(parsed.nombre).trim().split(/\s+/)
    subscriber.first_name = parts[0] || String(parsed.nombre)
    subscriber.last_name = parts.length > 1 ? parts.slice(1).join(' ') : undefined
    subscriber.name = String(parsed.nombre)
  }
}
