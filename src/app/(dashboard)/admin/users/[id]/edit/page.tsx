'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, User, Shield, Key } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

interface User {
  id: string
  email: string
  nombre: string
  apellido?: string
  telefono?: string
  role: 'ADMIN' | 'MANAGER' | 'ANALISTA' | 'VENDEDOR' | 'VIEWER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
  last_login?: string
  created_at: string
}

interface UserFormData {
  email: string
  nombre: string
  apellido: string
  telefono: string
  role: 'ADMIN' | 'MANAGER' | 'ANALISTA' | 'VENDEDOR' | 'VIEWER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
  password: string
  confirmPassword: string
}

function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const userId = params.id as string
  
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    nombre: '',
    apellido: '',
    telefono: '',
    role: 'VENDEDOR',
    status: 'ACTIVE',
    password: '',
    confirmPassword: ''
  })

  // Cargar datos del usuario
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoadingData(true)
        const response = await fetch(`/api/admin/users/${userId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/admin/users')
            return
          }
          throw new Error('Error al cargar el usuario')
        }

        const userData = await response.json()
        setUser(userData)
        
        // Poblar el formulario con los datos existentes
        setFormData({
          email: userData.email || '',
          nombre: userData.nombre || '',
          apellido: userData.apellido || '',
          telefono: userData.telefono || '',
          role: userData.role || 'VENDEDOR',
          status: userData.status || 'ACTIVE',
          password: '',
          confirmPassword: ''
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        addToast({
          type: 'error',
          title: 'Error al cargar',
          description: errorMessage
        })
      } finally {
        setLoadingData(false)
      }
    }

    if (userId) {
      fetchUser()
    }
  }, [userId, router, addToast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validaciones básicas
      if (!formData.email.trim()) {
        throw new Error('El email es obligatorio')
      }
      if (!formData.nombre.trim()) {
        throw new Error('El nombre es obligatorio')
      }

      // Validar contraseña si se proporciona
      if (formData.password) {
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres')
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Las contraseñas no coinciden')
        }
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('El formato del email no es válido')
      }

      // Preparar datos para envío
      const updateData: any = {
        email: formData.email.trim().toLowerCase(),
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim() || null,
        telefono: formData.telefono.trim() || null,
        role: formData.role,
        status: formData.status
      }

      // Solo incluir contraseña si se proporciona
      if (formData.password) {
        updateData.password = formData.password
      }

      console.log('Updating user data:', updateData)

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Error al actualizar el usuario')
      }

      // Mostrar mensaje de éxito y redirigir
      addToast({
        type: 'success',
        title: 'Usuario actualizado',
        description: 'Los datos del usuario han sido actualizados exitosamente'
      })
      
      router.push('/admin/users')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      addToast({
        type: 'error',
        title: 'Error al actualizar',
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos del usuario...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Usuario no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Usuarios
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Usuario</h1>
          <p className="text-gray-600">Modificar información de {user.nombre}</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Información Personal
              </CardTitle>
              <CardDescription>Datos básicos del usuario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="usuario@phorencial.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  placeholder="Apellido"
                />
              </div>
              
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </CardContent>
          </Card>

          {/* Rol y Permisos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Rol y Permisos
              </CardTitle>
              <CardDescription>Configuración de acceso y permisos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="role">Rol *</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="VENDEDOR">Vendedor - Acceso básico a leads</option>
                  <option value="ANALISTA">Analista - Leads + reportes</option>
                  <option value="MANAGER">Manager - Gestión completa</option>
                  <option value="ADMIN">Admin - Control total</option>
                  <option value="VIEWER">Viewer - Solo lectura</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="status">Estado *</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="PENDING">Pendiente de activación</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="SUSPENDED">Suspendido</option>
                </select>
              </div>

              {/* Información del usuario */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Información del usuario:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Creado:</strong> {new Date(user.created_at).toLocaleDateString('es-AR')}</p>
                  <p><strong>Último login:</strong> {user.last_login ? new Date(user.last_login).toLocaleDateString('es-AR') : 'Nunca'}</p>
                  <p><strong>ID:</strong> {user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cambiar Contraseña */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Cambiar Contraseña
              </CardTitle>
              <CardDescription>Dejar en blanco para mantener la contraseña actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Nueva Contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Repetir contraseña"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Si cambias la contraseña, el usuario deberá usar la nueva contraseña en su próximo inicio de sesión.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Botones */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/users">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Actualizar Usuario
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Envolver con PermissionGuard
export default function ProtectedEditUserPage() {
  return (
    <PermissionGuard permission="users:write">
      <EditUserPage />
    </PermissionGuard>
  )
}
