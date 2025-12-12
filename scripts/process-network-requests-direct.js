/**
 * Script para procesar directamente las requests de red del browser MCP
 * y extraer todos los subscriber IDs únicos
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

section('Procesando Requests de Red del Browser MCP')

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

// Extraer todos los psid de las URLs de las requests de red
// Buscar patrones como: psid=12345678901234567
const psidPattern = /psid=(\d+)/g
const extractedIds = new Set()

// URLs de ejemplo de las requests de red capturadas (estas deberían venir del browser MCP)
// Por ahora, voy a extraer directamente de las requests que obtuve
const sampleUrls = [
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25459015443710917',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25247827888241687',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25169703489347796',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25612315761726595',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32519534807692083',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25035623132726594',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25079995944983383',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25700984036198360',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25008165382183217',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=33316279041292515',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=9421976107926481',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32040667358857374',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25017951127876044',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25354509097514527',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=27158650510438437',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25189623967366838',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24968276479492212',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=33198777299706021',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=23999165553108405',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25551777851092700',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25117173591300136',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25071561799160757',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25535578066067637',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=9455136634610592',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25550551021247238',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24669292799417208',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24447970711544880',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24808918318780428',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25483477674617236',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25400789776253408',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32832950433018917',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25483275197978848',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25039233755686975',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25681610908103704',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24925835970448700',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32912291621717871',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24411565351849624',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25840517895553262',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25356073324083901',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25089285387430302',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24818901364476464',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25213042115002607',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24184478994528604',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25239947868993429',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32456203903994641',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24225045017171928',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25664781093127386',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24110991511895221',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25539791548965708',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24873318062339832',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25404891085810853',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25004932755795418',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25098573743146638',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=33558737397059080',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25204275755892054',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24941932935506207',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25288870094101239',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25570446659227466',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25271233119153717',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25457904593806358',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32491848803796481',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25229882043307088',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=25126991623618617',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24193355507007599',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24890588897300387',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=24531474659861893',
  'https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32729015740047628',
]

// Extraer IDs de las URLs
for (const url of sampleUrls) {
  const matches = url.match(psidPattern)
  if (matches) {
    for (const match of matches) {
      const id = match.replace('psid=', '')
      extractedIds.add(id)
    }
  }
}

info(`IDs extraídos de las requests: ${extractedIds.size}`)

// Agregar nuevos IDs al conjunto existente
const allIds = new Set(existingIds)
let newIdsCount = 0

for (const id of extractedIds) {
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











