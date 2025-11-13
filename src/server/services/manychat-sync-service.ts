import { PrismaClient } from '@prisma/client'
import { ManychatService } from './manychat-service'
import { ManychatSubscriber, ManychatLeadData } from '@/types/manychat'

const prisma = new PrismaClient()

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
      // Obtener lead del CRM
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      })

      if (!lead) {
        throw new Error(`Lead ${leadId} no encontrado`)
      }

      // Crear registro de sincronización
      const syncLog = await prisma.manychatSync.create({
        data: {
          leadId,
          syncType: 'lead_to_manychat',
          direction: 'to_manychat',
          status: 'pending',
          data: JSON.stringify({ lead }),
        },
      })

      try {
        // Preparar datos para Manychat
        const [firstName, ...lastNameParts] = lead.nombre.split(' ')
        const lastName = lastNameParts.join(' ')

        const manychatData: ManychatLeadData = {
          phone: lead.telefono,
          first_name: firstName,
          last_name: lastName || undefined,
          email: lead.email || undefined,
          whatsapp_phone: lead.telefono,
          custom_fields: {
            dni: lead.dni,
            ingresos: lead.ingresos,
            zona: lead.zona,
            producto: lead.producto,
            monto: lead.monto,
            origen: lead.origen,
            estado: lead.estado,
            agencia: lead.agencia,
          },
          tags: [], // Los tags se sincronizarán por separado
        }

        // Crear o actualizar subscriber en Manychat
        const subscriber = await ManychatService.createOrUpdateSubscriber(manychatData)

        if (!subscriber) {
          throw new Error('No se pudo crear/actualizar subscriber en Manychat')
        }

        // Actualizar lead con manychatId
        await prisma.lead.update({
          where: { id: leadId },
          data: {
            manychatId: String(subscriber.id),
          },
        })

        // Marcar sincronización como exitosa
        await prisma.manychatSync.update({
          where: { id: syncLog.id },
          data: {
            status: 'success',
            completedAt: new Date(),
            data: JSON.stringify({ lead, subscriber }),
          },
        })

        console.log(`Lead ${leadId} sincronizado exitosamente con Manychat (ID: ${subscriber.id})`)
        return true
      } catch (error: any) {
        // Marcar sincronización como fallida
        await prisma.manychatSync.update({
          where: { id: syncLog.id },
          data: {
            status: 'failed',
            error: error.message,
            retryCount: syncLog.retryCount + 1,
            completedAt: new Date(),
          },
        })

        console.error(`Error sincronizando lead ${leadId} a Manychat:`, error)
        return false
      }
    } catch (error) {
      console.error('Error en syncLeadToManychat:', error)
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
      const syncLog = await prisma.manychatSync.create({
        data: {
          leadId: 'pending', // Se actualizará después
          syncType: 'manychat_to_lead',
          direction: 'from_manychat',
          status: 'pending',
          data: JSON.stringify({ subscriber }),
        },
      })

      try {
        const phone = subscriber.whatsapp_phone || subscriber.phone || ''
        
        if (!phone) {
          throw new Error('Subscriber no tiene teléfono')
        }

        const nombre = [subscriber.first_name, subscriber.last_name]
          .filter(Boolean)
          .join(' ') || subscriber.name || 'Contacto Manychat'

        // Buscar lead existente por manychatId o teléfono
        let lead = await prisma.lead.findFirst({
          where: {
            OR: [
              { manychatId: String(subscriber.id) },
              { telefono: phone },
            ],
          },
        })

        const customFields = subscriber.custom_fields || {}
        const tags = subscriber.tags?.map(t => t.name) || []

        const leadData = {
          nombre,
          telefono: phone,
          email: subscriber.email || null,
          manychatId: String(subscriber.id),
          dni: customFields.dni || null,
          ingresos: customFields.ingresos || null,
          zona: customFields.zona || null,
          producto: customFields.producto || null,
          monto: customFields.monto || null,
          origen: customFields.origen || 'whatsapp',
          estado: customFields.estado || 'NUEVO',
          agencia: customFields.agencia || null,
          tags: JSON.stringify(tags),
          customFields: JSON.stringify(customFields),
        }

        if (lead) {
          // Actualizar lead existente
          lead = await prisma.lead.update({
            where: { id: lead.id },
            data: leadData,
          })
        } else {
          // Crear nuevo lead
          lead = await prisma.lead.create({
            data: leadData,
          })
        }

        // Actualizar syncLog con el leadId correcto
        await prisma.manychatSync.update({
          where: { id: syncLog.id },
          data: {
            leadId: lead.id,
            status: 'success',
            completedAt: new Date(),
            data: JSON.stringify({ subscriber, lead }),
          },
        })

        console.log(`Subscriber ${subscriber.id} sincronizado exitosamente al CRM (Lead: ${lead.id})`)
        return lead.id
      } catch (error: any) {
        await prisma.manychatSync.update({
          where: { id: syncLog.id },
          data: {
            status: 'failed',
            error: error.message,
            retryCount: syncLog.retryCount + 1,
            completedAt: new Date(),
          },
        })

        console.error(`Error sincronizando subscriber ${subscriber.id} al CRM:`, error)
        return null
      }
    } catch (error) {
      console.error('Error en syncManychatToLead:', error)
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
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      })

      if (!lead || !lead.manychatId) {
        console.error(`Lead ${leadId} no tiene manychatId`)
        return false
      }

      const subscriberId = parseInt(lead.manychatId)

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
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          tags: JSON.stringify(tags),
        },
      })

      console.log(`Tags sincronizados para lead ${leadId}`)
      return true
    } catch (error) {
      console.error('Error sincronizando tags:', error)
      return false
    }
  }

  /**
   * Sincronizar tags de Manychat hacia el CRM
   */
  static async syncTagsFromManychat(leadId: string): Promise<boolean> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      })

      if (!lead || !lead.manychatId) {
        return false
      }

      const subscriberId = parseInt(lead.manychatId)
      const subscriber = await ManychatService.getSubscriberById(subscriberId)

      if (!subscriber) {
        return false
      }

      const tags = subscriber.tags?.map(t => t.name) || []

      await prisma.lead.update({
        where: { id: leadId },
        data: {
          tags: JSON.stringify(tags),
        },
      })

      return true
    } catch (error) {
      console.error('Error sincronizando tags desde Manychat:', error)
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
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      })

      if (!lead || !lead.manychatId) {
        return false
      }

      const subscriberId = parseInt(lead.manychatId)

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

      console.log(`Custom fields sincronizados para lead ${leadId}`)
      return true
    } catch (error) {
      console.error('Error sincronizando custom fields:', error)
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
      // 1. Sincronizar datos básicos del lead
      const success = await this.syncLeadToManychat(leadId)
      if (!success) {
        return false
      }

      // 2. Sincronizar tags si existen
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      })

      if (lead?.tags) {
        try {
          const tags = JSON.parse(lead.tags)
          if (Array.isArray(tags) && tags.length > 0) {
            await this.syncTagsToManychat(leadId, tags)
          }
        } catch (e) {
          console.error('Error parseando tags:', e)
        }
      }

      // 3. Sincronizar custom fields
      await this.syncCustomFieldsToManychat(leadId)

      return true
    } catch (error) {
      console.error('Error en sincronización completa:', error)
      return false
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Obtener logs de sincronización de un lead
   */
  static async getSyncLogs(leadId: string) {
    return await prisma.manychatSync.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  /**
   * Reintentar sincronizaciones fallidas
   */
  static async retryFailedSyncs(maxRetries: number = 3): Promise<number> {
    const failedSyncs = await prisma.manychatSync.findMany({
      where: {
        status: 'failed',
        retryCount: {
          lt: maxRetries,
        },
      },
      take: 10,
    })

    let successCount = 0

    for (const sync of failedSyncs) {
      if (sync.direction === 'to_manychat') {
        const success = await this.syncLeadToManychat(sync.leadId)
        if (success) successCount++
      }
    }

    return successCount
  }

  /**
   * Limpiar logs antiguos de sincronización
   */
  static async cleanupOldSyncLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.manychatSync.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: 'success',
      },
    })

    return result.count
  }
}

