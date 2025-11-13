import { NextRequest, NextResponse } from 'next/server'
import { ManychatService } from '@/server/services/manychat-service'

export async function GET(request: NextRequest) {
  try {
    const isConfigured = ManychatService.isConfigured()
    
    if (!isConfigured) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Manychat API no está configurada',
      })
    }

    const isHealthy = await ManychatService.healthCheck()

    if (isHealthy) {
      return NextResponse.json({
        status: 'healthy',
        message: 'Manychat API está funcionando correctamente',
      })
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        message: 'Manychat API no responde correctamente',
      }, { status: 503 })
    }
  } catch (error: any) {
    console.error('Error en health check de Manychat:', error)
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Error al verificar Manychat API',
    }, { status: 500 })
  }
}

