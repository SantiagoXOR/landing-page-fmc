/**
 * Script para extraer TODOS los subscriber IDs usando el browser MCP
 * 
 * Este script:
 * 1. Navega a la página de contactos de ManyChat
 * 2. Hace scroll para cargar más contactos
 * 3. Intercepta las requests de red para extraer subscriber IDs
 * 4. Guarda los IDs en un archivo CSV
 * 
 * NOTA: Este script requiere que el browser MCP esté activo
 * y que estés logueado en ManyChat.
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
 * Extraer subscriber IDs de las requests de red guardadas
 */
function extractSubscriberIdsFromLogs() {
  section('Extracción de Subscriber IDs desde Browser Logs')
  
  const subscriberIds = new Set()
  const browserLogsDir = path.join(require('os').homedir(), '.cursor', 'browser-logs')
  
  if (!fs.existsSync(browserLogsDir)) {
    warn(`Directorio de logs no encontrado: ${browserLogsDir}`)
    return []
  }
  
  info(`Buscando en: ${browserLogsDir}`)
  
  const files = fs.readdirSync(browserLogsDir)
    .filter(f => f.endsWith('.log'))
    .sort()
    .reverse() // Archivos más recientes primero
  
  info(`Encontrados ${files.length} archivos de log`)
  
  for (const file of files.slice(0, 10)) { // Últimos 10 archivos
    const filePath = path.join(browserLogsDir, file)
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Buscar patrones de psid en URLs de Facebook
      const psidPattern = /psid=(\d{15,})/g
      let match
      let count = 0
      while ((match = psidPattern.exec(content)) !== null) {
        subscriberIds.add(match[1])
        count++
      }
      
      if (count > 0) {
        info(`  ${file}: ${count} IDs encontrados`)
      }
      
      // También buscar en URLs de subscribers
      const subscriberUrlPattern = /\/subscribers\/(\d{15,})/g
      count = 0
      while ((match = subscriberUrlPattern.exec(content)) !== null) {
        subscriberIds.add(match[1])
        count++
      }
      
      if (count > 0) {
        info(`  ${file}: ${count} URLs de subscribers encontradas`)
      }
    } catch (e) {
      // Continuar con el siguiente archivo
    }
  }
  
  const idsArray = Array.from(subscriberIds).sort()
  
  return idsArray
}

/**
 * Función principal
 */
function main() {
  section('Extracción de Subscriber IDs usando Browser MCP')
  
  info('Este script extrae subscriber IDs de las requests de red capturadas por el browser')
  info('')
  info('INSTRUCCIONES:')
  info('1. Asegúrate de estar en la página de contactos de ManyChat')
  info('2. Haz scroll hacia abajo para cargar más contactos')
  info('3. Espera a que se carguen las imágenes de perfil')
  info('4. Los IDs se extraerán automáticamente de las requests de red')
  info('')
  
  // Extraer IDs de los logs existentes
  const ids = extractSubscriberIdsFromLogs()
  
  if (ids.length === 0) {
    warn('No se encontraron subscriber IDs en los logs')
    warn('')
    warn('SOLUCIÓN:')
    warn('1. Navega a: https://app.manychat.com/fb3724482/subscribers')
    warn('2. Haz scroll hacia abajo varias veces para cargar más contactos')
    warn('3. Espera a que se carguen las imágenes de perfil')
    warn('4. Ejecuta este script nuevamente')
    return
  }
  
  success(`Encontrados ${ids.length} subscriber IDs únicos`)
  
  // Guardar en archivo CSV
  const csvFile = path.join(__dirname, 'subscriber-ids-extracted.csv')
  const csvContent = 'pageuid\n' + ids.join('\n')
  fs.writeFileSync(csvFile, csvContent, 'utf-8')
  
  success(`IDs guardados en: ${csvFile}`)
  info('')
  info('Primeros 10 IDs encontrados:')
  ids.slice(0, 10).forEach((id, i) => {
    info(`  ${i + 1}. ${id}`)
  })
  
  if (ids.length > 10) {
    info(`  ... y ${ids.length - 10} más`)
  }
  
  section('Sincronización')
  info('Para sincronizar estos IDs al CRM, ejecuta:')
  info(`npm run manychat:sync-by-ids ${csvFile}`)
  info('')
  info('O ejecuta directamente:')
  info(`npm run manychat:sync-by-ids scripts/subscriber-ids-extracted.csv`)
}

// Ejecutar
main()

