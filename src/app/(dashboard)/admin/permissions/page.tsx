'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { PermissionsMatrix } from '@/components/admin/PermissionsMatrix'
import { UserPermissionsDialog } from '@/components/admin/UserPermissionsDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, UserCog, Lock, AlertCircle } from 'lucide-react'

interface User {
  id: string
  email: string
  nombre: string
  role: string
  is_active: boolean
}

interface Permission {
  id?: string
  user_id?: string
  resource: string
  action: string
  granted: boolean
  created_at?: string
}

export default function PermissionsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditPermissions = async (user: User) => {
    setSelectedUser(user)
    
    // Cargar permisos del usuario
    try {
      const response = await fetch(`/api/admin/permissions/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || [])
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error)
    }
    
    setDialogOpen(true)
  }

  const handleSavePermissions = async (userId: string, newPermissions: Permission[]) => {
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          permissions: newPermissions
        })
      })

      if (response.ok) {
        setDialogOpen(false)
        // Actualizar lista si es necesario
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      AGENT: 'bg-green-100 text-green-800',
      VIEWER: 'bg-gray-100 text-gray-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Gestión de Permisos"
          subtitle="Administra permisos granulares por usuario"
          showDateFilter={false}
          showExportButton={false}
          showNewButton={false}
        />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Gestión de Permisos"
        subtitle="Administra permisos granulares por usuario y recurso"
        showDateFilter={false}
        showExportButton={false}
        showNewButton={false}
      />

      <div className="p-6 space-y-6">
        {/* Info banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium">
                  Sistema de Permisos Granulares
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Define permisos específicos para cada usuario sobre recursos individuales (leads, pipeline, reportes, etc.). 
                  Los permisos por rol se aplican automáticamente, y aquí puedes personalizar excepciones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'ADMIN').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Usuarios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Con Permisos Custom</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500 mt-1">Próximamente</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Usuarios y Permisos
            </CardTitle>
            <CardDescription>
              Click en un usuario para configurar sus permisos granulares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                  onClick={() => handleEditPermissions(user)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-purple-700">
                        {user.nombre?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.nombre || user.email}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                    
                    {user.is_active ? (
                      <Badge className="bg-green-100 text-green-800">
                        Activo
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">
                        Inactivo
                      </Badge>
                    )}

                    <Button variant="outline" size="sm" className="gap-2">
                      <Lock className="h-4 w-4" />
                      Editar Permisos
                    </Button>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No hay usuarios registrados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guía de roles predeterminados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Permisos por Rol (Predeterminados)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-red-700 mb-2">ADMIN</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>✅ Acceso completo</li>
                  <li>✅ Gestión de usuarios</li>
                  <li>✅ Configuración del sistema</li>
                  <li>✅ Todos los permisos</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-700 mb-2">MANAGER</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>✅ Gestión de leads</li>
                  <li>✅ Pipeline completo</li>
                  <li>✅ Reportes</li>
                  <li>✅ Asignaciones</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-green-700 mb-2">AGENT</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>✅ Ver y editar leads</li>
                  <li>✅ Chat con clientes</li>
                  <li>✅ Reportes básicos</li>
                  <li>❌ No puede eliminar</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">VIEWER</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>✅ Solo lectura</li>
                  <li>✅ Ver dashboard</li>
                  <li>✅ Ver reportes</li>
                  <li>❌ No puede editar</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de permisos */}
      {selectedUser && (
        <UserPermissionsDialog
          user={selectedUser}
          permissions={permissions}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSavePermissions}
        />
      )}
    </div>
  )
}

