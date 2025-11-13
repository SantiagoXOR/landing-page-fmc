/**
 * Script para verificar políticas RLS y contar leads reales
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw';

async function checkRLSAndData() {
  console.log('🔍 Verificando RLS y datos reales...');

  try {
    // 1. Intentar contar todos los leads sin filtros
    console.log('\n📊 Contando leads sin filtros...');
    const countUrl = `${SUPABASE_URL}/rest/v1/Lead?select=count`;
    
    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    console.log(`Status: ${countResponse.status}`);
    console.log(`Headers:`, Object.fromEntries(countResponse.headers.entries()));

    if (countResponse.ok) {
      const countData = await countResponse.json();
      console.log(`✅ Respuesta de count:`, countData);
    } else {
      const errorText = await countResponse.text();
      console.log(`❌ Error en count:`, errorText);
    }

    // 2. Intentar obtener todos los leads
    console.log('\n📋 Obteniendo todos los leads...');
    const allLeadsUrl = `${SUPABASE_URL}/rest/v1/Lead?select=*`;
    
    const allLeadsResponse = await fetch(allLeadsUrl, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${allLeadsResponse.status}`);
    
    if (allLeadsResponse.ok) {
      const allLeads = await allLeadsResponse.json();
      console.log(`✅ Total de leads obtenidos: ${allLeads.length}`);
      
      if (allLeads.length > 0) {
        console.log(`📝 Primeros 3 leads:`);
        allLeads.slice(0, 3).forEach((lead, index) => {
          console.log(`   ${index + 1}. ${lead.nombre} - ${lead.estado} - ${lead.zona || 'Sin zona'}`);
        });

        // Contar por estado
        const estadoCounts = {};
        allLeads.forEach(lead => {
          const estado = lead.estado || 'SIN_ESTADO';
          estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });
        
        console.log(`📊 Distribución por estado:`);
        Object.entries(estadoCounts).forEach(([estado, count]) => {
          console.log(`   ${estado}: ${count}`);
        });
      }
    } else {
      const errorText = await allLeadsResponse.text();
      console.log(`❌ Error obteniendo leads:`, errorText);
    }

    // 3. Verificar si RLS está habilitado
    console.log('\n🔒 Verificando estado de RLS...');
    const rlsUrl = `${SUPABASE_URL}/rest/v1/rpc/check_rls_status`;
    
    try {
      const rlsResponse = await fetch(rlsUrl, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table_name: 'Lead' })
      });

      if (rlsResponse.ok) {
        const rlsData = await rlsResponse.json();
        console.log(`✅ Estado de RLS:`, rlsData);
      } else {
        console.log(`⚠️ No se pudo verificar RLS (función no existe)`);
      }
    } catch (error) {
      console.log(`⚠️ Error verificando RLS: ${error.message}`);
    }

    // 4. Intentar con diferentes headers para bypass RLS
    console.log('\n🔓 Intentando bypass RLS con service role...');
    const bypassUrl = `${SUPABASE_URL}/rest/v1/Lead?select=count`;
    
    const bypassResponse = await fetch(bypassUrl, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Role': 'service_role',
        'Prefer': 'count=exact'
      }
    });

    console.log(`Status con service role: ${bypassResponse.status}`);
    
    if (bypassResponse.ok) {
      const bypassData = await bypassResponse.json();
      console.log(`✅ Datos con service role:`, bypassData);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la verificación
checkRLSAndData().catch(console.error);
