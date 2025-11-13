// Script para migrar leads existentes al pipeline de ventas
// Este script debe ejecutarse una sola vez después de implementar el pipeline

require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeo de estados de leads a etapas del pipeline
const estadoToPipelineStage = {
  'NUEVO': 'LEAD_NUEVO',
  'CONTACTADO': 'CONTACTO_INICIAL',
  'CALIFICADO': 'CALIFICACION',
  'PRESENTACION': 'PRESENTACION',
  'PROPUESTA': 'PROPUESTA',
  'NEGOCIACION': 'NEGOCIACION',
  'PREAPROBADO': 'CIERRE_GANADO',
  'RECHAZADO': 'CIERRE_PERDIDO',
  'DOCUMENTACION_PENDIENTE': 'PROPUESTA',
  'DERIVADO': 'SEGUIMIENTO'
}

// Función para obtener probabilidad por etapa
function getProbabilityForStage(stage) {
  const probabilities = {
    'LEAD_NUEVO': 10,
    'CONTACTO_INICIAL': 20,
    'CALIFICACION': 30,
    'PRESENTACION': 50,
    'PROPUESTA': 70,
    'NEGOCIACION': 80,
    'CIERRE_GANADO': 100,
    'CIERRE_PERDIDO': 0,
    'SEGUIMIENTO': 100
  }
  return probabilities[stage] || 10
}

// Función principal de migración
async function migrateLeadsToPipeline() {
  try {
    console.log('🚀 Iniciando migración de leads al pipeline...')

    // 1. Obtener todos los leads existentes
    console.log('📋 Obteniendo leads existentes...')
    const { data: leads, error: leadsError } = await supabase
      .from('Lead')
      .select('*')

    if (leadsError) {
      throw new Error(`Error obteniendo leads: ${leadsError.message}`)
    }

    console.log(`✅ Encontrados ${leads.length} leads para migrar`)

    // 2. Verificar cuáles leads ya tienen pipeline
    console.log('🔍 Verificando leads que ya tienen pipeline...')
    const { data: existingPipelines, error: pipelineError } = await supabase
      .from('lead_pipeline')
      .select('lead_id')

    if (pipelineError) {
      throw new Error(`Error verificando pipelines existentes: ${pipelineError.message}`)
    }

    const existingPipelineLeadIds = new Set(existingPipelines.map(p => p.lead_id))
    const leadsToMigrate = leads.filter(lead => !existingPipelineLeadIds.has(lead.id))

    console.log(`📊 ${existingPipelines.length} leads ya tienen pipeline`)
    console.log(`🔄 ${leadsToMigrate.length} leads necesitan migración`)

    if (leadsToMigrate.length === 0) {
      console.log('✅ Todos los leads ya tienen pipeline. Migración completa.')
      return
    }

    // 3. Migrar leads al pipeline
    console.log('🔄 Migrando leads al pipeline...')
    let migratedCount = 0
    let errorCount = 0

    for (const lead of leadsToMigrate) {
      try {
        // Mapear estado del lead a etapa del pipeline
        const pipelineStage = estadoToPipelineStage[lead.estado] || 'LEAD_NUEVO'
        
        // Calcular valor estimado del deal
        const totalValue = lead.ingresos ? lead.ingresos * 0.1 : 50000 // 10% de ingresos o valor por defecto
        
        // Calcular fecha de cierre esperada
        const expectedCloseDate = new Date()
        expectedCloseDate.setDate(expectedCloseDate.getDate() + 30) // 30 días por defecto

        // Crear entrada en pipeline
        const pipelineData = {
          lead_id: lead.id,
          current_stage: pipelineStage,
          stage_entered_at: lead.createdAt || new Date().toISOString(),
          total_value: totalValue,
          probability_percent: getProbabilityForStage(pipelineStage),
          expected_close_date: expectedCloseDate.toISOString().split('T')[0],
          created_at: lead.createdAt || new Date().toISOString(),
          updated_at: lead.updatedAt || new Date().toISOString()
        }

        // Si es etapa final, marcar como cerrado
        if (pipelineStage === 'CIERRE_GANADO' || pipelineStage === 'CIERRE_PERDIDO') {
          pipelineData.closed_at = lead.updatedAt || new Date().toISOString()
          pipelineData.won = pipelineStage === 'CIERRE_GANADO'
        }

        const { error: insertError } = await supabase
          .from('lead_pipeline')
          .insert(pipelineData)

        if (insertError) {
          throw new Error(`Error insertando pipeline: ${insertError.message}`)
        }

        // Crear entrada en historial
        const historyData = {
          lead_pipeline_id: null, // Se actualizará después
          from_stage: null,
          to_stage: pipelineStage,
          transition_type: 'MANUAL',
          duration_in_stage_days: 0,
          notes: 'Migración inicial al pipeline',
          changed_at: lead.createdAt || new Date().toISOString()
        }

        // Obtener el ID del pipeline recién creado
        const { data: createdPipeline, error: pipelineIdError } = await supabase
          .from('lead_pipeline')
          .select('id')
          .eq('lead_id', lead.id)
          .single()

        if (!pipelineIdError && createdPipeline) {
          historyData.lead_pipeline_id = createdPipeline.id

          const { error: historyError } = await supabase
            .from('pipeline_history')
            .insert(historyData)

          if (historyError) {
            console.warn(`⚠️ Error creando historial para lead ${lead.id}: ${historyError.message}`)
          }
        }

        migratedCount++
        
        if (migratedCount % 50 === 0) {
          console.log(`📈 Progreso: ${migratedCount}/${leadsToMigrate.length} leads migrados`)
        }

      } catch (error) {
        console.error(`❌ Error migrando lead ${lead.id}:`, error.message)
        errorCount++
      }
    }

    // 4. Resumen de migración
    console.log('\n📊 RESUMEN DE MIGRACIÓN:')
    console.log(`✅ Leads migrados exitosamente: ${migratedCount}`)
    console.log(`❌ Errores durante migración: ${errorCount}`)
    console.log(`📋 Total de leads en sistema: ${leads.length}`)
    console.log(`🔄 Leads con pipeline: ${existingPipelines.length + migratedCount}`)

    // 5. Verificar integridad
    console.log('\n🔍 Verificando integridad de la migración...')
    const { data: finalPipelines, error: finalError } = await supabase
      .from('lead_pipeline')
      .select('lead_id')

    if (finalError) {
      console.error('❌ Error verificando integridad:', finalError.message)
    } else {
      const finalPipelineCount = finalPipelines.length
      const expectedCount = leads.length
      
      if (finalPipelineCount === expectedCount) {
        console.log('✅ Integridad verificada: Todos los leads tienen pipeline')
      } else {
        console.log(`⚠️ Advertencia: ${expectedCount - finalPipelineCount} leads sin pipeline`)
      }
    }

    console.log('\n🎉 Migración completada exitosamente!')

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message)
    process.exit(1)
  }
}

// Función para mostrar estadísticas del pipeline
async function showPipelineStats() {
  try {
    console.log('\n📊 ESTADÍSTICAS DEL PIPELINE:')
    
    const { data: stats, error } = await supabase
      .from('lead_pipeline')
      .select('current_stage')

    if (error) {
      console.error('Error obteniendo estadísticas:', error.message)
      return
    }

    const stageCount = {}
    stats.forEach(pipeline => {
      stageCount[pipeline.current_stage] = (stageCount[pipeline.current_stage] || 0) + 1
    })

    Object.entries(stageCount).forEach(([stage, count]) => {
      console.log(`${stage}: ${count} leads`)
    })

  } catch (error) {
    console.error('Error mostrando estadísticas:', error.message)
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateLeadsToPipeline()
    .then(() => showPipelineStats())
    .then(() => {
      console.log('\n✅ Proceso completado. El pipeline está listo para usar.')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Error fatal:', error)
      process.exit(1)
    })
}

module.exports = {
  migrateLeadsToPipeline,
  showPipelineStats
}
