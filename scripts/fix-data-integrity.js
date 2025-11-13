// Script para corregir problemas de integridad de datos
require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixDataIntegrity() {
  try {
    console.log('🔧 Iniciando corrección de integridad de datos...')
    
    // 1. Obtener todos los leads existentes
    console.log('📋 Obteniendo leads existentes...')
    const { data: leads, error: leadsError } = await supabase
      .from('Lead')
      .select('id')
    
    if (leadsError) {
      throw new Error(`Error obteniendo leads: ${leadsError.message}`)
    }
    
    console.log(`✅ Encontrados ${leads.length} leads`)
    
    // 2. Obtener todos los pipelines
    console.log('🔄 Obteniendo pipelines existentes...')
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('lead_pipeline')
      .select('id, lead_id')
    
    if (pipelinesError) {
      throw new Error(`Error obteniendo pipelines: ${pipelinesError.message}`)
    }
    
    console.log(`✅ Encontrados ${pipelines.length} pipelines`)
    
    // 3. Identificar pipelines huérfanos
    const validLeadIds = new Set(leads.map(lead => lead.id))
    const orphanPipelines = pipelines.filter(pipeline => !validLeadIds.has(pipeline.lead_id))
    
    console.log(`🔍 Pipelines huérfanos encontrados: ${orphanPipelines.length}`)
    
    if (orphanPipelines.length === 0) {
      console.log('✅ No hay problemas de integridad')
      return
    }
    
    // 4. Mostrar algunos ejemplos de pipelines huérfanos
    console.log('📝 Ejemplos de pipelines huérfanos:')
    orphanPipelines.slice(0, 5).forEach(pipeline => {
      console.log(`   Pipeline ID: ${pipeline.id}, Lead ID: ${pipeline.lead_id}`)
    })
    
    // 5. Eliminar pipelines huérfanos
    console.log(`🗑️ Eliminando ${orphanPipelines.length} pipelines huérfanos...`)
    
    const orphanIds = orphanPipelines.map(p => p.id)
    
    // Eliminar en lotes para evitar problemas de performance
    const batchSize = 50
    let deletedCount = 0
    
    for (let i = 0; i < orphanIds.length; i += batchSize) {
      const batch = orphanIds.slice(i, i + batchSize)
      
      const { error: deleteError } = await supabase
        .from('lead_pipeline')
        .delete()
        .in('id', batch)
      
      if (deleteError) {
        console.error(`❌ Error eliminando lote ${i / batchSize + 1}: ${deleteError.message}`)
      } else {
        deletedCount += batch.length
        console.log(`✅ Eliminados ${deletedCount}/${orphanIds.length} pipelines huérfanos`)
      }
    }
    
    // 6. Verificar integridad después de la limpieza
    console.log('🔍 Verificando integridad después de la limpieza...')
    
    const { data: remainingPipelines, error: remainingError } = await supabase
      .from('lead_pipeline')
      .select('id, lead_id')
    
    if (remainingError) {
      throw new Error(`Error verificando pipelines restantes: ${remainingError.message}`)
    }
    
    const remainingOrphans = remainingPipelines.filter(pipeline => !validLeadIds.has(pipeline.lead_id))
    
    if (remainingOrphans.length === 0) {
      console.log('✅ Integridad de datos corregida exitosamente')
    } else {
      console.log(`⚠️ Aún quedan ${remainingOrphans.length} pipelines huérfanos`)
    }
    
    // 7. Crear pipelines para leads que no los tienen
    console.log('🔄 Verificando leads sin pipeline...')
    
    const pipelineLeadIds = new Set(remainingPipelines.map(p => p.lead_id))
    const leadsWithoutPipeline = leads.filter(lead => !pipelineLeadIds.has(lead.id))
    
    console.log(`📋 Leads sin pipeline: ${leadsWithoutPipeline.length}`)
    
    if (leadsWithoutPipeline.length > 0) {
      console.log('➕ Creando pipelines para leads sin pipeline...')
      
      for (const lead of leadsWithoutPipeline) {
        try {
          const { error: insertError } = await supabase
            .from('lead_pipeline')
            .insert({
              lead_id: lead.id,
              current_stage: 'LEAD_NUEVO',
              probability_percent: 10,
              total_value: 50000,
              expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
          
          if (insertError) {
            console.error(`❌ Error creando pipeline para lead ${lead.id}: ${insertError.message}`)
          }
        } catch (error) {
          console.error(`❌ Error procesando lead ${lead.id}: ${error.message}`)
        }
      }
      
      console.log(`✅ Pipelines creados para ${leadsWithoutPipeline.length} leads`)
    }
    
    // 8. Resumen final
    console.log('\n📊 RESUMEN DE CORRECCIÓN:')
    console.log(`🗑️ Pipelines huérfanos eliminados: ${deletedCount}`)
    console.log(`➕ Pipelines creados: ${leadsWithoutPipeline.length}`)
    console.log(`📋 Total de leads: ${leads.length}`)
    console.log(`🔄 Total de pipelines válidos: ${remainingPipelines.length - remainingOrphans.length + leadsWithoutPipeline.length}`)
    
    console.log('\n✅ Corrección de integridad completada')
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error.message)
    throw error
  }
}

// Ejecutar corrección
if (require.main === module) {
  fixDataIntegrity()
    .then(() => {
      console.log('\n🎉 Proceso completado exitosamente')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Error fatal:', error)
      process.exit(1)
    })
}

module.exports = { fixDataIntegrity }
