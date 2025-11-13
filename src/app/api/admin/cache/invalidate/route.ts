import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { cacheService } from '@/lib/cache-service'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const InvalidateSchema = z.object({
  tag: z.string().min(1, 'Tag es requerido'),
  pattern: z.string().optional()
})

/**
 * POST /api/admin/cache/invalidate
 * Invalidar cache por tag o patrón
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para invalidar cache'
      }, { status: 401 })
    }

    // Verificar permisos de administrador
    try {
      checkPermission(session.user.role, 'admin:cache')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para invalidar cache'
      }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = InvalidateSchema.parse(body)
    
    let count = 0
    let method = ''
    
    if (validatedData.pattern) {
      // Invalidar por patrón
      count = cacheService.invalidatePattern(validatedData.pattern)
      method = 'pattern'
    } else {
      // Invalidar por tag
      count = cacheService.invalidateByTag(validatedData.tag)
      method = 'tag'
    }
    
    logger.info('Cache invalidated by admin', {
      userId: session.user.id,
      userName: session.user.name,
      method,
      target: validatedData.tag || validatedData.pattern,
      entriesInvalidated: count
    })

    return NextResponse.json({
      success: true,
      message: `Cache invalidado exitosamente por ${method}`,
      count,
      target: validatedData.tag || validatedData.pattern,
      method,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Error invalidating cache', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    if (error.name === 'ZodError') {
      return NextResponse.json({
        error: 'Validation error',
        message: 'Datos de invalidación inválidos',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al invalidar cache'
    }, { status: 500 })
  }
}
