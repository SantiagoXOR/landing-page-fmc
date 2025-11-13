'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { hasPermission, canAccessRoute, Permission } from '@/lib/rbac'
import { Shield, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  route?: string
  fallback?: ReactNode
  redirectTo?: string
}

export function PermissionGuard({ 
  children, 
  permission, 
  route, 
  fallback, 
  redirectTo = '/dashboard' 
}: PermissionGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Verificar permisos si se especifica una ruta
    if (route && !canAccessRoute(session.user.role as any, route)) {
      router.push(redirectTo)
      return
    }

    // Verificar permiso específico
    if (permission && !hasPermission(session.user.role as any, permission)) {
      router.push(redirectTo)
      return
    }
  }, [session, status, permission, route, router, redirectTo])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-8 w-8 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // No session
  if (!session) {
    return null // El useEffect redirigirá
  }

  // Check permissions
  const userRole = session.user.role as any
  
  // Verificar ruta
  if (route && !canAccessRoute(userRole, route)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a esta página
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Tu rol actual ({userRole}) no tiene los permisos necesarios para ver este contenido.
            </p>
            <Button asChild>
              <Link href={redirectTo}>
                Volver al Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar permiso específico
  if (permission && !hasPermission(userRole, permission)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Permisos Insuficientes</CardTitle>
            <CardDescription>
              No tienes el permiso requerido: {permission}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Contacta a un administrador si necesitas acceso a esta funcionalidad.
            </p>
            <Button asChild>
              <Link href={redirectTo}>
                Volver al Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Hook para verificar permisos en componentes
export function usePermissions() {
  const { data: session } = useSession()

  const checkPermission = (permission: Permission): boolean => {
    if (!session) return false
    return hasPermission(session.user.role as any, permission)
  }

  const checkRoute = (route: string): boolean => {
    if (!session) return false
    return canAccessRoute(session.user.role as any, route)
  }

  const getUserRole = () => {
    return session?.user.role || null
  }

  const isAdmin = () => {
    return session?.user.role === 'ADMIN'
  }

  const isManager = () => {
    return session?.user.role === 'MANAGER' || session?.user.role === 'ADMIN'
  }

  return {
    checkPermission,
    checkRoute,
    getUserRole,
    isAdmin,
    isManager,
    session
  }
}

// Componente para mostrar contenido condicionalmente basado en permisos
interface ConditionalRenderProps {
  permission?: Permission
  route?: string
  role?: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function ConditionalRender({ 
  permission, 
  route, 
  role, 
  children, 
  fallback = null 
}: ConditionalRenderProps) {
  const { session } = usePermissions()

  if (!session) return <>{fallback}</>

  const userRole = session.user.role as any

  // Verificar rol específico
  if (role && !role.includes(userRole)) {
    return <>{fallback}</>
  }

  // Verificar ruta
  if (route && !canAccessRoute(userRole, route)) {
    return <>{fallback}</>
  }

  // Verificar permiso
  if (permission && !hasPermission(userRole, permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Componente para botones con verificación de permisos
interface PermissionButtonProps {
  permission?: Permission
  route?: string
  role?: string[]
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

export function PermissionButton({ 
  permission, 
  route, 
  role, 
  children, 
  className = '',
  disabled = false,
  onClick,
  ...props 
}: PermissionButtonProps) {
  const { checkPermission, checkRoute, getUserRole } = usePermissions()

  const userRole = getUserRole()
  
  // Verificar permisos
  const hasAccess = 
    (!role || role.includes(userRole || '')) &&
    (!route || checkRoute(route)) &&
    (!permission || checkPermission(permission))

  if (!hasAccess) {
    return null // No mostrar el botón si no tiene permisos
  }

  return (
    <Button 
      className={className}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  )
}
