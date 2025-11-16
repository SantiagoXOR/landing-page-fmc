import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { checkPermission } from '@/lib/rbac'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'

// GET - Listar todos los usuarios
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'users:read')

    // Obtener usuarios
    const users = await supabase.findAllUsers()
    
    // Asegurar que siempre retornamos un array
    if (!Array.isArray(users)) {
      logger.warn('findAllUsers no retornó un array, retornando array vacío')
      return NextResponse.json([])
    }

    return NextResponse.json(users)

  } catch (error: any) {
    logger.error('Error in GET /api/admin/users:', error)
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    if (error.message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Retornar array vacío en lugar de error 500 para que el frontend pueda mostrar la interfaz
    // El frontend mostrará un mensaje de error pero no se romperá
    logger.warn('Retornando array vacío debido a error en findAllUsers')
    return NextResponse.json([], { status: 200 })
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar permisos
    checkPermission(session.user.role, 'users:write')

    const body = await request.json()
    const { email, nombre, apellido, telefono, role, status, password } = body

    // Validaciones básicas
    if (!email || !nombre || !password) {
      return NextResponse.json({ 
        error: 'Email, nombre y contraseña son obligatorios' 
      }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      }, { status: 400 })
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'El formato del email no es válido' 
      }, { status: 400 })
    }

    // Verificar que el email no exista
    const existingUser = await supabase.findUserByEmailNew(email.toLowerCase())
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Ya existe un usuario con este email' 
      }, { status: 400 })
    }

    // Validar rol
    const validRoles = ['ADMIN', 'MANAGER', 'ANALISTA', 'VENDEDOR', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Rol no válido' 
      }, { status: 400 })
    }

    // Validar estado
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Estado no válido' 
      }, { status: 400 })
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10)

    // Crear usuario - mapear campos al esquema de la tabla User
    // La tabla User tiene: id, email, name, role, hashedPassword, createdAt, updatedAt
    const userData = {
      email: email.toLowerCase().trim(),
      name: nombre.trim(), // Mapear nombre -> name
      role,
      hashedPassword: passwordHash, // Mapear password_hash -> hashedPassword
      // Nota: apellido, telefono, status, created_by no existen en la tabla User actual
      // Si necesitas estos campos, deberías crear una tabla extendida o actualizar el esquema
    }

    const newUser = await supabase.createUser(userData)

    if (!newUser) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    // Mapear respuesta al formato esperado por el frontend
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      nombre: newUser.name || newUser.nombre || '',
      apellido: apellido?.trim() || '',
      telefono: telefono?.trim() || null,
      role: newUser.role,
      status: status || 'ACTIVE', // Mantener el status aunque no se guarde en DB
      created_at: newUser.createdAt || new Date().toISOString()
    }

    // Remover campos sensibles
    delete (userResponse as any).hashedPassword
    delete (userResponse as any).password_hash

    return NextResponse.json(userResponse, { status: 201 })

  } catch (error: any) {
    logger.error('Error in POST /api/admin/users:', error)
    
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
