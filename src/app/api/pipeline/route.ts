import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { pipelineService } from '@/server/services/pipeline-service'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

// GET - Obtener métricas del pipeline
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'dashboard:read')

    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    const metrics = await pipelineService.getPipelineMetrics(
      dateFrom || undefined,
      dateTo || undefined
    )

    return NextResponse.json(metrics)

  } catch (error: any) {
    logger.error('Error in GET /api/pipeline:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
