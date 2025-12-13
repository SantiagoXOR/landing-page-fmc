/**
 * Script para diagnosticar leads saltados en fix-leads-origin.js
 * Identifica qué leads fueron saltados y por qué razón
 * 
 * Uso: node scripts/diagnose-skipped-leads.js
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

// Función de detección de canal (debe coincidir con manychat-service.ts)
function detectChannel(subscriber) {
  // Prioridad 1: Instagram
  if (subscriber.instagram_id || subscriber.ig_id || subscriber.ig_username) {
    return 'instagram'
  }

  // Prioridad 2: WhatsApp
  if (subscriber.whatsapp_phone) {
    return 'whatsapp'
  }
  
  if (subscriber.phone && isWhatsAppPhone(subscriber.phone) && !subscriber.page_id) {
    return 'whatsapp'
  }

  // Prioridad 3: Facebook Messenger
  if (subscriber.page_id) {
    return 'facebook'
  }

  if (subscriber.phone && !subscriber.page_id) {
    return 'whatsapp'
  }

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
      const errorText = await response.text()
      return { error: errorText, status: response.status }
    }

    const data = await response.json()
    
    if (data.status === 'success' && data.data) {
      return data.data
    }

    return null
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🔍 Diagnosticando leads saltados...\n')

  try {
    // Obtener todos los leads con manychatId
    let allLeads = []
    let page = 0
    const pageSize = 100
    
    while (true) {
      const { data: leads, error: leadsError } = await supabase
        .from('Lead')
        .select('id, nombre, telefono, manychatId, origen')
        .not('manychatId', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (leadsError) {
        throw new Error(`Error obteniendo leads: ${leadsError.message}`)
      }

      if (!leads || leads.length === 0) {
        break
      }

      allLeads = allLeads.concat(leads)
      
      if (leads.length < pageSize) {
        break
      }
      
      page++
    }

    console.log(`📊 Total de leads con manychatId: ${allLeads.length}\n`)

    const skippedLeads = {
      subscriberNotFound: [],
      unknownOrigin: []
    }

    // Procesar cada lead para identificar los saltados
    for (let i = 0; i < allLeads.length; i++) {
      const lead = allLeads[i]
      
      // Obtener subscriber desde Manychat
      const subscriber = await getSubscriberFromManychat(lead.manychatId)
      
      if (!subscriber || subscriber.error) {
        skippedLeads.subscriberNotFound.push({
          id: lead.id,
          nombre: lead.nombre,
          telefono: lead.telefono,
          manychatId: lead.manychatId,
          origen: lead.origen,
          error: subscriber?.error || 'Subscriber no encontrado',
          status: subscriber?.status
        })
        continue
      }

      // Detectar origen
      const detectedOrigin = detectChannel(subscriber)
      
      if (detectedOrigin === 'unknown') {
        skippedLeads.unknownOrigin.push({
          id: lead.id,
          nombre: lead.nombre,
          telefono: lead.telefono,
          manychatId: lead.manychatId,
          origen: lead.origen,
          subscriberData: {
            hasPhone: !!subscriber.phone,
            hasWhatsAppPhone: !!subscriber.whatsapp_phone,
            hasEmail: !!subscriber.email,
            hasInstagramId: !!subscriber.instagram_id,
            hasIgId: !!subscriber.ig_id,
            hasPageId: !!subscriber.page_id,
            phone: subscriber.phone,
            whatsapp_phone: subscriber.whatsapp_phone,
            email: subscriber.email,
            instagram_id: subscriber.instagram_id,
            ig_id: subscriber.ig_id,
            page_id: subscriber.page_id
          }
        })
      }

      // Pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    // Mostrar resultados
    console.log('\n📋 RESUMEN DE LEADS SALTADOS\n')
    console.log('=' .repeat(60))
    
    console.log(`\n❌ Subscribers no encontrados en ManyChat: ${skippedLeads.subscriberNotFound.length}`)
    if (skippedLeads.subscriberNotFound.length > 0) {
      console.log('\nDetalles:')
      skippedLeads.subscriberNotFound.forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.nombre || 'Sin nombre'} (ID: ${lead.id})`)
        console.log(`   ManyChat ID: ${lead.manychatId}`)
        console.log(`   Teléfono: ${lead.telefono || 'N/A'}`)
        console.log(`   Origen actual: ${lead.origen || 'N/A'}`)
        console.log(`   Error: ${lead.error}`)
        if (lead.status) {
          console.log(`   Status HTTP: ${lead.status}`)
        }
      })
    }

    console.log(`\n⚠️  Origen no detectado (unknown): ${skippedLeads.unknownOrigin.length}`)
    if (skippedLeads.unknownOrigin.length > 0) {
      console.log('\nDetalles:')
      skippedLeads.unknownOrigin.forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.nombre || 'Sin nombre'} (ID: ${lead.id})`)
        console.log(`   ManyChat ID: ${lead.manychatId}`)
        console.log(`   Teléfono: ${lead.telefono || 'N/A'}`)
        console.log(`   Origen actual: ${lead.origen || 'N/A'}`)
        console.log(`   Datos del subscriber:`)
        console.log(`     - Teléfono: ${lead.subscriberData.phone || 'N/A'}`)
        console.log(`     - WhatsApp Phone: ${lead.subscriberData.whatsapp_phone || 'N/A'}`)
        console.log(`     - Email: ${lead.subscriberData.email || 'N/A'}`)
        console.log(`     - Instagram ID: ${lead.subscriberData.instagram_id || lead.subscriberData.ig_id || 'N/A'}`)
        console.log(`     - Page ID: ${lead.subscriberData.page_id || 'N/A'}`)
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log(`\n📊 Total saltados: ${skippedLeads.subscriberNotFound.length + skippedLeads.unknownOrigin.length}`)
    console.log(`   - Subscribers no encontrados: ${skippedLeads.subscriberNotFound.length}`)
    console.log(`   - Origen unknown: ${skippedLeads.unknownOrigin.length}`)

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message)
    process.exit(1)
  }
}

// Ejecutar
main()
  .then(() => {
    console.log('\n✅ Diagnóstico completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })
