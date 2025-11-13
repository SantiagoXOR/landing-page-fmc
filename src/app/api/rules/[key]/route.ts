import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { RuleRepository } from '@/server/repositories/rule-repository'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

const ruleRepo = new RuleRepository()

export async function DELETE(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:write')

    await ruleRepo.delete(params.key)

    logger.info('Rule deleted', { key: params.key }, { userId: session.user.id })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    logger.error('Error in DELETE /api/rules/[key]', { error: error.message, key: params.key })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
