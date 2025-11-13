const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixRolesDirect() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    console.log('Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obtener todos los usuarios
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*');
    
    if (fetchError) {
      throw new Error(`Error fetching users: ${fetchError.message}`);
    }
    
    console.log(`Found ${users.length} users`);
    
    // Mapeo de roles
    const roleMapping = {
      'admin': 'ADMIN',
      'manager': 'MANAGER', 
      'vendedor': 'VENDEDOR',
      'analista': 'ANALISTA',
      'viewer': 'VIEWER'
    };
    
    // Actualizar cada usuario
    for (const user of users) {
      const currentRole = user.role || user.rol;
      const newRole = roleMapping[currentRole?.toLowerCase()] || 'VIEWER';
      
      console.log(`Updating ${user.email}: ${currentRole} -> ${newRole}`);
      
      const updateData = {
        role: newRole,
        status: user.status || 'ACTIVE'
      };
      
      // Solo actualizar 'rol' si existe en el esquema
      if (user.hasOwnProperty('rol')) {
        updateData.rol = newRole;
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`Error updating user ${user.email}:`, updateError.message);
      } else {
        console.log(`✅ Updated ${user.email}`);
      }
    }
    
    // Verificar los cambios
    const { data: updatedUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, email, role, status');
    
    if (verifyError) {
      console.error('Error verifying updates:', verifyError.message);
    } else {
      console.log('\n✅ Updated users:');
      updatedUsers.forEach(user => {
        console.log(`- ${user.email}: ${user.role} (${user.status || 'ACTIVE'})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixRolesDirect();