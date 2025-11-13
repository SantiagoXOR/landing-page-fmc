import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { SupabaseStorageService } from '@/lib/supabase-storage'
import { checkUserPermission } from '@/lib/rbac'

/**
 * GET /api/documents
 * Listar documentos con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso
    const hasReadPermission = await checkUserPermission(session.user.id, 'documents', 'read')
    
    if (!hasReadPermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para ver documentos'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId') || undefined
    const category = searchParams.get('category') as any || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await SupabaseStorageService.searchDocuments({
      leadId,
      category,
      search,
      page,
      limit
    })

    return NextResponse.json({
      documents: result.data,
      total: result.total,
      page,
      limit
    })
  } catch (error) {
    console.error('[Documents API] Error fetching documents:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch documents'
    }, { status: 500 })
  }
}

