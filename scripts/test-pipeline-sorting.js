/**
 * Script para verificar el ordenamiento del pipeline
 * Ejecutar: node scripts/test-pipeline-sorting.js
 */

const fetch = require('node-fetch')

async function testPipelineSorting() {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  
  console.log('🔍 Verificando ordenamiento del pipeline...\n')
  
  try {
    // Obtener leads de la columna "cliente-nuevo"
    const response = await fetch(`${baseURL}/api/pipeline/stages/cliente-nuevo/leads`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.error('Respuesta:', text.substring(0, 500))
      return
    }
    
    const leads = await response.json()
    console.log(`✅ Obtenidos ${leads.length} leads de "cliente-nuevo"\n`)
    
    if (leads.length === 0) {
      console.log('⚠️  No hay leads en esta columna')
      return
    }
    
    // Mostrar los primeros 10 leads con su información de ordenamiento
    console.log('📊 Primeros 10 leads (orden actual):\n')
    leads.slice(0, 10).forEach((lead, index) => {
      const createdAt = lead.createdAt || 'MISSING'
      const priority = lead.priority || 'N/A'
      const isPriority24h = (priority === 'high' || priority === 'urgent') && 
                            createdAt !== 'MISSING' && 
                            new Date(createdAt) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      console.log(`${index + 1}. ${lead.nombre}`)
      console.log(`   - Priority: ${priority} ${isPriority24h ? '⭐ (24h)' : ''}`)
      console.log(`   - createdAt: ${createdAt}`)
      console.log(`   - stageEntryDate: ${lead.stageEntryDate || 'N/A'}`)
      console.log(`   - Ingresó: ${formatTimeAgo(createdAt)}`)
      console.log('')
    })
    
    // Verificar ordenamiento
    console.log('\n🔍 Verificando ordenamiento...\n')
    
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const priorityLeadsWith24h = []
    const otherLeads = []
    
    leads.forEach(lead => {
      const isPriority = lead.priority === 'high' || lead.priority === 'urgent'
      const createdAt = lead.createdAt ? new Date(lead.createdAt) : null
      
      if (isPriority && createdAt && createdAt >= twentyFourHoursAgo) {
        priorityLeadsWith24h.push(lead)
      } else {
        otherLeads.push(lead)
      }
    })
    
    console.log(`📈 Prioritarios con 24hs: ${priorityLeadsWith24h.length}`)
    console.log(`📈 Otros leads: ${otherLeads.length}\n`)
    
    // Verificar orden de prioritarios (debe ser ascendente)
    let priorityOrderValid = true
    for (let i = 0; i < priorityLeadsWith24h.length - 1; i++) {
      const current = new Date(priorityLeadsWith24h[i].createdAt).getTime()
      const next = new Date(priorityLeadsWith24h[i + 1].createdAt).getTime()
      if (current > next) {
        priorityOrderValid = false
        console.log(`❌ Prioritarios: orden incorrecto en posición ${i + 1}`)
        break
      }
    }
    if (priorityOrderValid && priorityLeadsWith24h.length > 0) {
      console.log('✅ Prioritarios con 24hs: orden ascendente correcto')
    }
    
    // Verificar orden de otros (debe ser descendente)
    let otherOrderValid = true
    for (let i = 0; i < otherLeads.length - 1; i++) {
      const current = new Date(otherLeads[i].createdAt || otherLeads[i].stageEntryDate).getTime()
      const next = new Date(otherLeads[i + 1].createdAt || otherLeads[i + 1].stageEntryDate).getTime()
      if (current < next) {
        otherOrderValid = false
        console.log(`❌ Otros leads: orden incorrecto en posición ${i + 1}`)
        break
      }
    }
    if (otherOrderValid && otherLeads.length > 0) {
      console.log('✅ Otros leads: orden descendente correcto')
    }
    
    // Verificar que prioritarios estén antes que otros
    if (priorityLeadsWith24h.length > 0 && otherLeads.length > 0) {
      const firstOtherIndex = leads.findIndex(l => l.id === otherLeads[0].id)
      const lastPriorityIndex = leads.findIndex(l => l.id === priorityLeadsWith24h[priorityLeadsWith24h.length - 1].id)
      
      if (firstOtherIndex < lastPriorityIndex) {
        console.log('❌ Los leads prioritarios no están todos antes que los otros')
      } else {
        console.log('✅ Prioritarios están antes que otros leads')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

function formatTimeAgo(dateString) {
  if (!dateString || dateString === 'MISSING') return 'N/A'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  } else if (diffDays === 1) {
    return 'Ayer'
  } else {
    return `Hace ${diffDays} días`
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPipelineSorting().catch(console.error)
}

module.exports = { testPipelineSorting }
