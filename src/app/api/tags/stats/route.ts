import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { tagsService } from '@/server/services/tags-service'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

/**
 * GET /api/tags/stats
 * Obtener estadísticas de tags (conteo por tag)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a las estadísticas de tags'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a las estadísticas de tags'
      }, { status: 403 })
    }

    // Obtener estadísticas
    const stats = await tagsService.getTagStats()

    logger.info('Estadísticas de tags obtenidas exitosamente', {
      userId: session.user.id,
      totalTags: stats.length
    })

    return NextResponse.json({
      stats,
      total: stats.length
    })

  } catch (error: any) {
    logger.error('Error obteniendo estadísticas de tags', { 
      error: error.message,
      stack: error.stack 
    })
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Error al obtener las estadísticas de tags'
    }, { status: 500 })
  }
}

