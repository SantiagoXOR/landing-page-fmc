/**
 * Script para verificar registros duplicados en la base de datos
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkDuplicates() {
  console.log('🔍 Verificando registros duplicados...');

  try {
    // Obtener todos los leads
    const url = `${SUPABASE_URL}/rest/v1/Lead?select=*`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const leads = await response.json();
    console.log(`📊 Total de leads en DB: ${leads.length}`);

    // Verificar duplicados por diferentes campos
    const duplicateChecks = [
      { field: 'dni', name: 'DNI' },
      { field: 'email', name: 'Email' },
      { field: 'telefono', name: 'Teléfono' },
      { field: 'nombre', name: 'Nombre' }
    ];

    let totalDuplicates = 0;
    const duplicateRecords = [];

    for (const check of duplicateChecks) {
      console.log(`\n🔍 Verificando duplicados por ${check.name}...`);
      
      const fieldCounts = {};
      const fieldGroups = {};
      
      leads.forEach(lead => {
        const value = lead[check.field];
        if (value && value.trim()) {
          const normalizedValue = value.toLowerCase().trim();
          fieldCounts[normalizedValue] = (fieldCounts[normalizedValue] || 0) + 1;
          
          if (!fieldGroups[normalizedValue]) {
            fieldGroups[normalizedValue] = [];
          }
          fieldGroups[normalizedValue].push(lead);
        }
      });

      const duplicates = Object.entries(fieldCounts).filter(([_, count]) => count > 1);
      
      if (duplicates.length > 0) {
        console.log(`❌ Encontrados ${duplicates.length} valores duplicados de ${check.name}:`);
        
        duplicates.slice(0, 10).forEach(([value, count]) => {
          console.log(`   "${value}": ${count} registros`);
          const group = fieldGroups[value];
          
          // Mostrar detalles de los primeros duplicados
          if (group.length <= 3) {
            group.forEach((lead, index) => {
              console.log(`     ${index + 1}. ID: ${lead.id.substring(0, 8)}... - ${lead.nombre} - ${lead.estado}`);
            });
          }
          
          duplicateRecords.push({
            field: check.field,
            value: value,
            count: count,
            records: group
          });
        });
        
        totalDuplicates += duplicates.reduce((sum, [_, count]) => sum + count - 1, 0);
      } else {
        console.log(`✅ No hay duplicados por ${check.name}`);
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   Total leads: ${leads.length}`);
    console.log(`   Total registros duplicados: ${totalDuplicates}`);
    console.log(`   Leads únicos estimados: ${leads.length - totalDuplicates}`);

    // Verificar el caso específico de "jorge lino bazan"
    console.log(`\n🔍 Verificando caso específico "jorge lino bazan"...`);
    const jorgeLeads = leads.filter(lead => 
      lead.nombre && lead.nombre.toLowerCase().includes('jorge') && lead.nombre.toLowerCase().includes('bazan')
    );
    
    if (jorgeLeads.length > 0) {
      console.log(`📋 Encontrados ${jorgeLeads.length} registros de Jorge Lino Bazan:`);
      jorgeLeads.forEach((lead, index) => {
        console.log(`   ${index + 1}. ID: ${lead.id}`);
        console.log(`      Nombre: "${lead.nombre}"`);
        console.log(`      Email: ${lead.email}`);
        console.log(`      Teléfono: ${lead.telefono}`);
        console.log(`      Estado: ${lead.estado}`);
        console.log(`      Creado: ${lead.createdAt}`);
        console.log('');
      });
    }

    // Sugerir limpieza si hay duplicados
    if (totalDuplicates > 0) {
      console.log(`\n🧹 Recomendación: Ejecutar limpieza de duplicados`);
      console.log(`   Se pueden eliminar aproximadamente ${totalDuplicates} registros duplicados`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDuplicates().catch(console.error);
