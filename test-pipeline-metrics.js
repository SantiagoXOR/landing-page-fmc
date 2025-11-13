#!/usr/bin/env node

/**
 * Script para probar las métricas del pipeline
 */

const SUPABASE_URL = 'https://aozysydpwvkkdvhfsvsu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvenlzeWRwd3Zra2R2aGZzdnN1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxNDk4NCwiZXhwIjoyMDcxMzkwOTg0fQ.S0VZQD26wTUcoTeo9ZSqoO0JbQq1zvP_uT0LZsXmCPw'

async function testPipelineMetrics() {
  console.log('🧪 Probando métricas del pipeline...')
  
  try {
    // 1. Probar si la función RPC existe
    console.log('\n1️⃣ Probando función RPC get_pipeline_metrics...')
    
    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_pipeline_metrics`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    
    console.log('Status RPC:', rpcResponse.status)
    
    if (rpcResponse.ok) {
      const rpcData = await rpcResponse.json()
      console.log('✅ Función RPC funciona')
      console.log('Datos:', JSON.stringify(rpcData, null, 2))
    } else {
      const errorText = await rpcResponse.text()
      console.log('❌ Error en función RPC:', errorText)
    }
    
    // 2. Probar la API del pipeline
    console.log('\n2️⃣ Probando API /api/pipeline...')
    
    const apiResponse = await fetch('http://localhost:3000/api/pipeline', {
      headers: {
        'Cookie': 'next-auth.session-token=test' // Simular sesión
      }
    })
    
    console.log('Status API:', apiResponse.status)
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json()
      console.log('✅ API funciona')
      console.log('Datos:', JSON.stringify(apiData, null, 2))
    } else {
      const errorText = await apiResponse.text()
      console.log('❌ Error en API:', errorText)
    }
    
    // 3. Verificar tablas relacionadas
    console.log('\n3️⃣ Verificando tablas relacionadas...')
    
    const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_pipeline?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (tablesResponse.ok) {
      const count = tablesResponse.headers.get('content-range')
      console.log('✅ Tabla lead_pipeline existe')
      console.log('Registros:', count)
    } else {
      console.log('❌ Tabla lead_pipeline no existe o no es accesible')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

testPipelineMetrics()
