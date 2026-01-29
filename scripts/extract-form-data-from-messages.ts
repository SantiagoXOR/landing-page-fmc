/**
 * Script para extraer datos de mensajes "Solicitud de Crédito" y actualizar customFields de cada lead.
 * Usa el mismo parser que el webhook (form-message-parser).
 *
 * Uso:
 *   npx tsx scripts/extract-form-data-from-messages.ts
 *
 * Opciones:
 *   --dry-run   Solo mostrar qué leads se actualizarían sin hacer cambios
 *   --limit N   Procesar como máximo N mensajes que coincidan (útil para pruebas)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { parseFormMessage, updateLeadFromParsedForm } from '../src/lib/form-message-parser'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const limitArg = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1], 10) : null
const limit = limitArg && !isNaN(limitArg) ? limitArg : null

async function main() {
  console.log('Buscando mensajes con "Solicitud de Crédito"...')
  if (isDryRun) console.log('(modo --dry-run: no se aplicarán cambios)')
  if (limit) console.log(`(límite: ${limit} mensajes)`)

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, content, conversation_id, sent_at')
    .ilike('content', '%Solicitud de Crédito%')
    .order('sent_at', { ascending: false })
    .limit(limit ?? 5000)

  if (messagesError) {
    console.error('❌ Error obteniendo mensajes:', messagesError.message)
    process.exit(1)
  }

  if (!messages?.length) {
    console.log('No se encontraron mensajes con "Solicitud de Crédito".')
    return
  }

  const conversationIds = [...new Set(messages.map((m) => m.conversation_id).filter(Boolean))] as string[]

  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, lead_id')
    .in('id', conversationIds)

  if (convError) {
    console.error('❌ Error obteniendo conversaciones:', convError.message)
    process.exit(1)
  }

  const convToLead = new Map<string, string>()
  for (const c of conversations ?? []) {
    if (c.lead_id) convToLead.set(c.id, c.lead_id)
  }

  const leadToMessage: Record<string, { content: string; sent_at: string }> = {}
  for (const m of messages) {
    const leadId = convToLead.get(m.conversation_id)
    if (!leadId) continue
    const existing = leadToMessage[leadId]
    const sentAt = m.sent_at ?? ''
    if (!existing || (sentAt && new Date(sentAt) > new Date(existing.sent_at))) {
      leadToMessage[leadId] = { content: m.content ?? '', sent_at: sentAt }
    }
  }

  const leadIds = Object.keys(leadToMessage)
  console.log(`Mensajes encontrados: ${messages.length}, conversaciones: ${conversationIds.length}, leads únicos: ${leadIds.length}`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const leadId of leadIds) {
    const { content } = leadToMessage[leadId]
    const parsed = parseFormMessage(content)
    if (!parsed) {
      skipped++
      continue
    }
    if (isDryRun) {
      console.log(`[dry-run] Lead ${leadId}:`, Object.keys(parsed).filter((k) => (parsed as Record<string, unknown>)[k] != null))
      updated++
      continue
    }
    try {
      await updateLeadFromParsedForm(leadId, parsed, supabase)
      updated++
    } catch (err: unknown) {
      failed++
      console.warn(`Error actualizando lead ${leadId}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`Listo. Actualizados: ${updated}, omitidos (sin datos): ${skipped}, errores: ${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
