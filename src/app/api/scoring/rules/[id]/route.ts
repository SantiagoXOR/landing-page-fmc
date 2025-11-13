import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * PUT /api/scoring/rules/[id]
 * Actualizar una regla de scoring
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Solo administradores pueden editar reglas'
      }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, field, operator, value, score_points, is_active, priority } = body

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const { data: rule, error } = await supabase.client
      .from('scoring_rules')
      .update({
        name,
        description,
        field,
        operator,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        score_points,
        is_active,
        priority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error updating scoring rule:', error)
    return NextResponse.json({ 
      error: 'Failed to update scoring rule'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/scoring/rules/[id]
 * Actualizar parcialmente una regla (ej: activar/desactivar)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden'
      }, { status: 403 })
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const body = await request.json()

    const { data: rule, error } = await supabase.client
      .from('scoring_rules')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error patching scoring rule:', error)
    return NextResponse.json({ 
      error: 'Failed to update scoring rule'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/scoring/rules/[id]
 * Eliminar una regla de scoring
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Solo administradores pueden eliminar reglas'
      }, { status: 403 })
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const { error } = await supabase.client
      .from('scoring_rules')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    console.log('[Scoring] Rule deleted:', params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scoring rule:', error)
    return NextResponse.json({ 
      error: 'Failed to delete scoring rule'
    }, { status: 500 })
  }
}

