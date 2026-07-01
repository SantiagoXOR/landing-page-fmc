import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import {
  bulkMoveLeadsBatch,
  countLeadsInStage,
  BULK_MOVE_DEFAULT_BATCH_SIZE,
} from '@/server/services/pipeline-bulk-move-service'

export const dynamic = 'force-dynamic'

const BulkMoveSchema = z.object({
  fromStageId: z.string().min(1),
  toStageId: z.string().min(1),
  offset: z.number().int().min(0).optional().default(0),
  batchSize: z.number().int().min(1).max(100).optional().default(BULK_MOVE_DEFAULT_BATCH_SIZE),
})

async function requirePipelineWrite(userId: string) {
  const allowed = await checkUserPermission(userId, 'pipeline', 'write')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'No tiene permisos para mover leads en el pipeline' },
      { status: 403 }
    )
  }
  return null
}

/**
 * GET /api/pipeline/stages/bulk-move?fromStageId=cliente-nuevo
 * Preview: cantidad de leads en la etapa origen.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const forbidden = await requirePipelineWrite(session.user.id)
    if (forbidden) return forbidden

    const fromStageId = request.nextUrl.searchParams.get('fromStageId')
    if (!fromStageId) {
      return NextResponse.json(
        { error: 'Missing fromStageId', message: 'Indicá la etapa origen' },
        { status: 400 }
      )
    }

    const count = await countLeadsInStage(fromStageId)
    return NextResponse.json({ fromStageId, count })
  } catch (error) {
    logger.error('GET bulk-move preview failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Error al contar leads',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pipeline/stages/bulk-move
 * Mueve un lote de leads de una etapa a otra (sin WhatsApp/notificaciones).
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
    const parsed = BulkMoveSchema.parse(body)

    const result = await bulkMoveLeadsBatch({
      ...parsed,
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: result.done
        ? `Movimiento completado: ${result.nextOffset} de ${result.totalInStage}`
        : `Lote procesado: ${result.nextOffset} de ${result.totalInStage}`,
      ...result,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('POST bulk-move failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Error en movimiento masivo',
      },
      { status: 500 }
    )
  }
}
