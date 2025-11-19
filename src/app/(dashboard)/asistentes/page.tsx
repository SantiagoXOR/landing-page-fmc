'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  MoreHorizontal, 
  Bot, 
  Settings, 
  Plus, 
  Play, 
  Edit, 
  Trash2,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AssistantPlayroom } from '@/components/assistants/AssistantPlayroom'
import { toast } from 'sonner'

interface Assistant {
  id: string
  nombre: string
  descripcion: string | null
  instrucciones: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    nombre: string
    email: string
  }
}

export default function AsistentesPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPlayroomOpen, setIsPlayroomOpen] = useState(false)
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    instrucciones: '',
    isDefault: false,
    isActive: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchAssistants()
  }, [])

  const fetchAssistants = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/assistants')
      
      if (!response.ok) {
        throw new Error('Error al cargar asistentes')
      }

      const data = await response.json()
      setAssistants(data)
    } catch (error: any) {
      console.error('Error fetching assistants:', error)
      toast.error('Error al cargar los asistentes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingAssistant(null)
    setFormData({
      nombre: '',
      descripcion: '',
      instrucciones: '',
      isDefault: false,
      isActive: true
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant)
    setFormData({
      nombre: assistant.nombre,
      descripcion: assistant.descripcion || '',
      instrucciones: assistant.instrucciones,
      isDefault: assistant.isDefault,
      isActive: assistant.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (assistant: Assistant) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el asistente "${assistant.nombre}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/assistants/${assistant.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar el asistente')
      }

      toast.success('Asistente eliminado correctamente')
      fetchAssistants()
    } catch (error: any) {
      console.error('Error deleting assistant:', error)
      toast.error('Error al eliminar el asistente')
    }
  }

  const handleToggleDefault = async (assistant: Assistant) => {
    try {
      const response = await fetch(`/api/assistants/${assistant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isDefault: !assistant.isDefault
        })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el asistente')
      }

      toast.success('Asistente actualizado correctamente')
      fetchAssistants()
    } catch (error: any) {
      console.error('Error updating assistant:', error)
      toast.error('Error al actualizar el asistente')
    }
  }

  const handleToggleActive = async (assistant: Assistant) => {
    try {
      const response = await fetch(`/api/assistants/${assistant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !assistant.isActive
        })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar el asistente')
      }

      toast.success('Asistente actualizado correctamente')
      fetchAssistants()
    } catch (error: any) {
      console.error('Error updating assistant:', error)
      toast.error('Error al actualizar el asistente')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim() || !formData.instrucciones.trim()) {
      toast.error('El nombre y las instrucciones son requeridos')
      return
    }

    try {
      setIsSubmitting(true)
      const url = editingAssistant 
        ? `/api/assistants/${editingAssistant.id}`
        : '/api/assistants'
      
      const method = editingAssistant ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar el asistente')
      }

      toast.success(editingAssistant ? 'Asistente actualizado correctamente' : 'Asistente creado correctamente')
      setIsDialogOpen(false)
      fetchAssistants()
    } catch (error: any) {
      console.error('Error saving assistant:', error)
      toast.error(error.message || 'Error al guardar el asistente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenPlayroom = (assistant: Assistant) => {
    setSelectedAssistant(assistant)
    setIsPlayroomOpen(true)
  }

  const getBotColor = (index: number) => {
    const colors = [
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-blue-500 to-blue-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600'
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Asistentes"
        subtitle="Gestiona tus asistentes virtuales de IA para automatizar conversaciones"
        showNewButton={false}
        actions={
          <Button onClick={handleCreateNew} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Crear nuevo
          </Button>
        }
      />

      <div className="p-6">
        {/* Botón de Ajustes */}
        <div className="mb-6 flex justify-end">
          <Button variant="outline" className="text-gray-700">
            <Settings className="h-4 w-4 mr-2" />
            Ajustes y horarios
          </Button>
        </div>

        {/* Tabla de Asistentes */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Asistentes Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : assistants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay asistentes configurados</p>
                <Button onClick={handleCreateNew} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer asistente
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nombre</TableHead>
                    <TableHead className="w-[300px]">Descripción</TableHead>
                    <TableHead className="w-[400px]">Instrucciones</TableHead>
                    <TableHead className="w-[120px]">Predeterminado</TableHead>
                    <TableHead className="w-[120px]">Estado</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assistants.map((assistant, index) => (
                    <TableRow key={assistant.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 bg-gradient-to-br ${getBotColor(index)} rounded-full flex items-center justify-center`}>
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{assistant.nombre}</p>
                            {assistant.isActive && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs mt-1">
                                Activo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600">
                          {assistant.descripcion || 'Sin descripción'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {assistant.instrucciones}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={assistant.isDefault}
                          onCheckedChange={() => handleToggleDefault(assistant)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={assistant.isActive}
                          onCheckedChange={() => handleToggleActive(assistant)}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenPlayroom(assistant)}>
                              <Play className="h-4 w-4 mr-2" />
                              Probar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(assistant)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(assistant)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para crear/editar asistente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAssistant ? 'Editar Asistente' : 'Crear Nuevo Asistente'}
            </DialogTitle>
            <DialogDescription>
              {editingAssistant 
                ? 'Modifica la información del asistente'
                : 'Completa los datos para crear un nuevo asistente virtual'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del asistente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción breve del asistente"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrucciones">Instrucciones *</Label>
              <Textarea
                id="instrucciones"
                value={formData.instrucciones}
                onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                placeholder="Instrucciones detalladas para el asistente. Estas serán usadas como system prompt para Gemini."
                rows={8}
                required
              />
              <p className="text-xs text-gray-500">
                Define cómo debe comportarse el asistente, su personalidad, y qué tipo de respuestas debe dar.
              </p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isDefault">Marcar como predeterminado</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isActive">Activo</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingAssistant ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Playroom */}
      {isPlayroomOpen && selectedAssistant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl">
            <AssistantPlayroom
              assistantId={selectedAssistant.id}
              assistantName={selectedAssistant.nombre}
              onClose={() => {
                setIsPlayroomOpen(false)
                setSelectedAssistant(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
