'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface Permission {
  resource: string
  action: string
  granted: boolean
}

interface PermissionsMatrixProps {
  permissions: Permission[]
  onChange: (permissions: Permission[]) => void
  readonly?: boolean
}

// Recursos del sistema
const RESOURCES = [
  { key: 'leads', label: 'Leads', description: 'Gestión de leads y contactos' },
  { key: 'pipeline', label: 'Pipeline', description: 'Pipeline de ventas' },
  { key: 'conversations', label: 'Conversaciones', description: 'Chat y mensajería' },
  { key: 'reports', label: 'Reportes', description: 'Reportes y analytics' },
  { key: 'documents', label: 'Documentos', description: 'Gestión de archivos' },
  { key: 'automation', label: 'Automatizaciones', description: 'Reglas y flujos' },
  { key: 'admin', label: 'Administración', description: 'Configuración del sistema' },
  { key: 'users', label: 'Usuarios', description: 'Gestión de usuarios' },
]

// Acciones disponibles
const ACTIONS = [
  { key: 'read', label: 'Ver', icon: '👁️' },
  { key: 'create', label: 'Crear', icon: '➕' },
  { key: 'update', label: 'Editar', icon: '✏️' },
  { key: 'delete', label: 'Eliminar', icon: '🗑️' },
]

export function PermissionsMatrix({ permissions, onChange, readonly = false }: PermissionsMatrixProps) {
  const [localPermissions, setLocalPermissions] = useState<Permission[]>(permissions)

  const hasPermission = (resource: string, action: string): boolean => {
    return localPermissions.some(p => 
      p.resource === resource && p.action === action && p.granted
    )
  }

  const togglePermission = (resource: string, action: string) => {
    if (readonly) return

    const newPermissions = [...localPermissions]
    const existingIndex = newPermissions.findIndex(
      p => p.resource === resource && p.action === action
    )

    if (existingIndex >= 0) {
      // Toggle existing permission
      newPermissions[existingIndex].granted = !newPermissions[existingIndex].granted
    } else {
      // Add new permission
      newPermissions.push({
        resource,
        action,
        granted: true
      })
    }

    setLocalPermissions(newPermissions)
    onChange(newPermissions)
  }

  const toggleAllForResource = (resource: string, granted: boolean) => {
    if (readonly) return

    const newPermissions = [...localPermissions]
    
    ACTIONS.forEach(action => {
      const existingIndex = newPermissions.findIndex(
        p => p.resource === resource && p.action === action.key
      )

      if (existingIndex >= 0) {
        newPermissions[existingIndex].granted = granted
      } else {
        newPermissions.push({
          resource,
          action: action.key,
          granted
        })
      }
    })

    setLocalPermissions(newPermissions)
    onChange(newPermissions)
  }

  const toggleAllForAction = (action: string, granted: boolean) => {
    if (readonly) return

    const newPermissions = [...localPermissions]
    
    RESOURCES.forEach(resource => {
      const existingIndex = newPermissions.findIndex(
        p => p.resource === resource.key && p.action === action
      )

      if (existingIndex >= 0) {
        newPermissions[existingIndex].granted = granted
      } else {
        newPermissions.push({
          resource: resource.key,
          action,
          granted
        })
      }
    })

    setLocalPermissions(newPermissions)
    onChange(newPermissions)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Permisos</CardTitle>
        <CardDescription>
          Define permisos específicos por recurso y acción
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold text-gray-700">Recurso</th>
                {ACTIONS.map(action => (
                  <th key={action.key} className="text-center p-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{action.icon}</span>
                      <span className="text-sm font-medium">{action.label}</span>
                      {!readonly && (
                        <button
                          className="text-xs text-purple-600 hover:text-purple-800"
                          onClick={() => {
                            const allGranted = RESOURCES.every(r => hasPermission(r.key, action.key))
                            toggleAllForAction(action.key, !allGranted)
                          }}
                        >
                          {RESOURCES.every(r => hasPermission(r.key, action.key)) ? 'Desmarcar' : 'Marcar'} todos
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="text-center p-3">
                  <span className="text-sm font-medium">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map(resource => (
                <tr key={resource.key} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-gray-900">{resource.label}</p>
                      <p className="text-sm text-gray-500">{resource.description}</p>
                    </div>
                  </td>
                  {ACTIONS.map(action => (
                    <td key={action.key} className="text-center p-3">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={hasPermission(resource.key, action.key)}
                          onCheckedChange={() => togglePermission(resource.key, action.key)}
                          disabled={readonly}
                          className="h-5 w-5"
                        />
                      </div>
                    </td>
                  ))}
                  <td className="text-center p-3">
                    {!readonly && (
                      <div className="flex gap-2 justify-center">
                        <button
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                          onClick={() => toggleAllForResource(resource.key, true)}
                        >
                          Todos
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                          onClick={() => toggleAllForResource(resource.key, false)}
                        >
                          Ninguno
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen de permisos otorgados */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Resumen:</p>
          <div className="flex flex-wrap gap-2">
            {localPermissions
              .filter(p => p.granted)
              .map((p, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {RESOURCES.find(r => r.key === p.resource)?.label || p.resource}:{' '}
                  {ACTIONS.find(a => a.key === p.action)?.label || p.action}
                </Badge>
              ))}
            {localPermissions.filter(p => p.granted).length === 0 && (
              <span className="text-sm text-gray-500">Sin permisos personalizados</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

