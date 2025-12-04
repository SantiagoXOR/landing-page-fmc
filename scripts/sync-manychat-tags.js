/**
 * Script para sincronizar etiquetas de ManyChat al CRM
 * 
 * Este script sincroniza las etiquetas de todos los contactos que tienen manychatId
 * desde ManyChat hacia el CRM.
 * 
 * Ejecutar: node scripts/sync-manychat-tags.js
 * O con dotenv: node -r dotenv/config scripts/sync-manychat-tags.js
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

// Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// Configuración de ManyChat
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY
const MANYCHAT_BASE_URL = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  error('Error: Variables de entorno de Supabase no configuradas')
  error('Necesitas configurar: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY')
  process.exit(1)
}

if (!MANYCHAT_API_KEY) {
  error('Error: Variable de entorno MANYCHAT_API_KEY no configurada')
  process.exit(1)
}

// Inicializar cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Obtener información de un subscriber de ManyChat
 */
async function getSubscriberFromManyChat(subscriberId) {
  try {
    const response = await fetch(`${MANYCHAT_BASE_URL}/fb/subscriber/getInfo?subscriber_id=${subscriberId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ManyChat API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.data || null
  } catch (err) {
    throw err
  }
}

/**
 * Sincronizar etiquetas de un lead desde ManyChat
 */
async function syncTagsForLead(lead) {
  try {
    const subscriberId = String(lead.manychatId).trim()
    
    // Validar subscriberId
    if (!subscriberId || subscriberId === 'null' || subscriberId === 'undefined' || subscriberId === 'NaN') {
      warn(`Lead ${lead.id} tiene manychatId inválido: ${lead.manychatId}`)
      return { success: false, reason: 'invalid_manychat_id' }
    }

    // Obtener subscriber de ManyChat
    const subscriber = await getSubscriberFromManyChat(subscriberId)
    
    if (!subscriber) {
      warn(`Subscriber ${subscriberId} no encontrado en ManyChat para lead ${lead.id}`)
      return { success: false, reason: 'subscriber_not_found' }
    }

    // Extraer etiquetas
    const tags = subscriber.tags?.map(t => typeof t === 'string' ? t : t.name) || []

    // Actualizar lead con las etiquetas
    const { error: updateError } = await supabase
      .from('Lead')
      .update({ 
        tags: JSON.stringify(tags),
        updatedAt: new Date().toISOString()
      })
      .eq('id', lead.id)

    if (updateError) {
      throw updateError
    }

    return { 
      success: true, 
      tagsCount: tags.length,
      tags: tags
    }
  } catch (err) {
    return { 
      success: false, 
      reason: 'error',
      error: err.message 
    }
  }
}

/**
 * Función principal
 */
async function main() {
  section('Sincronización de Etiquetas de ManyChat al CRM')
  
  info('Iniciando sincronización...')
  info(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`)
  info(`ManyChat API: ${MANYCHAT_BASE_URL}`)

  const startTime = Date.now()
  const stats = {
    total: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
    errors: {
      invalid_manychat_id: 0,
      subscriber_not_found: 0,
      error: 0,
    }
  }

  try {
    // Obtener todos los leads que tienen manychatId
    info('\nObteniendo leads con manychatId...')
    const { data: leads, error: leadsError } = await supabase
      .from('Lead')
      .select('id, nombre, telefono, manychatId, tags')
      .not('manychatId', 'is', null)
      .neq('manychatId', '')

    if (leadsError) {
      throw new Error(`Error obteniendo leads: ${leadsError.message}`)
    }

    if (!leads || leads.length === 0) {
      warn('No se encontraron leads con manychatId')
      return
    }

    stats.total = leads.length
    info(`Encontrados ${stats.total} leads con manychatId`)

    // Procesar en lotes para evitar sobrecargar la API
    const batchSize = 10
    const batches = []
    
    for (let i = 0; i < leads.length; i += batchSize) {
      batches.push(leads.slice(i, i + batchSize))
    }

    info(`Procesando en ${batches.length} lotes de ${batchSize} contactos...`)
    log('')

    // Procesar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      info(`Procesando lote ${batchIndex + 1}/${batches.length}...`)

      // Procesar contactos del lote
      for (const lead of batch) {
        const result = await syncTagsForLead(lead)
        
        if (result.success) {
          stats.synced++
          const tagsPreview = result.tags.length > 0 
            ? result.tags.slice(0, 3).join(', ') + (result.tags.length > 3 ? '...' : '')
            : 'sin etiquetas'
          success(`Lead ${lead.id} (${lead.nombre || 'Sin nombre'}): ${result.tagsCount} etiquetas - [${tagsPreview}]`)
        } else {
          stats.failed++
          stats.errors[result.reason] = (stats.errors[result.reason] || 0) + 1
          
          if (result.reason === 'invalid_manychat_id') {
            warn(`Lead ${lead.id}: manychatId inválido`)
          } else if (result.reason === 'subscriber_not_found') {
            warn(`Lead ${lead.id}: subscriber no encontrado en ManyChat`)
          } else {
            error(`Lead ${lead.id}: ${result.error || 'Error desconocido'}`)
          }
        }

        // Delay para respetar rate limits de ManyChat (100 req/s)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Delay entre lotes
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // Resumen final
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    section('Resumen de Sincronización')
    success(`Total procesados: ${stats.total}`)
    success(`Sincronizados exitosamente: ${stats.synced}`)
    
    if (stats.failed > 0) {
      warn(`Fallidos: ${stats.failed}`)
      log('\nDesglose de errores:', 'yellow')
      if (stats.errors.invalid_manychat_id > 0) {
        warn(`  - manychatId inválido: ${stats.errors.invalid_manychat_id}`)
      }
      if (stats.errors.subscriber_not_found > 0) {
        warn(`  - Subscriber no encontrado: ${stats.errors.subscriber_not_found}`)
      }
      if (stats.errors.error > 0) {
        warn(`  - Otros errores: ${stats.errors.error}`)
      }
    }
    
    info(`Tiempo total: ${duration}s`)
    info(`Promedio: ${(duration / stats.total).toFixed(2)}s por contacto`)
    
    log('\n' + '='.repeat(60), 'cyan')
    
    if (stats.synced === stats.total) {
      success('¡Sincronización completada exitosamente!')
    } else if (stats.synced > 0) {
      warn(`Sincronización completada con ${stats.failed} errores`)
    } else {
      error('No se pudo sincronizar ningún contacto')
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





