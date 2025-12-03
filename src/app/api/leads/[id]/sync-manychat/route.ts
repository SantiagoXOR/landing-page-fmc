import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { ManychatService } from '@/server/services/manychat-service'
import { ManychatSyncService } from '@/server/services/manychat-sync-service'
import { supabase } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/[id]/sync-manychat
 * Sincronizar un lead desde Manychat hacia el CRM
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:write')

    const leadId = params.id

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId es requerido' },
        { status: 400 }
      )
    }

    // Obtener el lead actual
    const { data: lead, error: leadError } = await supabase.client
      .from('Lead')
      .select('id, manychatId, telefono, nombre')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    // Obtener subscriber de Manychat
    let subscriber = null
    
    if (lead.manychatId) {
      // Intentar obtener por manychatId primero
      subscriber = await ManychatService.getSubscriberById(lead.manychatId)
    }
    
    if (!subscriber && lead.telefono) {
      // Si no se encontró por manychatId, intentar por teléfono
      subscriber = await ManychatService.getSubscriberByPhone(lead.telefono)
    }

    if (!subscriber) {
      return NextResponse.json(
        { error: 'No se encontró el subscriber en Manychat. Verifica que el lead tenga manychatId o teléfono válido.' },
        { status: 404 }
      )
    }

    // Sincronizar desde Manychat hacia el CRM
    const syncedLeadId = await ManychatSyncService.syncManychatToLead(subscriber)

    if (!syncedLeadId) {
      return NextResponse.json(
        { error: 'Error al sincronizar lead desde Manychat' },
        { status: 500 }
      )
    }

    logger.info('Lead sincronizado desde Manychat', {
      leadId: syncedLeadId,
      manychatId: subscriber.id,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Lead sincronizado exitosamente desde Manychat',
      leadId: syncedLeadId
    })

  } catch (error: any) {
    logger.error('Error sincronizando lead desde Manychat', {
      error: error.message,
      stack: error.stack,
      leadId: params.id
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(
      { error: error.message || 'Error al sincronizar lead desde Manychat' },
      { status: 500 }
    )
  }
}

