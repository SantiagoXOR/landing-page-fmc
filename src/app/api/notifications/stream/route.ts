import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { RealtimeNotification } from '@/lib/realtime-notifications'
import { registerSSEClient, unregisterSSEClient, updateSSEClientActivity } from '@/lib/sse-notifications'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

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
        registerSSEClient(clientId, userId, controller)

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
            updateSSEClientActivity(clientId)
          } catch (error) {
            // Cliente desconectado
            clearInterval(heartbeatInterval)
            unregisterSSEClient(clientId)
            logger.info('SSE client disconnected', { userId, clientId })
          }
        }, 30000)

        // Limpiar cuando el cliente se desconecta
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          unregisterSSEClient(clientId)
          logger.info('SSE client disconnected (abort)', { userId, clientId })
          try {
            controller.close()
          } catch (error) {
            // Ya está cerrado
          }
        })
      },
      
      cancel() {
        unregisterSSEClient(clientId)
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

