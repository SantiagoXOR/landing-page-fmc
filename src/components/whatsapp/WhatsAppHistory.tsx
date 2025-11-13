'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ArrowRight, ArrowLeft, Clock, User, Bot } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface WhatsAppMessage {
  id: string
  tipo: 'whatsapp_in' | 'whatsapp_out'
  payload: {
    mensaje?: string
    telefono?: string
    messageId?: string
    nombre?: string
    sentBy?: string
    sentAt?: string
    templateName?: string
    messageType?: string
  }
  createdAt: string
}

interface WhatsAppHistoryProps {
  leadId: string
  telefono: string
}

export default function WhatsAppHistory({ leadId, telefono }: WhatsAppHistoryProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [leadId])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/leads/${leadId}/events?tipo=whatsapp`)
      
      if (!response.ok) {
        throw new Error('Error al cargar mensajes')
      }
      
      const data = await response.json()
      setMessages(data.events || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-AR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else {
      return date.toLocaleDateString('es-AR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getMessageIcon = (tipo: string) => {
    return tipo === 'whatsapp_in' ? (
      <ArrowLeft className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowRight className="w-4 h-4 text-green-600" />
    )
  }

  const getMessageBadge = (tipo: string) => {
    return tipo === 'whatsapp_in' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200">
        <User className="w-3 h-3 mr-1" />
        Recibido
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-600 border-green-200">
        <Bot className="w-3 h-3 mr-1" />
        Enviado
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Historial de WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Cargando conversación...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-800">
            <MessageCircle className="w-5 h-5 mr-2" />
            Error al cargar historial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Historial de WhatsApp
        </CardTitle>
        <CardDescription>
          Conversación con {telefono}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No hay mensajes de WhatsApp</p>
            <p className="text-sm">Los mensajes aparecerán aquí cuando se envíen o reciban</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.tipo === 'whatsapp_out' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.tipo === 'whatsapp_out'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {/* Header del mensaje */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                      {getMessageIcon(message.tipo)}
                      {getMessageBadge(message.tipo)}
                    </div>
                    <div className="flex items-center text-xs opacity-75">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatMessageTime(message.createdAt)}
                    </div>
                  </div>

                  {/* Contenido del mensaje */}
                  <div className="text-sm">
                    {message.payload.templateName ? (
                      <div>
                        <div className="font-medium mb-1">
                          📋 Template: {message.payload.templateName}
                        </div>
                        {message.payload.mensaje && (
                          <div>{message.payload.mensaje}</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {message.payload.mensaje || '[Mensaje sin contenido]'}
                      </div>
                    )}
                  </div>

                  {/* Información adicional */}
                  {message.payload.messageType && message.payload.messageType !== 'text' && (
                    <div className="text-xs opacity-75 mt-1">
                      Tipo: {message.payload.messageType}
                    </div>
                  )}

                  {/* ID del mensaje para debugging */}
                  {message.payload.messageId && (
                    <div className="text-xs opacity-50 mt-1 font-mono">
                      ID: {message.payload.messageId.substring(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Información de estado */}
        {messages.length > 0 && (
          <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
            {messages.length} mensaje{messages.length !== 1 ? 's' : ''} en total
          </div>
        )}
      </CardContent>
    </Card>
  )
}
