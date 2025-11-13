import { supabase } from '@/lib/db'
import { LeadCreate, LeadUpdate, LeadQuery } from '@/lib/validators'
import { normalizePhone } from '@/lib/utils'

export class LeadRepository {
  async create(data: LeadCreate) {
    const normalizedPhone = normalizePhone(data.telefono)

    return supabase.createLead({
      ...data,
      telefono: normalizedPhone,
      email: data.email || null,
    })
  }

  async findByPhoneOrDni(telefono: string, dni?: string) {
    const normalizedPhone = normalizePhone(telefono)

    return supabase.findLeadByPhoneOrDni(normalizedPhone, dni)
  }

  async findById(id: string) {
    return supabase.findLeadById(id)
  }

  async update(id: string, data: LeadUpdate) {
    const updateData: any = { ...data }

    if (data.telefono) {
      updateData.telefono = normalizePhone(data.telefono)
    }

    if (data.email === '') {
      updateData.email = null
    }

    return supabase.updateLead(id, updateData)
  }

  async findMany(query: LeadQuery) {
    return supabase.findManyLeads(query)
  }

  async upsert(data: LeadCreate) {
    const normalizedPhone = normalizePhone(data.telefono)

    // Buscar lead existente
    const existing = await this.findByPhoneOrDni(data.telefono, data.dni)

    if (existing) {
      // Actualizar solo campos que no están vacíos
      const updateData: any = {}

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          updateData[key] = value
        }
      })

      if (Object.keys(updateData).length > 0) {
        updateData.telefono = normalizedPhone
        return this.update(existing.id, updateData)
      }

      return existing
    }

    return this.create(data)
  }

  async delete(id: string) {
    return supabase.deleteLead(id)
  }
}
