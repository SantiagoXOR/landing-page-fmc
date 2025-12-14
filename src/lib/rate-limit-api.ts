import { NextRequest } from 'next/server'
import { getRedis } from '@/lib/redis'
import { logger } from '@/lib/logger'

interface RateLimitOptions {
  windowMs: number // Ventana de tiempo en milisegundos
  maxRequests: number // Máximo de requests en la ventana
  keyPrefix: string // Prefijo para la key en Redis
  identifier?: string // Identificador personalizado (opcional)
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  retryAfter?: number
}

// Cache en memoria como fallback si Redis no está disponible
const memoryCache = new Map<string, { count: number; reset: number }>()

/**
 * Rate limiting para API routes de Next.js
 * Usa Redis si está disponible, sino usa cache en memoria
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { windowMs, maxRequests, keyPrefix, identifier } = options

  // Determinar identificador (IP del cliente)
  const clientId = identifier || 
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const key = `${keyPrefix}:${clientId}`
  const now = Date.now()
  const window = Math.floor(now / windowMs)
  const windowKey = `${key}:${window}`

  try {
    // Intentar usar Redis
    const redis = getRedis()
    
    if (redis && redis.status === 'ready') {
      // Usar Redis para rate limiting
      const pipeline = redis.pipeline()
      pipeline.incr(windowKey)
      pipeline.expire(windowKey, Math.ceil(windowMs / 1000))
      
      const results = await pipeline.exec()
      
      if (results && results.length >= 2) {
        const count = results[0][1] as number
        const remaining = Math.max(0, maxRequests - count)
        const reset = (window + 1) * windowMs

        if (count > maxRequests) {
          const retryAfter = Math.ceil((reset - now) / 1000)
          logger.warn('Rate limit exceeded', { key, count, maxRequests, clientId })
          return {
            success: false,
            remaining: 0,
            reset,
            retryAfter
          }
        }

        return {
          success: true,
          remaining,
          reset
        }
      }
    }
  } catch (error) {
    logger.warn('Redis rate limit failed, using memory cache', { error })
  }

  // Fallback: usar cache en memoria
  const cacheKey = windowKey
  const cached = memoryCache.get(cacheKey)

  if (cached && cached.reset > now) {
    cached.count++
    const remaining = Math.max(0, maxRequests - cached.count)

    if (cached.count > maxRequests) {
      const retryAfter = Math.ceil((cached.reset - now) / 1000)
      return {
        success: false,
        remaining: 0,
        reset: cached.reset,
        retryAfter
      }
    }

    return {
      success: true,
      remaining,
      reset: cached.reset
    }
  } else {
    // Nueva ventana de tiempo
    const reset = (window + 1) * windowMs
    memoryCache.set(cacheKey, { count: 1, reset })
    
    // Limpiar entradas expiradas periódicamente
    if (memoryCache.size > 1000) {
      const now = Date.now()
      for (const key of Array.from(memoryCache.keys())) {
        const value = memoryCache.get(key)
        if (value && value.reset <= now) {
          memoryCache.delete(key)
        }
      }
    }

    return {
      success: true,
      remaining: maxRequests - 1,
      reset
    }
  }
}

/**
 * Configuraciones predefinidas de rate limiting para Google Maps APIs
 */
export const GoogleMapsRateLimits = {
  // Geocoding API: más restrictivo porque es costoso
  geocode: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10, // 10 requests por minuto
    keyPrefix: 'rate_limit:geocode'
  },
  // Place Details: muy restrictivo porque es el más costoso
  placeDetails: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 5, // 5 requests por minuto
    keyPrefix: 'rate_limit:place_details'
  }
} as const
