import Redis from 'ioredis'
import { logger } from './logger'

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
}

// Create Redis instance
let redis: Redis | null = null

function createRedisInstance(): Redis {
  if (!redis) {
    redis = new Redis(redisConfig)
    
    redis.on('connect', () => {
      logger.info('✅ Redis connected successfully')
    })
    
    redis.on('error', (error) => {
      logger.error('❌ Redis connection error:', error)
    })
    
    redis.on('close', () => {
      console.log('🔌 Redis connection closed')
    })
    
    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...')
    })
  }
  
  return redis
}

// Get Redis instance
export function getRedis(): Redis {
  return createRedisInstance()
}

// Cache utilities
export class CacheManager {
  private redis: Redis
  private defaultTTL: number = 3600 // 1 hour in seconds
  
  constructor() {
    this.redis = getRedis()
  }
  
  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value)
      const expiration = ttl || this.defaultTTL
      
      await this.redis.setex(key, expiration, serializedValue)
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      // Don't throw error to prevent cache failures from breaking the app
    }
  }
  
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      
      if (!value) {
        return null
      }
      
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }
  
  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
    }
  }
  
  /**
   * Delete multiple keys from cache
   */
  async delMany(keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache delete many error:`, error)
    }
  }
  
  /**
   * Delete keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error)
    }
  }

  /**
   * Get keys by pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern)
    } catch (error) {
      console.error(`Cache get keys by pattern error for ${pattern}:`, error)
      return []
    }
  }
  
  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error)
      return false
    }
  }
  
  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl)
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error)
    }
  }
  
  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key)
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error)
      return -1
    }
  }
  
  /**
   * Increment a numeric value
   */
  async incr(key: string, amount: number = 1): Promise<number> {
    try {
      if (amount === 1) {
        return await this.redis.incr(key)
      } else {
        return await this.redis.incrby(key, amount)
      }
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error)
      return 0
    }
  }
  
  /**
   * Get or set pattern - if key doesn't exist, execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }
      
      // If not in cache, fetch and store
      const result = await fetchFunction()
      await this.set(key, result, ttl)
      
      return result
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error)
      // If cache fails, still try to execute the function
      try {
        return await fetchFunction()
      } catch (fetchError) {
        console.error(`Fetch function error for key ${key}:`, fetchError)
        return null
      }
    }
  }
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.redis.flushdb()
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }
  
  /**
   * Get cache info
   */
  async info(): Promise<any> {
    try {
      const info = await this.redis.info('memory')
      const keyspace = await this.redis.info('keyspace')
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.redis.status === 'ready'
      }
    } catch (error) {
      console.error('Cache info error:', error)
      return null
    }
  }
}

// Create singleton instance
export const cache = new CacheManager()

// Cache key generators
export const CacheKeys = {
  // Dashboard metrics
  dashboardMetrics: (dateFrom?: string, dateTo?: string) => 
    `dashboard:metrics:${dateFrom || 'all'}:${dateTo || 'all'}`,
  dashboardActivity: (limit: number = 10) => 
    `dashboard:activity:${limit}`,
  dashboardPerformance: (period: string) => 
    `dashboard:performance:${period}`,
  
  // Leads
  leadsList: (page: number = 1, limit: number = 10, filters?: string) => 
    `leads:list:${page}:${limit}:${filters || 'none'}`,
  leadById: (id: string) => 
    `lead:${id}`,
  leadEvents: (id: string) => 
    `lead:${id}:events`,
  
  // Pipeline
  pipelineStages: () => 
    'pipeline:stages',
  pipelineMetrics: () => 
    'pipeline:metrics',
  pipelineConversion: () => 
    'pipeline:conversion',
  pipelineHistory: (leadId: string) => 
    `pipeline:history:${leadId}`,
  
  // Admin
  adminUsers: () => 
    'admin:users',
  adminStats: () => 
    'admin:stats',
  adminLogs: (page: number = 1) => 
    `admin:logs:${page}`,
  
  // User sessions
  userSession: (userId: string) => 
    `session:${userId}`,
  
  // Rate limiting
  rateLimit: (identifier: string, window: string) => 
    `rate_limit:${identifier}:${window}`,
}

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400, // 24 hours
  WEEK: 604800,    // 7 days
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (redis) {
    await redis.quit()
  }
})

process.on('SIGINT', async () => {
  if (redis) {
    await redis.quit()
  }
})