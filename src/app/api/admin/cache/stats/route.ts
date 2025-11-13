import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { cacheService } from '@/lib/cache-service'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/cache/stats
 * Obtener estadísticas del cache del sistema
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a las estadísticas de cache'
      }, { status: 401 })
    }

    // Verificar permisos de administrador
    try {
      checkPermission(session.user.role, 'admin:cache')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a las estadísticas de cache'
      }, { status: 403 })
    }

    // Obtener estadísticas del cache
    const stats = cacheService.getStats()
    
    logger.info('Cache stats requested', {
      userId: session.user.id,
      stats: {
        hitRate: stats.hitRate,
        size: stats.size,
        tagCount: stats.tagCount
      }
    })

    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString(),
      message: 'Estadísticas de cache obtenidas exitosamente'
    })

  } catch (error: any) {
    logger.error('Error getting cache stats', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener estadísticas de cache'
    }, { status: 500 })
  }
}
