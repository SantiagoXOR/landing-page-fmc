#!/usr/bin/env node

/**
 * Script para migrar de SQLite a Supabase PostgreSQL
 * 
 * Uso:
 * 1. Configura las variables de entorno en .env.local
 * 2. Ejecuta: node migrate-to-supabase.js
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function checkEnvironment() {
  log('🔍 Verificando configuración...', 'blue')
  
  const requiredVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    log('❌ Variables de entorno faltantes:', 'red')
    missing.forEach(varName => log(`   - ${varName}`, 'red'))
    log('\n📖 Lee setup-supabase.md para instrucciones completas', 'yellow')
    process.exit(1)
  }
  
  log('✅ Variables de entorno configuradas', 'green')
}

async function testConnection() {
  log('🔌 Probando conexión a Supabase...', 'blue')
  
  try {
    const prisma = new PrismaClient()
    await prisma.$connect()
    log('✅ Conexión exitosa a Supabase', 'green')
    await prisma.$disconnect()
    return true
  } catch (error) {
    log('❌ Error de conexión:', 'red')
    log(`   ${error.message}`, 'red')
    
    if (error.message.includes('password authentication failed')) {
      log('\n💡 Verifica la contraseña de la base de datos en DATABASE_URL', 'yellow')
    } else if (error.message.includes('does not exist')) {
      log('\n💡 Verifica el PROJECT_ID en las URLs de Supabase', 'yellow')
    }
    
    return false
  }
}

async function backupSQLiteData() {
  log('💾 Creando backup de datos SQLite...', 'blue')
  
  try {
    // Cambiar temporalmente a SQLite para hacer backup
    const sqliteUrl = 'file:./dev.db'
    const sqlitePrisma = new PrismaClient({
      datasources: {
        db: {
          url: sqliteUrl
        }
      }
    })
    
    await sqlitePrisma.$connect()
    
    // Exportar datos
    const leads = await sqlitePrisma.lead.findMany({
      include: { events: true }
    })
    const users = await sqlitePrisma.user.findMany()
    const rules = await sqlitePrisma.rule.findMany()
    
    const backup = {
      timestamp: new Date().toISOString(),
      leads,
      users,
      rules
    }
    
    const backupPath = path.join(__dirname, `backup-${Date.now()}.json`)
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
    
    await sqlitePrisma.$disconnect()
    
    log(`✅ Backup creado: ${backupPath}`, 'green')
    log(`   - ${leads.length} leads`, 'cyan')
    log(`   - ${users.length} usuarios`, 'cyan')
    log(`   - ${rules.length} reglas`, 'cyan')
    
    return backup
  } catch (error) {
    log('⚠️  No se pudo crear backup de SQLite (puede que no exista)', 'yellow')
    log(`   ${error.message}`, 'yellow')
    return null
  }
}

async function setupDatabase() {
  log('🏗️  Configurando base de datos en Supabase...', 'blue')
  
  try {
    const prisma = new PrismaClient()
    await prisma.$connect()
    
    // Verificar si las tablas existen
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `
    
    log(`📊 Tablas encontradas: ${tables.length}`, 'cyan')
    
    if (tables.length === 0) {
      log('📝 Ejecutando migraciones...', 'blue')
      // Las migraciones se deben ejecutar manualmente con prisma db push
      log('⚠️  Ejecuta: npx prisma db push', 'yellow')
    }
    
    await prisma.$disconnect()
    return true
  } catch (error) {
    log('❌ Error configurando base de datos:', 'red')
    log(`   ${error.message}`, 'red')
    return false
  }
}

async function migrateData(backup) {
  if (!backup) {
    log('⚠️  No hay datos para migrar', 'yellow')
    return
  }
  
  log('📦 Migrando datos a Supabase...', 'blue')
  
  try {
    const prisma = new PrismaClient()
    await prisma.$connect()
    
    // Migrar usuarios
    log('👥 Migrando usuarios...', 'cyan')
    for (const user of backup.users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: user,
        create: user
      })
    }
    log(`✅ ${backup.users.length} usuarios migrados`, 'green')
    
    // Migrar reglas
    log('⚙️  Migrando reglas...', 'cyan')
    for (const rule of backup.rules) {
      await prisma.rule.upsert({
        where: { key: rule.key },
        update: rule,
        create: rule
      })
    }
    log(`✅ ${backup.rules.length} reglas migradas`, 'green')
    
    // Migrar leads y eventos
    log('📋 Migrando leads...', 'cyan')
    for (const lead of backup.leads) {
      const { events, ...leadData } = lead
      
      const createdLead = await prisma.lead.upsert({
        where: { id: lead.id },
        update: leadData,
        create: leadData
      })
      
      // Migrar eventos del lead
      for (const event of events) {
        await prisma.event.upsert({
          where: { id: event.id },
          update: event,
          create: event
        })
      }
    }
    log(`✅ ${backup.leads.length} leads migrados`, 'green')
    
    await prisma.$disconnect()
    
  } catch (error) {
    log('❌ Error migrando datos:', 'red')
    log(`   ${error.message}`, 'red')
  }
}

async function setupRLS() {
  log('🔒 Configurando Row Level Security...', 'blue')
  
  const rlsSQL = `
    -- Habilitar RLS en todas las tablas
    ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;

    -- Políticas para permitir acceso completo (desarrollo)
    DROP POLICY IF EXISTS "Allow all operations on Lead" ON "Lead";
    CREATE POLICY "Allow all operations on Lead" ON "Lead"
    FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all operations on Event" ON "Event";
    CREATE POLICY "Allow all operations on Event" ON "Event"
    FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all operations on User" ON "User";
    CREATE POLICY "Allow all operations on User" ON "User"
    FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all operations on Rule" ON "Rule";
    CREATE POLICY "Allow all operations on Rule" ON "Rule"
    FOR ALL USING (true) WITH CHECK (true);
  `
  
  try {
    const prisma = new PrismaClient()
    await prisma.$connect()
    await prisma.$executeRawUnsafe(rlsSQL)
    await prisma.$disconnect()
    
    log('✅ RLS configurado correctamente', 'green')
  } catch (error) {
    log('⚠️  Error configurando RLS (puede requerir configuración manual):', 'yellow')
    log(`   ${error.message}`, 'yellow')
    log('\n📝 Ejecuta manualmente en Supabase SQL Editor:', 'cyan')
    log(rlsSQL, 'cyan')
  }
}

async function main() {
  log('🚀 Iniciando migración a Supabase...', 'magenta')
  log('=' .repeat(50), 'magenta')
  
  // 1. Verificar configuración
  checkEnvironment()
  
  // 2. Probar conexión
  const connected = await testConnection()
  if (!connected) {
    process.exit(1)
  }
  
  // 3. Backup de datos SQLite
  const backup = await backupSQLiteData()
  
  // 4. Configurar base de datos
  const dbSetup = await setupDatabase()
  if (!dbSetup) {
    process.exit(1)
  }
  
  // 5. Migrar datos
  await migrateData(backup)
  
  // 6. Configurar RLS
  await setupRLS()
  
  log('=' .repeat(50), 'magenta')
  log('🎉 ¡Migración completada!', 'green')
  log('\n📋 Próximos pasos:', 'blue')
  log('   1. Ejecuta: npm run dev', 'cyan')
  log('   2. Prueba el login en http://localhost:3001', 'cyan')
  log('   3. Verifica que los datos se muestren correctamente', 'cyan')
  log('\n📖 Si hay problemas, consulta setup-supabase.md', 'yellow')
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log('💥 Error fatal:', 'red')
    log(error.message, 'red')
    process.exit(1)
  })
}

module.exports = { main }
