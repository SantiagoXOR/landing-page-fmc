/**
 * Script para geocodificar direcciones de concesionarias usando Google Geocoding API
 * Actualiza el archivo dealers-data.ts con las coordenadas obtenidas
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ GOOGLE_MAPS_API_KEY no está configurada en .env.local')
  process.exit(1)
}

// Leer el archivo dealers-data.ts
const dealersDataPath = path.join(__dirname, '../src/lib/dealers-data.ts')
const dealersDataContent = fs.readFileSync(dealersDataPath, 'utf-8')

// Extraer el array DEALERS usando regex (greedy para capturar todo)
const dealersMatch = dealersDataContent.match(/export const DEALERS: Dealer\[\] = \[([\s\S]+)\]/)
if (!dealersMatch) {
  console.error('❌ No se pudo encontrar el array DEALERS en dealers-data.ts')
  process.exit(1)
}

// Parsear los dealers - cada dealer está en una línea
const dealersText = dealersMatch[1]
const dealers = []

// Buscar cada objeto dealer en líneas separadas
// Patrón: { name: '...', address: '...', phone: '...', brands: [...], zone: '...' }
const dealerRegex = /\{\s*name:\s*'([^']+)',\s*address:\s*'([^']+)',\s*phone:\s*'([^']+)',\s*brands:\s*\[([^\]]+)\],\s*zone:\s*'([^']+)'([^}]*)\}/g

let match
while ((match = dealerRegex.exec(dealersText)) !== null) {
  const brands = match[4].split(',').map(b => b.trim().replace(/['"]/g, ''))
  const hasCoords = match[0].includes('latitude:') && match[0].includes('longitude:')
  
  dealers.push({
    name: match[1],
    address: match[2],
    phone: match[3],
    brands,
    zone: match[5],
    originalIndex: dealers.length,
    hasCoords,
    fullMatch: match[0]
  })
}

console.log(`📍 Encontradas ${dealers.length} concesionarias para geocodificar\n`)

/**
 * Geocodifica una dirección usando Google Geocoding API
 */
async function geocodeAddress(address) {
  const encodedAddress = encodeURIComponent(`${address}, Formosa, Argentina`)
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}&region=ar`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        placeId: result.place_id,
        formattedAddress: result.formatted_address
      }
    } else {
      console.warn(`⚠️  No se encontraron resultados para: ${address}`)
      return null
    }
  } catch (error) {
    console.error(`❌ Error geocodificando ${address}:`, error.message)
    return null
  }
}

/**
 * Actualiza el archivo dealers-data.ts con las coordenadas
 */
function updateDealersData(dealersWithCoords) {
  let updatedContent = dealersDataContent

  dealersWithCoords.forEach(({ dealer, coords }) => {
    if (!coords) return // No actualizar si no hay coordenadas

    // Escapar caracteres especiales para el regex
    const escapedName = dealer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedAddress = dealer.address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedPhone = dealer.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Buscar el dealer completo en el contenido (formato de una línea)
    // Patrón que busca desde name hasta zone, permitiendo campos opcionales en el medio
    const dealerPattern = new RegExp(
      `(\\{\\s*name:\\s*'${escapedName}',\\s*address:\\s*'${escapedAddress}',\\s*phone:\\s*'${escapedPhone}',\\s*brands:\\s*\\[[^\\]]+\\],\\s*zone:\\s*'${dealer.zone}')([^}]*)\\}`,
      'g'
    )

    updatedContent = updatedContent.replace(dealerPattern, (match, before, existingFields) => {
      // Verificar si ya tiene coordenadas para no duplicar
      if (existingFields.includes('latitude:') || existingFields.includes('longitude:')) {
        return match // Ya tiene coordenadas, no modificar
      }
      
      // Agregar coordenadas antes del cierre del objeto
      const coordsStr = `,\n  latitude: ${coords.latitude},\n  longitude: ${coords.longitude}${coords.placeId ? `,\n  placeId: '${coords.placeId}'` : ''}`
      return `${before}${coordsStr}\n}`
    })
  })

  // Escribir el archivo actualizado
  fs.writeFileSync(dealersDataPath, updatedContent, 'utf-8')
  console.log('\n✅ Archivo dealers-data.ts actualizado con coordenadas')
}

async function main() {
  console.log('🚀 Iniciando geocodificación de direcciones...\n')

  const dealersWithCoords = []
  let successCount = 0
  let failCount = 0

  // Geocodificar cada dealer (solo los que no tienen coordenadas)
  const dealersToGeocode = dealers.filter(d => !d.hasCoords)
  console.log(`📍 ${dealersToGeocode.length} concesionarias necesitan geocodificación (${dealers.length - dealersToGeocode.length} ya tienen coordenadas)\n`)

  for (let i = 0; i < dealersToGeocode.length; i++) {
    const dealer = dealersToGeocode[i]
    console.log(`[${i + 1}/${dealersToGeocode.length}] Geocodificando: ${dealer.name}`)
    console.log(`   Dirección: ${dealer.address}`)

    const coords = await geocodeAddress(dealer.address)
    
    if (coords) {
      dealersWithCoords.push({ dealer, coords })
      successCount++
      console.log(`   ✅ Coordenadas: ${coords.latitude}, ${coords.longitude}`)
      if (coords.placeId) {
        console.log(`   📍 Place ID: ${coords.placeId}`)
      }
    } else {
      dealersWithCoords.push({ dealer, coords: null })
      failCount++
      console.log(`   ❌ No se pudo geocodificar`)
    }

    console.log('')

    // Pausa entre requests para evitar rate limiting
    if (i < dealersToGeocode.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log('\n📊 Resumen:')
  console.log(`   ✅ Exitosas: ${successCount}`)
  console.log(`   ❌ Fallidas: ${failCount}`)
  console.log(`   📍 Total procesadas: ${dealersToGeocode.length}`)
  console.log(`   ⏭️  Omitidas (ya tienen coordenadas): ${dealers.length - dealersToGeocode.length}\n`)

  if (successCount > 0) {
    // Actualizar el archivo
    updateDealersData(dealersWithCoords)
    console.log('\n✨ Proceso completado!')
  } else {
    console.log('\n⚠️  No se geocodificó ninguna dirección. Verifica tu API key.')
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
