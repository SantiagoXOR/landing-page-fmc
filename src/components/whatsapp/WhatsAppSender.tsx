'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Send, FileText, AlertCircle, CheckCircle } from 'lucide-react'

interface WhatsAppTemplate {
  name: string
  displayName: string
  description: string
  parameters: string[]
}

interface WhatsAppConfig {
  configured: boolean
  phoneNumberId: string | null
  hasAccessToken: boolean
}

interface WhatsAppSenderProps {
  leadId: string
  telefono: string
  onMessageSent?: (messageId: string) => void
}

export default function WhatsAppSender({ leadId, telefono, onMessageSent }: WhatsAppSenderProps) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templateParams, setTemplateParams] = useState<string[]>([])
  const [messageType, setMessageType] = useState<'text' | 'template'>('text')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplatesAndConfig()
  }, [])

  const fetchTemplatesAndConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/send')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
        setConfig(data.config)
      }
    } catch (err) {
      console.error('Error fetching WhatsApp config:', err)
    }
  }

  const handleTemplateChange = (templateName: string) => {
    setSelectedTemplate(templateName)
    const template = templates.find(t => t.name === templateName)
    if (template) {
      setTemplateParams(new Array(template.parameters.length).fill(''))
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() && messageType === 'text') {
      setError('El mensaje no puede estar vacío')
      return
    }

    if (messageType === 'template' && !selectedTemplate) {
      setError('Selecciona un template')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const payload = {
        leadId,
        telefono,
        mensaje: message,
        tipo: messageType,
        ...(messageType === 'template' && {
          templateName: selectedTemplate,
          templateParams: templateParams.filter(p => p.trim())
        })
      }

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar mensaje')
      }

      const result = await response.json()
      
      setSuccess(`Mensaje enviado exitosamente (ID: ${result.messageId})`)
      setMessage('')
      setSelectedTemplate('')
      setTemplateParams([])
      
      if (onMessageSent) {
        onMessageSent(result.messageId)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            Cargando configuración de WhatsApp...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!config.configured) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-800">
            <AlertCircle className="w-5 h-5 mr-2" />
            WhatsApp no configurado
          </CardTitle>
          <CardDescription className="text-yellow-700">
            WhatsApp Business API no está configurado. Contacta al administrador.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Enviar WhatsApp
        </CardTitle>
        <CardDescription>
          Enviar mensaje a {telefono}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de tipo de mensaje */}
        <div className="flex space-x-2">
          <Button
            variant={messageType === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('text')}
          >
            Texto libre
          </Button>
          <Button
            variant={messageType === 'template' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMessageType('template')}
          >
            <FileText className="w-4 h-4 mr-1" />
            Template
          </Button>
        </div>

        {/* Mensaje de texto libre */}
        {messageType === 'text' && (
          <div>
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={4}
              maxLength={4096}
            />
            <div className="text-xs text-gray-500 mt-1">
              {message.length}/4096 caracteres
            </div>
          </div>
        )}

        {/* Selector de template */}
        {messageType === 'template' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="template">Template</Label>
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar template</option>
                {templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Parámetros del template */}
            {selectedTemplate && (
              <div className="space-y-2">
                <Label>Parámetros del template</Label>
                {templates
                  .find(t => t.name === selectedTemplate)
                  ?.parameters.map((param, index) => (
                    <div key={index}>
                      <Input
                        placeholder={`Parámetro: ${param}`}
                        value={templateParams[index] || ''}
                        onChange={(e) => {
                          const newParams = [...templateParams]
                          newParams[index] = e.target.value
                          setTemplateParams(newParams)
                        }}
                      />
                    </div>
                  ))}
                
                {/* Vista previa del template */}
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-600 mb-1">Vista previa:</div>
                  <div className="text-sm">
                    {templates.find(t => t.name === selectedTemplate)?.description}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mensajes de estado */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {/* Botón de envío */}
        <Button 
          onClick={handleSendMessage} 
          disabled={loading || (!message.trim() && messageType === 'text') || (messageType === 'template' && !selectedTemplate)}
          className="w-full"
        >
          {loading ? (
            'Enviando...'
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar mensaje
            </>
          )}
        </Button>

        {/* Estado de configuración */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Estado de WhatsApp:</span>
            <Badge variant="outline" className="text-green-600">
              Configurado
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
