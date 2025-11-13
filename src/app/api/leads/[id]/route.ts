import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { LeadService } from '@/server/services/lead-service'
import { LeadUpdateSchema } from '@/lib/validators'
import { checkPermission, checkUserPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'

const leadService = new LeadService()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular de lectura
    const hasReadPermission = await checkUserPermission(session.user.id, 'leads', 'read')
    
    if (!hasReadPermission) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para ver este lead'
      }, { status: 403 })
    }

    const lead = await leadService.getLeadById(params.id)

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)

  } catch (error: any) {
    logger.error('Error in GET /api/leads/[id]', { error: error.message, leadId: params.id })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular de actualización
    const hasUpdatePermission = await checkUserPermission(session.user.id, 'leads', 'update')
    
    if (!hasUpdatePermission) {
      logger.warn('Permission denied for lead update', {
        userId: session.user.id,
        leadId: params.id
      })
      
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para editar leads'
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = LeadUpdateSchema.parse(body)

    const lead = await leadService.updateLead(params.id, validatedData, session.user?.id || '')

    return NextResponse.json(lead)

  } catch (error: any) {
    logger.error('Error in PATCH /api/leads/[id]', { error: error.message, leadId: params.id })
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permiso granular de eliminación
    const hasDeletePermission = await checkUserPermission(session.user.id, 'leads', 'delete')
    
    if (!hasDeletePermission) {
      logger.warn('Permission denied for lead deletion', {
        userId: session.user.id,
        leadId: params.id
      })
      
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'No tiene permisos para eliminar leads'
      }, { status: 403 })
    }

    // Verificar que el lead existe antes de eliminarlo
    const existingLead = await leadService.getLeadById(params.id)
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await leadService.deleteLead(params.id, session.user?.id || '')

    logger.info('Lead deleted successfully', { leadId: params.id, userId: session.user?.id })

    return NextResponse.json({ success: true, message: 'Lead eliminado exitosamente' })

  } catch (error: any) {
    logger.error('Error in DELETE /api/leads/[id]', { error: error.message, leadId: params.id })

    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
