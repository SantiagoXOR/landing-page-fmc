#!/usr/bin/env node

/**
 * Script para crear la tabla de documentos en Supabase
 * Ejecuta el SQL desde create-documents-table.sql
 */

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

async function executeSQL(sql) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  }

  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error executing SQL:', error)
    throw error
  }
}

async function createDocumentsTable() {
  try {
    console.log('📄 Creando tabla de documentos en Supabase...')
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'create-documents-table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Ejecutar el SQL directamente usando la API REST de Supabase
    // Nota: Supabase no tiene un endpoint RPC para ejecutar SQL arbitrario
    // Necesitamos usar el SQL Editor o ejecutar manualmente
    
    console.log('⚠️  Este script requiere ejecutar el SQL manualmente.')
    console.log('📝 Por favor, ejecuta el siguiente SQL en el SQL Editor de Supabase:')
    console.log('\n' + '='.repeat(80))
    console.log(sql)
    console.log('='.repeat(80) + '\n')
    
    console.log('🔗 Ve a: https://supabase.com/dashboard/project/[TU_PROYECTO]/sql/new')
    console.log('📋 Copia y pega el SQL mostrado arriba')
    console.log('✅ Ejecuta el script y verifica que no haya errores')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createDocumentsTable()
}

module.exports = { createDocumentsTable }

