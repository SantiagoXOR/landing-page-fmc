import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ManychatService } from '@/server/services/manychat-service'
import { ConversationService } from '@/server/services/conversation-service'
import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { Conversation } from '@/types/chat'

/**
 * POST /api/conversations/sync-manychat
 * Sincroniza conversaciones desde Manychat
 * Obtiene leads con manychatId y actualiza su información desde Manychat
 */
export async function POST() {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session) {
      logger.warn('Intento de sincronización sin autenticación')
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

    logger.info('Iniciando sincronización de conversaciones desde Manychat', {
      userId: session.user.id,
      email: session.user.email
    })

    const conversations: Conversation[] = []
    let syncedCount = 0
    let foundSubscribersCount = 0

    // ESTRATEGIA 1: Obtener leads que tienen manychatId (ya sincronizados)
    // Priorizar leads con actividad reciente (actualizados en los últimos 30 días)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: leadsWithManychatId, error: leadsError } = await supabase.client
      .from('Lead')
      .select('id, nombre, telefono, email, manychatId, tags, estado, createdAt, updatedAt, producto, monto, zona, banco, trabajo_actual')
      .not('manychatId', 'is', null)
      .gte('updatedAt', thirtyDaysAgo.toISOString())
      .order('updatedAt', { ascending: false })
      .limit(100)

    if (leadsError) {
      logger.error('Error obteniendo leads con manychatId', { 
        error: leadsError,
        message: leadsError.message
      })
    }

    // ESTRATEGIA 2: Buscar leads sin manychatId que tengan teléfono y buscar en Manychat
    const { data: leadsWithoutManychatId } = await supabase.client
      .from('Lead')
      .select('id, nombre, telefono, email, manychatId, tags, estado, createdAt, updatedAt, producto, monto, zona, banco, trabajo_actual')
      .is('manychatId', null)
      .not('telefono', 'is', null)
      .order('updatedAt', { ascending: false })
      .limit(50) // Limitar para no sobrecargar

    logger.info('Leads encontrados', {
      withManychatId: leadsWithManychatId?.length || 0,
      withoutManychatId: leadsWithoutManychatId?.length || 0,
      totalLeads: (leadsWithManychatId?.length || 0) + (leadsWithoutManychatId?.length || 0)
    })

    // Debug: Log primeros leads encontrados
    if (leadsWithManychatId && leadsWithManychatId.length > 0) {
      logger.debug('Primeros leads con manychatId', {
        leads: leadsWithManychatId.slice(0, 3).map(l => ({
          id: l.id,
          nombre: l.nombre,
          telefono: l.telefono,
          manychatId: l.manychatId
        }))
      })
    }

    // Procesar leads sin manychatId: buscar en Manychat por teléfono
    if (leadsWithoutManychatId && leadsWithoutManychatId.length > 0) {
      logger.info('Buscando subscribers en Manychat por teléfono')
      
      for (const lead of leadsWithoutManychatId) {
        try {
          if (!lead.telefono) {
            logger.debug(`Lead ${lead.id} no tiene teléfono, saltando búsqueda en Manychat`)
            continue
          }

          // Validar formato básico del teléfono antes de buscar
          const phoneStr = String(lead.telefono).trim()
          if (!phoneStr || phoneStr === 'null' || phoneStr === 'undefined' || phoneStr.length < 8) {
            logger.debug(`Lead ${lead.id} tiene teléfono inválido: ${phoneStr}`, {
              telefono: phoneStr.substring(0, 5) + '***'
            })
            continue
          }

          // Buscar subscriber en Manychat por teléfono
          const subscriber = await ManychatService.getSubscriberByPhone(lead.telefono)
          
          if (subscriber && subscriber.id) {
            // Actualizar lead con manychatId
            const { error: updateError } = await supabase.client
              .from('Lead')
              .update({ 
                manychatId: String(subscriber.id),
                updatedAt: new Date().toISOString()
              })
              .eq('id', lead.id)

            if (!updateError) {
              // Agregar manychatId al objeto lead para usarlo después
              ;(lead as any).manychatId = String(subscriber.id)
              foundSubscribersCount++
              logger.info(`✅ Lead ${lead.id} ahora tiene manychatId: ${subscriber.id}`, {
                telefono: phoneStr.substring(0, 5) + '***'
              })
            } else {
              logger.warn(`Error actualizando manychatId para lead ${lead.id}`, {
                error: updateError.message
              })
            }

            // Pequeño delay para respetar rate limits
            await new Promise(resolve => setTimeout(resolve, 50))
          } else {
            // Subscriber no encontrado - esto es normal, no es un error
            logger.debug(`Subscriber no encontrado en Manychat para lead ${lead.id}`, {
              telefono: phoneStr.substring(0, 5) + '***'
            })
          }
        } catch (error: any) {
          // Error al buscar subscriber - continuar con el siguiente lead
          logger.warn(`Error buscando subscriber para lead ${lead.id}`, {
            error: error.message,
            telefono: lead.telefono ? String(lead.telefono).substring(0, 5) + '***' : 'sin teléfono'
          })
          // Continuar con el siguiente lead sin fallar toda la sincronización
        }
      }
    }

    // Combinar todos los leads a procesar
    const allLeads = [
      ...(leadsWithManychatId || []),
      ...(leadsWithoutManychatId?.filter(l => (l as any).manychatId) || [])
    ]

    if (allLeads.length === 0) {
      logger.info('No hay leads para sincronizar')
      return NextResponse.json({
        message: 'No hay leads para sincronizar. Busca leads por teléfono o sincroniza leads con Manychat primero.',
        conversations: [],
        synced: 0,
        foundSubscribers: foundSubscribersCount
      })
    }

    // Procesar cada lead y obtener información actualizada de Manychat
    for (const lead of allLeads) {
      try {
        if (!lead.manychatId) continue

        // Usar manychatId como string directamente para evitar problemas con IDs grandes
        // Los IDs de Facebook/Meta pueden ser muy largos y perder precisión al convertirlos a número
        const subscriberId = lead.manychatId.trim()
        
        if (!subscriberId || subscriberId === 'null' || subscriberId === 'undefined') {
          logger.warn(`Lead ${lead.id} tiene manychatId inválido: ${lead.manychatId}`)
          continue
        }

        // Obtener información actualizada del subscriber desde Manychat
        // Pasar como string para mantener precisión con IDs grandes
        const subscriber = await ManychatService.getSubscriberById(subscriberId)
        
        if (!subscriber) {
          logger.warn(`Subscriber ${subscriberId} no encontrado en Manychat`, {
            leadId: lead.id,
            manychatId: subscriberId,
            action: 'SKIP_SYNC'
          })
          
          // Opcional: Limpiar manychatId si el subscriber ya no existe
          // Esto evita intentar sincronizar con IDs inválidos en el futuro
          try {
            await supabase.client
              .from('Lead')
              .update({ 
                manychatId: null,
                updatedAt: new Date().toISOString()
              })
              .eq('id', lead.id)
            
            logger.info(`manychatId limpiado para lead ${lead.id} (subscriber ${subscriberId} no existe)`)
          } catch (cleanupError: any) {
            logger.warn(`Error limpiando manychatId para lead ${lead.id}`, {
              error: cleanupError.message
            })
          }
          
          continue
        }

        // Filtrar por actividad reciente: usar last_interaction de Manychat para priorizar
        // La sincronización ya prioriza leads actualizados recientemente, pero también
        // podemos usar last_interaction de Manychat para determinar actividad
        if (subscriber.last_interaction) {
          const lastInteractionDate = new Date(subscriber.last_interaction)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          
          // Log para debugging (opcional: filtrar si la actividad es muy antigua)
          if (lastInteractionDate < thirtyDaysAgo) {
            logger.debug(`Subscriber ${subscriberId} última interacción: ${lastInteractionDate.toISOString()}`)
          }
        }

        // Determinar plataforma según datos del subscriber usando detectChannel
        const detectedChannel = ManychatService.detectChannel(subscriber)
        const platform = detectedChannel === 'instagram' ? 'instagram' :
                         detectedChannel === 'facebook' ? 'facebook' :
                         'whatsapp'

        // Buscar o crear conversación
        const platformId = String(
          subscriber.whatsapp_phone || 
          subscriber.phone || 
          subscriber.instagram_id || 
          subscriber.ig_id || 
          subscriber.id
        )
        let conversation = await ConversationService.findConversationByPlatform(platform, platformId)

        if (!conversation) {
          // Crear nueva conversación
          conversation = await ConversationService.createConversation({
            platform,
            platformId,
            leadId: lead.id
          })
        }

        // Obtener mensajes de la conversación
        let messages: any[] = []
        if (conversation.id) {
          const { data: messagesData, error: messagesError } = await supabase.client
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('sent_at', { ascending: false })
            .limit(1)

          if (messagesError) {
            logger.warn(`Error obteniendo mensajes para conversación ${conversation.id}`, {
              error: messagesError.message
            })
          }

          messages = (messagesData || []).map((msg: any) => ({
            id: msg.id,
            direction: msg.direction === 'inbound' ? 'inbound' : 'outbound',
            content: msg.content || '',
            messageType: msg.message_type || 'text',
            sentAt: msg.sent_at || msg.created_at,
            readAt: msg.read_at,
            isFromBot: msg.direction === 'outbound' || msg.is_from_bot || false
          }))

          // Debug: Log si no hay mensajes
          if (messages.length === 0) {
            logger.debug(`Conversación ${conversation.id} no tiene mensajes aún`, {
              leadId: lead.id,
              platform,
              platformId,
              subscriberId
            })
          }
        }

        // Calcular unreadCount
        let unreadCount = 0
        if (conversation.id) {
          const { count } = await supabase.client
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .eq('direction', 'inbound')
            .is('read_at', null)
          
          unreadCount = count || 0
        }

        // Determinar botAlert (si el subscriber tiene tags específicos o necesita atención)
        const tags = subscriber.tags?.map(t => t.name) || []
        const botAlert = tags.some(tag => 
          tag.toLowerCase().includes('alert') || 
          tag.toLowerCase().includes('atención') ||
          tag.toLowerCase().includes('urgente')
        ) || (unreadCount > 0 && messages[0]?.isFromBot)

        // Actualizar última actividad basada en el último mensaje real de la conversación
        // No usar last_interaction de ManyChat porque puede no ser el último mensaje real
        // En su lugar, obtener el último mensaje de la base de datos
        const { data: lastMessages } = await supabase.client
          .from('messages')
          .select('sent_at')
          .eq('conversation_id', conversation.id)
          .order('sent_at', { ascending: false })
          .limit(1)
        
        const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null

        if (lastMessage?.sent_at) {
          // Usar el timestamp del último mensaje real
          const lastMessageAt = new Date(lastMessage.sent_at).toISOString()
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-manychat/route.ts:updateLastMessageAt',message:'Updating last_message_at from real message',data:{conversationId:conversation.id,lastMessageSentAt:lastMessage.sent_at,lastMessageAt,subscriberLastInteraction:subscriber.last_interaction},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          await supabase.client
            .from('conversations')
            .update({ 
              last_message_at: lastMessageAt,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id)
        } else if (subscriber.last_interaction) {
          // Fallback: si no hay mensajes, usar last_interaction
          const lastInteractionDate = new Date(subscriber.last_interaction)
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/cc4e9eec-246d-49a2-8638-d6c7244aef83',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sync-manychat/route.ts:updateLastMessageAt:fallback',message:'Updating last_message_at from last_interaction (fallback)',data:{conversationId:conversation.id,lastInteraction:subscriber.last_interaction,hasLastMessage:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          await supabase.client
            .from('conversations')
            .update({ 
              last_message_at: lastInteractionDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', conversation.id)
        }

        // Transformar a formato Conversation
        const transformedConversation: Conversation = {
          id: conversation.id,
          platform,
          status: conversation.status || 'open',
          assignedTo: conversation.assigned_to,
          lastMessageAt: subscriber.last_interaction || conversation.last_message_at || conversation.created_at || new Date().toISOString(),
          createdAt: conversation.created_at || new Date().toISOString(),
          unreadCount,
          botAlert,
          lead: {
            id: lead.id,
            nombre: subscriber.first_name && subscriber.last_name 
              ? `${subscriber.first_name} ${subscriber.last_name}`.trim()
              : subscriber.name || lead.nombre || 'Sin nombre',
            telefono: subscriber.whatsapp_phone || subscriber.phone || lead.telefono || '',
            email: subscriber.email || lead.email,
            manychatId: String(subscriber.id),
            tags: tags,
            profileImage: subscriber.profile_pic,
            producto: lead.producto,
            monto: lead.monto,
            zona: lead.zona,
            banco: lead.banco,
            trabajo_actual: lead.trabajo_actual,
            estado: lead.estado
          },
          messages: messages,
          manychatData: {
            flowName: undefined, // Se puede obtener de custom fields si está disponible
            botActive: subscriber.status === 'active'
          }
        }

        conversations.push(transformedConversation)
        syncedCount++

        // Pequeño delay para respetar rate limits de Manychat
        await new Promise(resolve => setTimeout(resolve, 10))

      } catch (error: any) {
        logger.error(`Error sincronizando lead ${lead.id}`, { 
          error: error.message,
          leadId: lead.id 
        })
        // Continuar con el siguiente lead
      }
    }

    logger.info(`Sincronización completada: ${syncedCount} conversaciones sincronizadas, ${foundSubscribersCount} nuevos subscribers encontrados`, {
      totalLeads: allLeads.length,
      conversationsWithMessages: conversations.filter(c => c.messages && c.messages.length > 0).length,
      conversationsWithoutMessages: conversations.filter(c => !c.messages || c.messages.length === 0).length
    })

    // Advertencia si hay conversaciones sin mensajes
    const conversationsWithoutMessages = conversations.filter(c => !c.messages || c.messages.length === 0).length
    let message = `Sincronización completada`
    if (conversationsWithoutMessages > 0) {
      message += `. ${conversationsWithoutMessages} conversaciones no tienen mensajes aún. Los mensajes llegarán vía webhooks cuando haya actividad.`
    }

    return NextResponse.json({
      message,
      conversations,
      synced: syncedCount,
      total: allLeads.length,
      foundSubscribers: foundSubscribersCount,
      conversationsWithMessages: conversations.filter(c => c.messages && c.messages.length > 0).length,
      conversationsWithoutMessages
    })

  } catch (error: any) {
    logger.error('Error en sincronización de Manychat', { error: error.message })
    return NextResponse.json(
      { error: 'Error sincronizando conversaciones', conversations: [] },
      { status: 500 }
    )
  }
}

