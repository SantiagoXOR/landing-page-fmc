import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AssistantUpdateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  instrucciones: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:read')

    const assistant = await prisma.assistant.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    })

    if (!assistant) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }
    
    return NextResponse.json(assistant)

  } catch (error: any) {
    logger.error('Error in GET /api/assistants/[id]', { error: error.message })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:write')

    const body = await request.json()
    const validatedData = AssistantUpdateSchema.parse(body)

    // Verificar que el asistente existe
    const existing = await prisma.assistant.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    // Si se marca como predeterminado, desmarcar los demás
    if (validatedData.isDefault) {
      await prisma.assistant.updateMany({
        where: { 
          isDefault: true,
          id: { not: params.id }
        },
        data: { isDefault: false }
      })
    }

    const assistant = await prisma.assistant.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        creator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    })

    logger.info('Assistant updated', { assistantId: assistant.id }, { userId: session.user.id })

    return NextResponse.json(assistant)

  } catch (error: any) {
    logger.error('Error in PUT /api/assistants/[id]', { error: error.message })
    
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: error.errors 
      }, { status: 400 })
    }
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    checkPermission(session.user.role, 'settings:write')

    // Verificar que el asistente existe
    const existing = await prisma.assistant.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    await prisma.assistant.delete({
      where: { id: params.id }
    })

    logger.info('Assistant deleted', { assistantId: params.id }, { userId: session.user.id })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    logger.error('Error in DELETE /api/assistants/[id]', { error: error.message })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

