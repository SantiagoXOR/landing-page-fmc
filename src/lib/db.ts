/**
 * Adaptador de base de datos para Supabase
 * Reemplaza Prisma para operaciones de base de datos
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

class SupabaseClient {
  private baseUrl: string
  private serviceKey: string

  constructor() {
    // Verificar que las variables de entorno estén configuradas
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured. Please check SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY environment variables.')
    }
    
    this.baseUrl = SUPABASE_URL
    this.serviceKey = SERVICE_ROLE_KEY
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/rest/v1${endpoint}`

    try {
      // Validar que serviceKey esté configurado
      if (!this.serviceKey) {
        throw new Error('Supabase service key no está configurada')
      }

      console.log(`🌐 Supabase request: ${url}`)
      
      // Asegurar que los headers de autenticación no se sobrescriban
      const headers = new Headers({
        'Content-Type': 'application/json',
        'apikey': this.serviceKey,
        'Authorization': `Bearer ${this.serviceKey}`,
      })

      // Agregar headers adicionales del request (como 'Prefer')
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            headers.set(key, value)
          })
        } else if (Array.isArray(options.headers)) {
          options.headers.forEach(([key, value]) => {
            headers.set(key, value)
          })
        } else {
          Object.entries(options.headers).forEach(([key, value]) => {
            if (value) {
              headers.set(key, String(value))
            }
          })
        }
      }

      const response = await fetch(url, {
        ...options,
        headers
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Supabase HTTP error: ${response.status} - ${error}`)
        throw new Error(`Supabase error: ${response.status} - ${error}`)
      }

      // Para DELETE con 204 No Content, no hay body
      if (response.status === 204) {
        return null
      }

      // Leer el contenido de la respuesta
      const contentType = response.headers.get('content-type')
      const text = await response.text()
      
      // Si no hay contenido, retornar null
      if (!text || text.trim() === '') {
        return null
      }

      // Si es JSON, parsearlo
      if (contentType && contentType.includes('application/json')) {
        try {
          return JSON.parse(text)
        } catch (parseError) {
          console.error(`❌ Error parseando JSON: ${parseError}`)
          throw new Error(`Error parseando respuesta JSON: ${parseError}`)
        }
      }

      // Si no es JSON, retornar el texto tal cual
      return text
    } catch (error: any) {
      // Capturar errores de red específicos
      if (error.message === 'fetch failed' || error.name === 'TypeError') {
        console.error(`❌ Supabase network error: ${error.message}`)
        console.error(`   URL: ${url}`)
        console.error(`   Error type: ${error.constructor.name}`)
        console.error(`   Stack: ${error.stack}`)
        throw new Error(`Error de conexión a Supabase: ${error.message}. Verifique su conexión a internet y la configuración de red.`)
      }
      
      // Re-lanzar otros errores
      console.error(`❌ Supabase request error: ${error.message}`)
      throw error
    }
  }

  // Operaciones para User
  async findUserByEmail(email: string) {
    const users = await this.request(`/User?email=eq.${email}&limit=1`)
    if (!users[0]) return null

    return this.mapUserData(users[0])
  }

  async getUserRole(userId: string) {
    const user = await this.request(`/User?id=eq.${userId}&select=role`)
    return user[0]?.role || null
  }

  private mapUserData(userData: any) {
    // Determinar status basado en el email (soft delete usando prefijo deleted_)
    let status = 'ACTIVE'
    if (userData.email && userData.email.startsWith('deleted_')) {
      status = 'INACTIVE'
    } else if (userData.role === 'PENDING') {
      status = 'PENDING'
    }
    
    return {
      id: userData.id,
      email: userData.email,
      nombre: userData.name,
      hash: userData.hashedPassword,
      rol: userData.role,
      role: userData.role, // Agregar también 'role' para compatibilidad
      status: status,
      createdAt: userData.createdAt
    }
  }



  async countUsers() {
    const response = await this.request('/User?select=count', {
      headers: { 'Prefer': 'count=exact' }
    })
    return response[0]?.count || 0
  }

  // Operaciones para Lead
  async createLead(leadData: any) {
    const leads = await this.request('/Lead', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(leadData)
    })
    return leads[0]
  }

  async findLeadById(id: string) {
    const leads = await this.request(`/Lead?id=eq.${id}&select=*`)
    if (!leads[0]) return null

    // Obtener eventos del lead
    const events = await this.request(`/Event?leadId=eq.${id}&select=*&order=createdAt.desc`)

    return {
      ...leads[0],
      events: events.map((event: any) => ({
        ...event,
        payload: event.payload ? JSON.parse(event.payload) : null,
      }))
    }
  }

  async findLeadByPhoneOrDni(telefono: string, dni?: string) {
    let query = `telefono=eq.${telefono}`
    if (dni) {
      query = `or=(telefono.eq.${telefono},dni.eq.${dni})`
    }

    const leads = await this.request(`/Lead?${query}&select=*&limit=1`)
    return leads[0] || null
  }

  async updateLead(id: string, leadData: any) {
    const leads = await this.request(`/Lead?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(leadData)
    })
    return leads[0]
  }

  async deleteLead(id: string) {
    await this.request(`/Lead?id=eq.${id}`, {
      method: 'DELETE'
    })
  }

  async findManyLeads(query: any = {}) {
    const {
      estado,
      origen,
      q,
      from,
      to,
      page = 1,
      limit = 10,
    } = query

    let endpoint = '/Lead?select=*'
    const conditions: string[] = []

    if (estado) {
      conditions.push(`estado=eq.${estado}`)
    }

    if (origen) {
      conditions.push(`origen=eq.${origen}`)
    }

    if (q) {
      conditions.push(`or=(nombre.ilike.*${q}*,telefono.ilike.*${q}*,email.ilike.*${q}*,dni.ilike.*${q}*)`)
    }

    if (from) {
      conditions.push(`createdAt=gte.${from}`)
    }

    if (to) {
      conditions.push(`createdAt=lte.${to}`)
    }

    if (conditions.length > 0) {
      endpoint += '&' + conditions.join('&')
    }

    endpoint += `&order=createdAt.desc&limit=${limit}&offset=${(page - 1) * limit}`

    const leads = await this.request(endpoint)

    // Obtener el total para paginación
    let countEndpoint = '/Lead?select=count'
    if (conditions.length > 0) {
      countEndpoint += '&' + conditions.join('&')
    }

    const countResponse = await this.request(countEndpoint, {
      headers: { 'Prefer': 'count=exact' }
    })
    const total = countResponse[0]?.count || 0

    return {
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Operaciones para Event
  async createEvent(eventData: any) {
    const events = await this.request('/Event', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...eventData,
        payload: eventData.payload ? JSON.stringify(eventData.payload) : null
      })
    })
    return events[0]
  }

  async findEventsByLeadId(leadId: string) {
    const events = await this.request(`/Event?leadId=eq.${leadId}&select=*&order=createdAt.desc`)
    return events.map((event: any) => ({
      ...event,
      payload: event.payload ? JSON.parse(event.payload) : null,
    }))
  }

  async findEventsByType(tipo: string, limit = 100) {
    const events = await this.request(`/Event?tipo=eq.${tipo}&select=*&order=createdAt.desc&limit=${limit}`)
    return events.map((event: any) => ({
      ...event,
      payload: event.payload ? JSON.parse(event.payload) : null,
    }))
  }

  // Operaciones para Rule
  async findAllRules() {
    const rules = await this.request('/Rule?select=*&order=key.asc')
    return rules.map((rule: any) => ({
      ...rule,
      value: this.parseRuleValue(rule.value),
    }))
  }

  async findRuleByKey(key: string) {
    const rules = await this.request(`/Rule?key=eq.${key}&select=*`)
    if (!rules[0]) return null

    return {
      ...rules[0],
      value: this.parseRuleValue(rules[0].value),
    }
  }

  private parseRuleValue(value: any) {
    // Si ya es un objeto/array, devolverlo tal como está
    if (typeof value === 'object' && value !== null) {
      return value
    }

    // Si es string, intentar parsearlo como JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        // Si no es JSON válido, devolver el string tal como está
        return value
      }
    }

    return value
  }

  async upsertRule(key: string, value: any) {
    // Primero intentar actualizar
    const existing = await this.findRuleByKey(key)

    if (existing) {
      const rules = await this.request(`/Rule?key=eq.${key}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ value: JSON.stringify(value) })
      })
      return {
        ...rules[0],
        value: JSON.parse(rules[0].value),
      }
    } else {
      const rules = await this.request('/Rule', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ key, value: JSON.stringify(value) })
      })
      return {
        ...rules[0],
        value: JSON.parse(rules[0].value),
      }
    }
  }

  async deleteRule(key: string) {
    return this.request(`/Rule?key=eq.${key}`, {
      method: 'DELETE'
    })
  }

  // Nuevas funciones para el sistema de usuarios mejorado
  async findUserByEmailNew(email: string) {
    const users = await this.request(`/User?email=eq.${email}&limit=1`)
    if (!users[0]) return null

    // Determinar status basado en el email (soft delete usando prefijo deleted_)
    let status = 'ACTIVE'
    if (users[0].email && users[0].email.startsWith('deleted_')) {
      status = 'INACTIVE'
    } else if (users[0].role === 'PENDING') {
      status = 'PENDING'
    }

    // Mapear según schema de Prisma: nombre, email, hash, rol
    return {
      id: users[0].id,
      email: users[0].email,
      nombre: users[0].nombre || users[0].name, // Soporta ambos formatos
      apellido: '', // Campo requerido por auth.ts pero no existe en schema
      hash: users[0].hash || users[0].hashedPassword, // Soporta ambos formatos
      role: users[0].rol || users[0].role, // Mapear 'rol' del schema a 'role' para auth.ts
      status: status, // Calculado basado en email y role
      createdAt: users[0].createdAt
    }
  }

  async updateUserLastLogin(userId: string) {
    const users = await this.request(`/User?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ lastLogin: new Date().toISOString() })
    })
    return users[0]
  }

  async getUserPermissions(userId: string) {
    // Obtener permisos por rol del usuario
    const user = await this.request(`/users?id=eq.${userId}&select=role`)
    if (!user[0]) return { rolePermissions: [], userPermissions: [] }

    const rolePermissions = await this.request(`
      /role_permissions?role=eq.${user[0].role}&select=permissions(name,resource,action)
    `)

    // Obtener permisos específicos del usuario
    const userPermissions = await this.request(`
      /user_permissions?user_id=eq.${userId}&granted=eq.true&select=permissions(name,resource,action)
    `)

    return {
      rolePermissions: rolePermissions || [],
      userPermissions: userPermissions || []
    }
  }

  async checkUserPermission(userId: string, resource: string, action: string) {
    try {
      const result = await this.request(`
        /rpc/user_has_permission?p_user_id=${userId}&p_resource=${resource}&p_action=${action}
      `)
      return result || false
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  async createUser(userData: any) {
    const users = await this.request('/User', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(userData)
    })
    return users[0]
  }

  async updateUser(userId: string, userData: any) {
    // Mapear campos del frontend a la estructura de la tabla User
    const updateData: any = {}
    
    if (userData.email !== undefined) updateData.email = userData.email
    if (userData.nombre !== undefined) updateData.name = userData.nombre // Mapear nombre -> name
    if (userData.name !== undefined) updateData.name = userData.name
    if (userData.role !== undefined) updateData.role = userData.role
    if (userData.hash !== undefined) updateData.hashedPassword = userData.hash
    if (userData.password_hash !== undefined) updateData.hashedPassword = userData.password_hash
    
    // Nota: La tabla User no tiene campo 'status', así que lo ignoramos
    // Si necesitas status, deberías agregarlo al esquema de la tabla
    
    const users = await this.request(`/User?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(updateData)
    })
    return users[0]
  }

  async deleteUser(userId: string) {
    try {
      // Eliminar usuario realmente de la base de datos
      // Supabase/PostgREST retorna 204 No Content si es exitoso, o 200 con array vacío
      const result = await this.request(`/User?id=eq.${userId}`, {
        method: 'DELETE'
      })
      
      // Si el request no lanzó error, la eliminación fue exitosa
      // result puede ser null (204), [] (200 con array vacío), o undefined
      console.log(`[Supabase] Usuario ${userId} eliminado exitosamente`)
      return true
    } catch (error: any) {
      console.error(`[Supabase] Error eliminando usuario ${userId}:`, error)
      
      // Verificar si es un error de restricción de integridad referencial
      if (error.message?.includes('foreign key') || error.message?.includes('23503')) {
        throw new Error('No se puede eliminar el usuario porque tiene datos asociados (leads, eventos, etc.)')
      }
      
      // Re-lanzar el error para que el endpoint lo maneje
      throw error
    }
  }

  async findAllUsers() {
    try {
      // Usar el formato correcto de PostgREST para ordenar
      const users = await this.request('/User?select=*&order=createdAt.desc')
      
      // Si no hay usuarios, retornar array vacío
      if (!users || !Array.isArray(users)) {
        console.warn('[Supabase] findAllUsers: respuesta no es un array', users)
        return []
      }
      
      // Mapear usuarios para el frontend
      return users.map((user: any) => {
        // Determinar status basado en el email (soft delete usando prefijo deleted_)
        let status = 'ACTIVE'
        if (user.email && user.email.startsWith('deleted_')) {
          status = 'INACTIVE'
        } else if (user.role === 'PENDING') {
          status = 'PENDING'
        }
        
        return {
          id: user.id,
          email: user.email,
          nombre: user.name || user.nombre || '',
          apellido: user.apellido || '',
          role: user.role === 'PENDING' ? 'VIEWER' : (user.role || 'VIEWER'), // Mostrar como VIEWER temporalmente si es PENDING
          status: status,
          last_login: user.last_login || null,
          created_at: user.createdAt || user.created_at
        }
      })
    } catch (error: any) {
      console.error('[Supabase] Error en findAllUsers:', error)
      console.error('[Supabase] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      // Retornar array vacío en caso de error para que el frontend no se rompa
      return []
    }
  }

  async findUserById(userId: string) {
    const users = await this.request(`/User?id=eq.${userId}&limit=1`)
    if (!users[0]) return null
    return this.mapUserData(users[0])
  }
}

// Crear instancia singleton
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined
}

// Cliente oficial de Supabase para operaciones que lo requieran
export const supabaseClient = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null

export const supabase = Object.assign(
  globalForSupabase.supabase ?? new SupabaseClient(),
  { client: supabaseClient }
)

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase

// Mantener compatibilidad con código existente que usa prisma
export const prisma = supabase as any
