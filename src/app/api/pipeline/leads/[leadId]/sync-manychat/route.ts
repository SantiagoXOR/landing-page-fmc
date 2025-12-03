import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/db'
import { syncPipelineToManychat, getTagForStage } from '@/lib/manychat-sync'
import { pipelineService } from '@/server/services/pipeline-service'
import { ManychatService } from '@/server/services/manychat-service'

/**
 * POST /api/pipeline/leads/[leadId]/sync-manychat
 * Sincronizar manualmente el pipeline stage de un lead a ManyChat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Debe iniciar sesión para sincronizar'
      }, { status: 401 })
    }

    // Verificar permisos
    const hasWritePermission = await checkUserPermission(session.user.id, 'pipeline', 'write')
    
    if (!hasWritePermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para sincronizar pipeline'
      }, { status: 403 })
    }

    const { leadId } = params
    
    if (!leadId) {
      return NextResponse.json({
        error: 'Missing lead ID',
        message: 'ID del lead es requerido'
      }, { status: 400 })
    }

    // Obtener el lead
    const lead = await supabase.findLeadById(leadId)
    if (!lead) {
      return NextResponse.json({
        error: 'Lead not found',
        message: `El lead con ID ${leadId} no existe`
      }, { status: 404 })
    }

    if (!lead.manychatId) {
      return NextResponse.json({
        error: 'No ManyChat ID',
        message: 'El lead no tiene manychatId. No se puede sincronizar.'
      }, { status: 400 })
    }

    // Obtener el pipeline actual
    const pipeline = await pipelineService.getLeadPipeline(leadId)
    if (!pipeline) {
      return NextResponse.json({
        error: 'No pipeline found',
        message: 'El lead no tiene pipeline. Muévelo a una etapa primero.'
      }, { status: 400 })
    }

    // Verificar que el tag existe en ManyChat
    const allTags = await ManychatService.getTags()
    const stageTag = await getTagForStage(pipeline.current_stage)
    
    if (!stageTag) {
      return NextResponse.json({
        error: 'No tag mapping',
        message: `No hay mapeo de tag para la etapa ${pipeline.current_stage}`
      }, { status: 400 })
    }

    const tagExists = allTags.find(t => t.name === stageTag)
    
    if (!tagExists) {
      return NextResponse.json({
        error: 'Tag not found in ManyChat',
        message: `El tag "${stageTag}" no existe en ManyChat. Por favor créalo primero en ManyChat antes de sincronizar.`,
        tagName: stageTag,
        availableTags: allTags.slice(0, 20).map(t => t.name),
        instructions: 'Ve a ManyChat → Tags → Crear nuevo tag → Nombre: "credito-preaprobado"'
      }, { status: 400 })
    }

    // Sincronizar
    try {
      const success = await syncPipelineToManychat({
        leadId,
        manychatId: lead.manychatId,
        previousStage: undefined, // No sabemos la etapa anterior
        newStage: pipeline.current_stage,
        userId: session.user.id
      })

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Pipeline sincronizado exitosamente con ManyChat',
          stage: pipeline.current_stage,
          tag: stageTag,
          tagId: tagExists.id
        })
      } else {
        return NextResponse.json({
          error: 'Sync failed',
          message: 'No se pudo sincronizar con ManyChat'
        }, { status: 500 })
      }
    } catch (syncError: any) {
      logger.error('Error syncing pipeline to ManyChat', {
        error: syncError.message,
        leadId,
        manychatId: lead.manychatId
      })

      return NextResponse.json({
        error: 'Sync error',
        message: syncError.message || 'Error al sincronizar con ManyChat',
        details: syncError.details || syncError
      }, { status: 500 })
    }

  } catch (error: any) {
    logger.error('Error in sync-manychat endpoint', {
      error: error.message,
      stack: error.stack,
      leadId: params?.leadId
    })

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Error interno del servidor al sincronizar'
    }, { status: 500 })
  }
}

