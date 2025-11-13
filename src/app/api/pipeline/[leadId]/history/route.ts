import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { pipelineService } from '@/server/services/pipeline-service'
import { checkPermission } from '@/lib/rbac'

// GET - Obtener historial de transiciones de un lead
export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:read')

    const history = await pipelineService.getLeadHistory(params.leadId)

    return NextResponse.json(history)

  } catch (error: any) {
    console.error('Error in GET /api/pipeline/[leadId]/history:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
