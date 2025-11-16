/**
 * Script de limpieza de leads antiguos - MIGRACIÓN DE UNA SOLA VEZ
 * 
 * ⚠️ ADVERTENCIA: Este script está diseñado como una migración de una sola vez
 * para limpiar datos antiguos antes de la implementación de Manychat.
 * 
 * NO debe ejecutarse regularmente. Si necesitas limpiar datos periódicamente,
 * crea un nuevo script con lógica dinámica basada en parámetros o fechas relativas.
 * 
 * Este script elimina todos los leads creados antes de una fecha específica
 * y todos los datos asociados (eventos, conversaciones, mensajes, logs de sincronización)
 * 
 * Fecha de corte original: 11 de noviembre de 2025, 00:00:00 UTC
 * 
 * Para ejecutar con una fecha diferente, modifica la constante CUTOFF_DATE antes de ejecutar.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fecha de corte: 11 de noviembre de 2025, 00:00:00 UTC
// ⚠️ Esta fecha está hardcodeada para esta migración específica
// Si necesitas una fecha diferente, modifica esta constante antes de ejecutar
const CUTOFF_DATE = new Date('2025-11-11T00:00:00.000Z')

async function cleanupOldLeads() {
  console.log('🧹 Iniciando limpieza de leads antiguos...')
  console.log(`📅 Fecha de corte: ${CUTOFF_DATE.toISOString()}`)
  console.log('')

  try {
    // 1. Encontrar todos los leads antiguos
    console.log('🔍 Buscando leads anteriores a la fecha de corte...')
    const oldLeads = await prisma.lead.findMany({
      where: {
        createdAt: {
          lt: CUTOFF_DATE
        }
      },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        createdAt: true
      }
    })

    const leadCount = oldLeads.length
    console.log(`📊 Encontrados ${leadCount} leads a eliminar`)
    console.log('')

    if (leadCount === 0) {
      console.log('✅ No hay leads antiguos para eliminar')
      return
    }

    // Mostrar algunos ejemplos
    if (leadCount > 0) {
      console.log('📋 Ejemplos de leads a eliminar:')
      oldLeads.slice(0, 5).forEach(lead => {
        console.log(`   - ${lead.nombre} (${lead.telefono}) - ${lead.createdAt.toISOString()}`)
      })
      if (leadCount > 5) {
        console.log(`   ... y ${leadCount - 5} más`)
      }
      console.log('')
    }

    // 2. Eliminar logs de sincronización asociados
    console.log('🗑️  Eliminando logs de sincronización...')
    const syncLogsDeleted = await prisma.manychatSync.deleteMany({
      where: {
        leadId: {
          in: oldLeads.map(l => l.id)
        }
      }
    })
    console.log(`   ✅ ${syncLogsDeleted.count} logs de sincronización eliminados`)

    // 3. Eliminar mensajes de conversaciones asociadas
    console.log('🗑️  Eliminando mensajes de conversaciones...')
    const conversations = await prisma.conversation.findMany({
      where: {
        leadId: {
          in: oldLeads.map(l => l.id)
        }
      },
      select: {
        id: true
      }
    })

    let messagesDeletedCount = 0
    if (conversations.length > 0) {
      const messagesDeleted = await prisma.message.deleteMany({
        where: {
          conversationId: {
            in: conversations.map(c => c.id)
          }
        }
      })
      messagesDeletedCount = messagesDeleted.count
      console.log(`   ✅ ${messagesDeleted.count} mensajes eliminados`)
    } else {
      console.log('   ℹ️  No hay mensajes para eliminar')
    }

    // 4. Eliminar conversaciones asociadas
    console.log('🗑️  Eliminando conversaciones...')
    const conversationsDeleted = await prisma.conversation.deleteMany({
      where: {
        leadId: {
          in: oldLeads.map(l => l.id)
        }
      }
    })
    console.log(`   ✅ ${conversationsDeleted.count} conversaciones eliminadas`)

    // 5. Eliminar eventos asociados
    console.log('🗑️  Eliminando eventos...')
    const eventsDeleted = await prisma.event.deleteMany({
      where: {
        leadId: {
          in: oldLeads.map(l => l.id)
        }
      }
    })
    console.log(`   ✅ ${eventsDeleted.count} eventos eliminados`)

    // 6. Finalmente, eliminar los leads
    console.log('🗑️  Eliminando leads...')
    const leadsDeleted = await prisma.lead.deleteMany({
      where: {
        id: {
          in: oldLeads.map(l => l.id)
        }
      }
    })
    console.log(`   ✅ ${leadsDeleted.count} leads eliminados`)
    console.log('')

    // Resumen
    console.log('📊 Resumen de limpieza:')
    console.log(`   - Leads eliminados: ${leadsDeleted.count}`)
    console.log(`   - Eventos eliminados: ${eventsDeleted.count}`)
    console.log(`   - Conversaciones eliminadas: ${conversationsDeleted.count}`)
    console.log(`   - Mensajes eliminados: ${messagesDeletedCount}`)
    console.log(`   - Logs de sincronización eliminados: ${syncLogsDeleted.count}`)
    console.log('')
    console.log('✅ Limpieza completada exitosamente')

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
if (require.main === module) {
  cleanupOldLeads()
    .then(() => {
      console.log('')
      console.log('🎉 Script finalizado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('')
      console.error('💥 Error fatal:', error)
      process.exit(1)
    })
}

export { cleanupOldLeads }

