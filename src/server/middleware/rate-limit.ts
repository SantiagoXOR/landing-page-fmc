import { TRPCError } from '@trpc/server'
import { cache, getRedis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { initTRPC } from '@trpc/server'

const t = initTRPC.create()
const redis = getRedis()

// Configuraciones de rate limiting
export const RateLimitConfigs = {
  // Límites por usuario autenticado
  authenticated: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100, // 100 requests por minuto
    keyPrefix: 'rate_limit:auth:',
  },
  // Límites para operaciones de escritura
  mutations: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 20, // 20 mutaciones por minuto
    keyPrefix: 'rate_limit:mutation:',
  },
  // Límites para operaciones admin
  admin: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 50, // 50 requests por minuto
    keyPrefix: 'rate_limit:admin:',
  },
  // Límites por IP (para requests no autenticados)
  byIP: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 30, // 30 requests por minuto
    keyPrefix: 'rate_limit:ip:',
  },
  // Límites estrictos para operaciones sensibles
  strict: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 5, // 5 requests por 5 minutos
    keyPrefix: 'rate_limit:strict:',
  },
} as const

type RateLimitConfig = {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

// Interfaz para información de rate limit
interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// Clase para manejar rate limiting con Redis
class RedisRateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async checkLimit(identifier: string): Promise<RateLimitInfo> {
    const key = `${this.config.keyPrefix}${identifier}`
    const window = Math.floor(Date.now() / this.config.windowMs)
    const windowKey = `${key}:${window}`

    try {
      // Usar pipeline para operaciones atómicas
      const pipeline = redis.pipeline()
      pipeline.incr(windowKey)
      pipeline.expire(windowKey, Math.ceil(this.config.windowMs / 1000))
      
      const results = await pipeline.exec()
      
      if (!results || results.length < 2) {
        throw new Error('Redis pipeline failed')
      }

      const count = results[0][1] as number
      const remaining = Math.max(0, this.config.maxRequests - count)
      const reset = (window + 1) * this.config.windowMs

      const rateLimitInfo: RateLimitInfo = {
        limit: this.config.maxRequests,
        remaining,
        reset,
      }

      // Si se excede el límite, calcular tiempo de espera
      if (count > this.config.maxRequests) {
        rateLimitInfo.retryAfter = Math.ceil((reset - Date.now()) / 1000)
      }

      return rateLimitInfo
    } catch (error) {
      logger.error('Rate limit check failed:', error)
      // En caso de error de Redis, permitir la request (fail open)
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        reset: Date.now() + this.config.windowMs,
      }
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}${identifier}`
    const pattern = `${key}:*`
    
    try {
      const keys = await cache.getKeysByPattern(pattern)
      if (keys.length > 0) {
        await cache.delMany(keys)
      }
    } catch (error) {
      logger.error('Rate limit reset failed:', error)
    }
  }
}

// Función para crear middleware de rate limiting
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new RedisRateLimiter(config)

  return t.middleware(async ({ ctx, next, path, type }: { ctx: any, next: any, path: string, type: string }) => {
    // Determinar identificador para rate limiting
    let identifier: string
    
    if (ctx.session?.user?.id) {
      // Usuario autenticado: usar ID de usuario
      identifier = ctx.session.user.id
    } else {
      // Usuario no autenticado: usar IP
      identifier = ctx.req?.ip || ctx.req?.socket?.remoteAddress || 'unknown'
    }

    // Verificar límite
    const rateLimitInfo = await limiter.checkLimit(identifier)

    // Agregar headers de rate limit a la respuesta
    if (ctx.res) {
      ctx.res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString())
      ctx.res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString())
      ctx.res.setHeader('X-RateLimit-Reset', rateLimitInfo.reset.toString())
    }

    // Si se excede el límite, lanzar error
    if (rateLimitInfo.retryAfter) {
      if (ctx.res) {
        ctx.res.setHeader('Retry-After', rateLimitInfo.retryAfter.toString())
      }
      
      logger.warn(`Rate limit exceeded for ${identifier} on ${path}`, {
        identifier,
        path,
        type,
        limit: rateLimitInfo.limit,
        retryAfter: rateLimitInfo.retryAfter,
      })

      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${rateLimitInfo.retryAfter} seconds.`,
      })
    }

    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Rate limit check passed for ${identifier}`, {
        identifier,
        path,
        remaining: rateLimitInfo.remaining,
        limit: rateLimitInfo.limit,
      })
    }

    return next()
  })
}

// Middlewares predefinidos
export const rateLimitMiddleware = {
  authenticated: createRateLimitMiddleware(RateLimitConfigs.authenticated),
  mutations: createRateLimitMiddleware(RateLimitConfigs.mutations),
  admin: createRateLimitMiddleware(RateLimitConfigs.admin),
  byIP: createRateLimitMiddleware(RateLimitConfigs.byIP),
  strict: createRateLimitMiddleware(RateLimitConfigs.strict),
}

// Función para obtener estadísticas de rate limiting
export async function getRateLimitStats(identifier: string, configType: keyof typeof RateLimitConfigs) {
  const config = RateLimitConfigs[configType]
  const limiter = new RedisRateLimiter(config)
  
  try {
    return await limiter.checkLimit(identifier)
  } catch (error) {
    logger.error('Failed to get rate limit stats:', error)
    return null
  }
}

// Función para resetear límites (útil para testing o admin)
export async function resetRateLimit(identifier: string, configType: keyof typeof RateLimitConfigs) {
  const config = RateLimitConfigs[configType]
  const limiter = new RedisRateLimiter(config)
  
  try {
    await limiter.resetLimit(identifier)
    return true
  } catch (error) {
    logger.error('Failed to reset rate limit:', error)
    return false
  }
}

// Función para limpiar límites expirados (tarea de mantenimiento)
export async function cleanupExpiredRateLimits() {
  try {
    const patterns = Object.values(RateLimitConfigs).map(config => `${config.keyPrefix}*`)
    
    for (const pattern of patterns) {
      const keys = await cache.getKeysByPattern(pattern)
      
      // Verificar TTL de cada clave y eliminar las que no tienen TTL o están expiradas
      for (const key of keys) {
        const ttl = await redis.ttl(key)
        if (ttl === -1 || ttl === -2) {
          await redis.del(key)
        }
      }
    }
    
    logger.info('Rate limit cleanup completed')
  } catch (error) {
    logger.error('Rate limit cleanup failed:', error)
  }
}

// Exportar tipos para uso externo
export type { RateLimitInfo, RateLimitConfig }