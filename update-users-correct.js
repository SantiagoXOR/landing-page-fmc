/**
 * Script para actualizar usuarios existentes con contraseñas correctas
 */

const bcrypt = require('bcryptjs');

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw';

async function updateUsers() {
  console.log('🔧 Actualizando usuarios existentes...');
  
  try {
    // 1. Obtener usuarios existentes
    const response = await fetch(`${SUPABASE_URL}/rest/v1/User?select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo usuarios: ${response.status}`);
    }

    const users = await response.json();
    console.log(`📋 Usuarios encontrados: ${users.length}`);

    // 2. Definir datos correctos para cada usuario
    const userUpdates = {
      'admin@phorencial.com': {
        name: 'Admin',
        role: 'ADMIN',
        password: 'admin123'
      },
      'ludmila@phorencial.com': {
        name: 'Ludmila',
        role: 'ANALISTA', 
        password: 'analista123'
      },
      'facundo@phorencial.com': {
        name: 'Facundo',
        role: 'ANALISTA',
        password: 'analista123'
      },
      'vendedor@phorencial.com': {
        name: 'Vendedor',
        role: 'VENDEDOR',
        password: 'vendedor123'
      }
    };

    // 3. Actualizar cada usuario
    for (const user of users) {
      const email = user.email;
      const updateData = userUpdates[email];
      
      if (!updateData) {
        console.log(`⚠️ No hay datos de actualización para ${email}`);
        continue;
      }

      console.log(`\n🔄 Actualizando ${email}...`);
      
      // Generar hash de contraseña
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      
      // Actualizar usuario
      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/User?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: updateData.name,
          role: updateData.role,
          password: hashedPassword
        })
      });

      if (updateResponse.ok) {
        console.log(`✅ ${email} actualizado - Rol: ${updateData.role} - Password: ${updateData.password}`);
      } else {
        const errorText = await updateResponse.text();
        console.log(`❌ Error actualizando ${email}: ${updateResponse.status} - ${errorText}`);
      }
    }

    console.log('\n✅ Actualización completada');
    console.log('\n📋 Credenciales de acceso:');
    console.log('   - admin@phorencial.com / admin123');
    console.log('   - ludmila@phorencial.com / analista123');
    console.log('   - facundo@phorencial.com / analista123');
    console.log('   - vendedor@phorencial.com / vendedor123');

    // 4. Verificar usuarios actualizados
    console.log('\n🔍 Verificando usuarios actualizados...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/User?select=*`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    if (verifyResponse.ok) {
      const updatedUsers = await verifyResponse.json();
      updatedUsers.forEach((user, index) => {
        console.log(`\n👤 Usuario ${index + 1}:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nombre: ${user.name || 'Sin nombre'}`);
        console.log(`   Rol: ${user.role || 'Sin rol'}`);
        console.log(`   Password: ${user.password ? '✅ Configurado' : '❌ Faltante'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateUsers();
