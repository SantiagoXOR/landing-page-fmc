'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useManychatTags } from '@/hooks/useManychatTags'
import { useToast } from '@/components/ui/toast'
import { 
  Radio, 
  Send, 
  Users, 
  Tag, 
  Calendar, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BroadcastData } from '@/types/manychat-ui'

interface ManychatBroadcastPanelProps {
  onBroadcastSent?: (broadcastId: number) => void
  className?: string
}

export function ManychatBroadcastPanel({ onBroadcastSent, className }: ManychatBroadcastPanelProps) {
  const { addToast } = useToast()
  const { availableTags } = useManychatTags()
  const [broadcast, setBroadcast] = useState<BroadcastData>({
    name: '',
    message: '',
    targetType: 'tags',
    tagIds: [],
    leadIds: [],
    status: 'draft',
  })
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [leadIdsInput, setLeadIdsInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [estimatedRecipients, setEstimatedRecipients] = useState(0)

  useEffect(() => {
    // Calcular estimación de destinatarios
    if (broadcast.targetType === 'tags' && selectedTags.length > 0) {
      // Esto debería venir de una API que cuente subscribers con esos tags
      setEstimatedRecipients(0) // Placeholder
    } else if (broadcast.targetType === 'leads') {
      const leads = leadIdsInput.split(',').filter(id => id.trim())
      setEstimatedRecipients(leads.length)
    }
  }, [broadcast.targetType, selectedTags, leadIdsInput])

  const handleToggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSendBroadcast = async () => {
    if (!broadcast.name.trim() || !broadcast.message.trim()) {
      addToast({
        title: 'Campos requeridos',
        description: 'Debes completar el nombre y el mensaje',
        type: 'error',
      })
      return
    }

    if (broadcast.targetType === 'tags' && selectedTags.length === 0) {
      addToast({
        title: 'Selecciona tags',
        description: 'Debes seleccionar al menos un tag',
        type: 'error',
      })
      return
    }

    if (broadcast.targetType === 'leads' && !leadIdsInput.trim()) {
      addToast({
        title: 'Especifica leads',
        description: 'Debes especificar IDs de leads',
        type: 'error',
      })
      return
    }

    try {
      setSending(true)

      const response = await fetch('/api/manychat/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: broadcast.name,
          message: broadcast.message,
          tagIds: broadcast.targetType === 'tags' ? selectedTags : undefined,
          subscriberIds: broadcast.targetType === 'leads' 
            ? leadIdsInput.split(',').map(id => id.trim()).filter(Boolean)
            : undefined,
          sendTime: broadcast.scheduledFor,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar broadcast')
      }

      const result = await response.json()

      addToast({
        title: 'Broadcast enviado',
        description: `El broadcast "${broadcast.name}" se envió exitosamente`,
        type: 'success',
      })

      // Limpiar formulario
      setBroadcast({
        name: '',
        message: '',
        targetType: 'tags',
        tagIds: [],
        leadIds: [],
        status: 'draft',
      })
      setSelectedTags([])
      setLeadIdsInput('')

      if (onBroadcastSent && result.broadcastId) {
        onBroadcastSent(result.broadcastId)
      }
    } catch (error) {
      addToast({
        title: 'Error al enviar broadcast',
        description: error instanceof Error ? error.message : 'Error desconocido',
        type: 'error',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Crear Broadcast</CardTitle>
          </div>
          {estimatedRecipients > 0 && (
            <Badge variant="outline">
              ~{estimatedRecipients} destinatarios
            </Badge>
          )}
        </div>
        <CardDescription>
          Envía un mensaje masivo a múltiples contactos
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Nombre del broadcast */}
        <div>
          <Label htmlFor="broadcastName">Nombre del Broadcast</Label>
          <Input
            id="broadcastName"
            value={broadcast.name}
            onChange={(e) => setBroadcast({ ...broadcast, name: e.target.value })}
            placeholder="ej: Promoción Especial Octubre"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            {broadcast.name.length}/100 caracteres
          </p>
        </div>

        {/* Mensaje */}
        <div>
          <Label htmlFor="broadcastMessage">Mensaje</Label>
          <Textarea
            id="broadcastMessage"
            value={broadcast.message}
            onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
            placeholder="Escribe tu mensaje aquí..."
            rows={5}
            maxLength={4096}
          />
          <p className="text-xs text-gray-500 mt-1">
            {broadcast.message.length}/4096 caracteres
          </p>
        </div>

        {/* Tipo de destinatarios */}
        <div>
          <Label>Destinatarios</Label>
          <Tabs
            value={broadcast.targetType}
            onValueChange={(value: any) =>
              setBroadcast({ ...broadcast, targetType: value })
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tags" className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Por Tags
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Por Leads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tags" className="space-y-3 mt-3">
              <p className="text-sm text-gray-600">
                Selecciona los tags de los contactos a los que quieres enviar
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-3">
                {availableTags.length > 0 ? (
                  availableTags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => handleToggleTag(tag.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{tag.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay tags disponibles
                  </p>
                )}
              </div>
              {selectedTags.length > 0 && (
                <p className="text-xs text-gray-500">
                  {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} seleccionado{selectedTags.length > 1 ? 's' : ''}
                </p>
              )}
            </TabsContent>

            <TabsContent value="leads" className="space-y-3 mt-3">
              <p className="text-sm text-gray-600">
                Ingresa los IDs de leads separados por comas
              </p>
              <Textarea
                value={leadIdsInput}
                onChange={(e) => setLeadIdsInput(e.target.value)}
                placeholder="lead-id-1, lead-id-2, lead-id-3"
                rows={4}
              />
              <p className="text-xs text-gray-500">
                {leadIdsInput.split(',').filter(id => id.trim()).length} lead(s) especificado(s)
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        {showPreview && broadcast.message && (
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <CardTitle className="text-sm">Vista Previa</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-sm whitespace-pre-wrap">{broadcast.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Ocultar' : 'Preview'}
          </Button>
          
          <Button
            onClick={handleSendBroadcast}
            disabled={sending || !broadcast.name || !broadcast.message}
            className="flex-1"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Broadcast
              </>
            )}
          </Button>
        </div>

        {/* Advertencia */}
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800">
            <p className="font-medium">Importante:</p>
            <p className="mt-1">
              Los broadcasts promocionales requieren templates aprobados por WhatsApp.
              Asegúrate de cumplir con las políticas de WhatsApp Business.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

