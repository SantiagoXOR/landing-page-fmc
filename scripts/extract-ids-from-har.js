/**
 * Script para extraer subscriber IDs desde un archivo HAR (HTTP Archive)
 * 
 * Este script procesa archivos HAR exportados desde las DevTools del navegador
 * para extraer TODOS los subscriber IDs de todas las network requests.
 * 
 * USO:
 * 1. En ManyChat, abre las DevTools (F12)
 * 2. Ve a la pestaña "Network" (Red)
 * 3. Haz scroll para cargar todos los contactos
 * 4. Clic derecho en la lista de requests > "Save all as HAR with content"
 * 5. Guarda como "manychat-network.har"
 * 6. Ejecuta: node scripts/extract-ids-from-har.js manychat-network.har
 */

const fs = require('fs');
const path = require('path');

// Colores
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

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function warn(message) {
  log(`⚠ ${message}`, 'yellow');
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

/**
 * Extrae subscriber IDs de un archivo HAR
 */
function extractIdsFromHAR(harFile) {
  section('Extracción de IDs desde archivo HAR');
  
  // Leer archivo HAR
  info(`Leyendo archivo: ${harFile}`);
  const harContent = JSON.parse(fs.readFileSync(harFile, 'utf-8'));
  
  const entries = harContent.log.entries;
  success(`${entries.length} network requests encontradas`);
  
  const subscriberIds = new Set();
  const sources = {
    psid: 0,
    avaPath: 0,
    apiPath: 0,
    queryParams: 0,
    responseData: 0
  };
  
  // Procesar cada entry
  for (const entry of entries) {
    const url = entry.request.url;
    
    // Patrón 1: psid en URLs de Facebook
    const psidMatch = url.match(/[?&]psid=(\d{10,})/i);
    if (psidMatch) {
      subscriberIds.add(psidMatch[1]);
      sources.psid++;
    }
    
    // Patrón 2: /ava/ paths
    const avaMatch = url.match(/\/ava\/\d+\/(\d{10,})\//i);
    if (avaMatch) {
      subscriberIds.add(avaMatch[1]);
      sources.avaPath++;
    }
    
    // Patrón 3: /subscribers/ en API
    const subscriberUrlMatch = url.match(/\/subscribers?\/(\d{10,})/i);
    if (subscriberUrlMatch) {
      subscriberIds.add(subscriberUrlMatch[1]);
      sources.apiPath++;
    }
    
    // Patrón 4: Query parameters
    const idParamMatch = url.match(/[?&](?:id|subscriber_id|contact_id|user_id)=(\d{10,})/i);
    if (idParamMatch) {
      subscriberIds.add(idParamMatch[1]);
      sources.queryParams++;
    }
    
    // Patrón 5: Path con /3724482/{id}/
    const pathIdMatch = url.match(/\/3724482\/(\d{10,})/);
    if (pathIdMatch) {
      subscriberIds.add(pathIdMatch[1]);
      sources.avaPath++;
    }
    
    // Patrón 6: Extraer IDs de las respuestas JSON
    if (entry.response && entry.response.content && entry.response.content.text) {
      try {
        const responseText = entry.response.content.text;
        
        // Si es JSON, parsearlo
        if (entry.response.content.mimeType && entry.response.content.mimeType.includes('json')) {
          const jsonData = JSON.parse(responseText);
          
          // Buscar IDs en diferentes estructuras de datos
          extractIdsFromJSON(jsonData, subscriberIds);
          sources.responseData++;
        } else {
          // Buscar patrones de IDs en texto plano
          const idsInText = responseText.match(/\d{15,20}/g);
          if (idsInText) {
            idsInText.forEach(id => {
              if (id.length >= 15 && id.length <= 20) {
                subscriberIds.add(id);
              }
            });
          }
        }
      } catch (e) {
        // No es JSON o error parseando
      }
    }
  }
  
  info(`\nIDs encontrados por fuente:`);
  info(`  - PSID (Facebook profile pics): ${sources.psid}`);
  info(`  - /ava/ paths (ManyChat avatars): ${sources.avaPath}`);
  info(`  - API paths: ${sources.apiPath}`);
  info(`  - Query parameters: ${sources.queryParams}`);
  info(`  - Response data (JSON): ${sources.responseData}`);
  
  return subscriberIds;
}

/**
 * Extrae IDs recursivamente de objetos JSON
 */
function extractIdsFromJSON(obj, idsSet) {
  if (obj === null || obj === undefined) return;
  
  if (typeof obj === 'object') {
    // Si es array
    if (Array.isArray(obj)) {
      obj.forEach(item => extractIdsFromJSON(item, idsSet));
    } else {
      // Si es objeto
      for (const [key, value] of Object.entries(obj)) {
        // Buscar claves que contengan "id", "subscriber", etc.
        if (/id|subscriber|user|contact|psid|page_?uid/i.test(key)) {
          if (typeof value === 'string' || typeof value === 'number') {
            const strValue = String(value);
            if (/^\d{10,20}$/.test(strValue)) {
              idsSet.add(strValue);
            }
          }
        }
        
        // Recursivo
        extractIdsFromJSON(value, idsSet);
      }
    }
  }
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
    info('Archivo CSV no existe, creando nuevo');
  }
  
  return existingIds;
}

/**
 * Guarda IDs en CSV
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
function main() {
  if (!process.argv[2]) {
    section('Uso del Script');
    info('Este script extrae subscriber IDs desde un archivo HAR');
    info('');
    info('PASOS:');
    info('1. Abre ManyChat en tu navegador');
    info('2. Abre DevTools (F12)');
    info('3. Ve a la pestaña "Network" (Red)');
    info('4. Haz scroll para cargar TODOS los contactos');
    info('5. Clic derecho en la lista > "Save all as HAR with content"');
    info('6. Guarda el archivo en esta carpeta (scripts/)');
    info('');
    info('EJECUTA:');
    info('node scripts/extract-ids-from-har.js manychat-network.har');
    info('');
    process.exit(0);
  }
  
  const harFile = process.argv[2];
  
  if (!fs.existsSync(harFile)) {
    error(`Archivo no encontrado: ${harFile}`);
    process.exit(1);
  }
  
  try {
    // Extraer IDs del HAR
    const newIds = extractIdsFromHAR(harFile);
    success(`${newIds.size} IDs únicos extraídos del HAR`);
    
    // Leer IDs existentes
    const csvFile = path.join(__dirname, 'subscriber-ids-extracted.csv');
    const existingIds = readExistingIds(csvFile);
    info(`${existingIds.size} IDs existentes en CSV`);
    
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
    success(`Total de ${idsArray.length} IDs guardados`);
    
    // Resumen
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
    
  } catch (e) {
    error(`Error procesando HAR: ${e.message}`);
    console.error(e);
    process.exit(1);
  }
}

main();


