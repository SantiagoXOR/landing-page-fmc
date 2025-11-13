import { NextRequest, NextResponse } from 'next/server'
import { ConversationService } from '@/server/services/conversation-service'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const conversation = await ConversationService.getConversationById(params.id)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ conversation })
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
