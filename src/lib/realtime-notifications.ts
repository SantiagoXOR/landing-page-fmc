'use client'

import { EventEmitter } from 'events'

// Tipos de notificaciones
export interface RealtimeNotification {
  id: string
  type: 'lead_created' | 'lead_updated' | 'pipeline_changed' | 'system_alert' | 'user_activity'
  title: string
  message: string
  data?: any
  timestamp: Date
  userId?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  read: boolean
}

// Configuración del cliente WebSocket
class RealtimeNotificationClient extends EventEmitter {
  private ws: WebSocket | null = null
  private sseEventSource: EventSource | null = null
  private useSSE = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private notifications: RealtimeNotification[] = []
  private notificationListeners: Set<(notification: RealtimeNotification) => void> = new Set()

  constructor() {
    super()

    // Add default error handler to prevent unhandled error exceptions
    this.on('error', (error) => {
      console.warn('🔌 WebSocket error handled:', error?.message || 'Unknown error')
    })

    // Add other default event handlers
    this.on('connected', () => {
      console.log('🔗 WebSocket connected successfully')
    })

    this.on('disconnected', () => {
      console.log('🔌 WebSocket disconnected')
    })

    this.on('max_reconnects_reached', () => {
      console.warn('🚫 WebSocket max reconnection attempts reached - notifications disabled')
    })

    this.connect()
  }

  private connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true
    
    try {
      // En desarrollo, usar ws://localhost:3001
      // En producción, WebSockets no están disponibles en Vercel serverless
      // Solo intentar conectar en desarrollo o si hay un servidor WebSocket externo configurado
      const wsServerUrl = process.env.NEXT_PUBLIC_WS_SERVER_URL
      const wsUrl = wsServerUrl 
        ? `${wsServerUrl}/ws`
        : process.env.NODE_ENV === 'development' 
          ? 'ws://localhost:3001/ws'
          : null
      
      if (!wsUrl) {
        console.log('ℹ️ WebSocket no disponible, usando SSE como fallback')
        this.isConnecting = false
        this.connectSSE()
        return
      }
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('🔗 Conexión WebSocket establecida')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.emit('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const notification: RealtimeNotification = JSON.parse(event.data)
          this.handleNotification(notification)
        } catch (error) {
          console.error('Error parsing notification:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('🔌 Conexión WebSocket cerrada')
        this.isConnecting = false
        this.ws = null
        this.emit('disconnected')
        
        // En producción, no intentar reconectar ya que WebSockets no están disponibles
        if (process.env.NODE_ENV === 'production') {
          console.log('ℹ️ WebSocket no disponible en producción (Vercel serverless)')
          return
        }
        
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.warn('⚠️ Error WebSocket, intentando SSE como fallback:', error)
        this.isConnecting = false
        
        // Cerrar WebSocket y cambiar a SSE
        if (this.ws) {
          try {
            this.ws.close()
          } catch (e) {
            // Ya está cerrado
          }
          this.ws = null
        }
        
        // Intentar SSE como fallback
        if (!this.useSSE) {
          this.connectSSE()
        }

        // Safely emit error event with proper error object
        try {
          this.emit('error', error || new Error('WebSocket connection error'))
        } catch (emitError) {
          console.warn('Error emitting WebSocket error event:', emitError)
        }
      }
    } catch (error) {
      console.warn('⚠️ No se pudo crear conexión WebSocket, intentando SSE:', error)
      this.isConnecting = false
      
      // Intentar SSE como fallback
      if (!this.useSSE) {
        this.connectSSE()
      } else {
        // Si ya estamos usando SSE y falló, intentar reconectar WebSocket después
        this.scheduleReconnect()
      }
    }
  }

  private connectSSE() {
    if (this.sseEventSource?.readyState === EventSource.OPEN) {
      return
    }

    if (this.isConnecting && this.useSSE) {
      return
    }

    this.isConnecting = true
    this.useSSE = true

    try {
      const sseUrl = '/api/notifications/stream'
      this.sseEventSource = new EventSource(sseUrl)

      this.sseEventSource.onopen = () => {
        console.log('🔗 Conexión SSE establecida')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.emit('connected')
      }

      this.sseEventSource.onmessage = (event) => {
        try {
          // Ignorar heartbeats
          if (event.data.startsWith(':')) {
            return
          }

          const notification: RealtimeNotification = JSON.parse(event.data)
          this.handleNotification(notification)
        } catch (error) {
          console.error('Error parsing SSE notification:', error)
        }
      }

      this.sseEventSource.onerror = (error) => {
        console.warn('⚠️ Error SSE:', error)
        this.isConnecting = false
        
        // Si el EventSource está cerrado, intentar reconectar
        if (this.sseEventSource?.readyState === EventSource.CLOSED) {
          this.sseEventSource.close()
          this.sseEventSource = null
          this.useSSE = false
          
          // Intentar reconectar después de un delay
          setTimeout(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
              this.connectSSE()
            }
          }, 5000)
        }
      }

    } catch (error) {
      console.error('Error creando conexión SSE:', error)
      this.isConnecting = false
      this.useSSE = false
      this.emit('error', error)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('🚫 Máximo número de intentos de reconexión alcanzado. Cambiando a SSE.')
      this.emit('max_reconnects_reached')
      
      // Si WebSocket falló completamente, usar SSE
      if (!this.useSSE) {
        this.connectSSE()
      }
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000) // Max 30 seconds

    console.log(`🔄 Reintentando conexión WebSocket en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      // Si ya estamos usando SSE y funciona, no intentar WebSocket de nuevo
      if (!this.useSSE || !this.sseEventSource || this.sseEventSource.readyState !== EventSource.OPEN) {
        this.connect()
      }
    }, delay)
  }

  private handleNotification(notification: RealtimeNotification) {
    // Agregar timestamp si no existe
    if (!notification.timestamp) {
      notification.timestamp = new Date()
    }

    // Agregar a la lista de notificaciones
    this.notifications.unshift(notification)
    
    // Mantener solo las últimas 100 notificaciones
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100)
    }

    // Notificar a todos los listeners
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification)
      } catch (error) {
        console.error('Error in notification listener:', error)
      }
    })

    // Emitir evento
    this.emit('notification', notification)
  }

  // Métodos públicos
  public subscribe(callback: (notification: RealtimeNotification) => void) {
    this.notificationListeners.add(callback)
    
    // Retornar función de cleanup
    return () => {
      this.notificationListeners.delete(callback)
    }
  }

  public getNotifications(): RealtimeNotification[] {
    return [...this.notifications]
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  public markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.emit('notification_read', notification)
    }
  }

  public markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.emit('all_notifications_read')
  }

  public clearNotifications() {
    this.notifications = []
    this.emit('notifications_cleared')
  }

  public isConnected(): boolean {
    if (this.useSSE && this.sseEventSource) {
      return this.sseEventSource.readyState === EventSource.OPEN
    }
    return this.ws?.readyState === WebSocket.OPEN
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    if (this.sseEventSource) {
      this.sseEventSource.close()
      this.sseEventSource = null
      this.useSSE = false
    }
    this.notificationListeners.clear()
  }

  // Enviar notificación (para testing o casos especiales)
  public sendNotification(notification: Omit<RealtimeNotification, 'id' | 'timestamp'>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const fullNotification: RealtimeNotification = {
        ...notification,
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date()
      }
      
      this.ws.send(JSON.stringify(fullNotification))
    }
  }
}

// Instancia singleton
let notificationClient: RealtimeNotificationClient | null = null

export function getNotificationClient(): RealtimeNotificationClient {
  if (typeof window === 'undefined') {
    // En el servidor, retornar un mock
    return {
      subscribe: () => () => {},
      getNotifications: () => [],
      getUnreadCount: () => 0,
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearNotifications: () => {},
      isConnected: () => false,
      disconnect: () => {},
      sendNotification: () => {}
    } as any
  }

  if (!notificationClient) {
    notificationClient = new RealtimeNotificationClient()
  }
  
  return notificationClient
}

// Cleanup al cerrar la página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (notificationClient) {
      notificationClient.disconnect()
    }
  })
}

export { RealtimeNotificationClient }