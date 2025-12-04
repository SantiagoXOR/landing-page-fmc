/**
 * Script para extraer subscriber IDs desde las requests de red de ManyChat
 * 
 * Este script analiza las requests de red del browser MCP para extraer
 * los subscriber IDs que aparecen en las URLs de las imágenes de perfil.
 * 
 * Los IDs aparecen como parámetro "psid" en las URLs de Facebook:
 * https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32640609408919422
 */

require('dotenv').config()
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
 * Extraer subscriber IDs de las requests de red
 * Los IDs aparecen en las URLs de las imágenes de perfil de Facebook
 */
function extractSubscriberIdsFromNetworkRequests() {
  section('Extracción de Subscriber IDs desde Network Requests')
  
  info('Analizando las requests de red del browser...')
  info('Los subscriber IDs aparecen como parámetro "psid" en las URLs de Facebook')
  info('')
  
  // Los IDs que vimos en las requests de red
  const subscriberIds = new Set()
  
  // Buscar en los logs del browser si existen
  const browserLogsDir = path.join(require('os').homedir(), '.cursor', 'browser-logs')
  
  if (fs.existsSync(browserLogsDir)) {
    info(`Buscando en: ${browserLogsDir}`)
    
    const files = fs.readdirSync(browserLogsDir)
      .filter(f => f.endsWith('.log'))
      .sort()
      .reverse() // Archivos más recientes primero
    
    for (const file of files.slice(0, 5)) { // Últimos 5 archivos
      const filePath = path.join(browserLogsDir, file)
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Buscar patrones de psid en URLs
        const psidPattern = /psid=(\d{15,})/g
        let match
        while ((match = psidPattern.exec(content)) !== null) {
          subscriberIds.add(match[1])
        }
        
        // También buscar en URLs de subscribers
        const subscriberUrlPattern = /\/subscribers\/(\d{15,})/g
        while ((match = subscriberUrlPattern.exec(content)) !== null) {
          subscriberIds.add(match[1])
        }
      } catch (e) {
        // Continuar con el siguiente archivo
      }
    }
  }
  
  // IDs que vimos directamente en las requests de red
  const knownIds = [
    '24664267479915356',
    '25541058665519003',
    '25653703054235477',
    '32640609408919422',
    '25565495896423954',
    '24978379815186526',
    '25168610232799558',
    '25700296369595670',
    '24882945038073865',
    '24833672969665712',
    '24947284474943607',
    '25516304457964241',
    '25102619832693998',
    '24870906525945489',
    '24586673454339326',
    '25445549041743671',
    '32644788715165666',
    '24468252062848178',
    '25094122670281341',
    '26103016285952673',
    '25394418246855784',
    '25939837535622446',
    '25301692042807123',
    '24926618923700963',
    '25213961128270996'
  ]
  
  knownIds.forEach(id => subscriberIds.add(id))
  
  const idsArray = Array.from(subscriberIds).sort()
  
  success(`Encontrados ${idsArray.length} subscriber IDs únicos`)
  
  // Guardar en archivo
  const outputFile = path.join(__dirname, 'subscriber-ids-extracted.txt')
  fs.writeFileSync(outputFile, idsArray.join('\n'), 'utf-8')
  
  success(`IDs guardados en: ${outputFile}`)
  info('')
  info('Primeros 10 IDs encontrados:')
  idsArray.slice(0, 10).forEach((id, i) => {
    info(`  ${i + 1}. ${id}`)
  })
  
  if (idsArray.length > 10) {
    info(`  ... y ${idsArray.length - 10} más`)
  }
  
  return idsArray
}

// Ejecutar
const ids = extractSubscriberIdsFromNetworkRequests()

section('Próximos Pasos')
info('Para sincronizar estos IDs al CRM, ejecuta:')
info('npm run manychat:sync-by-ids scripts/subscriber-ids-extracted.txt')
info('')
info('O crea un CSV con formato:')
info('pageuid')
ids.slice(0, 5).forEach(id => info(id))
info('...')
info('')
info('Y luego ejecuta:')
info('npm run manychat:sync-by-ids archivo.csv')





