/**
 * Script para verificar y probar el envío de mensajes preaprobados a Instagram
 * 
 * Este script ayuda a:
 * 1. Encontrar leads de Instagram con manychatId válido
 * 2. Verificar que el subscriber en ManyChat tiene campos de Instagram
 * 3. Probar el envío de mensaje manualmente
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!MANYCHAT_API_KEY) {
  console.error('❌ Falta variable de entorno MANYCHAT_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Obtener subscriber de ManyChat
 */
async function getManychatSubscriber(subscriberId) {
  try {
    // ManyChat API usa GET con query params para getInfo
    const url = new URL(`https://api.manychat.com/fb/subscriber/getInfo`)
    url.searchParams.append('subscriber_id', String(subscriberId))
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ManyChat API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // ManyChat devuelve { status: 'success', data: {...} } o { status: 'error', ... }
    if (data.status === 'success' && data.data) {
      return data.data
    }
    
    if (data.status === 'error') {
      throw new Error(data.message || data.error || 'Error desconocido de ManyChat')
    }
    
    return null
  } catch (error) {
    console.error(`Error obteniendo subscriber ${subscriberId}:`, error.message)
    return null
  }
}

/**
 * Detectar canal del subscriber
 */
function detectChannel(subscriber) {
  // Prioridad 1: Instagram
  if (subscriber.instagram_id || subscriber.ig_id || subscriber.ig_username) {
    return 'instagram'
  }

  // Prioridad 2: WhatsApp
  if (subscriber.whatsapp_phone) {
    return 'whatsapp'
  }

  // Prioridad 3: Facebook Messenger
  if (subscriber.page_id) {
    return 'facebook'
  }

  return 'unknown'
}

/**
 * Enviar mensaje de prueba
 */
async function sendTestMessage(subscriberId, message) {
  try {
    const response = await fetch(`https://api.manychat.com/fb/sending/sendContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        data: {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: message
              }
            ]
          }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ManyChat API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.status === 'success'
  } catch (error) {
    console.error(`Error enviando mensaje:`, error.message)
    return false
  }
}

/**
 * Buscar leads de Instagram
 */
async function findInstagramLeads() {
  console.log('🔍 Buscando leads de Instagram...\n')

  // Buscar leads con origen Instagram y manychatId
  const { data: leads, error } = await supabase
    .from('Lead')
    .select('id, nombre, telefono, email, origen, estado, manychatId')
    .eq('origen', 'instagram')
    .not('manychatId', 'is', null)
    .limit(20)

  if (error) {
    console.error('❌ Error buscando leads:', error.message)
    return []
  }

  if (!leads || leads.length === 0) {
    console.log('⚠️  No se encontraron leads de Instagram con manychatId\n')
    return []
  }

  console.log(`✅ Encontrados ${leads.length} leads de Instagram con manychatId\n`)
  return leads
}

/**
 * Verificar lead y subscriber
 */
async function verifyLead(lead) {
  console.log(`\n📋 Verificando lead: ${lead.nombre || 'Sin nombre'}`)
  console.log(`   ID: ${lead.id}`)
  console.log(`   Estado: ${lead.estado}`)
  console.log(`   ManyChat ID: ${lead.manychatId}`)

  // Convertir manychatId a número
  const manychatIdNumber = typeof lead.manychatId === 'string' 
    ? parseInt(lead.manychatId, 10) 
    : lead.manychatId

  if (!manychatIdNumber || isNaN(manychatIdNumber) || manychatIdNumber <= 0) {
    console.log('   ❌ manychatId inválido')
    return { valid: false, reason: 'manychatId inválido' }
  }

  // Obtener subscriber de ManyChat
  console.log('   🔄 Obteniendo información del subscriber desde ManyChat...')
  const subscriber = await getManychatSubscriber(manychatIdNumber)

  if (!subscriber) {
    console.log('   ❌ No se pudo obtener subscriber de ManyChat')
    return { valid: false, reason: 'Subscriber no encontrado en ManyChat' }
  }

  // Detectar canal
  const channel = detectChannel(subscriber)
  console.log(`   📱 Canal detectado: ${channel}`)

  // Verificar campos de Instagram
  const hasInstagramId = !!(subscriber.instagram_id || subscriber.ig_id || subscriber.ig_username)
  console.log(`   ${hasInstagramId ? '✅' : '❌'} Campos de Instagram: ${hasInstagramId ? 'Sí' : 'No'}`)
  
  if (subscriber.instagram_id) console.log(`      - instagram_id: ${subscriber.instagram_id}`)
  if (subscriber.ig_id) console.log(`      - ig_id: ${subscriber.ig_id}`)
  if (subscriber.ig_username) console.log(`      - ig_username: ${subscriber.ig_username}`)

  // Verificar estado
  const isPreaprobado = lead.estado === 'PREAPROBADO'
  console.log(`   ${isPreaprobado ? '✅' : '⚠️ '} Estado: ${lead.estado} ${isPreaprobado ? '(ya es PREAPROBADO)' : '(necesita cambiar a PREAPROBADO)'}`)

  return {
    valid: channel === 'instagram' && hasInstagramId,
    channel,
    hasInstagramId,
    isPreaprobado,
    subscriber,
    manychatId: manychatIdNumber,
    leadId: lead.id
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🧪 Script de Prueba: Envío de Mensajes Preaprobados a Instagram\n')
  console.log('=' .repeat(60))

  // Buscar leads de Instagram
  const leads = await findInstagramLeads()

  if (leads.length === 0) {
    console.log('\n💡 Sugerencias:')
    console.log('   1. Verifica que hay leads con origen="instagram" en la base de datos')
    console.log('   2. Verifica que esos leads tienen manychatId asignado')
    console.log('   3. Puedes sincronizar leads desde ManyChat usando los scripts de sincronización')
    return
  }

  // Verificar cada lead
  const validLeads = []
  for (const lead of leads) {
    const verification = await verifyLead(lead)
    if (verification.valid) {
      validLeads.push({ lead, verification })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Resumen:`)
  console.log(`   Total leads encontrados: ${leads.length}`)
  console.log(`   Leads válidos para prueba: ${validLeads.length}`)

  if (validLeads.length === 0) {
    console.log('\n⚠️  No se encontraron leads válidos para probar')
    console.log('\n💡 Requisitos para que un lead sea válido:')
    console.log('   1. Debe tener origen="instagram"')
    console.log('   2. Debe tener manychatId válido')
    console.log('   3. El subscriber en ManyChat debe tener campos de Instagram')
    return
  }

  // Mostrar leads válidos
  console.log('\n✅ Leads válidos para prueba:\n')
  validLeads.forEach(({ lead, verification }, index) => {
    console.log(`${index + 1}. ${lead.nombre || 'Sin nombre'}`)
    console.log(`   - Lead ID: ${lead.id}`)
    console.log(`   - Estado actual: ${lead.estado}`)
    console.log(`   - ManyChat ID: ${verification.manychatId}`)
    console.log(`   - Canal: ${verification.channel}`)
    if (verification.isPreaprobado) {
      console.log(`   - ⚠️  Ya está en PREAPROBADO (el mensaje debería haberse enviado automáticamente)`)
    } else {
      console.log(`   - ✅ Listo para probar (cambiar a PREAPROBADO en el CRM)`)
    }
    console.log('')
  })

  // Opción de prueba manual
  if (validLeads.length > 0 && !validLeads[0].verification.isPreaprobado) {
    console.log('\n' + '='.repeat(60))
    console.log('\n📝 INSTRUCCIONES PARA PROBAR:\n')
    console.log('1. Abre el CRM en tu navegador')
    console.log('2. Ve a la sección de Leads o Pipeline')
    console.log(`3. Busca el lead: "${validLeads[0].lead.nombre || validLeads[0].lead.id}"`)
    console.log('4. Cambia el estado del lead a "PREAPROBADO"')
    console.log('5. Esto disparará automáticamente el envío del mensaje a Instagram')
    console.log('\n📊 Para verificar el envío:')
    console.log('   - Revisa los logs del servidor')
    console.log('   - Busca: "Detectado Instagram + credito-preaprobado, enviando mensaje directo"')
    console.log('   - Busca: "Mensaje de preaprobado enviado exitosamente a Instagram"')
    console.log('   - Verifica en ManyChat que el mensaje aparece en el historial')
    console.log('   - Verifica en Instagram que el usuario recibió el mensaje')
  }

  // Opción de envío manual de prueba (solo si el usuario lo solicita)
  const args = process.argv.slice(2)
  if (args.includes('--send-test') && validLeads.length > 0) {
    const testLead = validLeads[0]
    console.log('\n' + '='.repeat(60))
    console.log('\n🧪 Enviando mensaje de prueba manual...\n')
    
    const testMessage = `🧪 MENSAJE DE PRUEBA: ¡Hola! 🎉 Tu crédito ya está preaprobado. ¡Visítanos en la concesionaria más cercana! 🚗✨\nhttps://www.formosafmc.com.ar/concesionarias`
    
    console.log(`Enviando a ManyChat ID: ${testLead.verification.manychatId}`)
    console.log(`Mensaje: ${testMessage}\n`)
    
    const sent = await sendTestMessage(testLead.verification.manychatId, testMessage)
    
    if (sent) {
      console.log('✅ Mensaje enviado exitosamente!')
      console.log('   Verifica en ManyChat y Instagram que el mensaje llegó')
    } else {
      console.log('❌ No se pudo enviar el mensaje')
      console.log('   Revisa los logs para más detalles')
    }
  }
}

// Ejecutar
main().catch(console.error)
