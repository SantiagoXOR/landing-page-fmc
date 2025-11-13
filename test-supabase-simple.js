#!/usr/bin/env node

/**
 * Script simple para probar la conexión a Supabase
 */

const supabaseUrl = 'https://aozysydpwvkkdvhfsvsu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTQ5ODQsImV4cCI6MjA3MTM5MDk4NH0.TP4IcldIz855e-JETeychVPG60blKrxJ2oHkGSrVeaI';

async function testSupabase() {
  try {
    console.log('🔍 Probando conexión a Supabase API REST...');
    
    // Probar conexión básica
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ API REST de Supabase accesible');
    } else {
      console.log(`❌ Error en API REST: ${response.status} ${response.statusText}`);
      return;
    }
    
    // Probar consulta a tabla User
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/User?select=count`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (userResponse.ok) {
      const userCount = await userResponse.json();
      console.log(`📊 Usuarios en la base de datos: ${userCount[0]?.count || 0}`);
    } else {
      console.log(`❌ Error consultando usuarios: ${userResponse.status}`);
    }
    
    // Probar consulta a tabla Lead
    const leadResponse = await fetch(`${supabaseUrl}/rest/v1/Lead?select=count`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Prefer': 'count=exact'
      }
    });
    
    if (leadResponse.ok) {
      const leadCount = await leadResponse.json();
      console.log(`📋 Leads en la base de datos: ${leadCount[0]?.count || 0}`);
    } else {
      console.log(`❌ Error consultando leads: ${leadResponse.status}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSupabase();
