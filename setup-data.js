#!/usr/bin/env node

/**
 * Script para insertar datos iniciales en Supabase
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function insertUsers() {
  console.log('👥 Insertando usuarios...')
  
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
      } else if (response.status === 409) {
        console.log(`⚠️  Usuario ${user.email} ya existe`)
      } else {
        console.log(`❌ Error creando usuario ${user.email}:`, response.status, await response.text())
      }
    } catch (error) {
      console.log(`❌ Error creando usuario ${user.email}:`, error.message)
    }
  }
}

async function insertRules() {
  console.log('📋 Insertando reglas...')
  
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
      } else if (response.status === 409) {
        console.log(`⚠️  Regla ${rule.key} ya existe`)
      } else {
        console.log(`❌ Error creando regla ${rule.key}:`, response.status, await response.text())
      }
    } catch (error) {
      console.log(`❌ Error creando regla ${rule.key}:`, error.message)
    }
  }
}

async function insertSampleLeads() {
  console.log('🎯 Insertando leads de ejemplo...')
  
  const leads = [
    {
      id: 'lead_001',
      nombre: 'Juan Pérez',
      telefono: '+541123456789',
      email: 'juan.perez@email.com',
      dni: '12345678',
      ingresos: 300000,
      zona: 'CABA',
      producto: 'Préstamo Personal',
      monto: 500000,
      origen: 'Facebook',
      utmSource: 'facebook-ads',
      estado: 'NUEVO',
      agencia: 'Digital Marketing',
      notas: 'Cliente interesado en préstamo para refacciones'
    },
    {
      id: 'lead_002',
      nombre: 'María González',
      telefono: '+541198765432',
      email: 'maria.gonzalez@email.com',
      dni: '87654321',
      ingresos: 450000,
      zona: 'GBA',
      producto: 'Tarjeta de Crédito',
      monto: 200000,
      origen: 'Google',
      utmSource: 'google-ads',
      estado: 'CONTACTADO',
      agencia: 'Performance Marketing',
      notas: 'Solicita información sobre límites de tarjeta'
    }
  ]

  for (const lead of leads) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/Lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(lead)
      })

      if (response.ok) {
        console.log(`✅ Lead ${lead.nombre} creado`)
      } else if (response.status === 409) {
        console.log(`⚠️  Lead ${lead.nombre} ya existe`)
      } else {
        console.log(`❌ Error creando lead ${lead.nombre}:`, response.status, await response.text())
      }
    } catch (error) {
      console.log(`❌ Error creando lead ${lead.nombre}:`, error.message)
    }
  }
}

async function verifyData() {
  console.log('🔍 Verificando datos insertados...')
  
  const tables = ['User', 'Rule', 'Lead']
  
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`📊 Tabla ${table}: ${data.length} registros`)
      } else {
        console.log(`❌ Error verificando tabla ${table}:`, response.status)
      }
    } catch (error) {
      console.log(`❌ Error verificando tabla ${table}:`, error.message)
    }
  }
}

async function main() {
  console.log('🚀 Configurando datos iniciales en Supabase...')
  
  await insertUsers()
  await insertRules()
  await insertSampleLeads()
  await verifyData()
  
  console.log('🎉 ¡Configuración de datos completada!')
}

main().catch(console.error)
