/**
 * Normaliza tags de todos los leads en "Listo para Análisis":
 * deja solo el tag "solicitud-en-proceso" en Lead.tags (y opcionalmente sincroniza con ManyChat).
 *
 * Uso: node scripts/normalize-tags-listo-analisis.js
 *      node scripts/normalize-tags-listo-analisis.js --dry-run
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const TAG_LISTO_ANALISIS = 'solicitud-en-proceso'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  console.log('\n📋 Normalizar tags en "Listo para Análisis"\n')
  if (isDryRun) {
    console.log('⚠️  MODO DRY-RUN: no se harán cambios.\n')
  }

  const { data: pipelines, error: errPipe } = await supabase
    .from('lead_pipeline')
    .select('lead_id')
    .eq('current_stage', 'LISTO_ANALISIS')

  if (errPipe) {
    console.error('❌ Error al leer lead_pipeline:', errPipe.message)
    process.exit(1)
  }

  const leadIds = (pipelines || []).map((p) => p.lead_id).filter(Boolean)
  if (leadIds.length === 0) {
    console.log('No hay leads en LISTO_ANALISIS.')
    return
  }

  const { data: leads, error: errLead } = await supabase
    .from('Lead')
    .select('id, nombre, tags')
    .in('id', leadIds)

  if (errLead) {
    console.error('❌ Error al leer Lead:', errLead.message)
    process.exit(1)
  }

  const list = leads || []
  const needsUpdate = list.filter((lead) => {
    let tags = lead.tags
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags)
      } catch {
        return true
      }
    }
    if (!Array.isArray(tags)) return true
    const only = tags.length === 1 && tags[0] === TAG_LISTO_ANALISIS
    return !only
  })

  console.log(`Leads en Listo para Análisis: ${list.length}`)
  console.log(`Con tags que corregir: ${needsUpdate.length}\n`)

  if (needsUpdate.length === 0) {
    console.log('✅ Todos ya tienen solo el tag solicitud-en-proceso.')
    return
  }

  if (isDryRun) {
    console.log('Ejemplo de leads a actualizar (primeros 5):')
    needsUpdate.slice(0, 5).forEach((l) => {
      const t = typeof l.tags === 'string' ? l.tags : JSON.stringify(l.tags)
      console.log(`  - ${l.nombre} (${l.id.slice(0, 8)}...) tags actual: ${t}`)
    })
    console.log('\nEjecuta sin --dry-run para aplicar.')
    return
  }

  const newTags = JSON.stringify([TAG_LISTO_ANALISIS])
  let ok = 0
  let err = 0

  for (let i = 0; i < needsUpdate.length; i++) {
    const lead = needsUpdate[i]
    const { error } = await supabase
      .from('Lead')
      .update({ tags: newTags })
      .eq('id', lead.id)

    if (error) {
      err++
      console.error(`  ❌ ${lead.nombre}: ${error.message}`)
    } else {
      ok++
      if ((i + 1) % 20 === 0 || i === needsUpdate.length - 1) {
        console.log(`  [${i + 1}/${needsUpdate.length}] actualizados…`)
      }
    }
  }

  console.log(`\n✅ Actualizados: ${ok}. Errores: ${err}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
