import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ManychatHistorySyncService } from '@/server/services/manychat-history-sync-service'
import { ManychatService } from '@/server/services/manychat-service'
import { logger } from '@/lib/logger'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

/**
 * POST /api/manychat/sync-history
 * Sincronizar mensajes históricos para uno o múltiples contactos
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session) {
      logger.warn('Intento de sincronización de historial sin autenticación')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que ManyChat esté configurado
    if (!ManychatService.isConfigured()) {
      logger.warn('ManyChat no está configurado', { userId: session.user.id })
      return NextResponse.json(
        { error: 'ManyChat no está configurado' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { leadIds, leadId } = body

    // Determinar IDs de leads a procesar
    let leadsToProcess: string[] = []
    
    if (leadIds && Array.isArray(leadIds)) {
      leadsToProcess = leadIds
    } else if (leadId) {
      leadsToProcess = [leadId]
    } else {
      return NextResponse.json(
        { error: 'Se requiere leadId o leadIds' },
        { status: 400 }
      )
    }

    if (leadsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron leads para sincronizar' },
        { status: 400 }
      )
    }

    logger.info('Iniciando sincronización de mensajes históricos', {
      userId: session.user.id,
      leadCount: leadsToProcess.length
    })

    // Sincronizar mensajes históricos
    const result = await ManychatHistorySyncService.syncHistoryForLeads(leadsToProcess)

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      synced: result.synced,
      errors: result.errors,
      errorMessages: result.errorMessages.slice(0, 10) // Limitar a 10 errores
    })

  } catch (error: any) {
    logger.error('Error sincronizando mensajes históricos', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      { 
        error: 'Error sincronizando mensajes históricos',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

