#!/usr/bin/env node

/**
 * Script para probar las rutas de autenticación
 * Uso: node scripts/test-auth-routes.js
 */

const http = require('http')

const BASE_URL = 'http://localhost:3000'

async function testRoute(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Test-Script/1.0'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200) // Solo primeros 200 caracteres
        })
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

async function runTests() {
  console.log('🧪 Probando rutas de autenticación...\n')

  const tests = [
    { path: '/auth/signin', name: 'Página de signin', expectedStatus: 200 },
    { path: '/api/auth/providers', name: 'Proveedores de auth', expectedStatus: 200 },
    { path: '/api/auth/csrf', name: 'Token CSRF', expectedStatus: 200 },
    { path: '/api/auth/session', name: 'Sesión actual', expectedStatus: 200 },
    { path: '/dashboard', name: 'Dashboard (debe redirigir)', expectedStatus: [200, 302, 307] }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      console.log(`📋 Probando: ${test.name}`)
      console.log(`   URL: ${BASE_URL}${test.path}`)
      
      const result = await testRoute(test.path)
      const expectedStatuses = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus]
      
      if (expectedStatuses.includes(result.status)) {
        console.log(`   ✅ PASS - Status: ${result.status}`)
        passed++
      } else {
        console.log(`   ❌ FAIL - Expected: ${test.expectedStatus}, Got: ${result.status}`)
        failed++
      }
      
      // Mostrar información adicional para rutas específicas
      if (test.path === '/auth/signin' && result.status === 200) {
        const hasLoginForm = result.data.includes('login-form') || result.data.includes('Iniciar Sesión')
        console.log(`   📝 Contiene formulario de login: ${hasLoginForm ? 'Sí' : 'No'}`)
      }
      
      if (test.path.startsWith('/api/auth/')) {
        console.log(`   📄 Content-Type: ${result.headers['content-type'] || 'N/A'}`)
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`)
      failed++
    }
    
    console.log('')
  }

  console.log('📊 Resumen de pruebas:')
  console.log(`   ✅ Pasaron: ${passed}`)
  console.log(`   ❌ Fallaron: ${failed}`)
  console.log(`   📈 Total: ${passed + failed}`)

  if (failed === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! Las rutas de autenticación están funcionando correctamente.')
  } else {
    console.log('\n⚠️ Algunas pruebas fallaron. Revisa la configuración del servidor de desarrollo.')
  }

  return failed === 0
}

// Verificar que el servidor esté corriendo
async function checkServer() {
  try {
    await testRoute('/')
    return true
  } catch (error) {
    console.log('❌ El servidor de desarrollo no está corriendo en localhost:3000')
    console.log('   Ejecuta: npm run dev')
    return false
  }
}

async function main() {
  console.log('🔍 Verificando servidor de desarrollo...')
  
  const serverRunning = await checkServer()
  if (!serverRunning) {
    process.exit(1)
  }
  
  console.log('✅ Servidor detectado\n')
  
  const success = await runTests()
  process.exit(success ? 0 : 1)
}

main().catch(console.error)
