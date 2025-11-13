/**
 * Script para probar las mismas credenciales que usa la aplicación
 */

// Cargar variables de entorno como lo hace Next.js
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Probando credenciales de la aplicación...');
console.log('URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'MISSING');
console.log('Key:', SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.substring(0, 20) + '...' : 'MISSING');

async function testAppCredentials() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Credenciales faltantes');
    console.log('SUPABASE_URL:', !!SUPABASE_URL);
    console.log('SERVICE_ROLE_KEY:', !!SERVICE_ROLE_KEY);
    return;
  }

  try {
    // Usar exactamente la misma consulta que el servicio
    const url = `${SUPABASE_URL}/rest/v1/Lead?select=*&order=createdAt.desc`;
    
    console.log('\n📋 Haciendo consulta exacta del servicio...');
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    console.log('\n📊 Respuesta:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Datos obtenidos:');
      console.log('Total leads:', data.length);
      
      if (data.length > 0) {
        console.log('\n📝 Primeros 3 leads:');
        data.slice(0, 3).forEach((lead, index) => {
          console.log(`   ${index + 1}. ${lead.nombre} - ${lead.estado} - ${lead.zona || 'Sin zona'}`);
        });

        // Contar por estado
        const estadoCounts = {};
        data.forEach(lead => {
          const estado = lead.estado || 'SIN_ESTADO';
          estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });
        
        console.log('\n📊 Distribución por estado:');
        Object.entries(estadoCounts).forEach(([estado, count]) => {
          console.log(`   ${estado}: ${count}`);
        });
      } else {
        console.log('⚠️ No se encontraron leads');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Error:', response.status, errorText);
    }

    // También probar con count
    console.log('\n🔢 Probando count...');
    const countUrl = `${SUPABASE_URL}/rest/v1/Lead?select=count`;
    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });

    console.log('Count Status:', countResponse.status);
    if (countResponse.ok) {
      const countData = await countResponse.json();
      console.log('Count Result:', countData);
    }

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

// Ejecutar la prueba
testAppCredentials().catch(console.error);
