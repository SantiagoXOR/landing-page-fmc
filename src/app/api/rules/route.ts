import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { RuleRepository } from '@/server/repositories/rule-repository'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const ruleRepo = new RuleRepository()

const RuleSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:read')

    const rules = await ruleRepo.findAll()
    
    return NextResponse.json(rules)

  } catch (error: any) {
    logger.error('Error in GET /api/rules', { error: error.message })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:write')

    const body = await request.json()
    const { key, value } = RuleSchema.parse(body)

    const rule = await ruleRepo.upsert(key, value)

    logger.info('Rule updated', { key, value }, { userId: session.user.id })

    return NextResponse.json(rule)

  } catch (error: any) {
    logger.error('Error in POST /api/rules', { error: error.message })
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
