// Script para probar la creación manual de pipeline
require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function testPipelineCreation() {
  try {
    console.log('🧪 Probando creación manual de pipeline...')
    
    // 1. Crear un lead de prueba
    console.log('📝 Creando lead de prueba...')
    const { data: lead, error: leadError } = await supabase
      .from('Lead')
      .insert({
        nombre: 'Test Pipeline Creation',
        telefono: '+543704888888',
        email: 'test.pipeline@example.com',
        ingresos: 150000000,
        zona: 'Formosa Capital',
        estado: 'NUEVO',
        origen: 'Test'
      })
      .select()
      .single()
    
    if (leadError) {
      throw new Error(`Error creando lead: ${leadError.message}`)
    }
    
    console.log(`✅ Lead creado: ${lead.id}`)
    
    // 2. Crear pipeline manualmente
    console.log('🔄 Creando pipeline manualmente...')
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipeline')
      .insert({
        lead_id: lead.id,
        current_stage: 'LEAD_NUEVO',
        probability_percent: 10,
        total_value: 50000,
        expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .select()
      .single()
    
    if (pipelineError) {
      throw new Error(`Error creando pipeline: ${pipelineError.message}`)
    }
    
    console.log(`✅ Pipeline creado: ${pipeline.id}`)
    
    // 3. Crear entrada en historial
    console.log('📋 Creando entrada en historial...')
    const { data: history, error: historyError } = await supabase
      .from('pipeline_history')
      .insert({
        lead_pipeline_id: pipeline.id,
        from_stage: null,
        to_stage: 'LEAD_NUEVO',
        transition_type: 'MANUAL',
        notes: 'Pipeline creado manualmente para testing'
      })
      .select()
      .single()
    
    if (historyError) {
      throw new Error(`Error creando historial: ${historyError.message}`)
    }
    
    console.log(`✅ Historial creado: ${history.id}`)
    
    // 4. Probar función move_lead_to_stage
    console.log('🔄 Probando función move_lead_to_stage...')
    const { data: moveResult, error: moveError } = await supabase
      .rpc('move_lead_to_stage', {
        p_lead_id: lead.id,
        p_new_stage: 'CONTACTO_INICIAL',
        p_notes: 'Test de movimiento',
        p_changed_by: 'test-user'
      })
    
    if (moveError) {
      throw new Error(`Error moviendo lead: ${moveError.message}`)
    }
    
    console.log(`✅ Lead movido exitosamente`)
    
    // 5. Verificar estado final
    console.log('🔍 Verificando estado final...')
    const { data: finalPipeline, error: finalError } = await supabase
      .from('lead_pipeline')
      .select('*')
      .eq('lead_id', lead.id)
      .single()
    
    if (finalError) {
      throw new Error(`Error verificando estado final: ${finalError.message}`)
    }
    
    console.log(`✅ Estado final: ${finalPipeline.current_stage}`)
    
    // 6. Limpiar datos de prueba
    console.log('🧹 Limpiando datos de prueba...')
    const { error: deleteError } = await supabase
      .from('Lead')
      .delete()
      .eq('id', lead.id)
    
    if (deleteError) {
      console.warn(`⚠️ Error limpiando datos: ${deleteError.message}`)
    } else {
      console.log(`✅ Datos de prueba limpiados`)
    }
    
    console.log('\n🎉 Todas las funciones del pipeline funcionan correctamente!')
    return true
    
  } catch (error) {
    console.error('❌ Error en test de pipeline:', error.message)
    return false
  }
}

// Ejecutar test
if (require.main === module) {
  testPipelineCreation()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Error fatal:', error)
      process.exit(1)
    })
}

module.exports = { testPipelineCreation }
