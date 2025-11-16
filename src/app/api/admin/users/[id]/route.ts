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

    // Determinar status basado en el email (soft delete usando prefijo deleted_)
    let userStatus = 'ACTIVE'
    if (user.email && user.email.startsWith('deleted_')) {
      userStatus = 'INACTIVE'
    } else if (user.role === 'PENDING') {
      userStatus = 'PENDING'
    }

    // Mapear respuesta al formato esperado por el frontend
    const userResponse = {
      id: user.id,
      email: user.email,
      nombre: user.nombre || '',
      apellido: '',
      telefono: null,
      role: user.role || user.rol,
      status: userStatus,
      created_at: user.createdAt
    }

    // Remover hash de la respuesta
    delete (userResponse as any).hash

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
      updateData.name = nombre.trim() // La tabla User usa 'name', no 'nombre'
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

      // Permitir cambiar de PENDING a cualquier rol válido (aprobación de usuario)
      updateData.role = role
      // Si el usuario tenía role PENDING y se le asigna un rol válido, también actualizar name si es necesario
      if (existingUser.rol === 'PENDING' && validRoles.includes(role)) {
        // El usuario está siendo aprobado
        console.log(`[Admin] Aprobando usuario ${existingUser.email} con rol ${role}`)
      }
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

      // Nota: La tabla User no tiene campo 'status', así que implementamos soft delete
      // Si el estado es INACTIVE o SUSPENDED, marcamos con prefijo en el email
      if (status === 'INACTIVE' || status === 'SUSPENDED') {
        // Si el email no empieza con deleted_, agregamos el prefijo
        if (!existingUser.email.startsWith('deleted_')) {
          updateData.email = `deleted_${Date.now()}_${existingUser.email}`
        }
      } else if (status === 'ACTIVE') {
        // Si se reactiva, intentar restaurar el email original
        const emailMatch = existingUser.email.match(/^deleted_\d+_(.+)$/)
        if (emailMatch) {
          updateData.email = emailMatch[1]
        }
      }
      // El campo status se mantiene en la respuesta para el frontend, pero no se guarda en DB
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

    if (!updatedUser) {
      return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
    }

    // Determinar status basado en el email (soft delete usando prefijo deleted_)
    let userStatus = 'ACTIVE'
    if (updatedUser.email && updatedUser.email.startsWith('deleted_')) {
      userStatus = 'INACTIVE'
    } else if (updatedUser.role === 'PENDING') {
      userStatus = 'PENDING'
    }

    // Mapear respuesta al formato esperado por el frontend
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      nombre: updatedUser.name || updatedUser.nombre || '',
      apellido: apellido?.trim() || '',
      telefono: telefono?.trim() || null,
      role: updatedUser.role,
      status: status !== undefined ? status : userStatus, // Usar el status solicitado o el calculado
      created_at: updatedUser.createdAt || new Date().toISOString()
    }

    // Remover campos sensibles
    delete (userResponse as any).hashedPassword
    delete (userResponse as any).password_hash

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

    // Eliminar usuario de la base de datos
    try {
      await supabase.deleteUser(params.id)
    } catch (deleteError: any) {
      console.error('Error eliminando usuario en Supabase:', deleteError)
      
      // Si hay datos asociados, devolver mensaje específico
      if (deleteError.message?.includes('datos asociados')) {
        return NextResponse.json({ 
          error: deleteError.message 
        }, { status: 400 })
      }
      
      // Otros errores de Supabase
      throw deleteError
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario eliminado exitosamente' 
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/admin/users/[id]:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    if (error.message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Retornar el mensaje de error específico si existe
    if (error.message && error.message !== 'Internal server error') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      error: 'Error al eliminar usuario. Verifica los logs del servidor para más detalles.' 
    }, { status: 500 })
  }
}
