import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ManychatService } from './manychat-service'
import { ManychatSyncService } from './manychat-sync-service'
import { ManychatSubscriber } from '@/types/manychat'
import { ConversationService } from './conversation-service'
import { ManychatHistorySyncService } from './manychat-history-sync-service'

export interface BulkSyncProgress {
  status: 'idle' | 'running' | 'completed' | 'error'
  total: number
  processed: number
  created: number
  updated: number
  errors: number
  messagesSynced?: number // Mensajes históricos sincronizados
  currentStep?: string
  errorMessages: string[]
  startedAt?: string
  completedAt?: string
}

export interface BulkSyncResult {
  success: boolean
  total: number
  created: number
  updated: number
  errors: number
  messagesSynced?: number // Mensajes históricos sincronizados
  errorMessages: string[]
  duration: number
}

/**
 * Servicio para sincronización masiva de contactos de ManyChat al CRM
 * 
 * Estrategia: Como ManyChat no tiene endpoint directo para listar todos los subscribers,
 * usamos una estrategia combinada:
 * 1. Sincronizar basándose en teléfonos que ya tenemos en el CRM
 * 2. Sincronizar basándose en manychatId conocidos
 * 3. Procesar en lotes con rate limiting
 */
export class ManychatBulkSyncService {
  private static syncProgress: Map<string, BulkSyncProgress> = new Map()

  /**
   * Iniciar sincronización masiva de contactos de ManyChat
   * 
   * Estrategia:
   * 1. Obtener todos los teléfonos de leads existentes en el CRM
   * 2. Buscar cada teléfono en ManyChat
   * 3. Sincronizar información encontrada
   * 4. También sincronizar leads que ya tienen manychatId pero necesitan actualización
   */
  static async startBulkSync(syncId: string = 'default'): Promise<BulkSyncResult> {
    const startTime = Date.now()
    
    try {
      if (!ManychatService.isConfigured()) {
        throw new Error('ManyChat no está configurado')
      }

      if (!supabase.client) {
        throw new Error('Base de datos no disponible')
      }

      // Inicializar progreso
      this.syncProgress.set(syncId, {
        status: 'running',
        total: 0,
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0,
        currentStep: 'Obteniendo teléfonos del CRM...',
        errorMessages: [],
        startedAt: new Date().toISOString()
      })

      logger.info('Iniciando sincronización masiva de ManyChat', { syncId })

      // Estrategia 1: Obtener todos los teléfonos de leads existentes
      const { data: leads, error: leadsError } = await supabase.client
        .from('Lead')
        .select('id, telefono, manychatId')
        .not('telefono', 'is', null)

      if (leadsError) {
        throw new Error(`Error obteniendo leads: ${leadsError.message}`)
      }

      const totalLeads = leads?.length || 0
      logger.info(`Encontrados ${totalLeads} leads para sincronizar`, { syncId })

      // Actualizar progreso
      const progress = this.syncProgress.get(syncId)!
      progress.total = totalLeads
      progress.currentStep = `Procesando ${totalLeads} contactos...`
      this.syncProgress.set(syncId, progress)

      const results = {
        created: 0,
        updated: 0,
        errors: 0,
        messagesSynced: 0,
        errorMessages: [] as string[]
      }

      // Procesar en lotes para evitar sobrecarga
      const batchSize = 10
      const batches: Array<typeof leads> = []
      
      for (let i = 0; i < totalLeads; i += batchSize) {
        batches.push(leads!.slice(i, i + batchSize))
      }

      logger.info(`Procesando en ${batches.length} lotes de ${batchSize} contactos`, { syncId })

      // Procesar cada lote
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        progress.currentStep = `Procesando lote ${batchIndex + 1} de ${batches.length}...`
        this.syncProgress.set(syncId, progress)

        // Procesar contactos del lote en paralelo (con rate limiting)
        const batchPromises = batch.map(async (lead) => {
          try {
            let subscriber: ManychatSubscriber | null = null

            // Prioridad 1: Si tiene manychatId, obtener por ID
            if (lead.manychatId) {
              try {
                const subscriberId = parseInt(String(lead.manychatId))
                if (!isNaN(subscriberId)) {
                  subscriber = await ManychatService.getSubscriberById(subscriberId)
                }
              } catch (error: any) {
                logger.debug(`No se pudo obtener subscriber por ID ${lead.manychatId}`, {
                  error: error.message
                })
              }
            }

            // Prioridad 2: Si no se encontró por ID, buscar por teléfono
            if (!subscriber && lead.telefono) {
              try {
                subscriber = await ManychatService.getSubscriberByPhone(lead.telefono)
              } catch (error: any) {
                logger.debug(`No se pudo obtener subscriber por teléfono ${lead.telefono}`, {
                  error: error.message
                })
              }
            }

            // Si encontramos el subscriber, sincronizar
            if (subscriber) {
              const leadId = await ManychatSyncService.syncManychatToLead(subscriber)
              
              if (leadId) {
                // Verificar si fue creación o actualización
                const { data: existingLead } = await supabase.client!
                  .from('Lead')
                  .select('createdAt')
                  .eq('id', leadId)
                  .single()

                if (existingLead) {
                  // Si el lead fue creado hace menos de 1 segundo, es nuevo
                  const createdAt = new Date(existingLead.createdAt)
                  const now = new Date()
                  const diffSeconds = (now.getTime() - createdAt.getTime()) / 1000
                  
                  if (diffSeconds < 2) {
                    results.created++
                  } else {
                    results.updated++
                  }
                } else {
                  results.updated++
                }

                // Crear o actualizar conversación
                await this.syncConversation(leadId, subscriber)

                // Intentar sincronizar último mensaje histórico si está disponible
                try {
                  const historyResult = await ManychatHistorySyncService.syncLastMessage(subscriber, leadId)
                  if (historyResult.success && historyResult.messageId) {
                    results.messagesSynced++
                    logger.debug(`Último mensaje sincronizado para lead ${leadId}`, {
                      messageId: historyResult.messageId
                    })
                  }
                } catch (historyError: any) {
                  // Error silencioso, no afecta la sincronización principal
                  logger.debug(`No se pudo sincronizar mensaje histórico para lead ${leadId}`, {
                    error: historyError.message
                  })
                }
              } else {
                results.errors++
                results.errorMessages.push(`No se pudo sincronizar lead ${lead.id}`)
              }
            } else {
              // No se encontró subscriber en ManyChat, pero el lead existe en el CRM
              // Esto es normal, no es un error
              logger.debug(`Subscriber no encontrado en ManyChat para lead ${lead.id}`, {
                telefono: lead.telefono,
                manychatId: lead.manychatId
              })
            }

            // Delay para respetar rate limits
            await new Promise(resolve => setTimeout(resolve, 50))

          } catch (error: any) {
            logger.error(`Error procesando lead ${lead.id}`, {
              error: error.message,
              leadId: lead.id
            })
            results.errors++
            results.errorMessages.push(`Error procesando lead ${lead.id}: ${error.message}`)
          }
        })

        await Promise.all(batchPromises)

        // Actualizar progreso
        progress.processed = Math.min((batchIndex + 1) * batchSize, totalLeads)
        progress.created = results.created
        progress.updated = results.updated
        progress.errors = results.errors
        progress.messagesSynced = results.messagesSynced
        progress.errorMessages = results.errorMessages.slice(-10) // Mantener solo últimos 10 errores
        this.syncProgress.set(syncId, progress)

        // Delay entre lotes
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      // Marcar como completado
      progress.status = 'completed'
      progress.currentStep = 'Sincronización completada'
      progress.completedAt = new Date().toISOString()
      this.syncProgress.set(syncId, progress)

      const duration = Date.now() - startTime

      logger.info('Sincronización masiva completada', {
        syncId,
        total: totalLeads,
        created: results.created,
        updated: results.updated,
        errors: results.errors,
        duration
      })

      return {
        success: true,
        total: totalLeads,
        created: results.created,
        updated: results.updated,
        errors: results.errors,
        messagesSynced: results.messagesSynced,
        errorMessages: results.errorMessages,
        duration
      }

    } catch (error: any) {
      logger.error('Error en sincronización masiva', {
        error: error.message,
        syncId
      })

      const progress = this.syncProgress.get(syncId)
      if (progress) {
        progress.status = 'error'
        progress.currentStep = `Error: ${error.message}`
        progress.errorMessages.push(error.message)
        progress.completedAt = new Date().toISOString()
        this.syncProgress.set(syncId, progress)
      }

      throw error
    }
  }

  /**
   * Sincronizar conversación para un lead
   */
  private static async syncConversation(
    leadId: string,
    subscriber: ManychatSubscriber
  ): Promise<void> {
    try {
      if (!supabase.client) {
        return
      }

      // Determinar plataforma
      const platform = subscriber.instagram_id ? 'instagram' : 'whatsapp'
      const platformId = subscriber.instagram_id || subscriber.whatsapp_phone || subscriber.phone || String(subscriber.id)

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

      // Actualizar última actividad si hay last_interaction
      if (subscriber.last_interaction && conversation) {
        const lastInteractionDate = new Date(subscriber.last_interaction)
        await supabase.client
          .from('conversations')
          .update({ 
            last_message_at: lastInteractionDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.id)
      }

    } catch (error: any) {
      logger.error('Error sincronizando conversación', {
        error: error.message,
        leadId,
        subscriberId: subscriber.id
      })
    }
  }

  /**
   * Obtener progreso de sincronización
   */
  static getProgress(syncId: string = 'default'): BulkSyncProgress | null {
    return this.syncProgress.get(syncId) || null
  }

  /**
   * Limpiar progreso de sincronización
   */
  static clearProgress(syncId: string = 'default'): void {
    this.syncProgress.delete(syncId)
  }

  /**
   * Obtener todos los progresos activos
   */
  static getAllProgress(): Map<string, BulkSyncProgress> {
    return new Map(this.syncProgress)
  }
}

