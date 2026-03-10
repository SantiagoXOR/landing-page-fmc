import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { getPipelineTags, getBusinessTags } from '@/lib/pipeline-stage-tags'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tags/list
 * Lista de nombres de tags disponibles (desde pipeline_stage_tags y BD).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const [pipeline, business] = await Promise.all([getPipelineTags(), getBusinessTags()])
    const tags = Array.from(new Set([...pipeline, ...business]))
    return NextResponse.json({ tags })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error obteniendo tags' }, { status: 500 })
  }
}
