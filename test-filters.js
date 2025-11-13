// Script para probar los filtros de la API de leads
// Ejecutar con: node test-filters.js

const BASE_URL = 'https://phorencial-bot-crm.vercel.app';

async function testFilters() {
  console.log('🧪 Probando filtros de la API de leads...\n');

  // Test 1: Obtener todos los leads
  console.log('1. Obteniendo todos los leads...');
  try {
    const response = await fetch(`${BASE_URL}/api/leads`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Total leads: ${data.total}`);
      console.log(`📋 Estados encontrados: ${[...new Set(data.leads.map(l => l.estado))].join(', ')}`);
      console.log(`🎯 Orígenes encontrados: ${[...new Set(data.leads.map(l => l.origen).filter(Boolean))].join(', ')}\n`);
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`);
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`);
  }

  // Test 2: Filtrar por estado NUEVO
  console.log('2. Filtrando por estado NUEVO...');
  try {
    const response = await fetch(`${BASE_URL}/api/leads?estado=NUEVO`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Leads con estado NUEVO: ${data.total}`);
      console.log(`📋 Leads encontrados: ${data.leads.map(l => `${l.nombre} (${l.estado})`).join(', ')}\n`);
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`);
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`);
  }

  // Test 3: Filtrar por estado CONTACTADO
  console.log('3. Filtrando por estado CONTACTADO...');
  try {
    const response = await fetch(`${BASE_URL}/api/leads?estado=CONTACTADO`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Leads con estado CONTACTADO: ${data.total}`);
      console.log(`📋 Leads encontrados: ${data.leads.map(l => `${l.nombre} (${l.estado})`).join(', ')}\n`);
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`);
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`);
  }

  // Test 4: Filtrar por origen whatsapp
  console.log('4. Filtrando por origen whatsapp...');
  try {
    const response = await fetch(`${BASE_URL}/api/leads?origen=whatsapp`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Leads con origen whatsapp: ${data.total}`);
      console.log(`📋 Leads encontrados: ${data.leads.map(l => `${l.nombre} (${l.origen})`).join(', ')}\n`);
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`);
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`);
  }

  // Test 5: Búsqueda por nombre
  console.log('5. Buscando "Ana"...');
  try {
    const response = await fetch(`${BASE_URL}/api/leads?q=Ana`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Leads que contienen "Ana": ${data.total}`);
      console.log(`📋 Leads encontrados: ${data.leads.map(l => l.nombre).join(', ')}\n`);
    } else {
      console.log(`❌ Error: ${response.status} - ${response.statusText}\n`);
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`);
  }

  console.log('🏁 Pruebas completadas');
}

// Ejecutar las pruebas
testFilters().catch(console.error);
