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
  Video, File, Loader2, Bot, FileText
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ManychatMessageSenderProps {
  leadId: string
  telefono: string
  manychatId?: string
  onMessageSent?: (messageId: string) => void
}

interface Document {
  id: string
  original_filename: string
  category: string
  file_size: number
  public_url?: string
  storage_path: string
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
  
  // Estados para documentos
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('')

  useEffect(() => {
    checkConfiguration()
  }, [])

  useEffect(() => {
    setIsSynced(!!manychatId)
  }, [manychatId])

  useEffect(() => {
    // Cargar documentos cuando se selecciona el tipo "file"
    if (messageType === 'file' && leadId) {
      fetchLeadDocuments()
    }
  }, [messageType, leadId])

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

  const fetchLeadDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const response = await fetch(`/api/documents?leadId=${leadId}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const handleDocumentSelect = async (documentId: string) => {
    try {
      // Obtener la URL firmada del documento
      const response = await fetch(`/api/documents/${documentId}`)
      if (response.ok) {
        const doc = await response.json()
        setMediaUrl(doc.public_url || '')
        setSelectedDocumentId(documentId)
      } else {
        throw new Error('Error al obtener el documento')
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo cargar el documento seleccionado',
        type: 'error',
      })
    }
  }

  const handleClearSelection = () => {
    setSelectedDocumentId('')
    setMediaUrl('')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleSendMessage = async () => {
    if (!message.trim() && messageType === 'text') {
      setError('Escribe un mensaje antes de enviar')
      return
    }

    if (messageType !== 'text' && !mediaUrl.trim()) {
      setError('Ingresa la URL del archivo multimedia o selecciona un documento')
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
          leadId, // Incluir leadId si está disponible
        }),
      })

      // Verificar si la respuesta es OK
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (parseError) {
          // Si no se puede parsear el JSON, usar el texto de la respuesta
          const text = await response.text()
          throw new Error(`Error ${response.status}: ${text || 'Error desconocido'}`)
        }
        
        // Extraer mensaje de error de la respuesta
        const errorMessage = errorData?.error || errorData?.message || `Error ${response.status}: Error al enviar mensaje`
        
        // Si hay detalles adicionales, incluirlos en desarrollo
        if (errorData?.details && process.env.NODE_ENV === 'development') {
          console.error('Error details:', errorData.details)
        }
        
        throw new Error(errorMessage)
      }

      // Parsear respuesta
      let result
      try {
        result = await response.json()
      } catch (parseError) {
        throw new Error('Error al procesar la respuesta del servidor')
      }

      // Validar que la respuesta tenga el formato esperado
      if (!result || typeof result !== 'object') {
        throw new Error('Respuesta inválida del servidor')
      }

      // Validar que tenga messageId si fue exitoso
      if (result.success && !result.messageId) {
        console.warn('Response marked as success but missing messageId', result)
      }

      // Limpiar formulario solo si fue exitoso
      if (result.success !== false) {
        setMessage('')
        setMediaUrl('')
        setSelectedDocumentId('')
        
        addToast({
          title: 'Mensaje enviado',
          description: `Mensaje enviado exitosamente a ${telefono}`,
          type: 'success',
        })

        // Llamar callback solo si tenemos messageId válido
        if (onMessageSent && result.messageId) {
          onMessageSent(result.messageId)
        }
      } else {
        throw new Error(result.error || 'Error al enviar mensaje')
      }
    } catch (err) {
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error desconocido'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message)
      }

      // Mensajes más amigables para errores comunes
      if (errorMessage.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.'
      } else if (errorMessage.includes('401') || errorMessage.includes('No autorizado')) {
        errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página e intenta nuevamente.'
      } else if (errorMessage.includes('403') || errorMessage.includes('Sin permisos')) {
        errorMessage = 'No tienes permisos para enviar mensajes. Contacta al administrador.'
      } else if (errorMessage.includes('503') || errorMessage.includes('no está configurado')) {
        errorMessage = 'WhatsApp no está configurado. Contacta al administrador.'
      } else if (errorMessage.includes('sincronizado')) {
        errorMessage = 'El contacto no está sincronizado. Por favor, sincroniza el contacto primero.'
      }

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
              <Label htmlFor="documentSelect">Seleccionar documento del lead</Label>
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-4 border rounded-md">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Cargando documentos...</span>
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-2">
                  <Select value={selectedDocumentId || undefined} onValueChange={handleDocumentSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un documento para enviar" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center gap-2 py-1">
                            <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium truncate">{doc.original_filename}</span>
                              <span className="text-xs text-gray-500">
                                {doc.category} • {formatFileSize(doc.file_size)}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDocumentId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDocumentId('')
                        setMediaUrl('')
                      }}
                      className="w-full text-xs"
                    >
                      Limpiar selección
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-2 px-3 border rounded-md bg-gray-50">
                  No hay documentos disponibles para este lead
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">O</span>
              </div>
            </div>

            <div>
              <Label htmlFor="fileUrl">URL del archivo (manual)</Label>
              <Input
                id="fileUrl"
                type="url"
                value={mediaUrl}
                onChange={(e) => {
                  setMediaUrl(e.target.value)
                  if (e.target.value) {
                    setSelectedDocumentId('')
                  }
                }}
                placeholder="https://ejemplo.com/documento.pdf"
                disabled={!!selectedDocumentId}
                className={selectedDocumentId ? 'bg-gray-100' : ''}
              />
              {selectedDocumentId && (
                <p className="text-xs text-gray-500 mt-1">
                  Un documento está seleccionado. Limpia la selección para usar URL manual.
                </p>
              )}
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

