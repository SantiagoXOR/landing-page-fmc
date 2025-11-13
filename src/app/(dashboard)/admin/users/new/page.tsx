'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, User, Shield } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

interface UserFormData {
  email: string
  nombre: string
  apellido: string
  telefono: string
  role: 'ADMIN' | 'MANAGER' | 'ANALISTA' | 'VENDEDOR' | 'VIEWER'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  password: string
  confirmPassword: string
}

function NewUserPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      if (!formData.password) {
        throw new Error('La contraseña es obligatoria')
      }
      if (formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres')
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('El formato del email no es válido')
      }

      // Preparar datos para envío
      const userData = {
        email: formData.email.trim().toLowerCase(),
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim() || null,
        telefono: formData.telefono.trim() || null,
        role: formData.role,
        status: formData.status,
        password: formData.password
      }

      console.log('Creating user:', userData)

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Error al crear el usuario')
      }

      // Mostrar mensaje de éxito y redirigir
      addToast({
        type: 'success',
        title: 'Usuario creado',
        description: 'El usuario ha sido creado exitosamente'
      })
      
      router.push('/admin/users')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      addToast({
        type: 'error',
        title: 'Error al crear usuario',
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-3xl font-bold">Crear Nuevo Usuario</h1>
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
                </select>
              </div>

              {/* Información de permisos por rol */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Permisos del rol seleccionado:</h4>
                <div className="text-sm text-gray-600">
                  {formData.role === 'ADMIN' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Control total del sistema</li>
                      <li>Gestión de usuarios y roles</li>
                      <li>Configuración del sistema</li>
                      <li>Todos los permisos de leads y reportes</li>
                    </ul>
                  )}
                  {formData.role === 'MANAGER' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Gestión completa de leads</li>
                      <li>Reportes y métricas avanzadas</li>
                      <li>Gestión de documentos</li>
                      <li>Ver usuarios (sin modificar)</li>
                    </ul>
                  )}
                  {formData.role === 'ANALISTA' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ver y editar leads</li>
                      <li>Crear y exportar reportes</li>
                      <li>Gestión de documentos</li>
                      <li>Métricas del dashboard</li>
                    </ul>
                  )}
                  {formData.role === 'VENDEDOR' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ver y editar leads asignados</li>
                      <li>Gestión básica de documentos</li>
                      <li>Dashboard básico</li>
                      <li>Reportes de solo lectura</li>
                    </ul>
                  )}
                  {formData.role === 'VIEWER' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>Solo lectura de leads</li>
                      <li>Ver reportes básicos</li>
                      <li>Dashboard de solo lectura</li>
                      <li>Sin permisos de edición</li>
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seguridad */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Configuración de Seguridad</CardTitle>
              <CardDescription>Contraseña inicial del usuario</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Repetir contraseña"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> El usuario recibirá sus credenciales por email y podrá cambiar su contraseña en el primer inicio de sesión.
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
                Creando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Usuario
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// Envolver con PermissionGuard
export default function ProtectedNewUserPage() {
  return (
    <PermissionGuard permission="users:write" route="/admin/users/new">
      <NewUserPage />
    </PermissionGuard>
  )
}
