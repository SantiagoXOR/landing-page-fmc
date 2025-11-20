import { logger } from '@/lib/logger'
import { cacheService, CacheStrategies, CacheInvalidation } from '@/lib/cache-service'
import { analyzeQueryPerformance } from '@/lib/database-optimization'

interface Lead {
  id?: string
  nombre: string
  telefono: string
  email?: string | null
  dni?: string | null
  cuil?: string | null
  ingresos?: number | null
  zona?: string | null
  producto?: string | null
  monto?: number | null
  origen?: string | null
  utmSource?: string | null
  estado?: string
  agencia?: string | null
  banco?: string | null
  trabajo_actual?: string | null
  notas?: string | null
  createdAt?: string
  updatedAt?: string
}

export class SupabaseLeadService {
  private supabaseUrl: string
  private serviceRoleKey: string

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    logger.info('SupabaseLeadService constructor', {
      hasUrl: !!this.supabaseUrl,
      hasKey: !!this.serviceRoleKey,
      urlPrefix: this.supabaseUrl ? this.supabaseUrl.substring(0, 30) + '...' : 'MISSING',
      keyPrefix: this.serviceRoleKey ? this.serviceRoleKey.substring(0, 20) + '...' : 'MISSING'
    })

    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new Error('Supabase credentials not configured')
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.supabaseUrl}/rest/v1/${endpoint}`

    logger.info('Making Supabase request', {
      url,
      method: options.method || 'GET',
      hasServiceKey: !!this.serviceRoleKey,
      serviceKeyPrefix: this.serviceRoleKey ? this.serviceRoleKey.substring(0, 20) + '...' : 'MISSING'
    })

    const response = await fetch(url, {
      ...options,
      headers: {
        'apikey': this.serviceRoleKey,
        'Authorization': `Bearer ${this.serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    logger.info('Supabase response received', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Supabase API error', {
        endpoint,
        status: response.status,
        error: errorText
      })
      throw new Error(`Supabase API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  async createLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    try {
      // Limpiar datos nulos/undefined
      const cleanData = Object.fromEntries(
        Object.entries(leadData).filter(([_, value]) => value !== null && value !== undefined && value !== '')
      )

      // Agregar timestamps
      const dataWithTimestamps = {
        ...cleanData,
        estado: cleanData.estado || 'NUEVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      logger.info('Creating lead with data', { data: dataWithTimestamps })

      const response = await this.makeRequest('Lead', {
        method: 'POST',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dataWithTimestamps)
      })

      const result = await response.json()
      const lead = Array.isArray(result) ? result[0] : result

      logger.info('Lead created successfully', { leadId: lead.id })

      // Invalidar cache relacionado con leads
      CacheInvalidation.onLeadChange()

      return lead

    } catch (error: any) {
      logger.error('Error creating lead', { error: error.message })
      throw error
    }
  }

  async getLeads(filters: {
    estado?: string
    origen?: string
    zona?: string
    search?: string
    ingresoMin?: number
    ingresoMax?: number
    fechaDesde?: string
    fechaHasta?: string
    sortBy?: string
    sortOrder?: string
    limit?: number
    offset?: number
    includePipeline?: boolean
  } = {}): Promise<{ leads: Lead[], total: number }> {
    const startTime = Date.now()

    try {
      logger.info('SupabaseLeadService.getLeads called - OPTIMIZED VERSION', { filters })

      // Usar cache para consultas frecuentes
      const cacheKey = CacheStrategies.leads.key(filters)

      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          return await this.fetchLeadsFromDatabase(filters)
        },
        {
          ttl: CacheStrategies.leads.ttl,
          tags: CacheStrategies.leads.tags
        }
      )

    } catch (error: any) {
      logger.error('Error in optimized getLeads', {
        error: error.message,
        stack: error.stack,
        filters,
        queryTime: Date.now() - startTime
      })

      // Fallback a método simple si falla la query optimizada
      logger.warn('Falling back to simple query due to error')
      return this.getLeadsSimple(filters)
    }
  }

  /**
   * Método privado para obtener leads de la base de datos
   */
  private async fetchLeadsFromDatabase(filters: any): Promise<{ leads: Lead[], total: number }> {
    const startTime = Date.now()

    try {
      // Construir query optimizada usando filtros de Supabase
      const queryParams = new URLSearchParams()

      // Seleccionar campos necesarios
      queryParams.append('select', '*')

      // Aplicar filtros directamente en la query
      if (filters.estado) {
        queryParams.append('estado', `eq.${filters.estado}`)
      }

      if (filters.origen) {
        queryParams.append('origen', `eq.${filters.origen}`)
      }

      if (filters.zona) {
        queryParams.append('zona', `eq.${filters.zona}`)
      }

      // Filtros de rango de ingresos
      if (filters.ingresoMin !== undefined) {
        queryParams.append('ingresos', `gte.${filters.ingresoMin}`)
      }

      if (filters.ingresoMax !== undefined) {
        queryParams.append('ingresos', `lte.${filters.ingresoMax}`)
      }

      // Filtros de fecha
      if (filters.fechaDesde) {
        queryParams.append('createdAt', `gte.${filters.fechaDesde}T00:00:00`)
      }

      if (filters.fechaHasta) {
        queryParams.append('createdAt', `lte.${filters.fechaHasta}T23:59:59`)
      }

      // Búsqueda de texto (usando or para múltiples campos)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        queryParams.append('or', `nombre.ilike.*${searchTerm}*,telefono.ilike.*${searchTerm}*,email.ilike.*${searchTerm}*,dni.ilike.*${searchTerm}*`)
      }

      // Ordenamiento
      const sortBy = filters.sortBy || 'createdAt'
      const sortOrder = filters.sortOrder || 'desc'
      queryParams.append('order', `${sortBy}.${sortOrder}`)

      // Paginación
      const limit = Math.min(filters.limit || 10, 100) // Máximo 100 por página
      const offset = filters.offset || 0

      queryParams.append('limit', limit.toString())
      queryParams.append('offset', offset.toString())

      // Construir URL final
      const endpoint = `Lead?${queryParams.toString()}`

      logger.info('Executing optimized Supabase query', {
        endpoint,
        filters: {
          estado: filters.estado,
          origen: filters.origen,
          zona: filters.zona,
          hasSearch: !!filters.search,
          ingresoRange: [filters.ingresoMin, filters.ingresoMax],
          dateRange: [filters.fechaDesde, filters.fechaHasta],
          sortBy,
          sortOrder,
          limit,
          offset
        }
      })

      // Ejecutar query principal
      const leadsResponse = await this.makeRequest(endpoint, {
        headers: {
          'Prefer': 'return=representation'
        }
      })

      if (!leadsResponse.ok) {
        throw new Error(`Supabase query failed: ${leadsResponse.status} ${leadsResponse.statusText}`)
      }

      const leads = await leadsResponse.json()

      // Obtener count total (sin paginación) para la misma query
      const countParams = new URLSearchParams()

      // Aplicar los mismos filtros para el count
      if (filters.estado) {
        countParams.append('estado', `eq.${filters.estado}`)
      }
      if (filters.origen) {
        countParams.append('origen', `eq.${filters.origen}`)
      }
      if (filters.zona) {
        countParams.append('zona', `eq.${filters.zona}`)
      }
      if (filters.ingresoMin !== undefined) {
        countParams.append('ingresos', `gte.${filters.ingresoMin}`)
      }
      if (filters.ingresoMax !== undefined) {
        countParams.append('ingresos', `lte.${filters.ingresoMax}`)
      }
      if (filters.fechaDesde) {
        countParams.append('createdAt', `gte.${filters.fechaDesde}T00:00:00`)
      }
      if (filters.fechaHasta) {
        countParams.append('createdAt', `lte.${filters.fechaHasta}T23:59:59`)
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        countParams.append('or', `nombre.ilike.*${searchTerm}*,telefono.ilike.*${searchTerm}*,email.ilike.*${searchTerm}*,dni.ilike.*${searchTerm}*`)
      }

      countParams.append('select', 'count')

      const countResponse = await this.makeRequest(`Lead?${countParams.toString()}`, {
        headers: {
          'Prefer': 'count=exact'
        }
      })

      const totalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || '0')

      const queryTime = Date.now() - startTime

      // Analizar rendimiento de la consulta
      const performance = analyzeQueryPerformance(queryTime, leads.length, filters)

      logger.info('Optimized query results', {
        leadsReturned: leads.length,
        totalCount,
        queryTime,
        performance: performance.performance,
        recommendations: performance.recommendations,
        hasFilters: Object.keys(filters).length > 2 // más que limit y offset
      })

      return {
        leads: leads || [],
        total: totalCount
      }

    } catch (error: any) {
      logger.error('Error in optimized getLeads', {
        error: error.message,
        stack: error.stack,
        filters
      })

      // Fallback a método simple si falla la query optimizada
      logger.warn('Falling back to simple query due to error')
      return this.getLeadsSimple(filters)
    }
  }

  /**
   * Método de fallback simple para casos donde la query optimizada falla
   */
  private async getLeadsSimple(filters: any): Promise<{ leads: Lead[], total: number }> {
    try {
      const response = await this.makeRequest('Lead?select=*&order=createdAt.desc', {
        headers: {
          'Prefer': 'return=representation'
        }
      })

      let allLeads = await response.json()

      // Aplicar filtros básicos en memoria como fallback
      let filteredLeads = allLeads

      if (filters.estado) {
        filteredLeads = filteredLeads.filter((lead: any) => lead.estado === filters.estado)
      }

      if (filters.origen) {
        filteredLeads = filteredLeads.filter((lead: any) => lead.origen === filters.origen)
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredLeads = filteredLeads.filter((lead: any) =>
          lead.nombre?.toLowerCase().includes(searchLower) ||
          lead.telefono?.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.dni?.toLowerCase().includes(searchLower)
        )
      }

      const total = filteredLeads.length
      const limit = filters.limit || 10
      const offset = filters.offset || 0

      const paginatedLeads = filteredLeads.slice(offset, offset + limit)

      return {
        leads: paginatedLeads,
        total
      }

    } catch (error: any) {
      logger.error('Error in simple fallback getLeads', {
        error: error.message,
        filters
      })
      throw error
    }
  }

  // Método para enriquecer leads con información del pipeline
  private async enrichLeadsWithPipeline(leads: Lead[]): Promise<Lead[]> {
    try {
      if (leads.length === 0) return leads

      // Obtener información del pipeline para todos los leads
      const leadIds = leads.map(lead => lead.id).join(',')
      const pipelineResponse = await this.makeRequest(
        `lead_pipeline?lead_id=in.(${leadIds})&select=*`
      )
      const pipelineData = await pipelineResponse.json()

      // Crear un mapa de pipeline por lead_id
      const pipelineMap = new Map()
      pipelineData.forEach((pipeline: any) => {
        pipelineMap.set(pipeline.lead_id, pipeline)
      })

      // Enriquecer cada lead con su información de pipeline
      const enrichedLeads = leads.map(lead => {
        const pipeline = pipelineMap.get(lead.id)
        return {
          ...lead,
          pipeline: pipeline || null
        }
      })

      return enrichedLeads
    } catch (error) {
      logger.error('Error enriching leads with pipeline data', { error })
      // En caso de error, devolver leads sin información de pipeline
      return leads
    }
  }

  async getLeadById(id: string): Promise<Lead | null> {
    try {
      const response = await this.makeRequest(`Lead?id=eq.${id}&select=*`)
      const result = await response.json()
      
      return Array.isArray(result) && result.length > 0 ? result[0] : null

    } catch (error: any) {
      logger.error('Error fetching lead by ID', { error: error.message, leadId: id })
      throw error
    }
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      // Limpiar datos y agregar timestamp de actualización
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== null && value !== undefined && value !== '')
      )

      // Si hay tags, asegurarse de que sean un string JSON
      if (cleanUpdates.tags) {
        if (typeof cleanUpdates.tags === 'string') {
          // Ya es un string, verificar que sea JSON válido
          try {
            JSON.parse(cleanUpdates.tags)
          } catch {
            // Si no es JSON válido, convertirlo
            cleanUpdates.tags = JSON.stringify([cleanUpdates.tags])
          }
        } else if (Array.isArray(cleanUpdates.tags)) {
          // Convertir array a JSON string
          cleanUpdates.tags = JSON.stringify(cleanUpdates.tags)
        }
      }

      const dataWithTimestamp = {
        ...cleanUpdates,
        updatedAt: new Date().toISOString()
      }

      const response = await this.makeRequest(`Lead?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(dataWithTimestamp)
      })

      const result = await response.json()
      const lead = Array.isArray(result) ? result[0] : result

      logger.info('Lead updated successfully', { leadId: id })

      // Invalidar cache relacionado con leads y tags
      CacheInvalidation.onLeadChange()
      if (cleanUpdates.tags) {
        cacheService.invalidateByTag('tags')
      }

      return lead

    } catch (error: any) {
      logger.error('Error updating lead', { error: error.message, leadId: id })
      throw error
    }
  }

  async deleteLead(id: string): Promise<void> {
    try {
      await this.makeRequest(`Lead?id=eq.${id}`, {
        method: 'DELETE'
      })

      logger.info('Lead deleted successfully', { leadId: id })

    } catch (error: any) {
      logger.error('Error deleting lead', { error: error.message, leadId: id })
      throw error
    }
  }

  async findLeadByPhone(telefono: string): Promise<Lead | null> {
    try {
      const response = await this.makeRequest(`Lead?telefono=eq.${telefono}&select=*`)
      const result = await response.json()
      
      return Array.isArray(result) && result.length > 0 ? result[0] : null

    } catch (error: any) {
      logger.error('Error finding lead by phone', { error: error.message, telefono })
      throw error
    }
  }

  async getLeadEvents(leadId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(`LeadEvent?lead_id=eq.${leadId}&select=*&order=created_at.desc`)
      const result = await response.json()
      
      return Array.isArray(result) ? result : []

    } catch (error: any) {
      logger.error('Error getting lead events', { error: error.message, leadId })
      throw error
    }
  }

  /**
   * Obtiene el evento más reciente para cada lead especificado
   * Equivalente a DISTINCT ON en PostgreSQL pero usando Supabase REST API
   */
  async getLatestEventsByLeadIds(leadIds: string[]): Promise<Map<string, any>> {
    const eventsMap = new Map<string, any>()
    
    if (leadIds.length === 0) {
      return eventsMap
    }

    try {
      // Construir filtro para obtener eventos de múltiples leads
      // Usar operador 'in' de Supabase para múltiples valores
      // Obtener todos los eventos para estos leads, ordenados por leadId y createdAt descendente
      const response = await this.makeRequest(
        `Event?leadId=in.(${leadIds.join(',')})&select=id,leadId,tipo,payload,createdAt&order=leadId.asc,createdAt.desc`
      )
      
      const allEvents = await response.json()
      
      if (!Array.isArray(allEvents)) {
        logger.warn('getLatestEventsByLeadIds: response is not an array', { response: allEvents })
        return eventsMap
      }

      // Agrupar por leadId y tomar el primero de cada grupo (el más reciente debido al ordenamiento)
      const eventsByLead = new Map<string, any>()
      allEvents.forEach((event: any) => {
        if (event.leadId && !eventsByLead.has(event.leadId)) {
          eventsByLead.set(event.leadId, {
            leadId: event.leadId,
            id: event.id,
            tipo: event.tipo,
            payload: event.payload ? (typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload) : null,
            createdAt: event.createdAt
          })
        }
      })

      return eventsByLead

    } catch (error: any) {
      logger.error('Error getting latest events by lead IDs', {
        error: error.message,
        leadCount: leadIds.length
      })
      // Retornar mapa vacío en caso de error para que el código continúe funcionando
      return eventsMap
    }
  }

  /**
   * Obtiene asignaciones de leads desde la tabla lead_pipeline
   * Maneja errores gracefully si la tabla no existe
   */
  async getLeadAssignments(leadIds: string[]): Promise<Map<string, string>> {
    const assignmentMap = new Map<string, string>()
    
    if (leadIds.length === 0) {
      return assignmentMap
    }

    try {
      // Construir filtro para obtener asignaciones de múltiples leads
      const response = await this.makeRequest(
        `lead_pipeline?lead_id=in.(${leadIds.join(',')})&select=lead_id,assigned_to&assigned_to=not.is.null`
      )
      
      const assignments = await response.json()
      
      if (!Array.isArray(assignments)) {
        logger.warn('getLeadAssignments: response is not an array', { response: assignments })
        return assignmentMap
      }

      assignments.forEach((assignment: any) => {
        if (assignment.lead_id && assignment.assigned_to) {
          assignmentMap.set(assignment.lead_id, assignment.assigned_to)
        }
      })

      return assignmentMap

    } catch (error: any) {
      // Si la tabla no existe o hay un error, simplemente retornar mapa vacío
      logger.warn('Could not fetch lead assignments from lead_pipeline', {
        error: error.message,
        leadCount: leadIds.length
      })
      return assignmentMap
    }
  }

  /**
   * Obtiene información del pipeline (current_stage) para múltiples leads
   * Maneja errores gracefully si la tabla no existe
   */
  async getLeadPipelines(leadIds: string[]): Promise<Map<string, { current_stage: string; stage_entered_at: string }>> {
    const pipelineMap = new Map<string, { current_stage: string; stage_entered_at: string }>()
    
    if (leadIds.length === 0) {
      return pipelineMap
    }

    try {
      // Construir filtro para obtener información de pipeline de múltiples leads
      const response = await this.makeRequest(
        `lead_pipeline?lead_id=in.(${leadIds.join(',')})&select=lead_id,current_stage,stage_entered_at`
      )
      
      const pipelines = await response.json()
      
      if (!Array.isArray(pipelines)) {
        logger.warn('getLeadPipelines: response is not an array', { response: pipelines })
        return pipelineMap
      }

      pipelines.forEach((pipeline: any) => {
        if (pipeline.lead_id && pipeline.current_stage) {
          pipelineMap.set(pipeline.lead_id, {
            current_stage: pipeline.current_stage,
            stage_entered_at: pipeline.stage_entered_at || new Date().toISOString()
          })
        }
      })

      return pipelineMap

    } catch (error: any) {
      // Si la tabla no existe o hay un error, simplemente retornar mapa vacío
      logger.warn('Could not fetch lead pipelines', {
        error: error.message,
        leadCount: leadIds.length
      })
      return pipelineMap
    }
  }
}

// Instancia singleton
export const supabaseLeadService = new SupabaseLeadService()
