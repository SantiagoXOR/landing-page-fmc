// Script para probar CRUD de leads con pipeline integrado
require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Datos de prueba
const testLead = {
  nombre: 'Test Lead CRUD',
  telefono: '+543704999999',
  email: 'test.crud@example.com',
  ingresos: 150000000,
  zona: 'Formosa Capital',
  estado: 'NUEVO',
  origen: 'Test'
}

let createdLeadId = null

// Test 1: Crear lead
async function testCreateLead() {
  try {
    log('🧪 Test 1: Crear lead...', 'blue')
    
    const { data: lead, error } = await supabase
      .from('Lead')
      .insert(testLead)
      .select()
      .single()
    
    if (error) {
      log(`  ❌ Error creando lead: ${error.message}`, 'red')
      return false
    }
    
    createdLeadId = lead.id
    log(`  ✅ Lead creado exitosamente: ID ${createdLeadId}`, 'green')
    
    // Verificar que se creó el pipeline automáticamente
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipeline')
      .select('*')
      .eq('lead_id', createdLeadId)
      .single()
    
    if (pipelineError || !pipeline) {
      log(`  ❌ Pipeline no se creó automáticamente`, 'red')
      return false
    }
    
    log(`  ✅ Pipeline creado automáticamente: Etapa ${pipeline.current_stage}`, 'green')
    return true
    
  } catch (error) {
    log(`  ❌ Error en test de creación: ${error.message}`, 'red')
    return false
  }
}

// Test 2: Leer lead
async function testReadLead() {
  try {
    log('🧪 Test 2: Leer lead...', 'blue')
    
    if (!createdLeadId) {
      log(`  ❌ No hay lead creado para leer`, 'red')
      return false
    }
    
    const { data: lead, error } = await supabase
      .from('Lead')
      .select('*')
      .eq('id', createdLeadId)
      .single()
    
    if (error || !lead) {
      log(`  ❌ Error leyendo lead: ${error?.message || 'Lead no encontrado'}`, 'red')
      return false
    }
    
    log(`  ✅ Lead leído exitosamente: ${lead.nombre}`, 'green')
    
    // Verificar que se puede leer con pipeline incluido
    const { data: leadWithPipeline, error: pipelineError } = await supabase
      .from('Lead')
      .select(`
        *,
        pipeline:lead_pipeline(*)
      `)
      .eq('id', createdLeadId)
      .single()
    
    if (pipelineError || !leadWithPipeline.pipeline) {
      log(`  ❌ Error leyendo lead con pipeline: ${pipelineError?.message || 'Pipeline no encontrado'}`, 'red')
      return false
    }
    
    log(`  ✅ Lead con pipeline leído exitosamente`, 'green')
    return true
    
  } catch (error) {
    log(`  ❌ Error en test de lectura: ${error.message}`, 'red')
    return false
  }
}

// Test 3: Actualizar lead
async function testUpdateLead() {
  try {
    log('🧪 Test 3: Actualizar lead...', 'blue')
    
    if (!createdLeadId) {
      log(`  ❌ No hay lead creado para actualizar`, 'red')
      return false
    }
    
    const updates = {
      nombre: 'Test Lead CRUD Actualizado',
      estado: 'CONTACTADO',
      ingresos: 200000000
    }
    
    const { data: updatedLead, error } = await supabase
      .from('Lead')
      .update(updates)
      .eq('id', createdLeadId)
      .select()
      .single()
    
    if (error || !updatedLead) {
      log(`  ❌ Error actualizando lead: ${error?.message || 'Lead no actualizado'}`, 'red')
      return false
    }
    
    log(`  ✅ Lead actualizado exitosamente: ${updatedLead.nombre}`, 'green')
    
    // Verificar que el pipeline se mantiene consistente
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipeline')
      .select('*')
      .eq('lead_id', createdLeadId)
      .single()
    
    if (pipelineError || !pipeline) {
      log(`  ❌ Pipeline perdido después de actualización`, 'red')
      return false
    }
    
    log(`  ✅ Pipeline mantiene consistencia después de actualización`, 'green')
    return true
    
  } catch (error) {
    log(`  ❌ Error en test de actualización: ${error.message}`, 'red')
    return false
  }
}

// Test 4: Mover lead en pipeline
async function testMovePipelineStage() {
  try {
    log('🧪 Test 4: Mover lead en pipeline...', 'blue')
    
    if (!createdLeadId) {
      log(`  ❌ No hay lead creado para mover en pipeline`, 'red')
      return false
    }
    
    // Mover a etapa CALIFICACION
    const { data: result, error } = await supabase
      .rpc('move_lead_to_stage', {
        p_lead_id: createdLeadId,
        p_new_stage: 'CALIFICACION',
        p_notes: 'Test de movimiento de etapa',
        p_changed_by: 'test-user'
      })
    
    if (error) {
      log(`  ❌ Error moviendo lead en pipeline: ${error.message}`, 'red')
      return false
    }
    
    // Verificar que se movió correctamente
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipeline')
      .select('*')
      .eq('lead_id', createdLeadId)
      .single()
    
    if (pipelineError || pipeline.current_stage !== 'CALIFICACION') {
      log(`  ❌ Lead no se movió a la etapa correcta`, 'red')
      return false
    }
    
    log(`  ✅ Lead movido exitosamente a etapa: ${pipeline.current_stage}`, 'green')
    
    // Verificar que se creó entrada en historial
    const { data: history, error: historyError } = await supabase
      .from('pipeline_history')
      .select('*')
      .eq('lead_pipeline_id', pipeline.id)
      .order('changed_at', { ascending: false })
      .limit(1)
    
    if (historyError || !history || history.length === 0) {
      log(`  ❌ No se creó entrada en historial`, 'red')
      return false
    }
    
    log(`  ✅ Entrada en historial creada: ${history[0].from_stage} → ${history[0].to_stage}`, 'green')
    return true
    
  } catch (error) {
    log(`  ❌ Error en test de movimiento de pipeline: ${error.message}`, 'red')
    return false
  }
}

// Test 5: Eliminar lead
async function testDeleteLead() {
  try {
    log('🧪 Test 5: Eliminar lead...', 'blue')
    
    if (!createdLeadId) {
      log(`  ❌ No hay lead creado para eliminar`, 'red')
      return false
    }
    
    // Verificar que existe pipeline antes de eliminar
    const { data: pipelineBefore, error: pipelineBeforeError } = await supabase
      .from('lead_pipeline')
      .select('id')
      .eq('lead_id', createdLeadId)
      .single()
    
    if (pipelineBeforeError || !pipelineBefore) {
      log(`  ❌ Pipeline no encontrado antes de eliminar`, 'red')
      return false
    }
    
    const pipelineId = pipelineBefore.id
    
    // Eliminar lead
    const { error } = await supabase
      .from('Lead')
      .delete()
      .eq('id', createdLeadId)
    
    if (error) {
      log(`  ❌ Error eliminando lead: ${error.message}`, 'red')
      return false
    }
    
    log(`  ✅ Lead eliminado exitosamente`, 'green')
    
    // Verificar que el pipeline también se eliminó (CASCADE)
    const { data: pipelineAfter, error: pipelineAfterError } = await supabase
      .from('lead_pipeline')
      .select('id')
      .eq('id', pipelineId)
      .single()
    
    if (!pipelineAfterError || pipelineAfter) {
      log(`  ❌ Pipeline no se eliminó automáticamente`, 'red')
      return false
    }
    
    log(`  ✅ Pipeline eliminado automáticamente (CASCADE)`, 'green')
    
    // Verificar que el historial también se eliminó
    const { data: historyAfter, error: historyAfterError } = await supabase
      .from('pipeline_history')
      .select('id')
      .eq('lead_pipeline_id', pipelineId)
    
    if (!historyAfterError && historyAfter && historyAfter.length > 0) {
      log(`  ❌ Historial no se eliminó automáticamente`, 'red')
      return false
    }
    
    log(`  ✅ Historial eliminado automáticamente (CASCADE)`, 'green')
    return true
    
  } catch (error) {
    log(`  ❌ Error en test de eliminación: ${error.message}`, 'red')
    return false
  }
}

// Test 6: Verificar métricas del pipeline
async function testPipelineMetrics() {
  try {
    log('🧪 Test 6: Verificar métricas del pipeline...', 'blue')
    
    const { data: metrics, error } = await supabase
      .rpc('get_pipeline_metrics')
    
    if (error) {
      log(`  ❌ Error obteniendo métricas: ${error.message}`, 'red')
      return false
    }
    
    if (!metrics || metrics.length === 0) {
      log(`  ❌ No se obtuvieron métricas`, 'red')
      return false
    }
    
    log(`  ✅ Métricas obtenidas: ${metrics.length} etapas con datos`, 'green')
    
    // Mostrar algunas métricas
    metrics.slice(0, 3).forEach(metric => {
      log(`    ${metric.stage}: ${metric.total_leads} leads, ${metric.conversion_rate}% conversión`, 'blue')
    })
    
    return true
    
  } catch (error) {
    log(`  ❌ Error en test de métricas: ${error.message}`, 'red')
    return false
  }
}

// Función principal
async function runCRUDTests() {
  log('🚀 INICIANDO TESTS DE CRUD DE LEADS CON PIPELINE', 'bold')
  log('=' .repeat(60), 'blue')
  
  const tests = [
    ['Crear lead', testCreateLead],
    ['Leer lead', testReadLead],
    ['Actualizar lead', testUpdateLead],
    ['Mover lead en pipeline', testMovePipelineStage],
    ['Eliminar lead', testDeleteLead],
    ['Verificar métricas del pipeline', testPipelineMetrics]
  ]
  
  let passedTests = 0
  let totalTests = tests.length
  
  for (const [testName, testFunction] of tests) {
    try {
      const passed = await testFunction()
      if (passed) {
        passedTests++
        log(`✅ ${testName} - PASÓ\n`, 'green')
      } else {
        log(`❌ ${testName} - FALLÓ\n`, 'red')
      }
    } catch (error) {
      log(`❌ ${testName} - ERROR: ${error.message}\n`, 'red')
    }
  }
  
  // Resumen final
  log('=' .repeat(60), 'blue')
  log('📊 RESUMEN DE TESTS CRUD:', 'bold')
  
  if (passedTests === totalTests) {
    log(`✅ TODOS LOS TESTS CRUD PASARON: ${passedTests}/${totalTests}`, 'green')
    log('🎉 CRUD DE LEADS CON PIPELINE COMPLETAMENTE FUNCIONAL', 'green')
  } else {
    log(`⚠️ TESTS PASADOS: ${passedTests}/${totalTests}`, 'yellow')
    log(`❌ TESTS FALLIDOS: ${totalTests - passedTests}`, 'red')
  }
  
  return passedTests === totalTests
}

// Ejecutar tests
if (require.main === module) {
  runCRUDTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      log(`❌ Error fatal en tests CRUD: ${error.message}`, 'red')
      process.exit(1)
    })
}

module.exports = { runCRUDTests }
