'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageCircle, Send, FileText, AlertCircle, CheckCircle, Image as ImageIcon,
  Video, File, Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface ManychatMessageSenderProps {
  leadId: string
  telefono: string
  manychatId?: string
  onMessageSent?: (messageId: string) => void
}

export default function ManychatMessageSender({ 
  leadId, 
  telefono, 
  manychatId,
  onMessageSent 
}: ManychatMessageSenderProps) {
  const { addToast } = useToast()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'file'>('text')
  const [mediaUrl, setMediaUrl] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isManychatConfigured, setIsManychatConfigured] = useState(false)
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    checkConfiguration()
  }, [])

  useEffect(() => {
    setIsSynced(!!manychatId)
  }, [manychatId])

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/manychat/health')
      if (response.ok) {
        const data = await response.json()
        setIsManychatConfigured(data.status === 'healthy')
      }
    } catch (err) {
      setIsManychatConfigured(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() && messageType === 'text') {
      setError('El mensaje no puede estar vacío')
      return
    }

    if (messageType !== 'text' && !mediaUrl.trim()) {
      setError('Debes proporcionar una URL de media')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Enviar mensaje vía API de WhatsApp (que internamente usa Manychat si está configurado)
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: telefono,
          message: message.trim(),
          messageType,
          mediaUrl: messageType !== 'text' ? mediaUrl : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar mensaje')
      }

      const result = await response.json()
      
      setSuccess(`Mensaje enviado exitosamente`)
      setMessage('')
      setMediaUrl('')
      
      addToast({
        title: 'Mensaje enviado',
        description: `Mensaje enviado a ${telefono} ${isManychatConfigured ? 'vía Manychat' : ''}`,
        type: 'success',
      })

      if (onMessageSent && result.messageId) {
        onMessageSent(result.messageId)
      }

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      addToast({
        title: 'Error al enviar mensaje',
        description: errorMessage,
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Enviar Mensaje</CardTitle>
          </div>
          {isManychatConfigured && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Manychat
            </Badge>
          )}
        </div>
        <CardDescription>
          Enviar mensaje a {telefono}
          {!isSynced && isManychatConfigured && (
            <span className="block text-yellow-600 text-xs mt-1">
              ⚠️ Lead no sincronizado con Manychat. Se sincronizará al enviar.
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs para tipo de mensaje */}
        <Tabs value={messageType} onValueChange={(value: any) => setMessageType(value)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text" className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Texto</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Imagen</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              <span className="hidden sm:inline">Video</span>
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-1">
              <File className="w-3 h-3" />
              <span className="hidden sm:inline">Archivo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3">
            <div>
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu mensaje aquí..."
                rows={4}
                maxLength={4096}
                className="resize-none"
              />
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>{message.length}/4096 caracteres</span>
                <span className="text-gray-400">Ctrl+Enter para enviar</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-3">
            <div>
              <Label htmlFor="imageUrl">URL de la imagen</Label>
              <Input
                id="imageUrl"
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
            <div>
              <Label htmlFor="caption">Descripción (opcional)</Label>
              <Textarea
                id="caption"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Agrega una descripción..."
                rows={2}
                maxLength={1024}
              />
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-3">
            <div>
              <Label htmlFor="videoUrl">URL del video</Label>
              <Input
                id="videoUrl"
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://ejemplo.com/video.mp4"
              />
            </div>
            <div>
              <Label htmlFor="videoCaption">Descripción (opcional)</Label>
              <Textarea
                id="videoCaption"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Agrega una descripción..."
                rows={2}
                maxLength={1024}
              />
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-3">
            <div>
              <Label htmlFor="fileUrl">URL del archivo</Label>
              <Input
                id="fileUrl"
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://ejemplo.com/documento.pdf"
              />
            </div>
            <p className="text-xs text-gray-500">
              Formatos soportados: PDF, DOC, DOCX, XLS, XLSX, etc.
            </p>
          </TabsContent>
        </Tabs>

        {/* Mensajes de estado */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {/* Botón de envío */}
        <Button 
          onClick={handleSendMessage} 
          disabled={loading || (!message.trim() && messageType === 'text') || (messageType !== 'text' && !mediaUrl.trim())}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar mensaje
            </>
          )}
        </Button>

        {/* Info footer */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Método de envío:</span>
            <Badge variant="outline" className={cn(
              isManychatConfigured ? 'text-blue-600 border-blue-200' : 'text-gray-600'
            )}>
              {isManychatConfigured ? 'Manychat API' : 'WhatsApp Business API'}
            </Badge>
          </div>
          {isManychatConfigured && isSynced && (
            <p className="text-xs text-gray-500 mt-2">
              ✓ Contacto sincronizado con Manychat
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

