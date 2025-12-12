/**
 * Script para corregir el origen de los leads sincronizados desde Manychat
 * Detecta automáticamente el origen correcto (Facebook, Instagram, WhatsApp) 
 * basado en los datos del subscriber en Manychat
 * 
 * Actualiza tanto el campo "origen" en el CRM como el custom field "origen" en ManyChat
 * 
 * Uso: node scripts/fix-leads-origin.js
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

// Importar ManychatService (necesitamos la función detectChannel)
// Como estamos en Node.js, necesitamos usar una versión simplificada
function detectChannel(subscriber) {
  // Prioridad 1: WhatsApp (si tiene whatsapp_phone o phone con formato E.164)
  if (subscriber.whatsapp_phone || (subscriber.phone && isWhatsAppPhone(subscriber.phone))) {
    return 'whatsapp'
  }

  // Prioridad 2: Instagram (si tiene instagram_id)
  if (subscriber.instagram_id) {
    return 'instagram'
  }

  // Prioridad 3: Facebook Messenger (si tiene email o está asociado a página de Facebook)
  if (subscriber.page_id && subscriber.email) {
    return 'facebook'
  }

  // Si solo tiene teléfono pero no está en formato WhatsApp, asumir WhatsApp
  if (subscriber.phone) {
    return 'whatsapp'
  }

  // Si solo tiene email, asumir Facebook Messenger
  if (subscriber.email) {
    return 'facebook'
  }

  return 'unknown'
}

function isWhatsAppPhone(phone) {
  // Formato E.164: +[código país][número] (máximo 15 dígitos)
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
      console.error('❌ Faltan variables de entorno MANYCHAT_API_KEY')
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
      console.error(`Error obteniendo subscriber ${manychatId}:`, response.status, errorText)
      return null
    }

    const data = await response.json()
    
    if (data.status === 'success' && data.data) {
      return data.data
    }

    return null
  } catch (error) {
    console.error(`Error en getSubscriberFromManychat para ${manychatId}:`, error.message)
    return null
  }
}

// Cache para el field_id del custom field "origen"
let origenFieldId = null

/**
 * Obtener el ID del custom field "origen" de ManyChat
 */
async function getOrigenFieldId() {
  if (origenFieldId) {
    return origenFieldId
  }

  try {
    const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY
    
    if (!MANYCHAT_API_KEY) {
      return null
    }

    const response = await fetch('https://api.manychat.com/fb/page/getCustomFields', {
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
    
    if (data.status !== 'success' || !data.data) {
      return null
    }
    
    // ManyChat devuelve los fields directamente en data.data como array
    const fields = Array.isArray(data.data) ? data.data : []
    
    const origenField = fields.find((f) => f.name === 'origen')
    if (origenField) {
      origenFieldId = origenField.id
      return origenFieldId
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * Actualizar custom field "origen" en ManyChat
 */
async function updateManyChatOrigin(manychatId, newOrigin) {
  try {
    const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY
    
    if (!MANYCHAT_API_KEY) {
      console.error('❌ Faltan variables de entorno MANYCHAT_API_KEY')
      return false
    }

    // Obtener el field_id del custom field "origen"
    const fieldId = await getOrigenFieldId()
    
    if (!fieldId) {
      // El campo no existe en ManyChat, no es crítico
      return false
    }

    // Actualizar el custom field usando field_id (ManyChat requiere field_id)
    const response = await fetch('https://api.manychat.com/fb/subscriber/setCustomField', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id: String(manychatId),
        field_id: fieldId,
        field_value: newOrigin
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      // Si el error es que el campo no existe, no es crítico
      if (errorText.includes('not found') || errorText.includes('does not exist')) {
        return false
      }
      console.error(`Error actualizando origen en ManyChat para ${manychatId}:`, response.status, errorText)
      return false
    }

    const data = await response.json()
    return data.status === 'success'
  } catch (error) {
    console.error(`Error en updateManyChatOrigin para ${manychatId}:`, error.message)
    return false
  }
}

/**
 * Actualizar origen de un lead en el CRM
 */
async function updateLeadOrigin(leadId, newOrigin) {
  try {
    const { error } = await supabase
      .from('Lead')
      .update({ 
        origen: newOrigin,
        updatedAt: new Date().toISOString()
      })
      .eq('id', leadId)

    if (error) {
      console.error(`Error actualizando lead ${leadId}:`, error.message)
      return false
    }

    return true
  } catch (error) {
    console.error(`Error en updateLeadOrigin para ${leadId}:`, error.message)
    return false
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🔍 Iniciando corrección de orígenes de leads...\n')

  try {
    // Obtener todos los leads con manychatId (procesar en lotes)
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
      console.log(`📥 Cargados ${allLeads.length} leads...`)
      
      if (leads.length < pageSize) {
        break // Última página
      }
      
      page++
    }

    if (allLeads.length === 0) {
      console.log('✅ No hay leads con manychatId para actualizar')
      return
    }

    console.log(`📊 Total encontrados: ${allLeads.length} leads con manychatId\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    // Procesar cada lead
    for (let i = 0; i < allLeads.length; i++) {
      const lead = allLeads[i]
      
      console.log(`[${i + 1}/${allLeads.length}] Procesando: ${lead.nombre} (ID: ${lead.id})`)

      // Obtener subscriber desde Manychat
      const subscriber = await getSubscriberFromManychat(lead.manychatId)
      
      if (!subscriber) {
        console.log(`  ⚠️  No se pudo obtener subscriber desde Manychat, saltando...`)
        skipped++
        continue
      }

      // Detectar origen correcto
      const detectedOrigin = detectChannel(subscriber)
      
      console.log(`  📡 Origen actual (CRM): ${lead.origen || 'N/A'}`)
      console.log(`  🔍 Origen detectado: ${detectedOrigin}`)

      // Si el origen es diferente o es 'unknown', actualizar
      if (detectedOrigin !== 'unknown') {
        let crmUpdated = false
        let manychatUpdated = false
        
        // Actualizar en CRM si es diferente
        if (detectedOrigin !== lead.origen) {
          crmUpdated = await updateLeadOrigin(lead.id, detectedOrigin)
          if (crmUpdated) {
            console.log(`  ✅ Origen actualizado en CRM: ${detectedOrigin}`)
          } else {
            console.log(`  ⚠️  Error actualizando origen en CRM`)
          }
        } else {
          crmUpdated = true // Ya está correcto
        }
        
        // Siempre actualizar en ManyChat para asegurar que el custom field esté sincronizado
        manychatUpdated = await updateManyChatOrigin(lead.manychatId, detectedOrigin)
        if (manychatUpdated) {
          console.log(`  ✅ Origen actualizado en ManyChat: ${detectedOrigin}`)
        } else {
          console.log(`  ⚠️  Error o campo no existe en ManyChat`)
        }
        
        if (crmUpdated || manychatUpdated) {
          updated++
          console.log(`  ✅ Procesado correctamente\n`)
        } else {
          errors++
          console.log(`  ❌ Error al actualizar\n`)
        }
      } else {
        console.log(`  ⚠️  No se pudo detectar origen (unknown), saltando...\n`)
        skipped++
      }

      // Pausa para no sobrecargar la API de ManyChat (rate limit: 100 req/s)
      // Usamos 150ms para estar seguros
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    console.log('\n📈 Resumen:')
    console.log(`  ✅ Actualizados: ${updated}`)
    console.log(`  ⏭️  Saltados: ${skipped}`)
    console.log(`  ❌ Errores: ${errors}`)
    console.log(`  📊 Total procesados: ${allLeads.length}`)

  } catch (error) {
    console.error('❌ Error en main:', error.message)
    process.exit(1)
  }
}

// Ejecutar
main()
  .then(() => {
    console.log('\n✅ Proceso completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })




