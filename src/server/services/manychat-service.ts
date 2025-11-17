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
  ManychatWebhookMessage,
} from '@/types/manychat'
import { logger } from '@/lib/logger'

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
   * Obtener último mensaje conocido de un subscriber
   * Nota: ManyChat no tiene endpoint directo para historial completo,
   * pero podemos obtener el último mensaje desde la información del subscriber
   * cuando está disponible en el webhook o en la respuesta de getInfo
   */
  static getLastMessageFromSubscriber(subscriber: ManychatSubscriber): ManychatWebhookMessage | null {
    try {
      // ManyChat puede incluir last_input_text en algunos casos
      // pero no siempre está disponible cuando se obtiene con getInfo
      // Solo lo usamos si está disponible
      
      if (!subscriber.last_input_text) {
        return null
      }

      // Crear un mensaje basado en la información disponible
      const message: ManychatWebhookMessage = {
        id: `last_msg_${subscriber.id}_${Date.now()}`,
        type: 'text',
        text: subscriber.last_input_text,
        timestamp: subscriber.last_interaction 
          ? Math.floor(new Date(subscriber.last_interaction).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        direction: 'inbound',
        platform_msg_id: `manychat_last_${subscriber.id}`
      }

      return message
    } catch (error: any) {
      logger.error('Error obteniendo último mensaje del subscriber', {
        error: error.message,
        subscriberId: subscriber.id
      })
      return null
    }
  }

  /**
   * Obtener subscribers activos por tag
   * Nota: Manychat no tiene endpoint directo para listar todos los subscribers,
   * pero podemos usar una estrategia basada en obtener información de subscribers conocidos
   * o usar broadcasts para obtener subscriber IDs por tag
   */
  static async getSubscribersByTag(tagName: string, limit: number = 100): Promise<ManychatSubscriber[]> {
    try {
      // ManyChat no tiene endpoint directo para obtener subscribers por tag
      // Como alternativa, podemos usar el endpoint de broadcast que permite filtrar por tags
      // pero esto requiere crear un broadcast temporal, lo cual no es ideal
      
      // Por ahora, retornamos array vacío ya que ManyChat no proporciona esta funcionalidad directamente
      // La sincronización masiva se hará usando otras estrategias (por teléfono, por ID conocido, etc.)
      logger.warn('ManyChat no tiene endpoint directo para obtener subscribers por tag', { tagName })
      return []
    } catch (error: any) {
      logger.error('Error obteniendo subscribers por tag', { error: error.message, tagName })
      return []
    }
  }

  /**
   * Obtener subscribers por custom field
   * Útil para filtrar contactos por campos personalizados
   */
  static async getSubscribersByCustomField(
    fieldName: string,
    fieldValue: string,
    limit: number = 100
  ): Promise<ManychatSubscriber[]> {
    try {
      // ManyChat permite buscar por custom field usando findBySystemField
      // pero solo para campos del sistema, no custom fields directamente
      // Esta función está preparada para futuras implementaciones
      logger.warn('ManyChat no tiene endpoint directo para obtener subscribers por custom field', { fieldName })
      return []
    } catch (error: any) {
      logger.error('Error obteniendo subscribers por custom field', { error: error.message, fieldName })
      return []
    }
  }

  /**
   * Obtener información actualizada de múltiples subscribers
   * Útil para actualizar información de leads ya sincronizados
   */
  static async getSubscribersByIds(subscriberIds: number[]): Promise<ManychatSubscriber[]> {
    const subscribers: ManychatSubscriber[] = []
    
    // Obtener información de cada subscriber con rate limiting
    for (const id of subscriberIds) {
      try {
        const subscriber = await this.getSubscriberById(id)
        if (subscriber) {
          subscribers.push(subscriber)
        }
        // Pequeño delay para respetar rate limits
        await new Promise(resolve => setTimeout(resolve, 10))
      } catch (error: any) {
        // Error silencioso, continuar con el siguiente
      }
    }
    
    return subscribers
  }

  /**
   * Buscar múltiples subscribers por teléfono de forma eficiente
   * Útil para sincronizar leads que no tienen manychatId
   */
  static async getSubscribersByPhones(phones: string[]): Promise<Map<string, ManychatSubscriber>> {
    const subscribersMap = new Map<string, ManychatSubscriber>()
    
    // Procesar en lotes para evitar sobrecarga
    const batchSize = 10
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize)
      
      // Procesar en paralelo con rate limiting
      const promises = batch.map(async (phone) => {
        try {
          const subscriber = await this.getSubscriberByPhone(phone)
          if (subscriber) {
            subscribersMap.set(phone, subscriber)
          }
          // Delay entre requests para respetar rate limits
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (error: any) {
          // Error silencioso, continuar con el siguiente
        }
      })
      
      await Promise.all(promises)
      
      // Delay entre lotes
      if (i + batchSize < phones.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return subscribersMap
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

