import { NextRequest, NextResponse } from 'next/server'
import { ConversationService } from '@/server/services/conversation-service'
import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { Conversation } from '@/types/chat'

// Forzar renderizado dinámico (usa request dinámico)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const platform = searchParams.get('platform') // whatsapp, instagram
    const search = searchParams.get('search') // búsqueda en contenido
    const assignedTo = searchParams.get('assignedTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const sync = searchParams.get('sync') === 'true' // Sincronizar con Manychat antes de devolver

    // Si se solicita sincronización, primero sincronizar con Manychat
    if (sync) {
      try {
        logger.info('Sincronizando conversaciones desde Manychat')
        // Importar y llamar directamente al handler de sincronización
        const { POST: syncManychat } = await import('./sync-manychat/route')
        const syncResponse = await syncManychat()

        if (syncResponse.ok) {
          const syncData = await syncResponse.json()
          logger.info(`Sincronización completada: ${syncData.synced} conversaciones`)
        } else {
          logger.warn('Error en sincronización, continuando con datos locales')
        }
      } catch (syncError: any) {
        logger.error('Error durante sincronización', { error: syncError.message })
        // Continuar con datos locales si la sincronización falla
      }
    }

    const conversations = await ConversationService.getConversations({
      userId,
      status,
      platform,
      search,
      assignedTo,
      page,
      limit
    })

    // Transformar las conversaciones al formato esperado por el frontend
    const transformedConversations: Conversation[] = await Promise.all(
      (conversations.data || []).map(async (conv: any) => {
        // Obtener mensajes de la conversación
        let messages: any[] = []
        if (conv.id && supabase.client) {
          const { data: messagesData } = await supabase.client
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: false })
            .limit(1) // Solo el último mensaje para la lista

          messages = (messagesData || []).map((msg: any) => {
            // Función helper para convertir cualquier formato de fecha a ISO string
            const toISOString = (dateValue: any): string => {
              if (!dateValue) return new Date().toISOString()
              
              // Si ya es un string ISO válido
              if (typeof dateValue === 'string') {
                const parsed = new Date(dateValue)
                if (!isNaN(parsed.getTime())) {
                  return parsed.toISOString()
                }
              }
              
              // Si es un objeto Date
              if (dateValue instanceof Date) {
                if (!isNaN(dateValue.getTime())) {
                  return dateValue.toISOString()
                }
              }
              
              // Fallback: fecha actual
              return new Date().toISOString()
            }

            const sentAt = msg.sent_at || msg.created_at
            const formattedSentAt = toISOString(sentAt)

            return {
              id: msg.id,
              direction: msg.direction === 'inbound' ? 'inbound' : 'outbound',
              content: msg.content || '',
              messageType: msg.message_type || 'text',
              sentAt: formattedSentAt, // Asegurar formato ISO válido
              readAt: msg.read_at ? toISOString(msg.read_at) : undefined,
              isFromBot: msg.direction === 'outbound' || msg.is_from_bot || false
            }
          })
        }

        // Calcular unreadCount (mensajes no leídos)
        let unreadCount = 0
        if (conv.id && supabase.client) {
          const { count } = await supabase.client
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('direction', 'inbound')
            .is('read_at', null)
          
          unreadCount = count || 0
        }

        // Determinar botAlert (si el bot necesita atención)
        // Por ahora, si hay mensajes sin leer y el último mensaje es del bot, podría necesitar atención
        const botAlert = unreadCount > 0 && messages[0]?.isFromBot

        return {
          id: conv.id,
          platform: conv.platform || 'whatsapp',
          status: conv.status || 'open',
          assignedTo: conv.assigned_to,
          lastMessageAt: conv.last_message_at || conv.created_at || new Date().toISOString(),
          createdAt: conv.created_at || new Date().toISOString(),
          unreadCount,
          botAlert,
          lead: conv.lead ? {
            id: conv.lead.id,
            nombre: conv.lead.nombre || 'Sin nombre',
            telefono: conv.lead.telefono || '',
            email: conv.lead.email,
            manychatId: conv.lead.manychatId || conv.lead.manychat_id,
            tags: conv.lead.tags ? (typeof conv.lead.tags === 'string' ? JSON.parse(conv.lead.tags) : conv.lead.tags) : [],
            profileImage: conv.lead.profile_image || conv.lead.profileImage
          } : undefined,
          assignedUser: conv.assigned_user ? {
            id: conv.assigned_user.id,
            nombre: conv.assigned_user.nombre || conv.assigned_user.name || '',
            email: conv.assigned_user.email || ''
          } : undefined,
          messages: messages,
          manychatData: conv.lead?.manychatId ? {
            flowName: conv.manychat_flow_name,
            flowNs: conv.manychat_flow_ns,
            botActive: conv.manychat_bot_active || false
          } : undefined
        }
      })
    )

    return NextResponse.json({ 
      conversations: transformedConversations,
      total: conversations.total,
      page,
      limit
    })
  } catch (error: any) {
    logger.error('Error fetching conversations', { error: error.message })
    return NextResponse.json(
      { error: 'Failed to fetch conversations', conversations: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, platformId, leadId } = body

    if (!platform || !platformId) {
      return NextResponse.json(
        { error: 'Platform and platformId are required' },
        { status: 400 }
      )
    }

    const conversation = await ConversationService.createConversation({
      platform,
      platformId,
      leadId
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating conversation', { error: error.message })
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
