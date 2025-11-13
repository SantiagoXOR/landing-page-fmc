import { TRPCError } from '@trpc/server'
import { cache, CacheKeys, CacheTTL } from '@/lib/redis'
import { initTRPC } from '@trpc/server'
import crypto from 'crypto'

const t = initTRPC.create()

// Cache configuration interface
interface CacheConfig {
  ttl?: number
  keyGenerator?: (input: any, ctx: any) => string
  skipCache?: (input: any, ctx: any) => boolean
  tags?: string[]
}

// Default cache configuration
const defaultCacheConfig: CacheConfig = {
  ttl: CacheTTL.MEDIUM,
  skipCache: () => false,
}

/**
 * Generate a cache key from procedure name and input
 */
function generateCacheKey(procedureName: string, input: any, userId?: string): string {
  const inputHash = crypto
    .createHash('md5')
    .update(JSON.stringify(input || {}))
    .digest('hex')
  
  const userPart = userId ? `:user:${userId}` : ''
  return `trpc:${procedureName}:${inputHash}${userPart}`
}

/**
 * Cache middleware for tRPC procedures
 */
export function createCacheMiddleware(config: CacheConfig = {}) {
  const finalConfig = { ...defaultCacheConfig, ...config }
  
  return t.middleware(async ({ ctx, next, path, input }: { ctx: any, next: any, path: string, input: any }) => {
    // Skip cache if configured to do so
    if (finalConfig.skipCache?.(input, ctx)) {
      return next()
    }
    
    // Generate cache key
    const cacheKey = finalConfig.keyGenerator
      ? finalConfig.keyGenerator(input, ctx)
      : generateCacheKey(path, input, ctx.session?.user?.id)
    
    try {
      // Try to get from cache first
      const cached = await cache.get(cacheKey)
      if (cached !== null) {
        console.log(`🎯 Cache HIT for ${path}:`, cacheKey)
        return {
          ok: true,
          data: cached,
          ctx,
        }
      }
      
      console.log(`🔍 Cache MISS for ${path}:`, cacheKey)
      
      // Execute the procedure
      const result = await next()
      
      // Cache the result if successful
      if (result.ok) {
        await cache.set(cacheKey, result.data, finalConfig.ttl)
        console.log(`💾 Cached result for ${path}:`, cacheKey)
      }
      
      return result
    } catch (error) {
      console.error(`❌ Cache middleware error for ${path}:`, error)
      // If cache fails, continue without caching
      return next()
    }
  })
}

/**
 * Cache invalidation middleware for mutations
 */
export function createCacheInvalidationMiddleware(patterns: string[] | ((input: any, ctx: any) => string[])) {
  return t.middleware(async ({ ctx, next, input }: { ctx: any, next: any, input: any }) => {
    // Execute the mutation first
    const result = await next()
    
    // If successful, invalidate cache patterns
    if (result.ok) {
      try {
        const invalidationPatterns = typeof patterns === 'function'
          ? patterns(input, ctx)
          : patterns
        
        for (const pattern of invalidationPatterns) {
          await cache.delPattern(pattern)
          console.log(`🗑️ Invalidated cache pattern:`, pattern)
        }
      } catch (error) {
        console.error('❌ Cache invalidation error:', error)
        // Don't fail the mutation if cache invalidation fails
      }
    }
    
    return result
  })
}

/**
 * Predefined cache configurations for common use cases
 */
export const CacheConfigs = {
  // Dashboard metrics - cache for 30 minutes
  dashboardMetrics: {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (input: any, ctx: any) => 
      CacheKeys.dashboardMetrics(input?.dateFrom, input?.dateTo),
  },
  
  // Dashboard activity - cache for 5 minutes (more real-time)
  dashboardActivity: {
    ttl: CacheTTL.SHORT,
    keyGenerator: (input: any) => 
      CacheKeys.dashboardActivity(input?.limit),
  },
  
  // Dashboard performance - cache for 1 hour
  dashboardPerformance: {
    ttl: CacheTTL.LONG,
    keyGenerator: (input: any) => 
      CacheKeys.dashboardPerformance(input?.period || 'month'),
  },
  
  // Leads list - cache for 10 minutes
  leadsList: {
    ttl: 600, // 10 minutes
    keyGenerator: (input: any) => 
      CacheKeys.leadsList(
        input?.page,
        input?.limit,
        JSON.stringify(input?.filters || {})
      ),
  },
  
  // Individual lead - cache for 15 minutes
  leadById: {
    ttl: 900, // 15 minutes
    keyGenerator: (input: any) => 
      CacheKeys.leadById(input.id),
  },
  
  // Lead events - cache for 5 minutes
  leadEvents: {
    ttl: CacheTTL.SHORT,
    keyGenerator: (input: any) => 
      CacheKeys.leadEvents(input.leadId),
  },
  
  // Pipeline stages - cache for 1 hour
  pipelineStages: {
    ttl: CacheTTL.LONG,
    keyGenerator: () => CacheKeys.pipelineStages(),
  },
  
  // Pipeline metrics - cache for 30 minutes
  pipelineMetrics: {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: () => CacheKeys.pipelineMetrics(),
  },
  
  // Pipeline conversion rates - cache for 1 hour
  pipelineConversion: {
    ttl: CacheTTL.LONG,
    keyGenerator: () => CacheKeys.pipelineConversion(),
  },
  
  // Admin users - cache for 30 minutes
  adminUsers: {
    ttl: CacheTTL.MEDIUM,
    keyGenerator: () => CacheKeys.adminUsers(),
  },
  
  // Admin stats - cache for 1 hour
  adminStats: {
    ttl: CacheTTL.LONG,
    keyGenerator: () => CacheKeys.adminStats(),
  },
}

/**
 * Cache invalidation patterns for mutations
 */
export const InvalidationPatterns = {
  // Lead mutations
  leadMutations: [
    'trpc:leads.*',
    'trpc:dashboard.*',
    'trpc:pipeline.*',
  ],
  
  // Pipeline mutations
  pipelineMutations: [
    'trpc:pipeline.*',
    'trpc:dashboard.*',
    'trpc:leads.*',
  ],
  
  // Dashboard mutations
  dashboardMutations: [
    'trpc:dashboard.*',
  ],
  
  // Admin mutations
  adminMutations: [
    'trpc:admin.*',
    'trpc:dashboard.*',
  ],
  
  // User-specific invalidation
  userSpecific: (userId: string) => [
    `trpc:*:user:${userId}`,
    'trpc:dashboard.*',
  ],
}

/**
 * Rate limiting middleware using Redis
 */
export function createRateLimitMiddleware({
  windowMs = 60000, // 1 minute
  maxRequests = 100,
  keyGenerator = (ctx: any) => ctx.session?.user?.id || ctx.ip || 'anonymous',
}: {
  windowMs?: number
  maxRequests?: number
  keyGenerator?: (ctx: any) => string
} = {}) {
  return t.middleware(async ({ ctx, next }: { ctx: any, next: any }) => {
    const identifier = keyGenerator(ctx)
    const window = Math.floor(Date.now() / windowMs)
    const key = CacheKeys.rateLimit(identifier, window.toString())
    
    try {
      const current = await cache.incr(key)
      
      // Set expiration on first request in window
      if (current === 1) {
        await cache.expire(key, Math.ceil(windowMs / 1000))
      }
      
      if (current > maxRequests) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs}ms.`,
        })
      }
      
      return next()
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error
      }
      
      console.error('Rate limiting error:', error)
      // If rate limiting fails, allow the request
      return next()
    }
  })
}

/**
 * Utility function to warm up cache
 */
export async function warmUpCache() {
  console.log('🔥 Warming up cache...')
  
  try {
    // You can add cache warming logic here
    // For example, pre-populate frequently accessed data
    
    console.log('✅ Cache warmed up successfully')
  } catch (error) {
    console.error('❌ Cache warm-up failed:', error)
  }
}

/**
 * Utility function to clear all cache
 */
export async function clearAllCache() {
  try {
    await cache.clear()
    console.log('🗑️ All cache cleared')
  } catch (error) {
    console.error('❌ Failed to clear cache:', error)
  }
}