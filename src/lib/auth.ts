import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { supabase } from './db'
import bcrypt from 'bcryptjs'

// Tipos para roles actualizados
type UserRole = 'ADMIN' | 'MANAGER' | 'ANALISTA' | 'VENDEDOR' | 'VIEWER'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'

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
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔍 Iniciando authorize con:', { email: credentials?.email })
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Credenciales faltantes')
          return null
        }

        try {
          // Intentar primero con la tabla nueva
          let user = await supabase.findUserByEmailNew(credentials.email)
          console.log('👤 Usuario encontrado:', !!user)

          // Si no se encuentra, intentar con la tabla antigua
          if (!user) {
            console.log('🔄 Intentando con tabla antigua...')
            const oldUser = await supabase.findUserByEmail(credentials.email)
            if (oldUser) {
              user = {
                id: oldUser.id,
                email: oldUser.email,
                nombre: oldUser.nombre,
                apellido: '',
                role: oldUser.rol,
                status: 'ACTIVE', // Asumir activo para usuarios existentes
                hash: oldUser.hash,
                createdAt: oldUser.createdAt
              }
            }
          }

          if (!user) {
            console.log('❌ Usuario no encontrado')
            return null
          }

          console.log('🔑 Verificando contraseña...', { hasHash: !!user.hash })

          // Verificar contraseña
          let isPasswordValid = false

          if (user.hash) {
            isPasswordValid = await bcrypt.compare(credentials.password, user.hash)
            console.log('🔐 Resultado bcrypt:', isPasswordValid)
          } else {
            // Para usuarios sin hash, verificar contraseñas de prueba
            const testPasswords = ['admin123', 'analista123', 'vendedor123', 'password']
            isPasswordValid = testPasswords.includes(credentials.password)
            console.log('🔐 Resultado contraseña de prueba:', isPasswordValid)
          }

          if (!isPasswordValid) {
            console.log('❌ Contraseña inválida')
            return null
          }

          // Actualizar último login si la función existe
          try {
            await supabase.updateUserLastLogin(user.id)
          } catch (error) {
            console.log('⚠️ No se pudo actualizar último login:', error)
          }

          const result = {
            id: user.id,
            email: user.email,
            name: `${user.nombre} ${user.apellido || ''}`.trim(),
            role: user.role as UserRole,
            status: (user.status || 'ACTIVE') as UserStatus,
          }
          
          console.log('✅ Authorize exitoso:', { id: result.id, email: result.email, role: result.role })
          return result

        } catch (error: any) {
          console.error('❌ Error en authorize:', error.message)
          console.error('   Tipo de error:', error.constructor.name)
          console.error('   Stack:', error.stack)
          
          // Si es un error de conexión a Supabase, proporcionar mensaje específico
          if (error.message.includes('Error de conexión a Supabase')) {
            console.error('🔌 Error de conectividad con Supabase. Verifique la configuración de red.')
          }
          
          return null
        }
      }
    }),
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
      // Si es login con Google, crear/actualizar usuario en la base de datos
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Verificar si el usuario ya existe
          let existingUser = await supabase.findUserByEmailNew(profile.email)
          
          if (!existingUser) {
            // Intentar con tabla antigua
            const oldUser = await supabase.findUserByEmail(profile.email)
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

          if (!existingUser && supabase.client) {
            // Crear nuevo usuario con rol VIEWER por defecto
            const { data: newUser, error } = await supabase.client
              .from('auth.users')
              .insert({
                email: profile.email,
                nombre: profile.name?.split(' ')[0] || 'Usuario',
                apellido: profile.name?.split(' ').slice(1).join(' ') || '',
                role: 'VIEWER',
                status: 'ACTIVE',
                hash: '', // No tiene contraseña porque usa Google
              })
              .select()
              .single()

            if (!error && newUser) {
              user.role = 'VIEWER'
              user.status = 'ACTIVE' as any
            }
          } else if (existingUser) {
            // Usuario existe, asignar su rol
            user.role = existingUser.role || 'VIEWER'
            user.status = (existingUser.status || 'ACTIVE') as any
          }
        } catch (error) {
          console.error('Error creando/actualizando usuario de Google:', error)
          // Permitir login de todos modos con rol VIEWER por defecto
          user.role = 'VIEWER'
          user.status = 'ACTIVE' as any
        }
      }
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
