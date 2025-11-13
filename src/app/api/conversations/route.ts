import { NextRequest, NextResponse } from 'next/server'
import { ConversationService } from '@/server/services/conversation-service'

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

    const conversations = await ConversationService.getConversations({
      userId,
      status,
      platform,
      search,
      assignedTo,
      page,
      limit
    })

    return NextResponse.json({ 
      conversations: conversations.data,
      total: conversations.total,
      page,
      limit
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
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
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
