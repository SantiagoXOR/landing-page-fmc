import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabase } from './db'

// Tipos para roles actualizados
type UserRole = 'ADMIN' | 'MANAGER' | 'ANALISTA' | 'VENDEDOR' | 'VIEWER'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'

/**
 * Determina el rol de un usuario basado en su email
 * Prioridad:
 * 1. Lista de emails de administradores (ADMIN_EMAILS)
 * 2. Dominios específicos (@phorencial.com, @formosafmc.com.ar = ADMIN)
 * 3. Por defecto: VIEWER
 */
function determineUserRole(email: string): UserRole {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
  const emailLower = email.toLowerCase().trim()

  // Verificar si está en la lista de administradores
  if (adminEmails.includes(emailLower)) {
    return 'ADMIN'
  }

  // Verificar dominios específicos
  const adminDomains = ['@phorencial.com', '@formosafmc.com.ar', '@phronencial.com']
  if (adminDomains.some(domain => emailLower.endsWith(domain))) {
    return 'ADMIN'
  }

  // Por defecto: VIEWER
  return 'VIEWER'
}

/**
 * Verifica si un email está en la lista de emails permitidos para registro automático
 */
function isEmailAllowed(email: string): boolean {
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
  const emailLower = email.toLowerCase().trim()
  
  // Si no hay lista configurada, no permitir registro automático
  if (allowedEmails.length === 0) {
    return false
  }
  
  return allowedEmails.includes(emailLower)
}

export const authOptions: NextAuthOptions = {
  // Removemos el adapter de Prisma ya que usamos Supabase directamente
  debug: true, // Habilitar debug para ver más logs
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata)
    }
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Si es login con Google, verificar/autorizar usuario
      if (account?.provider === 'google' && profile?.email) {
        try {
          const email = profile.email.toLowerCase().trim()
          
          // Verificar si el usuario ya existe
          let existingUser = await supabase.findUserByEmailNew(email)
          
          if (!existingUser) {
            // Intentar con tabla antigua
            const oldUser = await supabase.findUserByEmail(email)
            if (oldUser) {
              // Mapear de tabla antigua a formato nuevo
              existingUser = {
                id: oldUser.id,
                email: oldUser.email,
                nombre: oldUser.nombre,
                apellido: '', // No existe en tabla antigua
                hash: oldUser.hash,
                role: oldUser.rol || 'VIEWER', // Mapear 'rol' a 'role'
                status: 'ACTIVE', // Por defecto
                createdAt: oldUser.createdAt
              }
            }
          }

          if (!existingUser) {
            // Usuario no existe - verificar si está permitido para registro automático
            const isAllowed = isEmailAllowed(email)
            
            if (!isAllowed) {
              // Usuario no autorizado - crear usuario con estado PENDING para aprobación
              const nameParts = (profile.name || 'Usuario').split(' ')
              const nombre = nameParts[0] || 'Usuario'

              const pendingUserData = {
                email: email,
                name: nombre, // La tabla User usa 'name', no 'nombre'
                hash: '', // No tiene contraseña porque usa Google OAuth
                role: 'PENDING', // Rol especial para usuarios pendientes de aprobación
              }

              console.log(`[NextAuth] Creando usuario PENDING para aprobación: ${email}`)
              
              try {
                // Crear usuario con rol PENDING
                const newPendingUser = await supabase.createUser(pendingUserData)
                
                if (newPendingUser) {
                  console.log(`[NextAuth] Usuario PENDING creado: ${email} (ID: ${newPendingUser.id}). Esperando aprobación de administrador.`)
                } else {
                  console.error(`[NextAuth] Error al crear usuario PENDING para ${email}`)
                }
              } catch (createError: any) {
                console.error(`[NextAuth] Error creando usuario PENDING:`, createError)
              }
              
              // Rechazar acceso pero el usuario queda guardado para aprobación
              console.warn(`[NextAuth] Acceso denegado: ${email} no está autorizado. Usuario creado con estado PENDING para aprobación.`)
              return false
            }

            // Email está en lista permitida - crear nuevo usuario
            const assignedRole = determineUserRole(email)
            
            // Preparar datos del nuevo usuario
            const nameParts = (profile.name || 'Usuario').split(' ')
            const nombre = nameParts[0] || 'Usuario'

            // Estructura según tabla User: id, name, email, role, hashedPassword, createdAt
            const userData = {
              email: email,
              name: nombre, // La tabla User usa 'name', no 'nombre'
              hash: '', // No tiene contraseña porque usa Google OAuth
              role: assignedRole, // La tabla User usa 'role'
            }

            console.log(`[NextAuth] Creando nuevo usuario autorizado: ${email} con rol ${assignedRole}`)
            
            // Crear nuevo usuario usando el método correcto
            const newUser = await supabase.createUser(userData)

            if (newUser) {
              user.role = assignedRole
              user.status = 'ACTIVE' as any
              console.log(`[NextAuth] Usuario creado exitosamente: ${email} (ID: ${newUser.id})`)
              return true
            } else {
              // Error al crear usuario - rechazar acceso
              console.error(`[NextAuth] Error al crear usuario ${email}, acceso denegado`)
              return false
            }
          } else {
            // Usuario existe - verificar estado y rol
            const userRole = existingUser.role || 'VIEWER'
            const userStatus = existingUser.status || 'ACTIVE'
            
            // Verificar si el usuario está pendiente de aprobación
            if (userRole === 'PENDING') {
              console.warn(`[NextAuth] Acceso denegado: ${email} está pendiente de aprobación por un administrador`)
              return false
            }
            
            // Verificar si el usuario está activo
            if (userStatus === 'INACTIVE' || userStatus === 'SUSPENDED') {
              console.warn(`[NextAuth] Acceso denegado: ${email} tiene estado ${userStatus}`)
              return false
            }
            
            // Verificar que el rol sea válido (no PENDING)
            const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'ANALISTA', 'VENDEDOR', 'VIEWER']
            if (!validRoles.includes(userRole as UserRole)) {
              console.warn(`[NextAuth] Acceso denegado: ${email} tiene rol inválido ${userRole}`)
              return false
            }
            
            // Usuario existe, está activo y tiene rol válido - permitir acceso
            user.role = userRole as UserRole
            user.status = userStatus as UserStatus
            
            console.log(`[NextAuth] Usuario autorizado: ${email} con rol ${userRole}`)
            return true
          }
        } catch (error: any) {
          console.error('[NextAuth] Error verificando/autorizando usuario de Google:', error)
          console.error('[NextAuth] Error details:', {
            message: error.message,
            stack: error.stack,
            email: profile.email
          })
          
          // En caso de error, rechazar acceso por seguridad
          console.warn(`[NextAuth] Acceso denegado debido a error para ${profile.email}`)
          return false
        }
      }
      
      // Para otros providers o casos, permitir acceso (compatibilidad)
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role || 'VIEWER'
        token.status = user.status || 'ACTIVE'
      }
      if (account?.provider === 'google') {
        token.provider = 'google'
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = (token.role as UserRole) || 'VIEWER'
        session.user.status = (token.status as UserStatus) || 'ACTIVE'
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirigir errores a signin
  },
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      status: UserStatus
    }
  }

  interface User {
    role: UserRole
    status: UserStatus
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole
    status: UserStatus
  }
}
