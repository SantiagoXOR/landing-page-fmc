/**
 * Tipos para el sistema de pipeline avanzado
 */

export interface PipelineStage {
  id: string
  name: string
  description?: string
  color: string
  order: number
  isActive: boolean
  rules?: StageRule[]
  automation?: StageAutomation[]
  metrics?: StageMetrics
}

export interface StageRule {
  id: string
  type: 'required_field' | 'min_time' | 'max_time' | 'approval_required' | 'custom'
  field?: string
  value?: any
  message: string
  isActive: boolean
}

export interface StageAutomation {
  id: string
  trigger: 'on_enter' | 'on_exit' | 'time_based' | 'field_change'
  action: 'send_email' | 'create_task' | 'update_field' | 'move_stage' | 'send_whatsapp'
  conditions?: AutomationCondition[]
  parameters: Record<string, any>
  isActive: boolean
}

export interface AutomationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists'
  value: any
}

export interface StageMetrics {
  totalLeads: number
  averageTimeInStage: number // en días
  conversionRate: number // porcentaje
  leadsThisWeek: number
  leadsThisMonth: number
  trend: 'up' | 'down' | 'stable'
}

export interface PipelineLead {
  id: string
  nombre: string
  telefono: string
  email?: string
  origen: string
  estado: string
  stageId: string
  stageEntryDate: Date
  lastActivity?: Date
  score?: number
  tags?: string[]
  customFields?: Record<string, any>
  activities?: LeadActivity[]
  tasks?: LeadTask[]
  notes?: string
  assignedTo?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  value?: number // valor estimado del lead
  probability?: number // probabilidad de conversión (0-100)
}

export interface LeadActivity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'whatsapp' | 'stage_change' | 'task_completed'
  description: string
  date: Date
  userId: string
  userName: string
  metadata?: Record<string, any>
}

export interface LeadTask {
  id: string
  title: string
  description?: string
  dueDate: Date
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assignedTo: string
  assignedBy: string
  createdAt: Date
  completedAt?: Date
  type: 'call' | 'email' | 'meeting' | 'follow_up' | 'document' | 'other'
}

export interface PipelineConfig {
  id: string
  name: string
  description?: string
  stages: PipelineStage[]
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  settings: PipelineSettings
}

export interface PipelineSettings {
  allowSkipStages: boolean
  requireApprovalForSkip: boolean
  autoProgressEnabled: boolean
  notificationsEnabled: boolean
  trackTimeInStages: boolean
  requireNotesOnStageChange: boolean
  maxLeadsPerStage?: number
  defaultLeadScore: number
  scoringRules?: ScoringRule[]
}

export interface ScoringRule {
  id: string
  name: string
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than'
  value: any
  points: number
  isActive: boolean
}

export interface PipelineMetrics {
  totalLeads: number
  totalValue: number
  averageDealSize: number
  conversionRate: number
  averageSalesCycle: number // en días
  stageMetrics: Record<string, StageMetrics>
  trends: {
    leadsThisWeek: number
    leadsLastWeek: number
    valueThisWeek: number
    valueLastWeek: number
    conversionThisWeek: number
    conversionLastWeek: number
  }
  forecasting: {
    projectedRevenue: number
    projectedClosedDeals: number
    confidence: number
  }
}

export interface DragDropResult {
  leadId: string
  sourceStageId: string
  destinationStageId: string
  sourceIndex: number
  destinationIndex: number
}

export interface StageTransition {
  id: string
  leadId: string
  fromStageId: string
  toStageId: string
  date: Date
  userId: string
  userName: string
  reason?: string
  notes?: string
  duration: number // tiempo en la etapa anterior en días
  wasAutomated: boolean
}

export interface PipelineFilter {
  stageIds?: string[]
  assignedTo?: string[]
  priority?: ('low' | 'medium' | 'high' | 'urgent')[]
  dateRange?: {
    from: Date
    to: Date
  }
  scoreRange?: {
    min: number
    max: number
  }
  tags?: string[]
  search?: string
  origen?: string[]
  hasActiveTasks?: boolean
  lastActivityDays?: number
}

export interface PipelineView {
  id: string
  name: string
  description?: string
  filters: PipelineFilter
  sortBy: 'name' | 'date' | 'score' | 'value' | 'lastActivity'
  sortOrder: 'asc' | 'desc'
  isDefault: boolean
  isPublic: boolean
  createdBy: string
  createdAt: Date
}

// Eventos del pipeline para el sistema de automatización
export interface PipelineEvent {
  id: string
  type: 'lead_created' | 'stage_changed' | 'task_created' | 'task_completed' | 'note_added' | 'field_updated'
  leadId: string
  stageId?: string
  userId: string
  timestamp: Date
  data: Record<string, any>
  processed: boolean
}

// Configuración de notificaciones
export interface NotificationRule {
  id: string
  name: string
  trigger: 'stage_change' | 'task_overdue' | 'lead_inactive' | 'high_value_lead'
  conditions: AutomationCondition[]
  recipients: string[] // user IDs
  channels: ('email' | 'whatsapp' | 'in_app')[]
  template: string
  isActive: boolean
}

// Tipos para el drag & drop
export interface DragItem {
  id: string
  type: 'lead'
  lead: PipelineLead
  sourceStageId: string
}

export interface DropZone {
  stageId: string
  accepts: string[]
  canDrop: (item: DragItem) => boolean
}

// Tipos para validaciones de transición
export interface TransitionValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  requiredActions?: RequiredAction[]
}

export interface RequiredAction {
  type: 'fill_field' | 'complete_task' | 'add_note' | 'get_approval'
  field?: string
  message: string
  isBlocking: boolean
}

// Tipos para el forecasting
export interface ForecastData {
  period: 'week' | 'month' | 'quarter'
  projectedRevenue: number
  projectedDeals: number
  confidence: number
  breakdown: {
    stageId: string
    stageName: string
    leadsCount: number
    totalValue: number
    probability: number
    projectedValue: number
  }[]
}

// Tipos para analytics avanzados
export interface PipelineAnalytics {
  conversionRates: {
    stageId: string
    stageName: string
    conversionRate: number
    averageTime: number
    dropoffRate: number
  }[]
  bottlenecks: {
    stageId: string
    stageName: string
    averageTime: number
    leadsStuck: number
    severity: 'low' | 'medium' | 'high'
  }[]
  performance: {
    totalRevenue: number
    averageDealSize: number
    salesCycle: number
    winRate: number
    trends: {
      period: string
      revenue: number
      deals: number
      winRate: number
    }[]
  }
}
