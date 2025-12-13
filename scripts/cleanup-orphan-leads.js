/**
 * Script para limpiar leads huérfanos
 * Elimina o limpia leads cuyo subscriber ya no existe en ManyChat
 * 
 * Opciones:
 * 1. Limpiar manychatId (recomendado) - Elimina la referencia a ManyChat pero mantiene el lead
 * 2. Marcar como inactivo - Agrega un campo o tag indicando que está huérfano
 * 3. Eliminar completamente - Elimina el lead de la base de datos (¡CUIDADO!)
 * 
 * Uso: node scripts/cleanup-orphan-leads.js [opcion]
 * Opciones: clean (limpiar manychatId), mark (marcar), delete (eliminar)
 * Por defecto: clean
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Obtener opción de línea de comandos
const option = process.argv[2] || 'clean'
const validOptions = ['clean', 'mark', 'delete']

if (!validOptions.includes(option)) {
  console.error(`❌ Opción inválida: ${option}`)
  console.error(`Opciones válidas: ${validOptions.join(', ')}`)
  process.exit(1)
}

/**
 * Obtener subscriber desde Manychat API
 */
async function getSubscriberFromManychat(manychatId) {
  try {
    const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY
    
    if (!MANYCHAT_API_KEY) {
      return null
    }

    const response = await fetch(`https://api.manychat.com/fb/subscriber/getInfo?subscriber_id=${manychatId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MANYCHAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.message?.includes('does not exist') || errorData.details?.messages?.some(m => m.message?.includes('does not exist'))) {
          return { notFound: true, error: errorText }
        }
      } catch {
        // Si no se puede parsear, continuar
      }
      return { error: errorText, status: response.status }
    }

    const data = await response.json()
    
    if (data.status === 'success' && data.data) {
      return data.data
    }

    return null
  } catch (error) {
    return { error: error.message }
  }
}

/**
 * Limpiar manychatId de un lead
 */
async function cleanManychatId(leadId) {
  try {
    const { error } = await supabase
      .from('Lead')
      .update({ 
        manychatId: null,
        updatedAt: new Date().toISOString()
      })
      .eq('id', leadId)

    if (error) {
      console.error(`  ❌ Error limpiando manychatId: ${error.message}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    return false
  }
}

/**
 * Marcar lead como huérfano (agregar nota o tag)
 */
async function markAsOrphan(leadId, lead) {
  try {
    // Intentar agregar una nota o actualizar estado
    // Primero intentamos actualizar el campo 'estado' si existe
    const { error } = await supabase
      .from('Lead')
      .update({ 
        estado: 'HUERFANO',
        updatedAt: new Date().toISOString()
      })
      .eq('id', leadId)

    if (error) {
      // Si no existe el campo estado o falla, solo loguear
      console.warn(`  ⚠️  No se pudo marcar como huérfano (puede que el campo 'estado' no exista): ${error.message}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    return false
  }
}

/**
 * Eliminar lead completamente
 */
async function deleteLead(leadId) {
  try {
    const { error } = await supabase
      .from('Lead')
      .delete()
      .eq('id', leadId)

    if (error) {
      console.error(`  ❌ Error eliminando lead: ${error.message}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    return false
  }
}

/**
 * Confirmar acción
 */
function confirmAction(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'si' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

/**
 * Función principal
 */
async function main() {
  console.log('🧹 Limpiando leads huérfanos...\n')
  console.log(`📋 Modo seleccionado: ${option}`)
  console.log('   - clean: Limpiar manychatId (recomendado)')
  console.log('   - mark: Marcar como huérfano')
  console.log('   - delete: Eliminar completamente\n')

  // Confirmar acción si es delete (o usar --yes para saltar confirmación)
  const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y')
  if (option === 'delete' && !skipConfirmation) {
    const confirmed = await confirmAction('⚠️  ADVERTENCIA: Esta acción eliminará permanentemente los leads. ¿Estás seguro? (s/n): ')
    if (!confirmed) {
      console.log('❌ Operación cancelada')
      process.exit(0)
    }
  } else if (option === 'delete' && skipConfirmation) {
    console.log('⚠️  ADVERTENCIA: Eliminando leads permanentemente (modo automático)\n')
  }

  try {
    // Obtener todos los leads con manychatId
    let allLeads = []
    let page = 0
    const pageSize = 100
    
    while (true) {
      const { data: leads, error: leadsError } = await supabase
        .from('Lead')
        .select('id, nombre, telefono, manychatId, origen')
        .not('manychatId', 'is', null)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (leadsError) {
        throw new Error(`Error obteniendo leads: ${leadsError.message}`)
      }

      if (!leads || leads.length === 0) {
        break
      }

      allLeads = allLeads.concat(leads)
      
      if (leads.length < pageSize) {
        break
      }
      
      page++
    }

    console.log(`📊 Total de leads con manychatId: ${allLeads.length}\n`)
    console.log('🔍 Verificando cuáles son huérfanos...\n')

    const orphanLeads = []

    // Identificar leads huérfanos
    for (let i = 0; i < allLeads.length; i++) {
      const lead = allLeads[i]
      
      if (i % 50 === 0) {
        console.log(`   Verificando... ${i + 1}/${allLeads.length}`)
      }

      const subscriber = await getSubscriberFromManychat(lead.manychatId)
      
      if (subscriber?.notFound || (subscriber && !subscriber.id && subscriber.error)) {
        orphanLeads.push(lead)
      }

      // Pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    console.log(`\n📋 Leads huérfanos encontrados: ${orphanLeads.length}\n`)

    if (orphanLeads.length === 0) {
      console.log('✅ No hay leads huérfanos para limpiar')
      return
    }

    // Mostrar resumen
    console.log('Leads que serán procesados:')
    orphanLeads.slice(0, 10).forEach((lead, index) => {
      console.log(`  ${index + 1}. ${lead.nombre || 'Sin nombre'} (ID: ${lead.id})`)
    })
    if (orphanLeads.length > 10) {
      console.log(`  ... y ${orphanLeads.length - 10} más`)
    }

    // Confirmar antes de procesar (o usar --yes para saltar confirmación)
    const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('-y')
    if (!skipConfirmation) {
      const confirmed = await confirmAction(`\n¿Proceder con la limpieza de ${orphanLeads.length} leads? (s/n): `)
      if (!confirmed) {
        console.log('❌ Operación cancelada')
        process.exit(0)
      }
    } else {
      console.log(`\n✅ Procediendo automáticamente con la limpieza de ${orphanLeads.length} leads...\n`)
    }

    console.log('\n🔄 Procesando leads huérfanos...\n')

    let processed = 0
    let errors = 0

    // Procesar cada lead huérfano
    for (let i = 0; i < orphanLeads.length; i++) {
      const lead = orphanLeads[i]
      
      console.log(`[${i + 1}/${orphanLeads.length}] ${lead.nombre || 'Sin nombre'} (ID: ${lead.id})`)

      let success = false

      switch (option) {
        case 'clean':
          success = await cleanManychatId(lead.id)
          if (success) {
            console.log(`  ✅ manychatId limpiado`)
          }
          break

        case 'mark':
          success = await markAsOrphan(lead.id, lead)
          if (success) {
            console.log(`  ✅ Marcado como huérfano`)
          }
          break

        case 'delete':
          success = await deleteLead(lead.id)
          if (success) {
            console.log(`  ✅ Lead eliminado`)
          }
          break
      }

      if (success) {
        processed++
      } else {
        errors++
      }

      // Pausa pequeña entre operaciones
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n📈 Resumen:')
    console.log(`  ✅ Procesados: ${processed}`)
    console.log(`  ❌ Errores: ${errors}`)
    console.log(`  📊 Total: ${orphanLeads.length}`)

  } catch (error) {
    console.error('❌ Error en limpieza:', error.message)
    process.exit(1)
  }
}

// Ejecutar
main()
  .then(() => {
    console.log('\n✅ Limpieza completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })
