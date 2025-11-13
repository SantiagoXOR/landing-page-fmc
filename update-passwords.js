#!/usr/bin/env node

/**
 * Script para actualizar las contraseñas de los usuarios existentes
 */

const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function updatePasswords() {
  try {
    console.log('🔧 Actualizando contraseñas de usuarios...');
    
    // Datos de usuarios con sus contraseñas
    const userPasswords = [
      { email: 'admin@phorencial.com', password: 'admin123' },
      { email: 'ludmila@phorencial.com', password: 'ludmila123' },
      { email: 'facundo@phorencial.com', password: 'facundo123' },
      { email: 'vendedor@phorencial.com', password: 'vendedor123' },
    ];
    
    for (const userData of userPasswords) {
      console.log(`\n🔑 Actualizando contraseña para: ${userData.email}`);
      
      // Generar nuevo hash
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      console.log(`   Nuevo hash generado: ${hashedPassword.substring(0, 20)}...`);
      
      // Actualizar usuario
      const response = await fetch(`${supabaseUrl}/rest/v1/User?email=eq.${userData.email}`, {
        method: 'PATCH',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          password: hashedPassword
        })
      });
      
      if (response.ok) {
        const updatedUsers = await response.json();
        if (updatedUsers.length > 0) {
          console.log(`   ✅ Contraseña actualizada para ${userData.email}`);
          
          // Verificar que el hash funciona
          const testCompare = await bcrypt.compare(userData.password, hashedPassword);
          console.log(`   🧪 Verificación: ${testCompare ? '✅ Hash válido' : '❌ Hash inválido'}`);
        } else {
          console.log(`   ⚠️ No se encontró usuario para actualizar: ${userData.email}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error actualizando ${userData.email}: ${response.status}`);
        console.log(`   Error details: ${errorText}`);
      }
    }
    
    console.log('\n🎉 Proceso completado. Verificando usuarios...');
    
    // Verificar todos los usuarios
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/User?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (verifyResponse.ok) {
      const users = await verifyResponse.json();
      console.log(`📊 Total de usuarios: ${users.length}`);
      
      for (const user of users) {
        console.log(`\n👤 ${user.name} (${user.email}):`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'No hash'}`);
        
        // Probar autenticación para cada usuario
        const testPassword = user.email.includes('admin') ? 'admin123' :
                           user.email.includes('ludmila') ? 'ludmila123' :
                           user.email.includes('facundo') ? 'facundo123' :
                           user.email.includes('vendedor') ? 'vendedor123' : null;
        
        if (testPassword && user.password) {
          const isValid = await bcrypt.compare(testPassword, user.password);
          console.log(`   🔐 Autenticación con "${testPassword}": ${isValid ? '✅ Válida' : '❌ Inválida'}`);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

updatePasswords();
