import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ScoringService } from '@/server/services/scoring-service'
import { ScoringRequestSchema } from '@/lib/validators'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    logger.info('POST /api/scoring/eval - Starting request')

    const session = await getServerSession(authOptions)

    if (!session) {
      logger.warn('Unauthorized access attempt to scoring endpoint')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('User authenticated', { userId: session.user.id, role: session.user.role })

    checkPermission(session.user.role, 'leads:write')

    const body = await request.json()
    logger.info('Request body received', { body })

    const { leadId } = ScoringRequestSchema.parse(body)
    logger.info('Lead ID validated', { leadId })

    // Usar el servicio estático actualizado
    const result = await ScoringService.evaluateLead(leadId)
    logger.info('Scoring evaluation completed', { leadId, result })

    return NextResponse.json(result)

  } catch (error: any) {
    logger.error('Error in POST /api/scoring/eval', {
      error: error.message,
      stack: error.stack,
      name: error.name
    })

    if (error.name === 'ZodError') {
      logger.error('Validation error', { errors: error.errors })
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.message === 'Lead not found') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (error.message.includes('scoring rules')) {
      return NextResponse.json({ error: 'Scoring system not configured' }, { status: 503 })
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}
