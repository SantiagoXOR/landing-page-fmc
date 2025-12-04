/**
 * Script para extraer TODOS los subscriber IDs de las requests de red
 * capturadas por el browser MCP, incluyendo psid y user_id/subscriptionId
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

section('Extrayendo TODOS los Subscriber IDs desde Browser MCP')

const csvPath = path.join(__dirname, 'subscriber-ids-extracted.csv')
let existingIds = new Set()

// Leer IDs existentes del CSV
if (fs.existsSync(csvPath)) {
  const content = fs.readFileSync(csvPath, 'utf8')
  const lines = content.split('\n').filter(line => line.trim() !== '')
  if (lines.length > 1) { // Ignorar la cabecera 'pageuid'
        lines.slice(1).forEach(id => existingIds.add(id.trim()))
  }
  info(`Se encontraron ${existingIds.size} IDs existentes en ${csvPath}.`)
} else {
  warn(`El archivo ${csvPath} no existe. Se creará uno nuevo.`)
}

// Array con todas las requests de red capturadas
// Este array debe ser actualizado con el resultado completo de browser_network_requests
const networkRequests = [
  // Las requests se agregarán aquí desde el resultado de browser_network_requests
]

const newIds = new Set()

// Procesar todas las requests de red
networkRequests.forEach(request => {
  const url = request.url || ''
  
  // 1. Extraer psid de URLs de imágenes de perfil de Facebook
  const psidMatch = url.match(/psid=(\d+)/)
  if (psidMatch && psidMatch[1]) {
    const id = psidMatch[1]
    if (!existingIds.has(id)) {
      newIds.add(id)
      info(`Nuevo psid encontrado: ${id}`)
    }
  }
  
  // 2. Extraer user_id de URLs como /subscribers/details?user_id=...
  const userIdMatch = url.match(/user_id=(\d+)/)
  if (userIdMatch && userIdMatch[1]) {
    const id = userIdMatch[1]
    if (!existingIds.has(id)) {
      newIds.add(id)
      info(`Nuevo user_id encontrado: ${id}`)
    }
  }
  
  // 3. Extraer IDs de URLs como /subscribers/1234567890
  const subscriberUrlMatch = url.match(/\/subscribers\/(\d{10,})/)
  if (subscriberUrlMatch && subscriberUrlMatch[1]) {
    const id = subscriberUrlMatch[1]
    if (!existingIds.has(id)) {
      newIds.add(id)
      info(`Nuevo subscriber ID encontrado en URL: ${id}`)
    }
  }
  
  // 4. Buscar subscriptionId en la URL (si existe)
  const subscriptionIdMatch = url.match(/subscriptionId[=:](\d+)/i)
  if (subscriptionIdMatch && subscriptionIdMatch[1]) {
    const id = subscriptionIdMatch[1]
    if (!existingIds.has(id)) {
      newIds.add(id)
      info(`Nuevo subscriptionId encontrado: ${id}`)
    }
  }
})

if (newIds.size > 0) {
  info(`Se encontraron ${newIds.size} nuevos IDs.`)
  const newIdsArray = Array.from(newIds).sort()
  const output = newIdsArray.join('\n') + '\n'

  fs.appendFileSync(csvPath, output, 'utf8')
  newIdsArray.forEach(id => existingIds.add(id)) // Actualizar el set de IDs existentes
  success(`Se agregaron ${newIds.size} nuevos IDs a ${csvPath}. Total de IDs: ${existingIds.size}`)
  
  // Mostrar los nuevos IDs encontrados
  log('\nNuevos IDs encontrados:', 'cyan')
  newIdsArray.forEach(id => log(`  - ${id}`, 'cyan'))
} else {
  warn('No se encontraron nuevos IDs en las requests de red.')
}

log('\nScript finalizado.', 'cyan')
info(`Total de IDs únicos en el CSV: ${existingIds.size}`)






