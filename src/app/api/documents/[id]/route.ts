import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { SupabaseStorageService } from '@/lib/supabase-storage'
import { checkUserPermission } from '@/lib/rbac'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/documents/[id]
 * Obtener un documento específico
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasReadPermission = await checkUserPermission(session.user.id, 'documents', 'read')
    
    if (!hasReadPermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para ver documentos'
      }, { status: 403 })
    }

    const document = await SupabaseStorageService.getDocument(params.id)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Generar URL firmada actualizada
    const signedUrl = await SupabaseStorageService.getSignedUrl(document.storage_path, 3600)

    return NextResponse.json({
      ...document,
      public_url: signedUrl || document.public_url
    })
  } catch (error) {
    console.error('[Documents API] Error fetching document:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch document'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]
 * Actualizar metadata de un documento
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasUpdatePermission = await checkUserPermission(session.user.id, 'documents', 'update')
    
    if (!hasUpdatePermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para editar documentos'
      }, { status: 403 })
    }

    const body = await request.json()
    const { description, category } = body

    const updates: any = {}
    if (description !== undefined) updates.description = description
    if (category !== undefined) updates.category = category

    const document = await SupabaseStorageService.updateDocumentMetadata(params.id, updates)

    return NextResponse.json({ document })
  } catch (error) {
    console.error('[Documents API] Error updating document:', error)
    return NextResponse.json({ 
      error: 'Failed to update document'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/documents/[id]
 * Eliminar un documento
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasDeletePermission = await checkUserPermission(session.user.id, 'documents', 'delete')
    
    if (!hasDeletePermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para eliminar documentos'
      }, { status: 403 })
    }

    await SupabaseStorageService.deleteDocument(params.id)

    return NextResponse.json({ 
      success: true,
      message: 'Documento eliminado exitosamente'
    })
  } catch (error) {
    console.error('[Documents API] Error deleting document:', error)
    
    if (error instanceof Error && error.message === 'Document not found') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      error: 'Failed to delete document'
    }, { status: 500 })
  }
}

