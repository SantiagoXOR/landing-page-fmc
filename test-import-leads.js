require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos de prueba eliminados - Los leads ahora se crean desde Manychat
// Este archivo se mantiene solo para referencia histórica
const testLeads = [];

async function testImport() {
  try {
    console.log('🧪 Probando importación de leads de prueba...\n');

    // Limpiar leads de prueba existentes
    console.log('🧹 Limpiando leads de prueba existentes...');
    const { error: deleteError } = await supabase
      .from('Lead')
      .delete()
      .eq('origen', 'excel');

    if (deleteError) {
      console.log('⚠️  Error al limpiar (puede ser normal si no hay datos):', deleteError.message);
    } else {
      console.log('✅ Leads de prueba limpiados');
    }

    // Insertar leads de prueba
    console.log('\n📥 Insertando leads de prueba...');
    const { data, error } = await supabase
      .from('Lead')
      .insert(testLeads)
      .select();

    if (error) {
      console.error('❌ Error al insertar leads:', error);
      throw error;
    }

    console.log(`✅ ${data.length} leads insertados exitosamente`);

    // Verificar inserción
    console.log('\n🔍 Verificando inserción...');
    const { data: allLeads, error: selectError } = await supabase
      .from('Lead')
      .select('*')
      .eq('origen', 'excel');

    if (selectError) {
      console.error('❌ Error al verificar:', selectError);
      throw selectError;
    }

    console.log(`📊 Total leads con origen 'excel': ${allLeads.length}`);

    // Estadísticas por estado
    const estadoStats = {};
    allLeads.forEach(lead => {
      estadoStats[lead.estado] = (estadoStats[lead.estado] || 0) + 1;
    });

    console.log('\n📈 Distribución por estado:');
    Object.entries(estadoStats).forEach(([estado, count]) => {
      console.log(`  ${estado}: ${count} leads`);
    });

    console.log('\n✅ PRUEBA COMPLETADA EXITOSAMENTE');
    console.log('🚀 Ahora puedes proceder con la importación completa');

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testImport();
}

module.exports = { testImport };
