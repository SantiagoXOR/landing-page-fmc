/**
 * Script para revisar las tablas existentes en Supabase
 */

// Cargar variables de entorno
require('dotenv').config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  console.error('Asegúrate de que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén en el archivo .env')
  process.exit(1)
}

async function checkTables() {
  console.log('🔍 Revisando tablas existentes en Supabase...\n')

  try {
    // Intentar obtener información de las tablas principales
    const tables = ['User', 'Lead', 'Event', 'user_profiles', 'lead_history', 'user_zone_assignments', 'lead_assignments']
    
    for (const table of tables) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Tabla '${table}' existe`)
          
          // Obtener estructura de la tabla
          const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Prefer': 'count=exact'
            }
          })
          
          if (countResponse.ok) {
            const countData = await countResponse.json()
            console.log(`   📊 Registros: ${countData.length > 0 ? 'Datos encontrados' : 'Vacía'}`)
          }
          
          // Si hay datos, mostrar estructura de un registro
          if (data.length > 0) {
            console.log(`   🔧 Campos: ${Object.keys(data[0]).join(', ')}`)
          }
        } else {
          console.log(`❌ Tabla '${table}' no existe o no es accesible`)
        }
      } catch (error) {
        console.log(`❌ Error al verificar tabla '${table}': ${error.message}`)
      }
      console.log('')
    }

    // Verificar tabla de leads específicamente
    console.log('📋 Verificando datos de leads...')
    try {
      const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=count`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact'
        }
      })

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json()
        console.log(`✅ Total de leads: ${leadsData.length}`)
        
        // Obtener algunos leads de ejemplo
        const sampleResponse = await fetch(`${SUPABASE_URL}/rest/v1/Lead?select=*&limit=3`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          }
        })
        
        if (sampleResponse.ok) {
          const sampleData = await sampleResponse.json()
          console.log('📝 Ejemplo de leads:')
          sampleData.forEach((lead, index) => {
            console.log(`   ${index + 1}. ${lead.nombre} - ${lead.estado} - ${lead.zona}`)
          })
        }
      }
    } catch (error) {
      console.log(`❌ Error al verificar leads: ${error.message}`)
    }

  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkTables()
}

module.exports = { checkTables }
