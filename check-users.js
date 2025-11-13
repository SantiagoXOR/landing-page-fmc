#!/usr/bin/env node

/**
 * Script para verificar usuarios en Supabase
 */

const supabaseUrl = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios en Supabase...');
    
    // Obtener todos los usuarios de la tabla User
    const response = await fetch(`${supabaseUrl}/rest/v1/User?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });

    if (response.ok) {
      const users = await response.json();
      console.log(`📊 Total de usuarios en tabla "User": ${users.length}`);

      users.forEach((user, index) => {
        console.log(`\n👤 Usuario ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.name || user.nombre || 'Sin nombre'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${user.role || user.rol || 'Sin rol'}`);
        console.log(`   Password: ${user.password ? user.password.substring(0, 20) + '...' : 'No password'}`);
        console.log(`   Creado: ${user.createdAt}`);
      });
    } else {
      console.log(`❌ Error consultando usuarios: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }

    // Verificar también la tabla users (nueva estructura)
    console.log('\n🔍 Verificando tabla "users" (nueva estructura)...');
    const response2 = await fetch(`${supabaseUrl}/rest/v1/users?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });

    if (response2.ok) {
      const newUsers = await response2.json();
      console.log(`📊 Total de usuarios en tabla "users": ${newUsers.length}`);

      newUsers.forEach((user, index) => {
        console.log(`\n👤 Usuario ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.nombre} ${user.apellido || ''}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Estado: ${user.status}`);
        console.log(`   Password Hash: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'No hash'}`);
        console.log(`   Creado: ${user.created_at}`);
      });
    } else {
      console.log(`❌ Error consultando tabla "users": ${response2.status} ${response2.statusText}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkUsers();
