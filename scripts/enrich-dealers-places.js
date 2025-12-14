/**
 * Script para enriquecer datos de concesionarias con información de Google Places API
 * Obtiene ratings, fotos, horarios y otra información adicional
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

// Extraer dealers que ya tienen placeId
const dealersWithPlaceId = []
const dealerRegex = /\{\s*name:\s*'([^']+)',[^}]+placeId:\s*'([^']+)'[^}]*\}/g
let match
while ((match = dealerRegex.exec(dealersDataContent)) !== null) {
  dealersWithPlaceId.push({
    name: match[1],
    placeId: match[2]
  })
}

console.log(`📍 Encontradas ${dealersWithPlaceId.length} concesionarias con Place ID\n`)

/**
 * Obtiene detalles de un lugar usando Places API
 */
async function getPlaceDetails(placeId) {
  const fields = [
    'place_id',
    'name',
    'rating',
    'user_ratings_total',
    'photos',
    'opening_hours',
    'website',
    'formatted_address',
    'formatted_phone_number'
  ].join(',')

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.result) {
      const result = data.result
      
      // Obtener URL de la primera foto
      let photoUrl = null
      if (result.photos && result.photos.length > 0) {
        const photoReference = result.photos[0].photo_reference
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`
      }

      return {
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        photoUrl,
        openingHours: result.opening_hours ? {
          openNow: result.opening_hours.open_now,
          weekdayText: result.opening_hours.weekday_text
        } : null,
        website: result.website
      }
    } else {
      console.warn(`⚠️  Error obteniendo detalles para Place ID: ${placeId} - ${data.status}`)
      return null
    }
  } catch (error) {
    console.error(`❌ Error obteniendo detalles para ${placeId}:`, error.message)
    return null
  }
}

/**
 * Actualiza el archivo dealers-data.ts con información de Places API
 */
function updateDealersDataWithPlaces(dealersWithPlaces) {
  let updatedContent = dealersDataContent

  dealersWithPlaces.forEach(({ dealerName, placeId, placesData }) => {
    if (!placesData) return

    // Buscar el dealer y agregar campos de Places API
    const dealerPattern = new RegExp(
      `(\\{\\s*name:\\s*'${dealerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',[^}]+placeId:\\s*'${placeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^}]*)(\\})`,
      'g'
    )

    updatedContent = updatedContent.replace(dealerPattern, (match, before, closing) => {
      const placesFields = []
      
      if (placesData.rating !== undefined) {
        placesFields.push(`\n  rating: ${placesData.rating},`)
      }
      if (placesData.photoUrl) {
        placesFields.push(`\n  photoUrl: '${placesData.photoUrl}',`)
      }
      if (placesData.openingHours) {
        const openNow = placesData.openingHours.openNow !== undefined 
          ? placesData.openingHours.openNow 
          : 'undefined'
        const weekdayText = placesData.openingHours.weekdayText 
          ? JSON.stringify(placesData.openingHours.weekdayText)
          : 'undefined'
        placesFields.push(`\n  openingHours: {\n    openNow: ${openNow},\n    weekdayText: ${weekdayText}\n  },`)
      }
      if (placesData.website) {
        placesFields.push(`\n  website: '${placesData.website}',`)
      }

      if (placesFields.length > 0) {
        return `${before}${placesFields.join('')}\n${closing}`
      }
      return match
    })
  })

  // Escribir el archivo actualizado
  fs.writeFileSync(dealersDataPath, updatedContent, 'utf-8')
  console.log('\n✅ Archivo dealers-data.ts actualizado con información de Places API')
}

async function main() {
  console.log('🚀 Iniciando enriquecimiento con Places API...\n')

  const dealersWithPlaces = []
  let successCount = 0
  let failCount = 0

  // Obtener detalles de Places API para cada dealer
  for (let i = 0; i < dealersWithPlaceId.length; i++) {
    const dealer = dealersWithPlaceId[i]
    console.log(`[${i + 1}/${dealersWithPlaceId.length}] Obteniendo detalles: ${dealer.name}`)
    console.log(`   Place ID: ${dealer.placeId}`)

    const placesData = await getPlaceDetails(dealer.placeId)
    
    if (placesData) {
      dealersWithPlaces.push({ dealerName: dealer.name, placeId: dealer.placeId, placesData })
      successCount++
      if (placesData.rating) {
        console.log(`   ⭐ Rating: ${placesData.rating} (${placesData.userRatingsTotal || 0} reviews)`)
      }
      if (placesData.photoUrl) {
        console.log(`   📷 Foto disponible`)
      }
      if (placesData.openingHours) {
        console.log(`   🕐 Horarios: ${placesData.openingHours.openNow ? 'Abierto ahora' : 'Cerrado'}`)
      }
      if (placesData.website) {
        console.log(`   🌐 Website: ${placesData.website}`)
      }
    } else {
      dealersWithPlaces.push({ dealerName: dealer.name, placeId: dealer.placeId, placesData: null })
      failCount++
      console.log(`   ❌ No se pudieron obtener detalles`)
    }

    console.log('')

    // Pausa entre requests para evitar rate limiting
    if (i < dealersWithPlaceId.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  console.log('\n📊 Resumen:')
  console.log(`   ✅ Exitosas: ${successCount}`)
  console.log(`   ❌ Fallidas: ${failCount}`)
  console.log(`   📍 Total: ${dealersWithPlaceId.length}\n`)

  if (successCount > 0) {
    // Actualizar el archivo
    updateDealersDataWithPlaces(dealersWithPlaces)
    console.log('\n✨ Proceso completado!')
  } else {
    console.log('\n⚠️  No se enriqueció ninguna concesionaria. Verifica tu API key y Place IDs.')
  }
}

main().catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
