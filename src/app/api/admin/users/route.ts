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

    return NextResponse.json(users)

  } catch (error: any) {
    logger.error('Error in GET /api/admin/users:', error)
    
    if (error.message.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Crear usuario
    const userData = {
      email: email.toLowerCase().trim(),
      nombre: nombre.trim(),
      apellido: apellido?.trim() || null,
      telefono: telefono?.trim() || null,
      role,
      status,
      password_hash: passwordHash,
      created_by: session.user.id
    }

    const newUser = await supabase.createUser(userData)

    // Remover password_hash de la respuesta
    const { hash, ...userResponse } = newUser

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
