'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  MessageCircle, Send, AlertCircle, Image as ImageIcon,
  Video, File, Loader2, Bot
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
      setError('Escribe un mensaje antes de enviar')
      return
    }

    if (messageType !== 'text' && !mediaUrl.trim()) {
      setError('Ingresa la URL del archivo multimedia')
      return
    }

    setLoading(true)
    setError(null)

    try {
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
      setMessage('')
      setMediaUrl('')
      
      addToast({
        title: 'Mensaje enviado',
        description: `Mensaje enviado exitosamente a ${telefono}`,
        type: 'success',
      })

      if (onMessageSent && result.messageId) {
        onMessageSent(result.messageId)
      }
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
              <Bot className="w-3 h-3 mr-1" />
              Chatbot
            </Badge>
          )}
        </div>
        <CardDescription>
          Enviar mensaje a {telefono}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs para tipo de mensaje */}
        <Tabs value={messageType} onValueChange={(value: any) => setMessageType(value)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text" className="flex items-center gap-1 text-xs">
              <MessageCircle className="w-3 h-3" />
              <span className="hidden sm:inline">Texto</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1 text-xs">
              <ImageIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Imagen</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-1 text-xs">
              <Video className="w-3 h-3" />
              <span className="hidden sm:inline">Video</span>
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-1 text-xs">
              <File className="w-3 h-3" />
              <span className="hidden sm:inline">Archivo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3 mt-4">
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

        {/* Mensajes de error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Botón de envío */}
        <Button 
          onClick={handleSendMessage} 
          disabled={loading || (!message.trim() && messageType === 'text') || (messageType !== 'text' && !mediaUrl.trim())}
          className="w-full"
          size="lg"
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
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Método:</span>
            <Badge variant="outline" className={cn(
              isManychatConfigured ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-600'
            )}>
              {isManychatConfigured ? (
                <>
                  <Bot className="w-3 h-3 mr-1" />
                  Chatbot
                </>
              ) : (
                'WhatsApp Directo'
              )}
            </Badge>
          </div>
          {isManychatConfigured && isSynced && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              ✓ Contacto sincronizado con el chatbot
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

