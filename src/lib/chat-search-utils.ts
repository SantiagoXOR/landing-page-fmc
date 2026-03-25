/**
 * Utilidades para búsqueda en chats (leads / mensajes).
 */

/** Evita que % y _ actúen como comodines si el usuario los escribe en la búsqueda */
export function sanitizeIlikeTerm(term: string): string {
  return term.replace(/%/g, '').replace(/_/g, '').trim()
}

/** Construye las cláusulas OR de PostgREST para Lead (nombre + teléfono, incl. solo dígitos) */
export function buildLeadSearchOrParts(searchRaw: string): string[] {
  const safe = sanitizeIlikeTerm(searchRaw).slice(0, 200)
  const digitsOnly = searchRaw.replace(/\D/g, '')
  const orParts: string[] = []
  if (safe.length > 0) {
    orParts.push(`nombre.ilike.%${safe}%`)
    orParts.push(`telefono.ilike.%${safe}%`)
  }
  if (digitsOnly.length >= 5) {
    orParts.push(`telefono.ilike.%${digitsOnly}%`)
  }
  return orParts
}

/** Patrón para ilike sobre mensajes (contenido) */
export function buildMessageContentSearchPattern(searchRaw: string): string {
  const safe = sanitizeIlikeTerm(searchRaw).slice(0, 200)
  return safe.length > 0 ? safe : searchRaw.slice(0, 200)
}

/**
 * Patrón para coincidir conversations.platform_id en WhatsApp (suele ser el teléfono).
 * Solo si hay ≥ 5 dígitos, para no hacer ilike amplio sobre IDs cortos.
 */
export function buildWhatsAppPlatformIdSearchPattern(searchRaw: string): string | null {
  const digitsOnly = searchRaw.replace(/\D/g, '')
  if (digitsOnly.length >= 5) {
    return digitsOnly.slice(0, 20)
  }
  return null
}
