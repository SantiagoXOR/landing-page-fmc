#!/usr/bin/env node

/**
 * Script para corregir usuarios en Supabase
 */

const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function fixUsers() {
  try {
    console.log('🔧 Corrigiendo usuarios en Supabase...');
    
    // Primero, eliminar usuarios existentes
    console.log('🗑️ Eliminando usuarios existentes...');
    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/User`, {
      method: 'DELETE',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Usuarios existentes eliminados');
    } else {
      console.log('⚠️ No se pudieron eliminar usuarios existentes, continuando...');
    }
    
    // Datos de usuarios correctos
    const users = [
      {
        nombre: 'Admin',
        email: 'admin@phorencial.com',
        password: 'admin123',
        rol: 'ADMIN',
      },
      {
        nombre: 'Ludmila',
        email: 'ludmila@phorencial.com',
        password: 'ludmila123',
        rol: 'ANALISTA',
      },
      {
        nombre: 'Facundo',
        email: 'facundo@phorencial.com',
        password: 'facundo123',
        rol: 'ANALISTA',
      },
      {
        nombre: 'Vendedor Demo',
        email: 'vendedor@phorencial.com',
        password: 'vendedor123',
        rol: 'VENDEDOR',
      },
    ];
    
    console.log('👥 Insertando usuarios corregidos...');
    
    for (const userData of users) {
      console.log(`📝 Creando usuario: ${userData.email}`);
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const userToInsert = {
        nombre: userData.nombre,
        email: userData.email,
        hash: hashedPassword,
        rol: userData.rol,
      };
      
      const response = await fetch(`${supabaseUrl}/rest/v1/User`, {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(userToInsert)
      });
      
      if (response.ok) {
        const createdUser = await response.json();
        console.log(`✅ Usuario creado: ${userData.email} (ID: ${createdUser[0]?.id})`);
      } else {
        const errorText = await response.text();
        console.log(`❌ Error creando usuario ${userData.email}: ${response.status} ${response.statusText}`);
        console.log('Error details:', errorText);
      }
    }
    
    console.log('\n🎉 Proceso completado. Verificando usuarios...');
    
    // Verificar usuarios creados
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/User?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (verifyResponse.ok) {
      const users = await verifyResponse.json();
      console.log(`📊 Total de usuarios: ${users.length}`);
      
      users.forEach((user, index) => {
        console.log(`\n👤 Usuario ${index + 1}:`);
        console.log(`   Nombre: ${user.nombre}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${user.rol}`);
        console.log(`   Hash: ${user.hash ? '✅ Presente' : '❌ Faltante'}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

fixUsers();
