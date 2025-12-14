import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rateLimit, GoogleMapsRateLimits } from '@/lib/rate-limit-api'

export const dynamic = 'force-dynamic'

interface GeocodeRequest {
  addresses?: string[]
  dealerIds?: string[]
}

interface GeocodeResult {
  address: string
  latitude: number | null
  longitude: number | null
  placeId?: string
  formattedAddress?: string
  error?: string
}

/**
 * Geocodifica una dirección usando Google Geocoding API
 */
async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    logger.error('Google Maps API key no configurada')
    return {
      address,
      latitude: null,
      longitude: null,
      error: 'API key no configurada'
    }
  }

  try {
    const encodedAddress = encodeURIComponent(`${address}, Formosa, Argentina`)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&region=ar`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      const location = result.geometry.location

      return {
        address,
        latitude: location.lat,
        longitude: location.lng,
        placeId: result.place_id,
        formattedAddress: result.formatted_address
      }
    } else if (data.status === 'ZERO_RESULTS') {
      logger.warn('No se encontraron resultados para la dirección', { address })
      return {
        address,
        latitude: null,
        longitude: null,
        error: 'No se encontraron resultados'
      }
    } else {
      logger.error('Error en Geocoding API', { status: data.status, address })
      return {
        address,
        latitude: null,
        longitude: null,
        error: `Error: ${data.status}`
      }
    }
  } catch (error: any) {
    logger.error('Error al geocodificar dirección', { error: error.message, address })
    return {
      address,
      latitude: null,
      longitude: null,
      error: error.message
    }
  }
}

/**
 * @swagger
 * /api/dealers/geocode:
 *   post:
 *     summary: Geocodifica direcciones de concesionarias
 *     description: Convierte direcciones en coordenadas usando Google Geocoding API
 *     tags:
 *       - Dealers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addresses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array de direcciones a geocodificar
 *               dealerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array de IDs de concesionarias (opcional)
 *     responses:
 *       200:
 *         description: Geocodificación exitosa
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, GoogleMapsRateLimits.geocode)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Demasiadas solicitudes. Intenta nuevamente en ${rateLimitResult.retryAfter} segundos.`,
          retryAfter: rateLimitResult.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      )
    }

    const body: GeocodeRequest = await request.json()

    if (!body.addresses || !Array.isArray(body.addresses) || body.addresses.length === 0) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          message: 'Se requiere un array de direcciones'
        },
        { status: 400 }
      )
    }

    // Limitar a 10 direcciones por request para evitar rate limiting
    const addressesToGeocode = body.addresses.slice(0, 10)
    
    logger.info('Iniciando geocodificación', { count: addressesToGeocode.length })

    // Geocodificar todas las direcciones en paralelo (con límite de concurrencia)
    const results: GeocodeResult[] = []
    
    // Procesar en lotes de 5 para evitar rate limiting
    const batchSize = 5
    for (let i = 0; i < addressesToGeocode.length; i += batchSize) {
      const batch = addressesToGeocode.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(address => geocodeAddress(address))
      )
      results.push(...batchResults)
      
      // Pequeña pausa entre lotes para evitar rate limiting
      if (i + batchSize < addressesToGeocode.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    const successful = results.filter(r => r.latitude !== null && r.longitude !== null).length
    const failed = results.filter(r => r.latitude === null).length

    logger.info('Geocodificación completada', {
      total: results.length,
      successful,
      failed
    })

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    }, {
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString()
      }
    })
  } catch (error: any) {
    logger.error('Error en POST /api/dealers/geocode', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'Ocurrió un error al geocodificar las direcciones'
      },
      { status: 500 }
    )
  }
}
