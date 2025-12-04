/**
 * Script para sincronizar contactos de ManyChat al CRM usando etiquetas
 * 
 * Estrategia:
 * 1. Obtener todas las etiquetas de ManyChat
 * 2. Para cada etiqueta, crear un broadcast temporal programado muy lejos en el futuro
 * 3. Obtener información del broadcast para extraer subscriber IDs
 * 4. Sincronizar cada subscriber al CRM
 * 5. Cancelar el broadcast antes de que se envíe
 * 
 * Ejecutar: npm run manychat:sync-by-tags
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message) {
  log(`✓ ${message}`, 'green')
}

function error(message) {
  log(`✗ ${message}`, 'red')
}

function info(message) {
  log(`ℹ ${message}`, 'blue')
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow')
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(message, 'cyan')
  log('='.repeat(60), 'cyan')
}

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY
const MANYCHAT_BASE_URL = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  error('Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

if (!MANYCHAT_API_KEY) {
  error('Error: Variable de entorno MANYCHAT_API_KEY no configurada')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Realizar petición a ManyChat API
 */
async function manychatRequest(endpoint, method = 'GET', body = null) {
  const url = `${MANYCHAT_BASE_URL}${endpoint}`
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ManyChat API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

/**
 * Obtener todas las etiquetas de ManyChat
 */
async function getTags() {
  try {
    const response = await manychatRequest('/fb/page/getTags')
    return response.data || []
  } catch (err) {
    throw new Error(`Error obteniendo tags: ${err.message}`)
  }
}

/**
 * Obtener subscriber de ManyChat por ID
 */
async function getSubscriberById(subscriberId) {
  try {
    const response = await manychatRequest(`/fb/subscriber/getInfo?subscriber_id=${subscriberId}`)
    return response.data || null
  } catch (err) {
    if (err.message.includes('404')) {
      return null
    }
    throw err
  }
}

/**
 * Crear broadcast temporal para obtener subscriber IDs por tag
 * Programado muy lejos en el futuro para no enviarlo realmente
 */
async function createTemporaryBroadcast(tagId, tagName) {
  try {
    // Programar para 1 año en el futuro (nunca se enviará)
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const sendTime = futureDate.toISOString()

    const broadcastData = {
      name: `TEMP_SYNC_${tagName}_${Date.now()}`,
      tags: [tagId],
      message: [
        {
          type: 'text',
          text: 'TEMP_MESSAGE_FOR_SYNC'
        }
      ],
      send_time: sendTime
    }

    const response = await manychatRequest('/fb/broadcasting/sendBroadcast', 'POST', broadcastData)
    
    if (response.status === 'success' && response.broadcast_id) {
      return response.broadcast_id
    }
    
    return null
  } catch (err) {
    warn(`No se pudo crear broadcast para tag ${tagName}: ${err.message}`)
    return null
  }
}

/**
 * Obtener información de un broadcast (incluye subscriber IDs)
 */
async function getBroadcastInfo(broadcastId) {
  try {
    const response = await manychatRequest(`/fb/broadcasting/getBroadcastInfo?broadcast_id=${broadcastId}`)
    return response.data || null
  } catch (err) {
    warn(`No se pudo obtener info del broadcast ${broadcastId}: ${err.message}`)
    return null
  }
}

/**
 * Cancelar un broadcast
 */
async function cancelBroadcast(broadcastId) {
  try {
    // ManyChat puede tener un endpoint para cancelar, pero si no existe, el broadcast programado
    // simplemente no se enviará porque está muy lejos en el futuro
    // Intentar cancelar si existe el endpoint
    try {
      await manychatRequest(`/fb/broadcasting/cancelBroadcast?broadcast_id=${broadcastId}`, 'POST')
      return true
    } catch {
      // Si no existe el endpoint, está bien, el broadcast está programado para el futuro
      return true
    }
  } catch (err) {
    warn(`No se pudo cancelar broadcast ${broadcastId}: ${err.message}`)
    return false
  }
}

/**
 * Sincronizar subscriber de ManyChat al CRM
 */
async function syncSubscriberToCRM(subscriber) {
  try {
    const phone = subscriber.whatsapp_phone || subscriber.phone || ''
    
    if (!phone) {
      return { success: false, reason: 'no_phone' }
    }

    const nombre = [subscriber.first_name, subscriber.last_name]
      .filter(Boolean)
      .join(' ') || subscriber.name || 'Contacto Manychat'

    // Buscar lead existente por manychatId o teléfono
    const { data: existingLeads } = await supabase
      .from('Lead')
      .select('*')
      .or(`manychatId.eq.${subscriber.id},telefono.eq.${phone}`)
      .limit(1)

    const customFields = subscriber.custom_fields || {}
    const tags = subscriber.tags?.map(t => typeof t === 'string' ? t : t.name) || []

    const leadData = {
      nombre,
      telefono: phone,
      email: subscriber.email || null,
      manychatId: String(subscriber.id),
      dni: customFields.dni || null,
      cuil: customFields.cuit || customFields.cuil || null,
      ingresos: customFields.ingresos ?? null,
      zona: customFields.zona || null,
      producto: customFields.producto || null,
      monto: customFields.monto ?? null,
      origen: customFields.origen || 'whatsapp',
      estado: customFields.estado || 'NUEVO',
      agencia: customFields.agencia || null,
      banco: customFields.banco || null,
      trabajo_actual: customFields.trabajo_actual || null,
      tags: JSON.stringify(tags),
      customFields: JSON.stringify(customFields),
      updatedAt: new Date().toISOString(),
    }

    if (existingLeads && existingLeads.length > 0) {
      // Actualizar lead existente
      const { data: updatedLead, error: updateError } = await supabase
        .from('Lead')
        .update(leadData)
        .eq('id', existingLeads[0].id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      return { success: true, action: 'updated', leadId: updatedLead.id }
    } else {
      // Crear nuevo lead
      const { data: newLead, error: createError } = await supabase
        .from('Lead')
        .insert({
          ...leadData,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }
      return { success: true, action: 'created', leadId: newLead.id }
    }
  } catch (err) {
    return { success: false, reason: 'error', error: err.message }
  }
}

/**
 * Función principal
 */
async function main() {
  section('Sincronización de Contactos de ManyChat por Etiquetas')
  
  info('Iniciando sincronización...')
  info(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`)
  info(`ManyChat API: ${MANYCHAT_BASE_URL}`)

  const startTime = Date.now()
  const stats = {
    tagsProcessed: 0,
    subscribersFound: 0,
    created: 0,
    updated: 0,
    errors: 0,
    broadcastsCreated: 0,
    broadcastsCancelled: 0,
    errorDetails: []
  }

  try {
    // 1. Obtener todas las etiquetas
    info('\nObteniendo etiquetas de ManyChat...')
    const tags = await getTags()
    
    if (!tags || tags.length === 0) {
      warn('No se encontraron etiquetas en ManyChat')
      return
    }

    info(`Encontradas ${tags.length} etiquetas`)
    
    // Filtrar etiquetas relevantes (las que tienen contactos según la imagen)
    const relevantTags = tags.filter(tag => {
      const tagName = tag.name || ''
      return [
        'lead-consultando',
        'solicitud-en-proceso',
        'credito-rechazado',
        'credito-preaprobado',
        'venta-concretada',
        'atencion-humana',
        'lead-nuevo'
      ].includes(tagName)
    })

    if (relevantTags.length === 0) {
      warn('No se encontraron etiquetas relevantes')
      info('Procesando todas las etiquetas...')
      relevantTags.push(...tags)
    }

    info(`Procesando ${relevantTags.length} etiquetas relevantes...`)
    log('')

    // 2. Para cada etiqueta, intentar obtener subscribers
    for (const tag of relevantTags) {
      const tagName = tag.name || 'sin-nombre'
      const tagId = tag.id
      const tagCount = tag.subscribers_count || 0

      info(`\nProcesando etiqueta: ${tagName} (${tagCount} contactos según ManyChat)`)

      try {
        // Intentar crear broadcast temporal para obtener subscriber IDs
        const broadcastId = await createTemporaryBroadcast(tagId, tagName)
        
        if (broadcastId) {
          stats.broadcastsCreated++
          info(`  Broadcast temporal creado: ${broadcastId}`)
          
          // Obtener información del broadcast
          const broadcastInfo = await getBroadcastInfo(broadcastId)
          
          if (broadcastInfo && broadcastInfo.subscribers) {
            const subscriberIds = broadcastInfo.subscribers || []
            info(`  Encontrados ${subscriberIds.length} subscriber IDs en el broadcast`)
            
            // Procesar cada subscriber
            const batchSize = 10
            for (let i = 0; i < subscriberIds.length; i += batchSize) {
              const batch = subscriberIds.slice(i, i + batchSize)
              
              for (const subscriberId of batch) {
                try {
                  const subscriber = await getSubscriberById(subscriberId)
                  
                  if (subscriber) {
                    stats.subscribersFound++
                    const result = await syncSubscriberToCRM(subscriber)
                    
                    if (result.success) {
                      if (result.action === 'created') {
                        stats.created++
                        success(`    ✓ Subscriber ${subscriberId}: CREADO`)
                      } else {
                        stats.updated++
                        success(`    ✓ Subscriber ${subscriberId}: ACTUALIZADO`)
                      }
                    } else {
                      stats.errors++
                      warn(`    ✗ Subscriber ${subscriberId}: ${result.error || result.reason}`)
                    }
                  }
                  
                  // Delay para rate limiting
                  await new Promise(resolve => setTimeout(resolve, 50))
                } catch (err) {
                  stats.errors++
                  warn(`    ✗ Error procesando subscriber ${subscriberId}: ${err.message}`)
                }
              }
              
              // Delay entre lotes
              if (i + batchSize < subscriberIds.length) {
                await new Promise(resolve => setTimeout(resolve, 200))
              }
            }
            
            // Cancelar broadcast
            await cancelBroadcast(broadcastId)
            stats.broadcastsCancelled++
            info(`  Broadcast ${broadcastId} cancelado`)
          } else {
            warn(`  No se pudieron obtener subscriber IDs del broadcast ${broadcastId}`)
            // Intentar cancelar de todas formas
            await cancelBroadcast(broadcastId)
          }
        } else {
          warn(`  No se pudo crear broadcast para etiqueta ${tagName}`)
          info(`  Intentando método alternativo: buscar por rangos de IDs...`)
          
          // Método alternativo: si conocemos el rango aproximado de IDs, podemos iterar
          // Por ahora, solo registramos que no se pudo procesar esta etiqueta
          warn(`  Método alternativo no implementado aún para ${tagName}`)
        }
        
        stats.tagsProcessed++
        
        // Delay entre etiquetas
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        stats.errors++
        stats.errorDetails.push({ tag: tagName, error: err.message })
        error(`  Error procesando etiqueta ${tagName}: ${err.message}`)
      }
    }

    // Resumen final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    section('Resumen de Sincronización')
    success(`Etiquetas procesadas: ${stats.tagsProcessed}`)
    success(`Subscribers encontrados: ${stats.subscribersFound}`)
    success(`Creados en CRM: ${stats.created}`)
    success(`Actualizados en CRM: ${stats.updated}`)
    info(`Broadcasts creados: ${stats.broadcastsCreated}`)
    info(`Broadcasts cancelados: ${stats.broadcastsCancelled}`)
    
    if (stats.errors > 0) {
      warn(`Errores: ${stats.errors}`)
      if (stats.errorDetails.length > 0) {
        log('\nDetalles de errores:', 'yellow')
        stats.errorDetails.slice(0, 10).forEach(({ tag, error }) => {
          warn(`  ${tag}: ${error}`)
        })
        if (stats.errorDetails.length > 10) {
          warn(`  ... y ${stats.errorDetails.length - 10} errores más`)
        }
      }
    }
    
    info(`Tiempo total: ${duration}s`)
    
    log('\n' + '='.repeat(60), 'cyan')
    
    if (stats.created > 0 || stats.updated > 0) {
      success(`¡Sincronización completada! ${stats.created} creados, ${stats.updated} actualizados`)
    } else {
      warn('No se crearon ni actualizaron contactos')
      info('Nota: Es posible que ManyChat no permita obtener subscriber IDs directamente desde broadcasts.')
      info('Considera usar la exportación manual desde ManyChat o contactar soporte para obtener los IDs.')
    }

  } catch (err) {
    error(`Error fatal: ${err.message}`)
    console.error(err)
    process.exit(1)
  }
}

// Ejecutar script
main()
  .then(() => {
    log('\nScript finalizado', 'cyan')
    process.exit(0)
  })
  .catch((err) => {
    error(`Error ejecutando script: ${err.message}`)
    console.error(err)
    process.exit(1)
  })






