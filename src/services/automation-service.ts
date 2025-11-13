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

export class AutomationService {
  private baseUrl: string
  private executionQueue: Map<string, AutomationExecution> = new Map()
  private isProcessing = false

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
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
    const queryParams = filters ? `?${new URLSearchParams(filters as any).toString()}` : ''
    const response = await fetch(`${this.baseUrl}/automation/rules${queryParams}`)
    
    if (!response.ok) {
      throw new Error('Error al obtener reglas de automatización')
    }
    
    return response.json()
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
    const response = await fetch(`${this.baseUrl}/leads/${leadId}`)
    if (!response.ok) {
      throw new Error(`Lead ${leadId} not found`)
    }
    return response.json()
  }

  /**
   * Obtener regla por ID
   */
  private async getRule(ruleId: string): Promise<AutomationRule | null> {
    try {
      const response = await fetch(`${this.baseUrl}/automation/rules/${ruleId}`)
      if (!response.ok) return null
      return response.json()
    } catch {
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
    // Implementar envío de WhatsApp
    return { sent: true, messageId: `whatsapp-${Date.now()}` }
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
