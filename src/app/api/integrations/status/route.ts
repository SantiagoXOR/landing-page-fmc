import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getIntegrationManager } from '@/lib/integrations/integration-manager'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

/**
 * GET /api/integrations/status
 * Obtener estado de todas las integraciones
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para acceder al estado de integraciones'
      }, { status: 401 })
    }

    // Verificar permisos de administrador
    try {
      checkPermission(session.user.role, 'admin:system')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para acceder al estado de integraciones'
      }, { status: 403 })
    }

    const integrationManager = getIntegrationManager()
    
    if (!integrationManager) {
      return NextResponse.json({
        error: 'Integration manager not available',
        message: 'El gestor de integraciones no está disponible'
      }, { status: 503 })
    }

    // Obtener estado general
    const status = integrationManager.getStatus()
    
    // Obtener métricas
    const metrics = integrationManager.getMetrics()
    
    // Verificar salud de las integraciones
    const healthCheck = await integrationManager.healthCheck()

    logger.info('Integration status requested', {
      userId: session.user.id,
      userName: session.user.name
    })

    return NextResponse.json({
      status,
      metrics,
      healthCheck,
      timestamp: new Date().toISOString(),
      message: 'Estado de integraciones obtenido exitosamente'
    })

  } catch (error: any) {
    logger.error('Error getting integration status', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al obtener estado de integraciones'
    }, { status: 500 })
  }
}

/**
 * POST /api/integrations/status
 * Actualizar estado de una integración (habilitar/deshabilitar)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para modificar integraciones'
      }, { status: 401 })
    }

    // Verificar permisos de administrador
    try {
      checkPermission(session.user.role, 'admin:system')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para modificar integraciones'
      }, { status: 403 })
    }

    const body = await request.json()
    const { integration, action } = body

    if (!integration || !action) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Se requieren los campos integration y action'
      }, { status: 400 })
    }

    if (!['enable', 'disable'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action',
        message: 'La acción debe ser enable o disable'
      }, { status: 400 })
    }

    const integrationManager = getIntegrationManager()
    
    if (!integrationManager) {
      return NextResponse.json({
        error: 'Integration manager not available',
        message: 'El gestor de integraciones no está disponible'
      }, { status: 503 })
    }

    let success = false
    if (action === 'enable') {
      success = integrationManager.enableIntegration(integration)
    } else {
      success = integrationManager.disableIntegration(integration)
    }

    if (!success) {
      return NextResponse.json({
        error: 'Integration not found',
        message: `La integración ${integration} no fue encontrada`
      }, { status: 404 })
    }

    logger.info('Integration status updated', {
      userId: session.user.id,
      userName: session.user.name,
      integration,
      action
    })

    return NextResponse.json({
      success: true,
      message: `Integración ${integration} ${action === 'enable' ? 'habilitada' : 'deshabilitada'} exitosamente`,
      integration,
      action,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    logger.error('Error updating integration status', {
      error: error.message,
      stack: error.stack,
      userId: (await getServerSession(authOptions))?.user?.id
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al actualizar integración'
    }, { status: 500 })
  }
}
