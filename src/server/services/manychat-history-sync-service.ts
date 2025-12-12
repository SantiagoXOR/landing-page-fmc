import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ManychatService } from './manychat-service'
import { ManychatSubscriber, ManychatWebhookMessage } from '@/types/manychat'
import { ConversationService } from './conversation-service'
import { ManychatWebhookService } from './manychat-webhook-service'

/**
 * Servicio para sincronizar mensajes históricos de ManyChat
 * 
 * Limitación: ManyChat no proporciona un endpoint para obtener el historial completo de mensajes.
 * Este servicio sincroniza el último mensaje conocido cuando está disponible en la información del subscriber.
 */
export class ManychatHistorySyncService {
  /**
   * Sincronizar último mensaje conocido de un subscriber
   * Solo funciona si el subscriber tiene last_input_text disponible
   */
  static async syncLastMessage(
    subscriber: ManychatSubscriber,
    leadId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      // Obtener último mensaje conocido del subscriber
      const lastMessage = ManychatService.getLastMessageFromSubscriber(subscriber)

      if (!lastMessage) {
        // No hay mensaje disponible, no es un error
        return { success: true }
      }

      // Determinar plataforma y platformId
      const platform = subscriber.instagram_id || subscriber.ig_id ? 'instagram' : 'whatsapp'
      const platformId = String(
        subscriber.instagram_id || 
        subscriber.ig_id || 
        subscriber.whatsapp_phone || 
        subscriber.phone || 
        subscriber.id
      )

      // Buscar o crear conversación
      let conversation = await ConversationService.findConversationByPlatform(platform, platformId)

      if (!conversation) {
        conversation = await ConversationService.createConversation({
          platform,
          platformId,
          leadId
        })
      } else if (!conversation.lead_id && leadId) {
        // Actualizar lead_id si no lo tiene
        await supabase.client
          .from('conversations')
          .update({ 
            lead_id: leadId,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.id)
      }

      if (!conversation) {
        return { success: false, error: 'No se pudo crear o encontrar conversación' }
      }

      // Guardar mensaje usando el servicio de webhook existente
      const messageId = await ManychatWebhookService.saveMessage(
        conversation.id,
        lastMessage,
        'inbound'
      )

      if (!messageId) {
        return { success: false, error: 'No se pudo guardar el mensaje' }
      }

      logger.info('Último mensaje sincronizado exitosamente', {
        leadId,
        subscriberId: subscriber.id,
        messageId,
        conversationId: conversation.id
      })

      return { success: true, messageId }

    } catch (error: any) {
      logger.error('Error sincronizando último mensaje', {
        error: error.message,
        leadId,
        subscriberId: subscriber.id
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Sincronizar mensajes históricos para múltiples contactos
   * Procesa en lotes para evitar sobrecarga
   */
  static async syncHistoryForLeads(
    leadIds: string[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{
    success: boolean
    processed: number
    synced: number
    errors: number
    errorMessages: string[]
  }> {
    const results = {
      processed: 0,
      synced: 0,
      errors: 0,
      errorMessages: [] as string[]
    }

    try {
      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      if (!ManychatService.isConfigured()) {
        throw new Error('ManyChat no está configurado')
      }

      // Procesar en lotes
      const batchSize = 5
      const batches: string[][] = []
      
      for (let i = 0; i < leadIds.length; i += batchSize) {
        batches.push(leadIds.slice(i, i + batchSize))
      }

      logger.info(`Sincronizando mensajes históricos para ${leadIds.length} leads en ${batches.length} lotes`)

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        // Procesar cada lead del lote
        const batchPromises = batch.map(async (leadId) => {
          try {
            results.processed++

            // Obtener lead del CRM
            const { data: lead, error: leadError } = await supabase.client!
              .from('Lead')
              .select('id, manychatId, telefono')
              .eq('id', leadId)
              .single()

            if (leadError || !lead) {
              results.errors++
              results.errorMessages.push(`Lead ${leadId} no encontrado`)
              return
            }

            let subscriber: ManychatSubscriber | null = null

            // Intentar obtener subscriber por manychatId
            if (lead.manychatId) {
              try {
                // Usar manychatId como string directamente para evitar problemas con IDs grandes
                const subscriberId = String(lead.manychatId).trim()
                if (subscriberId && subscriberId !== 'null' && subscriberId !== 'undefined' && subscriberId !== 'NaN') {
                  subscriber = await ManychatService.getSubscriberById(subscriberId)
                }
              } catch (error: any) {
                logger.debug(`No se pudo obtener subscriber por ID ${lead.manychatId}`, {
                  error: error.message
                })
              }
            }

            // Si no se encontró por ID, intentar por teléfono
            if (!subscriber && lead.telefono) {
              try {
                subscriber = await ManychatService.getSubscriberByPhone(lead.telefono)
              } catch (error: any) {
                logger.debug(`No se pudo obtener subscriber por teléfono ${lead.telefono}`, {
                  error: error.message
                })
              }
            }

            if (!subscriber) {
              // No se encontró subscriber, no es un error crítico
              logger.debug(`Subscriber no encontrado para lead ${leadId}`)
              return
            }

            // Sincronizar último mensaje si está disponible
            const syncResult = await this.syncLastMessage(subscriber, leadId)

            if (syncResult.success && syncResult.messageId) {
              results.synced++
            } else if (!syncResult.success) {
              results.errors++
              results.errorMessages.push(`Error sincronizando mensaje para lead ${leadId}: ${syncResult.error}`)
            }

            // Delay para respetar rate limits
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (error: any) {
            logger.error(`Error procesando lead ${leadId}`, {
              error: error.message,
              leadId
            })
            results.errors++
            results.errorMessages.push(`Error procesando lead ${leadId}: ${error.message}`)
          }
        })

        await Promise.all(batchPromises)

        // Notificar progreso
        if (onProgress) {
          onProgress(results.processed, leadIds.length)
        }

        // Delay entre lotes
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      logger.info('Sincronización de mensajes históricos completada', {
        processed: results.processed,
        synced: results.synced,
        errors: results.errors
      })

      return {
        success: true,
        ...results
      }

    } catch (error: any) {
      logger.error('Error en sincronización de mensajes históricos', {
        error: error.message
      })
      return {
        success: false,
        ...results,
        errorMessages: [...results.errorMessages, error.message]
      }
    }
  }
}

