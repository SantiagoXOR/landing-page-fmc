import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { supabase } from '@/lib/db'

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

    // Obtener asistentes desde Supabase
    const assistants = await supabase.request('/Assistant?select=*&order=isDefault.desc,createdAt.desc')
    
    if (!assistants || !Array.isArray(assistants)) {
      return NextResponse.json([])
    }
    
    // Obtener información del creador para cada asistente
    const assistantsWithCreator = await Promise.all(
      assistants.map(async (assistant: any) => {
        try {
          const creator = await supabase.request(`/User?id=eq.${assistant.createdBy}&select=id,name,email&limit=1`)
          
          return {
            ...assistant,
            creator: creator && creator[0] ? {
              id: creator[0].id,
              nombre: creator[0].name || 'Usuario',
              email: creator[0].email
            } : null
          }
        } catch (error) {
          return {
            ...assistant,
            creator: null
          }
        }
      })
    )
    
    return NextResponse.json(assistantsWithCreator)

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
      try {
        // Obtener todos los asistentes que están marcados como predeterminados
        const defaultAssistants = await supabase.request('/Assistant?select=id&isDefault=eq.true')
        
        if (Array.isArray(defaultAssistants) && defaultAssistants.length > 0) {
          // Actualizar cada uno para quitar el flag de predeterminado
          await Promise.all(
            defaultAssistants.map((a: any) =>
              supabase.request(`/Assistant?id=eq.${a.id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({ isDefault: false })
              })
            )
          )
        }
      } catch (error) {
        // Si falla, continuar de todas formas
        logger.warn('Error updating default assistants', { error })
      }
    }

    // Crear el asistente
    const assistantData = {
      nombre: validatedData.nombre,
      descripcion: validatedData.descripcion || null,
      instrucciones: validatedData.instrucciones,
      isDefault: validatedData.isDefault,
      isActive: validatedData.isActive,
      createdBy: session.user.id
    }

    const assistant = await supabase.request('/Assistant', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(assistantData)
    })
    
    const createdAssistant = Array.isArray(assistant) ? assistant[0] : assistant
    
    // Obtener información del creador
    let creator = null
    try {
      const creatorData = await supabase.request(`/User?id=eq.${session.user.id}&select=id,name,email&limit=1`)
      if (creatorData && creatorData[0]) {
        creator = {
          id: creatorData[0].id,
          nombre: creatorData[0].name || 'Usuario',
          email: creatorData[0].email
        }
      }
    } catch (error) {
      // Continuar sin información del creador
    }
    
    const assistantWithCreator = {
      ...createdAssistant,
      creator
    }

    logger.info('Assistant created', { assistantId: createdAssistant.id }, { userId: session.user.id })

    return NextResponse.json(assistantWithCreator, { status: 201 })

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

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
