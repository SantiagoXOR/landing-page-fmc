// Test de conexión usando las variables de entorno de FMC
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testFMCEnvConnection() {
  console.log('🔄 Probando conexión con variables de entorno FMC...');
  
  // Verificar que las variables de entorno están cargadas
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Variables de entorno:');
  console.log('  URL:', supabaseUrl);
  console.log('  Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NO DEFINIDA');
  console.log('  Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NO DEFINIDA');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables de entorno faltantes!');
    return;
  }
  
  try {
    // Crear cliente de Supabase con anon key
    console.log('\n🔗 Probando conexión con anon key...');
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    
    // Probar una consulta simple
    const { data: authData, error: authError } = await supabaseAnon.auth.getSession();
    
    if (authError) {
      console.log('⚠️  Auth session:', authError.message);
    } else {
      console.log('✅ Conexión con anon key exitosa!');
    }
    
    // Probar con service role key si está disponible
    if (supabaseServiceKey) {
      console.log('\n🔗 Probando conexión con service role key...');
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
      
      // Intentar obtener información de la base de datos
      const { data: tables, error: tablesError } = await supabaseService
        .rpc('get_schema_tables', {})
        .catch(() => ({ data: null, error: { message: 'RPC no disponible, probando consulta directa' } }));
      
      if (tablesError) {
        console.log('⚠️  Service role test:', tablesError.message);
        
        // Intentar una consulta más simple
        const { data: simpleTest, error: simpleError } = await supabaseService
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .limit(1);
        
        if (simpleError) {
          console.log('⚠️  Consulta simple falló:', simpleError.message);
        } else {
          console.log('✅ Conexión con service role key exitosa!');
          console.log('📊 Base de datos accesible');
        }
      } else {
        console.log('✅ Conexión con service role key exitosa!');
        console.log('📊 Tablas encontradas:', tables?.length || 0);
      }
    }
    
    console.log('\n🎉 Test de variables de entorno completado!');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

// Ejecutar test
testFMCEnvConnection()
  .then(() => {
    console.log('\n✅ Todas las pruebas completadas!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });