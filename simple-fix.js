console.log('🔧 Iniciando corrección simple...');

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw';

async function simpleFix() {
  try {
    console.log('📋 Obteniendo usuarios...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/User?select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      console.log('❌ Error:', response.status, response.statusText);
      return;
    }

    const users = await response.json();
    console.log(`✅ Encontrados ${users.length} usuarios`);

    // Usar hash pre-generado para admin123
    const adminHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    for (const user of users) {
      console.log(`\n🔄 Actualizando ${user.email}...`);
      
      let role = 'VENDEDOR';
      let name = user.email.split('@')[0];
      
      if (user.email.includes('admin')) {
        role = 'ADMIN';
        name = 'Admin';
      } else if (user.email.includes('ludmila') || user.email.includes('facundo')) {
        role = 'ANALISTA';
        name = user.email.includes('ludmila') ? 'Ludmila' : 'Facundo';
      }

      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/User?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          role: role,
          password: adminHash
        })
      });

      if (updateResponse.ok) {
        console.log(`✅ ${user.email} actualizado - Rol: ${role}`);
      } else {
        console.log(`❌ Error: ${updateResponse.status}`);
      }
    }

    console.log('\n✅ Corrección completada');
    console.log('\n📋 Credenciales (todas usan password: admin123):');
    console.log('   - admin@phorencial.com / admin123');
    console.log('   - ludmila@phorencial.com / admin123');
    console.log('   - facundo@phorencial.com / admin123');
    console.log('   - vendedor@phorencial.com / admin123');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

simpleFix();
