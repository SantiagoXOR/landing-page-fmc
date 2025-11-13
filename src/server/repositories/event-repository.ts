import { supabase } from '@/lib/db'

export class EventRepository {
  async create(data: {
    leadId?: string
    tipo: string
    payload?: any
  }) {
    return supabase.createEvent(data)
  }

  async findByLeadId(leadId: string) {
    return supabase.findEventsByLeadId(leadId)
  }

  async findByType(tipo: string, limit = 100) {
    return supabase.findEventsByType(tipo, limit)
  }
}
