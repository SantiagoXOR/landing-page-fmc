/**
 * Script para limpiar registros duplicados de la base de datos
 * Mantiene el registro más reciente de cada duplicado
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function cleanDuplicates() {
  console.log('🧹 Iniciando limpieza de duplicados...');

  try {
    // Obtener todos los leads
    const url = `${SUPABASE_URL}/rest/v1/Lead?select=*&order=createdAt.desc`;
    
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
    console.log(`📊 Total de leads antes de limpieza: ${leads.length}`);

    // Agrupar por DNI (criterio principal para duplicados)
    const groupsByDNI = {};
    leads.forEach(lead => {
      if (lead.dni && lead.dni.trim()) {
        const dni = lead.dni.trim();
        if (!groupsByDNI[dni]) {
          groupsByDNI[dni] = [];
        }
        groupsByDNI[dni].push(lead);
      }
    });

    // Encontrar duplicados y marcar para eliminación
    const toDelete = [];
    let duplicatesFound = 0;

    Object.entries(groupsByDNI).forEach(([dni, group]) => {
      if (group.length > 1) {
        duplicatesFound++;
        console.log(`🔍 DNI ${dni}: ${group.length} registros duplicados`);
        
        // Ordenar por fecha de creación (más reciente primero)
        group.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Mantener el más reciente, marcar el resto para eliminación
        const [keep, ...remove] = group;
        console.log(`   ✅ Mantener: ${keep.id} (${keep.nombre}) - ${keep.createdAt}`);
        
        remove.forEach(lead => {
          console.log(`   ❌ Eliminar: ${lead.id} (${lead.nombre}) - ${lead.createdAt}`);
          toDelete.push(lead.id);
        });
      }
    });

    console.log(`\n📊 Resumen de limpieza:`);
    console.log(`   Grupos de duplicados encontrados: ${duplicatesFound}`);
    console.log(`   Registros a eliminar: ${toDelete.length}`);
    console.log(`   Registros que quedarán: ${leads.length - toDelete.length}`);

    if (toDelete.length === 0) {
      console.log('✅ No hay duplicados para limpiar');
      return;
    }

    // Confirmar antes de proceder
    console.log('\n⚠️  ¿Proceder con la eliminación? (Esto no se puede deshacer)');
    console.log('   Para confirmar, ejecuta el script con el parámetro --confirm');
    
    // Verificar si se pasó el parámetro de confirmación
    const confirmFlag = process.argv.includes('--confirm');
    
    if (!confirmFlag) {
      console.log('\n🛑 Limpieza cancelada. Para ejecutar, usa: node scripts/clean-duplicates.js --confirm');
      return;
    }

    console.log('\n🗑️  Eliminando registros duplicados...');

    // Eliminar en lotes de 50 para evitar timeouts
    const batchSize = 50;
    let deleted = 0;

    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      
      console.log(`   Eliminando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(toDelete.length/batchSize)} (${batch.length} registros)...`);

      for (const id of batch) {
        try {
          const deleteUrl = `${SUPABASE_URL}/rest/v1/Lead?id=eq.${id}`;
          
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          if (deleteResponse.ok) {
            deleted++;
          } else {
            console.log(`     ❌ Error eliminando ${id}: ${deleteResponse.status}`);
          }
        } catch (error) {
          console.log(`     ❌ Error eliminando ${id}: ${error.message}`);
        }
      }

      // Pausa pequeña entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Limpieza completada:`);
    console.log(`   Registros eliminados: ${deleted}`);
    console.log(`   Registros restantes estimados: ${leads.length - deleted}`);

    // Verificar resultado final
    console.log('\n🔍 Verificando resultado...');
    const finalResponse = await fetch(url, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (finalResponse.ok) {
      const finalLeads = await finalResponse.json();
      console.log(`📊 Total de leads después de limpieza: ${finalLeads.length}`);
      console.log(`🎉 Se eliminaron ${leads.length - finalLeads.length} registros duplicados`);
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
  }
}

cleanDuplicates().catch(console.error);
