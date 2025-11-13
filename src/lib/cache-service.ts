/**
 * Servicio de cache inteligente para el CRM Phorencial
 * Implementa estrategias de cache con invalidación automática
 */

import { logger } from './logger'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
}

interface CacheOptions {
  ttl?: number // Time to live en segundos
  tags?: string[] // Tags para invalidación selectiva
  compress?: boolean // Comprimir datos grandes
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private tagIndex = new Map<string, Set<string>>() // tag -> set of keys
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  }

  /**
   * Obtener valor del cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    // Verificar si ha expirado
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.delete(key)
      this.stats.misses++
      this.stats.evictions++
      return null
    }
    
    this.stats.hits++
    return entry.data
  }

  /**
   * Establecer valor en el cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || 300 // 5 minutos por defecto
    const tags = options.tags || []
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    }
    
    // Eliminar entrada anterior si existe
    this.delete(key)
    
    // Agregar nueva entrada
    this.cache.set(key, entry)
    
    // Actualizar índice de tags
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(key)
    })
    
    this.stats.sets++
    
    // Limpiar cache si es muy grande
    this.cleanup()
  }

  /**
   * Eliminar entrada del cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Remover de índice de tags
    entry.tags.forEach(tag => {
      const tagSet = this.tagIndex.get(tag)
      if (tagSet) {
        tagSet.delete(key)
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    })
    
    this.cache.delete(key)
    this.stats.deletes++
    return true
  }

  /**
   * Invalidar cache por tags
   */
  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag)
    if (!keys) return 0
    
    let count = 0
    keys.forEach(key => {
      if (this.delete(key)) {
        count++
      }
    })
    
    return count
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanup(): void {
    const now = Date.now()
    const maxSize = 1000 // Máximo 1000 entradas
    
    // Eliminar entradas expiradas
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.delete(key)
        this.stats.evictions++
      }
    }

    // Si aún es muy grande, eliminar las más antiguas
    if (this.cache.size > maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)

      const toDelete = sortedEntries.slice(0, this.cache.size - maxSize)
      toDelete.forEach(([key]) => {
        this.delete(key)
        this.stats.evictions++
      })
    }
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      tagCount: this.tagIndex.size
    }
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear()
    this.tagIndex.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    }
  }
}

/**
 * Servicio de cache principal
 */
class CacheService {
  private cache = new InMemoryCache()
  
  /**
   * Wrapper para obtener o establecer datos con cache
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Intentar obtener del cache
    const cached = this.cache.get<T>(key)
    if (cached !== null) {
      logger.debug('Cache hit', { key, tags: options.tags })
      return cached
    }
    
    // No está en cache, obtener datos
    logger.debug('Cache miss, fetching data', { key, tags: options.tags })
    
    try {
      const data = await fetcher()
      
      // Guardar en cache
      this.cache.set(key, data, options)
      
      logger.debug('Data cached successfully', { 
        key, 
        tags: options.tags,
        ttl: options.ttl 
      })
      
      return data
    } catch (error: any) {
      logger.error('Error fetching data for cache', {
        key,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Invalidar cache por patrón de clave
   */
  invalidatePattern(pattern: string): number {
    let count = 0
    const regex = new RegExp(pattern.replace('*', '.*'))
    
    const keys = Array.from(this.cache['cache'].keys())
    for (const key of keys) {
      if (regex.test(key)) {
        if (this.cache.delete(key)) {
          count++
        }
      }
    }
    
    logger.info('Cache invalidated by pattern', { pattern, count })
    return count
  }

  /**
   * Invalidar cache por tags
   */
  invalidateByTag(tag: string): number {
    const count = this.cache.invalidateByTag(tag)
    logger.info('Cache invalidated by tag', { tag, count })
    return count
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    return this.cache.getStats()
  }

  /**
   * Limpiar cache manualmente
   */
  cleanup(): void {
    this.cache.cleanup()
  }

  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear()
    logger.info('Cache cleared completely')
  }
}

// Instancia singleton del servicio de cache
export const cacheService = new CacheService()

/**
 * Estrategias de cache específicas para el CRM
 */
export const CacheStrategies = {
  // Cache para leads con filtros
  leads: {
    key: (filters: any) => `leads:${JSON.stringify(filters)}`,
    ttl: 300, // 5 minutos
    tags: ['leads', 'data']
  },

  // Cache para conteo de leads
  leadsCount: {
    key: (filters: any) => `leads:count:${JSON.stringify(filters)}`,
    ttl: 600, // 10 minutos
    tags: ['leads', 'count', 'stats']
  },

  // Cache para detalles de lead individual
  leadDetail: {
    key: (id: string) => `lead:${id}`,
    ttl: 900, // 15 minutos
    tags: ['leads', 'detail']
  },

  // Cache para estadísticas del pipeline
  pipelineStats: {
    key: (dateFrom: string) => `pipeline:stats:${dateFrom}`,
    ttl: 1800, // 30 minutos
    tags: ['pipeline', 'stats']
  },

  // Cache para datos del dashboard
  dashboardMetrics: {
    key: (period: string) => `dashboard:metrics:${period}`,
    ttl: 600, // 10 minutos
    tags: ['dashboard', 'metrics', 'stats']
  }
}

/**
 * Invalidar cache cuando se modifican datos
 */
export const CacheInvalidation = {
  // Invalidar cuando se crea/actualiza/elimina un lead
  onLeadChange: () => {
    cacheService.invalidateByTag('leads')
    cacheService.invalidateByTag('stats')
    cacheService.invalidateByTag('dashboard')
  },

  // Invalidar cuando se actualiza el pipeline
  onPipelineChange: () => {
    cacheService.invalidateByTag('pipeline')
    cacheService.invalidateByTag('stats')
    cacheService.invalidateByTag('dashboard')
  },

  // Invalidar cache específico de un lead
  onSpecificLeadChange: (leadId: string) => {
    cacheService.invalidatePattern(`lead:${leadId}*`)
    cacheService.invalidateByTag('leads')
    cacheService.invalidateByTag('stats')
  }
}

// Limpiar cache automáticamente cada 5 minutos
setInterval(() => {
  cacheService.cleanup()
}, 5 * 60 * 1000)
