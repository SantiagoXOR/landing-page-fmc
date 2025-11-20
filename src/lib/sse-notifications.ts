import { logger } from '@/lib/logger'
import { RealtimeNotification } from '@/lib/realtime-notifications'

// Almacenar clientes SSE conectados
interface SSEClient {
  userId: string
  controller: ReadableStreamDefaultController
  lastActivity: number
}

const sseClients = new Map<string, SSEClient>()

// Limpiar clientes inactivos cada 30 segundos
setInterval(() => {
  const now = Date.now()
  const timeout = 120000 // 2 minutos de inactividad
  
  for (const [id, client] of sseClients.entries()) {
    if (now - client.lastActivity > timeout) {
      try {
        client.controller.close()
      } catch (error) {
        // El stream ya está cerrado
      }
      sseClients.delete(id)
      logger.info('SSE client disconnected (timeout)', { userId: client.userId })
    }
  }
}, 30000)

// Función para enviar notificación a un cliente SSE
export function sendSSENotification(userId: string, notification: RealtimeNotification) {
  let sent = false
  
  for (const [id, client] of sseClients.entries()) {
    if (client.userId === userId) {
      try {
        const data = JSON.stringify(notification)
        client.controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
        client.lastActivity = Date.now()
        sent = true
      } catch (error) {
        logger.warn('Error sending SSE notification, removing client', { userId, error })
        sseClients.delete(id)
      }
    }
  }
  
  return sent
}

// Función para broadcast a todos los clientes
export function broadcastSSENotification(notification: RealtimeNotification, excludeUserId?: string) {
  let sentCount = 0
  
  for (const [id, client] of sseClients.entries()) {
    if (excludeUserId && client.userId === excludeUserId) {
      continue
    }
    
    // Si la notificación tiene userId, solo enviar a ese usuario
    if (notification.userId && client.userId !== notification.userId) {
      continue
    }
    
    try {
      const data = JSON.stringify(notification)
      client.controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
      client.lastActivity = Date.now()
      sentCount++
    } catch (error) {
      logger.warn('Error broadcasting SSE notification, removing client', { userId: client.userId, error })
      sseClients.delete(id)
    }
  }
  
  return sentCount
}

// Función para registrar un nuevo cliente SSE
export function registerSSEClient(clientId: string, userId: string, controller: ReadableStreamDefaultController) {
  sseClients.set(clientId, {
    userId,
    controller,
    lastActivity: Date.now()
  })
}

// Función para eliminar un cliente SSE
export function unregisterSSEClient(clientId: string) {
  sseClients.delete(clientId)
}

// Función para obtener un cliente SSE
export function getSSEClient(clientId: string): SSEClient | undefined {
  return sseClients.get(clientId)
}

// Función para actualizar la actividad de un cliente
export function updateSSEClientActivity(clientId: string) {
  const client = sseClients.get(clientId)
  if (client) {
    client.lastActivity = Date.now()
  }
}

