import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LeadService } from '@/server/services/lead-service'
import { LeadUpdateSchema } from '@/lib/validators'
import { checkPermission, checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { ManychatSyncService } from '@/server/services/manychat-sync-service'
import { ManychatService } from '@/server/services/manychat-service'

const leadService = new LeadService()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular de lectura
    const hasReadPermission = await checkUserPermission(session.user.id, 'leads', 'read')
    
    if (!hasReadPermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para ver este lead'
      }, { status: 403 })
    }

    const lead = await leadService.getLeadById(params.id)

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)

  } catch (error: any) {
    logger.error('Error in GET /api/leads/[id]', { error: error.message, leadId: params.id })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular de actualización
    const hasUpdatePermission = await checkUserPermission(session.user.id, 'leads', 'update')
    
    if (!hasUpdatePermission) {
      logger.warn('Permission denied for lead update', {
        userId: session.user.id,
        leadId: params.id
      })
      
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para editar leads'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = LeadUpdateSchema.parse(body)

    const lead = await leadService.updateLead(params.id, validatedData, session.user?.id || '')

    // Enviar notificación en tiempo real
    try {
      const { notifyLeadUpdated } = await import('@/lib/notification-helpers')
      const changes = Object.keys(validatedData)
      notifyLeadUpdated({
        id: params.id,
        nombre: lead?.nombre || '',
        email: lead?.email,
        telefono: lead?.telefono,
        estado: lead?.estado
      }, session.user.id, changes.length > 0 ? changes : undefined)
    } catch (notificationError) {
      // Log error pero no fallar la actualización del lead
      logger.warn('Error enviando notificación de lead actualizado', {
        error: notificationError,
        leadId: params.id
      })
    }

    // Sincronizar automáticamente con ManyChat si está configurado
    if (ManychatService.isConfigured()) {
      try {
        // Sincronizar de forma asíncrona para no bloquear la respuesta
        ManychatSyncService.fullSyncLeadToManychat(params.id)
          .then((success) => {
            if (success) {
              logger.info(`Lead ${params.id} sincronizado automáticamente con ManyChat después de actualización`)
            } else {
              logger.warn(`No se pudo sincronizar lead ${params.id} con ManyChat después de actualización`)
            }
          })
          .catch((error: any) => {
            logger.error(`Error sincronizando lead ${params.id} con ManyChat`, {
              error: error?.message || String(error)
            })
          })
      } catch (error: any) {
        // Error silencioso, no afecta la actualización del lead
        logger.error(`Error iniciando sincronización automática para lead ${params.id}`, {
          error: error?.message || String(error)
        })
      }
    }

    // Asegurar que el lead sea serializable a JSON
    // Convertir cualquier Date object a string ISO y manejar valores no serializables
    try {
      const serializableLead = JSON.parse(JSON.stringify(lead, (key, value) => {
        // Convertir Date objects a ISO string
        if (value instanceof Date) {
          return value.toISOString()
        }
        // Manejar undefined y funciones
        if (value === undefined || typeof value === 'function') {
          return null
        }
        return value
      }))
      return NextResponse.json(serializableLead)
    } catch (serializationError: any) {
      // Si falla la serialización, crear un objeto limpio con solo los campos básicos
      logger.warn('Error serializando lead, retornando objeto limpio', {
        leadId: params.id,
        error: serializationError?.message
      })
      
      const cleanLead = {
        id: lead?.id,
        nombre: lead?.nombre,
        telefono: lead?.telefono,
        email: lead?.email,
        estado: lead?.estado,
        createdAt: lead?.createdAt instanceof Date ? lead.createdAt.toISOString() : lead?.createdAt,
        updatedAt: lead?.updatedAt instanceof Date ? lead.updatedAt.toISOString() : lead?.updatedAt
      }
      
      return NextResponse.json(cleanLead)
    }

  } catch (error: any) {
    // Asegurar que el error sea serializable
    const errorMessage = error?.message || String(error) || 'Unknown error'
    const errorName = error?.name || 'Error'
    const errorCode = error?.code
    
    logger.error('Error in PATCH /api/leads/[id]', { 
      error: errorMessage,
      errorName,
      errorCode,
      leadId: params.id 
    })
    
    if (errorName === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: Array.isArray(error.errors) ? error.errors : [] 
      }, { status: 400 })
    }
    
    if (errorMessage.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (errorCode === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular de eliminación
    const hasDeletePermission = await checkUserPermission(session.user.id, 'leads', 'delete')
    
    if (!hasDeletePermission) {
      logger.warn('Permission denied for lead deletion', {
        userId: session.user.id,
        leadId: params.id
      })
      
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para eliminar leads'
      }, { status: 403 })
    }

    // Verificar que el lead existe antes de eliminarlo
    const existingLead = await leadService.getLeadById(params.id)
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await leadService.deleteLead(params.id, session.user?.id || '')

    logger.info('Lead deleted successfully', { leadId: params.id, userId: session.user?.id })

    return NextResponse.json({ success: true, message: 'Lead eliminado exitosamente' })

  } catch (error: any) {
    logger.error('Error in DELETE /api/leads/[id]', { error: error.message, leadId: params.id })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
