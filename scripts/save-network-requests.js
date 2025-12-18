/**
 * Script para guardar network requests del browser MCP en formato JSON
 * 
 * Este script toma las network requests capturadas y las guarda en un archivo
 * para ser procesadas posteriormente por extract-all-ids-complete.js
 */

const fs = require('fs');
const path = require('path');

// Función para guardar network requests
function saveNetworkRequests(requests, outputFile = 'network-requests-captured.json') {
  const outputPath = path.join(__dirname, outputFile);
  
  // Guardar como JSON formateado
  fs.writeFileSync(outputPath, JSON.stringify(requests, null, 2), 'utf-8');
  
  console.log('✓ Network requests guardadas exitosamente');
  console.log('  Archivo:', outputPath);
  console.log('  Total de requests:', requests.length);
  
  // Contar requests por tipo
  const types = {};
  requests.forEach(req => {
    const type = req.resourceType || 'unknown';
    types[type] = (types[type] || 0) + 1;
  });
  
  console.log('\n  Requests por tipo:');
  Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });
  
  return outputPath;
}

// Si se ejecuta directamente, pedir el archivo de entrada
if (require.main === module) {
  console.log('Este script debe ser llamado desde el AI con los datos del browser MCP');
  console.log('O puedes pasar las network requests como argumento JSON en stdin');
  
  // Si hay input en stdin, procesarlo
  if (!process.stdin.isTTY) {
    let data = '';
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      try {
        const requests = JSON.parse(data);
        saveNetworkRequests(requests);
      } catch (e) {
        console.error('Error parseando JSON:', e.message);
        process.exit(1);
      }
    });
  }
}

module.exports = { saveNetworkRequests };














