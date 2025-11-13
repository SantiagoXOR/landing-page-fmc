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

// Datos de prueba (primeros 10 leads del Excel)
const testLeads = [
  {
    nombre: 'echeverria maribel silvia',
    dni: '17968421',
    telefono: '+543704861647',
    email: 'echeverria.maribel@email.com',
    ingresos: 340000,
    zona: 'Formosa',
    producto: '110',
    monto: 500000,
    origen: 'excel',
    utmSource: 'importacion_excel',
    estado: 'RECHAZADO',
    agencia: 'A',
    notas: 'Trabajo: pensionada. hist, crediticio malo. BDF: Sí'
  },
  {
    nombre: 'López mauro',
    dni: '36204697',
    telefono: '+543704698662',
    email: 'lopez.mauro@email.com',
    ingresos: 1038302,
    zona: 'Ingeniero Juárez',
    producto: 'Wave 110',
    monto: 500000,
    origen: 'excel',
    utmSource: 'importacion_excel',
    estado: 'PREAPROBADO',
    agencia: 'Rio Bermejo',
    notas: 'Trabajo: Empleado Provincial. Notas BDF: Sí'
  },
  {
    nombre: 'Juan Ramón muzzio',
    dni: '38542477',
    telefono: '+543705182438',
    email: 'juan.ramon@email.com',
    ingresos: 877000,
    zona: 'Villa del Rosario',
    producto: 'Moto 110cc',
    monto: 500000,
    origen: 'excel',
    utmSource: 'importacion_excel',
    estado: 'RECHAZADO',
    agencia: 'C',
    notas: 'Trabajo: Personal Policial. hist. crediticio malo. BDF: Sí'
  },
  {
    nombre: 'Sandra beatriz busto',
    dni: '29797131',
    telefono: '+543705084469',
    email: 'sandra.beatriz@email.com',
    ingresos: 350000,
    zona: 'La Nueva Formosa',
    producto: '110',
    monto: 500000,
    origen: 'excel',
    utmSource: 'importacion_excel',
    estado: 'DOC_PENDIENTE',
    agencia: 'D',
    notas: 'Trabajo: Empleada Domestica. debe enviar recibos BDF: Sí'
  },
  {
    nombre: 'Luque María de Jesús',
    dni: '14172033',
    telefono: '+543704947119',
    email: 'luque.maria@email.com',
    ingresos: 330000,
    zona: 'Solidaridad',
    producto: 'Moto 110cc',
    monto: 500000,
    origen: 'excel',
    utmSource: 'importacion_excel',
    estado: 'DOC_PENDIENTE',
    agencia: null,
    notas: 'Trabajo: Jubilada. debe enviar recibos BDF: Sí'
  }
];

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
