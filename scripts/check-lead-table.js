// Script para verificar la estructura de la tabla Lead
require('dotenv').config({ path: __dirname + '/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkLeadTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla Lead...')
    
    // Obtener información de las columnas de la tabla Lead
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'Lead')
      .order('ordinal_position')
    
    if (error) {
      console.error('❌ Error obteniendo estructura de la tabla:', error.message)
      return
    }
    
    console.log('📋 Estructura de la tabla Lead:')
    console.log('=====================================')
    columns.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`)
    })
    
    // Obtener algunos registros de ejemplo
    console.log('\n📊 Registros de ejemplo:')
    console.log('========================')
    const { data: leads, error: leadsError } = await supabase
      .from('Lead')
      .select('*')
      .limit(3)
    
    if (leadsError) {
      console.error('❌ Error obteniendo leads:', leadsError.message)
      return
    }
    
    if (leads && leads.length > 0) {
      console.log(`Total de leads: ${leads.length}`)
      console.log('Primer lead:', JSON.stringify(leads[0], null, 2))
    } else {
      console.log('No hay leads en la tabla')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Ejecutar
checkLeadTable()
  .then(() => {
    console.log('\n✅ Verificación completada')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
