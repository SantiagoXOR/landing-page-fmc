/**
 * Test simplificado de Manychat (sin base de datos)
 * 
 * Ejecutar: node test-manychat-simple.js
 */

require('dotenv').config({ path: '.env.local' })

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

async function testEnvironmentVariables() {
  log('\n=== Verificando Variables de Entorno ===', 'cyan')

  const requiredVars = {
    'MANYCHAT_API_KEY': process.env.MANYCHAT_API_KEY,
    'MANYCHAT_BASE_URL': process.env.MANYCHAT_BASE_URL,
  }

  const optionalVars = {
    'MANYCHAT_WEBHOOK_SECRET': process.env.MANYCHAT_WEBHOOK_SECRET,
    'WHATSAPP_PHONE_NUMBER': process.env.WHATSAPP_PHONE_NUMBER,
  }

  let allPresent = true

  for (const [varName, value] of Object.entries(requiredVars)) {
    if (value) {
      success(`${varName} configurado`)
      // Mostrar un preview del valor (primeros 20 caracteres)
      const preview = value.substring(0, 20) + (value.length > 20 ? '...' : '')
      info(`  Valor: ${preview}`)
    } else {
      error(`${varName} NO configurado`)
      allPresent = false
    }
  }

  for (const [varName, value] of Object.entries(optionalVars)) {
    if (value) {
      info(`${varName} configurado (opcional)`)
      const preview = value.substring(0, 20) + (value.length > 20 ? '...' : '')
      info(`  Valor: ${preview}`)
    } else {
      warn(`${varName} no configurado (opcional)`)
    }
  }

  return allPresent
}

async function testManychatAPIConnection() {
  log('\n=== Probando Conexión a Manychat API ===', 'cyan')

  if (!process.env.MANYCHAT_API_KEY) {
    error('MANYCHAT_API_KEY no configurado')
    return false
  }

  const baseUrl = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'

  try {
    // Test: Get Page Info
    info('Conectando a Manychat...')
    const response = await fetch(`${baseUrl}/fb/page/getInfo`, {
      headers: {
        'Authorization': `Bearer ${process.env.MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      success('✓ Conexión exitosa a Manychat API')
      
      if (data.data) {
        log('\n📊 Información de tu cuenta:', 'cyan')
        info(`  Page ID: ${data.data.id}`)
        info(`  Page Name: ${data.data.name || 'N/A'}`)
        info(`  Timezone: ${data.data.timezone || 'N/A'}`)
      }

      return true
    } else {
      const errorData = await response.json().catch(() => ({}))
      error(`✗ Error de API: ${errorData.message || response.statusText}`)
      warn(`  Status: ${response.status}`)
      
      if (response.status === 401) {
        error('  → API Key inválida o expirada')
      } else if (response.status === 403) {
        error('  → Permisos insuficientes')
      }

      return false
    }
  } catch (err) {
    error(`✗ Error de conexión: ${err.message}`)
    return false
  }
}

async function testManychatTags() {
  log('\n=== Obteniendo Tags de Manychat ===', 'cyan')

  if (!process.env.MANYCHAT_API_KEY) {
    warn('Saltando: MANYCHAT_API_KEY no configurado')
    return false
  }

  const baseUrl = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'

  try {
    const response = await fetch(`${baseUrl}/fb/page/getTags`, {
      headers: {
        'Authorization': `Bearer ${process.env.MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.data && Array.isArray(data.data)) {
        success(`✓ ${data.data.length} tags encontrados`)
        
        if (data.data.length > 0) {
          log('\n📋 Tags disponibles:', 'cyan')
          data.data.slice(0, 10).forEach((tag, index) => {
            info(`  ${index + 1}. ${tag.name} (ID: ${tag.id})`)
          })
          
          if (data.data.length > 10) {
            info(`  ... y ${data.data.length - 10} más`)
          }
        } else {
          warn('No hay tags creados aún')
          info('Crea tags en: Manychat → Settings → Tags')
        }
      }

      return true
    } else {
      warn('No se pudieron obtener tags')
      return false
    }
  } catch (err) {
    warn(`Error obteniendo tags: ${err.message}`)
    return false
  }
}

async function testManychatCustomFields() {
  log('\n=== Obteniendo Custom Fields de Manychat ===', 'cyan')

  if (!process.env.MANYCHAT_API_KEY) {
    warn('Saltando: MANYCHAT_API_KEY no configurado')
    return false
  }

  const baseUrl = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'

  try {
    const response = await fetch(`${baseUrl}/fb/page/getCustomFields`, {
      headers: {
        'Authorization': `Bearer ${process.env.MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.data && Array.isArray(data.data)) {
        success(`✓ ${data.data.length} custom fields encontrados`)
        
        if (data.data.length > 0) {
          log('\n🔧 Custom Fields disponibles:', 'cyan')
          data.data.forEach((field, index) => {
            info(`  ${index + 1}. ${field.name} (${field.type}) - ID: ${field.id}`)
          })
        } else {
          warn('No hay custom fields creados aún')
          info('Crea custom fields en: Manychat → Settings → Custom Fields')
        }
      }

      return true
    } else {
      warn('No se pudieron obtener custom fields')
      return false
    }
  } catch (err) {
    warn(`Error obteniendo custom fields: ${err.message}`)
    return false
  }
}

async function showRecommendations(results) {
  log('\n=== Recomendaciones ===', 'cyan')

  const recommendations = []

  if (!results.env) {
    recommendations.push({
      priority: 'alta',
      message: 'Configura las variables de entorno en .env.local',
      action: 'Ver: MANYCHAT-ENV-VARIABLES.txt'
    })
  }

  if (!results.api) {
    recommendations.push({
      priority: 'alta',
      message: 'Verifica tu API Key de Manychat',
      action: 'Regenera la key en: Manychat → Settings → API'
    })
  }

  if (results.tags && results.tags.count === 0) {
    recommendations.push({
      priority: 'media',
      message: 'Crea tags en Manychat para segmentación',
      action: 'Ver: INSTRUCCIONES-CONFIGURACION-MANYCHAT.md → Paso 7'
    })
  }

  if (results.customFields && results.customFields.count === 0) {
    recommendations.push({
      priority: 'media',
      message: 'Crea custom fields para sincronización de datos',
      action: 'Ver: INSTRUCCIONES-CONFIGURACION-MANYCHAT.md → Paso 6'
    })
  }

  if (recommendations.length > 0) {
    recommendations.forEach(rec => {
      const icon = rec.priority === 'alta' ? '🔴' : '🟡'
      info(`${icon} ${rec.message}`)
      info(`   → ${rec.action}`)
    })
  } else {
    success('¡Todo listo! La configuración de Manychat es correcta.')
    log('\n📚 Próximos pasos:', 'cyan')
    info('1. Configura credenciales de Supabase en .env.local')
    info('2. Ejecuta: npm run db:push')
    info('3. Ejecuta: npm run manychat:test (test completo)')
    info('4. Configura webhook en Manychat')
    info('5. Inicia el servidor: npm run dev')
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════╗', 'cyan')
  log('║   TEST SIMPLIFICADO DE MANYCHAT                   ║', 'cyan')
  log('║   (Sin base de datos)                             ║', 'cyan')
  log('╚════════════════════════════════════════════════════╝\n', 'cyan')

  const results = {
    env: await testEnvironmentVariables(),
    api: await testManychatAPIConnection(),
  }

  // Tests opcionales si la API funciona
  if (results.api) {
    results.tags = await testManychatTags()
    results.customFields = await testManychatCustomFields()
  }

  await showRecommendations(results)

  // Resumen final
  log('\n=== Resumen ===', 'cyan')
  const coreTests = ['env', 'api']
  const corePassed = coreTests.filter(test => results[test]).length
  const coreTotal = coreTests.length

  log(`\nPruebas core: ${corePassed}/${coreTotal}`)

  if (corePassed === coreTotal) {
    success('\n✓ Configuración de Manychat correcta!')
    log('\n📖 Consulta: INSTRUCCIONES-CONFIGURACION-MANYCHAT.md', 'cyan')
  } else {
    error('\n✗ Configuración incompleta')
    log('\n📖 Consulta: MANYCHAT-ENV-VARIABLES.txt', 'cyan')
  }

  log('')
}

main().catch((err) => {
  error(`\nError fatal: ${err.message}`)
  console.error(err)
  process.exit(1)
})

