import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { ConversationService } from '@/server/services/conversation-service'
import { isCustomerCareWindowOpen } from '@/lib/whatsapp-customer-care-window'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    try {
      checkPermission(session.user.role, 'leads:read')
    } catch {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const conversation = await ConversationService.getConversationById(params.id)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const platform = (conversation.platform || '').toLowerCase()
    const leadId = conversation.lead?.id

    let whatsappSession: { windowOpen: boolean; lastInboundAt: string | null } | undefined
    if (platform === 'whatsapp' && leadId) {
      const lastInbound = await ConversationService.getLastInboundWhatsAppMessageAt(leadId)
      whatsappSession = {
        windowOpen: isCustomerCareWindowOpen(lastInbound),
        lastInboundAt: lastInbound ? lastInbound.toISOString() : null,
      }
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        ...(whatsappSession && { whatsappSession }),
      },
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    try {
      checkPermission(session.user.role, 'leads:write')
    } catch {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json()
    const { status, assignedTo } = body

    let conversation

    if (status === 'closed') {
      conversation = await ConversationService.closeConversation(params.id)
    } else if (assignedTo) {
      conversation = await ConversationService.assignConversation(params.id, assignedTo)
    } else {
      return NextResponse.json(
        { error: 'Invalid update parameters' },
        { status: 400 }
      )
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}
