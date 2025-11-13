/**
 * Script para ejecutar SQL en Supabase
 * Ejecuta el archivo create-missing-tables.sql
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function executeSQLFile(filename) {
  console.log(`🔧 Ejecutando archivo SQL: ${filename}`)
  
  try {
    // Leer archivo SQL
    const sqlPath = path.join(__dirname, filename)
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Archivo no encontrado: ${sqlPath}`)
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    console.log(`📄 Archivo leído: ${sqlContent.length} caracteres`)
    
    // Dividir en statements individuales (separados por ;)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Encontrados ${statements.length} statements SQL`)
    
    let successCount = 0
    let errorCount = 0
    
    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Saltar comentarios y statements vacíos
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue
      }
      
      console.log(`\n⚡ Ejecutando statement ${i + 1}/${statements.length}`)
      console.log(`📋 SQL: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: statement })
        })
        
        if (response.ok) {
          console.log(`✅ Statement ${i + 1} ejecutado exitosamente`)
          successCount++
        } else {
          const errorText = await response.text()
          console.log(`❌ Error en statement ${i + 1}: ${response.status} - ${errorText}`)
          errorCount++
          
          // Intentar método alternativo para algunos statements
          if (statement.includes('CREATE TABLE') || statement.includes('CREATE TYPE')) {
            console.log(`🔄 Intentando método alternativo...`)
            await executeDirectSQL(statement)
          }
        }
        
      } catch (error) {
        console.log(`❌ Error ejecutando statement ${i + 1}: ${error.message}`)
        errorCount++
      }
      
      // Pequeña pausa entre statements
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n📊 Resumen de ejecución:`)
    console.log(`✅ Exitosos: ${successCount}`)
    console.log(`❌ Errores: ${errorCount}`)
    console.log(`📝 Total: ${statements.length}`)
    
    return { successCount, errorCount, total: statements.length }
    
  } catch (error) {
    console.error(`❌ Error general ejecutando SQL: ${error.message}`)
    throw error
  }
}

async function executeDirectSQL(sql) {
  try {
    // Método directo usando la API REST de Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/sql'
      },
      body: sql
    })
    
    if (response.ok) {
      console.log(`✅ SQL directo ejecutado exitosamente`)
      return true
    } else {
      const errorText = await response.text()
      console.log(`❌ Error SQL directo: ${response.status} - ${errorText}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Error en SQL directo: ${error.message}`)
    return false
  }
}

async function verifyTablesCreated() {
  console.log('\n🔍 Verificando tablas creadas...')
  
  const expectedTables = [
    'user_profiles',
    'lead_history', 
    'user_zone_assignments',
    'lead_assignments',
    'formosa_zones'
  ]
  
  for (const table of expectedTables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=1`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      })
      
      if (response.ok) {
        console.log(`✅ Tabla '${table}' creada exitosamente`)
      } else {
        console.log(`❌ Tabla '${table}' no encontrada o inaccesible`)
      }
    } catch (error) {
      console.log(`❌ Error verificando tabla '${table}': ${error.message}`)
    }
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando creación de tablas faltantes en Supabase...\n')
  
  try {
    // Ejecutar archivo SQL
    const result = await executeSQLFile('create-missing-tables.sql')
    
    // Verificar que las tablas se crearon
    await verifyTablesCreated()
    
    console.log('\n🎉 Proceso completado!')
    
    if (result.errorCount > 0) {
      console.log('⚠️  Algunos statements fallaron. Revisa los errores arriba.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Error fatal:', error.message)
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main()
}

module.exports = { executeSQLFile, verifyTablesCreated }
