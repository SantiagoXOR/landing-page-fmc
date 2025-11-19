import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AssistantCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  instrucciones: z.string().min(1, 'Las instrucciones son requeridas'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:read')

    const assistants = await prisma.assistant.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
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
    
    return NextResponse.json(assistants)

  } catch (error: any) {
    logger.error('Error in GET /api/assistants', { error: error.message })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    checkPermission(session.user.role, 'settings:write')

    const body = await request.json()
    const validatedData = AssistantCreateSchema.parse(body)

    // Si se marca como predeterminado, desmarcar los demás
    if (validatedData.isDefault) {
      await prisma.assistant.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    const assistant = await prisma.assistant.create({
      data: {
        ...validatedData,
        createdBy: session.user.id
      },
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

    logger.info('Assistant created', { assistantId: assistant.id }, { userId: session.user.id })

    return NextResponse.json(assistant, { status: 201 })

  } catch (error: any) {
    logger.error('Error in POST /api/assistants', { error: error.message })
    
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

