#!/usr/bin/env node

/**
 * Script para crear tablas en Supabase usando la API REST
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function createTables() {
  console.log('🏗️  Creando tablas en Supabase usando SQL...')
  
  const createTablesSQL = `
    -- Crear tabla User
    CREATE TABLE IF NOT EXISTS "User" (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ANALISTA',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Crear tabla Lead
    CREATE TABLE IF NOT EXISTS "Lead" (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      email TEXT,
      dni TEXT,
      ingresos INTEGER,
      zona TEXT,
      producto TEXT,
      monto INTEGER,
      origen TEXT,
      "utmSource" TEXT,
      estado TEXT NOT NULL DEFAULT 'NUEVO',
      agencia TEXT,
      notas TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Crear tabla Event
    CREATE TABLE IF NOT EXISTS "Event" (
      id TEXT PRIMARY KEY,
      "leadId" TEXT NOT NULL,
      "userId" TEXT,
      tipo TEXT NOT NULL,
      payload TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("leadId") REFERENCES "Lead"(id) ON DELETE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL
    );

    -- Crear tabla Rule
    CREATE TABLE IF NOT EXISTS "Rule" (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Crear índices
    CREATE INDEX IF NOT EXISTS "Lead_estado_idx" ON "Lead"("estado");
    CREATE INDEX IF NOT EXISTS "Lead_origen_idx" ON "Lead"("origen");
    CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");
    CREATE INDEX IF NOT EXISTS "Event_leadId_idx" ON "Event"("leadId");
    CREATE INDEX IF NOT EXISTS "Event_tipo_idx" ON "Event"("tipo");
  `

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        sql: createTablesSQL
      })
    })

    if (response.ok) {
      console.log('✅ Tablas creadas exitosamente')
      return true
    } else {
      console.log('❌ Error creando tablas:', response.status, response.statusText)
      const error = await response.text()
      console.log('Error details:', error)
      return false
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message)
    return false
  }
}

async function insertSeedData() {
  console.log('🌱 Insertando datos de ejemplo...')
  
  // Insertar usuarios
  const users = [
    {
      id: 'cmelinrbc00098njfjeob0c7j',
      email: 'admin@phorencial.com',
      name: 'Admin',
      password: '$2b$10$8K8K8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K',
      role: 'ADMIN'
    },
    {
      id: 'cmelinrbc00099njfjeob0c7k',
      email: 'ludmila@phorencial.com',
      name: 'Ludmila',
      password: '$2b$10$8K8K8K8K8K8K8K8K8K8K8O8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K',
      role: 'ANALISTA'
    }
  ]

  for (const user of users) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/User`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(user)
      })

      if (response.ok) {
        console.log(`✅ Usuario ${user.email} creado`)
      } else {
        console.log(`⚠️  Usuario ${user.email} ya existe o error:`, response.status)
      }
    } catch (error) {
      console.log(`❌ Error creando usuario ${user.email}:`, error.message)
    }
  }

  // Insertar reglas
  const rules = [
    { key: 'edadMin', value: '18', description: 'Edad mínima permitida' },
    { key: 'edadMax', value: '75', description: 'Edad máxima permitida' },
    { key: 'minIngreso', value: '200000', description: 'Ingreso mínimo requerido' },
    { key: 'zonasPermitidas', value: 'CABA,GBA,Córdoba', description: 'Zonas permitidas' },
    { key: 'requiereBlanco', value: 'true', description: 'Requiere estar en blanco' }
  ]

  for (const rule of rules) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/Rule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(rule)
      })

      if (response.ok) {
        console.log(`✅ Regla ${rule.key} creada`)
      } else {
        console.log(`⚠️  Regla ${rule.key} ya existe o error:`, response.status)
      }
    } catch (error) {
      console.log(`❌ Error creando regla ${rule.key}:`, error.message)
    }
  }
}

async function main() {
  console.log('🚀 Configurando Supabase...')
  
  const tablesCreated = await createTables()
  if (tablesCreated) {
    await insertSeedData()
    console.log('🎉 ¡Configuración completada!')
  } else {
    console.log('❌ No se pudieron crear las tablas')
  }
}

main().catch(console.error)
