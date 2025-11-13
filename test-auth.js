#!/usr/bin/env node

/**
 * Script para probar la autenticación directamente
 */

const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function testAuth() {
  try {
    console.log('🔐 Probando autenticación...');
    
    const email = 'admin@phorencial.com';
    const password = 'admin123';
    
    console.log(`📧 Buscando usuario: ${email}`);
    
    // Buscar usuario por email
    const response = await fetch(`${supabaseUrl}/rest/v1/User?email=eq.${email}&select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (response.ok) {
      const users = await response.json();
      
      if (users.length === 0) {
        console.log('❌ Usuario no encontrado');
        return;
      }
      
      const user = users[0];
      console.log('✅ Usuario encontrado:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Nombre: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Hash almacenado: ${user.password ? user.password.substring(0, 20) + '...' : 'No hash'}`);
      
      // Verificar contraseña
      console.log(`\n🔑 Verificando contraseña: "${password}"`);
      
      if (!user.password) {
        console.log('❌ No hay hash de contraseña almacenado');
        return;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (isPasswordValid) {
        console.log('✅ Contraseña correcta');
        console.log('\n🎉 Autenticación exitosa');
        console.log('Datos del usuario autenticado:');
        console.log({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        });
      } else {
        console.log('❌ Contraseña incorrecta');
        
        // Generar nuevo hash para comparar
        console.log('\n🔧 Generando nuevo hash para comparar...');
        const newHash = await bcrypt.hash(password, 10);
        console.log(`Nuevo hash: ${newHash.substring(0, 20)}...`);
        
        const testCompare = await bcrypt.compare(password, newHash);
        console.log(`Prueba con nuevo hash: ${testCompare ? '✅ Funciona' : '❌ No funciona'}`);
      }
      
    } else {
      console.log(`❌ Error consultando usuario: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAuth();
