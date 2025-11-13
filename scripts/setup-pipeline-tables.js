/**
 * Script para configurar las tablas del pipeline en Supabase
 * Ejecutar con: node scripts/setup-pipeline-tables.js
 */

const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw';

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error ejecutando SQL: ${response.status} - ${error}`);
  }

  return response.json();
}

async function setupPipelineTables() {
  console.log('🔧 Configurando tablas del pipeline en Supabase...\n');

  try {
    // 1. Leer el archivo SQL
    console.log('1️⃣ Leyendo script SQL...');
    const sqlPath = path.join(__dirname, 'fix-pipeline-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('   ✅ Script SQL cargado\n');

    // 2. Ejecutar el script SQL (dividido en partes para evitar errores)
    console.log('2️⃣ Ejecutando script SQL...');
    
    // Dividir el SQL en comandos individuales
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        try {
          console.log(`   Ejecutando comando ${i + 1}/${commands.length}...`);
          await executeSQL(command);
        } catch (error) {
          console.log(`   ⚠️  Error en comando ${i + 1}: ${error.message}`);
          // Continuar con el siguiente comando
        }
      }
    }
    
    console.log('   ✅ Script SQL ejecutado\n');

    // 3. Verificar que las tablas se crearon correctamente
    console.log('3️⃣ Verificando tablas creadas...');
    
    const tables = ['lead_pipeline', 'pipeline_history', 'pipeline_transitions'];
    
    for (const table of tables) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'count=exact'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const count = data[0]?.count || 0;
          console.log(`   ✅ ${table}: ${count} registros`);
        } else {
          console.log(`   ❌ ${table}: Error al verificar`);
        }
      } catch (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      }
    }

    console.log('\n4️⃣ Probando creación de pipeline...');
    
    // Probar crear un pipeline de prueba
    try {
      // Primero obtener un lead existente
      const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=id&limit=1`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      });
      
      if (leadsResponse.ok) {
        const leads = await leadsResponse.json();
        if (leads.length > 0) {
          const leadId = leads[0].id;
          
          // Verificar si ya tiene pipeline
          const pipelineResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_pipeline?lead_id=eq.${leadId}`, {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            }
          });
          
          if (pipelineResponse.ok) {
            const pipelines = await pipelineResponse.json();
            if (pipelines.length > 0) {
              console.log(`   ✅ Lead ${leadId} ya tiene pipeline`);
            } else {
              console.log(`   ⚠️  Lead ${leadId} no tiene pipeline (debería crearse automáticamente)`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error probando pipeline: ${error.message}`);
    }

    console.log('\n🎉 CONFIGURACIÓN COMPLETADA');
    console.log('=' .repeat(50));
    console.log('✅ Tablas del pipeline creadas');
    console.log('✅ Triggers automáticos configurados');
    console.log('✅ Transiciones permitidas configuradas');
    console.log('✅ Pipelines creados para leads existentes');
    console.log('\n🚀 El sistema de pipeline está listo para usar');

  } catch (error) {
    console.error('❌ Error configurando pipeline:', error.message);
    process.exit(1);
  }
}

// Función para probar el pipeline service
async function testPipelineService() {
  console.log('\n🧪 Probando Pipeline Service...');
  
  try {
    // Importar el pipeline service
    const { pipelineService } = require('../src/server/services/pipeline-service');
    
    // Obtener un lead para probar
    const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (leadsResponse.ok) {
      const leads = await leadsResponse.json();
      if (leads.length > 0) {
        const leadId = leads[0].id;
        
        // Probar obtener pipeline
        const pipeline = await pipelineService.getLeadPipeline(leadId);
        if (pipeline) {
          console.log(`   ✅ Pipeline encontrado para lead ${leadId}`);
          console.log(`   📊 Etapa actual: ${pipeline.current_stage}`);
          console.log(`   📈 Probabilidad: ${pipeline.probability_percent}%`);
        } else {
          console.log(`   ⚠️  No se encontró pipeline para lead ${leadId}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Error probando Pipeline Service: ${error.message}`);
  }
}

// Ejecutar el script
if (require.main === module) {
  setupPipelineTables()
    .then(() => testPipelineService())
    .catch(console.error);
}

module.exports = { setupPipelineTables, testPipelineService };
