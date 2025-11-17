import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ManychatBulkSyncService } from '@/server/services/manychat-bulk-sync-service'
import { ManychatService } from '@/server/services/manychat-service'
import { logger } from '@/lib/logger'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

/**
 * POST /api/manychat/bulk-sync
 * Iniciar sincronización masiva de contactos de ManyChat al CRM
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session) {
      logger.warn('Intento de sincronización masiva sin autenticación')
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

    // Generar ID único para esta sincronización
    const syncId = `sync_${Date.now()}_${session.user.id}`

    logger.info('Iniciando sincronización masiva de ManyChat', {
      userId: session.user.id,
      syncId
    })

    // Iniciar sincronización de forma asíncrona
    // No esperamos a que termine, retornamos inmediatamente con el syncId
    ManychatBulkSyncService.startBulkSync(syncId)
      .then((result) => {
        logger.info('Sincronización masiva completada', {
          syncId,
          result
        })
      })
      .catch((error) => {
        logger.error('Error en sincronización masiva', {
          syncId,
          error: error.message
        })
      })

    // Retornar inmediatamente con el syncId
    return NextResponse.json({
      success: true,
      syncId,
      message: 'Sincronización iniciada',
      status: 'running'
    })

  } catch (error: any) {
    logger.error('Error iniciando sincronización masiva', {
      error: error.message,
      stack: error.stack
    })

    return NextResponse.json(
      { 
        error: 'Error iniciando sincronización',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/manychat/bulk-sync
 * Obtener estado y progreso de sincronización
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const syncId = searchParams.get('syncId') || 'default'

    // Obtener progreso de sincronización
    const progress = ManychatBulkSyncService.getProgress(syncId)

    if (!progress) {
      return NextResponse.json({
        success: false,
        message: 'Sincronización no encontrada',
        syncId
      })
    }

    return NextResponse.json({
      success: true,
      syncId,
      progress
    })

  } catch (error: any) {
    logger.error('Error obteniendo progreso de sincronización', {
      error: error.message
    })

    return NextResponse.json(
      { 
        error: 'Error obteniendo progreso',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

