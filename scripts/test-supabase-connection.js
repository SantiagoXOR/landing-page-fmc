/**
 * Script para verificar la conexión directa a Supabase y contar leads
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw';

async function testSupabaseConnection() {
  console.log('🔍 Verificando conexión a Supabase...');
  console.log('URL:', SUPABASE_URL);
  console.log('Service Key:', SERVICE_ROLE_KEY ? 'Configurada' : 'No configurada');

  try {
    // Probar conexión básica
    const url = `${SUPABASE_URL}/rest/v1/Lead?select=count`;
    
    console.log('📡 Consultando:', url);
    
    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status:', response.status);
    console.log('📊 Status Text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Respuesta exitosa:', data);

    // Intentar contar leads
    const countUrl = `${SUPABASE_URL}/rest/v1/Lead?select=*&limit=5`;
    console.log('📡 Consultando leads:', countUrl);
    
    const leadsResponse = await fetch(countUrl, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (leadsResponse.ok) {
      const leads = await leadsResponse.json();
      console.log('📋 Primeros 5 leads:', leads);
      console.log('📊 Total de leads encontrados:', leads.length);
    } else {
      const errorText = await leadsResponse.text();
      console.error('❌ Error consultando leads:', errorText);
    }

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

// Ejecutar el test
testSupabaseConnection().catch(console.error);
