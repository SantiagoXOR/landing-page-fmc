import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import {
  BROADCAST_BATCH_SIZE,
  processRemarketingBroadcastBatch,
} from '@/server/services/remarketing-broadcast-service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteParams = { params: { jobId: string } }

/** POST /api/pipeline/remarketing/broadcast/[jobId]/process — procesa un lote de la cola */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await checkUserPermission(session.user.id, 'pipeline', 'write')
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await processRemarketingBroadcastBatch(params.jobId, BROADCAST_BATCH_SIZE)

    const pending =
      result.job.total_count -
      result.job.sent_count -
      result.job.failed_count -
      result.job.skipped_count

    return NextResponse.json({
      ...result,
      pending: Math.max(0, pending),
      done: result.job.status === 'completed' || result.job.status === 'cancelled',
    })
  } catch (error) {
    logger.error('Process broadcast batch failed', {
      jobId: params.jobId,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Error al procesar lote',
      },
      { status: 500 }
    )
  }
}
