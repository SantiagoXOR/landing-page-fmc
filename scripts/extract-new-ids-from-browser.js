/**
 * Script para extraer nuevos subscriber IDs directamente de las requests de red
 * capturadas por el browser MCP
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

section('Extrayendo Nuevos Subscriber IDs desde Browser MCP')

const csvPath = path.join(__dirname, 'subscriber-ids-extracted.csv')

// Leer IDs existentes del CSV
let existingIds = new Set()
if (fs.existsSync(csvPath)) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('pageuid'))
  for (const line of lines) {
    const id = line.trim()
    if (id) {
      existingIds.add(id)
    }
  }
  info(`IDs existentes en CSV: ${existingIds.size}`)
} else {
  warn('CSV no existe, se creará uno nuevo')
}

// Extraer IDs de las requests de red del browser MCP
// Estos son los nuevos IDs que aparecen en las últimas requests
const newIdsFromNetwork = [
  '31390871553892097',
  '24879136728445134',
  '25107358348875329',
  '25242146572122384',
  '32495300456782925',
  '25382997994667989',
  '25545255828445615',
  '24615792234766476',
  '31515374521410514',
  '25078073781850186',
  '9438065136317253',
  '24646584518348020',
  '25083995984584325',
  '24976822521969272',
  '25711796605070583',
  '24644962781848011',
  '24773456869021581',
  '25086463947679297',
  '25359571610345110',
  '25297217843266757',
  '24782258684808369',
  '25009314332044501',
]

// Agregar nuevos IDs al conjunto
const allIds = new Set(existingIds)
let newIdsCount = 0

for (const id of newIdsFromNetwork) {
  if (!allIds.has(id)) {
    allIds.add(id)
    newIdsCount++
  }
}

if (newIdsCount > 0) {
  success(`Se encontraron ${newIdsCount} nuevos IDs`)
  
  // Escribir todos los IDs al CSV
  const csvLines = ['pageuid', ...Array.from(allIds).sort()]
  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf-8')
  
  success(`CSV actualizado con ${allIds.size} IDs totales`)
  info(`Archivo guardado en: ${csvPath}`)
} else {
  warn('No se encontraron nuevos IDs')
  info(`Total de IDs en CSV: ${allIds.size}`)
}




