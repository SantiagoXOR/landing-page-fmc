/**
 * WhatsApp Business API Integration
 * Integración con WhatsApp Business API para envío y recepción de mensajes
 */

import { BaseIntegration, IntegrationConfig, IntegrationResponse, WebhookPayload } from './base-integration'

export interface WhatsAppConfig extends IntegrationConfig {
  phoneNumberId: string
  businessAccountId: string
  verifyToken: string
  webhookSecret: string
  apiVersion?: string
}

export interface WhatsAppMessage {
  to: string
  type: 'text' | 'template' | 'interactive'
  text?: {
    body: string
  }
  template?: {
    name: string
    language: {
      code: string
    }
    components?: any[]
  }
  interactive?: {
    type: 'button' | 'list'
    body: {
      text: string
    }
    action: any
  }
}

export interface WhatsAppIncomingMessage {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  text?: {
    body: string
  }
  image?: {
    id: string
    mime_type: string
    sha256: string
  }
  document?: {
    id: string
    filename: string
    mime_type: string
    sha256: string
  }
  context?: {
    from: string
    id: string
  }
}

export interface WhatsAppContact {
  profile: {
    name: string
  }
  wa_id: string
}

export interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: WhatsAppContact[]
      messages?: WhatsAppIncomingMessage[]
      statuses?: Array<{
        id: string
        status: 'sent' | 'delivered' | 'read' | 'failed'
        timestamp: string
        recipient_id: string
      }>
    }
    field: string
  }>
}

export class WhatsAppIntegration extends BaseIntegration {
  private whatsappConfig: WhatsAppConfig

  constructor(config: WhatsAppConfig) {
    super(config)
    this.whatsappConfig = config
  }

  async initialize(): Promise<boolean> {
    try {
      this.log('info', 'Initializing WhatsApp integration')
      
      // Verificar configuración requerida
      const requiredFields = ['phoneNumberId', 'businessAccountId', 'apiKey', 'verifyToken']
      const missingFields = requiredFields.filter(field => !this.whatsappConfig[field as keyof WhatsAppConfig])
      
      if (missingFields.length > 0) {
        this.log('error', 'Missing required configuration fields', { missingFields })
        return false
      }

      // Verificar conectividad con la API
      const healthCheck = await this.healthCheck()
      if (!healthCheck) {
        this.log('error', 'Health check failed')
        return false
      }

      this.log('info', 'WhatsApp integration initialized successfully')
      return true
    } catch (error: any) {
      this.log('error', 'Failed to initialize WhatsApp integration', { error: error.message })
      return false
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.whatsappConfig.baseUrl || 'https://graph.facebook.com'}/${this.whatsappConfig.apiVersion || 'v18.0'}/${this.whatsappConfig.phoneNumberId}`
      
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.whatsappConfig.apiKey}`
        }
      })

      return response.success
    } catch (error: any) {
      this.log('error', 'Health check failed', { error: error.message })
      return false
    }
  }

  async sendMessage(message: WhatsAppMessage): Promise<IntegrationResponse> {
    try {
      if (!this.isEnabled()) {
        return {
          success: false,
          error: 'WhatsApp integration is disabled',
          timestamp: new Date()
        }
      }

      this.log('info', 'Sending WhatsApp message', { to: message.to, type: message.type })

      const url = `${this.whatsappConfig.baseUrl || 'https://graph.facebook.com'}/${this.whatsappConfig.apiVersion || 'v18.0'}/${this.whatsappConfig.phoneNumberId}/messages`

      const response = await this.retryRequest(async () => {
        return this.makeRequest(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.whatsappConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            ...message
          })
        })
      })

      if (response.success) {
        this.log('info', 'Message sent successfully', { messageId: (response.data as any)?.messages?.[0]?.id })
      } else {
        this.log('error', 'Failed to send message', { error: response.error })
      }

      return response
    } catch (error: any) {
      this.log('error', 'Error sending message', { error: error.message })
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      }
    }
  }

  async processWebhook(payload: WebhookPayload): Promise<IntegrationResponse> {
    try {
      this.log('info', 'Processing WhatsApp webhook', { event: payload.event })

      // Verificar firma del webhook si está configurada
      if (this.whatsappConfig.webhookSecret && payload.signature) {
        const isValid = this.validateWebhookSignature(
          JSON.stringify(payload.data),
          payload.signature,
          this.whatsappConfig.webhookSecret
        )

        if (!isValid) {
          this.log('warn', 'Invalid webhook signature')
          return {
            success: false,
            error: 'Invalid webhook signature',
            timestamp: new Date()
          }
        }
      }

      // Procesar diferentes tipos de eventos
      switch (payload.event) {
        case 'messages':
          return await this.processIncomingMessages(payload.data)
        case 'message_status':
          return await this.processMessageStatus(payload.data)
        default:
          this.log('warn', 'Unknown webhook event', { event: payload.event })
          return {
            success: true,
            data: { message: 'Event ignored' },
            timestamp: new Date()
          }
      }
    } catch (error: any) {
      this.log('error', 'Error processing webhook', { error: error.message })
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      }
    }
  }

  private async processIncomingMessages(data: any): Promise<IntegrationResponse> {
    try {
      const entries: WhatsAppWebhookEntry[] = data.entry || []
      const processedMessages: any[] = []

      for (const entry of entries) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              const contact = change.value.contacts?.find(c => c.wa_id === message.from)
              
              const processedMessage = {
                id: message.id,
                from: message.from,
                contactName: contact?.profile?.name,
                timestamp: new Date(parseInt(message.timestamp) * 1000),
                type: message.type,
                content: this.extractMessageContent(message),
                phoneNumberId: change.value.metadata.phone_number_id
              }

              processedMessages.push(processedMessage)
              
              // Aquí se podría crear un lead automáticamente
              await this.createLeadFromMessage(processedMessage)
            }
          }
        }
      }

      return {
        success: true,
        data: { processedMessages },
        timestamp: new Date()
      }
    } catch (error: any) {
      this.log('error', 'Error processing incoming messages', { error: error.message })
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      }
    }
  }

  private async processMessageStatus(data: any): Promise<IntegrationResponse> {
    try {
      // Procesar estados de mensajes (enviado, entregado, leído, fallido)
      this.log('info', 'Processing message status update', data)
      
      return {
        success: true,
        data: { message: 'Status processed' },
        timestamp: new Date()
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      }
    }
  }

  private extractMessageContent(message: WhatsAppIncomingMessage): any {
    switch (message.type) {
      case 'text':
        return { text: message.text?.body }
      case 'image':
        return { 
          mediaId: message.image?.id,
          mimeType: message.image?.mime_type 
        }
      case 'document':
        return { 
          mediaId: message.document?.id,
          filename: message.document?.filename,
          mimeType: message.document?.mime_type 
        }
      default:
        return { type: message.type }
    }
  }

  private async createLeadFromMessage(message: any): Promise<void> {
    try {
      // Crear lead automáticamente desde mensaje de WhatsApp
      const leadData = {
        nombre: message.contactName || `WhatsApp ${message.from}`,
        telefono: message.from,
        origen: 'WhatsApp',
        estado: 'NUEVO',
        notas: `Mensaje automático de WhatsApp: ${message.content?.text || 'Mensaje multimedia'}`,
        utmSource: 'whatsapp-webhook'
      }

      // En un entorno real, esto se haría a través del servicio de leads
      // Por ahora solo logueamos la intención
      this.log('info', 'Would create lead from WhatsApp message', leadData)
    } catch (error: any) {
      this.log('error', 'Error creating lead from message', { error: error.message })
    }
  }

  // Métodos de utilidad específicos para WhatsApp
  async sendTextMessage(to: string, text: string): Promise<IntegrationResponse> {
    return this.sendMessage({
      to,
      type: 'text',
      text: { body: text }
    })
  }

  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    languageCode: string = 'es',
    components?: any[]
  ): Promise<IntegrationResponse> {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    })
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.whatsappConfig.verifyToken) {
      this.log('info', 'Webhook verified successfully')
      return challenge
    }
    
    this.log('warn', 'Webhook verification failed', { mode, token })
    return null
  }
}
