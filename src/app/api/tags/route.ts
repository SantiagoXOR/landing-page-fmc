import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { tagsService } from '@/server/services/tags-service'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

/**
 * GET /api/tags
 * Obtener leads agrupados por tags
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder a los tags'
      }, { status: 401 })
    }

    // Verificar permisos
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder a los tags'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Obtener parámetros de consulta
    const tag = searchParams.get('tag') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const fechaDesde = searchParams.get('fechaDesde') || undefined
    const fechaHasta = searchParams.get('fechaHasta') || undefined

    // Validar parámetros
    if (page < 1) {
      return NextResponse.json({ 
        error: 'Bad Request',
        message: 'El parámetro page debe ser mayor a 0'
      }, { status: 400 })
    }

    if (limit < 1 || limit > 10000) {
      return NextResponse.json({ 
        error: 'Bad Request',
        message: 'El parámetro limit debe estar entre 1 y 10000'
      }, { status: 400 })
    }

    // Obtener datos
    const result = await tagsService.getLeadsByTags({
      tag,
      page,
      limit,
      fechaDesde,
      fechaHasta
    })

    logger.info('Tags obtenidos exitosamente', {
      userId: session.user.id,
      tag,
      page,
      limit,
      totalTags: result.tags.length,
      withoutTagsCount: result.withoutTags.count
    })

    return NextResponse.json(result)

  } catch (error: any) {
    logger.error('Error obteniendo tags', { 
      error: error.message,
      stack: error.stack 
    })
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'Error al obtener los tags'
    }, { status: 500 })
  }
}

