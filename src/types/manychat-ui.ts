/**
 * Tipos TypeScript para UI de Manychat
 */

import { ManychatTag, ManychatFlow } from './manychat'

// Extensiones de tipos existentes para UI
export interface LeadWithManychat {
  id: string
  nombre: string
  telefono: string
  email?: string
  dni?: string
  ingresos?: number
  zona?: string
  producto?: string
  monto?: number
  origen?: string
  estado: string
  agencia?: string
  notas?: string
  createdAt: string
  updatedAt: string
  
  // Campos de Manychat
  manychatId?: string
  tags?: string[] // Parseado desde JSON
  customFields?: Record<string, any>
  manychatSyncStatus?: 'synced' | 'pending' | 'error' | 'never'
  lastSyncedAt?: Date
}

export interface ConversationWithManychat {
  id: string
  platform: string
  status: string
  assignedTo?: string
  lastMessageAt: string
  createdAt: string
  lead?: {
    id: string
    nombre: string
    telefono: string
    email?: string
    manychatId?: string
    tags?: string[]
  }
  assignedUser?: {
    id: string
    nombre: string
    email: string
  }
  messages: MessageWithManychat[]
  
  // Datos de Manychat
  manychatData?: {
    flowNs?: string
    flowName?: string
    stepNs?: string
    botActive?: boolean
  }
}

export interface MessageWithManychat {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  messageType: string
  mediaUrl?: string
  sentAt: Date
  readAt?: Date
  deliveredAt?: Date
  platformMsgId?: string
  
  // Datos de Manychat
  isFromBot?: boolean
  manychatFlowId?: string
}

// Tipos para Sync
export interface ManychatSyncLog {
  id: string
  leadId: string
  syncType: string
  status: 'pending' | 'success' | 'failed'
  direction: string
  data?: any
  error?: string
  retryCount: number
  createdAt: Date
  completedAt?: Date
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

// Tipos para Tags
export interface TagWithColor extends ManychatTag {
  color?: string
  category?: string
}

// Tipos para Métricas
export interface ManychatMetricsData {
  totalSubscribers: number
  syncedLeads: number
  unsyncedLeads: number
  botMessages: number
  agentMessages: number
  activeFlows: FlowStat[]
  topTags: TagStat[]
  messagesPerDay: MessageStat[]
}

export interface FlowStat {
  flowId: number
  flowName: string
  activeLeads: number
  completionRate: number
}

export interface TagStat {
  tagId: number
  tagName: string
  count: number
}

export interface MessageStat {
  date: string
  bot: number
  agent: number
}

// Tipos para Broadcasts
export interface BroadcastData {
  id?: number
  name: string
  message: string
  targetType: 'tags' | 'leads'
  tagIds?: number[]
  leadIds?: string[]
  scheduledFor?: string
  status?: 'draft' | 'scheduled' | 'sent' | 'failed'
  createdAt?: Date
  sentAt?: Date
  stats?: {
    sent: number
    delivered: number
    read: number
    failed: number
  }
}

// Props para componentes
export interface ManychatTagManagerProps {
  leadId: string
  initialTags?: string[]
  onTagsChange?: (tags: string[]) => void
  readonly?: boolean
}

export interface ManychatSyncPanelProps {
  leadId: string
  onSyncComplete?: () => void
}

export interface ManychatFlowIndicatorProps {
  flowName?: string
  flowNs?: string
  botActive?: boolean
  className?: string
}

export interface MessageTypeIndicatorProps {
  isFromBot?: boolean
  flowName?: string
  messageType?: string
}

export interface ManychatBadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

export interface SyncStatusIndicatorProps {
  status: SyncStatus
  lastSyncAt?: Date
  error?: string
  onClick?: () => void
  className?: string
}

export interface TagPillProps {
  tag: string
  onRemove?: () => void
  readonly?: boolean
  color?: string
  className?: string
}

