import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { parse } from 'url'
import { RealtimeNotification } from '@/lib/realtime-notifications'
import { logger } from '@/lib/logger'

interface ExtendedWebSocket extends WebSocket {
  userId?: string
  sessionId?: string
  isAlive?: boolean
}

class NotificationWebSocketServer {
  private wss: WebSocketServer
  private clients: Set<ExtendedWebSocket> = new Set()
  private server: any
  private port: number

  constructor(port: number = 3001) {
    this.port = port
    this.server = createServer()
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    })
    
    this.setupWebSocketServer()
    this.setupHeartbeat()
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: ExtendedWebSocket, request) => {
      const { query } = parse(request.url || '', true)
      
      // Configurar cliente
      ws.userId = query.userId as string
      ws.sessionId = Math.random().toString(36).substr(2, 9)
      ws.isAlive = true
      
      this.clients.add(ws)
      
      logger.info('🔗 Nueva conexión WebSocket', {
        sessionId: ws.sessionId,
        userId: ws.userId,
        totalClients: this.clients.size
      })

      // Enviar mensaje de bienvenida
      this.sendToClient(ws, {
        type: 'system_alert',
        title: 'Conectado',
        message: 'Conexión establecida correctamente',
        priority: 'low',
        read: false
      })

      // Manejar mensajes del cliente
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleClientMessage(ws, message)
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error)
        }
      })

      // Manejar heartbeat
      ws.on('pong', () => {
        ws.isAlive = true
      })

      // Manejar desconexión
      ws.on('close', () => {
        this.clients.delete(ws)
        logger.info('🔌 Cliente WebSocket desconectado', {
          sessionId: ws.sessionId,
          userId: ws.userId,
          totalClients: this.clients.size
        })
      })

      ws.on('error', (error) => {
        logger.error('❌ Error WebSocket:', error)
        this.clients.delete(ws)
      })
    })

    this.wss.on('error', (error) => {
      logger.error('❌ Error WebSocket Server:', error)
    })
  }

  private setupHeartbeat() {
    // Ping clientes cada 30 segundos
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (ws.isAlive === false) {
          logger.warn('🏓 Cliente WebSocket no responde, terminando conexión', {
            sessionId: ws.sessionId
          })
          return ws.terminate()
        }
        
        ws.isAlive = false
        ws.ping()
      })
    }, 30000)

    this.wss.on('close', () => {
      clearInterval(interval)
    })
  }

  private handleClientMessage(ws: ExtendedWebSocket, message: any) {
    logger.debug('📨 Mensaje del cliente WebSocket:', {
      sessionId: ws.sessionId,
      message
    })

    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date() })
        break
        
      case 'subscribe':
        // El cliente se suscribe a tipos específicos de notificaciones
        ws.userId = message.userId
        logger.info('👤 Cliente suscrito', {
          sessionId: ws.sessionId,
          userId: ws.userId
        })
        break
        
      case 'notification':
        // Reenviar notificación a otros clientes
        this.broadcastNotification(message.data, ws.userId)
        break
        
      default:
        logger.warn('⚠️ Tipo de mensaje WebSocket desconocido:', message.type)
    }
  }

  private sendToClient(ws: ExtendedWebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data))
      } catch (error) {
        logger.error('Error enviando mensaje a cliente WebSocket:', error)
      }
    }
  }

  // Métodos públicos para enviar notificaciones
  public broadcastNotification(notification: Omit<RealtimeNotification, 'id' | 'timestamp'>, excludeUserId?: string) {
    const fullNotification: RealtimeNotification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date()
    }

    logger.info('📢 Enviando notificación broadcast', {
      type: notification.type,
      title: notification.title,
      priority: notification.priority,
      totalClients: this.clients.size
    })

    this.clients.forEach((client) => {
      // No enviar al usuario que originó la notificación
      if (excludeUserId && client.userId === excludeUserId) {
        return
      }
      
      // Filtrar por usuario si está especificado
      if (notification.userId && client.userId !== notification.userId) {
        return
      }
      
      this.sendToClient(client, fullNotification)
    })
  }

  public sendToUser(userId: string, notification: Omit<RealtimeNotification, 'id' | 'timestamp'>) {
    const fullNotification: RealtimeNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      userId
    }

    logger.info('👤 Enviando notificación a usuario específico', {
      userId,
      type: notification.type,
      title: notification.title
    })

    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.sendToClient(client, fullNotification)
      }
    })
  }

  public getConnectedClients(): number {
    return this.clients.size
  }

  public getClientsByUser(userId: string): number {
    return Array.from(this.clients).filter(client => client.userId === userId).length
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (error: any) => {
        if (error) {
          logger.error('❌ Error iniciando servidor WebSocket:', error)
          reject(error)
        } else {
          logger.info(`🚀 Servidor WebSocket iniciado en puerto ${this.port}`)
          resolve()
        }
      })
    })
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          logger.info('🛑 Servidor WebSocket detenido')
          resolve()
        })
      })
    })
  }
}

// Instancia singleton del servidor
let wsServer: NotificationWebSocketServer | null = null

export function getWebSocketServer(): NotificationWebSocketServer {
  if (!wsServer) {
    wsServer = new NotificationWebSocketServer()
  }
  return wsServer
}

export function startWebSocketServer(): Promise<void> {
  const server = getWebSocketServer()
  return server.start()
}

export function stopWebSocketServer(): Promise<void> {
  if (wsServer) {
    return wsServer.stop()
  }
  return Promise.resolve()
}

// Funciones de utilidad para enviar notificaciones
export function broadcastNotification(notification: Omit<RealtimeNotification, 'id' | 'timestamp'>, excludeUserId?: string) {
  const server = getWebSocketServer()
  server.broadcastNotification(notification, excludeUserId)
}

export function sendNotificationToUser(userId: string, notification: Omit<RealtimeNotification, 'id' | 'timestamp'>) {
  const server = getWebSocketServer()
  server.sendToUser(userId, notification)
}

export { NotificationWebSocketServer }
export type { ExtendedWebSocket }