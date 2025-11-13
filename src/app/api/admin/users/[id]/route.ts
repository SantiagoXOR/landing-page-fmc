import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { checkPermission } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

// GET - Obtener usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'users:read')

    const user = await supabase.findUserById(params.id)
    
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Remover hash de la respuesta
    const { hash, ...userResponse } = user

    return NextResponse.json(userResponse)

  } catch (error: any) {
    console.error('Error in GET /api/admin/users/[id]:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'users:write')

    const body = await request.json()
    const { email, nombre, apellido, telefono, role, status, password } = body

    // Verificar que el usuario existe
    const existingUser = await supabase.findUserById(params.id)
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Preparar datos de actualización
    const updateData: any = {}

    if (email !== undefined) {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ 
          error: 'El formato del email no es válido' 
        }, { status: 400 })
      }

      // Verificar que el email no esté en uso por otro usuario
      const emailUser = await supabase.findUserByEmailNew(email.toLowerCase())
      if (emailUser && emailUser.id !== params.id) {
        return NextResponse.json({ 
          error: 'Ya existe otro usuario con este email' 
        }, { status: 400 })
      }

      updateData.email = email.toLowerCase().trim()
    }

    if (nombre !== undefined) {
      if (!nombre.trim()) {
        return NextResponse.json({ 
          error: 'El nombre es obligatorio' 
        }, { status: 400 })
      }
      updateData.nombre = nombre.trim()
    }

    if (apellido !== undefined) {
      updateData.apellido = apellido?.trim() || null
    }

    if (telefono !== undefined) {
      updateData.telefono = telefono?.trim() || null
    }

    if (role !== undefined) {
      const validRoles = ['ADMIN', 'MANAGER', 'ANALISTA', 'VENDEDOR', 'VIEWER']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ 
          error: 'Rol no válido' 
        }, { status: 400 })
      }

      // No permitir que un usuario se quite el rol ADMIN a sí mismo
      if (existingUser.rol === 'ADMIN' && role !== 'ADMIN' && existingUser.id === session.user.id) {
        return NextResponse.json({ 
          error: 'No puedes quitarte el rol de administrador a ti mismo' 
        }, { status: 400 })
      }

      updateData.role = role
    }

    if (status !== undefined) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: 'Estado no válido' 
        }, { status: 400 })
      }

      // No permitir que un usuario se desactive a sí mismo
      if (status !== 'ACTIVE' && existingUser.id === session.user.id) {
        return NextResponse.json({ 
          error: 'No puedes desactivarte a ti mismo' 
        }, { status: 400 })
      }

      updateData.status = status
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ 
          error: 'La contraseña debe tener al menos 6 caracteres' 
        }, { status: 400 })
      }

      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    // Actualizar usuario
    const updatedUser = await supabase.updateUser(params.id, updateData)

    // Remover password_hash de la respuesta
    const { hash, ...userResponse } = updatedUser

    return NextResponse.json(userResponse)

  } catch (error: any) {
    console.error('Error in PATCH /api/admin/users/[id]:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ 
        error: 'Ya existe un usuario con este email' 
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'users:delete')

    // Verificar que el usuario existe
    const existingUser = await supabase.findUserById(params.id)
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // No permitir eliminar usuarios ADMIN
    if (existingUser.rol === 'ADMIN') {
      return NextResponse.json({ 
        error: 'No se pueden eliminar usuarios administradores' 
      }, { status: 400 })
    }

    // No permitir que un usuario se elimine a sí mismo
    if (existingUser.id === session.user.id) {
      return NextResponse.json({ 
        error: 'No puedes eliminarte a ti mismo' 
      }, { status: 400 })
    }

    // Eliminar usuario (esto debería implementarse en supabase)
    // Por ahora, solo desactivamos el usuario
    await supabase.updateUser(params.id, { 
      status: 'INACTIVE',
      email: `deleted_${Date.now()}_${existingUser.email}` // Para evitar conflictos de email
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario eliminado exitosamente' 
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/admin/users/[id]:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
