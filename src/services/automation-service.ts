/**
 * Servicio principal para el sistema de automatizaciones
 */

import { 
  AutomationRule, 
  AutomationExecution, 
  AutomationMetrics,
  AutomationTemplate,
  AutomationEvent,
  AutomationTrigger,
  AutomationAction,
  AutomationActionResult,
  AutomationLog
} from '@/types/automation'
import { PipelineLead } from '@/types/pipeline'
import { logger } from '@/lib/logger'
import { ManychatService } from '@/server/services/manychat-service'
import { ConversationService } from '@/server/services/conversation-service'
import { supabase } from '@/lib/db'

// Importar las reglas directamente cuando estamos en el servidor
let mockAutomationRules: AutomationRule[] | null = null

// Función para obtener las reglas directamente (sin fetch) cuando estamos en el servidor
async function getRulesDirectly(filters?: {
  isActive?: boolean
  trigger?: string
  category?: string
}): Promise<AutomationRule[]> {
  // Lazy load de las reglas
  if (!mockAutomationRules) {
    // Importar dinámicamente las reglas del route handler
    try {
      const rulesModule = await import('@/app/api/automation/rules/route')
      // Las reglas están en el módulo, pero necesitamos accederlas de otra forma
      // Por ahora, las definimos aquí también
      mockAutomationRules = [
        {
          id: 'rule-1',
          name: 'Seguimiento Automático - Lead Nuevo',
          description: 'Crear tarea de seguimiento cuando un lead entra en la etapa "Nuevo"',
          isActive: true,
          priority: 8,
          trigger: { type: 'stage_change', toStageId: 'nuevo' },
          conditions: [],
          actions: [{
            id: 'action-1',
            type: 'create_task',
            config: {
              taskTitle: 'Contactar lead nuevo',
              taskDescription: 'Realizar primer contacto con el lead para calificar interés',
              taskType: 'call',
              taskPriority: 'high',
              taskDueInDays: 1,
              taskAssignedTo: 'auto'
            },
            continueOnError: true,
            retryCount: 2,
            retryDelayMinutes: 5
          }],
          settings: {
            maxExecutionsPerLead: 1,
            allowedHours: { start: '09:00', end: '18:00' },
            allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            timezone: 'America/Argentina/Buenos_Aires',
            stopOnError: false,
            notifyOnError: true,
            logLevel: 'basic',
            retentionDays: 30
          },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          createdBy: 'admin',
          executionCount: 45,
          successCount: 43,
          errorCount: 2
        },
        {
          id: 'rule-2',
          name: 'WhatsApp de Bienvenida',
          description: 'Enviar mensaje de bienvenida por WhatsApp a leads de alta prioridad',
          isActive: true,
          priority: 9,
          trigger: { type: 'lead_created' },
          conditions: [
            {
              id: 'cond-1',
              field: 'priority',
              operator: 'in',
              value: ['high', 'urgent'],
              valueType: 'static'
            },
            {
              id: 'cond-2',
              field: 'origen',
              operator: 'equals',
              value: 'WhatsApp',
              valueType: 'static'
            }
          ],
          actions: [{
            id: 'action-2',
            type: 'send_whatsapp',
            config: {
              whatsappTemplate: 'bienvenida_lead',
              whatsappMessage: '¡Hola {{nombre}}! Gracias por contactarnos. En breve un asesor se comunicará contigo para ayudarte con tu consulta sobre propiedades en Formosa.'
            },
            continueOnError: true,
            retryCount: 3,
            retryDelayMinutes: 10
          }],
          settings: {
            maxExecutionsPerLead: 1,
            logLevel: 'detailed',
            retentionDays: 60,
            stopOnError: false,
            notifyOnError: true,
            timezone: 'America/Argentina/Buenos_Aires'
          },
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-02-01'),
          createdBy: 'manager',
          executionCount: 28,
          successCount: 26,
          errorCount: 2
        },
        {
          id: 'rule-3-rechazado',
          name: 'Mensaje de Crédito Rechazado',
          description: 'Enviar mensaje automático cuando un lead pasa a la etapa de crédito rechazado',
          isActive: true,
          priority: 9,
          trigger: {
            type: 'stage_change',
            toStageId: 'rechazado'
          },
          conditions: [],
          actions: [{
            id: 'action-rechazado-1',
            type: 'send_whatsapp',
            config: {
              whatsappMessage: 'Hola {{nombre}}, lamentamos informarte que tu solicitud de crédito no pudo ser aprobada en esta oportunidad. Si tienes alguna consulta o deseas más información, nuestro equipo está disponible para ayudarte. Gracias por confiar en nosotros.'
            },
            continueOnError: true,
            retryCount: 2,
            retryDelayMinutes: 5
          }],
          settings: {
            maxExecutionsPerLead: 1,
            allowedHours: { start: '09:00', end: '20:00' },
            allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            timezone: 'America/Argentina/Buenos_Aires',
            stopOnError: false,
            notifyOnError: true,
            logLevel: 'detailed',
            retentionDays: 30
          },
          createdAt: new Date('2024-12-16'),
          updatedAt: new Date('2024-12-16'),
          createdBy: 'system',
          executionCount: 0,
          successCount: 0,
          errorCount: 0
        },
        {
          id: 'rule-3',
          name: 'Recordatorio Propuesta Vencida',
          description: 'Notificar cuando una propuesta lleva más de 7 días sin respuesta',
          isActive: true,
          priority: 6,
          trigger: {
            type: 'time_based',
            schedule: {
              type: 'interval',
              intervalDays: 1
            }
          },
          conditions: [
            {
              id: 'cond-3',
              field: 'stageId',
              operator: 'equals',
              value: 'propuesta',
              valueType: 'static'
            },
            {
              id: 'cond-4',
              field: 'stageEntryDate',
              operator: 'less_than',
              value: 7,
              valueType: 'function',
              dynamicValue: {
                type: 'current_date',
                parameter: 'days_ago'
              }
            }
          ],
          actions: [
            {
              id: 'action-3',
              type: 'send_notification',
              config: {
                notificationTitle: 'Propuesta sin respuesta',
                notificationMessage: 'El lead {{nombre}} tiene una propuesta pendiente hace {{dias_en_etapa}} días',
                notificationRecipients: ['assigned_user', 'manager'],
                notificationChannels: ['email', 'in_app']
              },
              continueOnError: true,
              retryCount: 1,
              retryDelayMinutes: 30
            },
            {
              id: 'action-4',
              type: 'create_task',
              config: {
                taskTitle: 'Seguimiento propuesta vencida',
                taskDescription: 'Contactar al lead para conocer el estado de la propuesta',
                taskType: 'follow_up',
                taskPriority: 'medium',
                taskDueInDays: 1
              },
              continueOnError: true,
              retryCount: 0,
              retryDelayMinutes: 0
            }
          ],
          settings: {
            maxExecutionsPerLead: 3,
            allowedHours: { start: '08:00', end: '20:00' },
            logLevel: 'detailed',
            retentionDays: 90,
            stopOnError: false,
            notifyOnError: true,
            timezone: 'America/Argentina/Buenos_Aires'
          },
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-15'),
          createdBy: 'admin',
          executionCount: 12,
          successCount: 11,
          errorCount: 1
        }
      ]
    } catch (error) {
      logger.error('Error loading automation rules directly', { error })
      mockAutomationRules = []
    }
  }

  let filteredRules = [...mockAutomationRules]

  // Aplicar filtros
  if (filters?.isActive !== undefined) {
    filteredRules = filteredRules.filter(rule => rule.isActive === filters.isActive)
  }

  if (filters?.trigger) {
    filteredRules = filteredRules.filter(rule => rule.trigger.type === filters.trigger)
  }

  // Ordenar por prioridad
  filteredRules.sort((a, b) => b.priority - a.priority)

  return filteredRules
}

export class AutomationService {
  private baseUrl: string
  private executionQueue: Map<string, AutomationExecution> = new Map()
  private isProcessing = false

  constructor(baseUrl?: string) {
    // Si no se proporciona baseUrl, detectar automáticamente
    if (baseUrl) {
      this.baseUrl = baseUrl
    } else {
      // En el servidor, construir URL absoluta
      if (typeof window === 'undefined') {
        // Server-side: usar URL absoluta
        const serverUrl = 
          process.env.NEXTAUTH_URL || 
          process.env.NEXT_PUBLIC_SITE_URL || 
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
          'http://localhost:3000'
        this.baseUrl = serverUrl + '/api'
      } else {
        // Client-side: usar URL relativa
        this.baseUrl = '/api'
      }
    }
  }

  // ==================== GESTIÓN DE REGLAS ====================

  /**
   * Obtener todas las reglas de automatización
   */
  async getRules(filters?: {
    isActive?: boolean
    trigger?: string
    category?: string
  }): Promise<AutomationRule[]> {
    // En el servidor, acceder directamente a las reglas sin usar fetch
    if (typeof window === 'undefined') {
      try {
        return await getRulesDirectly(filters)
      } catch (error) {
        logger.error('Error getting automation rules directly', {
          error: error instanceof Error ? error.message : 'Unknown error',
          filters
        })
        throw error
      }
    }

    // En el cliente, usar fetch
    try {
      const queryParams = filters ? `?${new URLSearchParams(filters as any).toString()}` : ''
      const url = `${this.baseUrl}/automation/rules${queryParams}`
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error al obtener reglas de automatización: ${response.status} ${response.statusText} - ${errorText}`)
      }
      
      return response.json()
    } catch (error) {
      logger.error('Error fetching automation rules via fetch', {
        error: error instanceof Error ? error.message : 'Unknown error',
        baseUrl: this.baseUrl,
        filters
      })
      throw error
    }
  }

  /**
   * Crear nueva regla de automatización
   */
  async createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successCount' | 'errorCount'>): Promise<AutomationRule> {
    const response = await fetch(`${this.baseUrl}/automation/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    })

    if (!response.ok) {
      throw new Error('Error al crear regla de automatización')
    }

    return response.json()
  }

  /**
   * Actualizar regla existente
   */
  async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    const response = await fetch(`${this.baseUrl}/automation/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Error al actualizar regla de automatización')
    }

    return response.json()
  }

  /**
   * Eliminar regla
   */
  async deleteRule(ruleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/automation/rules/${ruleId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Error al eliminar regla de automatización')
    }
  }

  /**
   * Activar/desactivar regla
   */
  async toggleRule(ruleId: string, isActive: boolean): Promise<AutomationRule> {
    return this.updateRule(ruleId, { isActive })
  }

  // ==================== EJECUCIÓN DE AUTOMATIZACIONES ====================

  /**
   * Ejecutar automatizaciones basadas en un trigger
   */
  async executeTrigger(trigger: AutomationTrigger, leadId: string, userId: string, triggerData?: any): Promise<void> {
    try {
      // Obtener reglas que coincidan con el trigger
      const rules = await this.getMatchingRules(trigger)
      
      if (rules.length === 0) {
        logger.info('No automation rules found for trigger', { trigger, leadId })
        return
      }

      // Obtener datos del lead
      const lead = await this.getLeadData(leadId)
      
      // Ejecutar cada regla
      for (const rule of rules) {
        if (!rule.isActive) continue
        
        try {
          await this.executeRule(rule, lead, userId, triggerData)
        } catch (error) {
          logger.error('Error executing automation rule', {
            ruleId: rule.id,
            ruleName: rule.name,
            leadId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    } catch (error) {
      logger.error('Error in automation trigger execution', {
        trigger,
        leadId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Ejecutar una regla específica
   */
  async executeRule(rule: AutomationRule, lead: PipelineLead, userId: string, triggerData?: any): Promise<AutomationExecution> {
    const execution: AutomationExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      leadId: lead.id,
      triggeredBy: userId,
      triggeredAt: new Date(),
      status: 'pending',
      triggerData: triggerData || {},
      leadData: lead,
      userContext: { userId },
      actionsExecuted: [],
      totalActions: rule.actions.length,
      successfulActions: 0,
      failedActions: 0,
      executionTimeMs: 0,
      logs: []
    }

    // Agregar a la cola de ejecución
    this.executionQueue.set(execution.id, execution)

    // Procesar la cola si no se está procesando
    if (!this.isProcessing) {
      this.processExecutionQueue()
    }

    return execution
  }

  /**
   * Procesar cola de ejecuciones
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true

    try {
      while (this.executionQueue.size > 0) {
        const entry = this.executionQueue.entries().next().value
        if (!entry) break

        const [executionId, execution] = entry
        this.executionQueue.delete(executionId)

        await this.processExecution(execution)
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Procesar una ejecución individual
   */
  private async processExecution(execution: AutomationExecution): Promise<void> {
    const startTime = Date.now()
    execution.status = 'running'

    try {
      // Obtener la regla
      const rule = await this.getRule(execution.ruleId)
      if (!rule) {
        throw new Error(`Rule ${execution.ruleId} not found`)
      }

      // Verificar condiciones
      const conditionsMet = await this.evaluateConditions(rule.conditions, execution.leadData, execution.userContext)
      if (!conditionsMet) {
        execution.status = 'completed'
        execution.logs.push({
          id: `log-${Date.now()}`,
          timestamp: new Date(),
          level: 'info',
          message: 'Execution skipped - conditions not met'
        })
        return
      }

      // Ejecutar acciones
      for (const action of rule.actions) {
        const actionResult = await this.executeAction(action, execution)
        execution.actionsExecuted.push(actionResult)

        if (actionResult.status === 'completed') {
          execution.successfulActions++
        } else if (actionResult.status === 'failed') {
          execution.failedActions++
          
          if (!action.continueOnError) {
            break
          }
        }
      }

      execution.status = 'completed'
      execution.completedAt = new Date()

    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.logs.push({
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        level: 'error',
        message: `Execution failed: ${execution.error}`
      })
    } finally {
      execution.executionTimeMs = Date.now() - startTime
      
      // Guardar ejecución en base de datos
      await this.saveExecution(execution)
      
      // Actualizar estadísticas de la regla
      await this.updateRuleStats(execution.ruleId, execution.status === 'completed')
    }
  }

  /**
   * Ejecutar una acción específica
   */
  private async executeAction(action: AutomationAction, execution: AutomationExecution): Promise<AutomationActionResult> {
    const startTime = Date.now()
    const result: AutomationActionResult = {
      actionId: action.id,
      actionType: action.type,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0,
      executionTimeMs: 0
    }

    try {
      // Verificar condiciones específicas de la acción
      if (action.executeIf && action.executeIf.length > 0) {
        const conditionsMet = await this.evaluateConditions(action.executeIf, execution.leadData, execution.userContext)
        if (!conditionsMet) {
          result.status = 'skipped'
          result.completedAt = new Date()
          return result
        }
      }

      // Ejecutar la acción según su tipo
      switch (action.type) {
        case 'send_email':
          result.result = await this.executeEmailAction(action, execution)
          break
        
        case 'send_whatsapp':
          result.result = await this.executeWhatsAppAction(action, execution)
          break
        
        case 'create_task':
          result.result = await this.executeCreateTaskAction(action, execution)
          break
        
        case 'update_field':
          result.result = await this.executeUpdateFieldAction(action, execution)
          break
        
        case 'move_stage':
          result.result = await this.executeMoveStageAction(action, execution)
          break
        
        case 'create_note':
          result.result = await this.executeCreateNoteAction(action, execution)
          break
        
        case 'send_notification':
          result.result = await this.executeSendNotificationAction(action, execution)
          break
        
        case 'webhook':
          result.result = await this.executeWebhookAction(action, execution)
          break
        
        case 'wait':
          result.result = await this.executeWaitAction(action, execution)
          break
        
        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      result.status = 'completed'
      result.completedAt = new Date()

    } catch (error) {
      result.status = 'failed'
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.completedAt = new Date()

      // Reintentar si está configurado
      if (result.retryCount < action.retryCount) {
        result.retryCount++
        
        // Esperar antes del reintento
        if (action.retryDelayMinutes > 0) {
          await new Promise(resolve => setTimeout(resolve, action.retryDelayMinutes * 60 * 1000))
        }
        
        // Reintentar recursivamente
        return this.executeAction(action, execution)
      }
    } finally {
      result.executionTimeMs = Date.now() - startTime
    }

    return result
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Obtener reglas que coincidan con un trigger
   */
  private async getMatchingRules(trigger: AutomationTrigger): Promise<AutomationRule[]> {
    const allRules = await this.getRules({ isActive: true })
    
    return allRules.filter(rule => {
      const ruleTrigger = rule.trigger
      
      // Verificar tipo de trigger
      if (ruleTrigger.type !== trigger.type) return false
      
      // Verificaciones específicas por tipo
      switch (trigger.type) {
        case 'stage_change':
          return (!ruleTrigger.fromStageId || ruleTrigger.fromStageId === trigger.fromStageId) &&
                 (!ruleTrigger.toStageId || ruleTrigger.toStageId === trigger.toStageId)
        
        case 'field_update':
          return ruleTrigger.fieldName === trigger.fieldName
        
        default:
          return true
      }
    }).sort((a, b) => b.priority - a.priority) // Ordenar por prioridad
  }

  /**
   * Obtener datos del lead
   */
  private async getLeadData(leadId: string): Promise<PipelineLead> {
    try {
      const url = `${this.baseUrl}/leads/${leadId}`
      
      // Validar que la URL sea válida
      if (typeof window === 'undefined' && !url.startsWith('http')) {
        throw new Error(`Invalid URL for server-side fetch: ${url}. baseUrl should be absolute in server context.`)
      }
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Lead ${leadId} not found: ${response.status} ${response.statusText} - ${errorText}`)
      }
      return response.json()
    } catch (error) {
      logger.error('Error fetching lead data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        leadId,
        baseUrl: this.baseUrl
      })
      throw error
    }
  }

  /**
   * Obtener regla por ID
   */
  private async getRule(ruleId: string): Promise<AutomationRule | null> {
    try {
      const url = `${this.baseUrl}/automation/rules/${ruleId}`
      
      // Validar que la URL sea válida
      if (typeof window === 'undefined' && !url.startsWith('http')) {
        logger.warn(`Invalid URL for server-side fetch: ${url}`)
        return null
      }
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) return null
      return response.json()
    } catch (error) {
      logger.error('Error fetching rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ruleId,
        baseUrl: this.baseUrl
      })
      return null
    }
  }

  /**
   * Evaluar condiciones
   */
  private async evaluateConditions(conditions: any[], leadData: any, userContext: any): Promise<boolean> {
    if (conditions.length === 0) return true
    
    // Implementación simplificada - en producción sería más compleja
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(condition.field, leadData, userContext)
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value)
      
      if (!conditionMet) return false
    }
    
    return true
  }

  /**
   * Obtener valor de campo
   */
  private getFieldValue(fieldPath: string, leadData: any, userContext: any): any {
    // Implementación simplificada para acceder a campos anidados
    const parts = fieldPath.split('.')
    let value = leadData
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part]
      } else {
        return undefined
      }
    }
    
    return value
  }

  /**
   * Evaluar condición individual
   */
  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue
      case 'not_equals':
        return fieldValue !== expectedValue
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue)
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue)
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase())
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase())
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null
      default:
        return false
    }
  }

  // Métodos de ejecución de acciones (implementaciones simplificadas)
  private async executeEmailAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    // Implementar envío de email
    return { sent: true, messageId: `email-${Date.now()}` }
  }

  private async executeWhatsAppAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    try {
      const lead = execution.leadData
      const config = action.config || {}
      
      // Obtener mensaje del template o config
      let message = config.whatsappMessage || ''
      
      // Reemplazar variables en el mensaje
      if (message && lead) {
        message = message
          .replace(/\{\{nombre\}\}/g, lead.name || lead.firstName || 'Cliente')
          .replace(/\{\{email\}\}/g, lead.email || '')
          .replace(/\{\{telefono\}\}/g, lead.phone || '')
          .replace(/\{\{etapa\}\}/g, lead.stageId || '')
      }
      
      // Verificar que el lead tenga manychatId
      if (!lead.manychatId) {
        logger.warn('Lead no tiene manychatId, no se puede enviar mensaje de automatización', {
          leadId: lead.id,
          actionId: action.id
        })
        throw new Error('Lead no tiene manychatId asociado')
      }
      
      const manychatId = typeof lead.manychatId === 'string' 
        ? parseInt(lead.manychatId, 10) 
        : lead.manychatId
      
      if (isNaN(manychatId) || manychatId === 0) {
        throw new Error(`ManyChat ID inválido: ${lead.manychatId}`)
      }

      // Verificar si hay conversaciones cerradas para este lead y reabrirlas si es necesario
      // Esto asegura que los mensajes automatizados se puedan enviar incluso si la conversación estaba cerrada
      try {
        if (lead.id && supabase.client) {
          const { data: conversations, error: conversationsError } = await supabase.client
            .from('conversations')
            .select('id, status, platform, platform_id')
            .eq('lead_id', lead.id)
            .eq('status', 'closed')
            .limit(10)

          if (conversationsError) {
            logger.warn('Error obteniendo conversaciones cerradas', {
              leadId: lead.id,
              error: conversationsError.message
            })
          } else if (conversations && conversations.length > 0) {
            logger.info('Encontradas conversaciones cerradas, reabriéndolas para permitir envío de automatización', {
              leadId: lead.id,
              closedConversationsCount: conversations.length
            })

            // Reabrir todas las conversaciones cerradas
            for (const conv of conversations) {
              try {
                const { error: updateError } = await supabase.client
                  .from('conversations')
                  .update({ 
                    status: 'open',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', conv.id)
                
                if (updateError) {
                  logger.warn('Error reabriendo conversación', {
                    conversationId: conv.id,
                    error: updateError.message
                  })
                } else {
                  logger.info('Conversación reabierta para automatización', {
                    conversationId: conv.id,
                    platform: conv.platform,
                    leadId: lead.id
                  })
                }
              } catch (reopenError) {
                logger.warn('Error reabriendo conversación (excepción)', {
                  conversationId: conv.id,
                  error: reopenError instanceof Error ? reopenError.message : 'Unknown error'
                })
                // Continuar aunque falle reabrir una conversación
              }
            }
          }
        }
      } catch (conversationCheckError) {
        // No bloquear el envío si falla la verificación de conversaciones
        logger.warn('Error verificando estado de conversaciones', {
          leadId: lead.id,
          error: conversationCheckError instanceof Error ? conversationCheckError.message : 'Unknown error'
        })
      }
      
      // Enviar mensaje usando ManyChat
      const result = await ManychatService.sendMessage(
        manychatId,
        [{
          type: 'text',
          text: message
        }],
        `automation-${execution.ruleId}`
      )
      
      if (result.status === 'error') {
        logger.error('Error enviando mensaje de automatización por ManyChat', {
          leadId: lead.id,
          manychatId,
          error: result.error,
          errorCode: result.error_code
        })
        throw new Error(result.error || 'Error enviando mensaje por ManyChat')
      }
      
      logger.info('Mensaje de automatización enviado exitosamente', {
        leadId: lead.id,
        manychatId,
        messageId: result.data?.message_id,
        ruleId: execution.ruleId
      })
      
      return { 
        sent: true, 
        messageId: result.data?.message_id || `whatsapp-${Date.now()}`,
        manychatId,
        channel: 'whatsapp' // Manychat siempre usa WhatsApp para estos mensajes
      }
    } catch (error) {
      logger.error('Error ejecutando acción WhatsApp en automatización', {
        error: error instanceof Error ? error.message : 'Unknown error',
        leadId: execution.leadId,
        actionId: action.id,
        ruleId: execution.ruleId
      })
      throw error
    }
  }

  private async executeCreateTaskAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    // Implementar creación de tarea
    return { taskId: `task-${Date.now()}`, created: true }
  }

  private async executeUpdateFieldAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    // Implementar actualización de campo
    return { updated: true, field: action.config.fieldName, value: action.config.fieldValue }
  }

  private async executeMoveStageAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    // Implementar movimiento de etapa
    return { moved: true, toStage: action.config.targetStageId }
  }

  private async executeCreateNoteAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    // Implementar creación de nota
    return { noteId: `note-${Date.now()}`, created: true }
  }

  private async executeSendNotificationAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    // Implementar envío de notificación
    return { sent: true, notificationId: `notif-${Date.now()}` }
  }

  private async executeWebhookAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    // Implementar webhook
    return { called: true, status: 200 }
  }

  private async executeWaitAction(action: AutomationAction, execution: AutomationExecution): Promise<any> {
    const waitMs = (action.config.waitMinutes || 0) * 60 * 1000 +
                   (action.config.waitHours || 0) * 60 * 60 * 1000 +
                   (action.config.waitDays || 0) * 24 * 60 * 60 * 1000
    
    await new Promise(resolve => setTimeout(resolve, waitMs))
    return { waited: true, durationMs: waitMs }
  }

  private async saveExecution(execution: AutomationExecution): Promise<void> {
    // Guardar en base de datos
    await fetch(`${this.baseUrl}/automation/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(execution)
    })
  }

  private async updateRuleStats(ruleId: string, success: boolean): Promise<void> {
    // Actualizar estadísticas de la regla
    await fetch(`${this.baseUrl}/automation/rules/${ruleId}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success })
    })
  }

  // ==================== MÉTRICAS Y TEMPLATES ====================

  /**
   * Obtener métricas del sistema de automatización
   */
  async getMetrics(): Promise<AutomationMetrics> {
    const response = await fetch(`${this.baseUrl}/automation/metrics`)
    if (!response.ok) {
      throw new Error('Error al obtener métricas de automatización')
    }
    return response.json()
  }

  /**
   * Obtener templates disponibles
   */
  async getTemplates(): Promise<AutomationTemplate[]> {
    const response = await fetch(`${this.baseUrl}/automation/templates`)
    if (!response.ok) {
      throw new Error('Error al obtener templates de automatización')
    }
    return response.json()
  }

  /**
   * Crear regla desde template
   */
  async createFromTemplate(templateId: string, variables: Record<string, any>): Promise<AutomationRule> {
    const response = await fetch(`${this.baseUrl}/automation/templates/${templateId}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables })
    })

    if (!response.ok) {
      throw new Error('Error al crear regla desde template')
    }

    return response.json()
  }

  /**
   * Obtener historial de ejecuciones
   */
  async getExecutions(filters?: {
    ruleId?: string
    leadId?: string
    status?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
  }): Promise<AutomationExecution[]> {
    const queryParams = filters ? `?${new URLSearchParams(filters as any).toString()}` : ''
    const response = await fetch(`${this.baseUrl}/automation/executions${queryParams}`)

    if (!response.ok) {
      throw new Error('Error al obtener ejecuciones')
    }

    return response.json()
  }
}

// Instancia singleton del servicio
export const automationService = new AutomationService()
