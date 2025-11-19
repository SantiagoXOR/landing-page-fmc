import { supabase } from '@/lib/db'
import { ManychatService } from './manychat-service'
import { ManychatSubscriber, ManychatLeadData } from '@/types/manychat'
import { logger } from '@/lib/logger'

/**
 * Servicio de sincronización bidireccional entre el CRM y Manychat
 */
export class ManychatSyncService {
  
  // ============================================================================
  // SINCRONIZACIÓN LEAD → MANYCHAT
  // ============================================================================

  /**
   * Sincronizar lead del CRM hacia Manychat
   */
  static async syncLeadToManychat(leadId: string): Promise<boolean> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      // Obtener lead del CRM desde Supabase
      const { data: lead, error: leadError } = await supabase.client
        .from('Lead')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadError || !lead) {
        throw new Error(`Lead ${leadId} no encontrado`)
      }

      try {
        // Preparar datos para Manychat
        const [firstName, ...lastNameParts] = (lead.nombre || '').split(' ')
        const lastName = lastNameParts.join(' ')

        // Si el origen es WhatsApp, usar el método optimizado
        let subscriber
        if (lead.origen === 'whatsapp') {
          subscriber = await ManychatService.createWhatsAppSubscriber({
            phone: lead.telefono,
            first_name: firstName,
            last_name: lastName || undefined,
            email: lead.email || undefined,
            custom_fields: {
              dni: lead.dni || undefined,
              ingresos: lead.ingresos || undefined,
              zona: lead.zona || undefined,
              producto: lead.producto || undefined,
              monto: lead.monto || undefined,
              origen: lead.origen || 'whatsapp',
              estado: lead.estado || undefined,
              agencia: lead.agencia || undefined,
            },
            tags: lead.tags ? (typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags) : [],
          })
        } else {
          // Para otros orígenes, usar el método estándar
          const manychatData: ManychatLeadData = {
            phone: lead.telefono,
            first_name: firstName,
            last_name: lastName || undefined,
            email: lead.email || undefined,
            whatsapp_phone: lead.telefono,
            custom_fields: {
              dni: lead.dni || undefined,
              ingresos: lead.ingresos || undefined,
              zona: lead.zona || undefined,
              producto: lead.producto || undefined,
              monto: lead.monto || undefined,
              origen: lead.origen || undefined,
              estado: lead.estado || undefined,
              agencia: lead.agencia || undefined,
            },
            tags: lead.tags ? (typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags) : [],
          }

          subscriber = await ManychatService.createOrUpdateSubscriber(manychatData)
        }

        if (!subscriber) {
          throw new Error('No se pudo crear/actualizar subscriber en Manychat')
        }

        // Actualizar lead con manychatId
        const { error: updateError } = await supabase.client
          .from('Lead')
          .update({ 
            manychatId: String(subscriber.id),
            updatedAt: new Date().toISOString()
          })
          .eq('id', leadId)

        if (updateError) {
          throw updateError
        }

        logger.info(`Lead ${leadId} sincronizado exitosamente con Manychat`, { 
          manychatId: subscriber.id 
        })
        return true
      } catch (error: any) {
        logger.error(`Error sincronizando lead ${leadId} a Manychat`, { 
          error: error.message 
        })
        return false
      }
    } catch (error: any) {
      logger.error('Error en syncLeadToManychat', { error: error.message })
      return false
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN MANYCHAT → LEAD
  // ============================================================================

  /**
   * Sincronizar subscriber de Manychat hacia el CRM
   */
  static async syncManychatToLead(subscriber: ManychatSubscriber): Promise<string | null> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      const phone = subscriber.whatsapp_phone || subscriber.phone || ''
      
      if (!phone) {
        throw new Error('Subscriber no tiene teléfono')
      }

      const nombre = [subscriber.first_name, subscriber.last_name]
        .filter(Boolean)
        .join(' ') || subscriber.name || 'Contacto Manychat'

      // Buscar lead existente por manychatId o teléfono
      const { data: existingLeads } = await supabase.client
        .from('Lead')
        .select('*')
        .or(`manychatId.eq.${subscriber.id},telefono.eq.${phone}`)
        .limit(1)

      const customFields = subscriber.custom_fields || {}
      const tags = subscriber.tags?.map(t => t.name) || []

      const leadData: any = {
        nombre,
        telefono: phone,
        email: subscriber.email || null,
        manychatId: String(subscriber.id),
        dni: customFields.dni || null,
        ingresos: customFields.ingresos ?? null,
        zona: customFields.zona || null,
        producto: customFields.producto || null,
        monto: customFields.monto ?? null,
        origen: customFields.origen || 'whatsapp',
        estado: customFields.estado || 'NUEVO',
        agencia: customFields.agencia || null,
        tags: JSON.stringify(tags),
        updatedAt: new Date().toISOString(),
      }

      let lead: any

      if (existingLeads && existingLeads.length > 0) {
        // Actualizar lead existente
        const { data: updatedLead, error: updateError } = await supabase.client
          .from('Lead')
          .update(leadData)
          .eq('id', existingLeads[0].id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }
        lead = updatedLead
      } else {
        // Crear nuevo lead
        const { data: newLead, error: createError } = await supabase.client
          .from('Lead')
          .insert({
            ...leadData,
            createdAt: new Date().toISOString(),
          })
          .select()
          .single()

        if (createError) {
          throw createError
        }
        lead = newLead
      }

      logger.info(`Subscriber ${subscriber.id} sincronizado exitosamente al CRM`, { 
        leadId: lead.id 
      })
      return lead.id
    } catch (error: any) {
      logger.error(`Error sincronizando subscriber ${subscriber.id} al CRM`, { 
        error: error.message 
      })
      return null
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN DE TAGS
  // ============================================================================

  /**
   * Sincronizar tags de un lead hacia Manychat
   */
  static async syncTagsToManychat(leadId: string, tags: string[]): Promise<boolean> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      const { data: lead, error: leadError } = await supabase.client
        .from('Lead')
        .select('manychatId')
        .eq('id', leadId)
        .single()

      if (leadError || !lead || !lead.manychatId) {
        logger.warn(`Lead ${leadId} no tiene manychatId`)
        return false
      }

      const subscriberId = parseInt(lead.manychatId)
      if (isNaN(subscriberId)) {
        return false
      }

      // Obtener tags actuales del subscriber en Manychat
      const subscriber = await ManychatService.getSubscriberById(subscriberId)
      const currentTags = subscriber?.tags?.map(t => t.name) || []

      // Tags a agregar (están en 'tags' pero no en 'currentTags')
      const tagsToAdd = tags.filter(tag => !currentTags.includes(tag))

      // Tags a remover (están en 'currentTags' pero no en 'tags')
      const tagsToRemove = currentTags.filter(tag => !tags.includes(tag))

      // Agregar tags
      for (const tag of tagsToAdd) {
        await ManychatService.addTagToSubscriber(subscriberId, tag)
      }

      // Remover tags
      for (const tag of tagsToRemove) {
        await ManychatService.removeTagFromSubscriber(subscriberId, tag)
      }

      // Actualizar lead con tags sincronizados
      const { error: updateError } = await supabase.client
        .from('Lead')
        .update({ 
          tags: JSON.stringify(tags),
          updatedAt: new Date().toISOString()
        })
        .eq('id', leadId)

      if (updateError) {
        throw updateError
      }

      logger.info(`Tags sincronizados para lead ${leadId}`)
      return true
    } catch (error: any) {
      logger.error('Error sincronizando tags', { error: error.message })
      return false
    }
  }

  /**
   * Sincronizar tags de Manychat hacia el CRM
   */
  static async syncTagsFromManychat(leadId: string): Promise<boolean> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      const { data: lead, error: leadError } = await supabase.client
        .from('Lead')
        .select('manychatId')
        .eq('id', leadId)
        .single()

      if (leadError || !lead || !lead.manychatId) {
        return false
      }

      const subscriberId = parseInt(lead.manychatId)
      if (isNaN(subscriberId)) {
        return false
      }

      const subscriber = await ManychatService.getSubscriberById(subscriberId)

      if (!subscriber) {
        return false
      }

      const tags = subscriber.tags?.map(t => t.name) || []

      const { error: updateError } = await supabase.client
        .from('Lead')
        .update({ 
          tags: JSON.stringify(tags),
          updatedAt: new Date().toISOString()
        })
        .eq('id', leadId)

      if (updateError) {
        throw updateError
      }

      return true
    } catch (error: any) {
      logger.error('Error sincronizando tags desde Manychat', { error: error.message })
      return false
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN DE CUSTOM FIELDS
  // ============================================================================

  /**
   * Sincronizar custom fields hacia Manychat
   */
  static async syncCustomFieldsToManychat(leadId: string): Promise<boolean> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      const { data: lead, error: leadError } = await supabase.client
        .from('Lead')
        .select('manychatId, dni, ingresos, zona, producto, monto, origen, estado, agencia')
        .eq('id', leadId)
        .single()

      if (leadError || !lead || !lead.manychatId) {
        return false
      }

      const subscriberId = parseInt(lead.manychatId)
      if (isNaN(subscriberId)) {
        return false
      }

      // Mapear campos del CRM a custom fields de Manychat
      const fieldsToSync = {
        dni: lead.dni,
        ingresos: lead.ingresos,
        zona: lead.zona,
        producto: lead.producto,
        monto: lead.monto,
        origen: lead.origen,
        estado: lead.estado,
        agencia: lead.agencia,
      }

      // Actualizar cada custom field
      for (const [fieldName, value] of Object.entries(fieldsToSync)) {
        if (value !== null && value !== undefined) {
          await ManychatService.setCustomField(subscriberId, fieldName, value)
        }
      }

      logger.info(`Custom fields sincronizados para lead ${leadId}`)
      return true
    } catch (error: any) {
      logger.error('Error sincronizando custom fields', { error: error.message })
      return false
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN COMPLETA
  // ============================================================================

  /**
   * Sincronización completa de un lead (datos + tags + custom fields)
   */
  static async fullSyncLeadToManychat(leadId: string): Promise<boolean> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      // 1. Sincronizar datos básicos del lead
      const success = await this.syncLeadToManychat(leadId)
      if (!success) {
        return false
      }

      // 2. Sincronizar tags si existen
      const { data: lead } = await supabase.client
        .from('Lead')
        .select('tags')
        .eq('id', leadId)
        .single()

      if (lead?.tags) {
        try {
          const tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags
          if (Array.isArray(tags) && tags.length > 0) {
            await this.syncTagsToManychat(leadId, tags)
          }
        } catch (e: any) {
          logger.error('Error parseando tags', { error: e.message })
        }
      }

      // 3. Sincronizar custom fields
      await this.syncCustomFieldsToManychat(leadId)

      return true
    } catch (error: any) {
      logger.error('Error en sincronización completa', { error: error.message })
      return false
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Obtener logs de sincronización de un lead
   * Nota: Si hay tabla manychatSync en Supabase, implementar aquí
   */
  static async getSyncLogs(_leadId: string) {
    // Por ahora retornar array vacío, se puede implementar si existe tabla manychatSync
    return []
  }

  /**
   * Reintentar sincronizaciones fallidas
   * Nota: Implementar si hay tabla manychatSync para tracking
   */
  static async retryFailedSyncs(_maxRetries: number = 3): Promise<number> {
    // Por ahora retornar 0, se puede implementar si existe tabla manychatSync
    return 0
  }

  /**
   * Limpiar logs antiguos de sincronización
   * Nota: Implementar si hay tabla manychatSync
   */
  static async cleanupOldSyncLogs(_daysToKeep: number = 30): Promise<number> {
    // Por ahora retornar 0, se puede implementar si existe tabla manychatSync
    return 0
  }
}

