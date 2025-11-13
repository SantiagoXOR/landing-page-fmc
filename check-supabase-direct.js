/**
 * Script para verificar directamente en Supabase si existe el lead "echeverria"
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function checkEcheverriaInSupabase() {
  try {
    console.log('🔍 Verificando lead "echeverria" directamente en Supabase...');
    
    // Obtener todos los leads
    const url = `${SUPABASE_URL}/rest/v1/Lead?select=*&order=createdAt.desc`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const leads = await response.json();
    console.log(`📊 Total de leads en Supabase: ${leads.length}`);
    
    // Buscar leads que contengan 'echeverria'
    const echeverriaLeads = leads.filter(lead => 
      lead.nombre?.toLowerCase().includes('echeverria')
    );
    
    console.log(`🎯 Leads con "echeverria": ${echeverriaLeads.length}`);
    
    if (echeverriaLeads.length > 0) {
      console.log('📋 Leads encontrados:');
      echeverriaLeads.forEach(lead => {
        console.log('  - ID:', lead.id);
        console.log('  - Nombre:', lead.nombre);
        console.log('  - Teléfono:', lead.telefono);
        console.log('  - Estado:', lead.estado);
        console.log('  - Fecha creación:', lead.createdAt);
        console.log('  ---');
      });
    } else {
      console.log('❌ No se encontraron leads con "echeverria"');
      
      // Mostrar algunos nombres de ejemplo para verificar formato
      console.log('📝 Primeros 10 nombres en la base de datos:');
      leads.slice(0, 10).forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.nombre} (ID: ${lead.id})`);
      });
      
      // Buscar nombres que contengan partes de "echeverria"
      console.log('\n🔍 Buscando nombres similares...');
      const similares = leads.filter(lead => 
        lead.nombre?.toLowerCase().includes('eche') ||
        lead.nombre?.toLowerCase().includes('verria') ||
        lead.nombre?.toLowerCase().includes('maribel') ||
        lead.nombre?.toLowerCase().includes('silvia')
      );
      
      if (similares.length > 0) {
        console.log(`📋 Nombres similares encontrados (${similares.length}):`);
        similares.forEach(lead => {
          console.log(`  - ${lead.nombre}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEcheverriaInSupabase();
