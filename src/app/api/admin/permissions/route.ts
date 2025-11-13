import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

/**
 * GET /api/admin/permissions
 * Obtener todos los permisos del sistema (solo ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar que el usuario es ADMIN
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabase.client
      .from('user_permissions')
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: permissions, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/permissions
 * Asignar permisos a un usuario (solo ADMIN)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar que el usuario es ADMIN
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, permissions } = body

    if (!userId || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'userId and permissions array are required' },
        { status: 400 }
      )
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    // Eliminar permisos anteriores del usuario
    const { error: deleteError } = await supabase.client
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    // Insertar nuevos permisos solo los que están granted
    const permissionsToInsert = permissions
      .filter((p: any) => p.granted)
      .map((p: any) => ({
        user_id: userId,
        resource: p.resource,
        action: p.action,
        granted: true,
        granted_by: session.user.id,
      }))

    if (permissionsToInsert.length > 0) {
      const { data, error } = await supabase.client
        .from('user_permissions')
        .insert(permissionsToInsert)
        .select()

      if (error) throw error

      // Registrar evento de auditoría
      await supabase.createEvent({
        leadId: null,
        tipo: 'permissions_updated',
        payload: JSON.stringify({
          userId,
          permissionsCount: permissionsToInsert.length,
          grantedBy: session.user.id,
          grantedByEmail: session.user.email,
        })
      })

      console.log('[Permissions] Updated permissions for user:', {
        userId,
        permissionsCount: permissionsToInsert.length,
        grantedBy: session.user.email,
      })

      return NextResponse.json({ 
        success: true, 
        permissions: data,
        count: permissionsToInsert.length
      })
    } else {
      return NextResponse.json({ 
        success: true, 
        permissions: [],
        count: 0,
        message: 'All permissions revoked'
      })
    }
  } catch (error) {
    console.error('Error saving permissions:', error)
    return NextResponse.json(
      { error: 'Failed to save permissions' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/permissions
 * Revocar todos los permisos de un usuario (solo ADMIN)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!supabase.client) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    const { error } = await supabase.client
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)

    if (error) throw error

    console.log('[Permissions] Revoked all permissions for user:', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking permissions:', error)
    return NextResponse.json(
      { error: 'Failed to revoke permissions' },
      { status: 500 }
    )
  }
}

