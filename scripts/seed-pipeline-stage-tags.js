/**
 * Script para poblar la tabla pipeline_stage_tags con mapeo de etapas a tags de ManyChat
 * 
 * Este script inserta el mapeo entre las etapas del pipeline del CRM
 * y los tags correspondientes en ManyChat que activarán las automatizaciones.
 * 
 * Uso:
 * node scripts/seed-pipeline-stage-tags.js
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function success(message) {
  log(`✓ ${message}`, 'green')
}

function error(message) {
  log(`✗ ${message}`, 'red')
}

function info(message) {
  log(`ℹ ${message}`, 'blue')
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(message, 'cyan')
  log('='.repeat(60), 'cyan')
}

// Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  error('Error: Variables de entorno de Supabase no configuradas')
  error('Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Mapeo completo de etapas a tags de ManyChat
const stageMappings = [
  {
    stage: 'CLIENTE_NUEVO',
    manychat_tag: 'lead-nuevo',
    tag_type: 'pipeline',
    description: 'Cliente nuevo que acaba de ingresar al sistema',
    order: 1
  },
  {
    stage: 'CONSULTANDO_CREDITO',
    manychat_tag: 'lead-consultando',
    tag_type: 'pipeline',
    description: 'Cliente consultando opciones de crédito',
    order: 2
  },
  {
    stage: 'SOLICITANDO_DOCS',
    manychat_tag: 'solicitando-documentos',
    tag_type: 'pipeline',
    description: 'Solicitando documentación al cliente',
    order: 3
  },
  {
    stage: 'LISTO_ANALISIS',
    manychat_tag: 'solicitud-en-proceso',
    tag_type: 'pipeline',
    description: 'Documentación completa, listo para análisis',
    order: 4
  },
  {
    stage: 'PREAPROBADO',
    manychat_tag: 'credito-preaprobado',
    tag_type: 'pipeline',
    description: 'Crédito preaprobado por el sistema',
    order: 5
  },
  {
    stage: 'APROBADO',
    manychat_tag: 'credito-aprobado',
    tag_type: 'pipeline',
    description: 'Crédito aprobado finalmente',
    order: 6
  },
  {
    stage: 'EN_SEGUIMIENTO',
    manychat_tag: 'en-seguimiento',
    tag_type: 'pipeline',
    description: 'Cliente en seguimiento post-aprobación',
    order: 7
  },
  {
    stage: 'CERRADO_GANADO',
    manychat_tag: 'venta-cerrada',
    tag_type: 'pipeline',
    description: 'Venta cerrada exitosamente',
    order: 8
  },
  {
    stage: 'ENCUESTA',
    manychat_tag: 'encuesta-pendiente',
    tag_type: 'pipeline',
    description: 'Pendiente de enviar encuesta de satisfacción',
    order: 9
  },
  {
    stage: 'RECHAZADO',
    manychat_tag: 'credito-rechazado',
    tag_type: 'pipeline',
    description: 'Crédito rechazado',
    order: 10
  },
  {
    stage: 'SOLICITAR_REFERIDO',
    manychat_tag: 'solicitar-referido',
    tag_type: 'pipeline',
    description: 'Solicitar referidos al cliente',
    order: 11
  }
]

// Tags de negocio (que no son parte del pipeline y deben mantenerse)
const businessTags = [
  {
    stage: null, // No asociado a una etapa específica
    manychat_tag: 'atencion-humana',
    tag_type: 'business',
    description: 'Cliente requiere atención humana inmediata'
  },
  {
    stage: null,
    manychat_tag: 'venta-concretada',
    tag_type: 'business',
    description: 'Venta concretada (alias histórico)'
  }
]

/**
 * Seed de la tabla pipeline_stage_tags
 */
async function seedPipelineStageTags() {
  section('Seed de Pipeline Stage Tags')
  
  try {
    // 1. Verificar que la tabla existe
    info('Verificando tabla pipeline_stage_tags...')
    const { data: tables, error: tablesError } = await supabase
      .from('pipeline_stage_tags')
      .select('count')
      .limit(0)
    
    if (tablesError) {
      error(`La tabla pipeline_stage_tags no existe o no es accesible`)
      error(`Error: ${tablesError.message}`)
      error('\nPor favor ejecuta la migración primero:')
      info('  psql -d tu_database < scripts/migrations/002_update_pipeline_stages_manychat.sql')
      process.exit(1)
    }
    
    success('Tabla pipeline_stage_tags encontrada')
    
    // 2. Limpiar datos existentes (opcional)
    info('\nLimpiando datos existentes...')
    const { error: deleteError } = await supabase
      .from('pipeline_stage_tags')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Eliminar todos
    
    if (deleteError) {
      error(`Error al limpiar tabla: ${deleteError.message}`)
    } else {
      success('Tabla limpiada')
    }
    
    // 3. Insertar mapeos de pipeline
    info(`\nInsertando ${stageMappings.length} mapeos de pipeline...`)
    let insertedCount = 0
    let errorCount = 0
    
    for (const mapping of stageMappings) {
      const { data, error: insertError } = await supabase
        .from('pipeline_stage_tags')
        .insert({
          stage: mapping.stage,
          manychat_tag: mapping.manychat_tag,
          tag_type: mapping.tag_type,
          description: mapping.description,
          is_active: true
        })
        .select()
      
      if (insertError) {
        error(`  ✗ ${mapping.stage} → ${mapping.manychat_tag}: ${insertError.message}`)
        errorCount++
      } else {
        success(`  ✓ ${mapping.stage} → ${mapping.manychat_tag}`)
        insertedCount++
      }
    }
    
    // 4. Insertar tags de negocio
    info(`\nInsertando ${businessTags.length} tags de negocio...`)
    
    for (const tag of businessTags) {
      const { data, error: insertError } = await supabase
        .from('pipeline_stage_tags')
        .insert({
          manychat_tag: tag.manychat_tag,
          tag_type: tag.tag_type,
          description: tag.description,
          is_active: true
        })
        .select()
      
      if (insertError) {
        error(`  ✗ ${tag.manychat_tag}: ${insertError.message}`)
        errorCount++
      } else {
        success(`  ✓ ${tag.manychat_tag} (business tag)`)
        insertedCount++
      }
    }
    
    // 5. Resumen
    section('Resumen')
    success(`Total insertados: ${insertedCount}`)
    if (errorCount > 0) {
      error(`Total errores: ${errorCount}`)
    }
    
    // 6. Verificar datos insertados
    info('\nVerificando datos insertados...')
    const { data: allTags, error: selectError } = await supabase
      .from('pipeline_stage_tags')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (selectError) {
      error(`Error al verificar: ${selectError.message}`)
    } else {
      info(`\nTotal de registros en la tabla: ${allTags?.length || 0}`)
      
      // Mostrar algunos registros
      info('\nPrimeros 5 registros:')
      allTags?.slice(0, 5).forEach((tag, index) => {
        console.log(`  ${index + 1}. ${tag.stage || '(sin etapa)'} → ${tag.manychat_tag} [${tag.tag_type}]`)
      })
      
      if (allTags && allTags.length > 5) {
        info(`  ... y ${allTags.length - 5} más`)
      }
    }
    
    section('✓ Seed completado exitosamente')
    
  } catch (err) {
    error(`\nError inesperado: ${err.message}`)
    console.error(err)
    process.exit(1)
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('\n')
  section('Seed: Pipeline Stage Tags para ManyChat')
  info(`Supabase URL: ${SUPABASE_URL}`)
  info(`Fecha: ${new Date().toISOString()}`)
  
  await seedPipelineStageTags()
  
  info('\nScript finalizado')
  process.exit(0)
}

// Ejecutar
main()

