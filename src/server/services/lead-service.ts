import { LeadRepository } from '../repositories/lead-repository'
import { EventRepository } from '../repositories/event-repository'
import { LeadCreate, LeadUpdate, LeadQuery } from '@/lib/validators'
import { logger } from '@/lib/logger'

export class LeadService {
  private leadRepo = new LeadRepository()
  private eventRepo = new EventRepository()

  async createLead(data: LeadCreate, userId?: string) {
    try {
      const lead = await this.leadRepo.create(data)
      
      await this.eventRepo.create({
        leadId: lead.id,
        tipo: 'lead_created',
        payload: { userId, data },
      })

      logger.info('Lead created', { leadId: lead.id }, { userId, leadId: lead.id })
      
      return lead
    } catch (error) {
      logger.error('Error creating lead', { error, data }, { userId })
      throw error
    }
  }

  async upsertLead(data: LeadCreate, userId?: string) {
    try {
      const existing = await this.leadRepo.findByPhoneOrDni(data.telefono, data.dni)
      const isUpdate = !!existing
      
      const lead = await this.leadRepo.upsert(data)
      
      await this.eventRepo.create({
        leadId: lead.id,
        tipo: isUpdate ? 'lead_upsert' : 'lead_created',
        payload: { userId, data, isUpdate },
      })

      logger.info(
        isUpdate ? 'Lead updated via upsert' : 'Lead created via upsert',
        { leadId: lead.id },
        { userId, leadId: lead.id }
      )
      
      return { lead, isUpdate }
    } catch (error) {
      logger.error('Error upserting lead', { error, data }, { userId })
      throw error
    }
  }

  async updateLead(id: string, data: LeadUpdate, userId?: string) {
    try {
      const lead = await this.leadRepo.update(id, data)
      
      await this.eventRepo.create({
        leadId: id,
        tipo: 'lead_updated',
        payload: { userId, data },
      })

      logger.info('Lead updated', { leadId: id }, { userId, leadId: id })
      
      return lead
    } catch (error) {
      logger.error('Error updating lead', { error, leadId: id }, { userId, leadId: id })
      throw error
    }
  }

  async getLeadById(id: string) {
    return this.leadRepo.findById(id)
  }

  async getLeads(query: LeadQuery) {
    return this.leadRepo.findMany(query)
  }

  async deleteLead(id: string, userId?: string) {
    try {
      // Verificar que el lead existe antes de eliminarlo
      const existingLead = await this.leadRepo.findById(id)
      if (!existingLead) {
        throw new Error('Lead not found')
      }

      // Crear evento antes de eliminar
      await this.eventRepo.create({
        leadId: id,
        tipo: 'lead_deleted',
        payload: { userId, leadData: existingLead },
      })

      // Eliminar el lead usando el repositorio
      await this.leadRepo.delete(id)

      logger.info('Lead deleted', { leadId: id }, { userId, leadId: id })

    } catch (error) {
      logger.error('Error deleting lead', { error, leadId: id }, { userId, leadId: id })
      throw error
    }
  }

  async deriveLead(id: string, agencia: string, userId?: string) {
    try {
      const lead = await this.leadRepo.update(id, {
        agencia,
        estado: 'DERIVADO',
      })

      await this.eventRepo.create({
        leadId: id,
        tipo: 'lead_derived',
        payload: { userId, agencia },
      })

      logger.info('Lead derived', { leadId: id, agencia }, { userId, leadId: id })

      return lead
    } catch (error) {
      logger.error('Error deriving lead', { error, leadId: id }, { userId, leadId: id })
      throw error
    }
  }
}
