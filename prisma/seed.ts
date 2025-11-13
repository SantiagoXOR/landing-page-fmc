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

  // Crear algunos leads de ejemplo
  console.log('📋 Creando leads de ejemplo...')
  
  const sampleLeads = [
    {
      nombre: 'Juan Pérez',
      telefono: '+5491123456789',
      email: 'juan.perez@email.com',
      dni: '12345678',
      ingresos: 250000,
      zona: 'CABA',
      producto: 'Préstamo Personal',
      monto: 500000,
      origen: 'whatsapp',
      estado: 'NUEVO',
    },
    {
      nombre: 'María González',
      telefono: '+5491198765432',
      email: 'maria.gonzalez@email.com',
      dni: '87654321',
      ingresos: 180000,
      zona: 'GBA',
      producto: 'Tarjeta de Crédito',
      monto: 100000,
      origen: 'instagram',
      estado: 'EN_REVISION',
    },
    {
      nombre: 'Carlos Rodriguez',
      telefono: '+5491155555555',
      email: 'carlos.rodriguez@email.com',
      dni: '11111111',
      ingresos: 350000,
      zona: 'Córdoba',
      producto: 'Préstamo Hipotecario',
      monto: 2000000,
      origen: 'web',
      estado: 'PREAPROBADO',
    },
    {
      nombre: 'Ana López',
      telefono: '+5491144444444',
      email: 'ana.lopez@email.com',
      dni: '22222222',
      ingresos: 150000,
      zona: 'Mendoza',
      producto: 'Préstamo Personal',
      monto: 300000,
      origen: 'facebook',
      estado: 'RECHAZADO',
    },
    {
      nombre: 'Lead WhatsApp +5491133333333',
      telefono: '+5491133333333',
      origen: 'whatsapp',
      estado: 'NUEVO',
    },
  ]

  for (const leadData of sampleLeads) {
    const lead = await prisma.lead.create({
      data: leadData as any,
    })
    
    // Crear evento inicial
    await prisma.event.create({
      data: {
        leadId: lead.id,
        tipo: 'lead_created',
        payload: JSON.stringify({ source: 'seed', leadData }),
      },
    })
    
    console.log(`✅ Lead creado: ${leadData.nombre}`)
  }

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
  console.log('📋 Leads de ejemplo: 5 leads creados con diferentes estados')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
