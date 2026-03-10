import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { SupabaseStorageService } from '@/lib/supabase-storage'
import { logger } from '@/lib/logger'

/**
 * POST /api/messaging/upload
 * Subir adjunto para enviar por chat (imagen, audio o documento).
 * Devuelve { url, messageType, filename } para usar en POST /api/messaging/send con mediaUrl.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
      checkPermission(session.user.role, 'leads:write')
    } catch {
      return NextResponse.json({ error: 'Sin permisos para enviar mensajes' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Se requiere un archivo (file)' },
        { status: 400 }
      )
    }

    const result = await SupabaseStorageService.uploadChatAttachment(file, session.user.id)

    logger.info('Adjunto de chat subido', {
      userId: session.user.id,
      filename: result.filename,
      messageType: result.messageType,
    })

    return NextResponse.json(
      { success: true, url: result.url, messageType: result.messageType, filename: result.filename },
      { status: 201 }
    )
  } catch (error: any) {
    logger.error('Error subiendo adjunto de chat', {
      error: error?.message,
      userId: (await getServerSession(authOptions))?.user?.id,
    })
    return NextResponse.json(
      { error: error?.message || 'Error al subir el archivo' },
      { status: 500 }
    )
  }
}
