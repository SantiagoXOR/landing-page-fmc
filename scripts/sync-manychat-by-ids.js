/**
 * Script para sincronizar contactos de ManyChat al CRM usando IDs exportados
 * 
 * Este script lee archivos CSV con subscriber IDs (iguid o pageuid) exportados de ManyChat
 * y sincroniza cada contacto al CRM obteniendo su información completa desde la API.
 * 
 * Uso:
 * 1. Exportar audiencia desde ManyChat (obtendrás archivos con IDs)
 * 2. Colocar los archivos CSV en la carpeta scripts/ o pasar la ruta como argumento
 * 3. Ejecutar: npm run manychat:sync-by-ids [ruta-al-archivo.csv]
 * 
 * Ejemplo:
 * npm run manychat:sync-by-ids scripts/fb_custom_audience_3724482_20251203.csv
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
    if (response.status === 404) {
      return null // Subscriber no encontrado
    }
    throw new Error(`ManyChat API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

/**
 * Obtener subscriber de ManyChat por ID
 */
async function getSubscriberById(subscriberId) {
  try {
    const response = await manychatRequest(`/fb/subscriber/getInfo?subscriber_id=${subscriberId}`)
    if (response && response.status === 'success' && response.data) {
      return response.data
    }
    return null
  } catch (err) {
    if (err.message.includes('404')) {
      return null
    }
    throw err
  }
}

/**
 * Sincronizar subscriber de ManyChat al CRM
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

    // Buscar lead existente por manychatId o teléfono
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
 * Leer IDs desde CSV
 */
function readIdsFromCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    return []
  }
  
  // Detectar tipo de ID (iguid o pageuid)
  const header = lines[0].toLowerCase().trim()
  const isInstagram = header.includes('iguid')
  const isFacebook = header.includes('pageuid')
  
  // Extraer IDs (saltar header)
  const ids = []
  for (let i = 1; i < lines.length; i++) {
    const id = lines[i].trim()
    if (id && id !== '') {
      ids.push({
        id: id,
        type: isInstagram ? 'instagram' : (isFacebook ? 'facebook' : 'unknown')
      })
    }
  }
  
  return ids
}

/**
 * Función principal
 */
async function main() {
  section('Sincronización de Contactos de ManyChat por IDs')
  
  info('Iniciando sincronización...')
  info(`Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`)
  info(`ManyChat API: ${MANYCHAT_BASE_URL}`)

  // Obtener archivo CSV desde argumentos o buscar archivos por defecto
  const args = process.argv.slice(2)
  let csvFiles = []
  
  if (args.length > 0) {
    // Usar archivos pasados como argumentos
    csvFiles = args.map(arg => path.resolve(arg))
  } else {
    // Buscar archivos por defecto
    const defaultFiles = [
      path.join(__dirname, 'fb_custom_audience_3724482_20251203.csv'),
      path.join(__dirname, 'ig_custom_audience_3724482_20251203.csv'),
      path.join(process.cwd(), 'fb_custom_audience_3724482_20251203.csv'),
      path.join(process.cwd(), 'ig_custom_audience_3724482_20251203.csv'),
      path.join(require('os').homedir(), 'Downloads', 'fb_custom_audience_3724482_20251203.csv'),
      path.join(require('os').homedir(), 'Downloads', 'ig_custom_audience_3724482_20251203.csv'),
    ]
    
    for (const file of defaultFiles) {
      if (fs.existsSync(file)) {
        csvFiles.push(file)
      }
    }
  }
  
  if (csvFiles.length === 0) {
    error('No se encontraron archivos CSV')
    info('\nOpciones:')
    info('1. Pasar la ruta del archivo como argumento:')
    info('   npm run manychat:sync-by-ids "C:\\Users\\marti\\Downloads\\fb_custom_audience_3724482_20251203.csv"')
    info('2. Colocar el archivo en la carpeta scripts/ con el nombre:')
    info('   fb_custom_audience_3724482_20251203.csv o ig_custom_audience_3724482_20251203.csv')
    process.exit(1)
  }
  
  info(`Encontrados ${csvFiles.length} archivo(s) CSV`)
  
  const startTime = Date.now()
  const stats = {
    total: 0,
    found: 0,
    created: 0,
    updated: 0,
    notFound: 0,
    errors: 0,
    errorDetails: []
  }
  
  // Procesar cada archivo CSV
  for (const csvFile of csvFiles) {
    info(`\nProcesando archivo: ${path.basename(csvFile)}`)
    
    const ids = readIdsFromCSV(csvFile)
    info(`Encontrados ${ids.length} IDs en el archivo`)
    
    stats.total += ids.length
    
    // Procesar en lotes
    const batchSize = 10
    const batches = []
    
    for (let i = 0; i < ids.length; i += batchSize) {
      batches.push(ids.slice(i, i + batchSize))
    }
    
    info(`Procesando en ${batches.length} lotes de ${batchSize} contactos...`)
    log('')
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      for (const { id: subscriberId, type } of batch) {
        try {
          // Obtener subscriber desde ManyChat
          const subscriber = await getSubscriberById(subscriberId)
          
          if (!subscriber) {
            stats.notFound++
            warn(`ID ${subscriberId} (${type}): No encontrado en ManyChat`)
          } else {
            stats.found++
            
            // Sincronizar al CRM
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
          
          // Delay para rate limiting (100 req/s = 10ms mínimo entre requests)
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (err) {
          stats.errors++
          stats.errorDetails.push({ id: subscriberId, error: err.message })
          error(`✗ ${subscriberId}: Error - ${err.message}`)
        }
      }
      
      // Mostrar progreso
      const processed = Math.min((batchIndex + 1) * batchSize, ids.length)
      info(`Progreso: ${processed}/${ids.length} (${Math.round(processed / ids.length * 100)}%)`)
      
      // Delay entre lotes
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }
  
  // Resumen final
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  section('Resumen de Sincronización')
  success(`Total IDs procesados: ${stats.total}`)
  success(`Encontrados en ManyChat: ${stats.found}`)
  success(`Creados en CRM: ${stats.created}`)
  success(`Actualizados en CRM: ${stats.updated}`)
  
  if (stats.notFound > 0) {
    warn(`No encontrados en ManyChat: ${stats.notFound}`)
  }
  
  if (stats.errors > 0) {
    warn(`Errores: ${stats.errors}`)
    if (stats.errorDetails.length > 0) {
      log('\nDetalles de errores:', 'yellow')
      stats.errorDetails.slice(0, 10).forEach(({ id, error }) => {
        warn(`  ${id}: ${error}`)
      })
      if (stats.errorDetails.length > 10) {
        warn(`  ... y ${stats.errorDetails.length - 10} errores más`)
      }
    }
  }
  
  info(`Tiempo total: ${duration}s`)
  if (stats.total > 0) {
    info(`Promedio: ${(duration / stats.total).toFixed(2)}s por contacto`)
  }
  
  log('\n' + '='.repeat(60), 'cyan')
  
  if (stats.created > 0 || stats.updated > 0) {
    success(`¡Sincronización completada! ${stats.created} creados, ${stats.updated} actualizados`)
  } else {
    warn('No se crearon ni actualizaron contactos')
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











