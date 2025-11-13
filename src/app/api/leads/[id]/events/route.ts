import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { EventRepository } from '@/server/repositories/event-repository'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

const eventRepo = new EventRepository()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:read')

    const leadId = params.id
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') // Filtrar por tipo de evento

    // Obtener eventos del lead
    const events = await eventRepo.findByLeadId(leadId)

    // Filtrar eventos de WhatsApp si se especifica
    const filteredEvents = tipo === 'whatsapp'
      ? events.filter((event: any) =>
          event.tipo === 'whatsapp_in' ||
          event.tipo === 'whatsapp_out'
        )
      : events

    // Ordenar por fecha (más recientes primero)
    const sortedEvents = filteredEvents.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    logger.info('Events retrieved for lead', {
      leadId,
      eventCount: sortedEvents.length,
      tipo
    })

    return NextResponse.json({
      leadId,
      events: sortedEvents,
      total: sortedEvents.length
    })

  } catch (error: any) {
    logger.error('Error retrieving lead events', {
      error: error.message,
      leadId: params.id
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'leads:write')

    const leadId = params.id
    const body = await request.json()

    // Crear nuevo evento
    const event = await eventRepo.create({
      leadId,
      tipo: body.tipo,
      payload: {
        ...body.payload,
        createdBy: session.user?.id || '',
        createdAt: new Date().toISOString()
      }
    })

    logger.info('Event created for lead', {
      leadId,
      eventId: event.id,
      tipo: body.tipo,
      createdBy: session.user?.id || ''
    })

    return NextResponse.json(event, { status: 201 })

  } catch (error: any) {
    logger.error('Error creating lead event', {
      error: error.message,
      leadId: params.id
    })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
