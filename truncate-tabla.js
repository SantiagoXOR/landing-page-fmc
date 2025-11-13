/**
 * Script para hacer TRUNCATE de la tabla Lead usando RPC
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function truncateTabla() {
  try {
    console.log('🗑️  Intentando limpiar tabla Lead usando diferentes métodos...\n');
    
    // Método 1: Eliminar usando condición que siempre es verdadera
    console.log('📋 Método 1: DELETE con condición universal...');
    try {
      const response1 = await fetch(`${SUPABASE_URL}/rest/v1/Lead?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      
      if (response1.ok) {
        console.log('✅ Método 1 exitoso');
      } else {
        console.log(`❌ Método 1 falló: ${response1.status}`);
      }
    } catch (error) {
      console.log(`❌ Método 1 error: ${error.message}`);
    }
    
    // Método 2: Eliminar usando fecha
    console.log('\n📋 Método 2: DELETE con filtro por fecha...');
    try {
      const response2 = await fetch(`${SUPABASE_URL}/rest/v1/Lead?createdAt=gte.2020-01-01`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      
      if (response2.ok) {
        console.log('✅ Método 2 exitoso');
      } else {
        console.log(`❌ Método 2 falló: ${response2.status}`);
      }
    } catch (error) {
      console.log(`❌ Método 2 error: ${error.message}`);
    }
    
    // Método 3: Eliminar por origen
    console.log('\n📋 Método 3: DELETE por origen...');
    try {
      // Eliminar todos los de origen 'csv'
      const response3a = await fetch(`${SUPABASE_URL}/rest/v1/Lead?origen=eq.csv`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      
      // Eliminar todos los de origen 'excel'
      const response3b = await fetch(`${SUPABASE_URL}/rest/v1/Lead?origen=eq.excel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      
      // Eliminar todos los que no tienen origen
      const response3c = await fetch(`${SUPABASE_URL}/rest/v1/Lead?origen=is.null`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      
      console.log(`✅ Método 3 completado (csv: ${response3a.status}, excel: ${response3b.status}, null: ${response3c.status})`);
    } catch (error) {
      console.log(`❌ Método 3 error: ${error.message}`);
    }
    
    // Verificación final
    console.log('\n🔍 Verificación final...');
    const verificacion = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=count`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (verificacion.ok) {
      const data = await verificacion.json();
      console.log(`📊 Leads restantes: ${data.length}`);
      
      if (data.length === 0) {
        console.log('🎉 ¡TABLA COMPLETAMENTE LIMPIA!');
      } else {
        console.log('⚠️  Aún quedan registros. Intentando eliminación manual...');
        
        // Obtener los IDs restantes y eliminarlos uno por uno
        const restantes = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=id&limit=50`, {
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          }
        });
        
        if (restantes.ok) {
          const idsRestantes = await restantes.json();
          console.log(`🎯 Eliminando ${idsRestantes.length} registros restantes individualmente...`);
          
          for (const lead of idsRestantes) {
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
              console.error(`   ❌ Error eliminando ${lead.id}: ${error.message}`);
            }
          }
          
          // Verificación final final
          const verificacionFinalFinal = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=count`, {
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            }
          });
          
          if (verificacionFinalFinal.ok) {
            const dataFinal = await verificacionFinalFinal.json();
            console.log(`\n🏁 RESULTADO FINAL: ${dataFinal.length} leads restantes`);
            
            if (dataFinal.length === 0) {
              console.log('🎉 ¡TABLA COMPLETAMENTE LIMPIA!');
              console.log('🚀 Lista para importar SOLO los 213 registros válidos del CSV');
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error en truncate:', error);
  }
}

truncateTabla();
