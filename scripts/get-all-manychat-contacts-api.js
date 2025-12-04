/**
 * Script para obtener TODOS los contactos de ManyChat usando la API
 * 
 * Este script usa la API de ManyChat para obtener contactos por etiquetas
 * y sincronizarlos al CRM. Es más confiable que el scraping.
 * 
 * Uso:
 * npm run manychat:get-all-contacts-api
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const ManychatService = require('../src/server/services/manychat-service').default

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  error('Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * Obtener todas las etiquetas de ManyChat
 */
async function getAllTags() {
  try {
    const tags = await ManychatService.getTags()
    return tags || []
  } catch (err) {
    error(`Error obteniendo etiquetas: ${err.message}`)
    return []
  }
}

/**
 * Obtener subscriber por ID
 */
async function getSubscriberById(subscriberId) {
  try {
    return await ManychatService.getSubscriberById(subscriberId)
  } catch (err) {
    return null
  }
}

/**
 * Sincronizar subscriber al CRM
 */
async function syncSubscriberToCRM(subscriber) {
  try {
    const phone = subscriber.whatsapp_phone || subscriber.phone || ''
    
    if (!phone && !subscriber.id) {
      return { success: false, reason: 'no_phone_or_id' }
    }

    const nombre = [subscriber.first_name, subscriber.last_name]
      .filter(Boolean)
      .join(' ') || subscriber.name || 'Contacto Manychat'

    // Buscar lead existente
    let query = supabase.from('Lead').select('*')
    
    if (subscriber.id) {
      query = query.eq('manychatId', String(subscriber.id))
    }
    
    if (phone) {
      if (subscriber.id) {
        query = query.or(`manychatId.eq.${subscriber.id},telefono.eq.${phone}`)
      } else {
        query = query.eq('telefono', phone)
      }
    }
    
    const { data: existingLeads } = await query.limit(1)

    const customFields = subscriber.custom_fields || {}
    const tags = subscriber.tags?.map(t => typeof t === 'string' ? t : t.name) || []

    const leadData = {
      nombre,
      telefono: phone || `manychat_${subscriber.id}`,
      email: subscriber.email || null,
      manychatId: String(subscriber.id),
      dni: customFields.dni || null,
      cuil: customFields.cuit || customFields.cuil || null,
      ingresos: customFields.ingresos ?? null,
      zona: customFields.zona || null,
      producto: customFields.producto || null,
      monto: customFields.monto ?? null,
      origen: subscriber.instagram_id ? 'instagram' : (customFields.origen || 'whatsapp'),
      estado: customFields.estado || 'NUEVO',
      agencia: customFields.agencia || null,
      banco: customFields.banco || null,
      trabajo_actual: customFields.trabajo_actual || null,
      tags: JSON.stringify(tags),
      customFields: JSON.stringify(customFields),
      updatedAt: new Date().toISOString(),
    }

    if (existingLeads && existingLeads.length > 0) {
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
  section('Obtención de Contactos de ManyChat usando API')
  
  info('Iniciando...')
  info(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`)
  
  const startTime = Date.now()
  const stats = {
    tagsProcessed: 0,
    subscribersFound: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  }
  
  // Obtener todas las etiquetas
  section('Paso 1: Obteniendo etiquetas de ManyChat')
  const tags = await getAllTags()
  
  if (tags.length === 0) {
    warn('No se encontraron etiquetas en ManyChat')
    warn('')
    warn('SOLUCIÓN ALTERNATIVA:')
    warn('1. Exporta manualmente los contactos desde ManyChat por etiquetas')
    warn('2. Usa el script: npm run manychat:sync-by-ids archivo.csv')
    process.exit(0)
  }
  
  success(`Encontradas ${tags.length} etiquetas`)
  info(`Etiquetas: ${tags.map(t => t.name).join(', ')}`)
  
  // Obtener todos los manychatId existentes en el CRM
  section('Paso 2: Obteniendo contactos existentes del CRM')
  const { data: existingLeads } = await supabase
    .from('Lead')
    .select('manychatId')
    .not('manychatId', 'is', null)
  
  const existingManychatIds = new Set(
    (existingLeads || []).map(lead => String(lead.manychatId))
  )
  
  success(`Encontrados ${existingManychatIds.size} contactos con manychatId en el CRM`)
  
  // Procesar cada etiqueta
  section('Paso 3: Procesando contactos por etiquetas')
  info('NOTA: ManyChat no tiene endpoint para obtener subscribers por etiqueta directamente')
  info('Usaremos los IDs que ya tenemos en el CRM y los actualizaremos')
  info('')
  
  // Obtener todos los manychatId del CRM y actualizar su información
  const { data: allLeads } = await supabase
    .from('Lead')
    .select('manychatId')
    .not('manychatId', 'is', null)
    .limit(1000)
  
  const manychatIds = (allLeads || []).map(lead => String(lead.manychatId))
  
  info(`Procesando ${manychatIds.length} contactos existentes...`)
  
  const batchSize = 10
  const batches = []
  
  for (let i = 0; i < manychatIds.length; i += batchSize) {
    batches.push(manychatIds.slice(i, i + batchSize))
  }
  
  info(`Procesando en ${batches.length} lotes de ${batchSize} contactos...`)
  log('')
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    
    for (const subscriberId of batch) {
      try {
        const subscriber = await getSubscriberById(subscriberId)
        
        if (!subscriber) {
          stats.errors++
          warn(`ID ${subscriberId}: No encontrado en ManyChat`)
        } else {
          stats.subscribersFound++
          
          const result = await syncSubscriberToCRM(subscriber)
          
          if (result.success) {
            if (result.action === 'created') {
              stats.created++
              const tagsPreview = subscriber.tags?.length > 0 
                ? subscriber.tags.slice(0, 2).map(t => typeof t === 'string' ? t : t.name).join(', ')
                : 'sin etiquetas'
              const nombre = subscriber.first_name || subscriber.name || 'Contacto'
              success(`✓ ${nombre} (${subscriberId}): CREADO - Tags: [${tagsPreview}]`)
            } else {
              stats.updated++
              success(`✓ ${subscriberId}: ACTUALIZADO`)
            }
          } else {
            stats.errors++
            stats.errorDetails.push({ id: subscriberId, error: result.error || result.reason })
            error(`✗ ${subscriberId}: Error - ${result.error || result.reason}`)
          }
        }
        
        // Delay para rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (err) {
        stats.errors++
        stats.errorDetails.push({ id: subscriberId, error: err.message })
        error(`✗ ${subscriberId}: Error - ${err.message}`)
      }
    }
    
    // Mostrar progreso
    const processed = Math.min((batchIndex + 1) * batchSize, manychatIds.length)
    info(`Progreso: ${processed}/${manychatIds.length} (${Math.round(processed / manychatIds.length * 100)}%)`)
    
    // Delay entre lotes
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  // Resumen final
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  section('Resumen')
  success(`Etiquetas encontradas: ${tags.length}`)
  success(`Contactos procesados: ${manychatIds.length}`)
  success(`Encontrados en ManyChat: ${stats.subscribersFound}`)
  success(`Creados en CRM: ${stats.created}`)
  success(`Actualizados en CRM: ${stats.updated}`)
  
  if (stats.errors > 0) {
    warn(`Errores: ${stats.errors}`)
  }
  
  info(`Tiempo total: ${duration}s`)
  
  log('\n' + '='.repeat(60), 'cyan')
  
  if (stats.created > 0 || stats.updated > 0) {
    success(`¡Proceso completado! ${stats.created} creados, ${stats.updated} actualizados`)
  } else {
    warn('No se crearon ni actualizaron contactos')
  }
  
  warn('')
  warn('NOTA: ManyChat no tiene endpoint para obtener TODOS los subscribers')
  warn('Para obtener contactos que no están en el CRM:')
  warn('1. Exporta manualmente desde ManyChat por etiquetas')
  warn('2. Usa: npm run manychat:sync-by-ids archivo.csv')
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





