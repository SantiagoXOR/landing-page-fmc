/**
 * Cuenta cuántos leads están en "Listo para Análisis" según la DB
 * y detecta si hay registros en lead_pipeline cuyo lead ya no existe en Lead.
 *
 * Uso: node scripts/count-listos-para-analisis.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Consultando base de datos...\n')

  // 1. Contar filas en lead_pipeline con current_stage = LISTO_ANALISIS
  const { data: pipelines, error: errPipe } = await supabase
    .from('lead_pipeline')
    .select('lead_id, current_stage, stage_entered_at')
    .eq('current_stage', 'LISTO_ANALISIS')

  if (errPipe) {
    console.error('❌ Error al leer lead_pipeline:', errPipe.message)
    process.exit(1)
  }

  const enPipeline = pipelines || []
  const totalEnPipeline = enPipeline.length
  const leadIds = enPipeline.map((p) => p.lead_id).filter(Boolean)

  if (leadIds.length === 0) {
    console.log('Según lead_pipeline: 0 leads en LISTO_ANALISIS.')
    console.log('La UI debería mostrar 0.\n')
    return
  }

  // 2. De esos lead_id, cuántos existen en la tabla Lead
  const { data: leads, error: errLead } = await supabase
    .from('Lead')
    .select('id')
    .in('id', leadIds)

  if (errLead) {
    console.error('❌ Error al leer Lead:', errLead.message)
    process.exit(1)
  }

  const idsQueExisten = new Set((leads || []).map((l) => l.id))
  const presentes = leadIds.filter((id) => idsQueExisten.has(id))
  const huerfanos = leadIds.filter((id) => !idsQueExisten.has(id))

  console.log('--- Listo para Análisis (LISTO_ANALISIS) ---')
  console.log('Según lead_pipeline:     ', totalEnPipeline)
  console.log('Con Lead existente:    ', presentes.length, '(lo que muestra la UI)')
  if (huerfanos.length > 0) {
    console.log('Registros huérfanos:    ', huerfanos.length)
    console.log('  lead_ids en pipeline sin Lead:', huerfanos.join(', '))
  }
  console.log('')
  console.log('Conclusión: en la UI deberías ver', presentes.length, 'leads en "Listo para Análisis".')
  if (totalEnPipeline > presentes.length) {
    console.log('La diferencia (', totalEnPipeline - presentes.length, ') son filas en lead_pipeline cuyo lead ya no existe en Lead.')
  }
  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
