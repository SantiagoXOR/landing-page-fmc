import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { cacheService, CacheStrategies } from '@/lib/cache-service'
import { ManychatService } from './manychat-service'

export interface TagLead {
  id: string
  nombre: string
  telefono: string
  email?: string | null
  tags?: string[]
}

export interface TagGroup {
  name: string
  count: number
  leads: TagLead[]
}

export interface TagsResponse {
  tags: TagGroup[]
  withoutTags: {
    count: number
    leads: TagLead[]
  }
  total: number
}

export interface TagStats {
  name: string
  count: number
}

/**
 * Servicio para gestionar tags de leads
 */
export class TagsService {
  /**
   * Parsear tags desde el campo JSON string
   */
  private parseTags(tagsString: string | null | undefined): string[] {
    if (!tagsString) return []
    
    try {
      if (typeof tagsString === 'string') {
        const parsed = JSON.parse(tagsString)
        return Array.isArray(parsed) ? parsed : []
      }
      return Array.isArray(tagsString) ? tagsString : []
    } catch (error) {
      logger.warn('Error parseando tags', { tagsString, error })
      return []
    }
  }

  /**
   * Obtener todos los leads agrupados por tags
   */
  async getLeadsByTags(options: {
    tag?: string
    page?: number
    limit?: number
    fechaDesde?: string
    fechaHasta?: string
  } = {}): Promise<TagsResponse> {
    const { tag, page = 1, limit = 50, fechaDesde, fechaHasta } = options
    
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      // Usar cache para consultas frecuentes (sin incluir fecha en cache si no hay filtro)
      const cacheKey = `tags:leads:${JSON.stringify({ tag, page, limit, fechaDesde, fechaHasta })}`
      
      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          return await this.fetchLeadsByTags(tag, page, limit, fechaDesde, fechaHasta)
        },
        {
          ttl: 60, // 1 minuto (tags pueden cambiar frecuentemente en Manychat)
          tags: ['tags', 'leads']
        }
      )
    } catch (error: any) {
      logger.error('Error obteniendo leads por tags', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener leads desde la base de datos
   */
  private async fetchLeadsByTags(
    filterTag?: string,
    page: number = 1,
    limit: number = 50,
    fechaDesde?: string,
    fechaHasta?: string
  ): Promise<TagsResponse> {
    if (!supabase.client) {
      throw new Error('Base de datos no disponible')
    }

    // Construir query con filtros de fecha
    let query = supabase.client
      .from('Lead')
      .select('id, nombre, telefono, email, tags, createdAt')
      .order('createdAt', { ascending: false })

    // Aplicar filtros de fecha si existen
    if (fechaDesde) {
      query = query.gte('createdAt', fechaDesde)
    }
    if (fechaHasta) {
      // Agregar un día completo para incluir el día hasta
      const fechaHastaCompleta = new Date(fechaHasta)
      fechaHastaCompleta.setHours(23, 59, 59, 999)
      query = query.lte('createdAt', fechaHastaCompleta.toISOString())
    }

    // Obtener todos los leads con tags
    const { data: leads, error } = await query

    if (error) {
      throw error
    }

    if (!leads || leads.length === 0) {
      return {
        tags: [],
        withoutTags: { count: 0, leads: [] },
        total: 0
      }
    }

    // Agrupar leads por tags
    const tagMap = new Map<string, TagLead[]>()
    const leadsWithoutTags: TagLead[] = []

    for (const lead of leads) {
      const tags = this.parseTags(lead.tags)
      const leadData: TagLead = {
        id: lead.id,
        nombre: lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        tags: tags.length > 0 ? tags : undefined
      }

      if (tags.length === 0) {
        leadsWithoutTags.push(leadData)
      } else {
        for (const tagName of tags) {
          if (!tagMap.has(tagName)) {
            tagMap.set(tagName, [])
          }
          tagMap.get(tagName)!.push(leadData)
        }
      }
    }

    // Obtener todos los tags de Manychat
    let manychatTags: string[] = []
    try {
      const manychatTagsData = await ManychatService.getTags()
      manychatTags = manychatTagsData.map(tag => tag.name)
      logger.info('Tags obtenidos de Manychat', { count: manychatTags.length })
    } catch (error: any) {
      logger.warn('Error obteniendo tags de Manychat, usando solo tags de leads', { error: error.message })
      // Si falla, continuar solo con los tags de los leads
    }

    // Combinar tags de Manychat con tags de leads (sin duplicados)
    const allTagNames = new Set<string>()
    manychatTags.forEach(tag => allTagNames.add(tag))
    Array.from(tagMap.keys()).forEach(tag => allTagNames.add(tag))

    // Convertir map a array de TagGroup, incluyendo todos los tags de Manychat
    const tagGroups: TagGroup[] = Array.from(allTagNames)
      .map((tagName) => {
        const leadsForTag = tagMap.get(tagName) || []
        
        // Si hay un filtro de tag específico, solo mostrar ese tag con paginación
        if (filterTag && filterTag !== tagName) {
          return {
            name: tagName,
            count: leadsForTag.length,
            leads: []
          }
        }
        
        // Aplicar paginación solo si no hay filtro o si es el tag filtrado
        return {
          name: tagName,
          count: leadsForTag.length,
          leads: leadsForTag.slice((page - 1) * limit, page * limit)
        }
      })
      .filter(group => !filterTag || group.name === filterTag)
      .sort((a, b) => {
        // Ordenar primero por cantidad descendente, luego alfabéticamente
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return a.name.localeCompare(b.name)
      })

    // Aplicar paginación a leads sin tags solo si no hay filtro de tag
    const withoutTagsLeads = filterTag 
      ? [] 
      : leadsWithoutTags.slice((page - 1) * limit, page * limit)

    return {
      tags: tagGroups,
      withoutTags: {
        count: leadsWithoutTags.length,
        leads: withoutTagsLeads
      },
      total: leads.length
    }
  }

  /**
   * Obtener estadísticas de tags (conteo por tag)
   */
  async getTagStats(): Promise<TagStats[]> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      // Usar cache
      const cacheKey = 'tags:stats'
      
      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          return await this.fetchTagStats()
        },
        {
          ttl: 60, // 1 minuto (tags pueden cambiar frecuentemente en Manychat)
          tags: ['tags', 'stats']
        }
      )
    } catch (error: any) {
      logger.error('Error obteniendo estadísticas de tags', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener estadísticas desde la base de datos
   */
  private async fetchTagStats(): Promise<TagStats[]> {
    if (!supabase.client) {
      throw new Error('Base de datos no disponible')
    }

    // Obtener todos los tags de Manychat
    let manychatTags: string[] = []
    try {
      const manychatTagsData = await ManychatService.getTags()
      manychatTags = manychatTagsData.map(tag => tag.name)
      logger.info('Tags obtenidos de Manychat para estadísticas', { count: manychatTags.length })
    } catch (error: any) {
      logger.warn('Error obteniendo tags de Manychat para estadísticas', { error: error.message })
    }

    const { data: leads, error } = await supabase.client
      .from('Lead')
      .select('tags')

    if (error) {
      throw error
    }

    // Contar tags en leads
    const tagCounts = new Map<string, number>()

    // Inicializar todos los tags de Manychat con count 0
    manychatTags.forEach(tag => {
      tagCounts.set(tag, 0)
    })

    // Contar tags en leads
    if (leads && leads.length > 0) {
      for (const lead of leads) {
        const tags = this.parseTags(lead.tags)
        for (const tagName of tags) {
          tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1)
        }
      }
    }

    // Convertir a array y ordenar por cantidad descendente, luego alfabéticamente
    return Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count
        }
        return a.name.localeCompare(b.name)
      })
  }

  /**
   * Obtener leads sin tags
   */
  async getLeadsWithoutTags(options: {
    page?: number
    limit?: number
  } = {}): Promise<{ leads: TagLead[], total: number }> {
    const { page = 1, limit = 50 } = options

    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      const { data: leads, error } = await supabase.client
        .from('Lead')
        .select('id, nombre, telefono, email, tags')
        .or('tags.is.null,tags.eq.')
        .order('createdAt', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (error) {
        throw error
      }

      // También necesitamos el total
      const { count } = await supabase.client
        .from('Lead')
        .select('*', { count: 'exact', head: true })
        .or('tags.is.null,tags.eq.')

      const leadsData: TagLead[] = (leads || []).map(lead => ({
        id: lead.id,
        nombre: lead.nombre,
        telefono: lead.telefono,
        email: lead.email,
        tags: undefined
      }))

      return {
        leads: leadsData,
        total: count || 0
      }
    } catch (error: any) {
      logger.error('Error obteniendo leads sin tags', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener leads de un tag específico
   */
  async getLeadsByTag(
    tagName: string,
    options: {
      page?: number
      limit?: number
    } = {}
  ): Promise<{ leads: TagLead[], total: number }> {
    const { page = 1, limit = 50 } = options

    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      // Obtener todos los leads y filtrar por tag
      const { data: leads, error } = await supabase.client
        .from('Lead')
        .select('id, nombre, telefono, email, tags')
        .order('createdAt', { ascending: false })

      if (error) {
        throw error
      }

      // Filtrar leads que tienen el tag
      const filteredLeads = (leads || [])
        .filter(lead => {
          const tags = this.parseTags(lead.tags)
          return tags.includes(tagName)
        })
        .slice((page - 1) * limit, page * limit)
        .map(lead => ({
          id: lead.id,
          nombre: lead.nombre,
          telefono: lead.telefono,
          email: lead.email,
          tags: this.parseTags(lead.tags)
        }))

      // Contar total
      const total = (leads || []).filter(lead => {
        const tags = this.parseTags(lead.tags)
        return tags.includes(tagName)
      }).length

      return {
        leads: filteredLeads,
        total
      }
    } catch (error: any) {
      logger.error('Error obteniendo leads por tag', { tagName, error: error.message })
      throw error
    }
  }
}

// Exportar instancia singleton
export const tagsService = new TagsService()

