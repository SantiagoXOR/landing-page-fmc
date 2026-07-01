import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import {
  countBroadcastTargets,
  createRemarketingBroadcastJob,
  listRemarketingBroadcastJobs,
  REMARKETING_BROADCAST_STAGE_ID,
} from '@/server/services/remarketing-broadcast-service'
import { DEFAULT_REMARKETING_TEMPLATE_ID } from '@/lib/remarketing-templates'
import { BROADCAST_STAGE_OPTIONS } from '@/lib/pipeline-stage-map'

export const dynamic = 'force-dynamic'

const CreateBroadcastSchema = z.object({
  templateId: z.string().min(1).optional().default(DEFAULT_REMARKETING_TEMPLATE_ID),
  stageId: z.string().min(1).optional().default(REMARKETING_BROADCAST_STAGE_ID),
  customMessage: z.string().max(1024).optional().nullable(),
  leadIds: z.array(z.string().uuid()).optional(),
})

async function requirePipelineWrite(userId: string) {
  const allowed = await checkUserPermission(userId, 'pipeline', 'write')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'No tiene permisos para enviar broadcasts' },
      { status: 403 }
    )
  }
  return null
}

/**
 * GET /api/pipeline/remarketing/broadcast
 * ?preview=targets → cantidad de leads en Remarketing
 * default → listado de campañas recientes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requirePipelineWrite(session.user.id)
    if (forbidden) return forbidden

    const { searchParams } = new URL(request.url)
    if (searchParams.get('preview') === 'stages') {
      const stages = await Promise.all(
        BROADCAST_STAGE_OPTIONS.map(async (stage) => ({
          ...stage,
          count: await countBroadcastTargets(stage.id),
        }))
      )
      return NextResponse.json({ stages })
    }

    if (searchParams.get('preview') === 'targets') {
      const stageId = searchParams.get('stageId') || REMARKETING_BROADCAST_STAGE_ID
      const count = await countBroadcastTargets(stageId)
      return NextResponse.json({ stageId, count })
    }

    const jobs = await listRemarketingBroadcastJobs(20)
    return NextResponse.json({ jobs })
  } catch (error) {
    logger.error('GET remarketing broadcast failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Error al listar campañas',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pipeline/remarketing/broadcast
 * Crea job encolado (no envía todavía; llamar /process en loop)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requirePipelineWrite(session.user.id)
    if (forbidden) return forbidden

    const body = await request.json()
    const parsed = CreateBroadcastSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { job } = await createRemarketingBroadcastJob({
      createdBy: session.user.id,
      templateId: parsed.data.templateId,
      stageId: parsed.data.stageId,
      customMessage: parsed.data.customMessage,
      leadIds: parsed.data.leadIds,
    })

    return NextResponse.json(
      {
        job,
        message: 'Campaña encolada. Procesá con POST .../broadcast/[jobId]/process',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('POST remarketing broadcast failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    const message = error instanceof Error ? error.message : 'Error al crear campaña'
    const status = message.includes('No hay leads') ? 400 : 500
    return NextResponse.json({ error: status === 400 ? 'Bad Request' : 'Internal server error', message }, { status })
  }
}
