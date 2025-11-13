require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { extractDataFromHTML } = require('./import-excel-data.js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importAllLeads() {
  try {
    console.log('🚀 Iniciando importación completa de leads desde Excel...\n');

    // Extraer datos del HTML
    console.log('📊 Extrayendo datos del archivo HTML...');
    const leads = extractDataFromHTML();

    if (leads.length === 0) {
      console.log('⚠️  No se encontraron leads para importar');
      return;
    }

    console.log(`📋 Total de leads extraídos: ${leads.length}`);

    // Limpiar leads existentes del Excel (opcional)
    const shouldClean = process.argv.includes('--clean');
    if (shouldClean) {
      console.log('\n🧹 Limpiando leads existentes del Excel...');
      const { error: deleteError } = await supabase
        .from('Lead')
        .delete()
        .eq('origen', 'excel');

      if (deleteError) {
        console.log('⚠️  Error al limpiar (puede ser normal si no hay datos):', deleteError.message);
      } else {
        console.log('✅ Leads del Excel limpiados');
      }
    }

    // Importar en lotes para evitar timeouts
    const batchSize = 50;
    const totalBatches = Math.ceil(leads.length / batchSize);
    let successCount = 0;
    let errorCount = 0;

    console.log(`\n📦 Importando en ${totalBatches} lotes de ${batchSize} leads cada uno...\n`);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, leads.length);
      const batch = leads.slice(start, end);

      console.log(`📥 Procesando lote ${i + 1}/${totalBatches} (leads ${start + 1}-${end})...`);

      try {
        const { data, error } = await supabase
          .from('Lead')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Error en lote ${i + 1}:`, error.message);
          errorCount += batch.length;
          
          // Intentar insertar uno por uno para identificar problemas específicos
          console.log('🔍 Intentando inserción individual para identificar problemas...');
          for (const lead of batch) {
            try {
              const { error: individualError } = await supabase
                .from('Lead')
                .insert([lead]);
              
              if (individualError) {
                console.log(`❌ Error con lead "${lead.nombre}": ${individualError.message}`);
              } else {
                successCount++;
                console.log(`✅ Lead "${lead.nombre}" insertado individualmente`);
              }
            } catch (individualErr) {
              console.log(`❌ Error individual con "${lead.nombre}": ${individualErr.message}`);
            }
          }
        } else {
          successCount += data.length;
          console.log(`✅ Lote ${i + 1} completado: ${data.length} leads insertados`);
        }

        // Pausa pequeña entre lotes para no sobrecargar la API
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (batchError) {
        console.error(`❌ Error crítico en lote ${i + 1}:`, batchError.message);
        errorCount += batch.length;
      }
    }

    // Verificar inserción final
    console.log('\n🔍 Verificando inserción final...');
    const { data: allLeads, error: selectError } = await supabase
      .from('Lead')
      .select('*')
      .eq('origen', 'excel');

    if (selectError) {
      console.error('❌ Error al verificar:', selectError);
    } else {
      console.log(`📊 Total leads con origen 'excel' en la base de datos: ${allLeads.length}`);

      // Estadísticas por estado
      const estadoStats = {};
      allLeads.forEach(lead => {
        estadoStats[lead.estado] = (estadoStats[lead.estado] || 0) + 1;
      });

      console.log('\n📈 Distribución por estado:');
      Object.entries(estadoStats).forEach(([estado, count]) => {
        console.log(`  ${estado}: ${count} leads`);
      });

      // Estadísticas por zona
      const zonaStats = {};
      allLeads.forEach(lead => {
        const zona = lead.zona || 'Sin zona';
        zonaStats[zona] = (zonaStats[zona] || 0) + 1;
      });

      console.log('\n🌍 Distribución por zona (top 10):');
      Object.entries(zonaStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([zona, count]) => {
          console.log(`  ${zona}: ${count} leads`);
        });
    }

    console.log('\n📊 RESUMEN DE IMPORTACIÓN:');
    console.log(`✅ Leads insertados exitosamente: ${successCount}`);
    console.log(`❌ Leads con errores: ${errorCount}`);
    console.log(`📋 Total procesados: ${successCount + errorCount}`);

    if (successCount > 0) {
      console.log('\n🎉 ¡IMPORTACIÓN COMPLETADA!');
      console.log('🔧 Próximos pasos:');
      console.log('1. Verificar los datos en la aplicación web');
      console.log('2. Probar los filtros con los nuevos datos');
      console.log('3. Revisar cualquier lead con errores si los hay');
    } else {
      console.log('\n⚠️  No se importaron leads. Revisar errores arriba.');
    }

  } catch (error) {
    console.error('\n❌ Error crítico en la importación:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log(`
🔧 IMPORTADOR DE LEADS DESDE EXCEL

Uso:
  node import-all-leads.js [opciones]

Opciones:
  --clean    Limpiar leads existentes del Excel antes de importar
  --help     Mostrar esta ayuda

Ejemplos:
  node import-all-leads.js                # Importar sin limpiar datos existentes
  node import-all-leads.js --clean        # Limpiar e importar
  node import-all-leads.js --help         # Mostrar ayuda

Notas:
- Los leads se importan en lotes de 50 para evitar timeouts
- Si hay errores en un lote, se intenta inserción individual
- Los leads se marcan con origen='excel' para identificarlos
- Se generan estadísticas por estado y zona al final
`);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  if (process.argv.includes('--help')) {
    showHelp();
  } else {
    importAllLeads();
  }
}

module.exports = { importAllLeads };
