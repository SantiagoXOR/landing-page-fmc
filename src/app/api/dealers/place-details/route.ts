import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rateLimit, GoogleMapsRateLimits } from '@/lib/rate-limit-api'

export const dynamic = 'force-dynamic'

interface PlaceDetailsResult {
  placeId: string
  rating?: number
  userRatingsTotal?: number
  photoUrl?: string
  openingHours?: {
    openNow?: boolean
    weekdayText?: string[]
  }
  website?: string
  formattedAddress?: string
  formattedPhoneNumber?: string
  error?: string
}

/**
 * Obtiene detalles de un lugar usando Google Places API
 */
async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    logger.error('Google Maps API key no configurada')
    return {
      placeId,
      error: 'API key no configurada'
    }
  }

  try {
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

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.result) {
      const result = data.result
      
      // Obtener URL de la primera foto
      let photoUrl: string | undefined
      if (result.photos && result.photos.length > 0) {
        const photoReference = result.photos[0].photo_reference
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`
      }

      return {
        placeId,
        rating: result.rating,
        userRatingsTotal: result.user_ratings_total,
        photoUrl,
        openingHours: result.opening_hours ? {
          openNow: result.opening_hours.open_now,
          weekdayText: result.opening_hours.weekday_text
        } : undefined,
        website: result.website,
        formattedAddress: result.formatted_address,
        formattedPhoneNumber: result.formatted_phone_number
      }
    } else {
      logger.error('Error en Places API', { status: data.status, placeId })
      return {
        placeId,
        error: `Error: ${data.status}`
      }
    }
  } catch (error: any) {
    logger.error('Error al obtener detalles del lugar', { error: error.message, placeId })
    return {
      placeId,
      error: error.message
    }
  }
}

/**
 * @swagger
 * /api/dealers/place-details:
 *   get:
 *     summary: Obtiene detalles de un lugar usando Places API
 *     description: Obtiene información enriquecida de una concesionaria usando Google Places API
 *     tags:
 *       - Dealers
 *     parameters:
 *       - in: query
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Place ID de Google Places
 *     responses:
 *       200:
 *         description: Detalles del lugar obtenidos exitosamente
 *       400:
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting (más restrictivo porque Place Details es costoso)
    const rateLimitResult = await rateLimit(request, GoogleMapsRateLimits.placeDetails)
    
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
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('placeId')

    if (!placeId) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          message: 'Se requiere el parámetro placeId'
        },
        { status: 400 }
      )
    }

    logger.info('Obteniendo detalles de lugar', { placeId })

    const result = await getPlaceDetails(placeId)

    if (result.error) {
      return NextResponse.json(
        {
          error: 'Error al obtener detalles',
          message: result.error
        },
        { status: 500 }
      )
    }

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString()
      }
    })
  } catch (error: any) {
    logger.error('Error en GET /api/dealers/place-details', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'Ocurrió un error al obtener los detalles del lugar'
      },
      { status: 500 }
    )
  }
}
