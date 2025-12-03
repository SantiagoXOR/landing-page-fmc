/**
 * Worker para procesar sincronizaciones pendientes de ManyChat
 * 
 * Este script se ejecuta periódicamente (ej: cada 5 minutos vía cron)
 * para reintentar sincronizaciones que fallaron.
 * 
 * Uso:
 * node scripts/process-pending-manychat-syncs.js
 * 
 * O configurar como cron job:
 * */5 * * * * cd /path/to/project && node scripts/process-pending-manychat-syncs.js
 */

require('dotenv').config()

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

/**
 * Función principal
 */
async function main() {
  section('Procesador de Sincronizaciones Pendientes de ManyChat')
  info(`Fecha: ${new Date().toISOString()}`)
  
  try {
    // Importar dinámicamente los módulos de TypeScript
    const { processAllPendingSyncs, getSyncStats, hasPendingSyncs } = 
      await import('../src/lib/manychat-queue.js')

    // Verificar si hay syncs pendientes
    info('Verificando sincronizaciones pendientes...')
    const hasPending = await hasPendingSyncs()
    
    if (!hasPending) {
      success('No hay sincronizaciones pendientes')
      return
    }

    info('Hay sincronizaciones pendientes, procesando...')

    // Obtener estadísticas iniciales
    const initialStats = await getSyncStats()
    info(`Estado inicial:`)
    info(`  - Pendientes: ${initialStats.pending}`)
    info(`  - Fallidas: ${initialStats.failed}`)
    info(`  - Exitosas: ${initialStats.succeeded}`)
    info(`  - Total: ${initialStats.total}`)

    // Procesar todos los pendientes
    info('\nProcesando sincronizaciones...')
    const results = await processAllPendingSyncs()

    // Obtener estadísticas finales
    const finalStats = await getSyncStats()

    // Resumen
    section('Resumen de Procesamiento')
    success(`Sincronizaciones procesadas: ${results.processed}`)
    success(`Exitosas: ${results.succeeded}`)
    if (results.failed > 0) {
      error(`Fallidas: ${results.failed}`)
    }

    info('\nEstado final:')
    info(`  - Pendientes: ${finalStats.pending}`)
    info(`  - Fallidas: ${finalStats.failed}`)
    info(`  - Exitosas: ${finalStats.succeeded}`)
    info(`  - Total: ${finalStats.total}`)

    if (finalStats.pending > 0 || finalStats.failed > 0) {
      info('\n💡 Consejo: Ejecuta este script nuevamente para reintentar las pendientes')
    }

    section('✓ Procesamiento completado')

  } catch (err) {
    error(`\nError inesperado: ${err.message}`)
    console.error(err)
    process.exit(1)
  }
}

// Ejecutar
main()
  .then(() => {
    info('\nScript finalizado exitosamente')
    process.exit(0)
  })
  .catch((err) => {
    error(`\nError fatal: ${err.message}`)
    console.error(err)
    process.exit(1)
  })

