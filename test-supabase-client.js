#!/usr/bin/env node

/**
 * Script para probar nuestro cliente de Supabase
 */

// Cargar variables de entorno
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');

  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.log('⚠️ No se pudo cargar .env.local:', error.message);
}

// Importar nuestro cliente
const { supabase } = require('./src/lib/db.ts');
const bcrypt = require('bcryptjs');

async function testSupabaseClient() {
  try {
    console.log('🧪 Probando cliente de Supabase...');
    
    const email = 'admin@phorencial.com';
    const password = 'admin123';
    
    console.log(`📧 Buscando usuario: ${email}`);
    
    // Usar nuestro cliente de Supabase
    const user = await supabase.findUserByEmail(email);
    
    if (!user) {
      console.log('❌ Usuario no encontrado con nuestro cliente');
      return;
    }
    
    console.log('✅ Usuario encontrado con nuestro cliente:');
    console.log('   Datos mapeados:', JSON.stringify(user, null, 2));
    
    // Verificar contraseña
    console.log(`\n🔑 Verificando contraseña: "${password}"`);
    
    if (!user.hash) {
      console.log('❌ No hay hash de contraseña en el objeto mapeado');
      return;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.hash);
    
    if (isPasswordValid) {
      console.log('✅ Contraseña correcta con nuestro cliente');
      console.log('\n🎉 Autenticación exitosa');
      console.log('Datos del usuario autenticado:');
      console.log({
        id: user.id,
        email: user.email,
        name: user.nombre,
        role: user.rol
      });
    } else {
      console.log('❌ Contraseña incorrecta con nuestro cliente');
      console.log(`Hash recibido: ${user.hash ? user.hash.substring(0, 20) + '...' : 'No hash'}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testSupabaseClient();
