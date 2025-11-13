/**
 * Adaptador de base de datos para Supabase
 * Reemplaza Prisma para operaciones de base de datos
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

class SupabaseClient {
  private baseUrl: string
  private serviceKey: string

  constructor() {
    // Verificar que las variables de entorno estén configuradas
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
    }
    
    this.baseUrl = SUPABASE_URL
    this.serviceKey = SERVICE_ROLE_KEY
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/rest/v1${endpoint}`

    try {
      console.log(`🌐 Supabase request: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.serviceKey,
          'Authorization': `Bearer ${this.serviceKey}`,
          ...options.headers
        },
        ...options
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Supabase HTTP error: ${response.status} - ${error}`)
        throw new Error(`Supabase error: ${response.status} - ${error}`)
      }

      return response.json()
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
    return {
      id: userData.id,
      email: userData.email,
      nombre: userData.name,
      hash: userData.hashedPassword,
      rol: userData.role,
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

    return {
      id: users[0].id,
      email: users[0].email,
      nombre: users[0].name,
      apellido: '', // Campo requerido por auth.ts
      hash: users[0].hashedPassword,
      role: users[0].role, // Cambiar de 'rol' a 'role'
      status: 'ACTIVE', // Campo requerido por auth.ts
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
    const users = await this.request(`/User?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(userData)
    })
    return users[0]
  }

  async findAllUsers() {
    return this.request('/User?select=*&order=created_at.desc')
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
