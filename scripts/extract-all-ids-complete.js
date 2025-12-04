const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

/**
 * Extrae subscriber IDs de múltiples fuentes y patrones
 */
function extractAllSubscriberIds(networkRequests) {
  const subscriberIds = new Set();
  const sources = {
    psid: 0,
    avaPath: 0,
    apiPath: 0,
    queryParams: 0
  };
  
  info(`Analizando ${networkRequests.length} network requests...`);
  
  for (const request of networkRequests) {
    const url = request.url || '';
    
    // Patrón 1: psid en URLs de imágenes de perfil de Facebook
    // https://platform-lookaside.fbsbx.com/platform/profilepic/?psid=32640609408919422
    const psidMatch = url.match(/[?&]psid=(\d{10,})/i);
    if (psidMatch) {
      subscriberIds.add(psidMatch[1]);
      sources.psid++;
    }
    
    // Patrón 2: URLs /ava/ de ManyChat
    // https://app.manychat.com/ava/3724482/25662046176732568/8bf1e905fa8ddb1194e779de32c9acca
    const avaMatch = url.match(/\/ava\/\d+\/(\d{10,})\//i);
    if (avaMatch) {
      subscriberIds.add(avaMatch[1]);
      sources.avaPath++;
    }
    
    // Patrón 3: subscriber IDs en URLs de la API
    // https://app.manychat.com/fb3724482/subscribers/25541058665519003
    const subscriberUrlMatch = url.match(/\/subscribers?\/(\d{10,})/i);
    if (subscriberUrlMatch) {
      subscriberIds.add(subscriberUrlMatch[1]);
      sources.apiPath++;
    }
    
    // Patrón 4: IDs en parámetros de query
    const idParamMatch = url.match(/[?&](?:id|subscriber_id|contact_id|user_id)=(\d{10,})/i);
    if (idParamMatch) {
      subscriberIds.add(idParamMatch[1]);
      sources.queryParams++;
    }
    
    // Patrón 5: IDs en el path de avatares
    // /3724482/25662046176732568/
    const pathIdMatch = url.match(/\/3724482\/(\d{10,})/);
    if (pathIdMatch) {
      subscriberIds.add(pathIdMatch[1]);
      sources.avaPath++;
    }
  }
  
  info(`\nIDs encontrados por fuente:`);
  info(`  - PSID (Facebook profile pics): ${sources.psid}`);
  info(`  - /ava/ paths (ManyChat avatars): ${sources.avaPath}`);
  info(`  - API paths: ${sources.apiPath}`);
  info(`  - Query parameters: ${sources.queryParams}`);
  
  return subscriberIds;
}

/**
 * Lee IDs existentes del CSV
 */
function readExistingIds(csvFile) {
  const existingIds = new Set();
  
  try {
    if (fs.existsSync(csvFile)) {
      const content = fs.readFileSync(csvFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line === 'pageuid') continue;
        const id = line.trim();
        if (id && /^\d{10,}$/.test(id)) {
          existingIds.add(id);
        }
      }
    }
  } catch (e) {
    info(`Archivo no existe o está vacío, creando nuevo`);
  }
  
  return existingIds;
}

/**
 * Guarda los IDs en CSV
 */
function saveToCSV(subscriberIds, csvFile) {
  const idsArray = Array.from(subscriberIds).sort();
  const csvContent = 'pageuid\n' + idsArray.join('\n');
  fs.writeFileSync(csvFile, csvContent, 'utf-8');
  return idsArray;
}

/**
 * Proceso principal
 */
function processNetworkRequests(networkRequestsFile) {
  section('Extracción Completa de Subscriber IDs');
  
  // Leer network requests
  info(`Leyendo archivo: ${networkRequestsFile}`);
  const networkRequests = JSON.parse(fs.readFileSync(networkRequestsFile, 'utf-8'));
  success(`${networkRequests.length} network requests cargadas`);
  
  // Extraer IDs
  const newIds = extractAllSubscriberIds(networkRequests);
  success(`${newIds.size} IDs únicos extraídos de las requests`);
  
  // Leer IDs existentes
  const csvFile = path.join(__dirname, 'subscriber-ids-extracted.csv');
  const existingIds = readExistingIds(csvFile);
  info(`${existingIds.size} IDs existentes en el CSV`);
  
  // Combinar
  const allIds = new Set([...existingIds, ...newIds]);
  const newCount = allIds.size - existingIds.size;
  
  if (newCount > 0) {
    success(`${newCount} IDs nuevos encontrados`);
  } else {
    info('No se encontraron IDs nuevos');
  }
  
  // Guardar
  const idsArray = saveToCSV(allIds, csvFile);
  success(`Total de ${idsArray.length} IDs guardados en: ${csvFile}`);
  
  // Mostrar resumen
  section('Resumen Final');
  success(`Total de IDs únicos: ${idsArray.length}`);
  success(`IDs nuevos agregados: ${newCount}`);
  success(`IDs existentes: ${existingIds.size}`);
  
  info('\nPrimeros 20 IDs:');
  idsArray.slice(0, 20).forEach((id, i) => {
    info(`  ${i + 1}. ${id}`);
  });
  
  if (idsArray.length > 20) {
    info(`  ... y ${idsArray.length - 20} más`);
  }
  
  section('Próximos Pasos');
  info('Para sincronizar estos IDs al CRM, ejecuta:');
  info('npm run manychat:sync-by-ids');
  
  return {
    total: idsArray.length,
    new: newCount,
    existing: existingIds.size,
    ids: idsArray
  };
}

// Ejecutar
if (require.main === module) {
  if (!process.argv[2]) {
    console.error('Uso: node extract-all-ids-complete.js <network-requests.json>');
    process.exit(1);
  }
  
  try {
    processNetworkRequests(process.argv[2]);
  } catch (e) {
    log(`✗ Error: ${e.message}`, 'red');
    console.error(e);
    process.exit(1);
  }
}

module.exports = { processNetworkRequests, extractAllSubscriberIds };





