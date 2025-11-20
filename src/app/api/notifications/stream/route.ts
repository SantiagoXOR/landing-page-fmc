import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { RealtimeNotification } from '@/lib/realtime-notifications'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = session.user.id
    const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    logger.info('SSE connection established', { userId, clientId })

    // Crear stream SSE
    const stream = new ReadableStream({
      start(controller) {
        // Guardar cliente
        sseClients.set(clientId, {
          userId,
          controller,
          lastActivity: Date.now()
        })

        // Enviar mensaje inicial de conexión
        const welcomeNotification: RealtimeNotification = {
          id: `welcome-${Date.now()}`,
          type: 'system_alert',
          title: 'Conectado',
          message: 'Conexión establecida correctamente',
          priority: 'low',
          read: false,
          timestamp: new Date(),
          userId
        }
        
        try {
          const data = JSON.stringify(welcomeNotification)
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
        } catch (error) {
          logger.error('Error sending welcome message', { error })
        }

        // Enviar heartbeat cada 30 segundos
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(`: heartbeat\n\n`))
            const client = sseClients.get(clientId)
            if (client) {
              client.lastActivity = Date.now()
            }
          } catch (error) {
            // Cliente desconectado
            clearInterval(heartbeatInterval)
            sseClients.delete(clientId)
            logger.info('SSE client disconnected', { userId, clientId })
          }
        }, 30000)

        // Limpiar cuando el cliente se desconecta
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          sseClients.delete(clientId)
          logger.info('SSE client disconnected (abort)', { userId, clientId })
          try {
            controller.close()
          } catch (error) {
            // Ya está cerrado
          }
        })
      },
      
      cancel() {
        sseClients.delete(clientId)
        logger.info('SSE stream cancelled', { userId, clientId })
      }
    })

    // Retornar respuesta SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Deshabilitar buffering en nginx
      },
    })

  } catch (error: any) {
    logger.error('Error in SSE stream', { error: error.message })
    return new Response('Internal Server Error', { status: 500 })
  }
}

