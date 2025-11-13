#!/usr/bin/env node

/**
 * Script para verificar el esquema de las tablas en Supabase
 */

const supabaseUrl = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function checkSchema() {
  try {
    console.log('🔍 Verificando esquema de tablas en Supabase...');
    
    // Intentar obtener información de las tablas disponibles
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (response.ok) {
      const schema = await response.json();
      console.log('📋 Información del esquema:');
      console.log(JSON.stringify(schema, null, 2));
    } else {
      console.log(`❌ Error obteniendo esquema: ${response.status} ${response.statusText}`);
    }
    
    // Intentar hacer una consulta con OPTIONS para ver qué columnas están disponibles
    console.log('\n🔍 Verificando columnas de la tabla User...');
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/User`, {
      method: 'OPTIONS',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (optionsResponse.ok) {
      console.log('✅ Tabla User accesible');
      console.log('Headers:', Object.fromEntries(optionsResponse.headers.entries()));
    } else {
      console.log(`❌ Error accediendo tabla User: ${optionsResponse.status}`);
    }
    
    // Intentar insertar un registro de prueba para ver qué campos acepta
    console.log('\n🧪 Probando inserción de prueba...');
    const testUser = {
      email: 'test@test.com'
    };
    
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/User`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testUser)
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Inserción de prueba exitosa:', result);
    } else {
      const errorText = await testResponse.text();
      console.log(`❌ Error en inserción de prueba: ${testResponse.status}`);
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkSchema();
