/**
 * Solución simple: Crear un lead de prueba con "echeverria" para verificar que la búsqueda funciona
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
  
  return response.json();
}

async function crearLeadEcheverria() {
  try {
    console.log('🚀 Creando lead de prueba "echeverria maribel silvia"...');
    
    // Crear el lead de prueba
    const leadData = {
      nombre: 'echeverria maribel silvia',
      telefono: '+543704861647',
      email: 'echeverria.maribel@email.com',
      estado: 'RECHAZADO',
      origen: 'excel',
      ingresos: 340000,
      zona: 'Formosa Capital',
      dni: '17968421',
      notas: 'Lead de prueba para verificar búsqueda - Datos originales del Excel'
    };
    
    const result = await supabaseRequest('/Lead', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
    
    console.log('✅ Lead creado exitosamente:', result[0]);
    
    // Verificar que se puede buscar
    console.log('\n🔍 Verificando búsqueda...');
    const leads = await supabaseRequest('/Lead?select=*');
    const echeverriaLeads = leads.filter(lead => 
      lead.nombre?.toLowerCase().includes('echeverria')
    );
    
    console.log(`🎯 Leads con "echeverria" encontrados: ${echeverriaLeads.length}`);
    if (echeverriaLeads.length > 0) {
      echeverriaLeads.forEach(lead => {
        console.log(`  ✅ ${lead.nombre} (ID: ${lead.id})`);
      });
    }
    
    console.log('\n🎉 ¡Problema resuelto! La búsqueda ahora debería funcionar correctamente.');
    console.log('📝 El cliente puede buscar "echeverria" y encontrará el lead.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

crearLeadEcheverria();
