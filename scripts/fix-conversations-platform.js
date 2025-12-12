/**
 * Script para corregir la plataforma de las conversaciones existentes
 * Detecta automáticamente la plataforma correcta (Facebook, Instagram, WhatsApp) 
 * basado en los datos del subscriber en Manychat
 * 
 * Actualiza el campo "platform" en la tabla conversations
 * 
 * Uso: node scripts/fix-conversations-platform.js
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

// Función detectChannel (debe coincidir con manychat-service.ts)
function detectChannel(subscriber) {
  // Prioridad 1: Instagram (campos específicos de Instagram)
  if (subscriber.instagram_id || subscriber.ig_id || subscriber.ig_username) {
    return 'instagram'
  }

  // Prioridad 2: WhatsApp (si tiene whatsapp_phone o phone con formato E.164)
  // Pero solo si NO tiene page_id (que indicaría Facebook Messenger)
  if (!subscriber.page_id && (subscriber.whatsapp_phone || (subscriber.phone && isWhatsAppPhone(subscriber.phone)))) {
    return 'whatsapp'
  }

  // Prioridad 3: Facebook Messenger (si tiene page_id)
  // Si tiene page_id, es Facebook Messenger, incluso si tiene teléfono
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
 * Actualizar plataforma de una conversación
 * Si ya existe una conversación con la nueva plataforma y el mismo platform_id,
 * elimina la conversación antigua y mantiene la nueva
 */
async function updateConversationPlatform(conversationId, newPlatform, platformId) {
  try {
    // Primero verificar si ya existe una conversación con la nueva plataforma y el mismo platform_id
    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('id, lead_id, last_message_at')
      .eq('platform', newPlatform)
      .eq('platform_id', platformId)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      // Error diferente a "no encontrado"
      console.error(`Error buscando conversación existente:`, findError.message)
      return false
    }

    if (existingConversation) {
      // Ya existe una conversación con la nueva plataforma
      // Verificar cuál tiene más mensajes o es más reciente
      const { data: oldConv, error: oldError } = await supabase
        .from('conversations')
        .select('id, last_message_at, lead_id')
        .eq('id', conversationId)
        .single()

      if (oldError) {
        console.error(`Error obteniendo conversación antigua:`, oldError.message)
        return false
      }

      // Obtener conteo de mensajes de ambas conversaciones
      const { count: oldCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)

      const { count: newCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', existingConversation.id)

      // Si la conversación antigua tiene más mensajes o es más reciente, eliminar la nueva
      // Si la nueva tiene más mensajes, eliminar la antigua
      if ((oldCount || 0) > (newCount || 0) || 
          (oldConv?.last_message_at && existingConversation.last_message_at && 
           new Date(oldConv.last_message_at) > new Date(existingConversation.last_message_at))) {
        // Eliminar la conversación nueva y actualizar la antigua
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', existingConversation.id)

        if (deleteError) {
          console.error(`Error eliminando conversación duplicada:`, deleteError.message)
          return false
        }

        // Actualizar la conversación antigua con la nueva plataforma
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            platform: newPlatform,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId)

        if (updateError) {
          console.error(`Error actualizando conversación ${conversationId}:`, updateError.message)
          return false
        }

        return true
      } else {
        // La nueva conversación es mejor, eliminar la antigua
        // Primero mover los mensajes de la antigua a la nueva si es necesario
        const { error: updateMessagesError } = await supabase
          .from('messages')
          .update({ conversation_id: existingConversation.id })
          .eq('conversation_id', conversationId)

        if (updateMessagesError) {
          console.error(`Error moviendo mensajes:`, updateMessagesError.message)
        }

        // Actualizar lead_id si la nueva no lo tiene
        if (!existingConversation.lead_id && oldConv?.lead_id) {
          await supabase
            .from('conversations')
            .update({ lead_id: oldConv.lead_id })
            .eq('id', existingConversation.id)
        }

        // Eliminar la conversación antigua
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversationId)

        if (deleteError) {
          console.error(`Error eliminando conversación antigua:`, deleteError.message)
          return false
        }

        return true
      }
    } else {
      // No existe conversación con la nueva plataforma, actualizar directamente
      const { error } = await supabase
        .from('conversations')
        .update({
          platform: newPlatform,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) {
        console.error(`Error actualizando conversación ${conversationId}:`, error.message)
        return false
      }

      return true
    }
  } catch (error) {
    console.error(`Error en updateConversationPlatform para ${conversationId}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🔍 Iniciando corrección de plataformas en conversaciones...\n')

  let total = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  // Obtener todas las conversaciones con sus leads
  let page = 0
  const pageSize = 100
  let hasMore = true

  while (hasMore) {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        id,
        platform,
        lead_id,
        lead:Lead(id, manychatId, origen)
      `)
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

      // Si no tiene lead asociado, saltar
      if (!conversation.lead || !conversation.lead.manychatId) {
        console.log(`  ⚠️  Conversación ${conversation.id} sin lead o manychatId, saltando...`)
        skipped++
        await new Promise(resolve => setTimeout(resolve, 50))
        continue
      }

      // Obtener subscriber desde ManyChat
      const subscriber = await getSubscriberFromManychat(conversation.lead.manychatId)

      if (!subscriber) {
        console.log(`  ⚠️  No se pudo obtener subscriber desde Manychat para conversación ${conversation.id}, saltando...`)
        skipped++
        await new Promise(resolve => setTimeout(resolve, 150))
        continue
      }

      // Detectar plataforma correcta
      const detectedPlatform = detectChannel(subscriber)

      if (detectedPlatform === 'unknown') {
        console.log(`  ⚠️  No se pudo detectar plataforma para conversación ${conversation.id}, saltando...`)
        skipped++
        await new Promise(resolve => setTimeout(resolve, 150))
        continue
      }

      // Si la plataforma es diferente, actualizar
      if (detectedPlatform !== conversation.platform) {
        // Obtener platform_id de la conversación
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('platform_id')
          .eq('id', conversation.id)
          .single()

        if (convError || !convData) {
          console.log(`  ⚠️  No se pudo obtener platform_id para conversación ${conversation.id}, saltando...`)
          skipped++
          await new Promise(resolve => setTimeout(resolve, 50))
          continue
        }

        console.log(`  🔄 Conversación ${conversation.id}: ${conversation.platform} → ${detectedPlatform}`)
        
        const success = await updateConversationPlatform(conversation.id, detectedPlatform, convData.platform_id)

        if (success) {
          updated++
          console.log(`  ✅ Actualizada a: ${detectedPlatform}\n`)
        } else {
          errors++
          console.log(`  ❌ Error al actualizar\n`)
        }
      } else {
        console.log(`  ✓ Ya tiene la plataforma correcta: ${conversation.platform}\n`)
        skipped++
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
  console.log(`✅ Actualizadas: ${updated}`)
  console.log(`⏭️  Saltadas: ${skipped}`)
  console.log(`❌ Errores: ${errors}`)
  console.log('='.repeat(60))
}

main().catch(console.error)

