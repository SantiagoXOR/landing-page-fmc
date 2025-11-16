import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear usuarios demo
  console.log('👥 Creando usuarios demo...')
  
  const users = [
    {
      nombre: 'Ludmila',
      email: 'ludmila@phorencial.com',
      password: 'ludmila123',
      rol: 'ANALISTA',
    },
    {
      nombre: 'Facundo',
      email: 'facundo@phorencial.com',
      password: 'facundo123',
      rol: 'ANALISTA',
    },
    {
      nombre: 'Admin',
      email: 'admin@phorencial.com',
      password: 'admin123',
      rol: 'ADMIN',
    },
    {
      nombre: 'Vendedor Demo',
      email: 'vendedor@phorencial.com',
      password: 'vendedor123',
      rol: 'VENDEDOR',
    },
  ]

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        nombre: userData.nombre,
        email: userData.email,
        hash: hashedPassword,
        rol: userData.rol,
      },
    })
    
    console.log(`✅ Usuario creado: ${userData.nombre} (${userData.email})`)
  }

  // Crear reglas por defecto
  console.log('⚙️ Creando reglas por defecto...')
  
  const rules = [
    {
      key: 'edadMin',
      value: 18,
      description: 'Edad mínima permitida para leads',
    },
    {
      key: 'edadMax',
      value: 75,
      description: 'Edad máxima permitida para leads',
    },
    {
      key: 'minIngreso',
      value: 200000,
      description: 'Ingreso mínimo requerido en pesos argentinos',
    },
    {
      key: 'zonasPermitidas',
      value: ['CABA', 'GBA', 'Córdoba'],
      description: 'Zonas geográficas permitidas',
    },
    {
      key: 'requiereBlanco',
      value: true,
      description: 'Indica si se requieren ingresos en blanco',
    },
  ]

  for (const rule of rules) {
    await prisma.rule.upsert({
      where: { key: rule.key },
      update: { value: JSON.stringify(rule.value) },
      create: {
        key: rule.key,
        value: JSON.stringify(rule.value),
      },
    })

    console.log(`✅ Regla creada: ${rule.key} = ${JSON.stringify(rule.value)}`)
  }

  // Creación de leads de ejemplo eliminada - Los leads ahora se crean desde Manychat
  // Los leads se sincronizan automáticamente desde Manychat al CRM

  console.log('🎉 Seed completado exitosamente!')
  console.log('')
  console.log('👤 Usuarios creados:')
  console.log('  - admin@phorencial.com / admin123 (ADMIN)')
  console.log('  - ludmila@phorencial.com / ludmila123 (ANALISTA)')
  console.log('  - facundo@phorencial.com / facundo123 (ANALISTA)')
  console.log('  - vendedor@phorencial.com / vendedor123 (VENDEDOR)')
  console.log('')
  console.log('⚙️ Reglas configuradas:')
  console.log('  - Edad: 18-75 años')
  console.log('  - Ingresos mínimos: $200,000')
  console.log('  - Zonas: CABA, GBA, Córdoba')
  console.log('  - Requiere ingresos en blanco: Sí')
  console.log('')
  console.log('📋 Leads: Se crearán automáticamente desde Manychat')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
