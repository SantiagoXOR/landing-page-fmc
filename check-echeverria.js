// Usar fetch nativo de Node.js

async function checkEcheverria() {
  try {
    console.log('🔍 Verificando lead "echeverria" en la base de datos...');
    
    // Obtener todos los leads
    const response = await fetch('http://localhost:3000/api/leads');
    const data = await response.json();
    
    console.log('📊 Total de leads:', data.total);
    
    // Buscar leads que contengan 'echeverria'
    const echeverriaLeads = data.leads.filter(lead => 
      lead.nombre?.toLowerCase().includes('echeverria')
    );
    
    console.log('🎯 Leads con "echeverria":', echeverriaLeads.length);
    
    if (echeverriaLeads.length > 0) {
      console.log('📋 Leads encontrados:');
      echeverriaLeads.forEach(lead => {
        console.log('  - ID:', lead.id);
        console.log('  - Nombre:', lead.nombre);
        console.log('  - Teléfono:', lead.telefono);
        console.log('  - Estado:', lead.estado);
        console.log('  ---');
      });
    } else {
      console.log('❌ No se encontraron leads con "echeverria"');
      
      // Mostrar algunos nombres de ejemplo para verificar formato
      console.log('📝 Primeros 10 nombres en la base de datos:');
      data.leads.slice(0, 10).forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.nombre}`);
      });
    }
    
    // Probar búsqueda específica
    console.log('\n🔍 Probando búsqueda específica...');
    const searchResponse = await fetch('http://localhost:3000/api/leads?search=echeverria');
    const searchData = await searchResponse.json();
    
    console.log('🎯 Resultados de búsqueda "echeverria":', searchData.total);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEcheverria();
