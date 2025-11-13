const { supabase } = require('./src/lib/db.ts');

async function fixUserRoles() {
  try {
    console.log('Fixing user roles...');
    
    // Mapeo de roles
    const roleMapping = {
      'admin': 'ADMIN',
      'manager': 'MANAGER', 
      'vendedor': 'VENDEDOR',
      'analista': 'ANALISTA',
      'viewer': 'VIEWER'
    };
    
    const users = await supabase.findAllUsers();
    console.log('Found users:', users.length);
    
    for (const user of users) {
      const currentRole = user.role || user.rol;
      const newRole = roleMapping[currentRole?.toLowerCase()] || 'VIEWER';
      
      console.log(`Updating user ${user.email}: ${currentRole} -> ${newRole}`);
      
      // Actualizar el rol del usuario
      await supabase.updateUser(user.id, {
        role: newRole,
        status: 'ACTIVE',
        nombre: user.nombre || user.email.split('@')[0]
      });
    }
    
    console.log('User roles updated successfully!');
    
    // Verificar los cambios
    const updatedUsers = await supabase.findAllUsers();
    console.log('\nUpdated users:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.email}: ${user.role || user.rol} (${user.status || 'ACTIVE'})`);
    });
    
  } catch (error) {
    console.error('Error fixing user roles:', error.message);
  }
}

fixUserRoles();