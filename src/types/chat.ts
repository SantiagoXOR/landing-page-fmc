/**
 * Tipos compartidos para el módulo de Chats
 * Estos tipos unifican las definiciones de Message y Conversation
 * usadas en toda la aplicación.
 */

export interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  messageType: string
  sentAt: string // ISO 8601 string desde la API
  readAt?: string // ISO 8601 string desde la API
  isFromBot?: boolean
  manychatFlowId?: string
}

export interface Lead {
  id: string
  nombre: string
  telefono: string
  email?: string
  manychatId?: string
  tags?: string[]
}

export interface AssignedUser {
  id: string
  nombre: string
  email: string
}

export interface ManychatData {
  flowNs?: string
  flowName?: string
  stepNs?: string
  botActive?: boolean
}

export interface Conversation {
  id: string
  platform: string
  status: string
  assignedTo?: string
  lastMessageAt: string // ISO 8601 string
  createdAt: string // ISO 8601 string
  lead?: Lead
  assignedUser?: AssignedUser
  messages: Message[]
  manychatData?: ManychatData
}



