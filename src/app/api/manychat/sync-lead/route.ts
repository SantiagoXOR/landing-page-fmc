import { NextRequest, NextResponse } from 'next/server'
import { ManychatSyncService } from '@/server/services/manychat-sync-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, fullSync = true } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId es requerido' },
        { status: 400 }
      )
    }

    let success: boolean

    if (fullSync) {
      // Sincronización completa (lead + tags + custom fields)
      success = await ManychatSyncService.fullSyncLeadToManychat(leadId)
    } else {
      // Solo sincronización básica del lead
      success = await ManychatSyncService.syncLeadToManychat(leadId)
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Lead sincronizado exitosamente con Manychat',
      })
    } else {
      return NextResponse.json(
        { error: 'Error al sincronizar lead con Manychat' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error en sync-lead:', error)
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar lead' },
      { status: 500 }
    )
  }
}

