/**
 * Script para crear usuarios de test en la base de datos
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

const TEST_USERS = [
  {
    email: 'admin@phorencial.com',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Admin'
  },
  {
    email: 'ludmila@phorencial.com',
    password: 'ludmila123',
    role: 'ANALISTA',
    name: 'Ludmila'
  },
  {
    email: 'vendedor@phorencial.com',
    password: 'vendedor123',
    role: 'VENDEDOR',
    name: 'Vendedor Demo'
  }
];

async function setupTestUsers() {
  console.log('🚀 Configurando usuarios de test...');

  for (const user of TEST_USERS) {
    try {
      // Verificar si el usuario ya existe
      const { data: existingUser } = await supabase
        .from('User')
        .select('id, email')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`✅ Usuario ${user.email} ya existe`);
        continue;
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Crear el usuario
      const { data: newUser, error } = await supabase
        .from('User')
        .insert({
          email: user.email,
          hashedPassword: hashedPassword,
          role: user.role,
          name: user.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creando usuario ${user.email}:`, error);
      } else {
        console.log(`✅ Usuario ${user.email} creado exitosamente`);
      }

    } catch (error) {
      console.error(`❌ Error procesando usuario ${user.email}:`, error);
    }
  }

  console.log('✅ Configuración de usuarios de test completada');
}

// Ejecutar el script
setupTestUsers().catch(console.error);
