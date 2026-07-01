import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import {
  cancelRemarketingBroadcastJob,
  getRemarketingBroadcastJob,
} from '@/server/services/remarketing-broadcast-service'

export const dynamic = 'force-dynamic'

type RouteParams = { params: { jobId: string } }

async function requirePipelineWrite(userId: string) {
  const allowed = await checkUserPermission(userId, 'pipeline', 'write')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'No tiene permisos' },
      { status: 403 }
    )
  }
  return null
}

/** GET /api/pipeline/remarketing/broadcast/[jobId] */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requirePipelineWrite(session.user.id)
    if (forbidden) return forbidden

    const result = await getRemarketingBroadcastJob(params.jobId)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('GET broadcast job failed', { jobId: params.jobId, error })
    const message = error instanceof Error ? error.message : 'Error'
    return NextResponse.json(
      { error: message.includes('no encontrada') ? 'Not Found' : 'Internal server error', message },
      { status: message.includes('no encontrada') ? 404 : 500 }
    )
  }
}

/** DELETE /api/pipeline/remarketing/broadcast/[jobId] — cancelar campaña pendiente */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requirePipelineWrite(session.user.id)
    if (forbidden) return forbidden

    const job = await cancelRemarketingBroadcastJob(params.jobId)
    return NextResponse.json({ job })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    return NextResponse.json({ error: 'Bad Request', message }, { status: 400 })
  }
}
