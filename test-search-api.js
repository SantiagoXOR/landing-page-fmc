/**
 * Verificar que la búsqueda funcione correctamente a través de la API
 */

async function testSearchAPI() {
  try {
    console.log('🔍 Probando búsqueda de "echeverria" a través de la API...');
    
    // Probar búsqueda a través de la API del CRM
    const response = await fetch('http://localhost:3000/api/leads?search=echeverria');
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`📊 Resultados de búsqueda "echeverria":`);
    console.log(`   Total encontrados: ${data.total}`);
    console.log(`   Leads en respuesta: ${data.leads.length}`);
    
    if (data.leads.length > 0) {
      console.log('\n📋 Leads encontrados:');
      data.leads.forEach((lead, index) => {
        console.log(`   ${index + 1}. ${lead.nombre}`);
        console.log(`      - ID: ${lead.id}`);
        console.log(`      - Teléfono: ${lead.telefono}`);
        console.log(`      - Estado: ${lead.estado}`);
        console.log(`      - Email: ${lead.email}`);
        console.log('      ---');
      });
      
      console.log('\n✅ ¡ÉXITO! La búsqueda funciona correctamente.');
      console.log('🎉 El cliente ahora puede buscar "echeverria" y encontrará los leads.');
    } else {
      console.log('\n❌ No se encontraron resultados. Hay un problema con la búsqueda.');
    }
    
    // Probar también búsquedas parciales
    console.log('\n🔍 Probando búsquedas parciales...');
    
    const testCases = ['eche', 'verria', 'maribel', 'silvia'];
    
    for (const term of testCases) {
      const partialResponse = await fetch(`http://localhost:3000/api/leads?search=${term}`);
      const partialData = await partialResponse.json();
      console.log(`   "${term}": ${partialData.total} resultados`);
    }
    
  } catch (error) {
    console.error('❌ Error probando la búsqueda:', error.message);
    console.log('\n💡 Asegúrate de que el servidor esté corriendo con "npm run dev"');
  }
}

testSearchAPI();
