/**
 * Script para sincronizar mensajes faltantes en conversaciones sin mensajes
 * Obtiene el último mensaje conocido (last_input_text) desde ManyChat y lo sincroniza
 * 
 * Uso: node scripts/sync-missing-messages.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Obtener subscriber desde Manychat API
 */
async function getSubscriberFromManychat(manychatId) {
  try {
    const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY
    
    if (!MANYCHAT_API_KEY) {
      return null
    }

    const response = await fetch(`https://api.manychat.com/fb/subscriber/getInfo?subscriber_id=${manychatId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data.status === 'success' && data.data) {
      return data.data
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * Detectar plataforma desde subscriber
 */
function detectChannel(subscriber) {
  // Prioridad 1: Instagram
  if (subscriber.instagram_id || subscriber.ig_id || subscriber.ig_username) {
    return 'instagram'
  }

  // Prioridad 2: WhatsApp (solo si NO tiene page_id)
  if (!subscriber.page_id && (subscriber.whatsapp_phone || (subscriber.phone && isWhatsAppPhone(subscriber.phone)))) {
    return 'whatsapp'
  }

  // Prioridad 3: Facebook Messenger (si tiene page_id)
  if (subscriber.page_id) {
    return 'facebook'
  }

  // Si solo tiene teléfono pero no tiene page_id, asumir WhatsApp
  if (subscriber.phone && !subscriber.page_id) {
    return 'whatsapp'
  }

  // Si solo tiene email, asumir Facebook Messenger
  if (subscriber.email) {
    return 'facebook'
  }

  return 'unknown'
}

function isWhatsAppPhone(phone) {
  const whatsappPhoneRegex = /^\+[1-9]\d{1,14}$/
  return whatsappPhoneRegex.test(phone)
}

/**
 * Sincronizar último mensaje para una conversación
 */
async function syncLastMessage(conversationId, leadId, subscriber) {
  try {
    // Verificar si el subscriber tiene last_input_text
    if (!subscriber.last_input_text) {
      return { success: false, reason: 'No tiene last_input_text' }
    }

    // Verificar si ya existe un mensaje con este contenido
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id, content')
      .eq('conversation_id', conversationId)
      .eq('content', subscriber.last_input_text)
      .limit(1)

    if (existingMessages && existingMessages.length > 0) {
      return { success: false, reason: 'Mensaje ya existe' }
    }

    // Determinar plataforma
    const detectedChannel = detectChannel(subscriber)
    const platform = detectedChannel === 'instagram' ? 'instagram' :
                     detectedChannel === 'facebook' ? 'facebook' :
                     'whatsapp'

    // Crear mensaje
    const timestamp = subscriber.last_interaction 
      ? new Date(subscriber.last_interaction).toISOString()
      : new Date().toISOString()

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        direction: 'inbound',
        content: subscriber.last_input_text,
        message_type: 'text',
        sent_at: timestamp,
        platform_msg_id: `manychat_last_${subscriber.id}_${Date.now()}`
      })
      .select('id')
      .single()

    if (messageError) {
      console.error(`Error creando mensaje:`, messageError.message)
      return { success: false, error: messageError.message }
    }

    // Actualizar última actividad de la conversación
    await supabase
      .from('conversations')
      .update({
        last_message_at: timestamp,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    return { success: true, messageId: message.id }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🔍 Iniciando sincronización de mensajes faltantes...\n')

  let total = 0
  let synced = 0
  let skipped = 0
  let errors = 0

  // Obtener todas las conversaciones sin mensajes
  let page = 0
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    // Obtener conversaciones sin mensajes usando una subconsulta
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        platform,
        platform_id,
        lead_id,
        lead:Lead(id, manychatId, nombre)
      `)
      .not('lead_id', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error obteniendo conversaciones:', error.message)
      break
    }

    if (!conversations || conversations.length === 0) {
      hasMore = false
      break
    }

    console.log(`📄 Procesando página ${page + 1} (${conversations.length} conversaciones)...`)

    for (const conversation of conversations) {
      total++

      // Verificar si tiene mensajes
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)

      if (messageCount > 0) {
        // Ya tiene mensajes, saltar
        skipped++
        continue
      }

      // Si no tiene lead o manychatId, saltar
      if (!conversation.lead || !conversation.lead.manychatId) {
        console.log(`  ⚠️  Conversación ${conversation.id} sin lead o manychatId, saltando...`)
        skipped++
        await new Promise(resolve => setTimeout(resolve, 50))
        continue
      }

      // Obtener subscriber desde ManyChat
      const subscriber = await getSubscriberFromManychat(conversation.lead.manychatId)

      if (!subscriber) {
        console.log(`  ⚠️  No se pudo obtener subscriber para conversación ${conversation.id}, saltando...`)
        skipped++
        await new Promise(resolve => setTimeout(resolve, 150))
        continue
      }

      // Sincronizar último mensaje
      const result = await syncLastMessage(
        conversation.id,
        conversation.lead_id,
        subscriber
      )

      if (result.success) {
        synced++
        console.log(`  ✅ Mensaje sincronizado para conversación ${conversation.id} (${conversation.lead.nombre || 'Sin nombre'})\n`)
      } else if (result.reason === 'No tiene last_input_text') {
        skipped++
        console.log(`  ⏭️  No tiene last_input_text: ${conversation.id}\n`)
      } else if (result.reason === 'Mensaje ya existe') {
        skipped++
        console.log(`  ⏭️  Mensaje ya existe: ${conversation.id}\n`)
      } else {
        errors++
        console.log(`  ❌ Error sincronizando: ${conversation.id} - ${result.error || result.reason}\n`)
      }

      await new Promise(resolve => setTimeout(resolve, 150)) // Pausa para no sobrecargar la API
    }

    if (conversations.length < pageSize) {
      hasMore = false
    } else {
      page++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN')
  console.log('='.repeat(60))
  console.log(`Total procesadas: ${total}`)
  console.log(`✅ Mensajes sincronizados: ${synced}`)
  console.log(`⏭️  Saltadas: ${skipped}`)
  console.log(`❌ Errores: ${errors}`)
  console.log('='.repeat(60))
}

main().catch(console.error)

