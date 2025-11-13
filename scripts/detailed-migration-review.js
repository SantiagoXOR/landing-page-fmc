/**
 * Script para revisar detalladamente el estado de las migraciones
 */

// Cargar variables de entorno
require('dotenv').config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

async function makeSupabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

async function getTableCount(tableName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (response.ok) {
      const count = response.headers.get('content-range')
      return count ? parseInt(count.split('/')[1]) : 0
    }
    return 0
  } catch (error) {
    return 0
  }
}

async function reviewMigrations() {
  console.log('🔍 REVISIÓN COMPLETA DE MIGRACIONES')
  console.log('=' .repeat(50))
  
  // 1. Estado de las tablas principales
  console.log('\n📊 ESTADO DE LAS TABLAS:')
  const tables = [
    'User', 'Lead', 'Event', 'user_profiles', 
    'lead_history', 'user_zone_assignments', 'lead_assignments'
  ]
  
  const tableCounts = {}
  
  for (const table of tables) {
    try {
      const count = await getTableCount(table)
      tableCounts[table] = count
      console.log(`   ✅ ${table}: ${count} registros`)
    } catch (error) {
      console.log(`   ❌ ${table}: Error - ${error.message}`)
      tableCounts[table] = 0
    }
  }
  
  // 2. Análisis detallado de Leads
  console.log('\n📋 ANÁLISIS DETALLADO DE LEADS:')
  try {
    const leads = await makeSupabaseRequest('Lead?select=*&limit=5')
    console.log(`   📊 Total de leads en BD: ${tableCounts.Lead}`)
    
    if (leads.length > 0) {
      console.log('   🔧 Campos disponibles:', Object.keys(leads[0]).join(', '))
      console.log('   📝 Ejemplo de lead:')
      console.log('      -', leads[0].name || leads[0].fullName || 'Sin nombre')
      console.log('      -', leads[0].phone || 'Sin teléfono')
      console.log('      -', leads[0].status || 'Sin estado')
    }
  } catch (error) {
    console.log('   ❌ Error al obtener leads:', error.message)
  }
  
  // 3. Análisis de Usuarios
  console.log('\n👥 ANÁLISIS DE USUARIOS:')
  try {
    const users = await makeSupabaseRequest('User?select=*')
    console.log(`   📊 Total de usuarios: ${users.length}`)
    
    if (users.length > 0) {
      console.log('   👤 Usuarios registrados:')
      users.forEach(user => {
        console.log(`      - ${user.email} (${user.role || 'sin rol'})`)
      })
    }
  } catch (error) {
    console.log('   ❌ Error al obtener usuarios:', error.message)
  }
  
  // 4. Análisis del CSV
  console.log('\n📄 ANÁLISIS DEL ARCHIVO CSV:')
  try {
    const fs = require('fs')
    const csvContent = fs.readFileSync('BASE DE CONSULTAS - Hoja 2.csv', 'utf8')
    const lines = csvContent.split('\n').filter(line => line.trim())
    
    console.log(`   📊 Total de líneas en CSV: ${lines.length}`)
    console.log(`   📊 Registros de datos: ${lines.length - 1} (excluyendo encabezado)`)
    console.log(`   📋 Encabezados: ${lines[0]}`)
    
    // Análisis de estados en el CSV
    const estados = {}
    for (let i = 1; i < Math.min(lines.length, 100); i++) {
      const columns = lines[i].split(',')
      if (columns.length > 8) {
        const estado = columns[8]?.trim()
        if (estado) {
          estados[estado] = (estados[estado] || 0) + 1
        }
      }
    }
    
    console.log('   📊 Estados encontrados en muestra (primeros 100):')
    Object.entries(estados).forEach(([estado, count]) => {
      console.log(`      - ${estado}: ${count}`)
    })
    
  } catch (error) {
    console.log('   ❌ Error al analizar CSV:', error.message)
  }
  
  // 5. Resumen de migración
  console.log('\n📈 RESUMEN DE MIGRACIÓN:')
  const csvRecords = 2016 // Total esperado del CSV (2017 - 1 encabezado)
  const dbLeads = tableCounts.Lead || 0
  const pendingMigration = csvRecords - dbLeads + 1 // +1 porque puede haber un lead de prueba
  
  console.log(`   📊 Registros en CSV: ${csvRecords}`)
  console.log(`   📊 Registros en BD: ${dbLeads}`)
  console.log(`   📊 Pendientes de migrar: ${Math.max(0, pendingMigration)}`)
  
  if (pendingMigration > 0) {
    console.log(`   ⚠️  FALTAN ${pendingMigration} REGISTROS POR MIGRAR`)
  } else {
    console.log('   ✅ MIGRACIÓN COMPLETA')
  }
  
  console.log('\n' + '=' .repeat(50))
  console.log('✅ Revisión completada')
}

// Ejecutar la revisión
reviewMigrations().catch(console.error)