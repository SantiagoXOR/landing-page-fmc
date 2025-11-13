#!/usr/bin/env node

/**
 * Script para probar la conexión a Supabase
 * Uso: node test-supabase.js
 */

// Cargar variables de entorno manualmente
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.join(__dirname, '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf8')

  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '')
      process.env[key.trim()] = value.trim()
    }
  })
} catch (error) {
  console.log('⚠️  No se pudo cargar .env.local:', error.message)
}

async function testSupabaseConnection() {
  console.log('🔍 Probando conexión a Supabase...\n')
  
  // Verificar variables de entorno
  const requiredVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  console.log('📋 Variables de entorno:')
  let allVarsPresent = true
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 50)}...`)
    } else {
      console.log(`❌ ${varName}: NO CONFIGURADA`)
      allVarsPresent = false
    }
  })
  
  if (!allVarsPresent) {
    console.log('\n❌ Faltan variables de entorno. Configúralas en .env.local')
    process.exit(1)
  }
  
  // Probar conexión con Prisma
  console.log('\n🔌 Probando conexión con Prisma...')
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    await prisma.$connect()
    console.log('✅ Conexión exitosa con Prisma')
    
    // Probar consulta simple
    const userCount = await prisma.user.count()
    console.log(`📊 Usuarios en la base de datos: ${userCount}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.log('❌ Error de conexión con Prisma:')
    console.log(`   ${error.message}`)
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Verifica la contraseña en DATABASE_URL')
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 Verifica el PROJECT_ID en DATABASE_URL')
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 Las tablas no existen. Ejecuta: npx prisma db push')
    }
    
    process.exit(1)
  }
  
  // Probar API REST de Supabase
  console.log('\n🌐 Probando API REST de Supabase...')
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    })
    
    if (response.ok) {
      console.log('✅ API REST de Supabase accesible')
    } else {
      console.log(`❌ Error en API REST: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.log('❌ Error probando API REST:')
    console.log(`   ${error.message}`)
  }
  
  console.log('\n🎉 ¡Pruebas completadas!')
  console.log('\n📋 Si todo está ✅, puedes ejecutar: npm run dev')
}

testSupabaseConnection().catch(error => {
  console.log('💥 Error fatal:', error.message)
  process.exit(1)
})
