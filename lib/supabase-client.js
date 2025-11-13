/**
 * Cliente personalizado para Supabase
 * Reemplaza Prisma para operaciones de base de datos
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

class SupabaseClient {
  constructor() {
    this.baseUrl = SUPABASE_URL
    this.serviceKey = SERVICE_ROLE_KEY
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/rest/v1${endpoint}`
    
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
      throw new Error(`Supabase error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  // Operaciones para User
  async findUserByEmail(email) {
    const users = await this.request(`/User?email=eq.${email}&select=*`)
    return users[0] || null
  }

  async createUser(userData) {
    const users = await this.request('/User', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(userData)
    })
    return users[0]
  }

  async findUserById(id) {
    const users = await this.request(`/User?id=eq.${id}&select=*`)
    return users[0] || null
  }

  // Operaciones para Lead
  async findManyLeads(filters = {}) {
    let query = '/Lead?select=*'
    
    if (filters.estado) {
      query += `&estado=eq.${filters.estado}`
    }
    if (filters.origen) {
      query += `&origen=eq.${filters.origen}`
    }
    if (filters.agencia) {
      query += `&agencia=eq.${filters.agencia}`
    }
    
    // Ordenar por fecha de creación descendente
    query += '&order=createdAt.desc'
    
    return this.request(query)
  }

  async findLeadById(id) {
    const leads = await this.request(`/Lead?id=eq.${id}&select=*`)
    return leads[0] || null
  }

  async createLead(leadData) {
    const leads = await this.request('/Lead', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(leadData)
    })
    return leads[0]
  }

  async updateLead(id, updateData) {
    const leads = await this.request(`/Lead?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
    })
    return leads[0]
  }

  async deleteLead(id) {
    await this.request(`/Lead?id=eq.${id}`, {
      method: 'DELETE'
    })
    return { id }
  }

  // Operaciones para Event
  async createEvent(eventData) {
    const events = await this.request('/Event', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(eventData)
    })
    return events[0]
  }

  async findEventsByLeadId(leadId) {
    return this.request(`/Event?leadId=eq.${leadId}&select=*&order=createdAt.desc`)
  }

  // Operaciones para Rule
  async findAllRules() {
    return this.request('/Rule?select=*')
  }

  async findRuleByKey(key) {
    const rules = await this.request(`/Rule?key=eq.${key}&select=*`)
    return rules[0] || null
  }

  async updateRule(key, value) {
    const rules = await this.request(`/Rule?key=eq.${key}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        value,
        updatedAt: new Date().toISOString()
      })
    })
    return rules[0]
  }

  // Estadísticas
  async getLeadStats() {
    const leads = await this.findManyLeads()
    
    const stats = {
      total: leads.length,
      nuevo: 0,
      contactado: 0,
      calificado: 0,
      rechazado: 0,
      convertido: 0
    }

    leads.forEach(lead => {
      const estado = lead.estado.toLowerCase()
      if (stats.hasOwnProperty(estado)) {
        stats[estado]++
      }
    })

    return stats
  }

  async getLeadsByOrigen() {
    const leads = await this.findManyLeads()
    const origenStats = {}

    leads.forEach(lead => {
      const origen = lead.origen || 'Sin origen'
      origenStats[origen] = (origenStats[origen] || 0) + 1
    })

    return origenStats
  }
}

// Crear instancia singleton
const supabaseClient = new SupabaseClient()

export default supabaseClient
