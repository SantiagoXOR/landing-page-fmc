const { supabase } = require('./src/lib/db.ts');

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    const users = await supabase.findAllUsers();
    console.log('Users found:', users.length);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role || user.rol,
        status: user.status
      });
    });
    
    // También verificar la tabla nueva
    try {
      const newUsers = await supabase.findAllUsersNew();
      console.log('\nNew users table:', newUsers.length);
      newUsers.forEach((user, index) => {
        console.log(`New User ${index + 1}:`, {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          role: user.role,
          status: user.status
        });
      });
    } catch (e) {
      console.log('No new users table or error:', e.message);
    }
    
  } catch (error) {
    console.error('Error checking users:', error.message);
  }
}

checkUsers();