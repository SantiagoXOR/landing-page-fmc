#!/usr/bin/env node

/**
 * Script para insertar usuarios correctamente en Supabase
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function fixUsers() {
  try {
    console.log('🔧 Insertando usuarios correctos en Supabase...');
    
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
    
    // Datos de usuarios con esquema correcto de Supabase
    const users = [
      {
        name: 'Admin',
        email: 'admin@phorencial.com',
        password: 'admin123',
        role: 'ADMIN',
      },
      {
        name: 'Ludmila',
        email: 'ludmila@phorencial.com',
        password: 'ludmila123',
        role: 'ANALISTA',
      },
      {
        name: 'Facundo',
        email: 'facundo@phorencial.com',
        password: 'facundo123',
        role: 'ANALISTA',
      },
      {
        name: 'Vendedor Demo',
        email: 'vendedor@phorencial.com',
        password: 'vendedor123',
        role: 'VENDEDOR',
      },
    ];
    
    console.log('👥 Insertando usuarios con esquema correcto...');
    
    for (const userData of users) {
      console.log(`📝 Creando usuario: ${userData.email}`);
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Generar ID único
      const userId = `cm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      
      const userToInsert = {
        id: userId,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
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
        console.log(`   ID: ${user.id}`);
        console.log(`   Nombre: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   Password Hash: ${user.password ? '✅ Presente' : '❌ Faltante'}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

fixUsers();
