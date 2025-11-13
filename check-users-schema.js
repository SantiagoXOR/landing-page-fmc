const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkUsersSchema() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    console.log('Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obtener un usuario para ver la estructura
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (fetchError) {
      throw new Error(`Error fetching users: ${fetchError.message}`);
    }
    
    if (users && users.length > 0) {
      console.log('User schema (available fields):');
      console.log(Object.keys(users[0]));
      console.log('\nSample user data:');
      console.log(users[0]);
    }
    
    // Intentar actualizar solo el campo role
    console.log('\nTrying to update only role field...');
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('*');
    
    if (allError) {
      throw new Error(`Error fetching all users: ${allError.message}`);
    }
    
    const roleMapping = {
      'admin': 'ADMIN',
      'manager': 'MANAGER', 
      'vendedor': 'VENDEDOR',
      'analista': 'ANALISTA',
      'viewer': 'VIEWER'
    };
    
    for (const user of allUsers) {
      const currentRole = user.role;
      const newRole = roleMapping[currentRole?.toLowerCase()] || 'VIEWER';
      
      if (currentRole !== newRole) {
        console.log(`Updating ${user.email}: ${currentRole} -> ${newRole}`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`Error updating user ${user.email}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${user.email}`);
        }
      } else {
        console.log(`${user.email} already has correct role: ${currentRole}`);
      }
    }
    
    // Verificar los cambios
    const { data: updatedUsers, error: verifyError } = await supabase
      .from('users')
      .select('*');
    
    if (verifyError) {
      console.error('Error verifying updates:', verifyError.message);
    } else {
      console.log('\n✅ Final user roles:');
      updatedUsers.forEach(user => {
        console.log(`- ${user.email}: ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsersSchema();