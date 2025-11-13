/**
 * Script para crear tablas manualmente usando la API REST de Supabase
 * Como alternativa al SQL directo
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function createTablesManually() {
  console.log('🔧 Creando tablas manualmente usando API REST...\n')

  // 1. Crear tabla user_profiles
  console.log('📋 Creando tabla user_profiles...')
  try {
    // Primero intentar crear algunos registros de prueba para ver si la tabla existe
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    })
    
    if (testResponse.ok) {
      console.log('✅ Tabla user_profiles ya existe')
    } else {
      console.log('❌ Tabla user_profiles no existe, necesita ser creada via SQL Editor')
    }
  } catch (error) {
    console.log(`❌ Error verificando user_profiles: ${error.message}`)
  }

  // 2. Crear tabla lead_history
  console.log('\n📋 Creando tabla lead_history...')
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_history?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    })
    
    if (testResponse.ok) {
      console.log('✅ Tabla lead_history ya existe')
    } else {
      console.log('❌ Tabla lead_history no existe, necesita ser creada via SQL Editor')
    }
  } catch (error) {
    console.log(`❌ Error verificando lead_history: ${error.message}`)
  }

  // 3. Crear tabla user_zone_assignments
  console.log('\n📋 Creando tabla user_zone_assignments...')
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_zone_assignments?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    })
    
    if (testResponse.ok) {
      console.log('✅ Tabla user_zone_assignments ya existe')
    } else {
      console.log('❌ Tabla user_zone_assignments no existe, necesita ser creada via SQL Editor')
    }
  } catch (error) {
    console.log(`❌ Error verificando user_zone_assignments: ${error.message}`)
  }

  // 4. Crear tabla lead_assignments
  console.log('\n📋 Creando tabla lead_assignments...')
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_assignments?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    })
    
    if (testResponse.ok) {
      console.log('✅ Tabla lead_assignments ya existe')
    } else {
      console.log('❌ Tabla lead_assignments no existe, necesita ser creada via SQL Editor')
    }
  } catch (error) {
    console.log(`❌ Error verificando lead_assignments: ${error.message}`)
  }

  // 5. Crear tabla formosa_zones
  console.log('\n📋 Creando tabla formosa_zones...')
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/formosa_zones?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    })
    
    if (testResponse.ok) {
      console.log('✅ Tabla formosa_zones ya existe')
    } else {
      console.log('❌ Tabla formosa_zones no existe, necesita ser creada via SQL Editor')
    }
  } catch (error) {
    console.log(`❌ Error verificando formosa_zones: ${error.message}`)
  }

  console.log('\n📝 INSTRUCCIONES PARA CONTINUAR:')
  console.log('==================================')
  console.log('Las tablas necesitan ser creadas usando el SQL Editor de Supabase.')
  console.log('Sigue estos pasos:')
  console.log('')
  console.log('1. Ve a https://supabase.com/dashboard/project/aozysydpwvkkdvhfsvsu')
  console.log('2. Navega a SQL Editor')
  console.log('3. Copia y pega el contenido del archivo scripts/create-missing-tables.sql')
  console.log('4. Ejecuta el SQL')
  console.log('5. Vuelve a ejecutar este script para verificar')
  console.log('')
  console.log('Alternativamente, puedes usar el siguiente SQL simplificado:')
  console.log('')
  
  // Mostrar SQL simplificado
  const simplifiedSQL = `
-- ENUM para roles
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'AGENT', 'VIEWER');

-- Tabla user_profiles
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'AGENT',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla lead_history
CREATE TABLE lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  campo_modificado VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  fecha_cambio TIMESTAMP DEFAULT NOW()
);

-- Tabla user_zone_assignments
CREATE TABLE user_zone_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  zone VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla lead_assignments
CREATE TABLE lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true
);

-- Tabla formosa_zones
CREATE TABLE formosa_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);
`
  
  console.log(simplifiedSQL)
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTablesManually()
}

module.exports = { createTablesManually }
