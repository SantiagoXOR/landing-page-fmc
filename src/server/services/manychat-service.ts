import {
  ManychatApiResponse,
  ManychatSubscriber,
  ManychatSubscriberResponse,
  ManychatTag,
  ManychatTagResponse,
  ManychatCustomFieldsResponse,
  ManychatSendMessageRequest,
  ManychatSendMessageResponse,
  ManychatMessage,
  ManychatBroadcastRequest,
  ManychatBroadcastResponse,
  ManychatFlowsResponse,
  ManychatRequestOptions,
  ManychatLeadData,
} from '@/types/manychat'

/**
 * Servicio para interactuar con la API de Manychat
 * Documentación: https://api.manychat.com/
 */
export class ManychatService {
  private static readonly BASE_URL = process.env.MANYCHAT_BASE_URL || 'https://api.manychat.com'
  private static readonly API_KEY = process.env.MANYCHAT_API_KEY
  
  // Rate limiting
  private static requestQueue: Array<() => Promise<any>> = []
  private static isProcessingQueue = false
  private static readonly RATE_LIMIT_DELAY = 10 // ms entre requests (100 req/s)

  /**
   * Realizar petición HTTP a la API de Manychat
   */
  private static async makeRequest<T = any>(options: ManychatRequestOptions): Promise<ManychatApiResponse<T>> {
    if (!this.API_KEY) {
      throw new Error('MANYCHAT_API_KEY no configurado en variables de entorno')
    }

    const { method = 'GET', endpoint, body, params } = options

    // Construir URL con parámetros
    const url = new URL(`${this.BASE_URL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.API_KEY}`,
      'Content-Type': 'application/json',
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Manychat API Error:', {
          status: response.status,
          data,
          endpoint,
        })
        
        return {
          status: 'error',
          error: data.error || data.message || 'Error desconocido',
          error_code: data.error_code,
          details: data.details,
        }
      }

      return data
    } catch (error) {
      console.error('Error en petición a Manychat:', error)
      throw error
    }
  }

  /**
   * Ejecutar request con rate limiting
   */
  private static async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  /**
   * Procesar cola de requests con rate limiting
   */
  private static async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        await request()
        // Delay para respetar rate limit
        if (this.requestQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
        }
      }
    }

    this.isProcessingQueue = false
  }

  // ============================================================================
  // SUBSCRIBERS (Contactos)
  // ============================================================================

  /**
   * Obtener información de un subscriber por ID
   */
  static async getSubscriberById(subscriberId: number): Promise<ManychatSubscriber | null> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSubscriber>({
        endpoint: `/fb/subscriber/getInfo`,
        params: { subscriber_id: subscriberId },
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return null
  }

  /**
   * Obtener subscriber por teléfono (WhatsApp)
   */
  static async getSubscriberByPhone(phone: string): Promise<ManychatSubscriber | null> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSubscriber>({
        endpoint: `/fb/subscriber/findBySystemField`,
        params: { 
          field_name: 'phone',
          field_value: phone,
        },
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return null
  }

  /**
   * Crear o actualizar subscriber
   */
  static async createOrUpdateSubscriber(data: ManychatLeadData): Promise<ManychatSubscriber | null> {
    const body: any = {
      phone: data.phone,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      whatsapp_phone: data.whatsapp_phone || data.phone,
      has_opt_in_sms: true,
    }

    // Agregar custom fields si existen
    if (data.custom_fields) {
      body.custom_fields = data.custom_fields
    }

    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSubscriber>({
        method: 'POST',
        endpoint: `/fb/subscriber/createSubscriber`,
        body,
      })
    )

    if (response.status === 'success' && response.data) {
      // Si hay tags, agregarlos
      if (data.tags && data.tags.length > 0 && response.data.id) {
        for (const tagName of data.tags) {
          await this.addTagToSubscriber(response.data.id, tagName)
        }
      }

      return response.data
    }

    console.error('Error creando subscriber en Manychat:', response.error)
    return null
  }

  /**
   * Actualizar custom field de un subscriber
   */
  static async setCustomField(
    subscriberId: number,
    fieldName: string,
    value: any
  ): Promise<boolean> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        method: 'POST',
        endpoint: `/fb/subscriber/setCustomField`,
        body: {
          subscriber_id: subscriberId,
          field_name: fieldName,
          field_value: value,
        },
      })
    )

    return response.status === 'success'
  }

  // ============================================================================
  // TAGS
  // ============================================================================

  /**
   * Obtener todos los tags disponibles
   */
  static async getTags(): Promise<ManychatTag[]> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatTag[]>({
        endpoint: `/fb/page/getTags`,
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return []
  }

  /**
   * Agregar tag a un subscriber
   */
  static async addTagToSubscriber(subscriberId: number, tagName: string): Promise<boolean> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        method: 'POST',
        endpoint: `/fb/subscriber/addTag`,
        body: {
          subscriber_id: subscriberId,
          tag_name: tagName,
        },
      })
    )

    return response.status === 'success'
  }

  /**
   * Remover tag de un subscriber
   */
  static async removeTagFromSubscriber(subscriberId: number, tagName: string): Promise<boolean> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        method: 'POST',
        endpoint: `/fb/subscriber/removeTag`,
        body: {
          subscriber_id: subscriberId,
          tag_name: tagName,
        },
      })
    )

    return response.status === 'success'
  }

  /**
   * Agregar tag por ID
   */
  static async addTagByIdToSubscriber(subscriberId: number, tagId: number): Promise<boolean> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        method: 'POST',
        endpoint: `/fb/subscriber/addTagById`,
        body: {
          subscriber_id: subscriberId,
          tag_id: tagId,
        },
      })
    )

    return response.status === 'success'
  }

  /**
   * Remover tag por ID
   */
  static async removeTagByIdFromSubscriber(subscriberId: number, tagId: number): Promise<boolean> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        method: 'POST',
        endpoint: `/fb/subscriber/removeTagById`,
        body: {
          subscriber_id: subscriberId,
          tag_id: tagId,
        },
      })
    )

    return response.status === 'success'
  }

  // ============================================================================
  // MENSAJES
  // ============================================================================

  /**
   * Enviar mensaje a un subscriber
   */
  static async sendMessage(
    subscriberId: number,
    messages: ManychatMessage[],
    tag?: string
  ): Promise<ManychatSendMessageResponse> {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatSendMessageResponse>({
        method: 'POST',
        endpoint: `/fb/sending/sendContent`,
        body: {
          subscriber_id: subscriberId,
          data: {
            version: 'v2',
            messages,
            tag,
          },
        },
      })
    )

    return response as ManychatSendMessageResponse
  }

  /**
   * Enviar mensaje de texto simple
   */
  static async sendTextMessage(subscriberId: number, text: string, tag?: string): Promise<boolean> {
    const messages: ManychatMessage[] = [
      {
        type: 'text',
        text,
      },
    ]

    const response = await this.sendMessage(subscriberId, messages, tag)
    return response.status === 'success'
  }

  /**
   * Enviar mensaje con imagen
   */
  static async sendImageMessage(
    subscriberId: number,
    imageUrl: string,
    caption?: string,
    tag?: string
  ): Promise<boolean> {
    const messages: ManychatMessage[] = [
      {
        type: 'image',
        url: imageUrl,
        caption,
      },
    ]

    const response = await this.sendMessage(subscriberId, messages, tag)
    return response.status === 'success'
  }

  /**
   * Enviar mensaje con archivo
   */
  static async sendFileMessage(
    subscriberId: number,
    fileUrl: string,
    filename?: string,
    tag?: string
  ): Promise<boolean> {
    const messages: ManychatMessage[] = [
      {
        type: 'file',
        url: fileUrl,
        filename,
      },
    ]

    const response = await this.sendMessage(subscriberId, messages, tag)
    return response.status === 'success'
  }

  // ============================================================================
  // BROADCASTS
  // ============================================================================

  /**
   * Enviar broadcast a múltiples subscribers
   */
  static async sendBroadcast(
    name: string,
    messages: ManychatMessage[],
    options: {
      subscriberIds?: number[]
      tagIds?: number[]
      sendTime?: string
    } = {}
  ): Promise<ManychatBroadcastResponse> {
    const body: ManychatBroadcastRequest = {
      name,
      message: messages,
      subscribers: options.subscriberIds,
      tags: options.tagIds,
      send_time: options.sendTime,
    }

    const response = await this.executeWithRateLimit(() =>
      this.makeRequest<ManychatBroadcastResponse>({
        method: 'POST',
        endpoint: `/fb/broadcasting/sendBroadcast`,
        body,
      })
    )

    return response as ManychatBroadcastResponse
  }

  // ============================================================================
  // CUSTOM FIELDS
  // ============================================================================

  /**
   * Obtener todos los custom fields
   */
  static async getCustomFields() {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        endpoint: `/fb/page/getCustomFields`,
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return []
  }

  // ============================================================================
  // FLOWS
  // ============================================================================

  /**
   * Obtener flows disponibles
   */
  static async getFlows() {
    const response = await this.executeWithRateLimit(() =>
      this.makeRequest({
        endpoint: `/fb/page/getFlows`,
      })
    )

    if (response.status === 'success' && response.data) {
      return response.data
    }

    return []
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Verificar si la API está configurada
   */
  static isConfigured(): boolean {
    return !!this.API_KEY
  }

  /**
   * Verificar salud de la API
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest({
        endpoint: `/fb/page/getInfo`,
      })
      return response.status === 'success'
    } catch (error) {
      console.error('Manychat health check failed:', error)
      return false
    }
  }
}

