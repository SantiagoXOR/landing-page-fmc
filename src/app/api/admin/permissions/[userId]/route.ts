import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

interface RouteParams {
  params: {
    userId: string
  }
}

/**
 * GET /api/admin/permissions/[userId]
 * Obtener permisos de un usuario específico
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Solo ADMIN puede ver permisos de otros usuarios
    if (session.user.role !== 'ADMIN' && session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const { data: permissions, error } = await supabase.client
      .from('user_permissions')
      .select('*')
      .eq('user_id', params.userId)
      .eq('granted', true)
      .order('resource', { ascending: true })

    if (error) throw error

    return NextResponse.json({ permissions: permissions || [] })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/permissions/[userId]/[resource]
 * Revocar un permiso específico
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const resource = searchParams.get('resource')
    const action = searchParams.get('action')

    if (!resource) {
      return NextResponse.json(
        { error: 'resource is required' },
        { status: 400 }
      )
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    let query = supabase.client
      .from('user_permissions')
      .delete()
      .eq('user_id', params.userId)
      .eq('resource', resource)

    if (action) {
      query = query.eq('action', action)
    }

    const { error } = await query

    if (error) throw error

    console.log('[Permissions] Revoked permission:', {
      userId: params.userId,
      resource,
      action: action || 'all actions',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking permission:', error)
    return NextResponse.json(
      { error: 'Failed to revoke permission' },
      { status: 500 }
    )
  }
}

