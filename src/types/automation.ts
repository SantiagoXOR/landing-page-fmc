/**
 * Tipos para el sistema de automatizaciones del pipeline
 */

export interface AutomationRule {
  id: string
  name: string
  description?: string
  isActive: boolean
  priority: number // 1-10, mayor número = mayor prioridad
  
  // Trigger - cuándo se ejecuta
  trigger: AutomationTrigger
  
  // Condiciones - cuándo debe ejecutarse
  conditions: AutomationCondition[]
  
  // Acciones - qué hacer
  actions: AutomationAction[]
  
  // Configuración
  settings: AutomationSettings
  
  // Metadatos
  createdAt: Date
  updatedAt: Date
  createdBy: string
  lastExecuted?: Date
  executionCount: number
  successCount: number
  errorCount: number
}

export interface AutomationTrigger {
  type: 'stage_change' | 'field_update' | 'time_based' | 'lead_created' | 'task_completed' | 'email_received' | 'whatsapp_received' | 'manual'
  
  // Para stage_change
  fromStageId?: string
  toStageId?: string
  
  // Para field_update
  fieldName?: string
  
  // Para time_based
  schedule?: AutomationSchedule
  
  // Para eventos específicos
  eventType?: string
  
  // Configuración adicional
  metadata?: Record<string, any>
}

export interface AutomationSchedule {
  type: 'interval' | 'cron' | 'delay'
  
  // Para interval (cada X tiempo)
  intervalMinutes?: number
  intervalHours?: number
  intervalDays?: number
  
  // Para cron (horarios específicos)
  cronExpression?: string
  timezone?: string
  
  // Para delay (después de X tiempo del trigger)
  delayMinutes?: number
  delayHours?: number
  delayDays?: number
  
  // Límites
  maxExecutions?: number
  endDate?: Date
}

export interface AutomationCondition {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'exists' | 'not_exists' | 'in' | 'not_in' | 'regex'
  value?: any
  valueType: 'static' | 'field' | 'function' | 'user_input'
  
  // Para condiciones complejas
  logicalOperator?: 'AND' | 'OR'
  group?: string
  
  // Para valores dinámicos
  dynamicValue?: {
    type: 'current_user' | 'current_date' | 'lead_field' | 'stage_field' | 'custom_function'
    parameter?: string
  }
}

export interface AutomationAction {
  id: string
  type: 'send_email' | 'send_whatsapp' | 'create_task' | 'update_field' | 'move_stage' | 'create_note' | 'send_notification' | 'webhook' | 'wait' | 'custom_function'
  
  // Configuración específica por tipo
  config: AutomationActionConfig
  
  // Control de flujo
  continueOnError: boolean
  retryCount: number
  retryDelayMinutes: number
  
  // Condiciones para ejecutar esta acción
  executeIf?: AutomationCondition[]
}

export interface AutomationActionConfig {
  // Para send_email
  emailTemplate?: string
  emailTo?: string[]
  emailCc?: string[]
  emailSubject?: string
  emailBody?: string
  emailAttachments?: string[]
  
  // Para send_whatsapp
  whatsappTemplate?: string
  whatsappTo?: string
  whatsappMessage?: string
  
  // Para create_task
  taskTitle?: string
  taskDescription?: string
  taskType?: 'call' | 'email' | 'meeting' | 'follow_up' | 'document' | 'other'
  taskPriority?: 'low' | 'medium' | 'high'
  taskDueInDays?: number
  taskAssignedTo?: string
  
  // Para update_field
  fieldName?: string
  fieldValue?: any
  fieldOperation?: 'set' | 'add' | 'subtract' | 'append' | 'prepend'
  
  // Para move_stage
  targetStageId?: string
  moveReason?: string
  
  // Para create_note
  noteContent?: string
  noteType?: 'general' | 'call' | 'meeting' | 'email' | 'system'
  
  // Para send_notification
  notificationTitle?: string
  notificationMessage?: string
  notificationRecipients?: string[]
  notificationChannels?: ('email' | 'whatsapp' | 'in_app')[]
  
  // Para webhook
  webhookUrl?: string
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH'
  webhookHeaders?: Record<string, string>
  webhookBody?: any
  
  // Para wait
  waitMinutes?: number
  waitHours?: number
  waitDays?: number
  
  // Para custom_function
  functionName?: string
  functionParameters?: Record<string, any>
  
  // Variables dinámicas disponibles en todas las acciones
  variables?: Record<string, any>
}

export interface AutomationSettings {
  // Límites de ejecución
  maxExecutionsPerDay?: number
  maxExecutionsPerHour?: number
  maxExecutionsPerLead?: number
  
  // Horarios de ejecución
  allowedHours?: {
    start: string // "09:00"
    end: string   // "18:00"
  }
  allowedDays?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[]
  timezone?: string
  
  // Configuración de errores
  stopOnError: boolean
  notifyOnError: boolean
  errorNotificationRecipients?: string[]
  
  // Logging
  logLevel: 'none' | 'basic' | 'detailed' | 'debug'
  retentionDays: number
  
  // Configuración específica
  requireApproval?: boolean
  approvalUsers?: string[]
  
  // Variables globales para esta automatización
  globalVariables?: Record<string, any>
}

export interface AutomationExecution {
  id: string
  ruleId: string
  leadId: string
  triggeredBy: string
  triggeredAt: Date
  completedAt?: Date
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  
  // Contexto de ejecución
  triggerData: any
  leadData: any
  userContext: any
  
  // Resultados
  actionsExecuted: AutomationActionResult[]
  totalActions: number
  successfulActions: number
  failedActions: number
  
  // Errores
  error?: string
  errorDetails?: any
  
  // Métricas
  executionTimeMs: number
  
  // Logs
  logs: AutomationLog[]
}

export interface AutomationActionResult {
  actionId: string
  actionType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt: Date
  completedAt?: Date
  result?: any
  error?: string
  retryCount: number
  executionTimeMs: number
}

export interface AutomationLog {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: any
  actionId?: string
}

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: 'lead_nurturing' | 'follow_up' | 'notifications' | 'data_management' | 'integrations' | 'custom'
  tags: string[]
  
  // Template de la regla
  ruleTemplate: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastExecuted' | 'executionCount' | 'successCount' | 'errorCount'>
  
  // Variables que el usuario debe configurar
  requiredVariables: AutomationVariable[]
  
  // Metadatos
  isPublic: boolean
  createdBy: string
  createdAt: Date
  usageCount: number
  rating: number
}

export interface AutomationVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'select' | 'multiselect'
  label: string
  description?: string
  required: boolean
  defaultValue?: any
  options?: { label: string; value: any }[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    customValidator?: string
  }
}

export interface AutomationMetrics {
  totalRules: number
  activeRules: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageExecutionTime: number
  
  // Por período
  executionsToday: number
  executionsThisWeek: number
  executionsThisMonth: number
  
  // Por tipo de trigger
  triggerStats: Record<string, number>
  
  // Por tipo de acción
  actionStats: Record<string, number>
  
  // Errores más comunes
  commonErrors: {
    error: string
    count: number
    lastOccurrence: Date
  }[]
  
  // Reglas más utilizadas
  topRules: {
    ruleId: string
    ruleName: string
    executionCount: number
    successRate: number
  }[]
}

// Eventos del sistema de automatización
export interface AutomationEvent {
  id: string
  type: 'rule_created' | 'rule_updated' | 'rule_deleted' | 'rule_executed' | 'execution_failed' | 'execution_completed'
  ruleId: string
  executionId?: string
  leadId?: string
  userId: string
  timestamp: Date
  data: any
}

// Configuración global del sistema
export interface AutomationSystemConfig {
  isEnabled: boolean
  maxConcurrentExecutions: number
  defaultRetryCount: number
  defaultRetryDelayMinutes: number
  maxExecutionTimeMinutes: number
  
  // Límites globales
  maxRulesPerUser: number
  maxActionsPerRule: number
  maxConditionsPerRule: number
  
  // Configuración de notificaciones
  notifyOnSystemErrors: boolean
  systemErrorRecipients: string[]
  
  // Configuración de logging
  globalLogLevel: 'none' | 'basic' | 'detailed' | 'debug'
  logRetentionDays: number
  
  // Configuración de seguridad
  requireApprovalForWebhooks: boolean
  allowedWebhookDomains: string[]
  
  // Configuración de performance
  executionQueueSize: number
  cleanupIntervalHours: number
}
