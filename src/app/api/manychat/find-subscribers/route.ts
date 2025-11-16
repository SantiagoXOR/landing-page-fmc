import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ManychatService } from '@/server/services/manychat-service'
import { ConversationService } from '@/server/services/conversation-service'
import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ManychatSyncService } from '@/server/services/manychat-sync-service'

/**
 * POST /api/manychat/find-subscribers
 * Busca múltiples subscribers en Manychat por teléfono y crea leads/conversaciones
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session) {
      logger.warn('Intento de búsqueda de subscribers sin autenticación')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    if (!ManychatService.isConfigured()) {
      logger.warn('Manychat no está configurado', { userId: session.user.id })
      return NextResponse.json(
        { error: 'Manychat no está configurado' },
        { status: 400 }
      )
    }

    if (!supabase.client) {
      logger.error('Base de datos no disponible', { userId: session.user.id })
      return NextResponse.json(
        { error: 'Base de datos no disponible' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { phones } = body

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de teléfonos' },
        { status: 400 }
      )
    }

    if (phones.length > 100) {
      return NextResponse.json(
        { error: 'Máximo 100 teléfonos por solicitud' },
        { status: 400 }
      )
    }

    logger.info('Buscando subscribers en Manychat por teléfono', {
      userId: session.user.id,
      phoneCount: phones.length
    })

    // Buscar subscribers en Manychat
    const subscribersMap = await ManychatService.getSubscribersByPhones(phones)
    
    const results = {
      found: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    }

    // Para cada subscriber encontrado, crear o actualizar lead y conversación
    // Usar Array.from para compatibilidad con ES5
    for (const [phone, subscriber] of Array.from(subscribersMap.entries())) {
      try {
        results.found++

        // Sincronizar subscriber a lead (crea o actualiza)
        const leadId = await ManychatSyncService.syncManychatToLead(subscriber)
        
        if (!leadId) {
          results.errors.push(`No se pudo crear/actualizar lead para teléfono ${phone}`)
          continue
        }

        // Obtener el lead actualizado
        const { data: lead } = await supabase.client
          .from('Lead')
          .select('*')
          .eq('id', leadId)
          .single()

        if (!lead) {
          results.errors.push(`Lead ${leadId} no encontrado después de sincronizar`)
          continue
        }

        // Determinar plataforma
        let platform = 'whatsapp'
        if (subscriber.instagram_id) {
          platform = 'instagram'
        } else if (subscriber.whatsapp_phone || subscriber.phone) {
          platform = 'whatsapp'
        }

        // Buscar o crear conversación
        const platformId = subscriber.whatsapp_phone || subscriber.phone || subscriber.instagram_id || String(subscriber.id)
        let conversation = await ConversationService.findConversationByPlatform(platform, platformId)

        if (!conversation) {
          // Crear nueva conversación
          conversation = await ConversationService.createConversation({
            platform,
            platformId,
            leadId: lead.id
          })
          results.created++
        } else {
          // Actualizar última actividad si hay last_interaction
          if (subscriber.last_interaction) {
            const lastInteractionDate = new Date(subscriber.last_interaction)
            await supabase.client
              .from('conversations')
              .update({ 
                last_message_at: lastInteractionDate.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', conversation.id)
          }
          results.updated++
        }

        // Pequeño delay para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 10))

      } catch (error: any) {
        logger.error(`Error procesando subscriber para teléfono ${phone}`, {
          error: error.message,
          phone
        })
        results.errors.push(`Error procesando ${phone}: ${error.message}`)
      }
    }

    logger.info('Búsqueda de subscribers completada', {
      userId: session.user.id,
      found: results.found,
      created: results.created,
      updated: results.updated,
      errors: results.errors.length
    })

    return NextResponse.json({
      message: 'Búsqueda completada',
      results: {
        totalPhones: phones.length,
        found: results.found,
        created: results.created,
        updated: results.updated,
        errors: results.errors
      }
    })

  } catch (error: any) {
    logger.error('Error en búsqueda de subscribers', { error: error.message })
    return NextResponse.json(
      { error: 'Error buscando subscribers', details: error.message },
      { status: 500 }
    )
  }
}

