import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppEventSchema } from '@/lib/validators'
import { LeadService } from '@/server/services/lead-service'
import { EventRepository } from '@/server/repositories/event-repository'
import { normalizePhone } from '@/lib/utils'
import { logger } from '@/lib/logger'

const leadService = new LeadService()
const eventRepo = new EventRepository()

export async function POST(request: NextRequest) {
  try {
    // Verificar token de webhook
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.ALLOWED_WEBHOOK_TOKEN}`
    
    if (!authHeader || authHeader !== expectedToken) {
      logger.warn('Unauthorized webhook attempt', { authHeader })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = WhatsAppEventSchema.parse(body)

    const normalizedPhone = normalizePhone(validatedData.telefono)

    // Buscar o crear lead
    let lead = await leadService.getLeads({
      q: normalizedPhone,
      limit: 1,
      sortOrder: 'desc' as const
    })

    let leadId: string | undefined

    if (lead.leads.length === 0) {
      // Crear nuevo lead con datos mínimos
      const newLead = await leadService.createLead({
        nombre: `Lead WhatsApp ${normalizedPhone}`,
        telefono: normalizedPhone,
        origen: 'whatsapp' as const,
        estado: 'NUEVO' as const
      })
      leadId = newLead.id
    } else {
      leadId = lead.leads[0].id
    }

    // Crear evento
    await eventRepo.create({
      leadId,
      tipo: 'whatsapp_in',
      payload: validatedData,
    })

    logger.info('WhatsApp event processed', { 
      telefono: normalizedPhone, 
      type: validatedData.type,
      leadId 
    })

    return NextResponse.json({ 
      success: true, 
      leadId,
      message: 'Event processed successfully' 
    })

  } catch (error: any) {
    logger.error('Error processing WhatsApp event', { error: error.message, body: request.body })
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
