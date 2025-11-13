#!/usr/bin/env node

/**
 * Script para probar la lógica de autenticación directamente
 */

const bcrypt = require('bcryptjs');

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function request(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function findUserByEmail(email) {
  const users = await request(`/User?email=eq.${email}&select=*`);
  if (!users[0]) return null;
  
  // Mapear campos de Supabase a nuestro esquema
  return {
    id: users[0].id,
    email: users[0].email,
    nombre: users[0].name,
    hash: users[0].password,
    rol: users[0].role,
    createdAt: users[0].createdAt
  };
}

async function testAuth() {
  try {
    console.log('🧪 Probando lógica de autenticación...');
    
    const email = 'admin@phorencial.com';
    const password = 'admin123';
    
    console.log(`📧 Buscando usuario: ${email}`);
    
    // Simular la lógica de auth.ts
    const user = await findUserByEmail(email);
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:');
    console.log('   Datos mapeados:', JSON.stringify(user, null, 2));
    
    // Verificar contraseña
    console.log(`\n🔑 Verificando contraseña: "${password}"`);
    
    if (!user.hash) {
      console.log('❌ No hay hash de contraseña en el objeto mapeado');
      return;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.hash);
    
    if (isPasswordValid) {
      console.log('✅ Contraseña correcta');
      console.log('\n🎉 Autenticación exitosa');
      
      // Simular el objeto que devuelve NextAuth
      const authResult = {
        id: user.id,
        email: user.email,
        name: user.nombre,
        role: user.rol,
      };
      
      console.log('Objeto de autenticación:', JSON.stringify(authResult, null, 2));
    } else {
      console.log('❌ Contraseña incorrecta');
      console.log(`Hash recibido: ${user.hash ? user.hash.substring(0, 20) + '...' : 'No hash'}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testAuth();
