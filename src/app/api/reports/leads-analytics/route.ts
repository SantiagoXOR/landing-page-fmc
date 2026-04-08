import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ReportAnalyticsQuerySchema } from '@/lib/validators'
import { validateQueryParams, createValidationErrorResponse } from '@/lib/validation-middleware'
import { hasPermission, type UserRole } from '@/lib/rbac'
import { runLeadAnalytics } from '@/server/reports/run-lead-analytics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/leads-analytics
 * Métricas operativas, embudo, chats/pipeline y negocio para la pantalla Reportes.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const isTestingMode = process.env.TESTING_MODE === 'true'

  if (!session?.user && !isTestingMode) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Debe iniciar sesión' }, { status: 401 })
  }

  if (
    session?.user &&
    !isTestingMode &&
    !hasPermission(session.user.role as UserRole, 'reports:read')
  ) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'No tiene permisos para ver reportes' },
      { status: 403 }
    )
  }

  const qv = validateQueryParams(request, ReportAnalyticsQuerySchema)
  if (!qv.success) {
    return createValidationErrorResponse(qv.errors!)
  }

  const { supabaseClient } = await import('@/lib/db')
  if (!supabaseClient) {
    return NextResponse.json(
      { error: 'Database not configured', message: 'Supabase no disponible' },
      { status: 500 }
    )
  }

  try {
    const payload = await runLeadAnalytics(supabaseClient, qv.data!)
    return NextResponse.json(payload)
  } catch (e: any) {
    console.error('[reports/leads-analytics]', e)
    return NextResponse.json(
      { error: 'Internal error', message: e?.message || 'Error al calcular analíticas' },
      { status: 500 }
    )
  }
}
