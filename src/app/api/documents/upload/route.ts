import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { SupabaseStorageService, DocumentCategory } from '@/lib/supabase-storage'
import { checkUserPermission } from '@/lib/rbac'

/**
 * POST /api/documents/upload
 * Subir un documento
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular
    const hasCreatePermission = await checkUserPermission(session.user.id, 'documents', 'create')
    
    if (!hasCreatePermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para subir documentos'
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const leadId = formData.get('leadId') as string
    const category = formData.get('category') as DocumentCategory
    const description = formData.get('description') as string | undefined

    if (!file || !leadId || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        message: 'file, leadId y category son requeridos'
      }, { status: 400 })
    }

    // Validar categoría
    const validCategories: DocumentCategory[] = ['dni', 'comprobantes', 'contratos', 'recibos', 'otros']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category',
        message: 'Categoría no válida'
      }, { status: 400 })
    }

    // Inicializar bucket si es necesario
    await SupabaseStorageService.initializeBucket()

    // Subir archivo
    const document = await SupabaseStorageService.uploadFile(
      {
        file,
        leadId,
        category,
        description,
      },
      session.user.id
    )

    console.log('[Documents API] File uploaded successfully:', {
      documentId: document.id,
      leadId,
      filename: document.original_filename,
      userId: session.user.id,
    })

    return NextResponse.json({ 
      success: true,
      document 
    }, { status: 201 })
  } catch (error) {
    console.error('[Documents API] Error uploading file:', error)
    
    if (error instanceof Error && error.message.includes('File size exceeds')) {
      return NextResponse.json({
        error: 'File too large',
        message: error.message
      }, { status: 413 })
    }

    return NextResponse.json({ 
      error: 'Failed to upload document',
      message: 'Error al subir el documento'
    }, { status: 500 })
  }
}

