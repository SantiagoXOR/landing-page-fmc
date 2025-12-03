/**
 * Script para extraer subscriber IDs de ManyChat usando Browser MCP
 * 
 * Este script usa el browser MCP de Cursor para:
 * 1. Navegar a la página de contactos de ManyChat
 * 2. Interceptar las network requests para capturar los subscriber IDs
 * 3. Hacer scroll automático para cargar más contactos
 * 4. Extraer IDs de todas las plataformas (Facebook, Instagram, WhatsApp)
 * 5. Guardar los IDs únicos en un CSV
 * 
 * Los IDs aparecen como parámetro "psid" en las URLs de las imágenes de perfil:
 * https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32640609408919422
 * 
 * USO:
 * Este script debe ser ejecutado por el AI con browser MCP
 * 
 * RESULTADO:
 * Los IDs se guardarán en scripts/subscriber-ids-extracted.csv
 */

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

/**
 * Extrae subscriber IDs de las network requests
 */
function extractSubscriberIdsFromNetworkRequests(networkRequests) {
  const subscriberIds = new Set()
  
  if (!networkRequests || networkRequests.length === 0) {
    warn('No se encontraron network requests')
    return subscriberIds
  }
  
  info(`Analizando ${networkRequests.length} network requests...`)
  
  for (const request of networkRequests) {
    const url = request.url || ''
    
    // Patrón 1: psid en las URLs de imágenes de perfil de Facebook
    // https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32640609408919422
    const psidMatch = url.match(/[?&]psid=(\d{15,})/i)
    if (psidMatch) {
      subscriberIds.add(psidMatch[1])
    }
    
    // Patrón 2: subscriber IDs en URLs de la API de ManyChat
    // https://api.manychat.com/subscribers/25541058665519003
    const subscriberUrlMatch = url.match(/\/subscribers?\/(\d{15,})/i)
    if (subscriberUrlMatch) {
      subscriberIds.add(subscriberUrlMatch[1])
    }
    
    // Patrón 3: IDs en parámetros de query
    const idParamMatch = url.match(/[?&](?:id|subscriber_id|contact_id)=(\d{15,})/i)
    if (idParamMatch) {
      subscriberIds.add(idParamMatch[1])
    }
    
    // Patrón 4: IDs en el cuerpo de la respuesta (si está disponible)
    if (request.response) {
      try {
        const responseText = typeof request.response === 'string' 
          ? request.response 
          : JSON.stringify(request.response)
        
        // Buscar patrones de IDs en el JSON
        const idsInResponse = responseText.match(/\d{17,}/g)
        if (idsInResponse) {
          idsInResponse.forEach(id => {
            // Validar que sea un ID válido (17-20 dígitos)
            if (id.length >= 17 && id.length <= 20) {
              subscriberIds.add(id)
            }
          })
        }
      } catch (e) {
        // No es JSON o no se puede parsear
      }
    }
  }
  
  return subscriberIds
}

/**
 * Guarda los IDs en un archivo CSV
 */
function saveSubscriberIdsToCSV(subscriberIds, outputFile) {
  const idsArray = Array.from(subscriberIds).sort()
  
  // Formato CSV con header
  const csvContent = 'pageuid\n' + idsArray.join('\n')
  
  fs.writeFileSync(outputFile, csvContent, 'utf-8')
  
  success(`${idsArray.length} IDs guardados en: ${outputFile}`)
  
  return idsArray
}

/**
 * Lee los IDs existentes del CSV
 */
function readExistingIds(csvFile) {
  const existingIds = new Set()
  
  try {
    if (fs.existsSync(csvFile)) {
      const content = fs.readFileSync(csvFile, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        // Saltar header
        if (line === 'pageuid') continue
        
        const id = line.trim()
        if (id && /^\d{15,}$/.test(id)) {
          existingIds.add(id)
        }
      }
      
      info(`Cargados ${existingIds.size} IDs existentes del CSV`)
    }
  } catch (e) {
    warn(`No se pudo leer el archivo existente: ${e.message}`)
  }
  
  return existingIds
}

/**
 * Combina IDs nuevos con existentes
 */
function mergeIds(existingIds, newIds) {
  const allIds = new Set([...existingIds, ...newIds])
  
  const newCount = allIds.size - existingIds.size
  
  if (newCount > 0) {
    success(`Encontrados ${newCount} IDs nuevos`)
  } else {
    info('No se encontraron IDs nuevos')
  }
  
  return allIds
}

/**
 * Función principal que será llamada por el AI con los datos del browser MCP
 */
function processNetworkData(networkRequests, options = {}) {
  section('Procesando Network Requests de ManyChat')
  
  const csvFile = path.join(__dirname, 'subscriber-ids-extracted.csv')
  
  // Leer IDs existentes
  const existingIds = readExistingIds(csvFile)
  info(`IDs existentes en CSV: ${existingIds.size}`)
  
  // Extraer nuevos IDs de las network requests
  const newIds = extractSubscriberIdsFromNetworkRequests(networkRequests)
  success(`IDs encontrados en network requests: ${newIds.size}`)
  
  // Combinar con existentes
  const allIds = mergeIds(existingIds, newIds)
  
  // Guardar en CSV
  const idsArray = saveSubscriberIdsToCSV(allIds, csvFile)
  
  // Mostrar resumen
  section('Resumen de Extracción')
  success(`Total de IDs únicos: ${idsArray.length}`)
  success(`IDs nuevos agregados: ${allIds.size - existingIds.size}`)
  
  if (idsArray.length > 0) {
    info('\nPrimeros 10 IDs:')
    idsArray.slice(0, 10).forEach((id, i) => {
      info(`  ${i + 1}. ${id}`)
    })
    
    if (idsArray.length > 10) {
      info(`  ... y ${idsArray.length - 10} más`)
    }
  }
  
  section('Próximos Pasos')
  info('Para sincronizar estos IDs al CRM, ejecuta:')
  info('node scripts/sync-manychat-by-ids.js')
  info('')
  info('O desde npm:')
  info('npm run manychat:sync-by-ids')
  
  return {
    total: idsArray.length,
    new: allIds.size - existingIds.size,
    existing: existingIds.size,
    ids: idsArray
  }
}

/**
 * Función de utilidad para procesar directamente desde un archivo JSON
 * (útil si el AI guarda las network requests en un archivo primero)
 */
function processNetworkDataFromFile(jsonFile) {
  section('Cargando Network Requests desde archivo')
  
  try {
    const content = fs.readFileSync(jsonFile, 'utf-8')
    const networkRequests = JSON.parse(content)
    
    info(`Archivo cargado: ${jsonFile}`)
    info(`Requests encontradas: ${networkRequests.length}`)
    
    return processNetworkData(networkRequests)
  } catch (e) {
    error(`Error al leer archivo: ${e.message}`)
    throw e
  }
}

// Exportar funciones para uso del AI o ejecución directa
module.exports = {
  processNetworkData,
  processNetworkDataFromFile,
  extractSubscriberIdsFromNetworkRequests,
  saveSubscriberIdsToCSV,
  readExistingIds,
  mergeIds
}

// Si se ejecuta directamente, mostrar instrucciones
if (require.main === module) {
  section('Script de Extracción de Subscriber IDs con Browser MCP')
  info('')
  info('Este script debe ser ejecutado por el AI con browser MCP')
  info('')
  info('PASOS DEL AI:')
  info('1. Navegar a https://manychat.com/contacts usando browser_navigate')
  info('2. Esperar a que cargue la página')
  info('3. Hacer scroll automático para cargar más contactos')
  info('4. Capturar las network requests usando browser_network_requests')
  info('5. Procesar los datos con este script')
  info('')
  info('ALTERNATIVA: Si tienes un archivo JSON con las network requests:')
  info('node scripts/extract-subscriber-ids-browser-mcp.js network-requests.json')
  info('')
  
  // Si se pasó un archivo como argumento
  if (process.argv[2]) {
    const jsonFile = process.argv[2]
    processNetworkDataFromFile(jsonFile)
  }
}


