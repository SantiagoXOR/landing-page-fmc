/**
 * Script para extraer los últimos subscriber IDs de las requests de red
 * capturadas por el browser MCP y agregarlos al CSV existente
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

// Extraer todos los psid de las requests de red capturadas
// Estos son los nuevos IDs que aparecen en las últimas requests del browser MCP
const networkRequests = [
  // IDs de las nuevas requests capturadas
  '25459015443710917',
  '25247827888241687',
  '25089507644068143',
  '24951955477837950',
  '24956095550752576',
  '25414036311541865',
  '25048318031427019',
  '25149820188005184',
  '25756659997259890',
  '25883253061272067',
  '32766266783016526',
  '25445038855092796',
  '25152061731129736',
  '25662046176732568',
  '33728292926769929',
  '32386909084256603',
  '25129733460002168',
  '32541082412205716',
  '25019332834375717',
  '25514942561458591',
  '9775923315865535',
  '33124317813849061',
  '32450582731251626',
  '24503584665981805',
  '25169703489347796',
  '25612315761726595',
  '32519534807692083',
  '25035623132726594',
  '25079995944983383',
  '25700984036198360',
  '25008165382183217',
  '33316279041292515',
  '9421976107926481',
  '32040667358857374',
  '25017951127876044',
  '25354509097514527',
  '27158650510438437',
  '25189623967366838',
  '24968276479492212',
  '33198777299706021',
  '23999165553108405',
  '25551777851092700',
  '25117173591300136',
  '25071561799160757',
  '25535578066067637',
  '9455136634610592',
  '25550551021247238',
  '24669292799417208',
  '24447970711544880',
  '24808918318780428',
  '25483477674617236',
  '25400789776253408',
  '32832950433018917',
  '25483275197978848',
  '25039233755686975',
  '25681610908103704',
  '24925835970448700',
  '32912291621717871',
  '24411565351849624',
  '25840517895553262',
  '25356073324083901',
  '25089285387430302',
  '24818901364476464',
  '25213042115002607',
  '24184478994528604',
  '25239947868993429',
  '32456203903994641',
  '24225045017171928',
  '25664781093127386',
  '24110991511895221',
  '25539791548965708',
  '24873318062339832',
  '25404891085810853',
  '25004932755795418',
  '25098573743146638',
  '33558737397059080',
  '25204275755892054',
  '24941932935506207',
  '25288870094101239',
  '25570446659227466',
  '25271233119153717',
  '25457904593806358',
  '32491848803796481',
  '25229882043307088',
  '25126991623618617',
  '24193355507007599',
  '24890588897300387',
  '24531474659861893',
]

// Agregar nuevos IDs al conjunto
const allIds = new Set(existingIds)
let newIdsCount = 0

for (const id of networkRequests) {
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
