/**
 * Ventana de atención al cliente de Meta (WhatsApp): mensajes de sesión solo si el cliente
 * escribió en las últimas 24 h (según timestamps guardados en el CRM).
 */

/** Duración en ms de la ventana de mensajes libres (texto/media) desde el último inbound del cliente */
export const WHATSAPP_CUSTOMER_CARE_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * @param lastInboundAt - Fecha del último mensaje entrante del cliente en conversaciones WhatsApp del CRM, o null si no hay
 */
export function isOutsideCustomerCareWindow(lastInboundAt: Date | null): boolean {
  if (!lastInboundAt) return true
  return Date.now() - lastInboundAt.getTime() >= WHATSAPP_CUSTOMER_CARE_WINDOW_MS
}

export function isCustomerCareWindowOpen(lastInboundAt: Date | null): boolean {
  return !isOutsideCustomerCareWindow(lastInboundAt)
}

/** Plantilla para reengagement manual desde Chats; si no hay, misma que pipeline. */
export function resolveChatReengagementTemplateName(): string {
  const dedicated = (process.env.WHATSAPP_TEMPLATE_CHAT_REENGAGEMENT || '').trim()
  if (dedicated) return dedicated
  return (process.env.WHATSAPP_TEMPLATE_PIPELINE_NOTIFY || '').trim()
}
