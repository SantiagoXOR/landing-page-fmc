import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { cacheService } from '@/lib/cache-service'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/cache/clear
 * Limpiar todo el cache del sistema
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para limpiar el cache'
      }, { status: 401 })
    }

    // Verificar permisos de administrador
    try {
      checkPermission(session.user.role, 'admin:cache')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para limpiar el cache'
      }, { status: 403 })
    }

    // Obtener estadísticas antes de limpiar
    const statsBefore = cacheService.getStats()
    
    // Limpiar todo el cache
    cacheService.clear()
    
    // Obtener estadísticas después de limpiar
    const statsAfter = cacheService.getStats()
    
    logger.info('Cache cleared by admin', {
      userId: session.user.id,
      userName: session.user.name,
      statsBefore: {
        size: statsBefore.size,
        hitRate: statsBefore.hitRate
      },
      statsAfter: {
        size: statsAfter.size,
        hitRate: statsAfter.hitRate
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cache limpiado exitosamente',
      cleared: {
        entries: statsBefore.size,
        tags: statsBefore.tagCount
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Error clearing cache', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al limpiar el cache'
    }, { status: 500 })
  }
}
