import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ManychatService } from '@/server/services/manychat-service'

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

/**
 * GET /api/webhooks/manychat/debug
 * Endpoint de debug para verificar estado de webhooks y mensajes
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    if (!ManychatService.isConfigured()) {
      return NextResponse.json({
        error: 'Manychat no está configurado',
        manychatConfigured: false
      })
    }

    if (!supabase.client) {
      return NextResponse.json({
        error: 'Base de datos no disponible',
        databaseAvailable: false
      })
    }

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      manychatConfigured: true,
      databaseAvailable: true,
      webhookEndpoint: (() => {
        if (process.env.NEXTAUTH_URL) return `${process.env.NEXTAUTH_URL}/api/webhooks/manychat`
        if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/manychat`
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/webhooks/manychat`
        return 'https://www.formosafmc.com.ar/api/webhooks/manychat'
      })(),
    }

    // 1. Verificar leads con manychatId
    const { data: leadsWithManychatId, error: leadsError } = await supabase.client
      .from('Lead')
      .select('id, nombre, telefono, manychatId, updatedAt')
      .not('manychatId', 'is', null)
      .order('updatedAt', { ascending: false })
      .limit(10)

    debugInfo.leads = {
      totalWithManychatId: leadsWithManychatId?.length || 0,
      error: leadsError?.message,
      sample: leadsWithManychatId?.slice(0, 3).map(l => ({
        id: l.id,
        nombre: l.nombre,
        telefono: l.telefono,
        manychatId: l.manychatId
      }))
    }

    // 2. Verificar conversaciones
    const { data: conversations, error: convError } = await supabase.client
      .from('conversations')
      .select('id, platform, platform_id, lead_id, last_message_at, created_at')
      .order('last_message_at', { ascending: false })
      .limit(10)

    debugInfo.conversations = {
      total: conversations?.length || 0,
      error: convError?.message,
      sample: conversations?.slice(0, 3).map(c => ({
        id: c.id,
        platform: c.platform,
        platform_id: c.platform_id,
        lead_id: c.lead_id,
        last_message_at: c.last_message_at
      }))
    }

    // 3. Verificar mensajes recientes
    const { data: messages, error: messagesError } = await supabase.client
      .from('messages')
      .select('id, conversation_id, direction, content, message_type, sent_at, platform_msg_id')
      .order('sent_at', { ascending: false })
      .limit(10)

    debugInfo.messages = {
      total: messages?.length || 0,
      error: messagesError?.message,
      sample: messages?.slice(0, 3).map(m => ({
        id: m.id,
        conversation_id: m.conversation_id,
        direction: m.direction,
        content: m.content?.substring(0, 50),
        message_type: m.message_type,
        sent_at: m.sent_at,
        platform_msg_id: m.platform_msg_id
      }))
    }

    // 4. Verificar webhooks recibidos (si hay tabla de logs)
    // Por ahora solo verificamos que el endpoint exista

    // 5. Test de conexión a Manychat API
    try {
      const testSubscriber = await ManychatService.getSubscriberById(1)
      debugInfo.manychatApiTest = {
        success: true,
        message: 'Conexión a Manychat API OK'
      }
    } catch (error: any) {
      debugInfo.manychatApiTest = {
        success: false,
        error: error.message
      }
    }

    // 6. Verificar conversaciones sin mensajes
    if (conversations && conversations.length > 0) {
      const conversationsWithoutMessages = []
      for (const conv of conversations.slice(0, 5)) {
        const { count } = await supabase.client
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
        
        if (count === 0) {
          conversationsWithoutMessages.push({
            id: conv.id,
            platform: conv.platform,
            platform_id: conv.platform_id,
            lead_id: conv.lead_id
          })
        }
      }
      debugInfo.conversationsWithoutMessages = conversationsWithoutMessages.length
      debugInfo.sampleConversationsWithoutMessages = conversationsWithoutMessages
    }

    // 7. Recomendaciones
    const recommendations: string[] = []
    
    if (!leadsWithManychatId || leadsWithManychatId.length === 0) {
      recommendations.push('No hay leads con manychatId. Sincroniza leads con Manychat primero.')
    }
    
    if (!messages || messages.length === 0) {
      recommendations.push('No hay mensajes en la base de datos. Verifica que los webhooks estén configurados correctamente en Manychat.')
    }
    
    if (conversations && conversations.length > 0 && (!messages || messages.length === 0)) {
      recommendations.push('Hay conversaciones pero no hay mensajes. Los mensajes solo llegan vía webhooks cuando hay actividad.')
    }

    debugInfo.recommendations = recommendations

    return NextResponse.json(debugInfo)

  } catch (error: any) {
    logger.error('Error en debug de webhooks', { error: error.message })
    return NextResponse.json(
      { error: 'Error en debug', message: error.message },
      { status: 500 }
    )
  }
}

