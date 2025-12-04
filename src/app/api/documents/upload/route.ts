import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { SupabaseStorageService, DocumentCategory } from '@/lib/supabase-storage'
import { checkUserPermission } from '@/lib/rbac'

// Configurar para manejar archivos grandes
export const maxDuration = 300 // 5 minutos para archivos grandes
export const runtime = 'nodejs' // Usar Node.js runtime para mejor soporte de archivos grandes

// Límite de Vercel para body (4.5MB), pero intentaremos manejar archivos más grandes
const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024 // 4.5MB

/**
 * POST /api/documents/upload
 * Subir un documento
 * 
 * Nota: Para archivos > 4.5MB, Vercel tiene limitaciones.
 * En ese caso, se recomienda usar upload directo a Supabase Storage.
 */
export async function POST(request: NextRequest) {
  let session = null
  try {
    session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular
    const hasCreatePermission = await checkUserPermission(session.user.id, 'documents', 'write')
    
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

    // Advertir sobre límite de Vercel para archivos grandes
    if (file.size > VERCEL_BODY_LIMIT) {
      return NextResponse.json({
        error: 'File too large for direct upload',
        message: `El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). El límite para subida directa es ${(VERCEL_BODY_LIMIT / 1024 / 1024).toFixed(1)}MB. Por favor, usa la opción de subida directa a Supabase Storage.`,
        fileSize: file.size,
        maxSize: VERCEL_BODY_LIMIT,
        requiresDirectUpload: true
      }, { status: 413 })
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
    console.error('[Documents API] Error uploading file:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: session?.user?.id,
      timestamp: new Date().toISOString()
    })
    
    if (error instanceof Error) {
      // Errores de tamaño de archivo
      if (error.message.includes('File size exceeds') || error.message.includes('exceeded the maximum')) {
        return NextResponse.json({
          error: 'File too large',
          message: 'El archivo excede el tamaño máximo permitido (100MB). Por favor, comprime el archivo o usa uno más pequeño.'
        }, { status: 413 })
      }
      
      // Manejar errores de Vercel body size limit
      if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
        return NextResponse.json({
          error: 'File too large',
          message: 'El archivo es demasiado grande para subir directamente. El límite máximo es 4.5MB para subida directa. Por favor, comprime el archivo o usa un archivo más pequeño.',
          requiresDirectUpload: true
        }, { status: 413 })
      }

      // Errores de Storage de Supabase
      if (error.message.includes('Bucket') || error.message.includes('storage')) {
        return NextResponse.json({
          error: 'Storage error',
          message: 'Error al acceder al almacenamiento. Por favor, intenta nuevamente o contacta al administrador.'
        }, { status: 500 })
      }

      // Errores de base de datos
      if (error.message.includes('database') || error.message.includes('relation') || error.message.includes('constraint')) {
        return NextResponse.json({
          error: 'Database error',
          message: 'Error al guardar la información del documento. Por favor, verifica que el lead existe e intenta nuevamente.'
        }, { status: 500 })
      }

      // Errores de permisos
      if (error.message.includes('permission') || error.message.includes('Forbidden') || error.message.includes('RLS')) {
        return NextResponse.json({
          error: 'Permission error',
          message: 'No tienes permisos para realizar esta acción. Por favor, contacta al administrador.'
        }, { status: 403 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to upload document',
      message: 'Error al subir el documento. Por favor, intenta nuevamente o contacta al administrador si el problema persiste.'
    }, { status: 500 })
  }
}

