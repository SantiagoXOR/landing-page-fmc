'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Users, Shield, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal'
import { PermissionGuard, usePermissions, ConditionalRender } from '@/components/auth/PermissionGuard'

interface User {
  id: string
  email: string
  nombre: string
  apellido?: string
  role: 'ADMIN' | 'MANAGER' | 'ANALISTA' | 'VENDEDOR' | 'VIEWER'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
  last_login?: string
  created_at: string
}

function UsersAdminPage() {
  const { data: session } = useSession()
  const { addToast } = useToast()
  const { checkPermission } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    userId: string
    userName: string
  }>({
    isOpen: false,
    userId: '',
    userName: ''
  })

  // Cargar usuarios
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      
      if (!response.ok) {
        throw new Error('Error al cargar usuarios')
      }

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      addToast({
        type: 'error',
        title: 'Error al cargar',
        description: 'No se pudieron cargar los usuarios'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = search === '' || 
      user.nombre.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.apellido && user.apellido.toLowerCase().includes(search.toLowerCase()))
    
    const matchesRole = roleFilter === '' || user.role === roleFilter
    const matchesStatus = statusFilter === '' || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  // Funciones para modal de eliminación
  const openDeleteModal = (userId: string, userName: string) => {
    setDeleteModal({
      isOpen: true,
      userId,
      userName
    })
  }

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      userId: '',
      userName: ''
    })
  }

  const confirmDeleteUser = async () => {
    try {
      setDeletingId(deleteModal.userId)
      const response = await fetch(`/api/admin/users/${deleteModal.userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar usuario')
      }

      await fetchUsers()
      
      addToast({
        type: 'success',
        title: 'Usuario eliminado',
        description: 'El usuario ha sido eliminado exitosamente'
      })
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      addToast({
        type: 'error',
        title: 'Error al eliminar',
        description: error instanceof Error ? error.message : 'Error al eliminar el usuario'
      })
      throw error
    } finally {
      setDeletingId(null)
    }
  }

  // Función para cambiar estado de usuario
  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar estado')
      }

      await fetchUsers()
      
      addToast({
        type: 'success',
        title: 'Estado actualizado',
        description: `Usuario ${newStatus === 'ACTIVE' ? 'activado' : 'desactivado'} exitosamente`
      })
    } catch (error) {
      console.error('Error updating user status:', error)
      addToast({
        type: 'error',
        title: 'Error al actualizar',
        description: error instanceof Error ? error.message : 'Error al actualizar el estado'
      })
    }
  }

  // Función para obtener badge de rol
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { color: 'bg-red-100 text-red-800', label: 'Admin' },
      MANAGER: { color: 'bg-purple-100 text-purple-800', label: 'Manager' },
      ANALISTA: { color: 'bg-blue-100 text-blue-800', label: 'Analista' },
      VENDEDOR: { color: 'bg-green-100 text-green-800', label: 'Vendedor' },
      VIEWER: { color: 'bg-gray-100 text-gray-800', label: 'Viewer' }
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.VIEWER
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    )
  }

  // Función para obtener badge de estado
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Activo' },
      INACTIVE: { color: 'bg-gray-100 text-gray-800', label: 'Inactivo' },
      SUSPENDED: { color: 'bg-red-100 text-red-800', label: 'Suspendido' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.INACTIVE
    return (
      <Badge className={`${config.color} text-xs`}>
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Users className="h-8 w-8 animate-pulse mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra usuarios, roles y permisos del sistema</p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Nombre, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Rol</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos los roles</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="ANALISTA">Analista</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="SUSPENDED">Suspendido</option>
                <option value="PENDING">Pendiente</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold">{users.filter(u => u.status === 'ACTIVE').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'ADMIN').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactivos</p>
                <p className="text-2xl font-bold">{users.filter(u => u.status !== 'ACTIVE').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Lista de todos los usuarios del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Usuario</th>
                  <th className="text-left p-4 font-medium">Rol</th>
                  <th className="text-left p-4 font-medium">Estado</th>
                  <th className="text-left p-4 font-medium">Último Login</th>
                  <th className="text-left p-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">
                          {user.nombre} {user.apellido}
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-600">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString('es-AR')
                          : 'Nunca'
                        }
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="ghost" size="sm" className="hover:bg-blue-50" title="Editar usuario">
                          <Link href={`/admin/users/${user.id}/edit`}>
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={user.status === 'ACTIVE' ? 'hover:bg-red-50' : 'hover:bg-green-50'}
                          title={user.status === 'ACTIVE' ? 'Desactivar usuario' : 'Activar usuario'}
                          onClick={() => toggleUserStatus(user.id, user.status)}
                        >
                          {user.status === 'ACTIVE' ? (
                            <UserX className="h-4 w-4 text-red-600" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        {user.role !== 'ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-50"
                            title="Eliminar usuario"
                            onClick={() => openDeleteModal(user.id, `${user.nombre} ${user.apellido || ''}`)}
                            disabled={deletingId === user.id}
                          >
                            {deletingId === user.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No se encontraron usuarios</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación de eliminación */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteUser}
        title="Eliminar Usuario"
        description="¿Estás seguro de que quieres eliminar este usuario? Se perderán todos los datos asociados y el acceso al sistema."
        itemName={deleteModal.userName}
        loading={deletingId === deleteModal.userId}
      />
    </div>
  )
}

// Envolver con PermissionGuard
export default function ProtectedUsersAdminPage() {
  return (
    <PermissionGuard permission="users:read" route="/admin/users">
      <UsersAdminPage />
    </PermissionGuard>
  )
}
