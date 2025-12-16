/**
 * Script para verificar y corregir los tags de pipeline en la base de datos
 * 
 * Este script verifica que PREAPROBADO esté mapeado a 'credito-preaprobado'
 * y APROBADO esté mapeado a 'credito-aprobado'
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Mapeo esperado de etapas a tags
const expectedMappings = {
  'PREAPROBADO': 'credito-preaprobado',
  'APROBADO': 'credito-aprobado',
  'CLIENTE_NUEVO': 'lead-nuevo',
  'CONSULTANDO_CREDITO': 'lead-consultando',
  'SOLICITANDO_DOCS': 'solicitando-documentos',
  'LISTO_ANALISIS': 'solicitud-en-proceso',
  'EN_SEGUIMIENTO': 'en-seguimiento',
  'CERRADO_GANADO': 'venta-cerrada',
  'ENCUESTA': 'encuesta-pendiente',
  'RECHAZADO': 'credito-rechazado',
  'SOLICITAR_REFERIDO': 'solicitar-referido'
}

async function verifyAndFixTags() {
  console.log('🔍 Verificando tags de pipeline en la base de datos...\n')

  try {
    // Obtener todos los tags de pipeline
    const { data: tags, error } = await supabase
      .from('pipeline_stage_tags')
      .select('*')
      .eq('tag_type', 'pipeline')
      .eq('is_active', true)

    if (error) {
      console.error('❌ Error obteniendo tags:', error.message)
      process.exit(1)
    }

    console.log(`📊 Encontrados ${tags.length} tags de pipeline\n`)

    let issuesFound = 0
    let fixed = 0

    // Verificar cada tag
    for (const tag of tags) {
      const expectedTag = expectedMappings[tag.stage]
      
      if (expectedTag) {
        if (tag.manychat_tag !== expectedTag) {
          console.log(`⚠️  PROBLEMA ENCONTRADO:`)
          console.log(`   Etapa: ${tag.stage}`)
          console.log(`   Tag actual en BD: ${tag.manychat_tag}`)
          console.log(`   Tag esperado: ${expectedTag}`)
          
          issuesFound++
          
          // Corregir el tag
          const { error: updateError } = await supabase
            .from('pipeline_stage_tags')
            .update({ manychat_tag: expectedTag })
            .eq('id', tag.id)
          
          if (updateError) {
            console.log(`   ❌ Error corrigiendo: ${updateError.message}\n`)
          } else {
            console.log(`   ✅ CORREGIDO: Tag actualizado a '${expectedTag}'\n`)
            fixed++
          }
        } else {
          console.log(`✅ ${tag.stage} → ${tag.manychat_tag} (correcto)`)
        }
      } else {
        console.log(`ℹ️  ${tag.stage} → ${tag.manychat_tag} (no verificado)`)
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`📈 Resumen:`)
    console.log(`   Total tags verificados: ${tags.length}`)
    console.log(`   Problemas encontrados: ${issuesFound}`)
    console.log(`   Problemas corregidos: ${fixed}`)
    console.log('='.repeat(50))

    if (issuesFound === 0) {
      console.log('\n✅ Todos los tags están correctos!')
    } else if (fixed === issuesFound) {
      console.log('\n✅ Todos los problemas fueron corregidos!')
    } else {
      console.log('\n⚠️  Algunos problemas no pudieron ser corregidos automáticamente')
    }

  } catch (error) {
    console.error('❌ Error ejecutando verificación:', error.message)
    process.exit(1)
  }
}

// Ejecutar verificación
verifyAndFixTags()
  .then(() => {
    console.log('\n✅ Verificación completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
