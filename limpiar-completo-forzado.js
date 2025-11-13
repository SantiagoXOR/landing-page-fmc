/**
 * Script para limpiar COMPLETAMENTE la base de datos de forma forzada
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
      'Prefer': 'return=representation',
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

async function limpiarCompletoForzado() {
  try {
    console.log('🧹 LIMPIEZA COMPLETA FORZADA DE LA BASE DE DATOS...\n');
    
    // 1. Obtener todos los leads existentes
    console.log('📊 Paso 1: Obteniendo todos los leads existentes...');
    const leadsExistentes = await supabaseRequest('/Lead?select=id');
    console.log(`   Encontrados: ${leadsExistentes.length} leads\n`);
    
    if (leadsExistentes.length === 0) {
      console.log('✅ La base de datos ya está vacía');
      return;
    }
    
    // 2. Eliminar en lotes para evitar timeouts
    console.log('🗑️  Paso 2: Eliminando todos los leads en lotes...');
    const BATCH_SIZE = 100;
    let eliminados = 0;
    
    for (let i = 0; i < leadsExistentes.length; i += BATCH_SIZE) {
      const lote = leadsExistentes.slice(i, i + BATCH_SIZE);
      const ids = lote.map(lead => lead.id);
      
      try {
        // Eliminar usando filtro por IDs
        const idsString = ids.map(id => `"${id}"`).join(',');
        await fetch(`${SUPABASE_URL}/rest/v1/Lead?id=in.(${idsString})`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal'
          }
        });
        
        eliminados += lote.length;
        console.log(`   ✅ Eliminados ${eliminados}/${leadsExistentes.length} leads...`);
        
        // Pausa pequeña para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Error eliminando lote ${i}-${i + BATCH_SIZE}:`, error.message);
      }
    }
    
    // 3. Verificar que la base de datos esté vacía
    console.log('\n🔍 Paso 3: Verificando que la base de datos esté completamente vacía...');
    const verificacion = await supabaseRequest('/Lead?select=count');
    
    if (verificacion && verificacion.length > 0) {
      console.log(`⚠️  Aún quedan ${verificacion.length} leads. Intentando eliminación individual...`);
      
      // Eliminación individual como último recurso
      for (const lead of verificacion) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/Lead?id=eq.${lead.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Prefer': 'return=minimal'
            }
          });
        } catch (error) {
          console.error(`   ❌ Error eliminando lead ${lead.id}:`, error.message);
        }
      }
    }
    
    // 4. Verificación final
    const verificacionFinal = await supabaseRequest('/Lead?select=id');
    
    console.log(`\n🎉 LIMPIEZA COMPLETADA!`);
    console.log(`📊 Leads restantes: ${verificacionFinal.length}`);
    
    if (verificacionFinal.length === 0) {
      console.log('✅ BASE DE DATOS COMPLETAMENTE LIMPIA');
      console.log('🚀 Lista para importar SOLO los 213 registros válidos del CSV');
    } else {
      console.log('⚠️  Aún quedan algunos registros. Puede ser necesario limpiar manualmente.');
      console.log('📋 IDs restantes:', verificacionFinal.map(l => l.id).slice(0, 10));
    }
    
  } catch (error) {
    console.error('💥 Error en la limpieza forzada:', error);
  }
}

limpiarCompletoForzado();
