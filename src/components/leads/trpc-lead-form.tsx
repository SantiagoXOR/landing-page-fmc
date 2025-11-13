'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useSession } from 'next-auth/react'
import { notifyLeadCreated, notifyLeadUpdated } from '@/lib/notification-helpers'
import { logger } from '@/lib/logger'

interface TRPCLeadFormProps {
  leadId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function TRPCLeadForm({ leadId, onSuccess, onCancel }: TRPCLeadFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    status: 'new',
    notes: '',
    score: 0,
  })

  const utils = api.useUtils()
  const { data: session } = useSession()
  const { addToast } = useToast()
  const isEditing = Boolean(leadId)

  // Fetch existing lead data if editing
  const { data: existingLead, isLoading: loadingLead } = api.leads.getById.useQuery(
    { id: leadId! },
    {
      enabled: isEditing
    }
  )

  // Handle existing lead data loading
  useEffect(() => {
    if (existingLead) {
      setFormData({
        name: existingLead.nombre || '',
        email: existingLead.email || '',
        phone: existingLead.telefono || '',
        company: existingLead.agencia || '',
        source: existingLead.origen || '',
        status: (existingLead.estado as 'new' | 'contacted' | 'qualified' | 'converted' | 'lost') || 'new',
        notes: existingLead.notas || '',
        score: existingLead.ingresos || 0,
      })
    }
  }, [existingLead])

  // Create lead mutation
  const createLead = api.leads.create.useMutation({
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Lead creado exitosamente',
        description: `El lead ${data.nombre} ha sido creado con ID: ${data.id}`,
      })
      
      // Enviar notificación en tiempo real
      try {
        if (data.id) {
          notifyLeadCreated({
            id: data.id,
            nombre: data.nombre,
            email: data.email || undefined,
            telefono: data.telefono || undefined,
            estado: data.estado
          }, session?.user?.id)
        }
      } catch (notificationError) {
        logger.warn('Error enviando notificación de lead creado:', notificationError)
      }
      
      // Invalidate and refetch leads list
      utils.leads.getAll.invalidate()
      utils.dashboard.getMetrics.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error al crear lead',
        description: error.message,
      })
    },
  })

  // Update lead mutation
  const updateLead = api.leads.update.useMutation({
    onSuccess: (data) => {
      addToast({
        type: 'success',
        title: 'Lead actualizado exitosamente',
        description: `El lead ${data.nombre} ha sido actualizado`,
      })
      
      // Enviar notificación en tiempo real
      try {
        if (data.id) {
          notifyLeadUpdated({
            id: data.id,
            nombre: data.nombre,
            email: data.email || undefined,
            telefono: data.telefono || undefined,
            estado: data.estado
          }, session?.user?.id)
        }
      } catch (notificationError) {
        logger.warn('Error enviando notificación de lead actualizado:', notificationError)
      }
      
      // Invalidate related queries
      utils.leads.getById.invalidate({ id: leadId! })
      utils.leads.getAll.invalidate()
      utils.dashboard.getMetrics.invalidate()
      onSuccess?.()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error al actualizar lead',
        description: error.message,
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isEditing) {
      updateLead.mutate({
        data: {
          nombre: formData.name,
          email: formData.email,
          telefono: formData.phone,
          // empresa: formData.company, // Propiedad no disponible en el schema
          origen: formData.source as any,
          estado: 'NUEVO' as any,
          notas: formData.notes
          // puntuacion: formData.score // Propiedad no disponible en el schema
        },
        id: leadId!
      })
    } else {
      createLead.mutate({
        nombre: formData.name,
        telefono: formData.phone,
        email: formData.email,
        // empresa: formData.company, // Propiedad no disponible en el schema
        origen: formData.source as any,
        estado: 'NUEVO' as any,
        notas: formData.notes
        // puntuacion: formData.score // Propiedad no disponible en el schema
      })
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isLoading = createLead.isPending || updateLead.isPending || loadingLead
  const hasError = createLead.error || updateLead.error

  if (loadingLead) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando datos del lead...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Editar Lead' : 'Crear Nuevo Lead'}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Actualiza la información del lead existente'
            : 'Completa los datos para crear un nuevo lead en el sistema'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {createLead.error?.message || updateLead.error?.message}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nombre completo"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@ejemplo.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1234567890"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Nombre de la empresa"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Fuente</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => handleInputChange('source', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Sitio Web</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="referral">Referido</SelectItem>
                  <SelectItem value="social_media">Redes Sociales</SelectItem>
                  <SelectItem value="email_campaign">Campaña Email</SelectItem>
                  <SelectItem value="phone_call">Llamada Telefónica</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nuevo</SelectItem>
                  <SelectItem value="contacted">Contactado</SelectItem>
                  <SelectItem value="qualified">Calificado</SelectItem>
                  <SelectItem value="proposal">Propuesta</SelectItem>
                  <SelectItem value="negotiation">Negociación</SelectItem>
                  <SelectItem value="closed_won">Cerrado Ganado</SelectItem>
                  <SelectItem value="closed_lost">Cerrado Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="score">Puntuación (0-100)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={formData.score}
              onChange={(e) => handleInputChange('score', parseInt(e.target.value) || 0)}
              placeholder="0"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Notas adicionales sobre el lead..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isEditing ? 'Actualizar Lead' : 'Crear Lead'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}