/**
 * Script para limpiar la base de datos e importar desde CSV con nombres correctos
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  return response.status === 204 ? null : response.json();
}

async function limpiarEImportarDesdeCSV() {
  try {
    console.log('🚀 Iniciando limpieza e importación desde CSV...');
    
    // 1. Limpiar base de datos
    console.log('🗑️  Eliminando todos los leads existentes...');
    await supabaseRequest('/Lead', {
      method: 'DELETE',
      headers: {
        'Prefer': 'return=minimal'
      }
    });
    console.log('✅ Base de datos limpiada');
    
    // 2. Ejecutar el script de importación mejorado
    console.log('📥 Ejecutando importación desde CSV...');
    
    // Importar el módulo corregido
    const { importarLeadsDesdeCSV } = require('./scripts/import-leads-improved.js');
    
    // Ejecutar la importación
    await importarLeadsDesdeCSV();
    
    console.log('\n🎉 Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
  }
}

limpiarEImportarDesdeCSV();
