import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { checkUserPermission } from '@/lib/rbac'

/**
 * GET /api/scoring/rules
 * Obtener todas las reglas de scoring
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const { data: rules, error } = await supabase.client
      .from('scoring_rules')
      .select('*')
      .order('priority', { ascending: true })

    if (error) throw error

    return NextResponse.json({ rules: rules || [] })
  } catch (error) {
    console.error('Error fetching scoring rules:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch scoring rules'
    }, { status: 500 })
  }
}

/**
 * POST /api/scoring/rules
 * Crear una nueva regla de scoring
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Solo ADMIN puede crear reglas
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'Solo administradores pueden crear reglas'
      }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, field, operator, value, score_points, is_active, priority } = body

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const { data: rule, error } = await supabase.client
      .from('scoring_rules')
      .insert({
        name,
        description,
        field,
        operator,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        score_points,
        is_active: is_active ?? true,
        priority: priority || 999,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) throw error

    console.log('[Scoring] Rule created:', {
      ruleId: rule.id,
      name,
      userId: session.user.id,
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating scoring rule:', error)
    return NextResponse.json({ 
      error: 'Failed to create scoring rule'
    }, { status: 500 })
  }
}

