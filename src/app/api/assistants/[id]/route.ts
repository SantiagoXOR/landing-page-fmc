import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { checkPermission } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { supabase } from '@/lib/db'

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

    const assistants = await supabase.request(`/Assistant?id=eq.${params.id}&select=*&limit=1`)
    
    if (!assistants || !Array.isArray(assistants) || assistants.length === 0) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }
    
    const assistant = assistants[0]
    
    // Obtener información del creador
    let creator = null
    try {
      const creatorData = await supabase.request(`/User?id=eq.${assistant.createdBy}&select=id,name,email&limit=1`)
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
    
    return NextResponse.json({
      ...assistant,
      creator
    })

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
    const existing = await supabase.request(`/Assistant?id=eq.${params.id}&select=id&limit=1`)
    
    if (!existing || !Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    // Si se marca como predeterminado, desmarcar los demás
    if (validatedData.isDefault) {
      try {
        // Actualizar todos los demás asistentes excepto este
        const allAssistants = await supabase.request('/Assistant?select=id,isDefault')
        if (Array.isArray(allAssistants)) {
          const updates = allAssistants
            .filter((a: any) => a.id !== params.id && a.isDefault === true)
            .map((a: any) => 
              supabase.request(`/Assistant?id=eq.${a.id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body: JSON.stringify({ isDefault: false })
              })
            )
          await Promise.all(updates)
        }
      } catch (error) {
        logger.warn('Error updating default assistants', { error })
      }
    }

    // Preparar datos de actualización
    const updateData: any = {}
    if (validatedData.nombre !== undefined) updateData.nombre = validatedData.nombre
    if (validatedData.descripcion !== undefined) updateData.descripcion = validatedData.descripcion || null
    if (validatedData.instrucciones !== undefined) updateData.instrucciones = validatedData.instrucciones
    if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive

    const updated = await supabase.request(`/Assistant?id=eq.${params.id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(updateData)
    })
    
    const assistant = Array.isArray(updated) ? updated[0] : updated
    
    // Obtener información del creador
    let creator = null
    try {
      const creatorData = await supabase.request(`/User?id=eq.${assistant.createdBy}&select=id,name,email&limit=1`)
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

    logger.info('Assistant updated', { assistantId: assistant.id }, { userId: session.user.id })

    return NextResponse.json({
      ...assistant,
      creator
    })

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

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
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
    const existing = await supabase.request(`/Assistant?id=eq.${params.id}&select=id&limit=1`)
    
    if (!existing || !Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json({ error: 'Asistente no encontrado' }, { status: 404 })
    }

    await supabase.request(`/Assistant?id=eq.${params.id}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    })

    logger.info('Assistant deleted', { assistantId: params.id }, { userId: session.user.id })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    logger.error('Error in DELETE /api/assistants/[id]', { error: error.message })
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
