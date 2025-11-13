/**
 * Script de testing para la integración de Manychat
 * 
 * Ejecutar: node scripts/test-manychat-integration.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

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

function warn(message) {
  log(`⚠ ${message}`, 'yellow')
}

async function testDatabaseSchema() {
  log('\n=== Testing Database Schema ===', 'cyan')

  try {
    // Verificar que las columnas existen en Lead
    const leadCount = await prisma.lead.count()
    success(`Tabla Lead existe (${leadCount} registros)`)

    // Intentar leer campos de Manychat
    const testLead = await prisma.lead.findFirst()
    if (testLead) {
      if ('manychatId' in testLead) {
        success('Campo manychatId existe en Lead')
      } else {
        error('Campo manychatId NO existe en Lead')
      }

      if ('tags' in testLead) {
        success('Campo tags existe en Lead')
      } else {
        error('Campo tags NO existe en Lead')
      }

      if ('customFields' in testLead) {
        success('Campo customFields existe en Lead')
      } else {
        error('Campo customFields NO existe en Lead')
      }
    }

    // Verificar tabla ManychatSync
    const syncCount = await prisma.manychatSync.count()
    success(`Tabla ManychatSync existe (${syncCount} registros)`)

    // Verificar Conversation
    const conversationCount = await prisma.conversation.count()
    success(`Tabla Conversation existe (${conversationCount} registros)`)

  } catch (err) {
    error(`Error en schema: ${err.message}`)
    warn('Ejecuta: npx prisma db push')
    return false
  }

  return true
}

async function testEnvironmentVariables() {
  log('\n=== Testing Environment Variables ===', 'cyan')

  const requiredVars = [
    'DATABASE_URL',
    'MANYCHAT_API_KEY',
    'MANYCHAT_BASE_URL',
  ]

  const optionalVars = [
    'MANYCHAT_WEBHOOK_SECRET',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ]

  let allPresent = true

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      success(`${varName} configurado`)
    } else {
      error(`${varName} NO configurado`)
      allPresent = false
    }
  }

  for (const varName of optionalVars) {
    if (process.env[varName]) {
      info(`${varName} configurado (opcional)`)
    } else {
      warn(`${varName} no configurado (opcional)`)
    }
  }

  return allPresent
}

async function testManychatAPI() {
  log('\n=== Testing Manychat API ===', 'cyan')

  if (!process.env.MANYCHAT_API_KEY) {
    error('MANYCHAT_API_KEY no configurado, saltando pruebas de API')
    return false
  }

  const baseUrl = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'

  try {
    // Test 1: Health Check (getInfo)
    info('Probando conexión a Manychat...')
    const response = await fetch(`${baseUrl}/fb/page/getInfo`, {
      headers: {
        'Authorization': `Bearer ${process.env.MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      success('Conexión a Manychat API exitosa')
      if (data.data) {
        info(`Page ID: ${data.data.id}`)
        info(`Page Name: ${data.data.name || 'N/A'}`)
      }
    } else {
      const errorData = await response.json()
      error(`Error de API: ${errorData.error || response.statusText}`)
      return false
    }

    // Test 2: Get Tags
    info('Obteniendo tags...')
    const tagsResponse = await fetch(`${baseUrl}/fb/page/getTags`, {
      headers: {
        'Authorization': `Bearer ${process.env.MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json()
      if (tagsData.data && Array.isArray(tagsData.data)) {
        success(`${tagsData.data.length} tags encontrados`)
        if (tagsData.data.length > 0) {
          info(`Ejemplo: ${tagsData.data[0].name}`)
        }
      }
    } else {
      warn('No se pudieron obtener tags')
    }

    // Test 3: Get Custom Fields
    info('Obteniendo custom fields...')
    const fieldsResponse = await fetch(`${baseUrl}/fb/page/getCustomFields`, {
      headers: {
        'Authorization': `Bearer ${process.env.MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (fieldsResponse.ok) {
      const fieldsData = await fieldsResponse.json()
      if (fieldsData.data && Array.isArray(fieldsData.data)) {
        success(`${fieldsData.data.length} custom fields encontrados`)
        if (fieldsData.data.length > 0) {
          info(`Ejemplo: ${fieldsData.data[0].name}`)
        }
      }
    } else {
      warn('No se pudieron obtener custom fields')
    }

    return true
  } catch (err) {
    error(`Error conectando a Manychat API: ${err.message}`)
    return false
  }
}

async function testEndpoints() {
  log('\n=== Testing API Endpoints ===', 'cyan')

  const baseUrl = 'http://localhost:3000'

  try {
    // Test health endpoint
    info('Probando /api/manychat/health...')
    const healthResponse = await fetch(`${baseUrl}/api/manychat/health`)
    
    if (healthResponse.ok) {
      const data = await healthResponse.json()
      if (data.status === 'healthy') {
        success('Health check: OK')
      } else if (data.status === 'not_configured') {
        warn('Manychat no configurado completamente')
      } else {
        warn(`Health check: ${data.status}`)
      }
    } else {
      error('Health check endpoint falló')
    }

    // Test tags endpoint
    info('Probando /api/manychat/tags...')
    const tagsResponse = await fetch(`${baseUrl}/api/manychat/tags`)
    
    if (tagsResponse.ok) {
      success('Tags endpoint: OK')
    } else {
      warn('Tags endpoint no disponible')
    }

  } catch (err) {
    error(`Error probando endpoints: ${err.message}`)
    warn('¿El servidor está corriendo en http://localhost:3000?')
    return false
  }

  return true
}

async function testSyncFunctionality() {
  log('\n=== Testing Sync Functionality ===', 'cyan')

  try {
    // Buscar un lead de prueba
    const lead = await prisma.lead.findFirst()

    if (!lead) {
      warn('No hay leads en la base de datos para probar')
      return false
    }

    info(`Lead de prueba: ${lead.nombre} (${lead.telefono})`)

    // Verificar que tiene los campos de Manychat
    if (lead.manychatId) {
      success(`Lead tiene manychatId: ${lead.manychatId}`)
    } else {
      info('Lead no tiene manychatId (normal si no se ha sincronizado)')
    }

    if (lead.tags) {
      try {
        const tags = JSON.parse(lead.tags)
        success(`Lead tiene ${tags.length} tags`)
      } catch (e) {
        warn('Tags no es JSON válido')
      }
    }

    // Verificar logs de sincronización
    const syncLogs = await prisma.manychatSync.findMany({
      where: { leadId: lead.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    if (syncLogs.length > 0) {
      success(`${syncLogs.length} registros de sincronización encontrados`)
      syncLogs.forEach((log, i) => {
        const status = log.status === 'success' ? '✓' : log.status === 'failed' ? '✗' : '⋯'
        info(`  ${status} ${log.syncType} (${log.direction}) - ${log.createdAt.toLocaleString()}`)
      })
    } else {
      info('No hay logs de sincronización (normal si es primera vez)')
    }

    return true
  } catch (err) {
    error(`Error probando funcionalidad de sync: ${err.message}`)
    return false
  }
}

async function showRecommendations() {
  log('\n=== Recomendaciones ===', 'cyan')

  const recommendations = []

  // Check if Manychat is configured
  if (!process.env.MANYCHAT_API_KEY) {
    recommendations.push('Configura MANYCHAT_API_KEY en tu archivo .env')
  }

  if (!process.env.MANYCHAT_WEBHOOK_SECRET) {
    recommendations.push('Configura MANYCHAT_WEBHOOK_SECRET para seguridad de webhooks')
  }

  // Check database
  const leadCount = await prisma.lead.count()
  if (leadCount === 0) {
    recommendations.push('Agrega leads de prueba a la base de datos')
  }

  const syncCount = await prisma.manychatSync.count()
  if (syncCount === 0) {
    recommendations.push('Prueba sincronizar un lead: POST /api/manychat/sync-lead')
  }

  if (recommendations.length > 0) {
    recommendations.forEach(rec => {
      info(`• ${rec}`)
    })
  } else {
    success('¡Todo listo! La integración de Manychat está configurada correctamente.')
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════╗', 'cyan')
  log('║   TEST DE INTEGRACIÓN MANYCHAT-CRM                ║', 'cyan')
  log('╚════════════════════════════════════════════════════╝\n', 'cyan')

  const results = {
    schema: await testDatabaseSchema(),
    env: await testEnvironmentVariables(),
    api: await testManychatAPI(),
    endpoints: await testEndpoints(),
    sync: await testSyncFunctionality(),
  }

  await showRecommendations()

  // Resumen final
  log('\n=== Resumen ===', 'cyan')
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  log(`\nPruebas pasadas: ${passed}/${total}\n`)

  if (passed === total) {
    success('¡Todas las pruebas pasaron! ✓')
  } else {
    warn('Algunas pruebas fallaron. Revisa los mensajes arriba.')
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  error(`Error fatal: ${err.message}`)
  console.error(err)
  process.exit(1)
})

