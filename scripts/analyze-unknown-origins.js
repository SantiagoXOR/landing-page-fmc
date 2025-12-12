/**
 * Script para analizar leads con origen "unknown" o "whatsapp" 
 * y determinar si realmente vienen de Facebook o Instagram
 * 
 * Uso: node scripts/analyze-unknown-origins.js
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
 * Detectar origen mejorado con más indicadores
 */
function detectChannelImproved(subscriber) {
  // Prioridad 1: Instagram (campos específicos de Instagram)
  if (subscriber.instagram_id || subscriber.ig_id || subscriber.ig_username) {
    return {
      detected: 'instagram',
      reason: subscriber.instagram_id ? 'instagram_id' : (subscriber.ig_id ? 'ig_id' : 'ig_username')
    }
  }

  // Prioridad 2: Facebook Messenger (si tiene page_id)
  // page_id siempre indica que es de Facebook/Instagram, no WhatsApp
  if (subscriber.page_id) {
    // Si tiene page_id pero no instagram_id, es Facebook Messenger
    return {
      detected: 'facebook',
      reason: 'page_id presente (Facebook Messenger)'
    }
  }

  // Prioridad 3: WhatsApp (si tiene whatsapp_phone específico)
  if (subscriber.whatsapp_phone) {
    return {
      detected: 'whatsapp',
      reason: 'whatsapp_phone presente'
    }
  }

  // Si tiene phone pero NO tiene page_id, probablemente es WhatsApp
  if (subscriber.phone && !subscriber.page_id) {
    return {
      detected: 'whatsapp',
      reason: 'phone sin page_id'
    }
  }

  // Si tiene email pero NO tiene phone ni page_id, probablemente es Facebook
  if (subscriber.email && !subscriber.phone && !subscriber.page_id) {
    return {
      detected: 'facebook',
      reason: 'email sin phone ni page_id'
    }
  }

  return {
    detected: 'unknown',
    reason: 'sin indicadores claros'
  }
}

async function main() {
  console.log('🔍 Analizando leads con origen desconocido o whatsapp...\n')

  // Obtener todos los leads con manychatId
  let allLeads = []
  let page = 0
  const pageSize = 100

  while (true) {
    const { data: leads, error } = await supabase
      .from('Lead')
      .select('id, nombre, manychatId, origen, telefono')
      .not('manychatId', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error obteniendo leads:', error.message)
      break
    }

    if (!leads || leads.length === 0) {
      break
    }

    allLeads = allLeads.concat(leads)
    console.log(`📥 Cargados ${allLeads.length} leads...`)

    if (leads.length < pageSize) {
      break
    }

    page++
  }

  console.log(`\n📊 Total encontrados: ${allLeads.length} leads con manychatId\n`)

  // Analizar cada lead
  const analysis = {
    instagram: [],
    facebook: [],
    whatsapp: [],
    unknown: [],
    errors: []
  }

  for (let i = 0; i < allLeads.length; i++) {
    const lead = allLeads[i]
    console.log(`[${i + 1}/${allLeads.length}] Analizando: ${lead.nombre || 'Sin nombre'} (ID: ${lead.id.substring(0, 8)}...)`)

    const subscriber = await getSubscriberFromManychat(lead.manychatId)

    if (!subscriber) {
      console.log(`  ⚠️  No se pudo obtener subscriber desde Manychat\n`)
      analysis.errors.push({
        leadId: lead.id,
        nombre: lead.nombre,
        manychatId: lead.manychatId,
        origenActual: lead.origen
      })
      await new Promise(resolve => setTimeout(resolve, 150))
      continue
    }

    // Detectar origen mejorado
    const detection = detectChannelImproved(subscriber)

    // Mostrar datos disponibles
    const dataAvailable = {
      page_id: subscriber.page_id || null,
      instagram_id: subscriber.instagram_id || subscriber.ig_id || null,
      ig_username: subscriber.ig_username || null,
      whatsapp_phone: subscriber.whatsapp_phone || null,
      phone: subscriber.phone || null,
      email: subscriber.email || null,
      has_ig_last_interaction: !!subscriber.ig_last_interaction,
      has_ig_last_seen: !!subscriber.ig_last_seen
    }

    console.log(`  📡 Origen actual (CRM): ${lead.origen || 'N/A'}`)
    console.log(`  🔍 Origen detectado: ${detection.detected} (${detection.reason})`)
    console.log(`  📋 Datos disponibles:`, JSON.stringify(dataAvailable, null, 2))

    // Agrupar por origen detectado
    const entry = {
      leadId: lead.id,
      nombre: lead.nombre,
      manychatId: lead.manychatId,
      origenActual: lead.origen,
      origenDetectado: detection.detected,
      razon: detection.reason,
      datos: dataAvailable
    }

    if (detection.detected === 'instagram') {
      analysis.instagram.push(entry)
    } else if (detection.detected === 'facebook') {
      analysis.facebook.push(entry)
    } else if (detection.detected === 'whatsapp') {
      analysis.whatsapp.push(entry)
    } else {
      analysis.unknown.push(entry)
    }

    console.log('')

    await new Promise(resolve => setTimeout(resolve, 150))
  }

  // Mostrar resumen
  console.log('\n' + '='.repeat(80))
  console.log('📈 RESUMEN DEL ANÁLISIS')
  console.log('='.repeat(80))
  console.log(`\n📱 Instagram: ${analysis.instagram.length} leads`)
  console.log(`📘 Facebook: ${analysis.facebook.length} leads`)
  console.log(`💬 WhatsApp: ${analysis.whatsapp.length} leads`)
  console.log(`❓ Unknown: ${analysis.unknown.length} leads`)
  console.log(`❌ Errores: ${analysis.errors.length} leads`)

  // Mostrar ejemplos de cada categoría
  if (analysis.instagram.length > 0) {
    console.log('\n📱 Ejemplos de Instagram:')
    analysis.instagram.slice(0, 3).forEach(entry => {
      console.log(`  - ${entry.nombre}: ${entry.razon}`)
      console.log(`    Datos: ${JSON.stringify(entry.datos)}`)
    })
  }

  if (analysis.facebook.length > 0) {
    console.log('\n📘 Ejemplos de Facebook:')
    analysis.facebook.slice(0, 3).forEach(entry => {
      console.log(`  - ${entry.nombre}: ${entry.razon}`)
      console.log(`    Datos: ${JSON.stringify(entry.datos)}`)
    })
  }

  if (analysis.unknown.length > 0) {
    console.log('\n❓ Ejemplos de Unknown:')
    analysis.unknown.slice(0, 5).forEach(entry => {
      console.log(`  - ${entry.nombre}: ${entry.razon}`)
      console.log(`    Datos: ${JSON.stringify(entry.datos)}`)
    })
  }

  // Guardar análisis en archivo JSON
  const fs = require('fs')
  const analysisFile = 'scripts/origin-analysis.json'
  fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2))
  console.log(`\n💾 Análisis completo guardado en: ${analysisFile}`)
  console.log(`\n✅ Proceso completado`)
}

main().catch(console.error)

