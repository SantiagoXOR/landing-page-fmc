/**
 * Script para extraer subscriber IDs de ManyChat usando el browser MCP
 * 
 * Este script usa el browser integrado de Cursor para:
 * 1. Navegar a la página de contactos de ManyChat
 * 2. Extraer todos los subscriber IDs de la tabla
 * 3. Guardarlos en un archivo CSV
 * 4. Sincronizarlos al CRM
 * 
 * Uso:
 * node scripts/extract-subscriber-ids-browser.js
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

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
 * Leer subscriber IDs desde archivo CSV generado manualmente
 * El usuario debe hacer scroll en la página de ManyChat y copiar los IDs
 */
async function readSubscriberIdsFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  // Saltar header si existe
  const ids = []
  for (const line of lines) {
    const trimmed = line.trim()
    // Buscar números largos (subscriber IDs)
    const matches = trimmed.match(/\d{15,}/g)
    if (matches) {
      ids.push(...matches)
    }
  }
  
  return [...new Set(ids)] // Eliminar duplicados
}

/**
 * Sincronizar subscriber al CRM usando la API de ManyChat
 */
async function syncSubscriberById(subscriberId, ManychatService) {
  try {
    const subscriber = await ManychatService.getSubscriberById(subscriberId)
    
    if (!subscriber) {
      return { success: false, reason: 'not_found' }
    }
    
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
  section('Extracción de Subscriber IDs de ManyChat')
  
  info('Este script requiere que uses el browser MCP para extraer los IDs')
  info('')
  info('INSTRUCCIONES:')
  info('1. El browser ya está en: https://app.manychat.com/fb3724482/subscribers')
  info('2. Haz scroll hacia abajo para cargar más contactos')
  info('3. Abre la consola del navegador (F12) y ejecuta este código JavaScript:')
  info('')
  warn(`
// Código JavaScript para ejecutar en la consola del navegador:
const subscriberIds = []
const rows = document.querySelectorAll('table tbody tr')
rows.forEach(row => {
  const link = row.querySelector('a[href*="/subscribers/"]')
  if (link) {
    const match = link.href.match(/\\/subscribers\\/(\\d+)/)
    if (match) {
      subscriberIds.push(match[1])
    }
  }
})
console.log('Subscriber IDs encontrados:', subscriberIds.length)
console.log(subscriberIds.join('\\n'))
// Copia la salida y guárdala en un archivo
  `)
  info('')
  info('4. Guarda los IDs en un archivo llamado: subscriber-ids.txt')
  info('5. Ejecuta este script nuevamente para sincronizar')
  info('')
  
  // Verificar si existe el archivo
  const idsFile = path.join(__dirname, 'subscriber-ids.txt')
  
  if (!fs.existsSync(idsFile)) {
    warn(`Archivo ${idsFile} no encontrado`)
    warn('Sigue las instrucciones arriba para crear el archivo')
    process.exit(0)
  }
  
  info(`Leyendo IDs desde: ${idsFile}`)
  const subscriberIds = await readSubscriberIdsFromFile(idsFile)
  
  if (subscriberIds.length === 0) {
    error('No se encontraron subscriber IDs en el archivo')
    process.exit(1)
  }
  
  success(`Encontrados ${subscriberIds.length} subscriber IDs`)
  
  // Cargar ManychatService
  const ManychatService = require('../src/server/services/manychat-service').default
  
  // Sincronizar cada subscriber
  section('Sincronizando contactos al CRM')
  
  const stats = {
    total: subscriberIds.length,
    created: 0,
    updated: 0,
    errors: 0,
    notFound: 0,
    errorDetails: []
  }
  
  const batchSize = 10
  const batches = []
  
  for (let i = 0; i < subscriberIds.length; i += batchSize) {
    batches.push(subscriberIds.slice(i, i + batchSize))
  }
  
  info(`Procesando en ${batches.length} lotes de ${batchSize} contactos...`)
  log('')
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    
    for (const subscriberId of batch) {
      try {
        const result = await syncSubscriberById(subscriberId, ManychatService)
        
        if (result.success) {
          if (result.action === 'created') {
            stats.created++
            success(`✓ ${subscriberId}: CREADO`)
          } else {
            stats.updated++
            success(`✓ ${subscriberId}: ACTUALIZADO`)
          }
        } else {
          if (result.reason === 'not_found') {
            stats.notFound++
            warn(`⚠ ${subscriberId}: No encontrado en ManyChat`)
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
    const processed = Math.min((batchIndex + 1) * batchSize, subscriberIds.length)
    info(`Progreso: ${processed}/${subscriberIds.length} (${Math.round(processed / subscriberIds.length * 100)}%)`)
    
    // Delay entre lotes
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  
  // Resumen final
  section('Resumen')
  success(`Total IDs procesados: ${stats.total}`)
  success(`Creados en CRM: ${stats.created}`)
  success(`Actualizados en CRM: ${stats.updated}`)
  
  if (stats.notFound > 0) {
    warn(`No encontrados en ManyChat: ${stats.notFound}`)
  }
  
  if (stats.errors > 0) {
    warn(`Errores: ${stats.errors}`)
  }
  
  log('\n' + '='.repeat(60), 'cyan')
  
  if (stats.created > 0 || stats.updated > 0) {
    success(`¡Sincronización completada! ${stats.created} creados, ${stats.updated} actualizados`)
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





