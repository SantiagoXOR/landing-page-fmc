/**
 * Script para corregir last_message_at de conversaciones
 * Usa el timestamp del último mensaje real en lugar de last_interaction o fecha actual
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔍 Buscando conversaciones para corregir last_message_at...\n')

  // Obtener todas las conversaciones
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, last_message_at, created_at')
    .order('created_at', { ascending: false })

  if (convError) {
    console.error('❌ Error obteniendo conversaciones:', convError.message)
    process.exit(1)
  }

  console.log(`📊 Total de conversaciones: ${conversations.length}\n`)

  let corrected = 0
  let skipped = 0
  let errors = 0

  for (const conversation of conversations) {
    try {
      // Obtener el último mensaje real de la conversación
      const { data: lastMessage, error: msgError } = await supabase
        .from('messages')
        .select('sent_at')
        .eq('conversation_id', conversation.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      if (msgError && msgError.code !== 'PGRST116') {
        // PGRST116 es "no encontrado", que es válido si no hay mensajes
        console.warn(`  ⚠️  Error obteniendo mensajes para conversación ${conversation.id}:`, msgError.message)
        errors++
        continue
      }

      if (!lastMessage || !lastMessage.sent_at) {
        // No hay mensajes, mantener el last_message_at actual o usar created_at
        const newLastMessageAt = conversation.last_message_at || conversation.created_at
        if (conversation.last_message_at !== newLastMessageAt) {
          await supabase
            .from('conversations')
            .update({ 
              last_message_at: newLastMessageAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id)
          console.log(`  ✅ Conversación ${conversation.id} sin mensajes, usando ${newLastMessageAt}`)
          corrected++
        } else {
          skipped++
        }
        continue
      }

      // Usar el timestamp del último mensaje real
      const correctLastMessageAt = new Date(lastMessage.sent_at).toISOString()
      const currentLastMessageAt = conversation.last_message_at 
        ? new Date(conversation.last_message_at).toISOString()
        : null

      // Comparar fechas (ignorar milisegundos)
      const correctTime = new Date(correctLastMessageAt).getTime()
      const currentTime = currentLastMessageAt 
        ? new Date(currentLastMessageAt).getTime()
        : 0

      // Si la diferencia es mayor a 1 minuto, corregir
      const timeDiff = Math.abs(correctTime - currentTime)
      if (timeDiff > 60000) { // 1 minuto en milisegundos
        await supabase
          .from('conversations')
          .update({ 
            last_message_at: correctLastMessageAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.id)
        
        const oldDate = currentLastMessageAt 
          ? new Date(currentLastMessageAt).toLocaleString('es-AR')
          : 'null'
        const newDate = new Date(correctLastMessageAt).toLocaleString('es-AR')
        console.log(`  ✅ Corregida conversación ${conversation.id}`)
        console.log(`     Antes: ${oldDate}`)
        console.log(`     Ahora: ${newDate}`)
        corrected++
      } else {
        skipped++
      }

      // Pausa para no sobrecargar la base de datos
      await new Promise(resolve => setTimeout(resolve, 50))
    } catch (error) {
      console.error(`  ❌ Error procesando conversación ${conversation.id}:`, error.message)
      errors++
    }
  }

  console.log(`\n📊 Resumen:`)
  console.log(`  ✅ Corregidas: ${corrected}`)
  console.log(`  ⏭️  Saltadas (ya correctas): ${skipped}`)
  console.log(`  ❌ Errores: ${errors}`)
  console.log(`\n✨ Proceso completado`)
}

main().catch(console.error)


