'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PermissionsMatrix } from './PermissionsMatrix'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Save } from 'lucide-react'

interface User {
  id: string
  email: string
  nombre: string
  role: string
}

interface Permission {
  id?: string
  user_id?: string
  resource: string
  action: string
  granted: boolean
  created_at?: string
}

interface UserPermissionsDialogProps {
  user: User
  permissions: Permission[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (userId: string, permissions: Permission[]) => Promise<void>
}

export function UserPermissionsDialog({
  user,
  permissions,
  open,
  onOpenChange,
  onSave,
}: UserPermissionsDialogProps) {
  const [localPermissions, setLocalPermissions] = useState<Permission[]>(permissions)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handlePermissionsChange = (newPermissions: Permission[]) => {
    setLocalPermissions(newPermissions)
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(user.id, localPermissions)
      setHasChanges(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving permissions:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('¿Descartar cambios no guardados?')) {
        setLocalPermissions(permissions)
        setHasChanges(false)
        onOpenChange(false)
      }
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-purple-700">
                {user.nombre?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p>Permisos de {user.nombre || user.email}</p>
              <p className="text-sm font-normal text-gray-500">{user.email}</p>
            </div>
            <Badge className="ml-auto">{user.role}</Badge>
          </DialogTitle>
          <DialogDescription>
            Configura permisos granulares para este usuario. Los permisos personalizados complementan (no reemplazan) los permisos del rol.
          </DialogDescription>
        </DialogHeader>

        {/* Alert de rol */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">
              Este usuario tiene rol <strong>{user.role}</strong>
            </p>
            <p className="text-blue-700 mt-1">
              Los permisos aquí configurados se suman a los permisos predeterminados del rol. 
              Para quitar permisos del rol, debes cambiar el rol del usuario.
            </p>
          </div>
        </div>

        {/* Matriz de permisos */}
        <PermissionsMatrix
          permissions={localPermissions}
          onChange={handlePermissionsChange}
          readonly={false}
        />

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Permisos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

