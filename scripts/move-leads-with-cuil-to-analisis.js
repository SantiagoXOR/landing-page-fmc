/**
 * Script para mover automáticamente leads con CUIL a "Listo para Análisis"
 * 
 * Procesa todos los leads que:
 * - Tienen CUIL válido (7+ caracteres)
 * - Están en CLIENTE_NUEVO o CONSULTANDO_CREDITO
 * 
 * Uso:
 *   node scripts/move-leads-with-cuil-to-analisis.js
 * 
 * Opciones:
 *   --dry-run    Solo mostrar qué leads se moverían sin hacer cambios
 *   --limit N    Procesar solo los primeros N leads (útil para pruebas)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1]) : null

// Funciones helper (copiadas del servicio)
function extractCUILOrDNI(value) {
  if (!value) return null
  
  const strValue = String(value)
  
  // Buscar patrón CUIL/CUIT con formato XX-XXXXXXXX-X
  const cuilWithDashes = strValue.match(/\b\d{2}-\d{8}-\d{1}\b/)
  if (cuilWithDashes) {
    return cuilWithDashes[0]
  }
  
  // Buscar patrón CUIL/CUIT sin guiones (11 dígitos consecutivos)
  const cuilWithoutDashes = strValue.match(/\b\d{11}\b/)
  if (cuilWithoutDashes) {
    const digits = cuilWithoutDashes[0]
    if (/^\d{2}\d{8}\d{1}$/.test(digits)) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    }
  }
  
  // Buscar DNI (8 dígitos) - solo si no encontramos CUIL/CUIT
  const dni = strValue.match(/\b\d{8}\b/)
  if (dni && !cuilWithDashes && !cuilWithoutDashes) {
    return dni[0]
  }
  
  // Si el valor completo parece ser un CUIL/DNI (solo números, 7-11 dígitos)
  const onlyDigits = strValue.replace(/\D/g, '')
  if (onlyDigits.length >= 7 && onlyDigits.length <= 11) {
    return onlyDigits
  }
  
  return null
}

function extractCUILFromLead(lead) {
  try {
    // 1. Buscar en el campo directo cuil
    if (lead.cuil) {
      const extracted = extractCUILOrDNI(lead.cuil)
      if (extracted) return extracted
    }

    // 2. Buscar en customFields
    if (lead.customFields) {
      let customFields = {}
      
      try {
        customFields = typeof lead.customFields === 'string'
          ? JSON.parse(lead.customFields)
          : lead.customFields
      } catch (parseError) {
        return null
      }

      // Buscar en claves conocidas
      const cuilValue = customFields.cuit || customFields.cuil || customFields.dni
      if (cuilValue) {
        const extracted = extractCUILOrDNI(cuilValue)
        if (extracted) return extracted
      }

      // Buscar en todos los valores de customFields por patrón
      for (const [key, value] of Object.entries(customFields)) {
        if (value === null || value === undefined) continue
        
        const extracted = extractCUILOrDNI(value)
        if (extracted) {
          return extracted
        }
      }
    }

    return null
  } catch (error) {
    return null
  }
}

function isValidCUIL(cuil) {
  if (!cuil) return false
  
  // Remover espacios y guiones para validar longitud
  const cleanCuil = cuil.replace(/[\s-]/g, '')
  
  // Debe tener al menos 7 caracteres
  return cleanCuil.length >= 7
}

async function moveLeadToStage(leadId, targetStage, userId = 'system', notes = '') {
  try {
    // Obtener pipeline actual
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipeline')
      .select('id, current_stage, stage_entered_at')
      .eq('lead_id', leadId)
      .single()

    if (pipelineError && pipelineError.code !== 'PGRST116') {
      throw new Error(`Error obteniendo pipeline: ${pipelineError.message}`)
    }

    if (!pipeline) {
      // Crear pipeline si no existe (solo columnas esenciales)
      const pipelineData = {
        lead_id: leadId,
        current_stage: 'CLIENTE_NUEVO',
        probability_percent: 10
      }

      const { data: newPipeline, error: createError } = await supabase
        .from('lead_pipeline')
        .insert(pipelineData)
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Crear entrada en historial
      await supabase
        .from('pipeline_history')
        .insert({
          lead_pipeline_id: newPipeline.id,
          from_stage: null,
          to_stage: 'CLIENTE_NUEVO',
          transition_type: 'AUTOMATIC',
          notes: 'Pipeline creado automáticamente',
          changed_by: userId,
          changed_at: new Date().toISOString()
        })

      // Si el targetStage no es CLIENTE_NUEVO, mover ahora
      if (targetStage !== 'CLIENTE_NUEVO') {
        return await moveLeadToStage(leadId, targetStage, userId, notes)
      }

      return true
    }

    // Calcular duración en etapa actual
    const stageEnteredAt = new Date(pipeline.stage_entered_at)
    const durationDays = Math.floor((Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24))

    // Probabilidades por etapa
    const probabilities = {
      'CLIENTE_NUEVO': 10,
      'CONSULTANDO_CREDITO': 20,
      'SOLICITANDO_DOCS': 30,
      'LISTO_ANALISIS': 40,
      'PREAPROBADO': 60,
      'APROBADO': 80,
      'EN_SEGUIMIENTO': 90,
      'CERRADO_GANADO': 100,
      'RECHAZADO': 0
    }

    // Actualizar pipeline
    const { error: updateError } = await supabase
      .from('lead_pipeline')
      .update({
        current_stage: targetStage,
        stage_entered_at: new Date().toISOString(),
        probability_percent: probabilities[targetStage] || 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', pipeline.id)

    if (updateError) throw updateError

    // Crear entrada en historial
    await supabase
      .from('pipeline_history')
      .insert({
        lead_pipeline_id: pipeline.id,
        from_stage: pipeline.current_stage,
        to_stage: targetStage,
        transition_type: 'AUTOMATIC',
        duration_in_stage_days: durationDays,
        notes: notes || `Movido automáticamente a ${targetStage}`,
        changed_by: userId,
        changed_at: new Date().toISOString()
      })

    return true
  } catch (error) {
    throw error
  }
}

async function checkAndMoveLeadWithCUIL(leadId) {
  try {
    // 1. Obtener el lead
    const { data: lead, error: leadError } = await supabase
      .from('Lead')
      .select('id, nombre, cuil, customFields')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return false
    }

    // 2. Extraer CUIL del lead
    const cuil = extractCUILFromLead(lead)

    if (!isValidCUIL(cuil)) {
      return false
    }

    // 3. Obtener pipeline actual del lead
    const { data: pipeline, error: pipelineError } = await supabase
      .from('lead_pipeline')
      .select('id, current_stage')
      .eq('lead_id', leadId)
      .single()

    if (pipelineError && pipelineError.code !== 'PGRST116') {
      return false
    }

    // 4. Verificar que esté en una etapa válida para mover
    const validStages = ['CLIENTE_NUEVO', 'CONSULTANDO_CREDITO', 'LEAD_NUEVO', 'CONTACTO_INICIAL']
    const currentStage = pipeline?.current_stage

    if (!currentStage) {
      // No hay pipeline, crear uno y moverlo
      await moveLeadToStage(leadId, 'LISTO_ANALISIS', 'system', `Movido automáticamente: Lead tiene CUIL`)
      return true
    }

    // Verificar si está en una etapa válida
    if (!validStages.includes(currentStage)) {
      return false
    }

    // Verificar que no esté ya en LISTO_ANALISIS
    if (currentStage === 'LISTO_ANALISIS') {
      return false
    }

    // Mover el lead a LISTO_ANALISIS
    await moveLeadToStage(leadId, 'LISTO_ANALISIS', 'system', `Movido automáticamente: Lead tiene CUIL`)
    return true
  } catch (error) {
    console.error(`Error procesando lead ${leadId}:`, error.message)
    return false
  }
}

async function main() {
  console.log('\n🚀 Script: Mover Leads con CUIL a Listo para Análisis\n')
  
  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: No se harán cambios reales\n')
  }

  try {
    // 1. Obtener todos los leads con CUIL
    console.log('📋 Buscando leads con CUIL...')
    
    const { data: leadsWithCuil, error: leadsError } = await supabase
      .from('Lead')
      .select('id, nombre, cuil, customFields')
      .not('cuil', 'is', null)
      .neq('cuil', '')
      .limit(limit || 10000)

    if (leadsError) {
      throw leadsError
    }

    if (!leadsWithCuil || leadsWithCuil.length === 0) {
      console.log('✅ No se encontraron leads con CUIL')
      return
    }

    console.log(`   Encontrados ${leadsWithCuil.length} leads con CUIL\n`)

    // 2. Obtener pipelines de estos leads
    console.log('📊 Obteniendo información de pipelines...')
    
    const leadIds = leadsWithCuil.map(l => l.id)
    const { data: pipelines, error: pipelinesError } = await supabase
      .from('lead_pipeline')
      .select('lead_id, current_stage')
      .in('lead_id', leadIds)

    if (pipelinesError) {
      throw pipelinesError
    }

    // Crear mapa de lead_id -> current_stage
    const pipelineMap = new Map()
    if (pipelines) {
      pipelines.forEach(p => {
        pipelineMap.set(p.lead_id, p.current_stage)
      })
    }

    // 3. Filtrar leads que están en etapas válidas y tienen CUIL válido
    const validStages = ['CLIENTE_NUEVO', 'CONSULTANDO_CREDITO', 'LEAD_NUEVO', 'CONTACTO_INICIAL']
    const leadsToProcess = []

    for (const lead of leadsWithCuil) {
      const currentStage = pipelineMap.get(lead.id)
      
      // Si no tiene pipeline, asumimos que está en CLIENTE_NUEVO (se creará)
      if (!currentStage || validStages.includes(currentStage)) {
        // Verificar que el CUIL sea válido
        const cuil = extractCUILFromLead(lead)
        if (isValidCUIL(cuil)) {
          leadsToProcess.push({
            lead,
            currentStage: currentStage || 'SIN_PIPELINE',
            cuil: cuil?.substring(0, 5) + '***' // Ocultar CUIL completo
          })
        }
      }
    }

    console.log(`   ${leadsToProcess.length} leads cumplen las condiciones:\n`)
    console.log(`   - Tienen CUIL válido (7+ caracteres)`)
    console.log(`   - Están en: CLIENTE_NUEVO, CONSULTANDO_CREDITO, o sin pipeline\n`)

    if (leadsToProcess.length === 0) {
      console.log('✅ No hay leads para procesar')
      return
    }

    // 4. Mostrar resumen
    const byStage = {}
    leadsToProcess.forEach(({ currentStage }) => {
      byStage[currentStage] = (byStage[currentStage] || 0) + 1
    })

    console.log('📊 Distribución por etapa:')
    Object.entries(byStage).forEach(([stage, count]) => {
      console.log(`   ${stage}: ${count} leads`)
    })
    console.log('')

    if (isDryRun) {
      console.log('🔍 Leads que se moverían (primeros 10):')
      leadsToProcess.slice(0, 10).forEach(({ lead, currentStage, cuil }) => {
        console.log(`   - ${lead.nombre} (${lead.id.substring(0, 8)}...) | ${currentStage} | CUIL: ${cuil}`)
      })
      if (leadsToProcess.length > 10) {
        console.log(`   ... y ${leadsToProcess.length - 10} más`)
      }
      console.log('\n✅ DRY-RUN completado. Ejecuta sin --dry-run para aplicar cambios.')
      return
    }

    // 5. Procesar cada lead
    console.log('🔄 Procesando leads...\n')
    
    let successCount = 0
    let errorCount = 0
    const errors = []

    for (let i = 0; i < leadsToProcess.length; i++) {
      const { lead, currentStage } = leadsToProcess[i]
      const progress = `[${i + 1}/${leadsToProcess.length}]`

      try {
        const moved = await checkAndMoveLeadWithCUIL(lead.id)
        
        if (moved) {
          successCount++
          console.log(`   ${progress} ✅ ${lead.nombre} - Movido desde ${currentStage}`)
        } else {
          console.log(`   ${progress} ⚠️  ${lead.nombre} - No se pudo mover (ya movido o error)`)
        }
      } catch (error) {
        errorCount++
        const errorMsg = error.message || String(error)
        errors.push({ leadId: lead.id, nombre: lead.nombre, error: errorMsg })
        console.log(`   ${progress} ❌ ${lead.nombre} - Error: ${errorMsg}`)
      }

      // Pequeña pausa para no sobrecargar la base de datos
      if (i < leadsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // 6. Mostrar resumen final
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN FINAL')
    console.log('='.repeat(60))
    console.log(`   Total procesados: ${leadsToProcess.length}`)
    console.log(`   ✅ Movidos exitosamente: ${successCount}`)
    console.log(`   ❌ Errores: ${errorCount}`)
    console.log(`   ⚠️  No movidos: ${leadsToProcess.length - successCount - errorCount}`)
    console.log('')

    if (errors.length > 0) {
      console.log('❌ Errores encontrados:')
      errors.slice(0, 10).forEach(({ nombre, error }) => {
        console.log(`   - ${nombre}: ${error}`)
      })
      if (errors.length > 10) {
        console.log(`   ... y ${errors.length - 10} errores más`)
      }
      console.log('')
    }

    console.log('✅ Script completado\n')

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Ejecutar
main().catch(error => {
  console.error('Error no manejado:', error)
  process.exit(1)
})





