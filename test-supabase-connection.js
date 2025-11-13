/**
 * Test de conectividad con Supabase y verificación de tablas
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw';

async function testSupabaseConnection() {
  console.log('🔍 Probando conectividad con Supabase...\n');

  try {
    // 1. Probar conexión básica
    console.log('1️⃣ Probando conexión básica...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('   ✅ Conexión exitosa');
    } else {
      console.log(`   ❌ Error de conexión: ${response.status}`);
      return;
    }

    // 2. Verificar tabla Lead
    console.log('\n2️⃣ Verificando tabla Lead...');
    const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json();
      const leadsCount = leadsData[0]?.count || 0;
      console.log(`   ✅ Tabla Lead existe: ${leadsCount} registros`);
    } else {
      console.log(`   ❌ Error accediendo tabla Lead: ${leadsResponse.status}`);
    }

    // 3. Verificar tabla lead_pipeline
    console.log('\n3️⃣ Verificando tabla lead_pipeline...');
    const pipelineResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_pipeline?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (pipelineResponse.ok) {
      const pipelineData = await pipelineResponse.json();
      const pipelineCount = pipelineData[0]?.count || 0;
      console.log(`   ✅ Tabla lead_pipeline existe: ${pipelineCount} registros`);
    } else {
      console.log(`   ❌ Tabla lead_pipeline no existe o error: ${pipelineResponse.status}`);
      
      // Intentar crear tabla básica
      console.log('   🔧 Intentando crear tabla lead_pipeline...');
      await createBasicPipelineTable();
    }

    // 4. Probar crear un pipeline de prueba
    console.log('\n4️⃣ Probando creación de pipeline...');
    await testPipelineCreation();

    console.log('\n🎉 Test de conectividad completado');

  } catch (error) {
    console.error('❌ Error en test de conectividad:', error.message);
  }
}

async function createBasicPipelineTable() {
  try {
    // Crear tabla básica usando SQL directo
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS lead_pipeline (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL,
        current_stage TEXT NOT NULL DEFAULT 'LEAD_NUEVO',
        probability_percent INTEGER DEFAULT 10,
        total_value DECIMAL(15,2) DEFAULT 50000,
        expected_close_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Nota: Supabase no permite ejecutar SQL directo desde la API REST
    // Necesitamos usar el SQL Editor de Supabase o crear la tabla manualmente
    console.log('   ⚠️  Para crear la tabla, ejecuta este SQL en Supabase SQL Editor:');
    console.log(createTableSQL);
    
  } catch (error) {
    console.error('   ❌ Error creando tabla:', error.message);
  }
}

async function testPipelineCreation() {
  try {
    // Obtener un lead existente
    const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (!leadsResponse.ok) {
      console.log('   ❌ No se pudo obtener leads para probar');
      return;
    }
    
    const leads = await leadsResponse.json();
    if (leads.length === 0) {
      console.log('   ⚠️  No hay leads en la base de datos para probar');
      return;
    }
    
    const leadId = leads[0].id;
    console.log(`   📋 Probando con lead: ${leadId}`);
    
    // Verificar si ya tiene pipeline
    const existingPipelineResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_pipeline?lead_id=eq.${leadId}`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (existingPipelineResponse.ok) {
      const existingPipelines = await existingPipelineResponse.json();
      if (existingPipelines.length > 0) {
        console.log('   ✅ Lead ya tiene pipeline');
        console.log(`   📊 Etapa: ${existingPipelines[0].current_stage}`);
        return;
      }
    }
    
    // Intentar crear pipeline
    const pipelineData = {
      lead_id: leadId,
      current_stage: 'LEAD_NUEVO',
      probability_percent: 10,
      total_value: 50000
    };
    
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(pipelineData)
    });
    
    if (createResponse.ok) {
      const newPipeline = await createResponse.json();
      console.log('   ✅ Pipeline creado exitosamente');
      console.log(`   🆔 ID: ${newPipeline[0].id}`);
    } else {
      const error = await createResponse.text();
      console.log(`   ❌ Error creando pipeline: ${createResponse.status} - ${error}`);
    }
    
  } catch (error) {
    console.error('   ❌ Error en test de creación:', error.message);
  }
}

// Función para probar el pipeline service
async function testPipelineService() {
  console.log('\n🧪 Probando Pipeline Service...');
  
  try {
    // Simular el pipeline service
    const { supabase } = require('./src/lib/db');
    
    // Obtener un lead
    const leads = await supabase.request('/Lead?select=id&limit=1');
    if (leads.length === 0) {
      console.log('   ⚠️  No hay leads para probar');
      return;
    }
    
    const leadId = leads[0].id;
    console.log(`   📋 Probando con lead: ${leadId}`);
    
    // Probar obtener pipeline
    try {
      const pipelines = await supabase.request(`/lead_pipeline?lead_id=eq.${leadId}&limit=1`);
      if (pipelines.length > 0) {
        console.log('   ✅ Pipeline encontrado via service');
        console.log(`   📊 Etapa: ${pipelines[0].current_stage}`);
      } else {
        console.log('   ⚠️  No se encontró pipeline via service');
      }
    } catch (error) {
      console.log(`   ❌ Error en service: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error cargando service: ${error.message}`);
  }
}

// Ejecutar tests
testSupabaseConnection()
  .then(() => testPipelineService())
  .catch(console.error);
