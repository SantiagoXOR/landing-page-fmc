// Test de conexión a la cuenta FMC de Supabase
const { createClient } = require('@supabase/supabase-js');

// Credenciales de la cuenta FMC
const supabaseUrl = 'https://hvmenkhmyovfmwsnitab.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bWVua2hteW92Zm13c25pdGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzE0NzQsImV4cCI6MjA1MTUwNzQ3NH0.Ej7Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function testFMCConnection() {
  console.log('🔄 Probando conexión a la cuenta FMC de Supabase...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Probar conexión obteniendo las tablas
    console.log('📋 Obteniendo lista de tablas...');
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('❌ Error al obtener tablas:', error);
      return;
    }
    
    console.log('✅ Conexión exitosa!');
    console.log('📊 Tablas encontradas:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📝 Primeras 10 tablas:');
      data.slice(0, 10).forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.table_name}`);
      });
    }
    
    // Probar una consulta simple
    console.log('\n🔍 Probando consulta a tabla users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(3);
    
    if (usersError) {
      console.log('⚠️  Tabla users no existe o no es accesible:', usersError.message);
    } else {
      console.log('✅ Consulta a users exitosa!');
      console.log('👥 Usuarios encontrados:', users?.length || 0);
      if (users && users.length > 0) {
        users.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.name} (${user.email})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

// Ejecutar test
testFMCConnection()
  .then(() => {
    console.log('\n🎉 Test completado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });