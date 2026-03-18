/**
 * Al mover un lead a Preaprobado o Rechazado en el pipeline:
 * 1) Opcional: POST a Inbound Webhook de Uchat (etiqueta + flujo en Uchat).
 * 2) Opcional: envío del mensaje por WhatsApp (Meta) con los textos oficiales.
 *
 * Ver docs/UCHAT-PIPELINE-PREAPROBADO-RECHAZADO.md
 */

import {
  formatWhatsAppNumber,
  isValidWhatsAppNumber,
  WhatsAppAPIError,
} from '@/lib/integrations/whatsapp-business-api'
import { logger } from '@/lib/logger'
import { WhatsAppService } from '@/server/services/whatsapp-service'
import { ConversationService } from '@/server/services/conversation-service'

/** Ventana de mensajes libres de Meta (desde último mensaje del cliente registrado en el CRM) */
const META_CUSTOMER_CARE_WINDOW_MS = 24 * 60 * 60 * 1000

const RETRIES = 3
const DELAY_MS = 800

async function fetchWithRetry(url: string, options: RequestInit, label: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.status >= 500 && attempt < RETRIES) {
        lastError = new Error(`HTTP ${res.status}`)
        await new Promise((r) => setTimeout(r, DELAY_MS * attempt))
        continue
      }
      return res
    } catch (err) {
      lastError = err
      if (attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, DELAY_MS * attempt))
      } else {
        throw lastError
      }
    }
  }
  throw lastError
}

/** Mensaje preaprobado (Banco Formosa) — mismo contenido que flujo manual / imagen de referencia */
export const PIPELINE_PREAPROBADO_MESSAGE_DEFAULT = `Felicitaciones, usted tiene un crédito prendario pre-aprobado con el Banco Formosa, para continuar la gestión puede visualizar las agencias con las que trabajamos y consultar allí el modelo que más le guste!!

https://www.bancoformosa.com.ar/Prestamos-bPrendariosb-510.note.aspx`

/** Mensaje rechazo por ingresos no por Banco Formosa — referencia imagen */
export const PIPELINE_RECHAZADO_MESSAGE_DEFAULT =
  'Buenas tardes, lamentablemente no podremos asistirlo ya que no percibe sus ingresos a través del Banco Formosa, lo esperamos para futuras operaciones!'

export interface PipelineNotifyLead {
  id: string
  telefono?: string | null
  nombre?: string | null
  manychatId?: string | null
}

function firstName(lead: PipelineNotifyLead): string | undefined {
  const n = (lead.nombre || '').trim().split(/\s+/)[0]
  return n || undefined
}

function phoneForPayload(lead: PipelineNotifyLead): string | null {
  const raw = (lead.telefono || '').trim()
  if (!raw) return null
  try {
    const f = formatWhatsAppNumber(raw)
    return isValidWhatsAppNumber(f) ? f : null
  } catch {
    return null
  }
}

/**
 * Por defecto: envía WhatsApp por Meta (texto oficial del CRM, como en las plantillas acordadas).
 * UCHAT_*_URL: además dispara Uchat para aplicar etiqueta al suscriptor (configurar flujo sin enviar texto si no querés duplicar).
 *
 * PIPELINE_NOTIFY_SKIP_META=true → no envía por Meta (solo Uchat vía webhook; el flujo debe enviar `message`).
 */
function shouldSendMeta(): boolean {
  const skip = (process.env.PIPELINE_NOTIFY_SKIP_META || '').trim().toLowerCase()
  return skip !== 'true' && skip !== '1'
}

function resolveTemplateName(kind: 'preaprobado' | 'rechazado'): string {
  const generic = (process.env.WHATSAPP_TEMPLATE_PIPELINE_NOTIFY || '').trim()
  if (kind === 'preaprobado') {
    return (process.env.WHATSAPP_TEMPLATE_PREAPROBADO || '').trim() || generic
  }
  return (process.env.WHATSAPP_TEMPLATE_RECHAZADO || '').trim() || generic
}

/**
 * Mensaje de sesión si hay ventana activa; si pasaron 24 h (o no hay inbound en CRM),
 * plantilla aprobada en Meta con cuerpo {{1}} = texto completo.
 */
async function deliverPipelineWhatsApp(
  leadId: string,
  phone: string,
  message: string,
  kind: 'preaprobado' | 'rechazado'
): Promise<void> {
  if (!WhatsAppService.isConfigured()) {
    logger.warn(`Pipeline ${kind}: WhatsApp Meta no configurado`, { leadId })
    return
  }

  const templateName = resolveTemplateName(kind)
  const lang = (process.env.WHATSAPP_TEMPLATE_PIPELINE_LANG || 'es').trim()

  const lastInbound = await ConversationService.getLastInboundWhatsAppMessageAt(leadId)
  const outsideWindow =
    !lastInbound || Date.now() - lastInbound.getTime() >= META_CUSTOMER_CARE_WINDOW_MS

  const sendTemplate = () =>
    WhatsAppService.sendTemplateBodySingleVariable({
      to: phone,
      templateName,
      languageCode: lang,
      bodyText: message,
    })

  try {
    if (outsideWindow && templateName) {
      await sendTemplate()
      logger.info(`WhatsApp ${kind} enviado por plantilla (ventana 24 h cerrada o sin mensaje inbound en CRM)`, {
        leadId,
      })
      return
    }

    await WhatsAppService.sendMessage({ to: phone, message })
    logger.info(`WhatsApp ${kind} enviado (mensaje de sesión)`, { leadId })
  } catch (err) {
    if (err instanceof WhatsAppAPIError && err.isOutsideMessagingWindow() && templateName) {
      try {
        await sendTemplate()
        logger.info(`WhatsApp ${kind} enviado por plantilla (reintento tras error de ventana)`, { leadId })
        return
      } catch (tplErr) {
        logger.error(`WhatsApp ${kind}: falló plantilla`, {
          leadId,
          error: tplErr instanceof Error ? tplErr.message : String(tplErr),
        })
      }
    }

    const needTemplate = outsideWindow && !templateName
    logger.warn(`WhatsApp ${kind} no enviado`, {
      leadId,
      error: err instanceof Error ? err.message : String(err),
      ...(needTemplate && {
        hint: 'Pasaron 24 h o no hay historial inbound en el CRM: creá una plantilla en Meta con variable {{1}} y configurá WHATSAPP_TEMPLATE_PREAPROBADO / WHATSAPP_TEMPLATE_RECHAZADO o WHATSAPP_TEMPLATE_PIPELINE_NOTIFY',
      }),
    })
  }
}

export async function notifyPipelinePreaprobado(
  lead: PipelineNotifyLead,
  options?: { tagApplied?: string }
): Promise<void> {
  const phone = phoneForPayload(lead)
  if (!phone) {
    logger.warn('Pipeline preaprobado: lead sin teléfono válido, omitiendo notificación Uchat/WhatsApp', {
      leadId: lead.id,
    })
    return
  }

  const message =
    (process.env.PIPELINE_PREAPROBADO_WHATSAPP_MESSAGE || '').trim() || PIPELINE_PREAPROBADO_MESSAGE_DEFAULT
  const url = (process.env.UCHAT_INBOUND_WEBHOOK_PREAPROBADO_URL || '').trim()
  const uchatSubscriberId = lead.manychatId?.startsWith('uchat_')
    ? lead.manychatId.slice('uchat_'.length)
    : undefined

  const payload = {
    phone,
    first_name: firstName(lead),
    lead_id: lead.id,
    event: 'pipeline_preaprobado',
    tag_to_apply: options?.tagApplied || 'credito-preaprobado',
    message,
    ...(uchatSubscriberId && { uchat_subscriber_id: uchatSubscriberId }),
  }

  if (url) {
    try {
      const res = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'pipeline-preaprobado-uchat'
      )
      if (!res.ok) {
        logger.warn('Uchat preaprobado webhook respondió no OK', { status: res.status, leadId: lead.id })
      } else {
        logger.info('Uchat preaprobado webhook llamado', { leadId: lead.id })
      }
    } catch (e) {
      logger.error('Error llamando Uchat preaprobado webhook', {
        leadId: lead.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  if (shouldSendMeta()) {
    await deliverPipelineWhatsApp(lead.id, phone, message, 'preaprobado')
  }
}

export async function notifyPipelineRechazado(
  lead: PipelineNotifyLead,
  options?: { tagApplied?: string; customRejectionMessage?: string | null }
): Promise<void> {
  const phone = phoneForPayload(lead)
  if (!phone) {
    logger.warn('Pipeline rechazado: lead sin teléfono válido, omitiendo notificación', { leadId: lead.id })
    return
  }

  const message =
    (options?.customRejectionMessage || '').trim() ||
    (process.env.PIPELINE_RECHAZADO_WHATSAPP_MESSAGE || '').trim() ||
    PIPELINE_RECHAZADO_MESSAGE_DEFAULT

  const url = (process.env.UCHAT_INBOUND_WEBHOOK_RECHAZADO_URL || '').trim()
  const uchatSubscriberId = lead.manychatId?.startsWith('uchat_')
    ? lead.manychatId.slice('uchat_'.length)
    : undefined

  const payload = {
    phone,
    first_name: firstName(lead),
    lead_id: lead.id,
    event: 'pipeline_rechazado',
    tag_to_apply: options?.tagApplied || 'credito-rechazado',
    message,
    ...(uchatSubscriberId && { uchat_subscriber_id: uchatSubscriberId }),
  }

  if (url) {
    try {
      const res = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        'pipeline-rechazado-uchat'
      )
      if (!res.ok) {
        logger.warn('Uchat rechazado webhook respondió no OK', { status: res.status, leadId: lead.id })
      } else {
        logger.info('Uchat rechazado webhook llamado', { leadId: lead.id })
      }
    } catch (e) {
      logger.error('Error llamando Uchat rechazado webhook', {
        leadId: lead.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  if (shouldSendMeta()) {
    await deliverPipelineWhatsApp(lead.id, phone, message, 'rechazado')
  }
}

export function isPreaprobadoStageId(normalizedStageId: string): boolean {
  return normalizedStageId === 'preaprobado'
}

export function isRechazadoStageId(normalizedStageId: string): boolean {
  return ['rechazado', 'cerrado-perdido', 'cerrado_perdido', 'credito-rechazado'].includes(normalizedStageId)
}
